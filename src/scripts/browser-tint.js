/* Safari can retain a stale toolbar tint over a translucent backdrop.
   A fresh opaque top-edge surface prompts resampling without removing blur. */
(() => {
  let strip;
  let frame;
  function refresh() {
    if (!document.body) return;
    const next = document.createElement('div');
    next.className = 'cm-browser-tint';
    next.setAttribute('aria-hidden', 'true');
    next.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--cm-paper').trim();
    // Replace in one task: never leave a painted blank frame between surfaces.
    if (strip?.isConnected) strip.replaceWith(next);
    else document.body.append(next);
    strip = next;
  }
  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(refresh);
  }
  globalThis.CMTheme?.subscribe(schedule);
  document.addEventListener('DOMContentLoaded', refresh, {once:true});
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  screen.orientation?.addEventListener('change', schedule);
  addEventListener('orientationchange', schedule);
})();
