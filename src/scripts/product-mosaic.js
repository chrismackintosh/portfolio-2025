// Give each visible tile its own fade-up in reading order, once per page visit.
(() => {
  const grids = [...document.querySelectorAll('.cm-product-mosaic')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  grids.forEach(grid => {
    const tiles = [...grid.querySelectorAll('.cm-mosaic-tile')];
    const running = new Set();
    const revealAll = () => {
      observer.disconnect();
      tiles.forEach(tile => tile.classList.remove('cm-mosaic-enter-pending'));
      running.forEach(animation => animation.cancel());
      running.clear();
    };
    const observer = new IntersectionObserver(entries => {
      if (reduced.matches) return revealAll();
      const entering = entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
      if (!entering.length) return;
      // Follow the responsive visual order, giving every tile a separate start.
      entering.sort((a,b) => a.offsetTop-b.offsetTop || a.offsetLeft-b.offsetLeft);
      const phone = matchMedia('(max-width: 600px)').matches;
      entering.forEach((tile,index) => {
        observer.unobserve(tile);
        tile.classList.remove('cm-mosaic-enter-pending');
        const animation = tile.animate([
          {opacity: 0, transform: `translateY(${phone ? 18 : 28}px)`},
          {opacity: 1, transform: 'translateY(0)'}
        ], {duration: phone ? 600 : 750, delay: index*(phone ? 100 : 125), easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both'});
        running.add(animation);
        animation.finished.then(() => { running.delete(animation); animation.cancel(); }, () => running.delete(animation));
      });
    }, {threshold: .08, rootMargin: '0px 0px -24px 0px'});
    tiles.forEach(tile => { tile.classList.add('cm-mosaic-enter-pending'); observer.observe(tile); });
    reduced.addEventListener('change', () => { if (reduced.matches) revealAll(); });
    // Cached history and printed pages should always contain the fully visible artwork.
    addEventListener('pagehide', revealAll, {once: true});
    addEventListener('beforeprint', revealAll);
  });
})();

(() => {
  const tiles = document.querySelectorAll('[data-mosaic-motion]:not(.myco-departure):not(.myco-scanner)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!tiles.length || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || reduced.matches) return;
      entry.target.classList.add('cm-mosaic-play');
      observer.unobserve(entry.target);
    });
  }, {threshold: .65});
  tiles.forEach(tile => observer.observe(tile));
  reduced.addEventListener('change', () => {
    if (reduced.matches) tiles.forEach(tile => tile.classList.remove('cm-mosaic-play'));
  });
})();

(() => {
  const metric = document.querySelector('[data-stat-motion]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!metric || reduced.matches || !('IntersectionObserver' in window)) return;
  let started = false;
  metric.classList.add('myco-stats-armed');
  const finish = () => metric.classList.remove('myco-stats-armed', 'myco-stats-running');
  const observer = new IntersectionObserver(entries => {
    if (started || !entries.some(entry => entry.isIntersecting)) return;
    started = true;
    observer.disconnect();
    // Wait for the real font so glyph widths cannot jump during the count.
    document.fonts.ready.then(() => {
      if (reduced.matches) return finish();
      metric.classList.add('myco-stats-running');
    });
  }, {threshold: .65});
  observer.observe(metric);
  metric.addEventListener('animationend', event => {
    if (event.animationName === 'myco-mau-reveal') finish();
  });
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    started = true;
    observer.disconnect();
    finish();
  });
})();

// One accessible control for both repeating decorative animations.
(() => {
  const button = document.querySelector('.cm-mosaic-pause');
  const tiles = [...document.querySelectorAll('.myco-departure,.myco-scanner')];
  if (!button || !tiles.length || !('IntersectionObserver' in window)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new WeakMap();
  let paused = false;
  const sync = () => {
    button.hidden = reduced.matches;
    button.dataset.paused = String(paused);
    button.setAttribute('aria-label', paused ? 'Play animations for myColorado' : 'Pause animations for myColorado');
    button.title = button.getAttribute('aria-label');
    tiles.forEach(tile => {
      const playing = visible.get(tile) && !paused && !document.hidden && !reduced.matches;
      if (playing) tile.classList.add('cm-mosaic-play');
      tile.classList.toggle(tile.matches('.myco-scanner') ? 'myco-scanner-paused' : 'myco-flight-paused', !playing);
    });
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => visible.set(entry.target, entry.isIntersecting && entry.intersectionRatio >= .65));
    sync();
  }, {threshold:[0,.65]});
  tiles.forEach(tile => observer.observe(tile));
  button.addEventListener('click', () => { paused = !paused; sync(); });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  sync();
})();
