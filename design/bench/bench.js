/* design/bench/bench.js — workbench helpers (classic script, window.BENCH). Needs bench-art.js (window.BENCH_ART)
   and bench.css. Every animation has a reduced-motion path: the final state is applied instantly and the
   element gets a brief .bn-flash highlight (no swing, overshoot, spark or flow).

   Art
     BENCH.installDefs()                 inject the shared gradients/patterns/filters once (idempotent)
     BENCH.part(key, attrs)              SVG string for BENCH_ART[key] with extra attributes, e.g. "class='x' data-id='L1'"
     BENCH.benchTop()                    wood-grain SVG for the background of a .bn-scene
     BENCH.PINS[key][pin]                terminal point in the part's own viewBox
     BENCH.place(key,x,y,scale,attrs)    nested <svg> for a scene + pin(name) -> scene coordinates
   Cloth wire
     BENCH.wirePath(x1,y1,x2,y2,sag)     quadratic path that sags (sag = fraction of length, default .12, downward)
     BENCH.wire(x1,y1,x2,y2,{sag,ctrl,color,net,cls})  ctrl=[x,y] overrides the sag to route round a part;  layered <g class='cw COLOR' data-w=NET> (cloth + braid + amber signal + flow)
     BENCH.wire(...,{route:[[x,y],...]})  orthogonal run through the given corner points (rounded elbows, level runs sag)
     BENCH.route(pts, {r, droop})        the path data for such a run; BENCH.rowRoute(p, q, {gapY, outP, outQ, lead, minX, maxX})
                                         corner points that wrap a wire from one row of modules to the next along the gap
     BENCH.setWire(g, v)                 v = 1 | 0 | null(unknown); adds .on / .x
   States (el = the part's <svg>)
     BENCH.heat(el, v)                   lamp filament --heat 0..1 (CSS transition does the warming)
     BENCH.knife(el, closed)             blade swings about its hinge; spark at the jaw when it closes
     BENCH.magnet(el, on)                iron piece snaps to the nail with overshoot (and drops back)
     BENCH.relay(el, on)                 armature swings, clicks with a small bounce, spark at the contact that closes
     BENCH.spark(g)                      play one spark group (.bn-spark), ~150 ms
     BENCH.tighten(screwG, {color})      screw slot turns 270 deg while a wire end snugs under the washer
   Step 1
     BENCH.pile(cells, {cls})            voltaic pile SVG for [{flip}, ...] (bottom to top); pins - (16,147), + (74,147)
     BENCH.meter(el, volts, {max, ms})   swing the voltmeter needle (BENCH_ART.voltmeter); BENCH.meterAngle(v, max)
   Step furniture
     BENCH.drawerHtml({label}) / BENCH.drawer(el, open)   the parts drawer pulled out at the front edge of a .bn-scene
     BENCH.burst(container, x, y)        brass-spark burst for a solved step
     BENCH.binaryRow(el, value)          build 8 carbon bulbs with engraved place values; BENCH.setBinary(el, value)
*/
(function (root) {
  'use strict';
  const A = () => root.BENCH_ART || {};
  const reduce = () => document.documentElement.classList.contains('bn-reduce') || !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $ = (s, el) => (el || document).querySelector(s);
  const can = el => el && typeof el.animate === 'function';
  function flash(el) { if (!el) return; el.classList.remove('bn-flash'); void el.getBoundingClientRect(); el.classList.add('bn-flash');
    setTimeout(() => el.classList.remove('bn-flash'), 450); }

  function installDefs() {
    if (document.getElementById('bn-brass')) return;
    const d = document.createElement('div'); d.innerHTML = A().defs; document.body.prepend(d.firstElementChild);
  }
  // extra attributes; a class='...' in attrs is merged into the part's own class list
  function part(k, attrs) {
    let s = A()[k]; attrs = attrs || '';
    const m = attrs.match(/class=(['"])(.*?)\1/);
    if (m) { attrs = attrs.replace(m[0], ''); s = s.replace(/class='([^']*)'/, (all, c) => `class='${c} ${m[2]}'`); }
    ['width', 'height'].forEach(a => { if (new RegExp(`(^|\\s)${a}=`).test(attrs)) s = s.replace(new RegExp(`(<svg[^>]*?) ${a}='[^']*'`), '$1'); });
    return s.replace('<svg ', `<svg ${attrs} `);
  }
  const benchTop = () => A()['bench-top'];

  // ---- cloth wire ----
  function wirePath(x1, y1, x2, y2, sag, ctrl) {
    if (ctrl) return `M${x1} ${y1} Q${ctrl[0]} ${ctrl[1]} ${x2} ${y2}`;   // explicit control point to route round a part
    sag = sag == null ? .12 : sag;
    const L = Math.hypot(x2 - x1, y2 - y1), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    // control point: below the midpoint (gravity), scaled by length and by how horizontal the run is
    const horiz = Math.abs(x2 - x1) / (L || 1);
    const cx = mx, cy = my + sag * L * 2 * (.35 + .65 * horiz);
    return `M${x1} ${y1} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2} ${y2}`;
  }
  function wire(x1, y1, x2, y2, o) {
    o = o || {}; const d = o.route ? route([[x1, y1]].concat(o.route, [[x2, y2]]), o) : wirePath(x1, y1, x2, y2, o.sag, o.ctrl);
    const tip = (x, y) => `<circle class='cw-tip' cx='${x}' cy='${y}' r='2.4'/>`;
    return `<g class='cw ${o.color || 'brown'} ${o.cls || ''}'${o.net ? ` data-w='${o.net}'` : ''}>` +
      `<path class='cw-out' d='${d}'/><path class='cw-base' d='${d}'/><path class='cw-b1' d='${d}'/><path class='cw-b2' d='${d}'/>` +
      `<path class='cw-sheen' d='${d}' transform='translate(0 -1)'/><path class='cw-sig' d='${d}'/><path class='cw-flow' d='${d}'/>` +
      tip(x1, y1) + tip(x2, y2) + `</g>`;
  }
  function setWire(g, v) { g.classList.toggle('on', v === 1); g.classList.toggle('x', v == null || v < 0); }

  // ---- pins: terminal points in each part's own viewBox (see BENCH-PINS.md) ----
  const PINS = {
    lamp: { a: [16, 141], b: [74, 141] },
    'dry-cell': { '+': [36, 8], '-': [54, 14] },
    'wet-cell': { '-': [32, 14], '+': [67, 14] },
    'knife-switch': { a: [16, 84], b: [144, 84] },
    magnet: { a: [22, 58], b: [128, 58] },
    relay: { c1: [18, 107], c2: [40, 107], com: [98, 107], nc: [134, 107], no: [166, 107] },
    terminal: { t: [24, 26] },
    voltmeter: { '-': [22, 96], '+': [118, 96] },
    'voltaic-pile': { '-': [16, 147], '+': [74, 147] }
  };
  // place a part inside a scene <svg>: returns { svg, pin(name) -> [x, y] in scene units }
  function place(key, x, y, scale, attrs) {
    const vb = (A()[key].match(/viewBox='([^']+)'/) || [, '0 0 100 100'])[1].split(/\s+/).map(Number);
    const w = vb[2] * scale, h = vb[3] * scale;
    const svg = part(key, `x='${x}' y='${y}' width='${w}' height='${h}' ${attrs || ''}`);
    return { svg, w, h, pin: n => { const p = (PINS[key] || {})[n]; return [+(x + p[0] * scale).toFixed(1), +(y + p[1] * scale).toFixed(1)]; } };
  }


  // ---- routed cloth wire: straight runs with rounded elbows; long level runs sag a little (cloth has weight) ----
  // pts = [[x,y], ...] including both ends. o.r = elbow radius (default 12), o.droop = sag per 100 px of level run (default 4, max 10 px)
  function route(pts, o) {
    o = o || {}; const r = o.r == null ? 12 : o.r, droop = o.droop == null ? 4 : o.droop, F = n => +(+n).toFixed(1);
    // corner cut points
    const cut = [];
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const l1 = Math.hypot(x1 - x0, y1 - y0) || 1, l2 = Math.hypot(x2 - x1, y2 - y1) || 1;
      const k1 = Math.min(r, l1 / 2) / l1, k2 = Math.min(r, l2 / 2) / l2;
      cut.push({ a: [x1 - (x1 - x0) * k1, y1 - (y1 - y0) * k1], c: [x1, y1], b: [x1 + (x2 - x1) * k2, y1 + (y2 - y1) * k2] });
    }
    let d = `M${F(pts[0][0])} ${F(pts[0][1])}`, cur = pts[0];
    const seg = to => {   // a run from cur to `to`: level and long -> gentle quadratic sag, else straight
      const dx = to[0] - cur[0], dy = to[1] - cur[1], L = Math.hypot(dx, dy);
      if (Math.abs(dy) < 1 && L > 60 && droop) { const s = Math.min(10, L / 100 * droop); d += ` Q${F((cur[0] + to[0]) / 2)} ${F(cur[1] + 2 * s)} ${F(to[0])} ${F(to[1])}`; }
      else d += ` L${F(to[0])} ${F(to[1])}`;
      cur = to;
    };
    cut.forEach(c => { seg(c.a); d += ` Q${F(c.c[0])} ${F(c.c[1])} ${F(c.b[0])} ${F(c.b[1])}`; cur = c.b; });
    seg(pts[pts.length - 1]);
    return d;
  }
  // route between two rows of modules: leave each pin sideways (outwards, past the module edge), drop to the gap
  // between the rows, run along it, and come back up/down to the other pin. Returns the inner points for BENCH.wire(..., {route}).
  //   p, q   : {x, y} pin centres (stage units)
  //   o.gapY : y of the run between the rows (e.g. midway between the bottom of the upper row and the top of the lower row)
  //   o.outP / o.outQ : -1 if that pin faces left (e.g. Cout on the left edge), +1 if it faces right (Cin on the right edge)
  //   o.lead : how far to go out before turning (default 16): enough to clear the module edge, small enough to stay on the bench
  //   o.minX / o.maxX : keep the vertical runs inside these bounds (bench edges)
  function rowRoute(p, q, o) {
    o = o || {}; const lead = o.lead == null ? 16 : o.lead, lo = o.minX == null ? -1e9 : o.minX, hi = o.maxX == null ? 1e9 : o.maxX;
    const cx = x => Math.max(lo, Math.min(hi, x));
    const xp = cx(p.x + (o.outP || -1) * lead), xq = cx(q.x + (o.outQ || 1) * lead), g = o.gapY;
    return [[xp, p.y], [xp, g], [xq, g], [xq, q.y]];
  }

  // ---- voltaic pile + voltmeter ----
  const pile = (cells, opt) => A().pile(cells, opt);
  const meterAngle = (v, max) => Math.max(-64, Math.min(64, -60 + 120 * (v / (max || 6))));   // stop pins at +-64 deg
  // swing the needle to `v` volts: a damped moving-coil swing (overshoot ~14%, one small return), ~650 ms.
  // Reduced motion: the needle is set at once and the dial gets the brief highlight.
  function meter(el, v, o) {
    o = o || {}; const nd = $('.needle', el); if (!nd) return Promise.resolve();
    const to = meterAngle(v, o.max), from = el.dataset.angle != null ? +el.dataset.angle : -60;
    el.dataset.angle = to; el.dataset.volts = v;
    nd.style.transition = 'none'; nd.style.transform = `rotate(${to}deg)`;
    if (reduce() || !can(nd) || Math.abs(to - from) < .2) { if (reduce() && Math.abs(to - from) >= .2) flash(el); return Promise.resolve(); }
    const dlt = to - from, ov = Math.max(-9, Math.min(9, dlt * .14)), clampA = a => Math.max(-64, Math.min(64, a));
    const a = nd.animate([
      { transform: `rotate(${from}deg)`, easing: 'cubic-bezier(.3,.1,.3,1)' },
      { transform: `rotate(${clampA(to + ov)}deg)`, offset: .48, easing: 'ease-in-out' },
      { transform: `rotate(${clampA(to - ov * .32)}deg)`, offset: .74, easing: 'ease-in-out' },
      { transform: `rotate(${clampA(to + ov * .08)}deg)`, offset: .9 },
      { transform: `rotate(${to}deg)` }], { duration: o.ms || 650 });
    return a.finished.catch(() => {});
  }

  // ---- parts drawer inside the bench scene (front edge) ----
  // markup: append BENCH.drawerHtml({label, id, slotsId, pullId, pullLabel, open}) to a .bn-scene and add .has-drawer to the scene; put the tray buttons
  // into .bn-drawer-slots. BENCH.drawer(drawerEl, open) slides it in/out (the brass pull is the toggle button).
  function drawerHtml(o) {
    o = o || {};
    return `<div class="bn-drawer" data-open="${o.open === false ? 'false' : 'true'}"${o.id ? ` id="${o.id}"` : ''}>` +
      `<div class="bn-drawer-box"><div class="bn-drawer-slots" role="list"${o.slotsId ? ` id="${o.slotsId}"` : ''}></div></div>` +
      `<div class="bn-drawer-front"><span class="bn-drawer-label">${o.label || 'Parts'}</span>` +
      `<button type="button" class="bn-drawer-pull"${o.pullId ? ` id="${o.pullId}"` : ''} aria-expanded="${o.open === false ? 'false' : 'true'}" aria-label="${o.pullLabel || 'Parts drawer'}"></button></div></div>`;
  }
  function drawer(el, open) {
    if (open == null) open = el.dataset.open !== 'true';
    el.dataset.open = open ? 'true' : 'false';
    const b = $('.bn-drawer-pull', el); if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (reduce()) flash(el);
    return open;
  }

  // ---- spark ----
  function spark(g) {
    if (!g || reduce() || !can(g)) return Promise.resolve();
    const fl = g.querySelector('.flash'), st = g.querySelector('.star');
    const o = { duration: 160, easing: 'cubic-bezier(.2,.8,.2,1)' };
    const a = [
      g.animate([{ opacity: 1 }, { opacity: 1 }], { duration: 160 }),   // shows the (normally hidden) group only while it plays
      fl.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.2)', offset: .25 }, { opacity: 0, transform: 'scale(1.5)' }], Object.assign({}, o)),
      st.animate([{ opacity: 0, transform: 'scale(.2) rotate(0deg)' }, { opacity: 1, transform: 'scale(1.15) rotate(12deg)', offset: .25 }, { opacity: 0, transform: 'scale(.6) rotate(28deg)', offset: .85 }, { opacity: 0, transform: 'scale(.6) rotate(28deg)' }], Object.assign({}, o))
    ];
    [fl, st].forEach(n => { n.style.transformBox = 'fill-box'; n.style.transformOrigin = 'center'; });
    return Promise.all(a.map(x => x.finished.catch(() => {})));
  }

  // ---- lamp ----
  function heat(el, v) {
    if (reduce()) { el.style.transition = 'none'; el.style.setProperty('--heat', v); el.classList.toggle('on', v >= .5); flash(el); return; }
    el.style.transition = ''; el.style.setProperty('--heat', v); el.classList.toggle('on', v >= .5);
  }

  // ---- knife switch ----
  function knife(el, closed) {
    const was = el.classList.contains('closed');
    el.classList.toggle('closed', closed); el.setAttribute('aria-checked', closed ? 'true' : 'false');
    const blade = $('.blade', el);
    if (reduce()) { flash(el); return Promise.resolve(); }
    if (closed && !was) {   // spark as the blade enters the jaw (end of the CSS swing), then a tiny settle wobble
      const ms = (parseFloat(getComputedStyle(blade).transitionDuration) || .36) * 1000;
      return new Promise(r => setTimeout(r, ms - 10)).then(() => {
        spark($('.bn-spark', el));
        if (can(blade)) blade.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-1.6deg)', offset: .35 }, { transform: 'rotate(0deg)' }], { duration: 140, easing: 'ease-out' });
      });
    }
    return Promise.resolve();
  }

  // ---- electromagnet ----
  function magnet(el, on) {
    const iron = $('.iron', el); el.classList.toggle('on', on);
    if (reduce() || !can(iron)) { if (iron) iron.style.transition = 'none'; flash(el); return Promise.resolve(); }
    iron.style.transition = 'none';
    const kf = on ? [{ transform: 'translateX(0)' }, { transform: 'translateX(-14px)', offset: .62 }, { transform: 'translateX(-11.4px)', offset: .82 }, { transform: 'translateX(-12px)' }]
                  : [{ transform: 'translateX(-12px)' }, { transform: 'translateX(1.5px)', offset: .7 }, { transform: 'translateX(0)' }];
    const a = iron.animate(kf, { duration: on ? 230 : 300, easing: on ? 'cubic-bezier(.55,0,1,.45)' : 'cubic-bezier(.2,.8,.2,1)' });
    return a.finished.catch(() => {}).then(() => { iron.style.transition = ''; });
  }

  // ---- relay ----
  function relay(el, on) {
    const arm = $('.armature', el), was = el.classList.contains('energized');
    el.classList.toggle('energized', on);
    if (reduce() || !can(arm) || was === on) { if (reduce()) flash(el); return Promise.resolve(); }
    arm.style.transition = 'none';
    const kf = on ? [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-7.4deg)', offset: .55 }, { transform: 'rotate(-6deg)', offset: .75 }, { transform: 'rotate(-6.7deg)', offset: .9 }, { transform: 'rotate(-6.5deg)' }]
                  : [{ transform: 'rotate(-6.5deg)' }, { transform: 'rotate(.9deg)', offset: .55 }, { transform: 'rotate(-.4deg)', offset: .78 }, { transform: 'rotate(0deg)' }];
    const a = arm.animate(kf, { duration: 190, easing: 'cubic-bezier(.5,0,.75,.5)' });
    setTimeout(() => spark($(on ? '.spark-no' : '.spark-nc', el)), 95);   // the "click": contact meets at ~half way
    return a.finished.catch(() => {}).then(() => { arm.style.transition = ''; });
  }

  // ---- screw tightening ----
  function tighten(screw, o) {
    o = o || {};
    const slot = $('.slot', screw), head = $('.head', screw), end = $('.wire-end', screw);
    const cx = +head.getAttribute('cx'), cy = +head.getAttribute('cy'), r = +head.getAttribute('r');
    // the bare copper end loops clockwise under the washer (the right way round, so tightening pulls it in)
    end.innerHTML = `<path d='M${cx - r - 9} ${cy + 1} C${cx - r - 2} ${cy + 1} ${cx - r} ${cy + r + 2} ${cx} ${cy + r + 2.2} C${cx + r + 2} ${cy + r + 2} ${cx + r + 2.4} ${cy - r - 2} ${cx} ${cy - r - 2.4} C${cx - r} ${cy - r - 2} ${cx - r - 2} ${cy - 2} ${cx - r - 1} ${cy}' fill='none' stroke='url(#bn-copper)' stroke-width='2' stroke-linecap='round'/>`;
    screw.classList.add('tight');
    if (reduce() || !can(slot)) { slot.style.transition = 'none'; flash(screw); return Promise.resolve(); }
    slot.style.transition = 'none';
    const a = slot.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(270deg)' }], { duration: 480, easing: 'cubic-bezier(.3,.6,.2,1)' });
    end.animate([{ transform: 'translate(-6px,0) scale(1.08)', opacity: .6 }, { transform: 'none', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.3,.6,.2,1)' });
    head.animate([{ transform: 'none' }, { transform: 'scale(.94)', offset: .85 }, { transform: 'none' }], { duration: 480 });
    head.style.transformBox = 'fill-box'; head.style.transformOrigin = 'center';
    return a.finished.catch(() => {});
  }
  function loosen(screw) { screw.classList.remove('tight'); const e = $('.wire-end', screw); if (e) e.innerHTML = ''; }

  // ---- step furniture ----
  function burst(container, x, y) {
    if (reduce()) { flash(container); return; }
    const b = document.createElement('div'); b.className = 'bn-burst'; b.style.left = x + 'px'; b.style.top = y + 'px';
    b.innerHTML = '<div class="core"></div>' + Array.from({ length: 14 }, () => '<i></i>').join('') + Array.from({ length: 10 }, () => '<b></b>').join('');
    container.appendChild(b);
    b.querySelector('.core').animate([{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1)', offset: .2 }, { opacity: 0, transform: 'scale(1.6)' }], { duration: 600, easing: 'ease-out', fill: 'both' });
    b.querySelectorAll('i').forEach((n, k) => { const a = k * 360 / 14 + (k % 2) * 8, d = 46 + (k % 3) * 14;
      n.animate([{ transform: `rotate(${a}deg) translateY(-6px) scaleY(.3)`, opacity: 1 }, { transform: `rotate(${a}deg) translateY(${-d}px) scaleY(1)`, opacity: 1, offset: .45 }, { transform: `rotate(${a}deg) translateY(${-d - 16}px) scaleY(.2)`, opacity: 0 }],
        { duration: 620, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }); });
    b.querySelectorAll('b').forEach((n, k) => { const a = (k * 37 + 10) * Math.PI / 180, d = 40 + (k % 4) * 12;
      n.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - 10}px)`, opacity: 1, offset: .5 }, { transform: `translate(${Math.cos(a) * d * 1.1}px,${Math.sin(a) * d + 30}px)`, opacity: 0 }],
        { duration: 900, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'both' }); });
    setTimeout(() => b.remove(), 950);
  }
  function binaryRow(el, value) {
    installDefs();
    el.classList.add('binrow');
    el.innerHTML = [7, 6, 5, 4, 3, 2, 1, 0].map(i => `<div class="bb" data-bit="${i}">${part('bulb', "class='bn bn-lamp bn-minibulb'")}` +
      `<span class="bit-v">0</span><span class="pv">${1 << i}</span></div>`).join('');
    setBinary(el, value || 0, true);
  }
  function setBinary(el, value, instant) {
    el.querySelectorAll('.bb').forEach(bb => { const i = +bb.dataset.bit, on = (value >> i) & 1, s = bb.querySelector('svg');
      bb.classList.toggle('on', !!on); bb.querySelector('.bit-v').textContent = on;
      if (instant) { s.style.transition = 'none'; s.style.setProperty('--heat', on); s.classList.toggle('on', !!on); requestAnimationFrame(() => { s.style.transition = ''; }); }
      else heat(s, on); });
  }

  root.BENCH = { PINS, place, installDefs, part, benchTop, wirePath, wire, setWire, route, rowRoute, pile, meter, meterAngle, drawerHtml, drawer, spark, heat, knife, magnet, relay, tighten, loosen, burst, binaryRow, setBinary, flash, reduce };
})(window);
