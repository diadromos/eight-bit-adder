/* circuit.js: the two simulators behind the workbench ladder.
   1. ELEC: a small DC nodal-analysis solver for Steps 1-6 (piles, lamps, knife switches, electromagnets, relays).
      Every terminal is a node; every wire and every closed contact is a 1 milliohm conductor, so current can be read
      on any wire. Piles are voltage sources with 0.5 ohm internal resistance. Relays are iterated until they settle.
      Nothing lights unless current really flows around a closed loop through the parts that are actually wired.
   2. LOGIC: for Steps 6 (XOR), 8 and 9 the earned modules are wired pin to pin, and the result is compiled into the
      existing gate-level simulator (js/sim.js, SIM.Net) and run gate by gate.
   Works in the browser (window.CIRCUIT) and in Node. */
(function (root) {
  'use strict';
  const K = {
    G_WIRE: 1000, R_INT: 0.5, R_LAMP: 10, R_RELAY: 30, R_MAGNET: 12, GMIN: 1e-9,
    LAMP_LIT: 0.15,        // A: a small low-current bulb glows from about 0.15 A (3 V pile: ~0.29 A)
    LAMP_FULL: 0.27,       // A: full heat
    RELAY_PULL: 0.06,      // A through the coil to pull the armature (3 V: ~0.097 A)
    MAGNET_PULL: 13,       // ampere-turns needed to lift the iron piece (3 V, 60 insulated turns: ~14)
    SHORT: 2.0             // A out of a pile = short circuit
  };
  /* pins of each electrical part kind */
  const PINS = { pile: ['+', '-'], lamp: ['a', 'b'], knife: ['a', 'b'], magnet: ['a', 'b'], relay: ['c1', 'c2', 'com', 'nc', 'no'] };

  function solve(n, cond, srcs) {
    // cond: [{a,b,G}], srcs: [{p,m,V,G}] (Norton: current V*G into p). Returns node voltages (Float64Array).
    const A = []; for (let i = 0; i < n; i++) { A.push(new Float64Array(n + 1)); A[i][i] = K.GMIN; }
    const add = (a, b, G) => { A[a][a] += G; A[b][b] += G; A[a][b] -= G; A[b][a] -= G; };
    cond.forEach(c => add(c.a, c.b, c.G));
    srcs.forEach(s => { add(s.p, s.m, s.G); A[s.p][n] += s.V * s.G; A[s.m][n] -= s.V * s.G; });
    for (let c = 0; c < n; c++) {                         // Gaussian elimination, partial pivoting
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      const t = A[c]; A[c] = A[piv]; A[piv] = t;
      const d = A[c][c]; if (Math.abs(d) < 1e-15) continue;
      for (let r = 0; r < n; r++) { if (r === c) continue; const f = A[r][c] / d; if (!f) continue; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
    }
    const v = new Float64Array(n); for (let i = 0; i < n; i++) v[i] = Math.abs(A[i][i]) < 1e-15 ? 0 : A[i][n] / A[i][i];
    return v;
  }

  /* parts: [{id, kind, closed?, volts?, turns?, insulated?}], wires: [{id, a:{p,pin}, b:{p,pin}}]
     prev: {relayId: energized} to start the relay iteration from (keeps latching circuits stable). */
  function elec(parts, wires, prev) {
    const idx = {}; let n = 0;
    const node = (p, pin) => { const k = p + ':' + pin; if (!(k in idx)) idx[k] = n++; return idx[k]; };
    parts.forEach(p => (PINS[p.kind] || []).forEach(pin => node(p.id, pin)));
    const byId = {}; parts.forEach(p => { byId[p.id] = p; });
    const ws = wires.filter(w => byId[w.a.p] && byId[w.b.p] && (PINS[byId[w.a.p].kind] || []).includes(w.a.pin) && (PINS[byId[w.b.p].kind] || []).includes(w.b.pin));
    const en = {}; parts.forEach(p => { if (p.kind === 'relay') en[p.id] = !!(prev && prev[p.id]); });
    let out = null, unstable = false;
    for (let it = 0; it < 12; it++) {
      const cond = [], srcs = [], tag = [];
      const C = (a, b, G, t) => { cond.push({ a, b, G }); tag.push(t); };
      ws.forEach(w => C(node(w.a.p, w.a.pin), node(w.b.p, w.b.pin), K.G_WIRE, { wire: w.id }));
      parts.forEach(p => {
        const N = pin => node(p.id, pin);
        if (p.kind === 'pile') srcs.push({ p: N('+'), m: N('-'), V: p.volts == null ? 3 : p.volts, G: 1 / K.R_INT, id: p.id });
        if (p.kind === 'lamp') C(N('a'), N('b'), 1 / K.R_LAMP, { lamp: p.id });
        if (p.kind === 'knife' && p.closed) C(N('a'), N('b'), K.G_WIRE, { knife: p.id });
        if (p.kind === 'magnet') C(N('a'), N('b'), 1 / K.R_MAGNET, { magnet: p.id });
        if (p.kind === 'relay') {
          C(N('c1'), N('c2'), 1 / K.R_RELAY, { coil: p.id });
          if (en[p.id]) C(N('com'), N('no'), K.G_WIRE, { contact: p.id, side: 'no' });
          else C(N('com'), N('nc'), K.G_WIRE, { contact: p.id, side: 'nc' });
        }
      });
      const v = solve(n, cond, srcs);
      const I = cond.map(c => (v[c.a] - v[c.b]) * c.G);
      out = { lamps: {}, relays: {}, magnets: {}, wires: {}, knives: {}, piles: {}, short: false, unstable: false, v, idx };
      cond.forEach((c, k) => {
        const t = tag[k], i = I[k];
        if (t.wire) out.wires[t.wire] = i;
        if (t.lamp) { const a = Math.abs(i); out.lamps[t.lamp] = { I: a, lit: a >= K.LAMP_LIT, heat: Math.max(0, Math.min(1, (a - 0.04) / (K.LAMP_FULL - 0.04))) }; }
        if (t.knife) out.knives[t.knife] = i;
        if (t.magnet) out.magnets[t.magnet] = { I: Math.abs(i) };
        if (t.coil) out.relays[t.coil] = Object.assign(out.relays[t.coil] || {}, { coilI: Math.abs(i), en: en[t.coil] });
        if (t.contact) out.relays[t.contact] = Object.assign(out.relays[t.contact] || {}, { [t.side]: Math.abs(i) });
      });
      parts.forEach(p => {
        if (p.kind === 'relay') { const r = out.relays[p.id] = Object.assign({ no: 0, nc: 0 }, out.relays[p.id]); r.en = en[p.id]; }
        if (p.kind === 'magnet') {
          const m = out.magnets[p.id], turns = p.turns == null ? 20 : p.turns;
          m.eff = p.insulated ? turns : 1;            // bare wire: current jumps across the touching turns
          m.pull = m.eff * m.I; m.grab = m.pull >= K.MAGNET_PULL; m.weak = m.I > 0.05 && !m.grab;
        }
      });
      srcs.forEach(s => { const i = s.V * s.G - (v[s.p] - v[s.m]) * s.G; out.piles[s.id] = { I: i, Vt: v[s.p] - v[s.m] }; if (Math.abs(i) > K.SHORT) out.short = true; });
      let changed = false;
      parts.forEach(p => { if (p.kind === 'relay') { const want = out.relays[p.id].coilI >= K.RELAY_PULL; if (want !== en[p.id]) { en[p.id] = want; changed = true; } } });
      if (!changed) break;
      if (it === 11) unstable = true;                // a relay that keeps switching itself (a buzzer)
    }
    out.unstable = unstable;
    out.energized = Object.assign({}, en);
    return out;
  }

  /* ---------------- LOGIC (modules) ---------------- */
  const MOD = {
    NOT: { ins: ['A'], outs: ['out'] }, AND: { ins: ['A', 'B'], outs: ['out'] }, OR: { ins: ['A', 'B'], outs: ['out'] },
    XOR: { ins: ['A', 'B'], outs: ['out'] }, HALF: { ins: ['A', 'B'], outs: ['S', 'C'] }, FULL: { ins: ['A', 'B', 'Cin'], outs: ['S', 'Cout'] },
    IN: { ins: [], outs: ['out'] }, OUT: { ins: ['in'], outs: [] }
  };
  /* parts: [{id, kind:'IN'|'OUT'|'NOT'...}], wires as above. inputs: {inPartId: 0|1}.
     Returns {net, values: {partId: {pin: 0|1|-1}}, lamps: {outPartId: 0|1|-1}, conflict, wireVal: {wireId: 0|1|-1}} */
  function logic(parts, wires, inputs) {
    const SIM = root.SIM;
    const byId = {}; parts.forEach(p => { byId[p.id] = p; });
    const par = {}; const key = (p, pin) => p + ':' + pin;
    const find = k => { while (par[k] !== k) { par[k] = par[par[k]]; k = par[k]; } return k; };
    parts.forEach(p => { const m = MOD[p.kind]; if (!m) return; m.ins.concat(m.outs).forEach(pin => { par[key(p.id, pin)] = key(p.id, pin); }); });
    const ws = wires.filter(w => key(w.a.p, w.a.pin) in par && key(w.b.p, w.b.pin) in par);
    ws.forEach(w => { const a = find(key(w.a.p, w.a.pin)), b = find(key(w.b.p, w.b.pin)); if (a !== b) par[a] = b; });
    const driver = {}; let conflict = false;           // group -> wire name of its single driver
    const net = new SIM.Net('bench'); net.input('zero');
    const outName = {};
    parts.forEach(p => { const m = MOD[p.kind]; if (!m) return; m.outs.forEach(pin => {
      const g = find(key(p.id, pin)); let name = 'g:' + g;
      if (driver[g]) { conflict = true; name = 'x:' + key(p.id, pin); } else driver[g] = name;
      outName[key(p.id, pin)] = name; }); });
    const inName = (p, pin) => { const g = find(key(p, pin)); return driver[g] || 'zero'; };
    parts.forEach(p => {
      const I = pin => inName(p.id, pin), O = pin => outName[key(p.id, pin)], pre = p.id + '.';
      switch (p.kind) {
        case 'IN': net.input(O('out')); break;
        case 'NOT': net.gate('NOT', [I('A')], O('out')); break;
        case 'AND': case 'OR': case 'XOR': net.gate(p.kind, [I('A'), I('B')], O('out')); break;
        case 'HALF': net.gate('XOR', [I('A'), I('B')], O('S')); net.gate('AND', [I('A'), I('B')], O('C')); break;
        case 'FULL': SIM.fullAdder(net, pre, I('A'), I('B'), I('Cin'), O('S'), O('Cout')); break;
      }
    });
    net.finalize();
    const ins = { zero: 0 };
    parts.forEach(p => { if (p.kind === 'IN') ins[outName[key(p.id, 'out')]] = inputs && inputs[p.id] ? 1 : 0; });
    const v = net.run(ins);
    const val = name => (name in net.w ? net.get(v, name) : 0);
    const values = {}, lamps = {}, wireVal = {};
    parts.forEach(p => { const m = MOD[p.kind]; if (!m) return; values[p.id] = {};
      m.ins.forEach(pin => { values[p.id][pin] = val(inName(p.id, pin)); });
      m.outs.forEach(pin => { values[p.id][pin] = val(outName[key(p.id, pin)]); });
      if (p.kind === 'OUT') lamps[p.id] = values[p.id].in; });
    ws.forEach(w => { const g = find(key(w.a.p, w.a.pin)); wireVal[w.id] = val(driver[g] || 'zero'); });
    return { net, values, lamps, conflict, wireVal };
  }

  const CIRCUIT = { K, PINS, MOD, solve, elec, logic };
  if (typeof module !== 'undefined') module.exports = CIRCUIT;
  root.CIRCUIT = CIRCUIT;
})(typeof window !== 'undefined' ? window : globalThis);
