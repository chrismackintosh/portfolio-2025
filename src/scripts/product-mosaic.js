(() => {
  const tiles = document.querySelectorAll('[data-mosaic-motion]:not(.myco-departure)');
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

// Only the flight repeats. Keep its clock still offscreen or in a background tab.
(() => {
  const tile = document.querySelector('.myco-departure');
  if (!tile || !('IntersectionObserver' in window)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let inView = false;
  const sync = () => {
    const playing = inView && !document.hidden && !reduced.matches;
    if (playing) tile.classList.add('cm-mosaic-play');
    tile.classList.toggle('myco-flight-paused', !playing);
  };
  const observer = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting && entries[0].intersectionRatio >= .65;
    sync();
  }, {threshold: [0, .65]});
  observer.observe(tile);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
})();
