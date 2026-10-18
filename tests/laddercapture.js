/* Screenshots of the ladder for review: screenshots/*.png (desktop 1280 and phone 390). */
const puppeteer = require('puppeteer-core'); const path = require('path');
const B = 'http://127.0.0.1:8770/', O = path.join(__dirname, '..', 'screenshots') + '/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  async function open(q, mobile) {
    const p = await b.newPage(); await p.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1280, height: 900 });
    await p.goto(B + q, { waitUntil: 'networkidle0' }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle0' });
    await p.waitForFunction('window.LADDER&&LADDER.ready'); await p.evaluate(() => { LADDER.fast = true; }); return p;
  }
  // a lit relay circuit (Step 5, normally open relay, switch closed) built through the page's own bench API
  async function relayScene(p) {
    await p.evaluate(async () => {
      const b = LADDER.bench, P = k => b.place(k), sl = ms => new Promise(r => setTimeout(r, ms));
      const p1 = P('pile'), k = P('knife'), r = P('relay'), p2 = P('pile'), l = P('lamp');
      const mob = b.W < 600, at = (q, x, y) => { q.x = x; q.y = y; b.clamp(q); b.posPart(q); b.movePartTerms(q); };
      if (mob) { at(p1, 20, 20); at(k, 150, 40); at(r, 150, 250); at(p2, 30, 470); at(l, 330, 440); } else { at(p1, 40, 60); at(k, 200, 80); at(r, 420, 260); at(p2, 120, 330); at(l, 760, 110); }
      const c = (a, ap, z, zp) => b.connect({ p: a.id, pin: ap }, { p: z.id, pin: zp });
      c(p1, '+', k, 'a'); c(k, 'b', r, 'c1'); c(r, 'c2', p1, '-'); c(p2, '+', r, 'com'); c(r, 'no', l, 'a'); c(l, 'b', p2, '-');
      b.select(null); b.toggle(k.id); await sl(1200);
    });
  }
  let p = await open('?unlock=all&step=5'); await relayScene(p); await p.screenshot({ path: O + 'ladder-step5-relay-1280.png', fullPage: true }); await p.close();
  p = await open('?unlock=all&step=5', true); await relayScene(p); await p.screenshot({ path: O + 'ladder-step5-relay-390.png', fullPage: true }); await p.close();
  p = await open('?step=1'); for (let i = 0; i < 3; i++) await p.click('#tray-cell'); await sleep(900); await p.screenshot({ path: O + 'ladder-step1-pile-1280.png', fullPage: true }); await p.close();
  // Step 9 with 13 + 29 wired up
  async function nine(p) {
    await p.evaluate(async () => { const b = LADDER.bench; const fa = []; for (let i = 0; i < 8; i++) fa.push(b.place('FULL'));
      for (let i = 0; i < 7; i++) b.connect({ p: fa[i].id, pin: 'Cout' }, { p: fa[i + 1].id, pin: 'Cin' }); b.select(null);
      for (const [k, v] of [['a', 13], ['b', 29]]) for (let i = 0; i < 8; i++) if ((v >> i) & 1) document.querySelector(`#nine-${k}-bit-${i}`).click();
      await new Promise(r => setTimeout(r, 1400)); });
  }
  p = await open('?unlock=all&step=9'); await nine(p); await p.screenshot({ path: O + 'ladder-step9-ripple-1280.png', fullPage: true }); await p.close();
  p = await open('?unlock=all&step=9', true); await nine(p); await p.screenshot({ path: O + 'ladder-step9-ripple-390.png', fullPage: true }); await p.close();
  p = await open('?unlock=all&step=6&gate=XOR'); await p.evaluate(async () => { const b = LADDER.bench; const o = b.place('OR'), a = b.place('AND'), n = b.place('NOT'), a2 = b.place('AND');
    const c = (x, xp, y, yp) => b.connect({ p: x, pin: xp }, { p: y, pin: yp });
    const mv = (q, x, y) => { q.x = x; q.y = y; b.clamp(q); b.posPart(q); b.movePartTerms(q); };
    mv(o, 300, 60); mv(a, 300, 300); mv(n, 520, 320); mv(a2, 600, 120); b.drawWires();
    c('inA', 'out', o.id, 'A'); c('inB', 'out', o.id, 'B'); c('inA', 'out', a.id, 'A'); c('inB', 'out', a.id, 'B'); c(a.id, 'out', n.id, 'A'); c(o.id, 'out', a2.id, 'A'); c(n.id, 'out', a2.id, 'B'); c(a2.id, 'out', 'out', 'in');
    b.select(null); b.toggle('inA'); document.querySelector('#test-xor').click(); await new Promise(r => setTimeout(r, 900)); });
  await p.screenshot({ path: O + 'ladder-step6-xor-1280.png', fullPage: true }); await p.close();
  await b.close(); console.log('screenshots done');
})();
