/* Shared appearance preference; automatic solar mode remains the initial default. */
(() => {
  const root = document.documentElement;
  const key = 'cm-color-appearance';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let transitionTimer;
  let expiryTimer;
  let renderedDark;
  let memoryOnly = false;
  function easeSwitch() {
    clearTimeout(transitionTimer);
    if (motion.matches) return;
    root.classList.add('cm-theme-switching');
    // Establish the current palette before changing it; repeated clicks retarget smoothly.
    void root.offsetWidth;
    transitionTimer = setTimeout(() => root.classList.remove('cm-theme-switching'), 400);
  }
  const read = (fallback = null) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      let value;
      try { value = JSON.parse(raw); } catch { /* Old plain light/dark values retire once. */ }
      if (value?.version === 1 && ['light', 'dark'].includes(value.mode)
        && Number.isFinite(value.expiresAt) && value.expiresAt > Date.now()
        && value.expiresAt <= Date.now() + 26 * 60 * 60 * 1000) return value;
      localStorage.removeItem(key);
      return null;
    } catch { return fallback; } // Blocked storage still allows a temporary in-memory choice.
  };
  let preference = read();
  let solar = globalThis.CMWeather?.current?.() || {dark: false, sky: 'Sunny midday', source: 'Local daylight'};
  const listeners = new Set();
  function effective() {
    if (!preference) return solar;
    const dark = preference.mode === 'dark';
    return {...solar, dark, sky: dark ? 'Night' : ['Night', 'Dusk'].includes(solar.sky) ? 'Sunny midday' : solar.sky};
  }
  function apply() {
    if (!memoryOnly) preference = read(preference);
    if (preference && preference.expiresAt <= Date.now()) preference = null;
    solar = globalThis.CMWeather?.current?.() || solar;
    clearTimeout(expiryTimer);
    if (preference) expiryTimer = setTimeout(apply, Math.max(1, preference.expiresAt - Date.now()));
    const state = effective();
    if (renderedDark !== undefined && renderedDark !== state.dark) easeSwitch();
    renderedDark = state.dark;
    root.classList.toggle('cm-night', state.dark);
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(state.dark));
      button.title = state.dark ? 'Switch to light mode' : 'Switch to dark mode';
    });
    listeners.forEach(listener => listener(state));
  }
  globalThis.CMTheme = {subscribe(listener) { listeners.add(listener); listener(effective()); }};
  apply(); // Honor the saved preference before the first paint.
  globalThis.CMWeather?.start(state => { solar = state; apply(); });
  document.addEventListener('DOMContentLoaded', apply);
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-theme-toggle]');
    if (!button) return;
    apply(); // Resume/clock changes must be resolved before deciding the opposite mode.
    const expiresAt = globalThis.CMWeather?.nextBoundary?.();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return;
    preference = {version: 1, mode: effective().dark ? 'light' : 'dark', expiresAt};
    try { localStorage.setItem(key, JSON.stringify(preference)); } catch { memoryOnly = true; /* Still usable without storage. */ }
    apply();
  });
  addEventListener('storage', event => {
    if (event.key === key || event.key === null) { memoryOnly = false; preference = read(); apply(); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) apply(); });
  addEventListener('pageshow', event => {
    if (event.persisted) apply();
  });
})();
