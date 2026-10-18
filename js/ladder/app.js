/* app.js: the 9-step earn-to-unlock ladder.
   Step text: Joseph's docs/ladder-text.md, verbatim (js/ladder/text.js), placeholders filled here.
   Progress: localStorage['adder-ladder-v1']. ?unlock=all opens every step (and every earned part) for preview; ?step=N opens a step.
   Window API for tests: window.LADDER. */
(function (root) {
  'use strict';
  /* ---- interface strings that are NOT from Joseph's file (button labels, part names, status lines). For Joseph to review. ---- */
  const UI = {
    title: "John's Bench", stepOf: (n, t) => `Step ${n} of 9 · ${t}`, steps: 'Steps',
    sound: ['Sound: off', 'Sound: on'], motion: ['Calm motion: off', 'Calm motion: on'], reset: 'Reset progress…',
    prev: '‹ Previous step', next: 'Next step ›', hints: 'Hints', tray: 'Parts tray', remove: 'Remove selected', clear: 'Clear bench',
    test: 'Test the truth table', testing: 'Testing…', testChain: 'Check the carry chain',
    parts: { cell: 'Cell', pile: 'Your pile', lamp: 'Bulb', knife: 'Knife switch', 'knife-a': 'Switch A', 'knife-b': 'Switch B', magnet: 'Electro- magnet', relay: 'Relay',
      NOT: 'NOT', AND: 'AND', OR: 'OR', XOR: 'XOR', HALF: 'Half adder', FULL: 'Full adder' },
    pileRemove: 'Remove top cell', pileFlip: (k, f) => `Cell ${k}, ${f ? 'copper' : 'zinc'} at the bottom. Click to flip it.`,
    pileTooMuch: 'More than 3 volts: too much push for the small bulb. Take a cell off.', pileVolts: v => `${v.toFixed(1)} V`,
    magnetTurns: t => `${t} turns`, magnetMore: 'More turns', magnetLess: 'Fewer turns', magnetInsulated: ['Wire: bare copper', 'Wire: insulated'],
    magnetNone: 'Put the electromagnet on the bench first.',
    status: { short: "Short circuit! The two ends of your pile are wired straight together, so the current takes that shortcut and skips everything else.", buzz: 'A relay keeps switching itself on and off, like a buzzer.',
      lit: 'The bulb is lit.', dark: 'The bulb is dark: there is no complete loop through it yet.', grab: 'The magnet is holding the iron.',
      weak: 'Current is flowing, but the magnet is too weak to lift the iron.', conflict: 'Two outputs are wired together. Each wire should be driven by just one output.' },
    checks: { 1: ['3 volts'], 2: ['The bulb lights'], 3: ['On', 'Off', 'On'], 4: ['Picks up the iron', 'Drops it when switched off'],
      5: ['Normally open relay', 'Normally closed relay'], 6: ['NOT', 'AND', 'OR', 'XOR'], 7: ['13', '29', '42'], 8: ['Half adder', 'Full adder'],
      9: ['Eight full adders in place', 'Carry chain connected', '13 + 29 = 42'] },
    needRelays: n => `Build it with relays: use at least ${n} relay${n > 1 ? 's' : ''}.`,
    rowBad: "Not yet: the rows marked ✗ don't match the truth table.", relayPath: 'The bulb must be switched through a relay contact, not straight through the input switch.',
    shortRow: 'Short circuit in a row marked ✗.', lampNeeded: 'Put one bulb on the bench as the output.', inputsNeeded: k => `Put ${k} on the bench as the input${k.includes(' and ') ? 's' : ''}.`,
    challenge: (i, n) => `Challenge ${i} of ${n}`, value: v => `= ${v}`, operand: (k, v) => `${k} = ${v}`, sum: 'Sum', carryOut: 'Carry-out',
    nineBit: i => `bit ${i}`, slot: i => `bit ${i} · ${1 << i}`, tableHead: { lamp: 'Bulb', want: 'Should be', got: 'Got', ok: '' }, on: 'on', off: 'off',
    tabs6: { NOT: 'NOT', AND: 'AND', OR: 'OR', XOR: 'XOR' }, tabs8: { half: 'Half adder', full: 'Full adder' },
    inLabel: { A: 'A', B: 'B', Cin: 'Cin' }, outLabel: { out: 'Bulb', S: 'Sum', C: 'Carry', Cout: 'Cout' }, outPart: l => `Bulb ${l}`,
    binClear: 'All bulbs off', nineReminder: (a, b, s) => `Now set A to ${a} and B to ${b}: the sum should be ${s}.`
  };
  const KEY = 'adder-ladder-v1', TARGET_VOLTS = 3, BIN_TARGETS = [13, 29, 42], NINE = { a: 13, b: 29 };
  const qs = new URLSearchParams(location.search), UNLOCK_ALL = qs.get('unlock') === 'all';
  const $ = (s, el) => (el || document).querySelector(s), $$ = (s, el) => [...(el || document).querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let T = null, S = null, cur = 1, bench = null, sub6 = 'NOT', sub8 = 'half', run = {};
  const fresh = () => ({ v: 1, done: {}, sub: { 5: {}, 6: {}, 8: {} }, mods: {}, pile: null, benches: {}, bin: { value: 0, idx: 0 }, nine: { a: 0, b: 0 }, step: 1 });
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return Object.assign(fresh(), s); } catch (e) {} return fresh(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const done = n => !!S.done[n];
  const unlocked = n => UNLOCK_ALL || n === 1 || done(n - 1);
  const have = m => UNLOCK_ALL || !!S.mods[m];
  const pileCells = () => S.pile || [{}, {}, {}];
  const SFX = (n, o) => { if (root.SFX) root.SFX.play(n, o); };

  /* ---------------- shell ---------------- */
  function shell() {
    const app = $('#ladder-app');
    app.innerHTML =
      `<header class="hdr"><div class="plate brand">${UI.title}</div><span class="stepline" id="step-line"></span><span class="sp"></span>` +
      `<button class="btn tool" id="sound-toggle" type="button" aria-pressed="false">${UI.sound[0]}</button>` +
      `<button class="btn tool" id="motion-toggle" type="button" aria-pressed="false">${UI.motion[0]}</button>` +
      `<button class="btn tool" id="reset-progress" type="button">${UI.reset}</button></header>` +
      `<section class="lad-intro" id="ladder-intro">${T.intro.map(p => `<p>${esc(p)}</p>`).join('')}</section>` +
      `<div class="grid"><aside class="side"><div class="ladderbox"><h5>${UI.steps}</h5><ol class="ladder" id="step-nav"></ol></div>` +
      `<div class="goalbox" id="goalbox"></div></aside><main class="main" id="workspace"></main></div>` +
      `<dialog class="reset-dialog" id="reset-dialog"><p id="reset-question">${esc(T.reset.question)}</p><div class="dlg-btns">` +
      `<button class="btn" id="reset-cancel" type="button">${esc(T.reset.cancel)}</button><button class="btn danger" id="reset-confirm" type="button">${esc(T.reset.confirm)}</button></div></dialog>`;
    $('#sound-toggle').addEventListener('click', e => {
      const on = !(root.SFX && root.SFX.enabled); if (root.SFX) root.SFX.setEnabled(on);
      e.currentTarget.setAttribute('aria-pressed', on ? 'true' : 'false'); e.currentTarget.textContent = UI.sound[on ? 1 : 0];
      if (on && bench) bench.show(bench.res, 'render');   // restart the hum if a bulb is lit
    });
    $('#motion-toggle').addEventListener('click', e => {
      const on = !document.documentElement.classList.contains('bn-reduce'); document.documentElement.classList.toggle('bn-reduce', on);
      try { localStorage.setItem('adder-calm', on ? '1' : '0'); } catch (_) {}
      e.currentTarget.setAttribute('aria-pressed', on ? 'true' : 'false'); e.currentTarget.textContent = UI.motion[on ? 1 : 0];
    });
    try { if (localStorage.getItem('adder-calm') === '1') $('#motion-toggle').click(); } catch (_) {}
    const dlg = $('#reset-dialog');
    $('#reset-progress').addEventListener('click', () => { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
    $('#reset-cancel').addEventListener('click', () => dlg.close());
    $('#reset-confirm').addEventListener('click', () => { dlg.close(); resetProgress(); });
  }
  function resetProgress() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = fresh(); save(); SFX('bell-brass'); go(1);
  }
  function nav() {
    $('#step-nav').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
      const st = T.steps[n], cls = [done(n) ? 'done' : '', n === cur ? 'current' : '', unlocked(n) ? '' : 'locked'].filter(Boolean).join(' ');
      return `<li><button type="button" class="rung ${cls}" id="step-nav-${n}" data-step="${n}"${n === cur ? ' aria-current="step"' : ''}${unlocked(n) ? '' : ' aria-disabled="true"'}>` +
        `<span class="n">${n}</span><span class="rt">${esc(st.title)}</span></button></li>`;
    }).join('');
    $$('#step-nav .rung').forEach(b => b.addEventListener('click', () => { const n = +b.dataset.step; if (unlocked(n)) go(n); }));
    $('#step-line').textContent = UI.stepOf(cur, T.steps[cur].title);
    const r = $('#step-nav-' + cur); if (r && r.scrollIntoView && matchMedia('(max-width:900px)').matches) r.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  /* ---------------- goal card ---------------- */
  function vars(n) {
    const v = { targetVolts: TARGET_VOLTS, volts: TARGET_VOLTS, a: NINE.a, b: NINE.b, sum: NINE.a + NINE.b };
    if (n === 7) {
      /* {target} in the Goal is the next number to make; {made} is the one just made. Joseph's Success line uses {target}
         for the number just made, so the Success line is filled with target = made (see goalCard). */
      const next = BIN_TARGETS[Math.min(S.bin.idx, BIN_TARGETS.length - 1)];
      const made = run.binShown != null ? run.binShown : done(7) ? BIN_TARGETS[BIN_TARGETS.length - 1] : null;
      v.target = next; v.made = made != null ? made : next; v.binary = v.made.toString(2).padStart(8, '0');
    }
    if (n === 6) v.gate = run.gateShown || 'XOR';
    if (n === 8) v.module = run.moduleShown || T.steps[8].goals['Full adder'] && 'Full adder';
    return v;
  }
  function goalCard() {
    const n = cur, st = T.steps[n], V = vars(n), F = s => esc(T && LADDER_TEXT.fill(s, V));
    const FS = s => esc(LADDER_TEXT.fill(s, n === 7 ? Object.assign({}, V, { target: V.made }) : V));
    let sub = '';
    if (n === 6) sub = `<p class="subgoal" id="subgoal">${F(st.goals[sub6])}</p>`;
    if (n === 8) sub = `<p class="subgoal" id="subgoal">${F(st.goals[sub8 === 'half' ? 'Half adder' : 'Full adder'])}</p>`;
    $('#goalbox').innerHTML =
      `<div class="goal-card${done(n) ? ' met' : ''}" id="goal-card"><h3 id="step-title">Step ${n}: ${esc(st.title)}</h3>` +
      `<p class="intro">${F(st.intro)}</p><p class="goal" id="step-goal">${F(st.goal)}</p>${sub}<ul class="checks" id="checks"></ul>` +
      `<details class="hints" id="step-hints"><summary id="hints-toggle">${UI.hints}</summary>${st.hints.map((h, i) => `<p id="hint-${i + 1}">${F(h)}</p>`).join('')}</details>` +
      `<p class="success" id="step-success"${run.success || done(n) ? '' : ' hidden'}>${FS(st.success)}</p>` +
      `<p class="learned" id="step-learned"${done(n) ? '' : ' hidden'}>${F(st.learned)}</p>` +
      `<div class="stepnav"><button class="btn" id="prev-step" type="button"${n > 1 ? '' : ' disabled'}>${UI.prev}</button>` +
      `<button class="btn primary" id="next-step" type="button"${n < 9 && unlocked(n + 1) ? '' : ' disabled'}>${UI.next}</button></div></div>`;
    $('#prev-step').addEventListener('click', () => go(cur - 1));
    $('#next-step').addEventListener('click', () => { if (unlocked(cur + 1)) go(cur + 1); });
    checks();
  }
  function checks() {
    const ok = checkState(cur), el = $('#checks'); if (!el) return;
    el.innerHTML = UI.checks[cur].map((c, i) => `<li class="${ok[i] ? 'ok' : ''}" id="check-${cur}-${i + 1}">${esc(c)}</li>`).join('');
  }
  function checkState(n) {
    const all = done(n);
    switch (n) {
      case 3: { const k = run.seq3 || 0; return [all || k >= 1, all || k >= 2, all || k >= 3]; }
      case 4: return [all || !!run.grabbed, all];
      case 5: return [all || !!S.sub[5].no, all || !!S.sub[5].nc];
      case 6: return ['NOT', 'AND', 'OR', 'XOR'].map(g => !!S.sub[6][g]);
      case 7: return BIN_TARGETS.map((t, i) => all || S.bin.idx > i);
      case 8: return [!!S.sub[8].half, !!S.sub[8].full];
      case 9: { const c = run.nine || {}; return [all || !!c.placed, all || !!c.chain, all]; }
      default: return [all];
    }
  }
  function refreshText() { const keep = $('#step-hints') && $('#step-hints').open; goalCard(); if (keep) $('#step-hints').open = true; }
  /* step (or sub-step) solved */
  function complete(n, opt) {
    opt = opt || {};
    const first = !done(n);
    if (opt.subOnly) { run.success = true; refreshText(); celebrate(opt.final); return; }
    S.done[n] = true; save(); run.success = true;
    nav(); refreshText();
    if (first || opt.again) celebrate(n === 9);
  }
  function celebrate(final) {
    SFX(final ? 'bell-brass' : 'chime');
    const card = $('#goal-card'); if (card) card.classList.add('met');
    const host = $('#bench') || $('.scene') || card; if (!host) return;
    const r = host.getBoundingClientRect();
    root.BENCH.burst(host, r.width / 2, Math.min(r.height / 2, 160));
  }

  /* ---------------- steps ---------------- */
  function go(n) {
    if (bench) { bench.destroy(); bench = null; }
    if (root.SFX) root.SFX.hum(false);
    cur = Math.max(1, Math.min(9, n)); S.step = cur; save(); run = {};
    nav(); goalCard();
    const w = $('#workspace'); w.innerHTML = ''; w.dataset.step = cur;
    ({ 1: step1, 2: elecStep, 3: elecStep, 4: elecStep, 5: elecStep, 6: step6, 7: step7, 8: step8, 9: step9 })[cur](w);
    checks();
    document.body.dataset.step = cur;
  }
  const trayItem = (key, max, extra) => {
    const kind = { 'knife-a': 'knife', 'knife-b': 'knife' }[key] || key;
    return Object.assign({ key, kind, name: UI.parts[key], max }, key === 'pile' ? { cells: pileCells() } : {}, key === 'knife-a' ? { label: 'A' } : {}, key === 'knife-b' ? { label: 'B' } : {}, extra || {});
  };
  const partName = p => (p.label && UI.parts[p.key] ? UI.parts[p.key] : (p.kind === 'IN' ? 'Input ' + p.label : p.kind === 'OUT' ? (p.label === UI.outLabel.out ? p.label : UI.outPart(p.label)) : UI.parts[p.key || p.kind] || UI.parts[p.kind] || p.kind)).replace('- ', '');
  function mkBench(host, key, cfg) {
    const b = new root.Bench(host, Object.assign({
      state: S.benches[key], ui: UI, partName,
      size: { desk: [960, 540], mob: [480, 720] },
      onChange: (bb, why, info) => { S.benches[key] = bb.state(); save(); if (cfg.check) cfg.check(bb, why, info); }
    }, cfg));
    return b;
  }

  /* Step 1: stack cells into a voltaic pile */
  function step1(w) {
    const cells = (S.benches.pile1 && S.benches.pile1.cells) || (S.pile ? S.pile.map(c => Object.assign({}, c)) : []);
    w.innerHTML =
      `<div class="bn-scene scene pile-scene" id="bench" data-notip>${root.BENCH.benchTop()}<div class="pile-holder" id="pile-drop"><div class="pile-art" id="pile-art"></div><div class="pile-cells" id="pile-cells"></div></div>` +
      `<div class="meter-box"><div id="pile-meter"></div><output class="volts" id="pile-volts"></output></div></div>` +
      `<div class="bench-tools"><button class="btn bench-btn" id="pile-remove" type="button">${UI.pileRemove}</button><p class="bench-status" id="bench-status" aria-live="polite"></p></div>` +
      `<div class="tray-wrap"><div class="tray-label">${UI.tray}</div><div class="tray" id="tray"><div class="tray-box">${root.BENCH_ART.tray}` +
      `<button type="button" class="tray-item" id="tray-cell" style="left:12px"><span class="thumb">${root.ART.pile([{}], { cls: 'one' })}</span><span class="tname">${UI.parts.cell}</span></button></div></div></div>`;
    $('#pile-meter').innerHTML = root.ART.meter(0);
    const volts = () => cells.reduce((s, c) => s + (c.flip ? -1 : 1), 0);
    const draw = (why) => {
      $('#pile-art').innerHTML = root.ART.pile(cells, { cls: 'big' });
      const svg = $('#pile-art svg'), H = svg.getBoundingClientRect().height || 352, k = H / 160;
      $('#pile-cells').innerHTML = cells.map((c, i) => {
        const g = svg.querySelector(`[data-cell="${i}"]`), bb = g.getBBox();
        return `<button type="button" class="pile-cell" id="pile-cell-${i + 1}" aria-pressed="${c.flip ? 'true' : 'false'}" aria-label="${esc(UI.pileFlip(i + 1, c.flip))}" style="top:${(bb.y * k).toFixed(1)}px;height:${Math.max(18, bb.height * k).toFixed(1)}px"></button>`;
      }).join('');
      $$('#pile-cells .pile-cell').forEach((b, i) => b.addEventListener('click', () => { cells[i].flip = !cells[i].flip; SFX('binding-post-screw', { vol: .2 }); draw('flip'); }));
      const v = volts();
      $('#pile-meter .needle').style.transform = `rotate(${Math.max(-62, Math.min(62, -60 + (v / 6) * 120))}deg)`;
      $('#pile-volts').textContent = UI.pileVolts(v); $('#pile-volts').dataset.value = v;
      $('#pile-remove').disabled = !cells.length; $('#tray-cell').disabled = cells.length >= 6;
      $('#bench-status').textContent = v > TARGET_VOLTS ? UI.pileTooMuch : '';
      S.benches.pile1 = { cells }; save();
      if (v === TARGET_VOLTS && why !== 'init') { S.pile = cells.map(c => ({ flip: !!c.flip })); save(); if (!done(1)) complete(1); }
    };
    const add = () => { if (cells.length >= 6) return; cells.push({ flip: false }); SFX('binding-post-screw'); draw('add'); };
    $('#tray-cell').addEventListener('click', () => { if (!run.noClick) add(); });
    $('#pile-remove').addEventListener('click', () => { cells.pop(); draw('remove'); });
    // drag a cell from the tray onto the pile
    $('#tray-cell').addEventListener('pointerdown', e => {
      const b = e.currentTarget, s0 = { x: e.clientX, y: e.clientY }; let ghost = null;
      try { b.setPointerCapture(e.pointerId); } catch (_) {}
      const mv = ev => { if (!ghost && Math.hypot(ev.clientX - s0.x, ev.clientY - s0.y) < 10) return;
        if (!ghost) { ghost = b.querySelector('.thumb').cloneNode(true); ghost.className = 'tray-ghost'; document.body.appendChild(ghost); }
        ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; };
      const up = ev => { b.removeEventListener('pointermove', mv); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up);
        if (!ghost) return; ghost.remove(); run.noClick = true; setTimeout(() => { run.noClick = false; }, 0);
        const r = $('#bench').getBoundingClientRect(); if (ev.type === 'pointerup' && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) add(); };
      b.addEventListener('pointermove', mv); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    });
    draw('init');
    new ResizeObserver(() => { if (cur === 1 && $('#pile-art svg')) draw('init'); }).observe($('#pile-drop'));
  }

  /* Steps 2-5: free electrical benches */
  const ELEC_TRAY = {
    2: [['pile', 1], ['lamp', 1]], 3: [['pile', 1], ['lamp', 1], ['knife', 1]], 4: [['pile', 1], ['knife', 1], ['magnet', 1]],
    5: [['pile', 2], ['knife', 1], ['relay', 1], ['lamp', 1]]
  };
  function elecStatus(b, r) {
    if (r.short) return UI.status.short;
    if (r.unstable) return UI.status.buzz;
    const lamps = b.parts.filter(p => p.kind === 'lamp'), mags = b.parts.filter(p => p.kind === 'magnet');
    if (mags.length) { const m = r.magnets[mags[0].id]; return m.grab ? UI.status.grab : m.weak ? UI.status.weak : ''; }
    if (lamps.length) return lamps.some(p => r.lamps[p.id].lit) ? UI.status.lit : UI.status.dark;
    return '';
  }
  function elecStep(w) {
    const n = cur, host = document.createElement('div'); w.appendChild(host);
    if (n === 4) {
      const tools = document.createElement('div'); tools.className = 'magnet-tools'; tools.id = 'magnet-tools';
      tools.innerHTML = `<button class="btn" id="magnet-turns-less" type="button">${UI.magnetLess}</button><output id="magnet-turns"></output>` +
        `<button class="btn" id="magnet-turns-more" type="button">${UI.magnetMore}</button><button class="btn" id="magnet-wire-insulated" type="button" aria-pressed="false"></button>`;
      w.appendChild(tools);
    }
    bench = mkBench(host, String(n), {
      mode: 'elec', tray: ELEC_TRAY[n].map(([k, m]) => trayItem(k, m)), status: elecStatus,
      check: (b, why, info) => elecCheck(n, b, why, info)
    });
    if (n === 4) {
      const mag = () => bench.parts.find(p => p.kind === 'magnet');
      const sync = () => { const m = mag(); $('#magnet-turns').textContent = m ? UI.magnetTurns(m.turns) : UI.magnetNone; $('#magnet-turns').dataset.value = m ? m.turns : '';
        ['#magnet-turns-less', '#magnet-turns-more', '#magnet-wire-insulated'].forEach(s => { $(s).disabled = !m; });
        const ins = !!(m && m.insulated); $('#magnet-wire-insulated').setAttribute('aria-pressed', ins ? 'true' : 'false'); $('#magnet-wire-insulated').textContent = UI.magnetInsulated[ins ? 1 : 0]; };
      const chg = f => { const m = mag(); if (!m) return; f(m); bench.run('magnet'); sync(); };
      $('#magnet-turns-more').addEventListener('click', () => chg(m => { m.turns = Math.min(120, m.turns + 10); }));
      $('#magnet-turns-less').addEventListener('click', () => chg(m => { m.turns = Math.max(10, m.turns - 10); }));
      $('#magnet-wire-insulated').addEventListener('click', () => chg(m => { m.insulated = !m.insulated; }));
      run.syncMagnet = sync; sync();
    }
    elecCheck(n, bench, 'render');
  }
  const STRUCT = { place: 1, remove: 1, wire: 1, unwire: 1, clear: 1, render: 1, move: 0, magnet: 1 };
  function elecCheck(n, b, why, info) {
    if (run.syncMagnet) run.syncMagnet();
    const r = b.res; if (done(n) && n !== 5) return;
    const lamp = b.parts.find(p => p.kind === 'lamp'), lit = lamp ? r.lamps[lamp.id].lit && !r.short : false;
    if (n === 2 && lit) complete(2);
    if (n === 3) {
      const PAT = [true, false, true];
      if (STRUCT[why]) { run.seq3 = lit ? 1 : 0; run.last3 = lit; }
      if (why === 'toggle' && lit !== run.last3) { run.last3 = lit; if (lit === PAT[run.seq3 || 0]) run.seq3 = (run.seq3 || 0) + 1; }
      checks(); if (run.seq3 >= 3) complete(3);
    }
    if (n === 4) {
      const m = b.parts.find(p => p.kind === 'magnet'), grab = m ? r.magnets[m.id].grab : false;
      if (grab) run.grabbed = true;
      if (STRUCT[why] && why !== 'magnet' && !grab) run.grabbed = false;
      if (why === 'toggle' && info && !info.closed && run.grabbed && !grab) complete(4);
      checks();
    }
    if (n === 5) {
      const k = b.parts.find(p => p.kind === 'knife'), rel = b.parts.find(p => p.kind === 'relay');
      if (!k || !rel || !lamp) { run.snaps = []; return; }
      const R = r.relays[rel.id], s = { sw: !!k.closed, en: R.en, lit, no: lit && R.no >= 0.15, nc: lit && R.nc >= 0.15 };
      if (STRUCT[why] || !run.snaps) run.snaps = [];
      run.snaps.push(s);
      const has = f => run.snaps.some(f);
      if (!S.sub[5].no && has(x => x.sw && x.en && x.no) && has(x => !x.sw && !x.en && !x.lit)) { S.sub[5].no = true; save(); checks(); SFX('chime'); run.snaps = [s]; }
      else if (S.sub[5].no && !S.sub[5].nc && has(x => !x.sw && !x.en && x.nc) && has(x => x.sw && x.en && !x.lit)) { S.sub[5].nc = true; save(); complete(5); }
      checks();
    }
  }

  /* truth-table tester shared by Steps 6 and 8 */
  const FN = { NOT: r => [!r.A], AND: r => [r.A && r.B], OR: r => [r.A || r.B], XOR: r => [r.A !== r.B],
    half: r => [r.A !== r.B, r.A && r.B], full: r => { const t = r.A + r.B + r.Cin; return [t % 2 === 1, t > 1]; } };
  function rows(ins) { const out = []; for (let k = 0; k < 1 << ins.length; k++) { const r = {}; ins.forEach((x, i) => { r[x] = !!((k >> (ins.length - 1 - i)) & 1); }); out.push(r); } return out; }
  function tablePanel(id, ins, outs) {
    return `<div class="tt-panel" id="${id}-panel"><button class="btn primary" id="${id}" type="button">${UI.test}</button><p class="tt-msg" id="tt-msg" aria-live="polite"></p>` +
      `<table class="tt" id="truth-table"><thead><tr>${ins.map(x => `<th>${x}</th>`).join('')}${outs.map(o => `<th>${o}</th>`).join('')}<th></th></tr></thead><tbody>` +
      rows(ins).map((r, i) => `<tr data-row="${i}">${ins.map(x => `<td>${r[x] ? 1 : 0}</td>`).join('')}${outs.map(() => '<td class="got">·</td>').join('')}<td class="mark"></td></tr>`).join('') + '</tbody></table></div>';
  }
  async function runTable(spec) {
    // spec: {ins:[names], inIds:{A:partId}, fn, read(res)->[bools], rowOk(res,want,got)->bool|string, pre()->msg|null, onPass()}
    const btn = $('#' + spec.btn), msg = $('#tt-msg'); if (run.testing) return; run.testing = true; btn.disabled = true; btn.textContent = UI.testing;
    const pre = spec.pre && spec.pre(); const trs = $$('#truth-table tbody tr');
    trs.forEach(tr => { tr.classList.remove('ok', 'bad', 'cur'); $$('.got', tr).forEach(td => { td.textContent = '·'; }); tr.querySelector('.mark').textContent = ''; });
    if (pre) { msg.textContent = pre; msg.className = 'tt-msg bad'; run.testing = false; btn.disabled = false; btn.textContent = UI.test; return false; }
    const keep = {}; Object.values(spec.inIds).forEach(id => { keep[id] = !!bench.part(id).closed; });
    const slow = !(LADDER.fast || root.BENCH.reduce()); let all = true, why = '';
    const rs = rows(spec.ins);
    for (let i = 0; i < rs.length; i++) {
      const r = rs[i], map = {}; spec.ins.forEach(x => { map[spec.inIds[x]] = r[x]; });
      bench.prevEn = {}; const res = bench.setSwitches(map, !slow);
      const got = spec.read(res), want = spec.fn(Object.fromEntries(spec.ins.map(x => [x, r[x] ? 1 : 0])));
      let ok = got.every((g, k) => g === !!want[k]); const extra = ok && spec.rowOk ? spec.rowOk(res, want, got) : true;
      if (extra !== true) { ok = false; why = why || extra; }
      if (!ok) all = false;
      const tr = trs[i]; tr.classList.add('cur'); $$('.got', tr).forEach((td, k) => { td.textContent = got[k] ? UI.on : UI.off; });
      tr.classList.add(ok ? 'ok' : 'bad'); tr.querySelector('.mark').textContent = ok ? '✓' : '✗';
      if (slow) await sleep(420);
      tr.classList.remove('cur');
    }
    bench.prevEn = {}; bench.setSwitches(keep, true);
    msg.textContent = all ? '' : (why || UI.rowBad); msg.className = 'tt-msg' + (all ? ' ok' : ' bad');
    run.testing = false; btn.disabled = false; btn.textContent = UI.test;
    if (all) spec.onPass();
    return all;
  }

  /* Step 6: NOT, AND, OR from relays; then XOR from those modules */
  const G6 = ['NOT', 'AND', 'OR', 'XOR'];
  function step6(w) {
    if (!G6.includes(sub6)) sub6 = 'NOT';
    const avail = g => g !== 'XOR' || UNLOCK_ALL || (S.sub[6].NOT && S.sub[6].AND && S.sub[6].OR);
    w.innerHTML = `<div class="subtabs" role="tablist">${G6.map(g => `<button type="button" role="tab" class="subtab${S.sub[6][g] ? ' done' : ''}" id="gate-tab-${g.toLowerCase()}" data-g="${g}" aria-selected="${g === sub6}"${avail(g) ? '' : ' disabled'}>${UI.tabs6[g]}</button>`).join('')}</div><div id="bench-host"></div><div id="tt-host"></div>`;
    $$('.subtab', w).forEach(b => b.addEventListener('click', () => { sub6 = b.dataset.g; run = {}; go(6); }));
    const g = sub6, id = 'test-' + g.toLowerCase();
    if (g !== 'XOR') {
      const tray = [trayItem('pile', 2), trayItem('knife-a', 1)].concat(g === 'NOT' ? [] : [trayItem('knife-b', 1)]).concat([trayItem('relay', 3), trayItem('lamp', 1)]);
      bench = mkBench($('#bench-host'), '6-' + g, { mode: 'elec', tray, status: elecStatus });
      const ins = g === 'NOT' ? ['A'] : ['A', 'B'];
      $('#tt-host').innerHTML = tablePanel(id, ins, [UI.tableHead.lamp]);
      $('#' + id).addEventListener('click', () => {
        const sw = k => bench.parts.find(p => p.key === 'knife-' + k.toLowerCase()), lamp = bench.parts.find(p => p.kind === 'lamp');
        const need = g === 'NOT' ? 1 : 2;
        runTable({ btn: id, ins, inIds: Object.fromEntries(ins.map(k => [k, sw(k) && sw(k).id])), fn: FN[g],
          pre: () => !lamp ? UI.lampNeeded : ins.some(k => !sw(k)) ? UI.inputsNeeded(ins.map(k => UI.parts['knife-' + k.toLowerCase()]).join(' and ')) : bench.parts.filter(p => p.kind === 'relay').length < need ? UI.needRelays(need) : null,
          read: res => [!res.short && res.lamps[lamp.id].lit],
          // a lit row only counts when the lamp's current really passes through relay contacts (not straight through a switch)
          rowOk: (res, want, got) => res.short ? UI.shortRow : (!got[0] || bench.parts.filter(p => p.kind === 'relay').reduce((t, p) => t + res.relays[p.id].no + res.relays[p.id].nc, 0) >= 0.6 * res.lamps[lamp.id].I) ? true : UI.relayPath,
          onPass: () => passGate(g) });
      });
    } else {
      const tray = ['NOT', 'AND', 'OR'].filter(have).map(k => trayItem(k, k === 'AND' ? 3 : 2));
      bench = mkBench($('#bench-host'), '6-XOR', { mode: 'logic', tray, status: logicStatus,
        fixed: [{ id: 'inA', kind: 'IN', label: UI.inLabel.A }, { id: 'inB', kind: 'IN', label: UI.inLabel.B }, { id: 'out', kind: 'OUT', label: UI.outLabel.out }],
        fixedPos: (W, H) => W < 600 ? [{ id: 'inA', x: 20, y: 16 }, { id: 'inB', x: 290, y: 16 }, { id: 'out', x: W / 2 - 45, y: H - 170 }] : [{ id: 'inA', x: 16, y: 60 }, { id: 'inB', x: 16, y: H - 170 }, { id: 'out', x: W - 112, y: H / 2 - 90 }] });
      $('#tt-host').innerHTML = tablePanel(id, ['A', 'B'], [UI.tableHead.lamp]);
      $('#' + id).addEventListener('click', () => runTable({ btn: id, ins: ['A', 'B'], inIds: { A: 'inA', B: 'inB' }, fn: FN.XOR,
        read: res => [res.lamps.out === 1], rowOk: (res) => res.conflict ? UI.status.conflict : true, onPass: () => passGate('XOR') }));
    }
  }
  function logicStatus(b, r) { return r.conflict ? UI.status.conflict : ''; }
  function passGate(g) {
    const first = !S.sub[6][g];
    S.sub[6][g] = true; S.mods[g] = true; save(); run.gateShown = g;
    $$('.subtab').forEach(b => { if (b.dataset.g === g) b.classList.add('done'); if (b.dataset.g === 'XOR' && S.sub[6].NOT && S.sub[6].AND && S.sub[6].OR) b.disabled = false; });
    if (G6.every(x => S.sub[6][x])) complete(6, { again: first }); else complete(6, { subOnly: true });
    checks();
  }

  /* Step 7: binary with eight bulbs */
  function step7(w) {
    w.innerHTML = `<div class="bn-scene scene bin-scene" id="bench" data-notip>${root.BENCH.benchTop()}<p class="challenge" id="bin-challenge"></p><div id="bin-row"></div>` +
      `<div class="bin-switches" id="bin-switches">${[7, 6, 5, 4, 3, 2, 1, 0].map(i => `<button type="button" class="bin-sw" id="bin-bit-${i}" data-bit="${i}" aria-pressed="false" aria-label="Bulb worth ${1 << i}"><span>${1 << i}</span></button>`).join('')}</div>` +
      `<p class="bin-value"><output id="bin-value">0</output></p></div><div class="bench-tools"><button class="btn bench-btn" id="bin-clear" type="button">${UI.binClear}</button></div>`;
    let v = S.bin.value || 0;
    root.BENCH.binaryRow($('#bin-row'), v);
    const sync = (loud) => {
      $$('.bin-sw').forEach(b => b.setAttribute('aria-pressed', (v >> +b.dataset.bit) & 1 ? 'true' : 'false'));
      $('#bin-value').textContent = UI.value(v); $('#bin-value').dataset.value = v;
      const idx = Math.min(S.bin.idx, BIN_TARGETS.length - 1);
      $('#bin-challenge').textContent = done(7) ? '' : (T.steps[7].challenges[idx] || UI.challenge(idx + 1, BIN_TARGETS.length));
      $('#bin-challenge').dataset.target = done(7) ? '' : BIN_TARGETS[idx];
      if (root.SFX) root.SFX.hum(v > 0);
      S.bin.value = v; save();
      if (loud && !done(7) && v === BIN_TARGETS[S.bin.idx]) {
        run.binShown = v; S.bin.idx++; save();
        if (S.bin.idx >= BIN_TARGETS.length) complete(7); else { complete(7, { subOnly: true }); }
        sync(false);
      }
      checks();
    };
    $$('.bin-sw').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.bit, was = (v >> i) & 1; v ^= 1 << i;
      SFX(was ? 'knife-switch-open' : 'knife-switch-close'); if (!was) SFX('lamp-warmup-tick', { delay: 40 });
      root.BENCH.setBinary($('#bin-row'), v); sync(true);
    }));
    $('#bin-clear').addEventListener('click', () => { v = 0; root.BENCH.setBinary($('#bin-row'), v); sync(false); });
    sync(false);
  }

  /* Step 8: half adder, then full adder, from modules */
  function step8(w) {
    const avail = k => k === 'half' || UNLOCK_ALL || S.sub[8].half;
    w.innerHTML = `<div class="subtabs" role="tablist">${['half', 'full'].map(k => `<button type="button" role="tab" class="subtab${S.sub[8][k] ? ' done' : ''}" id="adder-tab-${k}" data-k="${k}" aria-selected="${k === sub8}"${avail(k) ? '' : ' disabled'}>${UI.tabs8[k]}</button>`).join('')}</div><div id="bench-host"></div><div id="tt-host"></div>`;
    $$('.subtab', w).forEach(b => b.addEventListener('click', () => { sub8 = b.dataset.k; run = {}; go(8); }));
    const half = sub8 === 'half', id = 'test-' + sub8;
    const tray = (half ? ['XOR', 'AND', 'OR', 'NOT'] : ['HALF', 'OR', 'XOR', 'AND', 'NOT']).filter(have).map(k => trayItem(k, 2));
    const fixed = half ? [{ id: 'inA', kind: 'IN', label: 'A' }, { id: 'inB', kind: 'IN', label: 'B' }, { id: 'outS', kind: 'OUT', label: UI.outLabel.S }, { id: 'outC', kind: 'OUT', label: UI.outLabel.C }]
      : [{ id: 'inA', kind: 'IN', label: 'A' }, { id: 'inB', kind: 'IN', label: 'B' }, { id: 'inC', kind: 'IN', label: UI.inLabel.Cin }, { id: 'outS', kind: 'OUT', label: UI.outLabel.S }, { id: 'outC', kind: 'OUT', label: UI.outLabel.Cout }];
    const fixedPos = (W, H) => {
      if (W < 600) return half ? [{ id: 'inA', x: 20, y: 16 }, { id: 'inB', x: 290, y: 16 }, { id: 'outS', x: 90, y: H - 170 }, { id: 'outC', x: 300, y: H - 170 }]
        : [{ id: 'inA', x: 0, y: 16 }, { id: 'inB', x: 160, y: 16 }, { id: 'inC', x: 320, y: 16 }, { id: 'outS', x: 90, y: H - 170 }, { id: 'outC', x: 300, y: H - 170 }];
      return half ? [{ id: 'inA', x: 16, y: 70 }, { id: 'inB', x: 16, y: H - 180 }, { id: 'outS', x: W - 112, y: 30 }, { id: 'outC', x: W - 112, y: H - 175 }]
        : [{ id: 'inA', x: 16, y: 16 }, { id: 'inB', x: 16, y: H / 2 - 52 }, { id: 'inC', x: 16, y: H - 125 }, { id: 'outS', x: W - 112, y: 30 }, { id: 'outC', x: W - 112, y: H - 175 }];
    };
    bench = mkBench($('#bench-host'), '8-' + sub8, { mode: 'logic', tray, fixed, fixedPos, status: logicStatus, size: { desk: [960, 540], mob: [480, 760] } });
    const ins = half ? ['A', 'B'] : ['A', 'B', 'Cin'], outs = half ? [UI.outLabel.S, UI.outLabel.C] : [UI.outLabel.S, UI.outLabel.Cout];
    $('#tt-host').innerHTML = tablePanel(id, ins, outs);
    $('#' + id).addEventListener('click', () => runTable({ btn: id, ins, numeric: true, inIds: half ? { A: 'inA', B: 'inB' } : { A: 'inA', B: 'inB', Cin: 'inC' }, fn: FN[sub8],
      read: res => [res.lamps.outS === 1, res.lamps.outC === 1], rowOk: res => res.conflict ? UI.status.conflict : true,
      onPass: () => { const first = !S.sub[8][sub8]; S.sub[8][sub8] = true; S.mods[half ? 'HALF' : 'FULL'] = true; save(); run.moduleShown = half ? 'Half adder' : 'Full adder';
        $$('.subtab').forEach(b => { if (b.dataset.k === sub8) b.classList.add('done'); if (b.dataset.k === 'full') b.disabled = false; });
        if (S.sub[8].half && S.sub[8].full) complete(8, { again: first }); else complete(8, { subOnly: true }); checks(); } }));
  }

  /* Step 9: eight full adders in a row; the carry chain is yours to wire */
  function nineSlots(W, H) {
    const pitch = 152, w = 146;
    if (W < 800) return [...Array(8)].map((_, i) => ({ id: 'nine-slot-' + i, bit: i, label: UI.slot(i), w, h: 150, x: W - 10 - ((i % 4) + 1) * pitch + 6, y: i >= 4 ? 30 : 250 }));
    return [...Array(8)].map((_, i) => ({ id: 'nine-slot-' + i, bit: i, label: UI.slot(i), w, h: 170, x: W - 10 - (i + 1) * pitch + 6, y: 40 }));
  }
  function step9(w) {
    const bits = (k) => `<div class="nine-row" id="nine-${k}-row"><span class="nine-name">${k.toUpperCase()}</span>${[7, 6, 5, 4, 3, 2, 1, 0].map(i => `<button type="button" class="bit nine-bit" id="nine-${k}-bit-${i}" data-k="${k}" data-bit="${i}" aria-pressed="false" aria-label="${k.toUpperCase()} bit ${i} (worth ${1 << i})">0</button>`).join('')}<output class="nine-dec" id="nine-${k}-value"></output></div>`;
    w.innerHTML = `<div class="nine-inputs">${bits('a')}${bits('b')}</div><div id="bench-host"></div>` +
      `<div class="nine-out"><h5>${UI.sum}</h5><div class="nine-sumrow"><div class="nine-cout" id="nine-cout"><span class="lbl">${UI.carryOut}</span></div><div id="nine-sum"></div></div><p class="nine-result"><output id="nine-result"></output></p>` +
      `<button class="btn" id="test-ripple" type="button">${UI.testChain}</button><p class="tt-msg" id="tt-msg" aria-live="polite"></p></div>`;
    root.BENCH.binaryRow($('#nine-sum'), 0);
    $('#nine-cout').insertAdjacentHTML('afterbegin', root.BENCH.part('bulb', "class='bn bn-lamp bn-minibulb'"));
    const hidden = [], hp = id => ({ id, kind: id[1] === 's' || id === 'nc8' ? 'OUT' : 'IN' });
    for (let i = 0; i < 8; i++) hidden.push(hp('na' + i), hp('nb' + i), hp('ns' + i)); hidden.push(hp('nc8'));
    const extra = (b, a, bb) => {
      const ws = [], inputs = {};
      for (let i = 0; i < 8; i++) { inputs['na' + i] = (a >> i) & 1; inputs['nb' + i] = (bb >> i) & 1; }
      b.parts.filter(p => p.kind === 'FULL' && p.slot != null).forEach(p => {
        const i = p.slot, W = (x, xp, y, yp) => ({ id: `i${p.id}${xp}${yp}`, a: { p: x, pin: xp }, b: { p: y, pin: yp } });
        ws.push(W('na' + i, 'out', p.id, 'A'), W('nb' + i, 'out', p.id, 'B'), W(p.id, 'S', 'ns' + i, 'in'));
        if (i === 7) ws.push(W(p.id, 'Cout', 'nc8', 'in'));
      });
      return { parts: hidden, wires: ws, inputs };
    };
    const readSum = res => { let s = 0; for (let i = 0; i < 8; i++) if (res.lamps['ns' + i] === 1) s |= 1 << i; return { sum: s, cout: res.lamps.nc8 === 1 ? 1 : 0 }; };
    const chainOK = b => [[13, 29], [255, 1], [127, 1], [170, 85], [1, 255], [200, 100], [85, 171]].every(([a, c]) => {
      const e = extra(b, a, c), r = readSum(root.CIRCUIT.logic(b.parts.concat(e.parts), b.wires.concat(e.wires), e.inputs)); return r.sum === ((a + c) & 255) && r.cout === ((a + c) >> 8); });
    const sync = () => {
      ['a', 'b'].forEach(k => { const v = S.nine[k]; $$(`#nine-${k}-row .nine-bit`).forEach(btn => { const on = (v >> +btn.dataset.bit) & 1; btn.textContent = on; btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.classList.toggle('on', !!on); });
        $(`#nine-${k}-value`).textContent = UI.operand(k.toUpperCase(), v); $(`#nine-${k}-value`).dataset.value = v; });
    };
    const evaluate = (b, why) => {
      const r = readSum(b.res); root.BENCH.setBinary($('#nine-sum'), r.sum, why === 'render');
      const cb = $('#nine-cout svg'); root.BENCH.heat(cb, r.cout); $('#nine-cout').classList.toggle('on', !!r.cout);
      $('#nine-result').textContent = `${S.nine.a} + ${S.nine.b} → ${r.sum}${r.cout ? ' + 256' : ''}`; $('#nine-result').dataset.sum = r.sum; $('#nine-result').dataset.cout = r.cout;
      const placed = b.parts.filter(p => p.kind === 'FULL' && p.slot != null).length === 8, chain = placed && chainOK(b);
      run.nine = { placed, chain, sum: r.sum }; checks();
      if (root.SFX) root.SFX.hum(r.sum > 0 || !!r.cout);
      if (!done(9) && placed && chain && S.nine.a === NINE.a && S.nine.b === NINE.b && r.sum === NINE.a + NINE.b && why !== 'render') complete(9);
      return { placed, chain, r };
    };
    bench = mkBench($('#bench-host'), '9', {
      mode: 'logic', tray: [trayItem('FULL', 8)], slots: nineSlots, size: { desk: [1240, 250], mob: [624, 440] },
      modulePins: p => [[['Cout', 'out']], [['Cin', 'in']], p.slot != null ? UI.nineBit(p.slot) : ''],
      logicExtra: b => extra(b, S.nine.a, S.nine.b), status: logicStatus,
      /* phone layout (two rows): a wire between the rows runs along the gap between them instead of cutting across the modules */
      wireRoute: (p, q, b) => {
        if (!b.mob || !b.slots[3] || !b.slots[4]) return null;
        const top = b.slots[4].y + b.slots[4].h, bot = b.slots[3].y, mid = (top + bot) / 2;
        return (Math.min(p.y, q.y) < top && Math.max(p.y, q.y) > bot) ? [[p.x, mid], [q.x, mid]] : null;
      },
      check: (b, why) => { if (why === 'move') b.renderAll(); evaluate(b, why); }
    });
    $$('.nine-bit').forEach(btn => btn.addEventListener('click', () => { const k = btn.dataset.k; S.nine[k] ^= 1 << +btn.dataset.bit; save(); sync(); SFX('knife-switch-close', { vol: .2 }); bench.run('inputs'); }));
    $('#test-ripple').addEventListener('click', () => {
      const e = evaluate(bench, 'test'), m = $('#tt-msg');
      const ok = e.placed && e.chain, setRight = S.nine.a === NINE.a && S.nine.b === NINE.b;
      const lines = !e.placed ? [UI.checks[9][0] + ': ✗'] : !e.chain ? [UI.checks[9][1] + ': ✗']
        : [UI.checks[9][1] + ': ✓', setRight ? UI.checks[9][2] + (done(9) ? ': ✓' : '') : UI.nineReminder(NINE.a, NINE.b, NINE.a + NINE.b)];
      m.innerHTML = lines.map((t, i) => `<span class="tt-line" id="tt-msg-${i + 1}">${esc(t)}</span>`).join('<br>');
      m.className = 'tt-msg' + (ok ? ' ok' : ' bad');
    });
    sync(); evaluate(bench, 'render');
  }

  /* ---------------- tooltips: Joseph's docs/ladder-tooltips.json, verbatim ----------------
     Exact key first, else the most specific * pattern (* = one dash-free id segment). Joseph's loader, unchanged. */
  let TIPS = {};
  const tipFor = (id, tips) => tips['#' + id] || Object.keys(tips).filter(k => k.includes('*')).map(k => [k, new RegExp('^' + k.replace(/\*/g, '[^-]+') + '$')]).filter(([, re]) => re.test('#' + id)).sort((a, b) => b[0].replace(/\*/g, '').length - a[0].replace(/\*/g, '').length).map(([k]) => tips[k])[0];
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function tipEl(el) {
    if (!el.id || el.closest('[data-notip]') === el) return;
    const t = tipFor(el.id, TIPS); if (!t) return;
    if (el instanceof SVGElement) {        /* SVG has no title attribute: use a <title> child */
      let ti = el.firstElementChild; if (!ti || ti.tagName !== 'title') { ti = document.createElementNS(SVG_NS, 'title'); el.insertBefore(ti, el.firstChild); }
      if (ti.textContent !== t) ti.textContent = t;
    } else if (el.getAttribute('title') !== t) el.setAttribute('title', t);
  }
  function applyTips(scope) { const r = scope || document; if (r.id) tipEl(r); r.querySelectorAll && r.querySelectorAll('[id]').forEach(tipEl); }
  function watchTips() {
    applyTips($('#ladder-app'));
    new MutationObserver(ms => ms.forEach(m => {
      if (m.type === 'attributes') tipEl(m.target);
      else m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.tagName !== 'title') applyTips(n); });
    })).observe($('#ladder-app'), { childList: true, subtree: true, attributes: true, attributeFilter: ['id'] });
  }
  async function loadTips() {
    try { const r = await fetch('docs/ladder-tooltips.json', { cache: 'no-cache' }); if (r.ok) { TIPS = await r.json(); delete TIPS._format; } } catch (e) { TIPS = {}; }
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    root.BENCH.installDefs();
    try { T = await LADDER_TEXT.load(); } catch (e) { $('#ladder-app').innerHTML = `<p class="load-error">Could not load docs/ladder-text.md (${esc(e.message)}). Serve this folder over http, e.g. python3 -m http.server.</p>`; return; }
    await loadTips();
    S = load(); shell(); watchTips();
    let n = +qs.get('step') || S.step || 1; if (!unlocked(n)) n = 1;
    if (qs.get('gate') && G6.includes(qs.get('gate').toUpperCase())) sub6 = qs.get('gate').toUpperCase();
    if (qs.get('adder') === 'full') sub8 = 'full';
    go(n);
    LADDER.ready = true; document.documentElement.dataset.ready = '1';
  }
  const LADDER = root.LADDER = { ready: false, fast: false, UI, go, get S() { return S; }, get bench() { return bench; }, get step() { return cur; }, get T() { return T; },
    unlocked, done, resetProgress, tipFor: id => tipFor(id, TIPS), get tips() { return TIPS; }, setSub: (k, v) => { if (k === 6) sub6 = v; if (k === 8) sub8 = v; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
