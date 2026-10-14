/* Shared appearance preference; automatic solar mode remains the initial default. */
(() => {
  const root = document.documentElement;
  const key = 'cm-color-appearance';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let transitionTimer;
  function easeSwitch() {
    clearTimeout(transitionTimer);
    if (motion.matches) return;
    root.classList.add('cm-theme-switching');
    // Establish the current palette before changing it; repeated clicks retarget smoothly.
    void root.offsetWidth;
    transitionTimer = setTimeout(() => root.classList.remove('cm-theme-switching'), 400);
  }
  const read = () => {
    try { const value = localStorage.getItem(key); return ['light', 'dark'].includes(value) ? value : null; }
    catch { return null; }
  };
  let preference = read();
  let solar = {dark: false, sky: 'Sunny midday', source: 'Local daylight'};
  const listeners = new Set();
  function effective() {
    if (!preference) return solar;
    const dark = preference === 'dark';
    return {...solar, dark, sky: dark ? 'Night' : ['Night', 'Dusk'].includes(solar.sky) ? 'Sunny midday' : solar.sky};
  }
  function apply() {
    const state = effective();
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
    easeSwitch();
    preference = effective().dark ? 'light' : 'dark';
    try { localStorage.setItem(key, preference); } catch { /* Still usable without storage. */ }
    apply();
  });
  addEventListener('storage', event => {
    if (event.key === key || event.key === null) { preference = read(); apply(); }
  });
  addEventListener('pageshow', event => {
    if (event.persisted) { preference = read(); apply(); }
  });
})();
