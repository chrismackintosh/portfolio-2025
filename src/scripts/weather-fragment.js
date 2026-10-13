/* Inline this controller in the standalone study. No runtime dependencies. */
(() => {
  'use strict';
  const latitude = 39.771592;
  const longitude = -104.8824;
  const minute = 60000;
  const refreshAfter = 15 * minute;
  const cacheKey = 'cm-denver-weather-v2';
  const dateFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  let weather = null;
  let weatherSource = 'Local solar estimate';
  let lastAttempt = -Infinity;
  let pending = false;
  let listener = null;
  let timer = null;

  function localDate(now) {
    const parts = dateFormat.formatToParts(now);
    const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
  }

  function dateKey(now) {
    const { year, month, day } = localDate(now);
    return `${year}-${month}-${day}`;
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

  function validWeather(data, now = Date.now()) {
    return !!data && Number.isFinite(data.current?.time) && Math.abs(now / 1000 - data.current.time) < 90 * 60
      && Number.isInteger(data.current.weather_code)
      && Number.isFinite(data.current.cloud_cover) && data.current.cloud_cover >= 0 && data.current.cloud_cover <= 100
      && Array.isArray(data.daily?.sunrise) && Array.isArray(data.daily?.sunset);
  }

  function sunTimes(now) {
    if (validWeather(weather, now)) {
      const today = dateKey(now);
      const index = weather.daily.sunrise.findIndex(value => Number.isFinite(value) && dateKey(value * 1000) === today);
      const sunrise = weather.daily.sunrise[index] * 1000;
      const sunset = weather.daily.sunset[index] * 1000;
      if (Number.isFinite(sunrise) && Number.isFinite(sunset) && sunset > sunrise) return { sunrise, sunset };
    }
    return estimatedSunTimes(now);
  }

  function state(now = Date.now()) {
    const { sunrise, sunset } = sunTimes(now);
    // Palette and page brightness are independent: dawn may be colorful while the sheet stays dark.
    const dark = now < sunrise || now >= sunset;
    const source = validWeather(weather, now) ? weatherSource : 'Local solar estimate';
    let sky;
    if (now < sunrise - 30 * minute || now >= sunset + 90 * minute) sky = 'Night';
    else if (Math.abs(now - sunrise) <= 30 * minute) sky = 'Sunrise';
    else if (Math.abs(now - sunset) <= 30 * minute) sky = 'Sunset';
    else if (now > sunset) sky = 'Dusk';
    else if (validWeather(weather, now) && weather.current.weather_code >= 51) sky = 'Gray / rain';
    else if (validWeather(weather, now) && (weather.current.weather_code >= 3 || weather.current.cloud_cover >= 50)) sky = 'Cloudy';
    else sky = 'Sunny midday';
    return { sky, dark, source };
  }

  function emit() { if (listener) listener(state()); }

  async function refresh() {
    if (pending || Date.now() - lastAttempt < refreshAfter) return;
    pending = true;
    lastAttempt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), current: 'weather_code,cloud_cover,is_day', daily: 'sunrise,sunset', timezone: 'America/Denver', timeformat: 'unixtime', forecast_days: '2' });
      const response = await fetch('https://api.open-meteo.com/v1/forecast?' + params, { signal: controller.signal });
      if (!response.ok) throw new Error('Weather unavailable');
      const data = await response.json();
      if (!validWeather(data)) throw new Error('Weather incomplete or stale');
      weather = data;
      weatherSource = 'Live weather';
      try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data })); } catch (_) { /* Optional cache. */ }
    } catch (_) {
      weatherSource = 'Recent weather';
    } finally {
      clearTimeout(timeout);
      pending = false;
      emit();
    }
  }

  function tick() {
    if (!document.hidden) { emit(); refresh(); }
  }

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (cached && Number.isFinite(cached.savedAt) && cached.savedAt <= Date.now() && Date.now() - cached.savedAt < refreshAfter && validWeather(cached.data)) {
      weather = cached.data;
      weatherSource = 'Recent weather';
      lastAttempt = cached.savedAt;
    }
  } catch (_) { /* Automatic solar behavior works without browser storage. */ }

  globalThis.CMWeather = {
    start(onChange) {
      listener = onChange;
      if (!timer) {
        timer = setInterval(tick, minute);
        document.addEventListener('visibilitychange', tick);
      }
      emit();
      refresh();
    }
  };
})();
