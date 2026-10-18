/* Gate-level simulator for the 8-bit adder toy.
   Every visible value is computed gate by gate from its input wires; nothing is computed arithmetically.
   Each gate has a level (= gate delays from the inputs). run(inputs, upTo) evaluates only gates with
   level <= upTo; wires that have not settled yet stay -1 ("unknown"). Works in the browser (window.SIM) and Node. */
(function (root) {
  'use strict';
  const EVAL = { AND: (a, b) => a & b, OR: (a, b) => a | b, XOR: (a, b) => a ^ b, NOT: a => a ^ 1 };

  function Net(name) { this.name = name; this.w = {}; this.names = []; this.gates = []; this.inputs = []; }
  Net.prototype.wire = function (n) { if (!(n in this.w)) { this.w[n] = this.names.length; this.names.push(n); } return this.w[n]; };
  Net.prototype.input = function (n) { this.inputs.push(this.wire(n)); return n; };
  Net.prototype.gate = function (t, ins, out) { this.gates.push({ t, ins: ins.map(n => this.wire(n)), o: this.wire(out), out, inNames: ins }); return out; };
  Net.prototype.finalize = function () {
    const lvl = new Array(this.names.length).fill(-1);
    this.inputs.forEach(i => { lvl[i] = 0; });
    let changed = true;                        // gates may be declared in any order
    while (changed) {
      changed = false;
      for (const g of this.gates) {
        if (g.ins.every(i => lvl[i] >= 0)) { const L = Math.max(...g.ins.map(i => lvl[i])) + 1; if (lvl[g.o] !== L) { lvl[g.o] = L; changed = true; } }
      }
    }
    this.gates.forEach(g => { g.lvl = lvl[g.o]; });
    this.gates.sort((a, b) => a.lvl - b.lvl);
    this.lvl = lvl; this.maxLvl = Math.max(0, ...lvl); this.n = this.names.length;
    return this;
  };
  Net.prototype.levelOf = function (name) { return this.lvl[this.w[name]]; };
  /* inputs: {name: 0|1}. upTo: highest gate level allowed to settle (Infinity = all). Returns Int8Array (-1 unknown). */
  Net.prototype.run = function (inputs, upTo) {
    if (upTo === undefined) upTo = Infinity;
    const v = new Int8Array(this.n).fill(-1);
    for (const k in inputs) if (k in this.w) v[this.w[k]] = inputs[k] ? 1 : 0;
    for (const g of this.gates) {
      if (g.lvl > upTo) break;
      const a = v[g.ins[0]], b = g.ins.length > 1 ? v[g.ins[1]] : 0;
      if (a < 0 || b < 0) continue;
      v[g.o] = EVAL[g.t](a, b);
    }
    return v;
  };
  Net.prototype.get = function (v, name) { return v[this.w[name]]; };

  /* A full adder made of two half adders (XOR + AND each) and an OR: the stage-3 module. */
  function fullAdder(net, p, a, b, c, sum, cout) {
    net.gate('XOR', [a, b], p + 'x1');          // half adder 1: sum
    net.gate('AND', [a, b], p + 'a1');          // half adder 1: carry
    net.gate('XOR', [p + 'x1', c], sum);        // half adder 2: sum
    net.gate('AND', [p + 'x1', c], p + 'a2');   // half adder 2: carry
    net.gate('OR', [p + 'a2', p + 'a1'], cout); // either carry
  }

  const NETS = {};
  // Stage 0: battery -> switch -> lamp. (The lamp is lit when the battery is connected AND the switch is closed.)
  (function () { const n = new Net('switch'); n.input('one'); n.input('sw'); n.gate('AND', ['one', 'sw'], 'lamp'); NETS.switch = n.finalize(); })();
  // Stage 1: one net per gate. XOR is built as (A OR B) AND NOT (A AND B).
  ['AND', 'OR', 'NOT', 'XOR'].forEach(function (k) {
    const n = new Net('gate-' + k); n.input('one'); n.input('A'); n.input('B');
    if (k === 'AND') n.gate('AND', ['A', 'B'], 'out');
    if (k === 'OR') n.gate('OR', ['A', 'B'], 'out');
    if (k === 'NOT') n.gate('NOT', ['A'], 'out');
    if (k === 'XOR') { n.gate('OR', ['A', 'B'], 'o1'); n.gate('AND', ['A', 'B'], 'a1'); n.gate('NOT', ['a1'], 'n1'); n.gate('AND', ['o1', 'n1'], 'out'); }
    NETS['gate-' + k] = n.finalize();
  });
  // Stage 2: half adder.
  (function () { const n = new Net('half'); n.input('A'); n.input('B'); n.gate('XOR', ['A', 'B'], 'S'); n.gate('AND', ['A', 'B'], 'C'); NETS.half = n.finalize(); })();
  // Stage 3: full adder.
  (function () { const n = new Net('full'); n.input('A'); n.input('B'); n.input('Cin'); fullAdder(n, '', 'A', 'B', 'Cin', 'S', 'Cout'); NETS.full = n.finalize(); })();
  // Stage 4: 8 full adders, carry c(i) -> c(i+1). c0 = carry-in, c8 = carry-out. v = c7 XOR c8 (signed overflow).
  (function () {
    const n = new Net('ripple');
    for (let i = 0; i < 8; i++) { n.input('a' + i); n.input('b' + i); }
    n.input('c0');
    for (let i = 0; i < 8; i++) fullAdder(n, 'f' + i + '.', 'a' + i, 'b' + i, 'c' + i, 's' + i, 'c' + (i + 1));
    n.gate('XOR', ['c7', 'c8'], 'v');
    NETS.ripple = n.finalize();
  })();

  function rippleInputs(a, b, cin) { const o = { c0: cin ? 1 : 0 }; for (let i = 0; i < 8; i++) { o['a' + i] = (a >> i) & 1; o['b' + i] = (b >> i) & 1; } return o; }
  /* Read the adder's outputs off its wires (gate level). Returns null fields while unsettled. */
  function readRipple(v) {
    const n = NETS.ripple; let sum = 0, known = true;
    for (let i = 0; i < 8; i++) { const s = n.get(v, 's' + i); if (s < 0) known = false; else sum |= s << i; }
    const c = n.get(v, 'c8'), ov = n.get(v, 'v');
    return { sum: known ? sum : null, cout: c < 0 ? null : c, overflow: ov < 0 ? null : ov };
  }
  function add(a, b, cin) { return readRipple(NETS.ripple.run(rippleInputs(a, b, cin))); }

  const SIM = { Net, NETS, fullAdder, rippleInputs, readRipple, add };
  if (typeof module !== 'undefined') module.exports = SIM;
  root.SIM = SIM;
})(typeof window !== 'undefined' ? window : globalThis);
