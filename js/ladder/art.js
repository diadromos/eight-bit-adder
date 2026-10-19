/* art.js: thin helpers around Henri's workbench art (design/bench/bench-art.js, window.BENCH_ART) and bench.css.
   Defs, wires, sparks, bursts and the part animations come from his design/bench/bench.js (window.BENCH).
   The voltaic pile and the voltmeter for Step 1 come from his kit too (BENCH.pile, BENCH_ART.voltmeter, BENCH.meter). */
(function (root) {
  'use strict';
  const A = () => root.BENCH_ART;
  const reduced = () => root.BENCH.reduce();
  const installDefs = () => root.BENCH.installDefs();
  /* one of Henri's binding screws (from his terminal art), re-centred on (cx,cy) */
  let SCREW = null;
  function screw(pin, cx, cy) {
    if (!SCREW) { const m = A().terminal.match(/<g class='bn-screw '[\s\S]*<\/g>(?=<\/svg>)/); SCREW = m[0]; }
    return `<g transform='translate(${cx - 24} ${cy - 26})'>` + SCREW.replace("data-pin='t'", `data-pin='${pin}'`) + '</g>';
  }
  /* the voltaic pile and the voltmeter are now in Henri's kit (design/bench: BENCH.pile, BENCH_ART.voltmeter, BENCH.meter).
     Same contract as before: viewBox 0 0 90 160, pins - (16,147) + (74,147), g.cell[data-cell=i] per cell; the meter's .needle pivots at (70,76). */
  const pile = (cells, opt) => root.BENCH.pile(cells, opt);
  const meter = () => A().voltmeter;
  const ART_KEY = { lamp: 'lamp', knife: 'knife-switch', magnet: 'magnet', relay: 'relay', IN: 'knife-switch', OUT: 'lamp' };
  function partSvg(p) {
    if (p.kind === 'pile') return pile(p.cells || [{}, {}, {}]);
    return A()[ART_KEY[p.kind]];
  }
  /* pins and their centres, read from the art's binding screws */
  const pinCache = {};
  function pinsOf(kind, svgEl) {
    if (kind !== 'pile' && pinCache[kind]) return pinCache[kind];
    const o = {};
    svgEl.querySelectorAll('.bn-screw[data-pin]').forEach(g => {
      const h = g.querySelector('circle.head'); let cx = +h.getAttribute('cx'), cy = +h.getAttribute('cy');
      const t = g.parentNode.getAttribute && g.parentNode.getAttribute('transform');
      const m = t && t.match(/translate\(([-\d.]+) ([-\d.]+)\)/); if (m) { cx += +m[1]; cy += +m[2]; }
      o[g.dataset.pin] = { x: cx, y: cy };
    });
    if (kind !== 'pile') pinCache[kind] = o;
    return o;
  }
  /* Henri's module box (style.css .module + bench.css .module.bench) */
  const MOD_TITLE = { NOT: 'NOT', AND: 'AND', OR: 'OR', XOR: 'XOR', HALF: 'Half adder', FULL: 'Full adder' };
  const PIN_LABEL = { A: 'A', B: 'B', Cin: 'Cin', out: 'out', S: 'Sum', C: 'Carry', Cout: 'Cout' };
  function icon(k) {
    const g = root.GATES && root.GATES[k]; if (!g) return '';
    return g.replace(/^<svg[^>]*>/, '<svg class="micon gate" viewBox="0 0 60 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">');
  }
  /* left/right: [[pin, 'in'|'out'], ...] */
  function moduleHtml(kind, left, right, extraTitle) {
    const ic = { NOT: 'not', AND: 'and', OR: 'or', XOR: 'xor', HALF: 'xor', FULL: 'or' }[kind];
    const pin = ([p, dir]) => `<div class="mpin" data-pin="${p}" data-dir="${dir}"><span>${PIN_LABEL[p] || p}</span></div>`;
    return `<div class="module bench${kind === 'HALF' || kind === 'FULL' ? ' bakelite' : ''}" data-kind="${kind}"><div class="mpins in">${left.map(pin).join('')}</div>` +
      `<div class="mtitle">${icon(ic)}<span>${MOD_TITLE[kind]}${extraTitle ? '<small>' + extraTitle + '</small>' : ''}</span></div><div class="mpins out">${right.map(pin).join('')}</div></div>`;
  }
  /* sparks and bursts are Henri's (design/bench/bench.js) */
  const spark = g => root.BENCH.spark(g);
  const burst = (host, x, y) => root.BENCH.burst(host, x, y);
  /* cloth-covered wire: Henri's BENCH.wire, plus an id and a wide invisible hit path so a wire can be picked */
  /* routed wire: BENCH.wire({route}) draws straight runs with rounded elbows; level runs sag a little */
  function wireSvg(id, p, q, color, route) {
    const g = root.BENCH.wire(+p.x.toFixed(1), +p.y.toFixed(1), +q.x.toFixed(1), +q.y.toFixed(1), { color: color || 'brown', sag: .1, route: route && route.length ? route : null });
    const d = (g.match(/d='([^']+)'/) || [])[1];
    return g.replace('<g ', `<g id='wire-${id}' data-wire='${id}' `).replace(/(<g [^>]*>)/, `$1<path class='cw-hit' d='${d}'/>`);
  }
  const wirePath = (p, q) => root.BENCH.wirePath(+p.x.toFixed(1), +p.y.toFixed(1), +q.x.toFixed(1), +q.y.toFixed(1), .1);
  root.ART = { installDefs, screw, pile, meter, partSvg, pinsOf, moduleHtml, spark, burst, wirePath, wireSvg, reduced, PIN_LABEL, MOD_TITLE };
})(window);
