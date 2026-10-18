/* 8-bit adder toy: state, input handling, timing modes and rendering.
   All logic values come from the gate-level nets in js/sim.js. */
(function () {
  'use strict';
  const { NETS, rippleInputs, readRipple } = window.SIM;
  const $ = s => document.querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- UI strings that are not Joseph's (control labels / status). PLACEHOLDER wording, easy to replace. ---- */
  const UI = {
    showSymbol: 'Show symbol', showSwitches: 'Show switches',
    stepInfo: (n, m) => `Gate delay ${n} of ${m}`,
    speed: ms => `${ms} ms per gate`,
    views: { gates: ['Module', 'Gate symbol', 'Switches'], half: ['Module', 'Gates'], full: ['Module', 'Half adders + OR', 'Gates'], ripple: ['Full adder modules', 'Gates'] },
    view: v => `View: ${v}`
  };

  const params = new URLSearchParams(location.search);
  const S = {
    stage: 'ripple', mode: reduceMotion ? 'instant' : 'slow', delay: 260, L: Infinity, timer: null,
    a: 0, b: 0, cin: 0, gate: 'AND', gA: 0, gB: 0, sw: 0, haA: 0, haB: 0, faA: 0, faB: 0, faC: 0, zoom: 0,
    depth: { gates: 2, half: 1, full: 2, ripple: 0 }, maxDepth: { gates: 2, half: 1, full: 2, ripple: 1 }
  };
  let TXT = null;

  const netFor = st => st === 'switch' ? NETS.switch : st === 'gates' ? NETS['gate-' + S.gate] : NETS[st];
  function inputsFor(st) {
    if (st === 'switch') return { one: 1, sw: S.sw };
    if (st === 'gates') return { one: 1, A: S.gA, B: S.gB };
    if (st === 'half') return { A: S.haA, B: S.haB };
    if (st === 'full') return { A: S.faA, B: S.faB, Cin: S.faC };
    return rippleInputs(S.a, S.b, S.cin);
  }
  const animating = () => S.L !== Infinity;

  /* ---------------- render ---------------- */
  function apply(root, net, v) {
    const val = n => (n in net.w ? net.get(v, n) : undefined);
    const anim = animating();
    $$('[data-w]', root).forEach(el => {
      const n = el.dataset.w, x = val(n); if (x === undefined) return;
      el.classList.toggle('on', x === 1); el.classList.toggle('x', x < 0);
      const fresh = anim && S.L > 0 && net.levelOf(n) === S.L;
      el.classList.toggle('fresh', fresh);
      if (el.classList.contains('carry')) el.classList.toggle('rippling', fresh && x === 1);
      if (el.dataset.flow) el.classList.toggle('flow', val(el.dataset.flow) === 1);
    });
    $$('[data-v]', root).forEach(el => { const x = val(el.dataset.v); if (x === undefined) return;
      el.textContent = (el.dataset.lbl ? el.dataset.lbl + '=' : '') + (x < 0 ? '?' : x); });
    $$('[data-o]', root).forEach(el => {
      const x = val(el.dataset.o), ins = el.dataset.i.split(',').map(val);
      el.classList.toggle('on', x === 1); el.classList.toggle('x', x < 0);
      const la = el.querySelector('.lead-a'), lb = el.querySelector('.lead-b');
      if (la) la.classList.toggle('on', ins[0] === 1);
      if (lb) lb.classList.toggle('on', ins[1] === 1);
    });
    $$('[data-energ]', root).forEach(el => el.classList.toggle('energized', val(el.dataset.energ) === 1));
    $$('[data-lamp]', root).forEach(el => el.classList.toggle('on', val(el.dataset.lamp) === 1));
    $$('[data-sw]', root).forEach(el => { el.classList.toggle('closed', S.sw === 1); el.classList.toggle('on', val('lamp') === 1);
      const g = el.closest('#sw'); if (g) g.setAttribute('aria-checked', S.sw ? 'true' : 'false'); });
  }

  function render() {
    const st = S.stage, net = netFor(st), v = net.run(inputsFor(st), S.L);
    const roots = [$('#stage-' + st)];
    if (st === 'ripple') roots.push($('#zoompanel'));
    roots.forEach(r => apply(r, net, v));
    if (st === 'ripple') { renderOutputs(net, v); renderChainState(net, v); }
    highlightTables(net, v);
    // timing status
    const max = net.maxLvl, cur = S.L === Infinity ? max : S.L;
    $('#stepInfo').textContent = S.mode === 'instant' ? '' : UI.stepInfo(cur, max);
    $('#step').disabled = !(S.mode === 'step' && animating());
    document.body.dataset.settled = animating() ? '0' : '1';
  }

  function renderOutputs(net, v) {
    const r = readRipple(v), bits = [];
    for (let i = 7; i >= 0; i--) { const x = net.get(v, 's' + i); bits.push(x < 0 ? '<i class="u">?</i>' : x ? '<b>1</b>' : '<i>0</i>'); }
    $('#sumBin').innerHTML = `<span>${bits.slice(0, 4).join('')}</span><span>${bits.slice(4).join('')}</span>`;
    const known = r.sum !== null;
    $('#sumDH').innerHTML = known ? `<strong>${r.sum}</strong> · 0x${r.sum.toString(16).toUpperCase().padStart(2, '0')}` : '…';
    $('#sum').dataset.value = known ? r.sum : '';
    const total = known && r.cout !== null ? r.cout * 256 + r.sum : null;   // read off the adder's outputs
    $('#decLine').innerHTML = `<span class="op">${S.a}</span> + <span class="op">${S.b}</span> + <span class="cin">Cin ${S.cin}</span> = ` +
      (total === null ? '…' : `<strong>${total}</strong> → 8-bit <strong>${r.sum}</strong>`);
    const sg = n => (n >= 128 ? n - 256 : n);
    $('#aSigned').textContent = sg(S.a); $('#bSigned').textContent = sg(S.b);
    $('#cinSigned').textContent = S.cin ? ' + 1' : '';
    $('#sumSigned').textContent = known ? sg(r.sum) : '…';
    [['#cout', r.cout], ['#overflow', r.overflow]].forEach(([id, x]) => {
      const el = $(id); el.classList.toggle('on', x === 1); el.classList.toggle('x', x === null); el.dataset.value = x === null ? '' : x; });
  }

  function renderChainState(net, v) {
    $$('#chain .fa').forEach(fa => {
      const i = +fa.dataset.bit, ci = net.get(v, 'c' + i), co = net.get(v, 'c' + (i + 1));
      fa.classList.toggle('active', animating() && ci >= 0 && co < 0);
      fa.setAttribute('aria-expanded', i === S.zoom ? 'true' : 'false');
      if (animating() && net.levelOf('c' + (i + 1)) === S.L) { fa.classList.remove('pulse'); void fa.offsetWidth; fa.classList.add('pulse'); }
      if (!animating()) fa.classList.remove('pulse');
    });
  }

  /* truth tables: rows are in binary order of the inputs; highlight the row matching the current inputs */
  function highlightTables(net, v) {
    const mark = (box, row) => $$('tbody tr', box).forEach((tr, k) => tr.classList.toggle('cur', k === row));
    const st = S.stage;
    if (st === 'switch') mark($('#tt-switch'), S.sw);
    if (st === 'gates') $$('#tt-gates table').forEach(t => mark(t, S.gate === 'NOT' ? S.gA : S.gA * 2 + S.gB));
    if (st === 'half') mark($('#tt-half'), S.haA * 2 + S.haB);
    if (st === 'full') mark($('#tt-full'), S.faA * 4 + S.faB * 2 + S.faC);
    if (st === 'ripple') { const i = S.zoom, a = net.get(v, 'a' + i), b = net.get(v, 'b' + i), c = net.get(v, 'c' + i);
      mark($('#tt-zoom'), c < 0 ? -1 : a * 4 + b * 2 + c); }
  }

  /* ---------------- timing ---------------- */
  function restart() {
    clearTimeout(S.timer);
    S.L = (S.mode === 'instant' || S.stage === 'switch') ? Infinity : 0;
    render();
    if (S.mode === 'slow' && animating()) schedule();
  }
  function advance() {
    const max = netFor(S.stage).maxLvl;
    if (!animating()) return;
    S.L++; if (S.L >= max) S.L = Infinity;
    render();
  }
  function schedule() { S.timer = setTimeout(() => { advance(); if (animating() && S.mode === 'slow') schedule(); }, S.delay); }

  /* ---------------- drawing per stage ---------------- */
  function swapAnim(el) {
    if (reduceMotion || !el.animate) return;
    el.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.3,1.35,.6,1)' });
    $$(':scope > *', el).forEach(c => c.animate && c.animate([{ opacity: 0 }, { opacity: 1 }], { delay: 120, duration: 160, fill: 'backwards' }));
  }
  function drawStage(st, animate) {
    const D = window.DRAW, d = S.depth[st];
    if (st === 'switch') {
      $('#draw-switch').innerHTML = D.stageSwitch();
      const sw = $('#sw'); const flip = () => { S.sw ^= 1; restart(); };
      sw.addEventListener('click', flip);
      sw.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
      if (TXT && TXT.tips['#sw']) sw.insertAdjacentHTML('afterbegin', `<title>${TXT.tips['#sw']}</title>`), sw.setAttribute('title', TXT.tips['#sw']);
    }
    if (st === 'gates') {
      $('#lv-circuit').innerHTML = D.gateCircuit(S.gate); $('#lv-gate').innerHTML = D.gateSymbol(S.gate); $('#lv-module').innerHTML = D.gateModule(S.gate);
      showLevel(d);
      $('#gateB').closest('.operand').hidden = S.gate === 'NOT';
      fillGateTables();
    }
    if (st === 'half') { $('#draw-half').innerHTML = d ? D.halfGates() : D.halfModule(); if (animate) swapAnim($('#draw-half')); }
    if (st === 'full') { $('#draw-full').innerHTML = d ? D.fullGates(d) : D.fullModule(); if (animate) swapAnim($('#draw-full')); }
    if (st === 'ripple') {
      $('#draw-ripple').innerHTML = d ? `<div class="detail scrollx" id="rippleScroll">${D.rippleGates()}</div>` : D.rippleChain();
      $$('#chain .fa').forEach(fa => {
        const pick = () => setZoom(+fa.dataset.bit);
        fa.addEventListener('click', pick); fa.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      });
      const sc = $('#rippleScroll'); if (sc) sc.scrollLeft = sc.scrollWidth;      // bit 0 / carry-in side first on phones
      if (animate) swapAnim($('#draw-ripple'));
      $('#draw-zoom').innerHTML = D.zoomFA(S.zoom);
    }
    updateModbar();
  }
  function showLevel(lv) { [['#lv-module', 0], ['#lv-gate', 1], ['#lv-circuit', 2]].forEach(([s, i]) => $(s).classList.toggle('vis', i === lv)); }
  function setZoom(i) { S.zoom = i; $('#zoom').value = String(i); $('#draw-zoom').innerHTML = window.DRAW.zoomFA(i); render(); }

  function setDepth(nd) {
    const st = S.stage, od = S.depth[st]; nd = Math.max(0, Math.min(S.maxDepth[st], nd)); if (nd === od) return;
    S.depth[st] = nd;
    if (st === 'gates') {
      const layers = { stage: $('#lvstage'), circuit: $('#lv-circuit'), gate: $('#lv-gate'), module: $('#lv-module') };
      window.LEVELS.go(layers, od, nd, showLevel);
      updateModbar(); render();
    } else { drawStage(st, true); render(); }
  }
  function updateModbar() {
    const st = S.stage; if (!(st in S.depth)) return;
    const d = S.depth[st], t = $('#symbolToggle');
    t.textContent = d === 2 ? UI.showSymbol : UI.showSwitches; t.setAttribute('aria-pressed', d < 2 ? 'true' : 'false');
    $('#package').disabled = d === 0; $('#expand').disabled = d === S.maxDepth[st];
    $('#depthInfo').textContent = UI.view(UI.views[st][d]);
    document.body.classList.toggle('wide', st === 'ripple' && d === 1);
  }

  /* ---------------- stage switching ---------------- */
  function setStage(st) {
    S.stage = st;
    $$('[role=tab]').forEach(t => { const on = t.dataset.stage === st; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
    $$('[data-for]').forEach(el => { el.hidden = !el.dataset.for.split(' ').includes(st); });
    document.body.classList.remove('wide');
    drawStage(st);
    clearTimeout(S.timer); S.L = Infinity; render();   // a new stage starts settled
  }

  /* ---------------- inputs ---------------- */
  function syncAB(skip) {
    [['a', S.a], ['b', S.b]].forEach(([p, n]) => {
      for (let i = 0; i < 8; i++) { const el = $('#' + p + i), on = (n >> i) & 1;
        el.setAttribute('aria-pressed', on ? 'true' : 'false'); el.firstChild.nodeValue = String(on); }
      const dec = $('#' + p + 'Dec'), hex = $('#' + p + 'Hex');
      if (skip !== dec) dec.value = n;
      if (skip !== hex) hex.value = n.toString(16).toUpperCase().padStart(2, '0');
    });
    setBit($('#cin'), S.cin);
  }
  function setBit(el, on) { el.setAttribute('aria-pressed', on ? 'true' : 'false'); el.firstChild.nodeValue = String(on ? 1 : 0); }
  function setAB(a, b, cin, skip) { S.a = a & 255; S.b = b & 255; if (cin !== undefined) S.cin = cin ? 1 : 0; syncAB(skip); restart(); }

  function bindInputs() {
    for (let i = 0; i < 8; i++) {
      $('#a' + i).addEventListener('click', () => setAB(S.a ^ (1 << i), S.b));
      $('#b' + i).addEventListener('click', () => setAB(S.a, S.b ^ (1 << i)));
    }
    $('#cin').addEventListener('click', () => setAB(S.a, S.b, S.cin ^ 1));
    ['a', 'b'].forEach(p => {
      const dec = $('#' + p + 'Dec'), hex = $('#' + p + 'Hex');
      const put = (n, skip) => p === 'a' ? setAB(n, S.b, undefined, skip) : setAB(S.a, n, undefined, skip);
      dec.addEventListener('input', () => { const t = dec.value.trim(); if (/^\d{1,3}$/.test(t) && +t <= 255) put(+t, dec); });
      dec.addEventListener('change', () => { let n = parseInt(dec.value, 10); if (isNaN(n)) n = 0; put(Math.max(0, Math.min(255, n))); });
      hex.addEventListener('input', () => { const t = hex.value.trim(); if (/^[0-9a-f]{1,2}$/i.test(t)) put(parseInt(t, 16), hex); });
      hex.addEventListener('change', () => put(p === 'a' ? S.a : S.b));
    });
    $('#random').addEventListener('click', () => setAB(Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)));
    $('#reset').addEventListener('click', () => setAB(0, 0, 0));

    const tog = (id, key) => $(id).addEventListener('click', () => { S[key] ^= 1; setBit($(id), S[key]); restart(); });
    tog('#gateA', 'gA'); tog('#gateB', 'gB'); tog('#haA', 'haA'); tog('#haB', 'haB'); tog('#faA', 'faA'); tog('#faB', 'faB'); tog('#faC', 'faC');
    $$('#gatePick [role=radio]').forEach(bt => bt.addEventListener('click', () => {
      S.gate = bt.dataset.gate; $$('#gatePick [role=radio]').forEach(o => o.setAttribute('aria-checked', o === bt ? 'true' : 'false'));
      drawStage('gates'); restart(); }));

    $$('[role=tab]').forEach(t => t.addEventListener('click', () => setStage(t.dataset.stage)));
    $('.tabs').addEventListener('keydown', e => {
      const tabs = $$('[role=tab]'), i = tabs.findIndex(t => t.dataset.stage === S.stage);
      const j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
      if (j !== null && tabs[j]) { setStage(tabs[j].dataset.stage); tabs[j].focus(); }
    });

    $$('#mode [role=radio]').forEach(bt => bt.addEventListener('click', () => setMode(bt.dataset.mode)));
    $('#step').addEventListener('click', advance);
    const sp = $('#speed');
    const onSpeed = () => { S.delay = +sp.max + +sp.min - +sp.value; $('#speedVal').textContent = UI.speed(S.delay); };  // left = slower
    sp.addEventListener('input', onSpeed); onSpeed();
    $('#zoom').addEventListener('change', e => setZoom(+e.target.value));
    $('#symbolToggle').addEventListener('click', () => setDepth(S.depth.gates === 2 ? 1 : 2));
    $('#package').addEventListener('click', () => setDepth(0));
    $('#expand').addEventListener('click', () => setDepth(S.depth[S.stage] + 1));
  }
  function setMode(m) {
    S.mode = m; $$('#mode [role=radio]').forEach(o => o.setAttribute('aria-checked', o.dataset.mode === m ? 'true' : 'false'));
    restart();
  }

  /* ---------------- text (Joseph) ---------------- */
  function applyText(T) {
    TXT = T;
    for (const sel in T.tips) { const el = document.querySelector(sel); if (el) el.title = T.tips[sel]; }
    $$('.explain[data-sec]').forEach(el => { const s = T.sections[el.dataset.sec]; el.innerHTML = s && s.p[0] ? s.p[0] : ''; });
    $$('h2[data-title]').forEach(el => { const s = T.sections[el.dataset.title]; if (s && s.title) el.textContent = s.title; });
    const ov = T.sections.Overflow; if (ov) { $('#ovText').innerHTML = ov.p[0] || '';
      const one = (ov.p[1] || '').replace(/<\/?p>/g, ''); if (one) { $('.lights').title = one; $('#ovSummary').title = one; } }
    const tb = (k, i) => (T.sections[k] && T.sections[k].tables[i]) || '';
    $('#tt-switch').innerHTML = (T.sections['Stage 0'] && T.sections['Stage 0'].mdTables && T.sections['Stage 0'].mdTables[0]) || '';
    $('#tt-half').innerHTML = tb('Stage 2', 0);
    $('#tt-full').innerHTML = tb('Stage 3', 0);
    $('#tt-zoom').innerHTML = tb('Stage 3', 0);
    fillGateTables();
  }
  function fillGateTables() {
    if (!TXT) return; const t = TXT.sections['Stage 1'] ? TXT.sections['Stage 1'].tables : [];
    const idx = { AND: [0], OR: [1], NOT: [2], XOR: [3, 4] }[S.gate];
    $('#tt-gates').innerHTML = idx.map(i => t[i] || '').join('');
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    bindInputs();
    // URL overrides (handy for testing/screenshots): ?stage=ripple&a=127&b=1&cin=0&mode=slow&depth=1&zoom=7&gate=XOR
    if (params.get('mode')) S.mode = params.get('mode');
    if (params.get('zoom')) S.zoom = +params.get('zoom');
    if (params.get('gate')) S.gate = params.get('gate').toUpperCase();
    $$('#gatePick [role=radio]').forEach(o => o.setAttribute('aria-checked', o.dataset.gate === S.gate ? 'true' : 'false'));
    $$('#mode [role=radio]').forEach(o => o.setAttribute('aria-checked', o.dataset.mode === S.mode ? 'true' : 'false'));
    $('#zoom').value = String(S.zoom);
    S.a = +(params.get('a') || 0) & 255; S.b = +(params.get('b') || 0) & 255; S.cin = +(params.get('cin') || 0) ? 1 : 0;
    const st = params.get('stage') || 'ripple';
    if (params.get('depth') !== null && st in S.depth) S.depth[st] = Math.min(S.maxDepth[st], +params.get('depth'));
    syncAB();
    applyText(await window.TEXT.loadText());
    setStage(st);
    window.APP = { S, setAB, setStage, setMode, setDepth, setZoom, advance, render, restart, NETS, ready: true };
  }
  boot();
})();
