/* wheat-field.js: pixelated wheat on a <canvas>. No dependencies.
   Usage:  const wheat = CMWheat.mount(canvasElement, { motion: 'hover' });
           wheat.refresh();   // call after --cm-weather-gradient changes
   Colour comes from the page's --cm-weather-gradient custom property. */
(() => {
  'use strict';
  const BAYER = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,
                 3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
  const FALLBACK = 'linear-gradient(165deg,#d0deea 0%,#dce6eb 58%,#e8e9e3 100%)';
  const rng = seed => () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const hex = c => { c = c.replace('#', ''); if (c.length === 3) c = [...c].map(x => x + x).join('');
    return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); };
  const mix = (a, b, k) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',') + ')';

  function mount(canvas, options = {}) {
    const o = { cell: 5, fill: 0.8, fps: 12, motion: 'hover', strength: 0, seed: 7, host: null, burst: 2200, speed: 1, ...options };
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const root = document.documentElement;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const host = o.host || canvas.closest('.cm-sheet') || canvas.parentElement;
    let cols = 0, rows = 0, px = 1, u = 1, layers = [], stalks = [], paint = null;
    let time = 0, energy = 0, hovered = false, visible = true, burstUntil = 0, raf = 0, last = 0, acc = 0;

    /* ---------- scene ---------- */
    function build() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, o.maxDpr || 2);
      px = Math.max(1, Math.round(o.cell * dpr));
      cols = Math.max(8, Math.ceil(r.width * dpr / px));
      rows = Math.max(8, Math.ceil(r.height * dpr / px));
      canvas.width = cols * px; canvas.height = rows * px;
      u = rows / 100;                                   // design unit: scene authored at 100 rows
      layers = [0, 1, 2].map(() => new Float32Array(cols * rows));
      const rand = rng(o.seed);
      stalks = [];
      // close-up: a few tall stalks, weighted to the right
      [[.50,.74],[.63,.93],[.76,.69],[.87,.86],[.97,.60]].forEach(([x, h], i) => stalks.push({
        layer: 2, x: x + (rand() - .5) * .03, h, lean: .10 + rand() * .10, amp: .30 + rand() * .12, phase: rand() * 6.28,
        head: 27 + rand() * 5, w: 2.6, awn: 13 + rand() * 4, leaf: i === 0 ? -1 : i === 3 ? 1 : 0, leafAt: .30 + rand() * .12 }));
      // mid distance
      for (let i = 0; i < 11; i++) stalks.push({ layer: 1, x: .22 + i * .075 + (rand() - .5) * .05, h: .40 + rand() * .16,
        lean: .12 + rand() * .1, amp: .34 + rand() * .12, phase: rand() * 6.28, head: 11 + rand() * 3, w: 1.7, awn: 5.5, leaf: 0 });
      // far field: many small heads riding the field edge
      for (let i = 0; i < 46; i++) stalks.push({ layer: 0, x: .06 + rand() * .96, h: .20 + rand() * .11,
        lean: .14, amp: .40, phase: rand() * 6.28, head: 4.5 + rand() * 2, w: .75, awn: 2, leaf: 0 });
      gradient();
    }

    const DENSITY = [0.34, 0.62, 1];
    function stamp(buf, x, y, d) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      const i = y * cols + x; if (buf[i] < d) buf[i] = d;
    }
    function line(buf, x, y, angle, len, d, curl = 0) {
      for (let i = 0; i <= len * 2; i++) { angle += curl / 2; x += Math.sin(angle) * .5; y -= Math.cos(angle) * .5; stamp(buf, x, y, d); }
    }
    function wind(x, t, phase) {
      return .55 + .45 * Math.sin(x * 5.2 - t * 1.55 + phase * .5) * (.62 + .38 * Math.sin(t * .37 + x * 2.1));
    }
    function drawStalk(s) {
      const buf = layers[s.layer], d = DENSITY[s.layer];
      const H = s.h * rows, head = s.head * u, bendTotal = s.lean + s.amp * wind(s.x, time, s.phase);
      const n = Math.ceil(H * 2), ds = H / n;
      let x = s.x * cols, y = rows + 1, seg = -1;
      for (let i = 0; i <= n; i++) {
        const t = i / n, along = H * t - (H - head);          // cells into the head (<0: still stem)
        const k = Math.max(0, along / head);
        const a = bendTotal * t + (.34 + bendTotal * .42) * k * k; // the heavy head droops with the wind
        x += Math.sin(a) * ds; y -= Math.cos(a) * ds;
        if (along < 0) {
          stamp(buf, x, y, d);
          if (s.layer === 2 && t < .55) stamp(buf, x + 1, y, d);    // thicker lower stem up close
          if (s.leaf && Math.abs(t - s.leafAt) < ds / H / 1.5) {
            const len = 24 * u, curl = s.leaf * 1.7 / (len * 2);       // blade arcs out, then droops
            line(buf, x, y, a + s.leaf * .28, len, d * .85, curl);
            line(buf, x + s.leaf, y, a + s.leaf * .28, len * .55, d * .85, curl);
          }
          continue;
        }
        // head: a spine with grains staggered left and right, each grain carrying one awn
        const g = 3.6 * u * (s.layer === 2 ? 1 : .8), q = (along % g) / g, sgi = Math.floor(along / g);
        const taper = Math.pow(Math.sin(Math.PI * Math.min(1, .12 + k * .88)), .6);
        const nx = Math.cos(a), ny = Math.sin(a);
        stamp(buf, x, y, d);
        for (const side of [-1, 1]) {
          const dq = Math.abs(q - (side < 0 ? .3 : .8));
          if (dq < .34) {
            const reach = s.w * u * taper * (1 - dq / .34 * .55);
            for (let off = .5; off <= reach; off += .5) stamp(buf, x + nx * off * side, y + ny * off * side, d);
          }
        }
        if (s.awn && sgi !== seg) {
          seg = sgi;
          const L = s.awn * u * (.75 + .25 * Math.sin(sgi * 1.7)), reach = s.w * u * taper;
          line(buf, x + nx * reach, y + ny * reach, a + .22, L, d * .72, -.004);
          line(buf, x - nx * reach, y - ny * reach, a - .17, L, d * .72, .004);
        }
      }
    }
    function drawField() {
      const buf = layers[0];
      for (let x = 0; x < cols; x++) {
        const xn = x / cols;
        const top = rows * (.79 - .035 * Math.sin(xn * 9 - time * .9) - .02 * Math.sin(xn * 23 + 1.3 - time * 1.4));
        for (let y = Math.max(0, Math.floor(top)); y < rows; y++) {
          const d = Math.min(.5, .12 + .46 * (y - top) / (rows - top));
          const i = y * cols + x; if (buf[i] < d) buf[i] = d;
        }
      }
    }

    /* ---------- colour ---------- */
    function gradient() {
      const css = getComputedStyle(root).getPropertyValue('--cm-weather-gradient').trim() || FALLBACK;
      const stops = [...css.matchAll(/(#[0-9a-f]{3,8})\s+([\d.]+)%/gi)].map(m => [hex(m[1]), +m[2] / 100]);
      const use = stops.length > 1 ? stops : [[hex('#d0deea'), 0], [hex('#e8e9e3'), 1]];
      const ink = hex(root.classList.contains('cm-night') ? '#d6dfec' : '#26313b');
      const a = 165 * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), W = canvas.width, Hh = canvas.height;
      const L = Math.abs(W * dx) + Math.abs(Hh * dy);
      paint = ctx.createLinearGradient(W / 2 - dx * L / 2, Hh / 2 - dy * L / 2, W / 2 + dx * L / 2, Hh / 2 + dy * L / 2);
      use.forEach(([c, at]) => paint.addColorStop(at, mix(c, ink, o.strength)));
    }

    /* ---------- render ---------- */
    function render() {
      layers.forEach(b => b.fill(0));
      drawField(); stalks.forEach(drawStalk);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = paint;
      const sq = Math.max(1, Math.round(px * o.fill));
      const alpha = [.62, .82, 1];
      for (let l = 0; l < 3; l++) {
        const buf = layers[l]; ctx.globalAlpha = alpha[l]; ctx.beginPath();
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const i = y * cols + x, d = buf[i];
          if (!d || (l < 2 && layers[2][i] >= 1) || (l < 1 && layers[1][i] > d)) continue;
          const xn = x / cols, e = Math.min(1, Math.max(0, (xn - .03) / .34));
          const fade = e * e * (3 - 2 * e);                                   // dissolve toward the text side
          if ((BAYER[(y & 7) * 8 + (x & 7)] + .5) / 64 < d * fade) ctx.rect(x * px, y * px, sq, sq);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* ---------- motion ---------- */
    const wants = () => !reduce.matches && visible && !document.hidden &&
      (o.motion === 'always' || performance.now() < burstUntil);
    function frame(now) {
      raf = 0;
      if (o.motion === 'none' || reduce.matches || !visible || document.hidden || !canvas.getClientRects().length) { energy = 0; return; }
      const dt = Math.min(.1, (now - last) / 1000 || 0); last = now;
      const target = wants() ? 1 : 0;
      energy += (target - energy) * Math.min(1, dt * 3);                    // ease in and out of the gust
      time += dt * energy * o.speed; acc += dt;
      if (acc >= 1 / o.fps) { acc = 0; render(); }
      if (target || energy > .02) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf && !reduce.matches && visible && !document.hidden && canvas.getClientRects().length) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const gust = () => { if (o.motion !== 'none') { burstUntil = performance.now() + o.burst; kick(); } };
    const enter = () => { hovered = true; if(o.interactive !== false) gust(); }, leave = () => { hovered = false; };
    host.addEventListener('pointerenter', enter); host.addEventListener('pointerleave', leave);
    const ro = new ResizeObserver(() => { build(); render(); });
    ro.observe(canvas);
    const io = new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) kick(); });
    io.observe(canvas);
    const stop = () => { cancelAnimationFrame(raf); raf = 0; energy = 0; };
    const onVis = () => { if (document.hidden) stop(); else kick(); };
    const onMotion = () => { if (reduce.matches) { stop(); render(); } else kick(); };
    reduce.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVis);
    time = 2.4;                                                               // a pleasant resting pose
    build(); render(); gust();

    return {
      refresh() { gradient(); render(); if(o.refreshMotion !== false) gust(); },                            // sky changed: recolour, small gust
      set(next) { Object.assign(o, next); if (o.motion === 'none') { burstUntil = 0; stop(); } build(); render(); if (o.motion !== 'none') kick(); },
      destroy() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        host.removeEventListener('pointerenter', enter); host.removeEventListener('pointerleave', leave);
        document.removeEventListener('visibilitychange', onVis); reduce.removeEventListener('change', onMotion); }
    };
  }
  globalThis.CMWheat = { mount };
})();
