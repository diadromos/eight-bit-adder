/* Browser tests for the 9-step workbench ladder (index.html), then the classic simulator page (tests/classictest.js).
   Run: NODE_PATH=/tmp/mothtest/node_modules node tests/addertest.js   (page served on http://127.0.0.1:8770/) */
const puppeteer = require('puppeteer-core'); const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const B = 'http://127.0.0.1:8770/', ROOT = path.join(__dirname, '..'), R = [];
const ok = (name, pass, info = '') => { R.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TXT = require(path.join(ROOT, 'js/ladder/text.js')); const MD = TXT.parse(fs.readFileSync(path.join(ROOT, 'docs/ladder-text.md'), 'utf8'));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const errs = [];
  async function open(q, o = {}) {
    const ctx = o.ctx || b.defaultBrowserContext();
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(q + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(q + ': console ' + m.text()); });
    if (o.reduce) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await p.setViewport(o.mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: o.w || 1280, height: 900 });
    await p.goto(B + q, { waitUntil: 'networkidle0' }); await p.waitForFunction('window.LADDER&&LADDER.ready');
    if (o.clear) { await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' }); await p.waitForFunction('window.LADDER&&LADDER.ready'); }
    await p.evaluate(() => { LADDER.fast = true; });
    return p;
  }
  const ev = (p, f, ...a) => p.evaluate(f, ...a);
  const ids = (p, kind) => ev(p, k => LADDER.bench.parts.filter(x => x.kind === k).map(x => x.id), kind);
  const pin = s => ({ '+': 'pos', '-': 'neg' }[s] || s);
  async function place(p, key, tap) { const before = await ev(p, () => LADDER.bench.parts.map(x => x.id)); if (tap) await p.tap('#tray-' + key); else await p.click('#tray-' + key); await sleep(30);
    return ev(p, bf => LADDER.bench.parts.map(x => x.id).find(i => !bf.includes(i)), before); }
  async function wire(p, a, ap, c, cp, tap) { for (const s of [`#term-${a}-${pin(ap)}`, `#term-${c}-${pin(cp)}`]) { if (tap) await p.tap(s); else await p.click(s); await sleep(15); } }
  async function toggle(p, id) { await p.focus('#part-' + id); await p.keyboard.press('Enter'); await sleep(30); }
  const lampLit = (p, id) => ev(p, i => LADDER.bench.res.lamps[i].lit && document.querySelector('#part-' + i + ' svg').classList.contains('on'), id);
  const isDone = (p, n) => ev(p, n => LADDER.done(n), n);
  const navState = p => ev(p, () => [...document.querySelectorAll('#step-nav .rung')].map(r => r.classList.contains('locked') ? 'L' : r.classList.contains('done') ? 'D' : 'U').join(''));

  // ---------- 1. fresh start: only step 1 open; locked rungs do nothing ----------
  let p = await open('', { clear: true });
  let r = await navState(p); await p.click('#step-nav-3'); await sleep(50);
  ok('fresh start: only Step 1 unlocked, clicking a locked rung does nothing', r === 'ULLLLLLLL' && await ev(p, () => LADDER.step) === 1, r);
  // ---------- 2. Joseph's text, verbatim, placeholders filled ----------
  r = await ev(p, () => ({ intro: [...document.querySelectorAll('#ladder-intro p')].map(e => e.textContent), q: document.querySelector('#reset-question').textContent, c: document.querySelector('#reset-confirm').textContent, k: document.querySelector('#reset-cancel').textContent }));
  ok('ladder intro + reset dialog text verbatim', JSON.stringify(r.intro) === JSON.stringify(MD.intro) && r.q === MD.reset.question && r.c === MD.reset.confirm && r.k === MD.reset.cancel);
  await p.close();
  p = await open('?unlock=all');
  const textBad = [];
  for (let n = 1; n <= 9; n++) {
    await ev(p, n => LADDER.go(n), n); await sleep(40);
    const got = await ev(p, () => ({ title: document.querySelector('#step-title').textContent, intro: document.querySelector('.goal-card .intro').textContent, goal: document.querySelector('#step-goal').textContent,
      hints: [...document.querySelectorAll('#step-hints p')].map(e => e.textContent), success: document.querySelector('#step-success').textContent, learned: document.querySelector('#step-learned').textContent, all: document.querySelector('#goal-card').textContent }));
    const st = MD.steps[n], V = { targetVolts: 3, volts: 3, target: 13, binary: '00001101', gate: 'XOR', module: 'Full adder', a: 13, b: 29, sum: 42 };
    const F = s => TXT.fill(s, V);
    if (got.title !== `Step ${n}: ${st.title}`) textBad.push(n + ' title');
    if (got.intro !== st.intro || got.goal !== F(st.goal) || got.learned !== st.learned || got.success !== F(st.success) || JSON.stringify(got.hints) !== JSON.stringify(st.hints.map(F))) textBad.push(n + ' fields');
    if (/\{\w+\}/.test(got.all)) textBad.push(n + ' unfilled placeholder');
  }
  for (const g of ['NOT', 'AND', 'OR', 'XOR']) { await ev(p, g => { LADDER.setSub(6, g); LADDER.go(6); }, g); if (await ev(p, () => document.querySelector('#subgoal').textContent) !== MD.steps[6].goals[g]) textBad.push('6 goal ' + g); }
  for (const [k, g] of [['half', 'Half adder'], ['full', 'Full adder']]) { await ev(p, k => { LADDER.setSub(8, k); LADDER.go(8); }, k); if (await ev(p, () => document.querySelector('#subgoal').textContent) !== MD.steps[8].goals[g]) textBad.push('8 goal ' + g); }
  ok("all 9 steps: Joseph's title/intro/goal/sub-goals/hints/success/learned verbatim, placeholders filled", textBad.length === 0, textBad.join(', ') || '9 steps + 6 sub-goals');
  // ---------- 3. ?unlock=all ----------
  r = await navState(p);
  ok('?unlock=all opens all 9 steps (without saving anything as done)', /^[UD]{9}$/.test(r) && !r.includes('L') && await ev(p, () => Object.keys(LADDER.S.done).length) === 0, r);
  await p.close();

  // ---------- 4. Step 1: the pile ----------
  p = await open('', { clear: true });
  await p.click('#tray-cell'); await p.click('#tray-cell');
  const v2 = await ev(p, () => +document.querySelector('#pile-volts').dataset.value);
  await p.click('#pile-cell-2'); await p.click('#tray-cell'); await p.click('#tray-cell'); await sleep(30);   // flip cell 2, add two: 4 cells, one flipped = 2 V
  const flip = await ev(p, () => [+document.querySelector('#pile-volts').dataset.value, LADDER.done(1)]);
  await p.click('#pile-cell-2'); await sleep(30);   // 4 V: too much
  const four = await ev(p, () => [+document.querySelector('#pile-volts').dataset.value, LADDER.done(1), document.querySelector('#bench-status').textContent]);
  await p.click('#pile-remove'); await sleep(50);
  r = await ev(p, () => ({ v: +document.querySelector('#pile-volts').dataset.value, done: LADDER.done(1), succ: document.querySelector('#step-success').textContent, hidden: document.querySelector('#step-success').hidden, nav2: !document.querySelector('#step-nav-2').classList.contains('locked') }));
  ok('Step 1: 2 cells = 2 V (not done); a flipped cell pushes back (4 cells, 1 flipped = 2 V); 4 V is too much; 3 V completes and unlocks Step 2',
    v2 === 2 && flip[0] === 2 && !flip[1] && four[0] === 4 && !four[1] && four[2] && r.v === 3 && r.done && !r.hidden && r.succ === TXT.fill(MD.steps[1].success, { volts: 3 }) && r.nav2, JSON.stringify({ v2, flip, four, r }));
  await p.reload({ waitUntil: 'networkidle0' }); await p.waitForFunction('window.LADDER&&LADDER.ready');
  r = await navState(p);
  ok('progress persists in localStorage across a reload', r.startsWith('DU') && r.slice(2) === 'LLLLLLL' && await ev(p, () => !!JSON.parse(localStorage.getItem('adder-ladder-v1')).done[1]), r);

  // ---------- 5. Step 2: wire and bulb ----------
  await p.click('#step-nav-2'); await sleep(50);
  let pile = await place(p, 'pile'), lamp = await place(p, 'lamp');
  await wire(p, pile, '+', lamp, 'a');
  const open2 = [await lampLit(p, lamp), await isDone(p, 2), await ev(p, () => document.querySelector('#bench-status').textContent)];
  await p.click('#term-' + pile + '-pos'); await p.click('#term-' + pile + '-neg'); await sleep(30);   // a short: pile + straight to -
  const short2 = await ev(p, () => [LADDER.bench.res.short, document.querySelector('#bench-status').textContent, document.querySelector('.part-pile svg').classList.contains('short')]);
  const wShort = await ev(p, () => LADDER.bench.wires[LADDER.bench.wires.length - 1].id);
  await p.click(`#wire-${wShort} .cw-hit`).catch(() => {}); await ev(p, w => LADDER.bench.select({ type: 'wire', id: w }), wShort); await p.click('#bench-delete'); await sleep(30);
  await wire(p, lamp, 'b', pile, '-'); await sleep(30);
  r = await ev(p, l => ({ lit: LADDER.bench.res.lamps[l].lit, heat: document.querySelector('#part-' + l + ' svg').style.getPropertyValue('--heat'), wires: LADDER.bench.wires.length, flow: document.querySelectorAll('.cw.on.flow').length, tight: document.querySelectorAll('#bench .bn-screw.tight').length }), lamp);
  ok('Step 2: open loop stays dark; pile shorted to itself = short circuit, dark; closed loop lights the bulb (warm filament, live flowing wires, tight screws) and completes',
    !open2[0] && !open2[1] && short2[0] && short2[2] && /Short/.test(short2[1]) && r.lit && +r.heat > .9 && r.wires === 2 && r.flow === 2 && r.tight >= 4 && await isDone(p, 2), JSON.stringify({ open2, short2, r }));
  // removing a part removes its wires
  await ev(p, l => LADDER.bench.select({ type: 'part', id: l }), lamp); await p.click('#bench-delete'); await sleep(30);
  ok('Remove selected: deleting the bulb removes it and its wires', await ev(p, () => LADDER.bench.parts.length === 1 && LADDER.bench.wires.length === 0));

  // ---------- 6. Step 3: knife switch ----------
  await p.click('#step-nav-3'); await sleep(50);
  pile = await place(p, 'pile'); lamp = await place(p, 'lamp'); const knife = await place(p, 'knife');
  await wire(p, pile, '+', knife, 'a'); await wire(p, knife, 'b', lamp, 'a'); await wire(p, lamp, 'b', pile, '-');
  const s3 = [await lampLit(p, lamp)];
  await toggle(p, knife); s3.push(await lampLit(p, lamp), await ev(p, k => document.querySelector('#part-' + k + ' svg').classList.contains('closed'), knife));
  await toggle(p, knife); s3.push(await lampLit(p, lamp), await isDone(p, 3));
  await toggle(p, knife); s3.push(await lampLit(p, lamp));
  ok('Step 3: switch open = dark (broken loop), closed = lit (blade .closed), on/off/on completes', !s3[0] && s3[1] && s3[2] && !s3[3] && !s3[4] && s3[5] && await isDone(p, 3), JSON.stringify(s3));

  // ---------- 7. Step 4: electromagnet ----------
  await p.click('#step-nav-4'); await sleep(50);
  pile = await place(p, 'pile'); const k4 = await place(p, 'knife'), mag = await place(p, 'magnet');
  await wire(p, pile, '+', k4, 'a'); await wire(p, k4, 'b', mag, 'a'); await wire(p, mag, 'b', pile, '-');
  await toggle(p, k4);
  const weak = await ev(p, m => [LADDER.bench.res.magnets[m].grab, LADDER.bench.res.magnets[m].weak, document.querySelector('#part-' + m + ' svg').classList.contains('on')], mag);
  await p.click('#magnet-wire-insulated'); await sleep(20);
  const ins20 = await ev(p, m => LADDER.bench.res.magnets[m].grab, mag);
  for (let i = 0; i < 4; i++) await p.click('#magnet-turns-more');
  await sleep(500);
  const grab = await ev(p, m => [LADDER.bench.res.magnets[m].grab, document.querySelector('#part-' + m + ' svg').classList.contains('on'), +document.querySelector('#magnet-turns').dataset.value], mag);
  await toggle(p, k4); await sleep(700);
  r = await ev(p, m => [LADDER.bench.res.magnets[m].grab, document.querySelector('#part-' + m + ' svg').classList.contains('on')], mag);
  ok('Step 4: bare wire = weak (no lift); insulated 20 turns still too weak; insulated 60 turns lifts the iron; switching off drops it and completes',
    !weak[0] && weak[1] && !weak[2] && !ins20 && grab[0] && grab[1] && grab[2] === 60 && !r[0] && !r[1] && await isDone(p, 4), JSON.stringify({ weak, ins20, grab, r }));

  // ---------- 8. Step 5: relay ----------
  await p.click('#step-nav-5'); await sleep(50);
  const p1 = await place(p, 'pile'), p2 = await place(p, 'pile'), k5 = await place(p, 'knife'), rel = await place(p, 'relay'), l5 = await place(p, 'lamp');
  // broken attempt first: the lamp straight through the switch, no relay contacts
  await wire(p, p1, '+', k5, 'a'); await wire(p, k5, 'b', l5, 'a'); await wire(p, l5, 'b', p1, '-');
  await toggle(p, k5); await toggle(p, k5);
  const direct = await ev(p, () => !!LADDER.S.sub[5].no);
  await p.click('#bench-clear'); await sleep(30);
  const left = await ev(p, () => LADDER.bench.parts.length);
  const q1 = await place(p, 'pile'), q2 = await place(p, 'pile'), k6 = await place(p, 'knife'), r6 = await place(p, 'relay'), l6 = await place(p, 'lamp');
  await wire(p, q1, '+', k6, 'a'); await wire(p, k6, 'b', r6, 'c1'); await wire(p, r6, 'c2', q1, '-');            // circuit 1: switch -> coil
  await wire(p, q2, '+', r6, 'com'); await wire(p, r6, 'no', l6, 'a'); await wire(p, l6, 'b', q2, '-');           // circuit 2: NO contact -> lamp
  const no0 = await lampLit(p, l6); await toggle(p, k6); await sleep(600);
  const no1 = [await lampLit(p, l6), await ev(p, r => document.querySelector('#part-' + r + ' svg').classList.contains('energized'), r6)];
  await toggle(p, k6); await sleep(80);
  const noDone = await ev(p, () => [!!LADDER.S.sub[5].no, LADDER.done(5)]);
  const wNO = await ev(p, r => LADDER.bench.wires.find(w => w.a.pin === 'no' || w.b.pin === 'no').id, r6);
  await ev(p, w => LADDER.bench.select({ type: 'wire', id: w }), wNO); await p.click('#bench-delete');
  await wire(p, r6, 'nc', l6, 'a');
  const nc0 = await lampLit(p, l6); await toggle(p, k6); await sleep(80); const nc1 = await lampLit(p, l6);
  ok('Step 5: lamp wired straight through the switch does not count; NO relay: lamp follows the switch from a 2nd circuit; then NC: lamp lit while switch is off, dark when on; completes',
    !direct && left === 0 && !no0 && no1[0] && no1[1] && noDone[0] && !noDone[1] && nc0 && !nc1 && await isDone(p, 5), JSON.stringify({ direct, no0, no1, noDone, nc0, nc1 }));
  await p.close();

  // ---------- 9. Step 6: gates from relays, then XOR from modules ----------
  p = await open('?unlock=all&step=6&gate=NOT', { clear: true });
  async function relayGate(g, build) {
    await ev(p, g => { LADDER.setSub(6, g); LADDER.go(6); }, g); await sleep(40);
    const P = { pile: await place(p, 'pile'), A: await place(p, 'knife-a'), lamp: await place(p, 'lamp'), r1: await place(p, 'relay') };
    if (g !== 'NOT') { P.B = await place(p, 'knife-b'); P.r2 = await place(p, 'relay'); }
    await build(P);
    await p.click('#test-' + g.toLowerCase()); await p.waitForFunction(() => !document.querySelector('.tt-panel .btn').disabled);
    return ev(p, () => ({ marks: [...document.querySelectorAll('#truth-table .mark')].map(e => e.textContent).join(''), got: [...document.querySelectorAll('#truth-table .got')].map(e => e.textContent).join(','), msg: document.querySelector('#tt-msg').textContent }));
  }
  const coil = async (P, sw, rl) => { await wire(p, P.pile, '+', P[sw], 'a'); await wire(p, P[sw], 'b', P[rl], 'c1'); await wire(p, P[rl], 'c2', P.pile, '-'); };
  const tNOT = await relayGate('NOT', async P => { await coil(P, 'A', 'r1'); await wire(p, P.pile, '+', P.r1, 'com'); await wire(p, P.r1, 'nc', P.lamp, 'a'); await wire(p, P.lamp, 'b', P.pile, '-'); });
  const nNOT = await ev(p, () => [!!LADDER.S.sub[6].NOT, document.querySelector('#step-success').textContent]);
  // AND built wrong first (relay contacts in parallel = OR), then right (series)
  const tANDbad = await relayGate('AND', async P => { await coil(P, 'A', 'r1'); await coil(P, 'B', 'r2');
    await wire(p, P.pile, '+', P.r1, 'com'); await wire(p, P.pile, '+', P.r2, 'com'); await wire(p, P.r1, 'no', P.lamp, 'a'); await wire(p, P.r2, 'no', P.lamp, 'a'); await wire(p, P.lamp, 'b', P.pile, '-'); });
  const andBad = await ev(p, () => !!LADDER.S.sub[6].AND);
  await p.click('#bench-clear');
  const tAND = await relayGate('AND', async P => { await coil(P, 'A', 'r1'); await coil(P, 'B', 'r2');
    await wire(p, P.pile, '+', P.r1, 'com'); await wire(p, P.r1, 'no', P.r2, 'com'); await wire(p, P.r2, 'no', P.lamp, 'a'); await wire(p, P.lamp, 'b', P.pile, '-'); });
  // switches in series with no relays: right lamp pattern, but not a relay gate
  await ev(p, () => { LADDER.setSub(6, 'OR'); LADDER.go(6); }); await p.click('#bench-clear');
  const tORnoRelay = await relayGate('OR', async P => { await wire(p, P.pile, '+', P.A, 'a'); await wire(p, P.pile, '+', P.B, 'a'); await wire(p, P.A, 'b', P.lamp, 'a'); await wire(p, P.B, 'b', P.lamp, 'a'); await wire(p, P.lamp, 'b', P.pile, '-'); });
  const orNo = await ev(p, () => !!LADDER.S.sub[6].OR);
  await p.click('#bench-clear');
  const tOR = await relayGate('OR', async P => { await coil(P, 'A', 'r1'); await coil(P, 'B', 'r2');
    await wire(p, P.pile, '+', P.r1, 'com'); await wire(p, P.pile, '+', P.r2, 'com'); await wire(p, P.r1, 'no', P.lamp, 'a'); await wire(p, P.r2, 'no', P.lamp, 'a'); await wire(p, P.lamp, 'b', P.pile, '-'); });
  ok('Step 6 relay gates: NOT (1 NC relay) truth table passes', tNOT.marks === '✓✓' && tNOT.got === 'on,off' && nNOT[0] && nNOT[1] === TXT.fill(MD.steps[6].success, { gate: 'NOT' }), JSON.stringify([tNOT, nNOT]));
  ok('Step 6 relay gates: AND wired in parallel fails rows; AND in series passes (0001)', /✗/.test(tANDbad.marks) && !andBad && tAND.marks === '✓✓✓✓' && tAND.got === 'off,off,off,on', JSON.stringify([tANDbad, tAND]));
  ok('Step 6 relay gates: OR from bare switches (no relays) is rejected; OR from 2 relays in parallel passes (0111)', !orNo && /relay/.test(tORnoRelay.msg) && tOR.marks === '✓✓✓✓' && tOR.got === 'off,on,on,on', JSON.stringify([tORnoRelay, tOR]));
  // XOR from the earned modules
  await ev(p, () => { LADDER.setSub(6, 'XOR'); LADDER.go(6); }); await sleep(40);
  const tray6 = await ev(p, () => [...document.querySelectorAll('#tray .tray-item')].map(e => e.id).join(','));
  const o = await place(p, 'OR'), a1 = await place(p, 'AND'), n1 = await place(p, 'NOT'), a2 = await place(p, 'AND');
  await wire(p, 'inA', 'out', o, 'A'); await wire(p, 'inB', 'out', o, 'B'); await wire(p, 'inA', 'out', a1, 'A'); await wire(p, 'inB', 'out', a1, 'B');
  await wire(p, a1, 'out', n1, 'A'); await wire(p, o, 'out', a2, 'A'); await wire(p, n1, 'out', a2, 'B'); await wire(p, a2, 'out', 'out', 'in');
  await p.click('#test-xor'); await p.waitForFunction(() => !document.querySelector('#test-xor').disabled);
  r = await ev(p, () => ({ marks: [...document.querySelectorAll('#truth-table .mark')].map(e => e.textContent).join(''), got: [...document.querySelectorAll('#truth-table .got')].map(e => e.textContent).join(','), done: LADDER.done(6), mods: LADDER.S.mods }));
  ok('Step 6 XOR from OR/AND/NOT modules passes 0110; all four gates earned -> step done; earned modules in the tray', tray6 === 'tray-NOT,tray-AND,tray-OR' && r.marks === '✓✓✓✓' && r.got === 'off,on,on,off' && r.done && r.mods.NOT && r.mods.XOR, JSON.stringify([tray6, r]));
  await p.close();

  // ---------- 10. Step 7: binary ----------
  p = await open('?unlock=all&step=7', { clear: true });
  const setBin = async v => { const cur = await ev(p, () => +document.querySelector('#bin-value').dataset.value); for (let i = 0; i < 8; i++) if (((cur ^ v) >> i) & 1) await p.click('#bin-bit-' + i); };
  const st7 = () => ev(p, () => ({ goal: document.querySelector('#step-goal').textContent, ch: document.querySelector('#bin-challenge').textContent, tgt: document.querySelector('#bin-challenge').dataset.target,
    succ: document.querySelector('#step-success').hidden ? null : document.querySelector('#step-success').textContent, idx: LADDER.S.bin.idx, lit: [...document.querySelectorAll('#bin-row .bb.on')].map(e => e.dataset.bit).join('') }));
  const G7 = t => TXT.fill(MD.steps[7].goal, { target: t }), S7 = (t, bin) => TXT.fill(MD.steps[7].success, { target: t, binary: bin });
  const c0 = await st7();
  await setBin(12); const d12 = await isDone(p, 7), c12 = await st7();
  await setBin(13); const s13 = await st7();
  await setBin(29); const s29 = await st7();
  await setBin(42); const s42 = await st7();
  ok('Step 7: 12 is not 13; 13 lights bulbs 8+4+1 (success text "That\'s 13, written 00001101"); 29 then 42 complete the step', !d12 && s13.succ === S7(13, '00001101') && s13.idx === 1 && s13.lit === '320' && await isDone(p, 7), JSON.stringify(s13));
  ok('Step 7 target progression: goal + Joseph\'s challenge line move 13 -> 29 -> 42; success names the number just made',
    MD.steps[7].challenges.length === 3 && c0.goal === G7(13) && c0.ch === MD.steps[7].challenges[0] && c0.tgt === '13' && c12.goal === G7(13) && c12.succ === null &&
    s13.goal === G7(29) && s13.ch === MD.steps[7].challenges[1] && s13.tgt === '29' &&
    s29.goal === G7(42) && s29.ch === MD.steps[7].challenges[2] && s29.succ === S7(29, '00011101') &&
    s42.succ === S7(42, '00101010') && s42.ch === '' && [13, 29, 42].every((t, i) => MD.steps[7].challenges[i].startsWith('Make ' + t + '.') && MD.steps[7].challenges[i].endsWith(t.toString(2).padStart(8, '0') + '.')),
    JSON.stringify({ c0, s13, s29, s42 }));
  await p.click('#bin-clear'); r = await ev(p, () => [document.querySelector('#bin-clear').textContent, document.querySelector('#bin-value').dataset.value]);
  ok('Step 7: #bin-clear reads "' + 'All bulbs off" and turns every bulb off', r[0] === 'All bulbs off' && r[1] === '0', JSON.stringify(r));
  await p.close();

  // ---------- 11. Step 8: half adder then full adder ----------
  p = await open('?unlock=all&step=8', { clear: true });
  const x = await place(p, 'XOR'), an = await place(p, 'AND');
  await wire(p, 'inA', 'out', x, 'A'); await wire(p, 'inB', 'out', x, 'B'); await wire(p, x, 'out', 'outC', 'in');   // sum wired to the carry lamp: wrong
  await wire(p, 'inA', 'out', an, 'A'); await wire(p, 'inB', 'out', an, 'B');
  await p.click('#test-half'); await p.waitForFunction(() => !document.querySelector('#test-half').disabled);
  const halfBad = await ev(p, () => [!!LADDER.S.sub[8].half, [...document.querySelectorAll('#truth-table .mark')].map(e => e.textContent).join('')]);
  await ev(p, () => { const b = LADDER.bench, w = b.wires.find(w => w.b.p === 'outC'); b.removeWire(w.id); });
  await wire(p, x, 'out', 'outS', 'in'); await wire(p, an, 'out', 'outC', 'in');
  await p.click('#test-half'); await p.waitForFunction(() => !document.querySelector('#test-half').disabled);
  const half = await ev(p, () => [!!LADDER.S.sub[8].half, [...document.querySelectorAll('#truth-table .got')].map(e => e.textContent).join(','), document.querySelector('#step-success').textContent]);
  await p.click('#adder-tab-full'); await sleep(40);
  const h1 = await place(p, 'HALF'), h2 = await place(p, 'HALF'), or = await place(p, 'OR');
  await wire(p, 'inA', 'out', h1, 'A'); await wire(p, 'inB', 'out', h1, 'B'); await wire(p, h1, 'S', h2, 'A'); await wire(p, 'inC', 'out', h2, 'B');
  await wire(p, h2, 'S', 'outS', 'in'); await wire(p, h1, 'C', or, 'A'); await wire(p, h2, 'C', or, 'B'); await wire(p, or, 'out', 'outC', 'in');
  await p.click('#test-full'); await p.waitForFunction(() => !document.querySelector('#test-full').disabled);
  const full = await ev(p, () => [!!LADDER.S.sub[8].full, [...document.querySelectorAll('#truth-table .mark')].map(e => e.textContent).join(''), [...document.querySelectorAll('#truth-table .got')].map(e => e.textContent).join(','), LADDER.done(8), document.querySelector('#step-success').textContent]);
  ok('Step 8: miswired half adder fails; XOR+AND half adder passes 4 rows; full adder from 2 half adders + OR passes all 8 rows; step done',
    !halfBad[0] && /✗/.test(halfBad[1]) && half[0] && half[1] === 'off,off,on,off,on,off,off,on' && half[2] === TXT.fill(MD.steps[8].success, { module: 'Half adder' }) && full[0] && full[1] === '✓'.repeat(8) &&
    full[2] === 'off,off,on,off,on,off,off,on,on,off,off,on,off,on,on,on' && full[3] && full[4] === TXT.fill(MD.steps[8].success, { module: 'Full adder' }), JSON.stringify({ halfBad, half, full }));
  await p.close();

  // ---------- 12. Step 9: 8-bit ripple adder, 13 + 29 = 42 ----------
  p = await open('?unlock=all&step=9', { clear: true });
  const fa = []; for (let i = 0; i < 8; i++) fa.push(await place(p, 'FULL'));
  const slots = await ev(p, () => LADDER.bench.parts.map(x => x.slot).join(''));
  const setNum = async (k, v) => { for (let i = 0; i < 8; i++) if ((v >> i) & 1) await p.click(`#nine-${k}-bit-${i}`); };
  await setNum('a', 13); await setNum('b', 29);
  for (let i = 0; i < 6; i++) await wire(p, fa[i], 'Cout', fa[i + 1], 'Cin');   // leave out the bit 6 -> bit 7 carry
  const part = await ev(p, () => [+document.querySelector('#nine-result').dataset.sum, LADDER.done(9)]);
  const broken = await ev(p, () => { const b = LADDER.bench; const w = b.wires.find(w => w.a.pin === 'Cout' && b.part(w.a.p).slot === 2); b.removeWire(w.id); return [+document.querySelector('#nine-result').dataset.sum, LADDER.done(9)]; });
  await wire(p, fa[2], 'Cout', fa[3], 'Cin'); await wire(p, fa[6], 'Cout', fa[7], 'Cin'); await sleep(50);
  r = await ev(p, () => ({ a: +document.querySelector('#nine-a-value').dataset.value, b: +document.querySelector('#nine-b-value').dataset.value, sum: +document.querySelector('#nine-result').dataset.sum,
    lit: [...document.querySelectorAll('#nine-sum .bb.on')].map(e => e.dataset.bit).join(''), done: LADDER.done(9), succ: document.querySelector('#step-success').textContent }));
  await p.click('#nine-a-bit-7'); await p.click('#nine-b-bit-7'); await p.click('#nine-a-bit-0');   // 140 + 157 = 297 -> sum 41, carry out 1
  const ov = await ev(p, () => [+document.querySelector('#nine-result').dataset.sum, +document.querySelector('#nine-result').dataset.cout]);
  ok('Step 9: 8 full adders fill bit slots 0-7; a broken carry chain gives a wrong sum and does not complete; the full chain adds 13 + 29 = 42 (bulbs 32+8+2) and completes; 140 + 157 carries out (sum 41)',
    slots === '01234567' && !part[1] && broken[0] !== 42 && !broken[1] && r.a === 13 && r.b === 29 && r.sum === 42 && r.lit === '531' && r.done && r.succ === TXT.fill(MD.steps[9].success, { a: 13, b: 29, sum: 42 }) && ov[0] === (140 + 157) % 256 && ov[1] === 1,
    JSON.stringify({ slots, part, broken, r, ov }));
  await p.close();

  // ---------- 12b. Step 9: the #test-ripple message keeps the 13 + 29 = 42 reminder ----------
  p = await open('?unlock=all&step=9', { clear: true });
  { const fb = []; for (let i = 0; i < 8; i++) fb.push(await place(p, 'FULL'));
    const msg = () => ev(p, () => [...document.querySelectorAll('#tt-msg .tt-line')].map(e => e.textContent));
    await p.click('#test-ripple'); const m0 = await msg();
    for (let i = 0; i < 7; i++) await wire(p, fb[i], 'Cout', fb[i + 1], 'Cin');
    await p.click('#test-ripple'); const m1 = await msg(), d1 = await isDone(p, 9);
    for (const [k, v] of [['a', 13], ['b', 29]]) for (let i = 0; i < 8; i++) if ((v >> i) & 1) await p.click(`#nine-${k}-bit-${i}`);
    await p.click('#test-ripple'); const m2 = await msg();
    const U = await ev(p, () => LADDER.UI), goal = await ev(p, () => document.querySelector('#step-goal').textContent);
    ok('Step 9 message: no chain -> "Carry chain connected: ✗"; chain but A/B unset -> chain ✓ AND the 13 + 29 reminder; 13 + 29 -> chain ✓ and "13 + 29 = 42: ✓"; new Goal text filled',
      m0.length === 1 && m0[0] === 'Carry chain connected: ✗' && m1.length === 2 && m1[0] === 'Carry chain connected: ✓' && m1[1] === 'Now set A to 13 and B to 29: the sum should be 42.' && !d1 &&
      m2.length === 2 && m2[0] === 'Carry chain connected: ✓' && m2[1] === '13 + 29 = 42: ✓' && await isDone(p, 9) && goal === TXT.fill(MD.steps[9].goal, { a: 13, b: 29 }) && !/\{/.test(goal),
      JSON.stringify({ m0, m1, m2, goal })); }
  await p.close();

  // ---------- 12c. tooltips from docs/ladder-tooltips.json ----------
  { const TIPS = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/ladder-tooltips.json'), 'utf8')); delete TIPS._format;
    p = await open('?unlock=all&step=5', { clear: true });
    const pl = await place(p, 'pile'), lp = await place(p, 'lamp'), rl = await place(p, 'relay');
    await wire(p, pl, '+', lp, 'a'); await sleep(60);
    const t = await ev(p, (pl, lp, rl) => {
      const tt = id => { const e = document.getElementById(id); if (!e) return null; if (e instanceof SVGElement) { const c = e.querySelector(':scope > title'); return c ? c.textContent : null; } return e.getAttribute('title'); };
      const w = LADDER.bench.wires[0];
      return { stat: ['sound-toggle', 'motion-toggle', 'reset-progress', 'reset-confirm', 'step-nav-5', 'hints-toggle', 'tray-relay', 'tray-lamp', 'bench-delete', 'bench-clear', 'bench-stage'].map(i => [i, tt(i)]),
        dyn: [['part-' + rl, tt('part-' + rl)], ['term-' + pl + '-pos', tt('term-' + pl + '-pos')], ['term-' + pl + '-neg', tt('term-' + pl + '-neg')], ['term-' + rl + '-com', tt('term-' + rl + '-com')], ['wire-' + w.id, tt('wire-' + w.id)]],
        aria: document.getElementById('term-' + pl + '-pos').getAttribute('aria-label'), sel: LADDER.tipFor('term-' + pl + '-pos') };
    }, pl, lp, rl);
    const want = (id, key) => TIPS[key || '#' + id];
    const statOk = t.stat.every(([i, v]) => v === want(i));
    const dynOk = t.dyn[0][1] === TIPS['#part-*'] && t.dyn[1][1] === TIPS['#term-*-pos'] && t.dyn[2][1] === TIPS['#term-*-neg'] && t.dyn[3][1] === TIPS['#term-*-*'] && t.dyn[4][1] === TIPS['#wire-*'];
    await p.close();
    p = await open('?unlock=all&step=8', { clear: true });
    const t8 = await ev(p, () => ['part-inA', 'part-inB', 'part-outS', 'part-outC', 'adder-tab-full', 'test-half'].map(i => [i, document.getElementById(i) && document.getElementById(i).getAttribute('title')]));
    await ev(p, () => LADDER.go(1)); await sleep(80); await p.click('#tray-cell'); await p.waitForSelector('#pile-cell-1'); await sleep(80);
    const t1 = await ev(p, () => [document.querySelector('#tray-cell').title, document.querySelector('#pile-cell-1').title, document.querySelector('#bench').hasAttribute('title')]);
    await p.close();
    ok('tooltips: Joseph\'s text as title on static controls, parts, terminals (pattern specificity: -pos/-neg beat *-*), SVG <title> on wires; aria-labels kept',
      statOk && dynOk && t8.every(([i, v]) => v === TIPS['#' + i]) && t1[0] === TIPS['#tray-cell'] && t1[1] === TIPS['#pile-cell-*'] && !t1[2] && /\S/.test(t.aria || '') && t.sel === TIPS['#term-*-pos'],
      JSON.stringify({ stat: t.stat.filter(([i, v]) => v !== want(i)), dyn: t.dyn, t8, t1, aria: t.aria })); }

  // ---------- 13. unlock flow end to end + reset ----------
  p = await open('', { clear: true });
  await ev(p, () => { const S = LADDER.S; for (let n = 1; n <= 4; n++) S.done[n] = true; localStorage.setItem('adder-ladder-v1', JSON.stringify(S)); });
  await p.reload({ waitUntil: 'networkidle0' }); await p.waitForFunction('window.LADDER&&LADDER.ready');
  const before = await navState(p);
  await p.click('#reset-progress'); const dlgOpen = await ev(p, () => document.querySelector('#reset-dialog').open);
  await p.click('#reset-cancel'); const kept = await navState(p);
  await p.click('#reset-progress'); await p.click('#reset-confirm'); await sleep(50);
  r = await ev(p, () => ({ nav: [...document.querySelectorAll('#step-nav .rung')].map(r => r.classList.contains('locked') ? 'L' : 'U').join(''), step: LADDER.step, saved: JSON.parse(localStorage.getItem('adder-ladder-v1')) }));
  ok('unlock chain: steps 1-4 done -> 5 open, 6-9 locked; Reset asks first (Cancel keeps progress), Confirm clears it and keeps Step 1 unlocked',
    before === 'DDDDULLLL' && dlgOpen && kept === before && r.nav === 'ULLLLLLLL' && r.step === 1 && Object.keys(r.saved.done).length === 0, JSON.stringify({ before, kept, r: r.nav }));
  await p.close();

  // ---------- 14. drag and drop (mouse): tray -> bench, terminal -> terminal ----------
  p = await open('?unlock=all&step=2', { clear: true });
  const drag = async (from, to) => { await p.mouse.move(from.x, from.y); await p.mouse.down(); for (let k = 1; k <= 8; k++) { await p.mouse.move(from.x + (to.x - from.x) * k / 8, from.y + (to.y - from.y) * k / 8); await sleep(10); } await p.mouse.up(); await sleep(40); };
  const ctr = async s => ev(p, s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, s);
  const bb = await ev(p, () => { const r = document.querySelector('#bench').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  await drag(await ctr('#tray-pile'), { x: bb.l + bb.w * 0.2, y: bb.t + bb.h * 0.5 });
  await drag(await ctr('#tray-lamp'), { x: bb.l + bb.w * 0.7, y: bb.t + bb.h * 0.4 });
  const dp = await ev(p, () => LADDER.bench.parts.map(x => [x.kind, Math.round(x.x), Math.round(x.y)]));
  const [pp, ll] = [await ids(p, 'pile'), await ids(p, 'lamp')];
  await drag(await ctr(`#term-${pp[0]}-pos`), await ctr(`#term-${ll[0]}-a`)); await drag(await ctr(`#term-${ll[0]}-b`), await ctr(`#term-${pp[0]}-neg`));
  const dl = await ev(p, l => [LADDER.bench.wires.length, LADDER.bench.res.lamps[l].lit], ll[0]);
  // move a part by dragging it, then drag it back onto the tray to remove it
  const lampBox = await ctr('#part-' + ll[0]);
  await drag({ x: lampBox.x, y: lampBox.y - 30 }, { x: lampBox.x - 120, y: lampBox.y - 10 });
  const moved = await ev(p, l => LADDER.bench.part(l).x, ll[0]);
  await drag(await ctr('#part-' + ll[0]), await ctr('#tray-pile'));
  const gone = await ev(p, () => [LADDER.bench.parts.length, LADDER.bench.wires.length]);
  ok('mouse drag: tray parts drop where released; dragging screw to screw wires them (bulb lights); dragging a part moves it; dropping it on the tray removes it',
    dp.length === 2 && dp[0][0] === 'pile' && dp[1][1] > dp[0][1] && dl[0] === 2 && dl[1] && moved < dp[1][1] - 60 && gone[0] === 1 && gone[1] === 0, JSON.stringify({ dp, dl, moved, gone }));
  // the bench is saved per step
  await p.reload({ waitUntil: 'networkidle0' }); await p.waitForFunction('window.LADDER&&LADDER.ready');
  ok('bench layout is saved per step and restored on reload', await ev(p, () => LADDER.step === 2 && LADDER.bench.parts.length === 1 && LADDER.bench.parts[0].kind === 'pile'));
  await p.close();

  // ---------- 15. mobile (390x844, touch): tap-to-place, tap-to-wire, layout ----------
  p = await open('?unlock=all&step=2', { mobile: true, clear: true });
  const mp = await place(p, 'pile', true), ml = await place(p, 'lamp', true);
  await wire(p, mp, '+', ml, 'a', true); await wire(p, ml, 'b', mp, '-', true);
  const mob = await ev(p, l => ({ lit: LADDER.bench.res.lamps[l].lit, done: LADDER.done(2), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }), ml);
  const terms = await ev(p, () => [...document.querySelectorAll('.term')].map(t => Math.round(t.getBoundingClientRect().width)));
  ok('mobile: tap a tray part to place it, tap screw then screw to wire; bulb lights; no horizontal overflow; terminal hit areas >= 20px', mob.lit && mob.done && mob.sw <= mob.cw && Math.min(...terms) >= 20, JSON.stringify({ mob, minTerm: Math.min(...terms) }));
  const lay = [];
  for (const q of ['step=1', 'step=2', 'step=3', 'step=4', 'step=5', 'step=6&gate=AND', 'step=6&gate=XOR', 'step=7', 'step=8', 'step=8&adder=full', 'step=9']) {
    for (const mobile of [true, false]) {
      const pg = await open('?unlock=all&' + q, mobile ? { mobile: true } : {}); await sleep(80);
      lay.push(Object.assign({ q, mobile }, await ev(pg, () => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, noId: [...document.querySelectorAll('button,input,select,textarea,[role=button],[role=tab],summary,[tabindex]:not([tabindex="-1"])')].filter(e => !e.id && !e.closest('#bn-defs-holder')).map(e => e.className || e.tagName) }))));
      await pg.close();
    }
  }
  ok('no horizontal page overflow on any step at 390 (touch) and 1280', lay.every(x => x.sw <= x.cw), lay.filter(x => x.sw > x.cw).map(x => `${x.q}${x.mobile ? '@390' : '@1280'} ${x.sw}>${x.cw}`).join('; ') || lay.length + ' layouts');
  ok('every interactive control on every step has an id', lay.every(x => x.noId.length === 0), JSON.stringify(lay.filter(x => x.noId.length).map(x => [x.q, x.noId.slice(0, 4)])));
  await p.close();

  // ---------- 16. sound: off by default, toggle unlocks Michael's sfx, wiring plays the screw ----------
  p = await open('?unlock=all&step=2', { clear: true });
  const s0 = await ev(p, () => [!!SFX.enabled, document.querySelector('#sound-toggle').getAttribute('aria-pressed'), SFX.log.length]);
  await p.click('#sound-toggle'); await ev(p, () => new Promise(r => setTimeout(r, 600)));
  const sp = await place(p, 'pile'), sl = await place(p, 'lamp'); await wire(p, sp, '+', sl, 'a'); await wire(p, sl, 'b', sp, '-'); await sleep(200);
  const s1 = await ev(p, () => [!!SFX.enabled, document.querySelector('#sound-toggle').getAttribute('aria-pressed'), SFX.log.map(e => e.name)]);
  await p.click('#sound-toggle');
  const s2 = await ev(p, () => !!SFX.enabled);
  ok('sound is off by default; the Sound toggle enables it and wiring plays binding-post-screw, lamp tick and the step chime; toggling again mutes',
    !s0[0] && s0[1] === 'false' && s0[2] === 0 && s1[0] && s1[1] === 'true' && s1[2].includes('binding-post-screw') && s1[2].includes('lamp-warmup-tick') && s1[2].includes('bell-desk') && !s2, JSON.stringify({ s0, s1, s2 }));
  await p.close();

  // ---------- 17. reduced motion ----------
  p = await open('?unlock=all&step=3', { reduce: true, clear: true });
  const rp = await place(p, 'pile'), rl = await place(p, 'lamp'), rk = await place(p, 'knife');
  await wire(p, rp, '+', rk, 'a'); await wire(p, rk, 'b', rl, 'a'); await wire(p, rl, 'b', rp, '-'); await toggle(p, rk);
  r = await ev(p, ([k, l]) => ({ red: BENCH.reduce(), blade: getComputedStyle(document.querySelector('#part-' + k + ' .blade')).transitionDuration, lamp: getComputedStyle(document.querySelector('#part-' + l + ' svg')).transitionDuration,
    flow: getComputedStyle(document.querySelector('.cw.on .cw-flow')).animationName, lit: LADDER.bench.res.lamps[l].lit, anims: document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#bench') && /transform/.test(JSON.stringify(a.effect.getKeyframes()))).length }), [rk, rl]);
  ok('prefers-reduced-motion: no blade swing, no filament transition, no wire flow, no transform animations; circuit still works', r.red && r.blade === '0s' && r.lamp === '0s' && r.flow === 'none' && r.lit && r.anims === 0, JSON.stringify(r));
  await p.close();
  // calm-motion toggle (Henri's html.bn-reduce)
  p = await open('?unlock=all&step=3');
  await p.click('#motion-toggle'); r = await ev(p, () => [document.documentElement.classList.contains('bn-reduce'), BENCH.reduce()]); await p.click('#motion-toggle');
  ok('Calm motion toggle sets html.bn-reduce', r[0] && r[1]); await p.close();

  // ---------- 18. screenshots ----------
  const SH = path.join(ROOT, 'screenshots'); fs.mkdirSync(SH, { recursive: true });
  try { execFileSync('node', [path.join(__dirname, 'laddercapture.js')], { stdio: 'inherit', env: process.env }); ok('screenshots written to screenshots/', fs.readdirSync(SH).filter(f => f.endsWith('.png')).length >= 4); }
  catch (e) { ok('screenshots written to screenshots/', false, e.message); }

  ok('no JS errors / console errors in any ladder test', errs.length === 0, errs.slice(0, 5).join(' | '));
  await b.close();
  const lad = R.filter(x => x.pass).length + '/' + R.length;
  console.log(`\nladder: ${lad} passed\n\n--- classic simulator page (classic.html) ---`);
  let classic = 'not run';
  try { const out = execFileSync('node', [path.join(__dirname, 'classictest.js')], { env: process.env, encoding: 'utf8' }); process.stdout.write(out); classic = (out.match(/(\d+)\/(\d+) passed/) || [])[0] || '?'; ok('classic page tests all pass', /(\d+)\/\1 passed/.test(out), classic); }
  catch (e) { process.stdout.write(String(e.stdout || '')); ok('classic page tests all pass', false, e.message.slice(0, 200)); }
  fs.writeFileSync('/tmp/mothtest/adder-results.json', JSON.stringify(R, null, 1));
  console.log(`\n${R.filter(x => x.pass).length}/${R.length} passed (ladder ${lad}; classic ${classic})`);
  process.exitCode = R.every(x => x.pass) ? 0 : 1;
})();
