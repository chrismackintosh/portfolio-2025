/* Fixed Denver airport observations; browser supplies its standard User-Agent.
   NWS supports browser CORS. No proxy, key, location permission, or credentials. */
(() => {
  'use strict';
  const latitude = 39.771592;
  const longitude = -104.8824;
  const minute = 60000;
  const refreshAfter = 15 * minute;
  const maximumAge = 120 * minute;
  const cacheKey = 'cm-nws-kden-v1';
  const endpoint = 'https://api.weather.gov/stations/KDEN/observations/latest';
  const dateFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  let observation = null;
  let pending = false;
  let lastAttempt = -Infinity;
  let nextAttempt = -Infinity;
  let failures = 0;
  let listener = null;
  let timer = null;
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



  function valid(data, now = Date.now()) {
    return !!data && Number.isFinite(data.observedAt)
      && now - data.observedAt >= -5 * minute && now - data.observedAt < maximumAge
      && ['clear', 'cloudy', 'precipitation'].includes(data.condition);
  }

  function normalize(data) {
    const p = data?.properties;
    if (!p || p.station !== 'https://api.weather.gov/stations/KDEN') return null;
    const observedAt = Date.parse(p.timestamp);
    const description = typeof p.textDescription === 'string' ? p.textDescription : '';
    const amounts = Array.isArray(p.cloudLayers) ? p.cloudLayers.map(layer => layer?.amount) : [];
    const weather = Array.isArray(p.presentWeather) ? p.presentWeather.map(item => item?.weather).filter(Boolean).join(' ') : '';
    const words = (description + ' ' + weather).replace(/[_-]/g, ' ');
    let condition;
    if (/rain|drizzle|snow|sleet|hail|thunder|ice pellets|freezing|showers/i.test(words)) condition = 'precipitation';
    // Obscured visibility still needs a muted sky, even with few/scattered layers.
    else if (/fog|mist|haze|smoke|dust|sand/i.test(words)) condition = 'cloudy';
    // Use the most-covered reported layer before falling back to prose. NWS calls
    // FEW/SCT "Partly Cloudy", which must not match the generic cloudy fallback.
    else if (amounts.some(amount => ['BKN', 'OVC', 'VV'].includes(amount))) condition = 'cloudy';
    else if (amounts.some(amount => ['CLR', 'SKC', 'FEW', 'SCT'].includes(amount))) condition = 'clear';
    else if (/partly\s+(cloudy|sunny)/i.test(description)) condition = 'clear';
    else if (/cloudy|overcast/i.test(description)) condition = 'cloudy';
    else if (/clear|fair|sunny/i.test(description)) condition = 'clear';
    else return null; // Missing or unrecognized observations are not evidence of clear skies.
    const result = { observedAt, condition };
    return valid(result) ? result : null;
  }

  function state(now = Date.now()) {
    const { sunrise, sunset } = estimatedSunTimes(now);
    const dark = now < sunrise || now >= sunset;
    const current = valid(observation, now) ? observation : null;
    let sky = 'Sunny midday';
    if (now < sunrise - 30 * minute || now >= sunset + 90 * minute) sky = 'Night';
    // Observed cloud/precipitation takes priority over decorative dawn/dusk colors.
    else if (current?.condition === 'precipitation') sky = 'Gray / rain';
    else if (current?.condition === 'cloudy') sky = 'Cloudy';
    else if (Math.abs(now - sunrise) <= 30 * minute) sky = 'Sunrise';
    else if (Math.abs(now - sunset) <= 30 * minute) sky = 'Sunset';
    else if (now > sunset) sky = 'Dusk';
    // Owner-selected Sunset design is the unknown-weather daytime palette.
    // Solar darkness still wins; this is a visual default, not a sunset forecast.
    if (!current && !dark) sky = 'Sunset';
    return { sky, dark, source: current ? 'NWS observation' : 'Local solar estimate',
      solar: { now, sunrise, sunset }, condition: current?.condition || 'unknown' };
  }
  const emit = () => { if (listener) listener(state()); };

  async function refresh() {
    if (pending || document.hidden || Date.now() < nextAttempt) return;
    lastAttempt = Date.now();
    pending = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/geo+json' }, credentials: 'omit',
        referrerPolicy: 'no-referrer', signal: controller.signal
      });
      if (!response.ok) throw new Error('Weather unavailable');
      const data = normalize(await response.json());
      if (!data || (valid(observation) && data.observedAt < observation.observedAt))
        throw new Error('Weather incomplete, stale, or older than the current observation');
      observation = data;
      failures = 0;
      nextAttempt = Date.now() + refreshAfter;
      try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data })); } catch { /* Cache is optional. */ }
    } catch {
      // Preserve valid observations, but recover sooner than the successful-fetch cadence.
      failures = Math.min(failures + 1, 5);
      nextAttempt = Date.now() + Math.min(refreshAfter, minute * 2 ** (failures - 1));
    }
    finally { clearTimeout(timeout); pending = false; emit(); }
  }
  function tick() { if (!document.hidden) { emit(); void refresh(); } }
  function resume() {
    if (failures && !document.hidden) nextAttempt = Math.min(nextAttempt, Math.max(Date.now(), lastAttempt + minute));
    tick();
  }
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (cached && Number.isFinite(cached.savedAt) && cached.savedAt <= Date.now()
      && valid(cached.data)) {
      observation = cached.data;
      // Reuse still-valid weather while a refresh is due; never extend observedAt.
      nextAttempt = cached.savedAt + refreshAfter;
    }
  } catch { /* Storage may be blocked or malformed. */ }
  globalThis.CMWeather = {
    current: state,
    nextBoundary(now = Date.now()) {
      // After sunset, tomorrow's sunrise is the next boundary (including DST days).
      const today = estimatedSunTimes(now);
      if (now < today.sunrise) return today.sunrise;
      if (now < today.sunset) return today.sunset;
      const {year, month, day} = localDate(now);
      // A 19:00 UTC anchor stays inside tomorrow in Denver across both DST changes.
      return estimatedSunTimes(Date.UTC(year, month - 1, day + 1, 19)).sunrise;
    },
    start(onChange) {
    listener = onChange;
    emit();
    if (!timer) {
      timer = setInterval(tick, minute);
      document.addEventListener('visibilitychange', resume);
      globalThis.addEventListener?.('online', resume);
    }
    void refresh();
  }};
})();
