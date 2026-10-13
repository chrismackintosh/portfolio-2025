/* Progressive enhancement for the static portfolio: real URLs remain the fallback. */
(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'cm-work-navigation';
  const home = location.pathname === '/' || location.pathname === '/index.html';
  const route = url => url.pathname + url.search;
  const read = () => { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } };
  const write = value => { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const clear = () => { try { sessionStorage.removeItem(key); } catch {} };
  const state = () => history.state && typeof history.state === 'object' ? history.state : {};
  const replace = value => { try { history.replaceState({...state(), ...value}, ''); } catch {} };
  const validOrigin = value => {
    if (!value || !Number.isFinite(value.y) || value.y < 0) return null;
    try {
      const url = new URL(value.url, location.href);
      return url.origin === location.origin && ['/', '/index.html'].includes(url.pathname) ? value : null;
    } catch { return null; }
  };
  let arrival = read();
  if (arrival && (arrival.destination !== route(location) || Date.now() - arrival.created > 30000)) arrival = null;
  if (arrival) {
    clear();
    if (!home && validOrigin(arrival.origin)) replace({cmWorkOrigin: arrival.origin});
    if (!motion.matches) {
      root.dataset.workArrival = arrival.kind;
      if (arrival.fromHome && !home) root.dataset.workBreadcrumbArrival = '';
    }
  }
  let busy = false;
  let restored = false;
  let restoringHistory = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  let animation;
  let breadcrumbAnimation;

  function restoreHomePosition() {
    if (!home) return false;
    const position = validOrigin(arrival?.kind === 'return' ? arrival.origin : restoringHistory ? state().cmWorkPosition : null);
    if (!position) return false;
    scrollTo({top: position.y, left: 0, behavior: 'instant'});
    // Return keyboard users to their trigger without forcing a focus ring after pointer navigation.
    if (position.keyboard) document.querySelector('#mycolorado-work .cm-project-entry')?.focus({preventScroll: true});
    restored = true;
    return true;
  }

  function completeArrival() {
    const kind = root.dataset.workArrival;
    const fadeBreadcrumb = root.hasAttribute('data-work-breadcrumb-arrival');
    delete root.dataset.workArrival;
    delete root.dataset.workBreadcrumbArrival;
    const main = document.querySelector('main');
    if (!main || !kind || motion.matches) return;
    animation = main.animate([
      {opacity: 0, transform: kind === 'return' ? 'none' : 'translateY(18px)'},
      {opacity: 1, transform: 'none'}
    ], {duration: kind === 'return' ? 240 : 420, easing: 'cubic-bezier(.2,.7,.2,1)'});
    animation.finished.catch(() => {});
    if (fadeBreadcrumb) {
      breadcrumbAnimation = document.querySelector('.site-head .breadcrumbs')?.animate(
        [{opacity: 0}, {opacity: 1}],
        {duration: 420, delay: 80, easing: 'ease-out', fill: 'backwards'}
      );
      breadcrumbAnimation?.finished.catch(() => {});
    }
  }
  globalThis.CMWorkNavigation = {restoreHomePosition, completeArrival};

  document.addEventListener('click', async event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target || link.hasAttribute('download')) return;
    let destination = new URL(link.href);
    if (destination.origin !== location.origin || destination.pathname === location.pathname) return;
    const isProduct = ['/mycolorado/', '/mycolorado/mobile-drivers-license/'].includes(destination.pathname);
    const isReturn = ['/', '/index.html'].includes(destination.pathname) && destination.hash === '#mycolorado-work';
    if (!isProduct && !isReturn) return;
    if (home && !link.matches('.cm-project-entry')) return;
    event.preventDefault();
    if (busy) return;
    busy = true;

    let origin = validOrigin(state().cmWorkOrigin);
    if (home) {
      origin = {url: location.pathname + location.search + location.hash, y: scrollY, keyboard: event.detail === 0};
      replace({cmWorkPosition: origin});
    }
    if (isReturn && origin) destination = new URL(origin.url, location.href);
    const pending = {destination: route(destination), origin, fromHome: home, kind: isReturn ? 'return' : 'forward', created: Date.now()};
    const main = document.querySelector('main');
    if (!motion.matches && main) {
      animation?.cancel();
      animation = main.animate([{opacity: 1}, {opacity: 0}], {duration: 160, easing: 'ease-out', fill: 'forwards'});
      await Promise.race([animation.finished.catch(() => {}), new Promise(resolve => setTimeout(resolve, 220))]);
    }
    write(pending);
    // Use actual history when returning directly to the page that opened this overview.
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (isReturn && origin && referrer?.origin === location.origin && route(referrer) === route(destination) && history.length > 1) {
      history.back();
    } else {
      location.assign(destination.href);
    }
    setTimeout(() => { animation?.cancel(); busy = false; }, 1500);
  });

  addEventListener('pageshow', event => {
    busy = false;
    if (!event.persisted) return;
    animation?.cancel();
    breadcrumbAnimation?.cancel();
    const pending = read();
    if (pending?.destination === route(location) && Date.now() - pending.created < 30000) {
      arrival = pending;
      clear();
    }
    restoringHistory = true;
    if (home) restoreHomePosition();
    // Never leave a cached page with the outgoing opacity animation applied.
    delete root.dataset.workArrival;
    delete root.dataset.workBreadcrumbArrival;
  });
  addEventListener('load', async () => {
    if (home) return; // Homepage restores after its font-dependent opening layout settles.
    await document.fonts.ready;
    completeArrival();
  });
  motion.addEventListener('change', () => {
    if (motion.matches) {
      animation?.cancel();
      breadcrumbAnimation?.cancel();
      delete root.dataset.workArrival;
      delete root.dataset.workBreadcrumbArrival;
    }
  });
  // A failed enhancement must never leave the actual page invisible.
  setTimeout(() => {
    if (home && !restored) restoreHomePosition();
    delete root.dataset.workArrival;
    delete root.dataset.workBreadcrumbArrival;
  }, 1800);
})();
