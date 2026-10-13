/* Denver daylight drives the sky locally. No location permission or network request. */
(() => {
  'use strict';
  const latitude = 39.771592;
  const longitude = -104.8824;
  const minute = 60000;
  const dateFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  function localDate(now) {
    const parts = dateFormat.formatToParts(now);
    const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
  }


  function estimatedSunTimes(now) {
    // NOAA's general solar equations: seasonal sunrise/sunset without network access.
    // https://gml.noaa.gov/grad/solcalc/solareqns.PDF
    // Approximate refraction uses a 90.833-degree zenith; terrain is not modeled.
    const { year, month, day } = localDate(now);
    const midnight = Date.UTC(year, month - 1, day);
    const dayOfYear = (midnight - Date.UTC(year, 0, 1)) / 86400000 + 1;
    const daysInYear = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;
    const radians = Math.PI / 180;
    const latitudeRadians = latitude * radians;
    function eventTime(isSunrise) {
      let utcMinutes = 720 - 4 * longitude;
      for (let iteration = 0; iteration < 3; iteration++) {
        const gamma = 2 * Math.PI / daysInYear * (dayOfYear - 1 + (utcMinutes / 60 - 12) / 24);
        const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
        const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
        const cosine = Math.cos(90.833 * radians) / (Math.cos(latitudeRadians) * Math.cos(declination)) - Math.tan(latitudeRadians) * Math.tan(declination);
        const hourAngle = Math.acos(Math.max(-1, Math.min(1, cosine))) / radians;
        utcMinutes = 720 - 4 * (longitude + (isSunrise ? hourAngle : -hourAngle)) - equationOfTime;
      }
      return midnight + utcMinutes * minute;
    }
    return { sunrise: eventTime(true), sunset: eventTime(false) };
  }


  function state(now = Date.now()) {
    const { sunrise, sunset } = estimatedSunTimes(now);
    const dark = now < sunrise || now >= sunset;
    let sky = 'Sunny midday';
    if (now < sunrise - 30 * minute || now >= sunset + 90 * minute) sky = 'Night';
    else if (Math.abs(now - sunrise) <= 30 * minute) sky = 'Sunrise';
    else if (Math.abs(now - sunset) <= 30 * minute) sky = 'Sunset';
    else if (now > sunset) sky = 'Dusk';
    return { sky, dark, source: 'Local solar estimate' };
  }
  let timer;
  globalThis.CMWeather = { start(onChange) {
    const tick = () => { if (!document.hidden) onChange(state()); };
    onChange(state());
    if (!timer) { timer = setInterval(tick, minute); document.addEventListener('visibilitychange', tick); }
  }};
})();
