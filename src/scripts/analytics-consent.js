/* Basic opt-in: no Google connection exists until the visitor explicitly allows it. */
(function () {
  const root = document.querySelector('.cm-privacy');
  if (!root) return;
  const ID = root.dataset.measurementId || '';
  const KEY = 'cm-analytics-choice';
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  const allowedHost = location.hostname === 'chrismackintosh.work';
  const enabled = root.dataset.analyticsEnabled === 'true' && allowedHost && /^G-[A-Z0-9]+$/.test(ID);
  const panel = root.querySelector('#cm-analytics-choice');
  const open = document.querySelector('[data-privacy-open]');
  if (!open) { root.remove(); return; } // Development reference pages have no public footer.
  const status = root.querySelector('[data-privacy-status]');
  let openedFromFooter = false;
  let requested = false;
  const masthead = document.querySelector('.cm-masthead');
  if (masthead) root.dataset.intro = 'true';
  function present() {
    const waiting = masthead && !openedFromFooter && masthead.getAttribute('aria-hidden') === 'true';
    panel.hidden = !requested || Boolean(waiting);
    root.dataset.explicit = String(openedFromFooter);
    open.setAttribute('aria-expanded', String(!panel.hidden));
  }
  if (masthead) new MutationObserver(present).observe(masthead, {attributes:true,attributeFilter:['aria-hidden']});
  function restoreFocus() {
    const target = openedFromFooter ? open : document.querySelector('main');
    if (!target) return;
    if (!target.hasAttribute('tabindex') && target !== open) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  let memory = null;
  let memoryOnly = false;
  // Never trust saved acceptance if it cannot also be withdrawn in this browser.
  try { localStorage.setItem(KEY + '-probe', '1'); localStorage.removeItem(KEY + '-probe'); }
  catch (_) { memoryOnly = true; }
  let started = false;
  let timer;
  window['ga-disable-' + ID] = true;
  function read() {
    let raw;
    if (memoryOnly) raw = JSON.stringify(memory);
    else try { raw = localStorage.getItem(KEY); } catch (_) { raw = JSON.stringify(memory); }
    try {
      const value = JSON.parse(raw);
      if (value?.version === 1 && ['accepted', 'rejected'].includes(value.choice)
        && Number.isFinite(value.expiresAt) && value.expiresAt > Date.now()
        && value.expiresAt <= Date.now() + MAX_AGE) return value;
    } catch (_) {}
    return null;
  }
  function clearCookies() {
    // Remove GA cookies for this host and its parent-domain variant, without touching other storage.
    document.cookie.split(';').forEach(part => {
      const name = part.trim().split('=')[0];
      if (name !== '_ga' && !name.startsWith('_ga_')) return;
      ['', location.hostname, '.' + location.hostname].forEach(domain => {
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax' + (domain ? '; Domain=' + domain : '');
      });
    });
  }
  function render(choice, show = !choice) {
    requested = show;
    open.hidden = false;
    present();
    status.textContent = choice ? (choice.choice === 'accepted' ? 'Analytics allowed.' : 'Analytics off.') + (!enabled ? ' This preview does not send analytics.' : '') : '';
  }
  function start() {
    if (!enabled || started || read()?.choice !== 'accepted') return;
    started = true;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    script.referrerPolicy = 'no-referrer';
    script.onload = () => {
      if (read()?.choice !== 'accepted') return;
      window['ga-disable-' + ID] = false;
      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      gtag('js', new Date());
      const page = 'https://chrismackintosh.work' + location.pathname;
      gtag('config', ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
        cookie_expires: MAX_AGE / 1000, cookie_update: false, cookie_flags: 'SameSite=Lax;Secure',
        page_location: page, page_referrer: '', page_title: document.title });
      gtag('event', 'page_view', { send_to: ID, page_location: page, page_referrer: '', page_title: document.title });
    };
    document.head.appendChild(script);
  }
  function sync() {
    const choice = read();
    clearTimeout(timer);
    if (choice) timer = setTimeout(sync, Math.min(choice.expiresAt - Date.now() + 1, 2147483647));
    if (choice?.choice !== 'accepted') {
      window['ga-disable-' + ID] = true;
      clearCookies();
      // Unload an already-running Google library; do not send denied-consent pings.
      if (started) { location.reload(); return; }
    } else start();
    render(choice);
  }
  root.querySelectorAll('[data-consent]').forEach(button => button.addEventListener('click', () => {
    memory = { version: 1, choice: button.dataset.consent, expiresAt: Date.now() + MAX_AGE };
    try { localStorage.setItem(KEY, JSON.stringify(memory)); memoryOnly = false; }
    catch (_) { memoryOnly = true; try { localStorage.removeItem(KEY); } catch (_) {} }
    sync();
    restoreFocus();
  }));
  open.addEventListener('click', () => {
    openedFromFooter = true;
    render(read(), true);
    root.querySelector('[data-consent]').focus({ preventScroll: true });
  });
  root.querySelector('[data-privacy-close]').addEventListener('click', () => { render(read(), false); restoreFocus(); });
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') { render(read(), false); restoreFocus(); } });
  // A first-load notice must not cover keyboard focus elsewhere on the page.
  document.addEventListener('focusin', event => {
    if (!panel.hidden && !panel.contains(event.target) && event.target !== open) render(read(), false);
  });
  window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) sync(); });
  window.addEventListener('pageshow', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  sync();
})();
