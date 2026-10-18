/* bench.js: the workbench. Parts are dragged (or tapped) out of the tray onto the bench and wired screw to screw.
   One engine serves both kinds of bench:
     mode 'elec'  (Steps 2-6): Henri's parts, simulated electrically by CIRCUIT.elec
     mode 'logic' (Steps 6 XOR, 8, 9): earned modules + fixed inputs/lamps, simulated gate by gate by CIRCUIT.logic (SIM.Net)
   Ids (stable): #bench, #bench-stage, #tray, #tray-<key>, #bench-delete, #bench-clear, #bench-status;
   dynamic: #part-<id>, #term-<id>-<pin>, #wire-<id>. */
(function (root) {
  'use strict';
  const ART = () => root.ART, C = () => root.CIRCUIT;
  const SFX = (name, opt) => { if (root.SFX) root.SFX.play(name, opt); };
  const pinSafe = p => ({ '+': 'pos', '-': 'neg' }[p] || p);
  const COLORS = ['brown', 'red', 'black', 'green', 'cream'];
  const MOD_SIZE = { NOT: [150, 64], AND: [150, 92], OR: [150, 92], XOR: [150, 92], HALF: [196, 92], FULL: [196, 120] };
  const LOGIC_ART_PIN = { IN: { out: 'b' }, OUT: { in: 'a' } };   // logic pins on Henri's knife switch / lamp art
  const PIN_NAME = { '+': 'plus', '-': 'minus', a: 'terminal a', b: 'terminal b', c1: 'coil 1', c2: 'coil 2', com: 'common', nc: 'normally closed', no: 'normally open', out: 'output', in: 'input', A: 'input A', B: 'input B', Cin: 'carry in', S: 'sum', C: 'carry', Cout: 'carry out' };

  function Bench(host, cfg) {
    this.host = host; this.cfg = cfg; this.mode = cfg.mode;
    const st = cfg.state || {};
    this.parts = (st.parts || []).map(p => Object.assign({}, p));
    (cfg.fixed || []).forEach(f => { const have = this.parts.find(p => p.id === f.id); if (have) Object.assign(have, { kind: f.kind, label: f.label, fixed: true }); else this.parts.push(Object.assign({ fixed: true }, f)); });
    this.wires = (st.wires || []).filter(w => this.part(w.a.p) && this.part(w.b.p)).map(w => JSON.parse(JSON.stringify(w)));
    this.seq = st.seq || 1; this.sel = null; this.armed = null; this.prevEn = {}; this.vis = null; this.res = null;
    this.build(); this.layout(); this.run('render');
  }
  const P = Bench.prototype;
  P.part = function (id) { return this.parts.find(p => p.id === id); };
  P.state = function () { return { parts: this.parts.map(p => { const o = Object.assign({}, p); delete o.fixed; return o; }), wires: this.wires, seq: this.seq }; };
  P.isLogic = function (kind) { return this.mode === 'logic'; };

  /* ---------------- DOM ---------------- */
  P.build = function () {
    const cfg = this.cfg;
    this.host.innerHTML =
      `<div class="bench-wrap" data-mode="${this.mode}"><div class="bn-scene bench-scene" id="bench">${root.BENCH.benchTop()}` +
      `<div class="bench-stage" id="bench-stage" tabindex="-1"><div class="slots"></div><div class="parts"></div><svg class="bn-wires" aria-hidden="true"></svg><div class="terms"></div></div></div>` +
      `<div class="bench-tools"><button class="btn bench-btn" id="bench-delete" type="button" disabled>${cfg.ui.remove}</button>` +
      `<button class="btn bench-btn" id="bench-clear" type="button">${cfg.ui.clear}</button><p class="bench-status" id="bench-status" aria-live="polite"></p></div>` +
      `<div class="tray-wrap"><div class="tray-label">${cfg.ui.tray}</div><div class="tray" id="tray" role="list"></div></div></div>`;
    this.el = this.host.querySelector('#bench'); this.stage = this.host.querySelector('.bench-stage');
    this.partsEl = this.stage.querySelector('.parts'); this.wiresEl = this.stage.querySelector('.bn-wires'); this.termsEl = this.stage.querySelector('.terms');
    this.slotsEl = this.stage.querySelector('.slots'); this.trayEl = this.host.querySelector('#tray'); this.statusEl = this.host.querySelector('#bench-status');
    this.host.querySelector('#bench-delete').addEventListener('click', () => this.deleteSelected());
    this.host.querySelector('#bench-clear').addEventListener('click', () => this.clear());
    this.buildTray();
    this.bindStage();
    this.ro = new ResizeObserver(() => this.layout()); this.ro.observe(this.el);
  };
  P.destroy = function () { if (this.ro) this.ro.disconnect(); if (root.SFX) root.SFX.hum(false); };
  P.buildTray = function () {
    const items = this.cfg.tray, per = 4, trays = Math.max(1, Math.ceil(items.length / per));
    let h = '';
    for (let t = 0; t < trays; t++) {
      h += `<div class="tray-box">${root.BENCH_ART.tray}`;
      items.slice(t * per, t * per + per).forEach((it, i) => {
        h += `<button type="button" class="tray-item" role="listitem" id="tray-${it.key}" data-key="${it.key}" style="left:${12 + i * 86}px">` +
          `<span class="thumb">${this.thumb(it)}</span><span class="tname">${it.name}</span><span class="tcount"></span></button>`;
      });
      h += '</div>';
    }
    this.trayEl.innerHTML = h;
    this.trayEl.querySelectorAll('.tray-item').forEach(b => {
      b.addEventListener('click', () => { if (this.suppress) return; this.place(b.dataset.key); });
      b.addEventListener('pointerdown', e => this.trayDrag(e, b));
    });
    this.updateTray();
  };
  P.thumb = function (it) {
    if (this.mode === 'logic' || /^(NOT|AND|OR|XOR|HALF|FULL)$/.test(it.kind)) { const m = root.CIRCUIT.MOD[it.kind]; return `<span class="mthumb">${ART().moduleHtml(it.kind, m.ins.map(p => [p, 'in']), m.outs.map(p => [p, 'out']))}</span>`; }
    return ART().partSvg({ kind: it.kind, cells: it.cells });
  };
  P.count = function (key) { return this.parts.filter(p => p.key === key && !p.fixed).length; };
  P.updateTray = function () {
    this.trayEl.querySelectorAll('.tray-item').forEach(b => {
      const it = this.cfg.tray.find(t => t.key === b.dataset.key), left = it.max - this.count(it.key);
      b.disabled = left <= 0; b.querySelector('.tcount').textContent = it.max > 1 ? '×' + Math.max(0, left) : '';
    });
  };

  /* stage size: a wide bench on desktop, a tall one on phones; everything is scaled to fit the width */
  P.layout = function () {
    const w = this.el.clientWidth || 960, mob = w < 640;
    const [W, H] = (mob ? this.cfg.size.mob : this.cfg.size.desk);
    const changed = this.W !== W; this.W = W; this.H = H; this.scale = w / W; this.mob = mob;
    this.stage.style.width = W + 'px'; this.stage.style.height = H + 'px'; this.stage.style.transform = `scale(${this.scale})`;
    this.el.style.height = (H * this.scale) + 'px';
    this.slots = this.cfg.slots ? this.cfg.slots(W, H) : [];
    (this.cfg.fixedPos ? this.cfg.fixedPos(W, H) : []).forEach(fp => { const p = this.part(fp.id); if (p) { p.x = fp.x; p.y = fp.y; } });
    if (changed || !this.drawn) this.renderAll(); else this.drawWires();
  };
  P.sizeOf = function (p) {
    const el = this.partsEl.querySelector(`[data-part="${p.id}"]`);
    if (el && el.offsetWidth) return [el.offsetWidth, el.offsetHeight];
    if (MOD_SIZE[p.kind]) return MOD_SIZE[p.kind];
    const svg = ART().partSvg(p), m = svg.match(/width='(\d+)' height='(\d+)'/); return m ? [+m[1], +m[2]] : [100, 100];
  };
  P.clamp = function (p) {
    const [w, h] = this.sizeOf(p);
    p.x = Math.round(Math.max(4, Math.min(this.W - w - 4, p.x))); p.y = Math.round(Math.max(4, Math.min(this.H - h - 4, p.y)));
    if (p.slot != null && this.slots[p.slot]) { const s = this.slots[p.slot]; p.x = Math.round(s.x + (s.w - w) / 2); p.y = Math.round(s.y + (s.h - h) / 2); }
  };
  P.renderAll = function () {
    this.drawn = true;
    this.slotsEl.innerHTML = this.slots.map((s, i) => `<div class="bn-drop slot" id="${s.id}" data-slot="${i}" style="left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h}px"><span>${s.label}</span></div>`).join('');
    this.partsEl.innerHTML = '';
    this.parts.forEach(p => this.renderPart(p));
    this.parts.forEach(p => this.clamp(p));
    this.parts.forEach(p => this.posPart(p));
    this.renderTerms(); this.drawWires(); this.vis = null; this.show(this.res, 'render');
  };
  P.renderPart = function (p) {
    const d = document.createElement('div');
    const mod = !!root.CIRCUIT.MOD[p.kind] && !/^(IN|OUT)$/.test(p.kind);
    d.className = `bn-part part-${p.kind}${p.fixed ? ' fixed' : ''}`; d.id = 'part-' + p.id; d.dataset.part = p.id; d.tabIndex = 0;
    d.setAttribute('role', 'button');
    if (mod) {
      const pins = this.cfg.modulePins ? this.cfg.modulePins(p) : null, m = root.CIRCUIT.MOD[p.kind];
      d.innerHTML = ART().moduleHtml(p.kind, pins ? pins[0] : m.ins.map(x => [x, 'in']), pins ? pins[1] : m.outs.map(x => [x, 'out']), pins && pins[2]);
    } else {
      d.innerHTML = ART().partSvg(p) + (p.label ? `<span class="plate">${p.label}</span>` : '');
      if (p.kind === 'IN' || p.kind === 'knife') d.setAttribute('aria-pressed', p.closed ? 'true' : 'false');
    }
    d.setAttribute('aria-label', this.cfg.partName(p));
    this.partsEl.appendChild(d);
    if (p.kind === 'magnet') this.magnetLook(p, d);
    return d;
  };
  P.posPart = function (p) { const d = this.partsEl.querySelector(`[data-part="${p.id}"]`); if (d) { d.style.left = p.x + 'px'; d.style.top = p.y + 'px'; } };
  /* terminal points in stage units */
  P.pins = function (p) {
    const d = this.partsEl.querySelector(`[data-part="${p.id}"]`); if (!d) return {};
    const o = {};
    if (d.querySelector('.module')) {
      const pr = d.getBoundingClientRect(), s = this.scale;
      d.querySelectorAll('.mpin').forEach(m => {
        const r = m.getBoundingClientRect(), out = m.dataset.dir === 'out', right = m.closest('.mpins.out');
        o[m.dataset.pin] = { x: p.x + ((right ? r.right - 18 * s : r.left + 18 * s) - pr.left) / s, y: p.y + ((r.top + r.bottom) / 2 - pr.top) / s, dir: m.dataset.dir, el: m, out };
      });
      return o;
    }
    const svg = d.querySelector('svg'), raw = ART().pinsOf(p.kind, svg);
    if (LOGIC_ART_PIN[p.kind]) { Object.keys(LOGIC_ART_PIN[p.kind]).forEach(k => { const q = raw[LOGIC_ART_PIN[p.kind][k]]; o[k] = { x: p.x + q.x, y: p.y + q.y }; }); return o; }
    Object.keys(raw).forEach(k => { o[k] = { x: p.x + raw[k].x, y: p.y + raw[k].y }; });
    return o;
  };
  P.renderTerms = function () {
    let h = '';
    this.pinMap = {};
    this.parts.forEach(p => {
      const pins = this.pins(p); this.pinMap[p.id] = pins;
      Object.keys(pins).forEach(k => {
        const q = pins[k];
        h += `<button type="button" class="term" id="term-${p.id}-${pinSafe(k)}" data-part="${p.id}" data-pin="${k}" style="left:${q.x.toFixed(1)}px;top:${q.y.toFixed(1)}px" aria-label="${this.cfg.partName(p)}: ${PIN_NAME[k] || k}"></button>`;
      });
    });
    this.termsEl.innerHTML = h;
    if (this.armed) { const t = this.termEl(this.armed); if (t) t.classList.add('armed'); else this.armed = null; }
  };
  P.termEl = function (a) { return this.termsEl.querySelector(`[data-part="${a.p}"][data-pin="${a.pin}"]`); };
  P.movePartTerms = function (p) {
    const pins = this.pins(p); this.pinMap[p.id] = pins;
    Object.keys(pins).forEach(k => { const t = this.termEl({ p: p.id, pin: k }); if (t) { t.style.left = pins[k].x.toFixed(1) + 'px'; t.style.top = pins[k].y.toFixed(1) + 'px'; } });
  };
  P.pt = function (a) { const m = this.pinMap[a.p]; return m && m[a.pin]; };
  P.drawWires = function () {
    if (!this.pinMap) return;
    let h = '';
    this.wires.forEach(w => { const p = this.pt(w.a), q = this.pt(w.b); if (!p || !q) return; h += ART().wireSvg(w.id, p, q, w.color); });
    this.wiresEl.innerHTML = h; this.wiresEl.setAttribute('viewBox', `0 0 ${this.W} ${this.H}`);
    this.wiresEl.querySelectorAll('.cw').forEach(g => { g.classList.toggle('selected', !!(this.sel && this.sel.type === 'wire' && 'wire-' + this.sel.id === g.id)); });
    this.vis = null; if (this.res) this.show(this.res, 'render');
  };

  /* ---------------- editing ---------------- */
  P.trayItem = function (key) { return this.cfg.tray.find(t => t.key === key); };
  P.place = function (key, at, slot) {
    const it = this.trayItem(key); if (!it || this.count(key) >= it.max) return null;
    const p = { id: it.kind.toLowerCase() + this.seq++, kind: it.kind, key, x: 0, y: 0 };
    if (it.label) p.label = it.label;
    if (it.kind === 'pile') p.cells = it.cells;
    if (it.kind === 'magnet') { p.turns = 20; p.insulated = false; }
    if (it.kind === 'knife') p.closed = false;
    const [w, h] = this.sizeOf(p);
    if (this.slots.length) {
      const free = this.slots.map((s, i) => i).filter(i => !this.parts.some(q => q.slot === i));
      if (!free.length) return null;
      p.slot = slot != null && free.includes(slot) ? slot : free[0];
    } else if (at) { p.x = at.x - w / 2; p.y = at.y - h / 2; }
    else { const s = this.freeSpot(w, h); p.x = s.x; p.y = s.y; }
    this.parts.push(p);
    this.renderPart(p); this.clamp(p); this.posPart(p); this.renderTerms(); this.drawWires();
    this.updateTray(); this.select({ type: 'part', id: p.id });
    this.run('place'); return p;
  };
  P.freeSpot = function (w, h) {
    const rects = this.parts.map(q => { const [qw, qh] = this.sizeOf(q); return [q.x - 14, q.y - 14, q.x + qw + 14, q.y + qh + 30]; });
    for (let y = 16; y + h < this.H - 8; y += 20) for (let x = 16; x + w < this.W - 8; x += 20)
      if (!rects.some(r => x < r[2] && x + w > r[0] && y < r[3] && y + h > r[1])) return { x, y };
    return { x: 20 + Math.random() * (this.W - w - 40), y: 20 + Math.random() * (this.H - h - 40) };
  };
  P.removePart = function (id) {
    const p = this.part(id); if (!p || p.fixed) return;
    this.parts = this.parts.filter(q => q.id !== id);
    this.wires = this.wires.filter(w => w.a.p !== id && w.b.p !== id);
    if (this.sel && this.sel.id === id) this.sel = null;
    if (this.armed && this.armed.p === id) this.armed = null;
    const d = this.partsEl.querySelector(`[data-part="${id}"]`); if (d) d.remove();
    this.renderTerms(); this.drawWires(); this.updateTray(); this.updateSel(); this.run('remove');
  };
  P.connect = function (a, b) {
    if (!a || !b || (a.p === b.p && a.pin === b.pin)) return null;
    const same = (x, y) => x.p === y.p && x.pin === y.pin;
    if (this.wires.some(w => (same(w.a, a) && same(w.b, b)) || (same(w.a, b) && same(w.b, a)))) return null;
    if (this.mode === 'logic') {          // signals flow from an output to inputs: keep wires output -> input when we can
      const da = (this.pt(a) || {}).dir, db = (this.pt(b) || {}).dir;
      if ((da === 'in' || (this.part(a.p).kind === 'OUT')) && (db === 'out' || this.part(b.p).kind === 'IN')) { const t = a; a = b; b = t; }
    }
    const w = { id: 'w' + this.seq++, a: { p: a.p, pin: a.pin }, b: { p: b.p, pin: b.pin }, color: COLORS[this.wires.length % COLORS.length] };
    this.wires.push(w); this.drawWires();
    SFX('binding-post-screw');
    [a, b].forEach(x => { const g = this.screwEl(x); if (g && g.classList.contains('bn-screw')) root.BENCH.tighten(g); });
    this.run('wire'); return w;
  };
  P.removeWire = function (id) { this.wires = this.wires.filter(w => w.id !== id); if (this.sel && this.sel.id === id) this.sel = null; this.drawWires(); this.updateSel(); this.run('unwire'); };
  P.clear = function () {
    this.parts = this.parts.filter(p => p.fixed); this.wires = []; this.sel = null; this.armed = null;
    this.renderAll(); this.updateTray(); this.updateSel(); this.run('clear');
  };
  P.deleteSelected = function () { if (!this.sel) return; if (this.sel.type === 'wire') this.removeWire(this.sel.id); else this.removePart(this.sel.id); };
  P.select = function (s) { this.sel = s; this.updateSel(); };
  P.updateSel = function () {
    this.partsEl.querySelectorAll('.bn-part').forEach(d => d.classList.toggle('selected', !!(this.sel && this.sel.type === 'part' && this.sel.id === d.dataset.part)));
    this.wiresEl.querySelectorAll('.cw').forEach(g => g.classList.toggle('selected', !!(this.sel && this.sel.type === 'wire' && g.id === 'wire-' + this.sel.id)));
    const del = this.host.querySelector('#bench-delete');
    del.disabled = !this.sel || (this.sel.type === 'part' && this.part(this.sel.id) && this.part(this.sel.id).fixed);
  };
  P.toggle = function (id, force) {
    const p = this.part(id); if (!p || !(p.kind === 'knife' || p.kind === 'IN')) return;
    const v = force == null ? !p.closed : !!force; if (v === !!p.closed) return;
    p.closed = v;
    const d = this.partsEl.querySelector(`[data-part="${id}"]`), svg = d && d.querySelector('svg');
    if (d) d.setAttribute('aria-pressed', v ? 'true' : 'false');
    // Michael: the close sound starts ~20 ms before the blade seats (Henri's swing is 360 ms; instant under reduced motion)
    const swing = root.BENCH.reduce() || this.quiet ? 0 : 360;
    if (!this.quiet) { if (v) SFX('knife-switch-close', { delay: Math.max(0, swing - 20) }); else SFX('knife-switch-open'); }
    if (svg) { if (this.quiet) { svg.classList.toggle('closed', v); svg.setAttribute('aria-checked', v ? 'true' : 'false'); } else root.BENCH.knife(svg, v); }
    this._swing = v ? swing : 0;
    this.run('toggle', { id, closed: v });
  };
  P.tap = function (id) {
    const p = this.part(id); if (!p) return;
    if (p.kind === 'knife' || p.kind === 'IN') this.toggle(id);
    this.select({ type: 'part', id });
  };
  P.screwEl = function (a) {
    const d = this.partsEl.querySelector(`[data-part="${a.p}"]`); if (!d) return null;
    const p = this.part(a.p), pin = LOGIC_ART_PIN[p.kind] ? LOGIC_ART_PIN[p.kind][a.pin] : a.pin;
    return d.querySelector(`.bn-screw[data-pin="${pin}"]`) || d.querySelector(`.mpin[data-pin="${a.pin}"]`);
  };

  /* ---------------- pointer + keyboard ---------------- */
  P.toStage = function (e) { const r = this.stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / this.scale, y: (e.clientY - r.top) / this.scale }; };
  P.overTray = function (e) { const r = this.host.querySelector('.tray-wrap').getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
  P.overStage = function (e) { const r = this.el.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
  P.slotAt = function (e) { const q = this.toStage(e); return this.slots.findIndex(s => q.x >= s.x && q.x <= s.x + s.w && q.y >= s.y && q.y <= s.y + s.h); };
  P.noClick = function () { this.suppress = true; setTimeout(() => { this.suppress = false; }, 0); };
  P.bindStage = function () {
    const st = this.stage;
    st.addEventListener('pointerdown', e => {
      const term = e.target.closest('.term'); if (term) return this.termDown(e, term);
      const d = e.target.closest('.bn-part'); if (!d) { if (!e.target.closest('.cw')) { this.select(null); this.disarm(); } return; }
      e.preventDefault();
      const p = this.part(d.dataset.part), s0 = { x: e.clientX, y: e.clientY, px: p.x, py: p.y }; let moved = false;
      const canMove = !p.fixed;
      d.setPointerCapture(e.pointerId);
      const mv = ev => {
        if (!canMove) return;
        const dx = (ev.clientX - s0.x) / this.scale, dy = (ev.clientY - s0.y) / this.scale;
        if (!moved && Math.hypot(dx, dy) * this.scale < 6) return;
        moved = true; d.classList.add('dragging'); p.x = s0.px + dx; p.y = s0.py + dy;
        const keep = p.slot; p.slot = null; this.clamp(p); p.slot = keep;
        if (p.slot == null) { this.posPart(p); } else { d.style.left = (s0.px + dx) + 'px'; d.style.top = (s0.py + dy) + 'px'; p.x = s0.px + dx; p.y = s0.py + dy; }
        this.movePartTerms(p); this.drawWires();
        this.slotsEl.querySelectorAll('.slot').forEach((el, i) => el.classList.toggle('hot', i === this.slotAt(ev)));
      };
      const up = ev => {
        d.removeEventListener('pointermove', mv); d.removeEventListener('pointerup', up); d.removeEventListener('pointercancel', up);
        d.classList.remove('dragging'); this.slotsEl.querySelectorAll('.slot').forEach(el => el.classList.remove('hot'));
        if (!moved) { this.tap(p.id); return; }
        if (this.overTray(ev) && !p.fixed) { this.removePart(p.id); return; }
        if (p.slot != null) { const si = this.slotAt(ev); if (si >= 0 && !this.parts.some(q => q !== p && q.slot === si)) p.slot = si; }
        this.clamp(p); this.posPart(p); this.movePartTerms(p); this.drawWires(); this.run('move');
      };
      d.addEventListener('pointermove', mv); d.addEventListener('pointerup', up); d.addEventListener('pointercancel', up);
    });
    st.addEventListener('click', e => {
      const term = e.target.closest('.term');
      if (term) { if (!this.suppress) this.termTap({ p: term.dataset.part, pin: term.dataset.pin }); return; }
      const g = e.target.closest('.cw'); if (g) { const id = g.dataset.wire; this.select(this.sel && this.sel.id === id ? null : { type: 'wire', id }); }
    });
    st.addEventListener('keydown', e => {
      const d = e.target.closest('.bn-part');
      if ((e.key === 'Enter' || e.key === ' ') && d) { e.preventDefault(); this.tap(d.dataset.part); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel) { e.preventDefault(); this.deleteSelected(); }
      if (e.key === 'Escape') { this.disarm(); this.select(null); }
    });
  };
  P.disarm = function () { if (this.armed) { const t = this.termEl(this.armed); if (t) t.classList.remove('armed'); } this.armed = null; this.host.classList.remove('wiring'); };
  P.termTap = function (a) {
    if (this.armed && this.armed.p === a.p && this.armed.pin === a.pin) { this.disarm(); return; }
    if (this.armed) { const from = this.armed; this.disarm(); this.connect(from, a); return; }
    this.armed = a; const t = this.termEl(a); if (t) t.classList.add('armed'); this.host.classList.add('wiring');
  };
  P.termDown = function (e, term) {
    const a = { p: term.dataset.part, pin: term.dataset.pin }, s0 = { x: e.clientX, y: e.clientY }; let moved = false, rub = null;
    term.setPointerCapture(e.pointerId);
    const mv = ev => {
      if (!moved && Math.hypot(ev.clientX - s0.x, ev.clientY - s0.y) < 8) return;
      moved = true; const p = this.pt(a), q = this.toStage(ev);
      if (!rub) { rub = document.createElementNS('http://www.w3.org/2000/svg', 'g'); rub.setAttribute('class', 'cw brown rubber'); this.wiresEl.appendChild(rub); }
      const d = ART().wirePath(p, q); rub.innerHTML = `<path class="cw-out" d="${d}"/><path class="cw-base" d="${d}"/><path class="cw-b1" d="${d}"/>`;
      const over = document.elementFromPoint(ev.clientX, ev.clientY); this.termsEl.querySelectorAll('.term.target').forEach(t => t.classList.remove('target'));
      const ot = over && over.closest && over.closest('.term'); if (ot && ot !== term) ot.classList.add('target');
    };
    const up = ev => {
      term.removeEventListener('pointermove', mv); term.removeEventListener('pointerup', up); term.removeEventListener('pointercancel', up);
      if (rub) rub.remove(); this.termsEl.querySelectorAll('.term.target').forEach(t => t.classList.remove('target'));
      if (!moved) return;
      this.noClick();
      const over = document.elementFromPoint(ev.clientX, ev.clientY), ot = over && over.closest && over.closest('.term');
      if (ot) this.connect(a, { p: ot.dataset.part, pin: ot.dataset.pin });
    };
    term.addEventListener('pointermove', mv); term.addEventListener('pointerup', up); term.addEventListener('pointercancel', up);
  };
  P.trayDrag = function (e, b) {
    if (b.disabled) return;
    const s0 = { x: e.clientX, y: e.clientY }; let ghost = null;
    try { b.setPointerCapture(e.pointerId); } catch (_) {}
    const mv = ev => {
      if (!ghost && Math.hypot(ev.clientX - s0.x, ev.clientY - s0.y) < 10) return;
      if (!ghost) { ghost = b.querySelector('.thumb').cloneNode(true); ghost.className = 'tray-ghost'; document.body.appendChild(ghost); }
      ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
      this.el.classList.toggle('drop-hot', this.overStage(ev));
      this.slotsEl.querySelectorAll('.slot').forEach((el, i) => el.classList.toggle('hot', i === this.slotAt(ev)));
    };
    const up = ev => {
      b.removeEventListener('pointermove', mv); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up);
      this.el.classList.remove('drop-hot'); this.slotsEl.querySelectorAll('.slot').forEach(el => el.classList.remove('hot'));
      if (!ghost) return;
      ghost.remove(); this.noClick();
      if (ev.type === 'pointerup' && this.overStage(ev)) { const si = this.slotAt(ev); this.place(b.dataset.key, this.toStage(ev), si >= 0 ? si : null); }
    };
    b.addEventListener('pointermove', mv); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  };

  /* ---------------- simulation + visuals ---------------- */
  P.simParts = function () {
    return this.parts.map(p => {
      const o = { id: p.id, kind: p.kind, closed: !!p.closed, turns: p.turns, insulated: p.insulated };
      if (p.kind === 'pile') o.volts = (p.cells || [{}, {}, {}]).reduce((s, c) => s + (c.flip ? -1 : 1), 0);
      return o;
    });
  };
  P.simulate = function () {
    if (this.mode === 'elec') { const r = C().elec(this.simParts(), this.wires, this.prevEn); this.prevEn = r.energized; return r; }
    const extra = this.cfg.logicExtra ? this.cfg.logicExtra(this) : { parts: [], wires: [], inputs: {} };
    const inputs = Object.assign({}, extra.inputs); this.parts.forEach(p => { if (p.kind === 'IN') inputs[p.id] = p.closed ? 1 : 0; });
    return C().logic(this.parts.concat(extra.parts), this.wires.concat(extra.wires), inputs);
  };
  P.run = function (why, info) {
    if (why !== 'toggle') this._swing = 0;
    this.res = this.simulate();
    this.show(this.res, why);
    if (this.statusEl && this.cfg.status) this.statusEl.textContent = this.cfg.status(this, this.res) || '';
    if (this.cfg.onChange) this.cfg.onChange(this, why, info);
    return this.res;
  };
  P.magnetLook = function (p, d) {
    d = d || this.partsEl.querySelector(`[data-part="${p.id}"]`); if (!d) return;
    const svg = d.querySelector('svg'), turns = svg.querySelectorAll('.coil > path[stroke^="url"]');
    const show = Math.max(1, Math.round((p.turns || 20) / 120 * turns.length));
    turns.forEach((t, i) => { t.style.display = i < show ? '' : 'none'; });
    svg.classList.toggle('bare', !p.insulated);
  };
  P.show = function (r, why) {
    if (!r) return;
    const loud = why !== 'render' && !this.quiet, prev = this.vis || {}, vis = { lamps: {}, en: {}, grab: {} };
    const svgOf = id => { const d = this.partsEl.querySelector(`[data-part="${id}"]`); return d && d.querySelector('svg'); };
    const termOn = {};
    if (this.mode === 'elec') {
      this.parts.forEach(p => {
        const svg = svgOf(p.id); if (!svg) return;
        if (!(p.id in r.lamps || p.id in r.relays || p.id in r.magnets || p.id in r.piles || p.kind === 'knife')) return;   // result predates this part
        if (p.kind === 'lamp') { const L = r.lamps[p.id]; this.heat(svg, L.lit ? L.heat : Math.min(L.heat, 0.3), loud); svg.classList.toggle('on', L.lit); svg.setAttribute('data-lamp', ''); vis.lamps[p.id] = L.lit; }
        if (p.kind === 'knife') { if (!loud) svg.classList.toggle('closed', !!p.closed); svg.classList.toggle('on', Math.abs(r.knives[p.id] || 0) > 0.03); }
        if (p.kind === 'relay') {
          const R = r.relays[p.id]; vis.en[p.id] = R.en;
          if (loud && prev.en && (p.id in prev.en) && prev.en[p.id] !== R.en) {
            const d0 = (this._swing || 0) + 30;            // after the switch blade lands
            setTimeout(() => root.BENCH.relay(svg, R.en), d0);
            SFX(R.en ? 'relay-engage' : 'relay-release', { delay: d0 + (root.BENCH.reduce() ? 0 : 90) });   // armature meets the contact ~95 ms in
          } else svg.classList.toggle('energized', R.en);
        }
        if (p.kind === 'magnet') {
          const M = r.magnets[p.id]; this.magnetLook(p, svg.parentNode);
          svg.classList.toggle('weak', M.weak); svg.classList.toggle('live', M.I > 0.05); vis.grab[p.id] = M.grab;
          if (loud && prev.grab && (p.id in prev.grab) && prev.grab[p.id] !== M.grab) {
            const d0 = this._swing || 0;
            setTimeout(() => root.BENCH.magnet(svg, M.grab), d0);
            // Michael: the clank is 9 ms into the file; Henri's iron touches the nail at .62 x 230 ms
            if (M.grab) SFX('magnet-snap', { delay: d0 + (root.BENCH.reduce() ? 0 : 134) }); else SFX('relay-release', { vol: 0.25, delay: d0 });
          } else svg.classList.toggle('on', M.grab);
        }
        if (p.kind === 'pile') { const B = r.piles[p.id]; svg.classList.toggle('on', Math.abs(B.I) > 0.03); svg.classList.toggle('short', Math.abs(B.I) > C().K.SHORT); }
      });
      this.wires.forEach(w => {
        const g = this.wiresEl.querySelector('#wire-' + w.id); const i = r.wires[w.id] || 0, on = Math.abs(i) > 0.03;
        if (g) { g.classList.toggle('on', on); g.classList.toggle('flow', on); g.classList.toggle('rev', i < 0); }
        if (on) { termOn[w.a.p + ':' + w.a.pin] = 1; termOn[w.b.p + ':' + w.b.pin] = 1; }
      });
      // a knife switch closing onto a live circuit crackles at its jaw (Henri's BENCH.knife draws the spark)
      if (loud && why === 'toggle' && this._lastToggle) { const k = this._lastToggle; if (k.closed && Math.abs(r.knives[k.id] || 0) > 0.03) SFX('spark-crackle', { delay: (this._swing || 0) + 20 }); }
    } else {
      this.parts.forEach(p => {
        const d = this.partsEl.querySelector(`[data-part="${p.id}"]`); if (!d) return; const v = r.values[p.id] || {};
        if (p.kind === 'IN') { const svg = d.querySelector('svg'); if (!loud) svg.classList.toggle('closed', !!p.closed); svg.classList.toggle('on', !!p.closed); if (p.closed) termOn[p.id + ':out'] = 1; }
        else if (p.kind === 'OUT') { const svg = d.querySelector('svg'), on = v.in === 1; this.heat(svg, on ? 1 : 0, loud); svg.setAttribute('data-lamp', ''); vis.lamps[p.id] = on; }
        else {
          let any = false;
          d.querySelectorAll('.mpin').forEach(m => { const x = v[m.dataset.pin]; m.classList.toggle('on', x === 1); m.classList.toggle('unknown', x === -1); if (m.dataset.dir === 'out' && x === 1) any = true; });
          d.querySelector('.module').classList.toggle('on', any);
        }
      });
      this.wires.forEach(w => { const g = this.wiresEl.querySelector('#wire-' + w.id), x = r.wireVal[w.id]; if (g) { g.classList.toggle('on', x === 1); g.classList.toggle('flow', x === 1); g.classList.toggle('unknown', x === -1); } if (x === 1) { termOn[w.a.p + ':' + w.a.pin] = 1; termOn[w.b.p + ':' + w.b.pin] = 1; } });
    }
    // binding screws: tight when a wire is under them, lit when current/signal passes
    const wired = {}; this.wires.forEach(w => { wired[w.a.p + ':' + w.a.pin] = 1; wired[w.b.p + ':' + w.b.pin] = 1; });
    this.parts.forEach(p => {
      const d = this.partsEl.querySelector(`[data-part="${p.id}"]`); if (!d) return;
      const map = LOGIC_ART_PIN[p.kind]; const inv = {}; if (map) Object.keys(map).forEach(k => { inv[map[k]] = k; });
      d.querySelectorAll('.bn-screw[data-pin]').forEach(g => {
        const pin = map ? inv[g.dataset.pin] : g.dataset.pin, k = p.id + ':' + pin;
        const want = !!wired[k] || !!(map && !pin);
        if (want && !g.classList.contains('tight')) this.tightSilent(g); else if (!want && g.classList.contains('tight')) root.BENCH.loosen(g);
        g.classList.toggle('on', !!termOn[k]);
      });
    });
    this.termsEl.querySelectorAll('.term').forEach(t => { const k = t.dataset.part + ':' + t.dataset.pin; t.classList.toggle('wired', !!wired[k]); });
    // lamp sounds: a tick as a filament starts to glow, and one shared hum while any bulb is lit
    if (loud) Object.keys(vis.lamps).forEach(id => { if (vis.lamps[id] && prev.lamps && prev.lamps[id] === false) SFX('lamp-warmup-tick', { delay: 20 }); });
    if (root.SFX) root.SFX.hum(Object.values(vis.lamps).some(Boolean));
    this.vis = vis;
  };
  /* lamp heat through Henri's BENCH.heat (CSS --heat transition; reduced motion: instant + flash) */
  P.heat = function (svg, v, loud) {
    const old = parseFloat(svg.style.getPropertyValue('--heat')) || 0;
    if (Math.abs(old - v) < 0.02) return;
    if (loud) root.BENCH.heat(svg, v); else { svg.style.setProperty('--heat', v); svg.classList.toggle('on', v >= .5); }
  };
  /* a screw that already has a wire under it when the bench is drawn: no animation, no flash */
  P.tightSilent = function (g) {
    root.BENCH.tighten(g);
    g.getAnimations({ subtree: true }).forEach(a => a.finish());
    g.classList.remove('bn-flash');
    const slot = g.querySelector('.slot'); if (slot) slot.style.transition = '';
  };
  const _toggle = P.toggle;
  P.toggle = function (id, force) { const p = this.part(id); this._lastToggle = p ? { id, closed: force == null ? !p.closed : !!force } : null; return _toggle.call(this, id, force); };
  /* set several switches at once without sounds (truth-table tester) */
  P.setSwitches = function (map, quiet) {
    this.quiet = !!quiet;
    Object.keys(map).forEach(id => { const p = this.part(id); if (p) { p.closed = !!map[id]; const d = this.partsEl.querySelector(`[data-part="${id}"]`); if (d) { d.setAttribute('aria-pressed', p.closed ? 'true' : 'false'); } } });
    const r = this.run('test');
    this.quiet = false; return r;
  };

  root.Bench = Bench;
})(window);
