/* Levels transition (Henri, design/TRANSITIONS.md): switch circuit <-> gate <-> module.
   Phase A = circuit -> gate (0-280 ms), phase B = gate -> module (440-860 ms on Henri's timeline).
   Expand runs the same keyframes reversed with mirrored delays. Only transform/opacity/filter/dashoffset animate. */
(function (root) {
  'use strict';
  const EASE = { out: 'cubic-bezier(.2,.8,.2,1)', in: 'cubic-bezier(.4,0,1,1)', inout: 'cubic-bezier(.65,0,.35,1)', spring: 'cubic-bezier(.3,1.35,.6,1)' };
  const reduce = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rect(stage, el) { const s = stage.getBoundingClientRect(), b = el.getBoundingClientRect();
    return { x: b.left - s.left + b.width / 2, y: b.top - s.top + b.height / 2, w: b.width || 1, h: b.height || 1 }; }

  function planA(stage, circuit, gate) {
    const C = rect(stage, circuit.firstElementChild || circuit), G = rect(stage, gate.firstElementChild || gate);
    const gs = Math.min(C.w / G.w, C.h / G.h) * .75;
    return [
      [circuit, [{ opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(.6)', filter: 'blur(2px)' }], { delay: 0, duration: 280, easing: EASE.in }],
      [gate, [{ opacity: 0, transform: `scale(${gs})` }, { opacity: 1, transform: 'scale(1)' }], { delay: 80, duration: 200, easing: EASE.out }]
    ];
  }
  function planB(stage, gate, module) {
    const gEl = gate.firstElementChild || gate, mEl = module.querySelector('.module') || module;
    const G = rect(stage, gEl), M = rect(stage, mEl), ic = module.querySelector('.micon'), I = ic ? rect(stage, ic) : M;
    const toIcon = `translate(${I.x - G.x}px,${I.y - G.y}px) scale(${I.w / G.w})`;
    const p = [
      ...[...gate.querySelectorAll('.lead')].map(l => { const L = l.getTotalLength ? l.getTotalLength() : 10, out = l.classList.contains('lead-out');
        return [l, [{ strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: out ? L : -L }], { delay: 0, duration: 160, easing: EASE.in }]; }),
      [gate, [{ opacity: 1, transform: 'none', offset: 0, easing: EASE.inout }, { opacity: 1, transform: toIcon, offset: 220 / 260 }, { opacity: 0, transform: toIcon, offset: 1 }], { delay: 80, duration: 260 }],
      [mEl, [{ opacity: 0, transform: `scale(${G.w / M.w},${G.h / M.h})` }, { opacity: 1, transform: 'scale(1)' }], { delay: 120, duration: 240, easing: EASE.spring }],
      ...[...module.querySelectorAll('.mpin')].map((pn, i) => [pn, [{ opacity: 0, transform: `translateX(${pn.closest('.out') ? -14 : 14}px)` }, { opacity: 1, transform: 'none' }], { delay: 260 + i * 40, duration: 120, easing: EASE.out }])
    ];
    if (ic) p.push([ic, [{ opacity: 0 }, { opacity: 1 }], { delay: 300, duration: 80 }]);
    return p;
  }
  function run(plan, dir) {
    const T = Math.max(...plan.map(([, , o]) => o.delay + o.duration));
    const anims = plan.map(([el, kf, o]) => el.animate(kf, Object.assign({}, o, { fill: 'both',
      direction: dir === 'expand' ? 'reverse' : 'normal', delay: dir === 'expand' ? T - (o.delay + o.duration) : o.delay })));
    return Promise.all(anims.map(a => a.finished.catch(() => {}))).then(() => anims);
  }
  /* from/to: 2 = circuit, 1 = gate, 0 = module. layers = {stage, circuit, gate, module}. show(level) sets the resting state. */
  let busy = null;
  async function go(layers, from, to, show) {
    if (busy) { busy.forEach(a => a.cancel()); busy = null; }
    const vis = lv => [layers.module, layers.gate, layers.circuit].forEach((el, i) => el.classList.toggle('vis', lv.includes(i)));
    if (from === to || reduce()) { show(to); return; }
    const dir = to < from ? 'collapse' : 'expand', hi = Math.max(from, to), lo = Math.min(from, to);
    const phases = [];
    if (hi === 2 && lo <= 1) phases.push(() => { vis([2, 1]); return planA(layers.stage, layers.circuit, layers.gate); });
    if (lo === 0) phases.push(() => { vis([1, 0]); return planB(layers.stage, layers.gate, layers.module); });
    if (dir === 'expand') phases.reverse();
    const all = [];
    for (let i = 0; i < phases.length; i++) {
      if (i) await new Promise(r => setTimeout(r, 160));
      all.forEach(a => a.cancel()); all.length = 0;
      const a = await run(phases[i](), dir); all.push(...a);
    }
    all.forEach(a => a.cancel());
    show(to);
  }
  root.LEVELS = { go, EASE };
})(window);
