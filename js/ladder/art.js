/* art.js: thin helpers around Henri's workbench art (design/bench/bench-art.js, window.BENCH_ART) and bench.css.
   Defs, wires, sparks, bursts and the part animations come from his design/bench/bench.js (window.BENCH).
   Two pieces had no drawing in the kit and are assembled here from his gradients and binding screws:
   the voltaic pile (zinc / cloth / copper discs) and the voltmeter for Step 1. */
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
  /* ---- the voltaic pile: cells = [{flip:bool}], bottom to top. viewBox 0 0 90 160, pins + (74,147) - (16,147) ---- */
  function pile(cells, opt) {
    opt = opt || {};
    const n = cells.length, top = 124, ch = n ? Math.min(15, 90 / n) : 15, dz = ch * 0.36, dc = ch * 0.26;
    let s = `<svg class='bn bn-pile${opt.cls ? ' ' + opt.cls : ''}' viewBox='0 0 90 160' width='90' height='160' overflow='visible'>`;
    s += "<g class='bn-base' filter='url(#bn-shadow)'><rect x='4' y='144' width='82' height='14' rx='6' fill='url(#bn-woodedge)'/><rect x='4' y='136' width='82' height='16' rx='6' fill='url(#bn-woodpiece)'/></g>";
    s += "<rect x='5.5' y='137' width='79' height='2' rx='1' fill='#fff' opacity='.22'/>";
    // two wooden guide rods
    const rodTop = Math.min(top - n * ch - 16, 100);
    s += `<rect x='12' y='${rodTop}' width='5' height='${138 - rodTop}' rx='2' fill='url(#bn-woodpiece)' stroke='#3a1f0a' stroke-width='.5'/>`;
    s += `<rect x='73' y='${rodTop}' width='5' height='${138 - rodTop}' rx='2' fill='url(#bn-woodpiece)' stroke='#3a1f0a' stroke-width='.5'/>`;
    s += `<rect x='16' y='${top}' width='58' height='7' rx='2' fill='url(#bn-brass)' stroke='#5a3f10' stroke-width='.5'/>`;   // bottom plate
    let y = top;
    const disc = (y, h, fill, cls, extra) => `<g class='${cls}'><rect x='20' y='${(y - h).toFixed(1)}' width='50' height='${h.toFixed(1)}' rx='${Math.min(2, h / 2).toFixed(1)}' fill='${fill}' stroke='rgba(0,0,0,.35)' stroke-width='.4'${extra || ''}/></g>`;
    cells.forEach((c, i) => {
      const layers = c.flip ? [['url(#bn-copper)', 'cu', dz], ['#7d6a4c', 'cloth', dc], ['url(#bn-zinc)', 'zn', dz]] : [['url(#bn-zinc)', 'zn', dz], ['#7d6a4c', 'cloth', dc], ['url(#bn-copper)', 'cu', dz]];
      s += `<g class='cell${c.flip ? ' flipped' : ''}' data-cell='${i}'>`;
      layers.forEach(([f, cl, h]) => { s += disc(y, h, f, cl); y -= h; });
      s += `<rect class='cell-gap' x='20' y='${(y - (ch - 2 * dz - dc)).toFixed(1)}' width='50' height='${(ch - 2 * dz - dc).toFixed(1)}' fill='none'/></g>`;
      y -= ch - 2 * dz - dc;
    });
    // brass top cap and the + lead down the right rod
    s += `<rect x='18' y='${(y - 6).toFixed(1)}' width='54' height='6' rx='2' fill='url(#bn-brass)' stroke='#5a3f10' stroke-width='.5'/>`;
    s += `<path d='M70 ${(y - 3).toFixed(1)} C82 ${(y - 3).toFixed(1)} 82 ${(y + 8).toFixed(1)} 81 ${Math.min(130, y + 30).toFixed(1)} S76 140 74 147' fill='none' stroke='url(#bn-coil)' stroke-width='2' stroke-linecap='round'/>`;
    s += `<path d='M18 ${top + 4} C10 ${top + 6} 14 140 16 147' fill='none' stroke='url(#bn-coil)' stroke-width='2' stroke-linecap='round'/>`;
    s += screw('-', 16, 147) + screw('+', 74, 147);
    s += "<text x='29' y='151' font-family='Georgia,serif' font-size='9' font-weight='700' fill='#f0d6a8'>−</text><text x='55' y='151' font-family='Georgia,serif' font-size='9' font-weight='700' fill='#f0d6a8'>+</text>";
    return s + '</svg>';
  }
  /* ---- a simple brass-rimmed voltmeter, 0..6 V ---- */
  function meter(v) {
    const ang = Math.max(-62, Math.min(62, -60 + (v / 6) * 120));
    let s = "<svg class='bn bn-meter' viewBox='0 0 140 110' width='140' height='110' role='img' aria-label='Voltmeter'>";
    s += "<g filter='url(#bn-shadow)'><rect x='4' y='10' width='132' height='96' rx='12' fill='url(#bn-woodedge)'/><rect x='4' y='4' width='132' height='96' rx='12' fill='url(#bn-woodpiece)'/></g>";
    s += "<circle cx='70' cy='78' r='60' fill='url(#bn-brass-r)' clip-path='inset(0 0 22px 0)'/>";
    s += "<path d='M16 76 A54 54 0 0 1 124 76 Z' fill='url(#bn-porcelain)' stroke='#6e4f16' stroke-width='2'/>";
    for (let k = 0; k <= 6; k++) { const a = (-60 + k * 20) * Math.PI / 180, x1 = 70 + 46 * Math.sin(a), y1 = 76 - 46 * Math.cos(a), x2 = 70 + 38 * Math.sin(a), y2 = 76 - 38 * Math.cos(a);
      s += `<path d='M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}' stroke='#3b2a17' stroke-width='${k === 3 ? 2 : 1.2}'/>`;
      s += `<text x='${(70 + 31 * Math.sin(a)).toFixed(1)}' y='${(79 - 31 * Math.cos(a)).toFixed(1)}' text-anchor='middle' font-family='Georgia,serif' font-size='8' fill='#3b2a17'>${k}</text>`; }
    s += "<text x='70' y='62' text-anchor='middle' font-family='Georgia,serif' font-size='7' letter-spacing='1' fill='#7a2b1e'>VOLTS</text>";
    s += `<g class='needle' style='transform-origin:70px 76px;transform:rotate(${ang}deg)'><path d='M70 78 L70 26' stroke='#7a2b1e' stroke-width='1.6' stroke-linecap='round'/></g>`;
    s += "<circle cx='70' cy='76' r='4' fill='url(#bn-brass-r)' stroke='#4e360b' stroke-width='.6'/>";
    return s + '</svg>';
  }
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
  function wireSvg(id, p, q, color) {
    const g = root.BENCH.wire(+p.x.toFixed(1), +p.y.toFixed(1), +q.x.toFixed(1), +q.y.toFixed(1), { color: color || 'brown', sag: .1 });
    const d = (g.match(/d='([^']+)'/) || [])[1];
    return g.replace('<g ', `<g id='wire-${id}' data-wire='${id}' `).replace(/(<g [^>]*>)/, `$1<path class='cw-hit' d='${d}'/>`);
  }
  const wirePath = (p, q) => root.BENCH.wirePath(+p.x.toFixed(1), +p.y.toFixed(1), +q.x.toFixed(1), +q.y.toFixed(1), .1);
  root.ART = { installDefs, screw, pile, meter, partSvg, pinsOf, moduleHtml, spark, burst, wirePath, wireSvg, reduced, PIN_LABEL, MOD_TITLE };
})(window);
