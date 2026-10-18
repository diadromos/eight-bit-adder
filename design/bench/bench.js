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
     BENCH.setWire(g, v)                 v = 1 | 0 | null(unknown); adds .on / .x
   States (el = the part's <svg>)
     BENCH.heat(el, v)                   lamp filament --heat 0..1 (CSS transition does the warming)
     BENCH.knife(el, closed)             blade swings about its hinge; spark at the jaw when it closes
     BENCH.magnet(el, on)                iron piece snaps to the nail with overshoot (and drops back)
     BENCH.relay(el, on)                 armature swings, clicks with a small bounce, spark at the contact that closes
     BENCH.spark(g)                      play one spark group (.bn-spark), ~150 ms
     BENCH.tighten(screwG, {color})      screw slot turns 270 deg while a wire end snugs under the washer
   Step furniture
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
    o = o || {}; const d = wirePath(x1, y1, x2, y2, o.sag, o.ctrl);
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
    terminal: { t: [24, 26] }
  };
  // place a part inside a scene <svg>: returns { svg, pin(name) -> [x, y] in scene units }
  function place(key, x, y, scale, attrs) {
    const vb = (A()[key].match(/viewBox='([^']+)'/) || [, '0 0 100 100'])[1].split(/\s+/).map(Number);
    const w = vb[2] * scale, h = vb[3] * scale;
    const svg = part(key, `x='${x}' y='${y}' width='${w}' height='${h}' ${attrs || ''}`);
    return { svg, w, h, pin: n => { const p = (PINS[key] || {})[n]; return [+(x + p[0] * scale).toFixed(1), +(y + p[1] * scale).toFixed(1)]; } };
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

  root.BENCH = { PINS, place, installDefs, part, benchTop, wirePath, wire, setWire, spark, heat, knife, magnet, relay, tighten, loosen, burst, binaryRow, setBinary, flash, reduce };
})(window);
