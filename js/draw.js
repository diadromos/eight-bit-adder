/* SVG drawing for every stage. Pure string builders; values are applied later by app.js render()
   through data attributes:
     data-w="wire"        element lights (.on) when the wire is 1, dims (.x) while unknown
     data-o / data-i      gate output wire / input wires (Henri's svg.gate, leads lit per input)
     data-v="wire"        text shows 0 / 1 / ? ; data-lbl="A" makes it "A=1"
     data-energ="wire"    relay coil energized ; data-lamp / data-sw for lamp and switch parts
     data-flow="wire"     adds Henri's .flow (moving current) while that wire is 1
   Gate and part artwork: Henri's design/gates/gates.js (GATES) and design/parts/parts.js (PARTS), used as-is. */
(function (root) {
  'use strict';
  const W = (d, w, cls, flow) => `<path class="halo" d="${d}"/><path class="wire${cls ? ' ' + cls : ''}" data-w="${w}"${flow ? ` data-flow="${flow}"` : ''} d="${d}"/>`;
  const P = (x, y, w) => `<circle class="pin" data-w="${w}" cx="${x}" cy="${y}" r="4"/>`;
  const J = (x, y, w) => `<circle class="jdot" data-w="${w}" cx="${x}" cy="${y}" r="3.2"/>`;
  const L = (x, y, t, w, a) => `<text class="lbl"${w ? ` data-w="${w}"` : ''} x="${x}" y="${y}" text-anchor="${a || 'start'}">${t}</text>`;
  const LV = (x, y, t, w, a) => `<text class="lbl" data-w="${w}" data-v="${w}" data-lbl="${t}" x="${x}" y="${y}" text-anchor="${a || 'start'}">${t}</text>`;
  const V = (x, y, w, a) => `<text class="val" data-w="${w}" data-v="${w}" x="${x}" y="${y}" text-anchor="${a || 'middle'}">?</text>`;
  function G(k, x, y, out, ins, mirror) {
    let s = root.GATES[k].replace('<svg ', `<svg x='${mirror ? 0 : x}' y='${mirror ? 0 : y}' data-o='${out}' data-i='${ins.join(',')}' `);
    return mirror ? `<g transform="translate(${x + 60} ${y}) scale(-1 1)">${s}</g>` : s;
  }
  const PART = (k, x, y, attrs) => root.PARTS[k].replace('<svg ', `<svg x='${x}' y='${y}' ${attrs || ''} `);
  const svg = (vb, body, cls) => `<svg class="circ${cls ? ' ' + cls : ''}" viewBox="${vb}" role="img">${body}</svg>`;
  /* gate icon for a module title (Henri's markup: svg.micon.gate) */
  const icon = k => root.GATES[k].replace(/^<svg[^>]*>/, '<svg class="micon gate" viewBox="0 0 60 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">');
  function moduleBox(title, ins, outs, ic, id) {
    const pin = p => `<div class="mpin" data-w="${p[0]}"><span>${p[1]}</span></div>`;
    return `<div class="module"${id ? ` id="${id}"` : ''}><div class="mpins in">${ins.map(pin).join('')}</div>` +
      `<div class="mtitle">${ic ? icon(ic) : ''}<span>${title}</span></div><div class="mpins out">${outs.map(pin).join('')}</div></div>`;
  }

  /* ---------------- Stage 0: battery, switch, lamp ---------------- */
  function stageSwitch() {
    return svg('0 0 420 130',
      W('M80 40 H150', 'one', '', 'lamp') + W('M210 40 H290', 'lamp', '', 'lamp') + W('M350 40 H395 V112 H6 V40 H20', 'lamp', '', 'lamp') +
      PART('battery', 20, 20) +
      `<g id="sw" role="switch" tabindex="0" aria-checked="false" aria-label="Switch" class="swhit"><rect x="140" y="0" width="80" height="70" rx="14" fill="transparent"/>${PART('switch', 150, 20, "data-sw='sw'")}</g>` +
      PART('lamp', 290, 20, "data-lamp='lamp'") +
      L(50, 76, 'battery', '', 'middle') + L(180, 86, 'switch', '', 'middle') + L(320, 76, 'lamp', 'lamp', 'middle'));
  }

  /* ---------------- Stage 1: gates, three levels ---------------- */
  // relay with its input stub (pin + label) under coil c1 and a ground under coil c2
  function relay(k, x, y, inW, label) {
    return W(`M${x + 14} ${y + 60} V${y + 78}`, inW) + P(x + 14, y + 80, inW) + L(x + 6, y + 84, label, inW, 'end') +
      `<path class="wire gnd" d="M${x + 46} ${y + 60} V${y + 70}"/>` + PART('ground', x + 16, y + 70) +
      PART(k, x, y, `data-energ='${inW}'`);
  }
  function gateCircuit(g) {
    if (g === 'AND') return svg('0 0 430 172',
      W('M70 40 H110', 'one', '', 'out') + W('M170 40 H210', 'A', '', 'out') + W('M270 40 H310', 'out', '', 'out') + W('M370 40 H410 V162 H4 V40 H10', 'out', '', 'out') +
      PART('battery', 10, 20) + relay('relay-no', 110, 20, 'A', 'A') + relay('relay-no', 210, 20, 'B', 'B') + PART('lamp', 310, 20, "data-lamp='out'"));
    if (g === 'OR') return svg('0 0 430 262',
      W('M70 40 H110', 'one', '', 'out') + W('M90 40 V150 H110', 'one', '', 'out') + J(90, 40, 'one') +
      W('M170 40 H310', 'out', '', 'out') + W('M170 150 H200 V40', 'out', '', 'out') + J(200, 40, 'out') + W('M370 40 H410 V252 H4 V40 H10', 'out', '', 'out') +
      PART('battery', 10, 20) + relay('relay-no', 110, 20, 'A', 'A') + relay('relay-no', 110, 130, 'B', 'B') + PART('lamp', 310, 20, "data-lamp='out'"));
    if (g === 'NOT') return svg('0 0 430 172',
      W('M70 40 H110', 'one', '', 'out') + W('M170 40 H310', 'out', '', 'out') + W('M370 40 H410 V162 H4 V40 H10', 'out', '', 'out') +
      PART('battery', 10, 20) + relay('relay-nc', 110, 20, 'A', 'A') + PART('lamp', 310, 20, "data-lamp='out'"));
    // XOR = (A OR B) AND NOT (A AND B): top row A,B in series drive the coil of a normally-closed relay;
    // A,B in parallel feed that NC contact, then the lamp.
    return svg('0 0 520 410',
      W('M70 200 H90', 'one', '', 'out') + W('M90 40 V300', 'one') + J(90, 200, 'one') + J(90, 170, 'one') +
      W('M90 40 H110', 'one') + W('M170 40 H210', 'A') + W('M270 40 H290 V240 H354 V210', 'a1') +
      W('M90 170 H110', 'one', '', 'out') + W('M90 300 H110', 'one', '', 'out') +
      W('M170 170 H340', 'o1', '', 'out') + W('M170 300 H200 V170', 'o1', '', 'out') + J(200, 170, 'o1') +
      W('M400 170 H420', 'out', '', 'out') + W('M480 170 H505 V400 H4 V200 H10', 'out', '', 'out') +
      PART('battery', 10, 180) +
      relay('relay-no', 110, 20, 'A', 'A') + relay('relay-no', 210, 20, 'B', 'B') +
      relay('relay-no', 110, 150, 'A', 'A') + relay('relay-no', 110, 280, 'B', 'B') +
      `<path class="wire gnd" d="M386 210 V220"/>` + PART('ground', 356, 220) + PART('relay-nc', 340, 150, "data-energ='a1'") +
      PART('lamp', 420, 150, "data-lamp='out'") +
      L(240, 92, 'A AND B', 'a1', 'middle') + L(250, 162, 'A OR B', 'o1', 'middle') + L(370, 142, 'NOT', 'out', 'middle'));
  }
  function gateSymbol(g) {
    if (g === 'NOT') return svg('0 0 200 80', W('M24 40 H70', 'A') + W('M130 40 H176', 'out') + G('not', 70, 20, 'out', ['A']) +
      P(20, 40, 'A') + P(180, 40, 'out') + LV(10, 28, 'A', 'A') + LV(190, 28, 'out', 'out', 'end') + L(100, 16, 'NOT', 'out', 'middle'), 'sym');
    if (g !== 'XOR') { const k = g.toLowerCase(); return svg('0 0 200 80',
      W('M24 32 H70', 'A') + W('M24 48 H70', 'B') + W('M130 40 H176', 'out') + G(k, 70, 20, 'out', ['A', 'B']) +
      P(20, 32, 'A') + P(20, 48, 'B') + P(180, 40, 'out') + LV(8, 24, 'A', 'A') + LV(8, 66, 'B', 'B') + LV(190, 28, 'out', 'out', 'end') +
      L(100, 14, g, 'out', 'middle'), 'sym'); }
    return svg('0 0 340 150',
      W('M24 22 H90', 'A') + W('M46 22 V92 H70', 'A') + J(46, 22, 'A') + W('M24 38 H90', 'B') + W('M34 38 V108 H70', 'B') + J(34, 38, 'B') +
      W('M150 30 H220 V52 H240', 'o1') + W('M130 100 H150', 'a1') + W('M210 100 H225 V68 H240', 'n1') + W('M300 60 H316', 'out') +
      G('or', 90, 10, 'o1', ['A', 'B']) + G('and', 70, 80, 'a1', ['A', 'B']) + G('not', 150, 80, 'n1', ['a1']) + G('and', 240, 40, 'out', ['o1', 'n1']) +
      P(20, 22, 'A') + P(20, 38, 'B') + P(320, 60, 'out') + LV(6, 14, 'A', 'A') + LV(6, 54, 'B', 'B') + LV(334, 48, 'out', 'out', 'end') +
      L(120, 8, 'OR', 'o1', 'middle') + L(100, 140, 'AND', 'a1', 'middle') + L(180, 140, 'NOT', 'n1', 'middle') + L(270, 36, 'AND', 'out', 'middle') +
      V(186, 25, 'o1') + V(140, 95, 'a1') + V(232, 96, 'n1'), 'sym');
  }
  function gateModule(g) {
    return moduleBox(g, g === 'NOT' ? [['A', 'A']] : [['A', 'A'], ['B', 'B']], [['out', 'out']], g.toLowerCase());
  }

  /* ---------------- Stage 2: half adder (Henri's layout) ---------------- */
  function halfGates() {
    return svg('0 0 200 120',
      W('M18 32 H70', 'A') + W('M44 32 V82 H70', 'A') + J(44, 32, 'A') + W('M18 48 H70', 'B') + W('M32 48 V98 H70', 'B') + J(32, 48, 'B') +
      W('M130 40 H182', 'S') + W('M130 90 H182', 'C') + G('xor', 70, 20, 'S', ['A', 'B']) + G('and', 70, 70, 'C', ['A', 'B']) +
      P(14, 32, 'A') + P(14, 48, 'B') + P(186, 40, 'S') + P(186, 90, 'C') +
      LV(4, 24, 'A', 'A') + LV(4, 64, 'B', 'B') + LV(198, 32, 'Sum', 'S', 'end') + LV(198, 82, 'Carry', 'C', 'end') +
      L(100, 16, 'XOR', 'S', 'middle') + L(100, 66, 'AND', 'C', 'middle'));
  }
  const halfModule = () => moduleBox('Half adder', [['A', 'A'], ['B', 'B']], [['S', 'Sum'], ['C', 'Carry']], 'xor');

  /* ---------------- Stage 3 / zoom: full adder (Henri's layout, 340 x 165) ----------------
     n = wire names {a,b,c,x1,a1,s,a2,co}; o = {labels, pins, vals, boxes:'dashed'|'solid'|'', names for pin labels} */
  function faBody(n, o) {
    o = o || {};
    let s = W('M18 32 H60', n.a) + W('M42 32 V102 H60', n.a) + W('M18 48 H60', n.b) + W('M30 48 V118 H60', n.b) +
      W('M18 142 H148 V68 H160', n.c, o.carry ? 'carry' : '') + W('M148 128 H160', n.c, o.carry ? 'carry' : '') +
      W('M120 40 H136 V52 H160', n.x1) + W('M136 52 V112 H160', n.x1) +
      W('M120 110 H126 V155 H232 V128 H240', n.a1) + W('M220 120 H230 V112 H240', n.a2) +
      W('M220 60 H312', n.s) + W('M300 120 H312', n.co, o.carry ? 'carry' : '') +
      J(42, 32, n.a) + J(30, 48, n.b) + J(148, 128, n.c) + J(136, 52, n.x1) +
      G('xor', 60, 20, n.x1, [n.a, n.b]) + G('and', 60, 90, n.a1, [n.a, n.b]) + G('xor', 160, 40, n.s, [n.x1, n.c]) +
      G('and', 160, 100, n.a2, [n.x1, n.c]) + G('or', 240, 100, n.co, [n.a2, n.a1]);
    if (o.boxes === 'dashed') s = `<rect class="habox" x="52" y="22" width="76" height="118" rx="14"/><rect class="habox" x="152" y="40" width="76" height="108" rx="14"/>` + s;
    if (o.boxes === 'solid') s += `<rect class="hablock" data-w="${n.x1}" x="64" y="14" width="52" height="122" rx="12"/><text class="hbl" x="90" y="72" text-anchor="middle">Half</text><text class="hbl" x="90" y="86" text-anchor="middle">adder</text>` +
      `<rect class="hablock" data-w="${n.s}" x="164" y="34" width="52" height="112" rx="12"/><text class="hbl" x="190" y="86" text-anchor="middle">Half</text><text class="hbl" x="190" y="100" text-anchor="middle">adder</text>`;
    if (o.pins) s += P(14, 32, n.a) + P(14, 48, n.b) + P(14, 142, n.c) + P(316, 60, n.s) + P(316, 120, n.co);
    if (o.labels) { const t = o.names || { a: 'A', b: 'B', c: 'Cin', s: 'Sum', co: 'Cout' };
      s += LV(4, 24, t.a, n.a) + LV(4, 64, t.b, n.b) + LV(4, 134, t.c, n.c) + LV(336, 52, t.s, n.s, 'end') + LV(336, 112, t.co, n.co, 'end');
      if (o.boxes !== 'solid') s += L(90, 16, 'XOR', n.x1, 'middle') + L(90, 86, 'AND', n.a1, 'middle') + L(190, 36, 'XOR', n.s, 'middle') + L(190, 96, 'AND', n.a2, 'middle');
      s += L(270, 96, 'OR', n.co, 'middle'); }
    if (o.vals) s += V(128, 35, n.x1) + V(180, 151, n.a1) + V(236, 107, n.a2);
    return s;
  }
  const FA_FULL = { a: 'A', b: 'B', c: 'Cin', x1: 'x1', a1: 'a1', s: 'S', a2: 'a2', co: 'Cout' };
  const faNames = i => ({ a: 'a' + i, b: 'b' + i, c: 'c' + i, x1: 'f' + i + '.x1', a1: 'f' + i + '.a1', s: 's' + i, a2: 'f' + i + '.a2', co: 'c' + (i + 1) });
  function fullGates(depth) { return svg('0 0 340 165', faBody(FA_FULL, { pins: 1, labels: 1, vals: 1, boxes: depth === 1 ? 'solid' : 'dashed' })); }
  const fullModule = () => moduleBox('Full adder', [['A', 'A'], ['B', 'B'], ['Cin', 'Cin']], [['S', 'Sum'], ['Cout', 'Cout']], 'or');
  function zoomFA(i) {
    return svg('0 0 340 165', faBody(faNames(i), { pins: 1, labels: 1, vals: 1, boxes: 'dashed', carry: 1,
      names: { a: 'A' + i, b: 'B' + i, c: 'c' + i, s: 'S' + i, co: 'c' + (i + 1) } }));
  }

  /* ---------------- Stage 4 expanded: 8 full adders, gate level ----------------
     Two rows (bits 7..4 over 3..0), each cell is the full adder mirrored so signals flow right-to-left
     with the carry. Cell 340 wide, pitch 360, row offset 350. */
  function rippleGates() {
    const R = 350, X = i => (i >= 4 ? 7 - i : 3 - i) * 360, Y = i => (i >= 4 ? 0 : R);
    let s = '';
    for (let i = 7; i >= 0; i--) {
      const x = X(i), y = Y(i);
      s += `<g class="cell" data-bit="${i}" transform="translate(${x + 340} ${y}) scale(-1 1)">${faBody(faNames(i), { carry: 1 })}</g>`;
      s += W(`M${x + 332} ${y - 30} V${y + 32} H${x + 322}`, 'a' + i) + P(x + 332, y - 34, 'a' + i) + LV(x + 326, y - 40, 'A' + i, 'a' + i, 'end');
      s += W(`M${x + 344} ${y - 18} V${y + 48} H${x + 322}`, 'b' + i) + P(x + 344, y - 22, 'b' + i) + LV(x + 350, y - 26, 'B' + i, 'b' + i);
      s += W(`M${x + 28} ${y + 60} H${x + 18} V${y + 190}`, 's' + i) + P(x + 18, y + 194, 's' + i) + LV(x + 18, y + 212, 'S' + i, 's' + i, 'middle');
      s += `<text class="bitl" x="${x + 170}" y="${y - 40}" text-anchor="middle">bit ${i}</text>`;
      if (i !== 3 && i !== 7) s += W(`M${x + 28} ${y + 120} H${x - 10} V${y + 142} H${x - 38}`, 'c' + (i + 1), 'carry');
    }
    // carry-in to bit 0, the c4 elbow from bit 3 up to bit 4, carry-out and overflow at bit 7
    s += W(`M1460 ${R + 142} H1402`, 'c0', 'carry') + P(1464, R + 142, 'c0') + LV(1470, R + 130, 'Cin', 'c0', 'end');
    s += W(`M28 ${R + 120} H-20 V${R - 82} H1450 V142 H1402`, 'c4', 'carry');
    s += W('M350 142 V228 H-50 V178 H-60', 'c7', 'carry') + J(350, 142, 'c7');
    s += W('M28 120 H-100', 'c8', 'carry') + W('M-40 120 V162 H-60', 'c8', 'carry') + J(-40, 120, 'c8') + P(-104, 120, 'c8') + LV(-104, 106, 'Cout', 'c8', 'middle');
    s += G('xor', -120, 150, 'v', ['c8', 'c7'], true) + W('M-120 170 H-140', 'v') + P(-144, 170, 'v') + LV(-144, 196, 'Overflow', 'v', 'start');
    return svg('-175 -60 1655 625', s, 'ripple-gates');
  }
  /* Stage 4 default: Henri's carry chain of full-adder cards (DOM order c8, bit 7 ... bit 0, c0). */
  function rippleChain() {
    const link = k => `<div class="link"><svg class="v" width="4" height="24"><line class="carry" data-w="c${k}" x1="2" y1="0" x2="2" y2="24"/></svg>` +
      `<svg class="h" width="22" height="4"><line class="carry" data-w="c${k}" x1="0" y1="2" x2="22" y2="2"/></svg><span class="clbl" data-w="c${k}">c${k}=<span data-v="c${k}">?</span></span></div>`;
    let h = link(8);
    for (let i = 7; i >= 0; i--) {
      h += `<div class="fa" data-bit="${i}" role="button" tabindex="0" aria-label="Full adder, bit ${i}"><div class="idx">${i}</div>` +
        `<div class="io"><span><i class="dot" data-w="a${i}"></i>A</span><span><i class="dot" data-w="b${i}"></i>B</span><span><i class="dot" data-w="c${i}"></i>Cin</span></div>` +
        `<div class="out"><div class="s" data-w="s${i}"><span>S <span data-v="s${i}">?</span></span></div><div class="co" data-w="c${i + 1}"><span>C <span data-v="c${i + 1}">?</span></span></div></div></div>` + link(i);
    }
    return `<div class="chain row" id="chain">${h}</div>`;
  }

  root.DRAW = { stageSwitch, gateCircuit, gateSymbol, gateModule, halfGates, halfModule, fullGates, fullModule, zoomFA, rippleGates, rippleChain, faNames };
})(window);
