/* Phone / touch tests for the 9-step workbench ladder: scrolling, reachability, cancelled drags, Step 4 coil controls.
   Run: NODE_PATH=/tmp/mothtest/node_modules node tests/mobiletest.js   (page served on http://127.0.0.1:8770/, or B=<url>)
   Touch scrolling is driven with real CDP touch events (touchStart / touchMove / touchEnd), so CSS touch-action and the
   page's pointer handlers are exercised the way a finger would. */
const puppeteer = require('puppeteer-core'); const fs = require('fs'); const path = require('path');
const B = process.env.B || 'http://127.0.0.1:8770/', ROOT = path.join(__dirname, '..'), R = [];
const ok = (name, pass, info = '') => { R.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? ' — ' + info : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TXT = require(path.join(ROOT, 'js/ladder/text.js')); const MD = TXT.parse(fs.readFileSync(path.join(ROOT, 'docs/ladder-text.md'), 'utf8'));
const VP = {
  'iPhone SE 375x667': { width: 375, height: 667, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'iPhone 14 390x844': { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'Pixel 7 412x915': { width: 412, height: 915, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'landscape 844x390': { width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'desktop 1280x800': { width: 1280, height: 800 },
};
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const errs = [];
  async function open(vp, step) {
    const ctx = await b.createBrowserContext();   // fresh storage each time
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(step + ': ' + e.message));
    await p.setViewport(vp);
    await p.goto(B + '?unlock=all', { waitUntil: 'networkidle0' }); await p.waitForFunction('window.LADDER&&LADDER.ready');
    await p.evaluate(n => { LADDER.fast = true; LADDER.go(n); }, step); await sleep(150);
    p.cdp = await p.target().createCDPSession(); p.ctx = ctx;
    return p;
  }
  const close = p => p.ctx.close();
  const ev = (p, f, ...a) => p.evaluate(f, ...a);
  async function swipe(p, x, y, dy, end = 'touchEnd') {     // finger down at (x,y), moves dy (negative = page scrolls down)
    await p.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 10; i++) { await p.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + dy * i / 10 }] }); await sleep(16); }
    await p.cdp.send('Input.dispatchTouchEvent', { type: end, touchPoints: [] }); await sleep(350);
  }
  // a point in the viewport on plain bench wood (inside .bench-scene, not on a part, terminal, wire, drawer item or control)
  // (kept 16px clear of parts: their drop-shadow filter widens the area where they take the touch)
  const woodPoint = p => ev(p, () => {
    const W = innerWidth, H = innerHeight, near = [...document.querySelectorAll('.bn-part,.term')].map(e => e.getBoundingClientRect());
    const clear = (x, y) => !near.some(r => x > r.left - 16 && x < r.right + 16 && y > r.top - 16 && y < r.bottom + 16);
    for (let y = Math.round(H * 0.45); y < H - 10; y += 12) for (let x = 20; x < W - 20; x += 15) {
      const e = document.elementFromPoint(x, y);
      if (e && clear(x, y) && e.closest('.bench-scene') && !e.closest('.bn-part,.term,.cw,.tray-item,.bn-drawer,button,input,.magnet-tools')) return { x, y };
    }
    for (let y = 10; y < H * 0.45; y += 12) for (let x = 20; x < W - 20; x += 15) {
      const e = document.elementFromPoint(x, y);
      if (e && clear(x, y) && e.closest('.bench-scene') && !e.closest('.bn-part,.term,.cw,.tray-item,.bn-drawer,button,input,.magnet-tools')) return { x, y };
    }
    return null;
  });
  // a point to put a finger on: plain bench wood when the bench is on screen (the hard case), else any non-control point
  const fingerPoint = async p => (await woodPoint(p)) || ev(p, () => {
    for (let y = Math.round(innerHeight / 2); y < innerHeight - 10; y += 10) for (let x = 20; x < innerWidth - 20; x += 15) {
      const e = document.elementFromPoint(x, y); if (e && !e.closest('button,a,input,select,summary,.tray-item,.term,.bn-part,.ladder')) return { x, y };
    }
    return { x: 10, y: Math.round(innerHeight / 2) };
  });
  // swipe from pt towards whichever end of the page has room; returns the new scrollY
  async function panFrom(p, pt) {
    const { y, max } = await ev(p, () => ({ y: scrollY, max: document.documentElement.scrollHeight - innerHeight }));
    await swipe(p, pt.x, pt.y, max - y >= 100 ? -150 : 150);
    return ev(p, () => scrollY);
  }
  const atBottom = p => ev(p, () => scrollY + innerHeight >= document.documentElement.scrollHeight - 2);
  async function scrollToBottom(p, touch) {
    await ev(p, () => scrollTo(0, 0)); await sleep(60);
    for (let i = 0; i < 40 && !await atBottom(p); i++) {
      const y0 = await ev(p, () => scrollY);
      if (touch) { const pt = await fingerPoint(p); await swipe(p, pt.x, Math.min(pt.y, (await ev(p, () => innerHeight)) - 20), -Math.round((await ev(p, () => innerHeight)) * 0.5)); }
      else { await p.mouse.move(640, 400); await p.mouse.wheel({ deltaY: 300 }); await sleep(120); }
      if (await ev(p, () => scrollY) === y0) { await sleep(100); if (await ev(p, () => scrollY) === y0) return false; }
    }
    return atBottom(p);
  }
  // every visible interactive element lies inside the document's scroll area and is not clipped horizontally,
  // unless it sits in a horizontal scroller that really scrolls
  const unreachable = p => ev(p, () => {
    const bad = [], H = document.documentElement.scrollHeight, W = innerWidth;
    const els = document.querySelectorAll('button,a[href],input,select,textarea,summary,output,[tabindex]:not([tabindex="-1"]),.term,.tray-item');
    for (const e of els) {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (e.closest('details:not([open])') && !e.matches('summary')) continue;
      const name = e.id || e.className || e.tagName;
      if (r.top + scrollY < -1 || r.bottom + scrollY > H + 1) { bad.push(name + ' outside the scroll height'); continue; }
      let a = e.parentElement, inScroller = false;
      for (; a && a !== document.body; a = a.parentElement) {
        const s = getComputedStyle(a); if (!/(auto|scroll|hidden|clip)/.test(s.overflowX)) continue;
        const ar = a.getBoundingClientRect();
        if (/(auto|scroll)/.test(s.overflowX) && a.scrollWidth > a.clientWidth + 1) { inScroller = true; break; }
        const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
        if (cx < ar.left - 1 || cx > ar.right + 1 || cy < ar.top - 1 || cy > ar.bottom + 1) { bad.push(name + ' clipped by ' + (a.id || a.className)); break; }
      }
      if (!inScroller && (r.left < -1 || r.right > W + 1)) bad.push(name + ' off-screen horizontally');
    }
    if (document.documentElement.scrollWidth > innerWidth + 1) bad.push('page scrolls sideways');
    return [...new Set(bad)];
  });

  // ---------- 1. every viewport x steps 1-9: scroll to the bottom, bench wood pans the page, everything reachable ----------
  for (const [vn, vp] of Object.entries(process.env.QUICK ? {} : VP)) {   // QUICK=1 skips this sweep while debugging
    for (let n = 1; n <= 9; n++) {
      const p = await open(vp, n), touch = !!vp.hasTouch;
      const bottom = await scrollToBottom(p, touch);
      ok(`${vn} step ${n}: document scrolls to the bottom${touch ? ' by touch' : ''}`, bottom, `scrollY ${await ev(p, () => Math.round(scrollY))} of ${await ev(p, () => document.documentElement.scrollHeight - innerHeight)}`);
      if (touch && await ev(p, () => !!document.querySelector('.bench-scene'))) {
        await ev(p, () => { const s = document.querySelector('.bench-scene'); scrollTo(0, s.getBoundingClientRect().top + scrollY - 40); }); await sleep(80);
        const pt = await woodPoint(p), y0 = await ev(p, () => scrollY), y1 = pt ? await panFrom(p, pt) : y0;
        ok(`${vn} step ${n}: a finger on empty bench wood scrolls the page`, pt && Math.abs(y1 - y0) >= 50, pt ? `scrollY ${Math.round(y0)} -> ${Math.round(y1)}` : 'no bench wood found');
      }
      const bad = await unreachable(p);
      ok(`${vn} step ${n}: every control inside the scroll area, none clipped`, !bad.length, bad.slice(0, 6).join('; '));
      await close(p);
    }
  }

  // ---------- 2. a cancelled drag, and drags that end off target, leave scrolling working ----------
  for (const vn of ['iPhone SE 375x667', 'iPhone 14 390x844']) {
    const p = await open(VP[vn], 5);
    if (!await ev(p, () => LADDER.bench.parts.length)) { await p.tap('#tray-pile'); await sleep(100); await p.tap('#tray-relay'); await sleep(100); }
    await ev(p, () => { const s = document.querySelector('.bench-scene'); scrollTo(0, s.getBoundingClientRect().top + scrollY - 20); }); await sleep(80);
    const part = await ev(p, () => { const q = LADDER.bench.parts.find(x => x.kind === 'pile') || LADDER.bench.parts[0]; const r = document.querySelector('#part-' + q.id).getBoundingClientRect();
      return { id: q.id, x: q.x, y: q.y, cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + 30), n: LADDER.bench.parts.length, sel: JSON.stringify(LADDER.bench.sel) }; });
    await swipe(p, part.cx, part.cy, 60, 'touchCancel');
    let st = await ev(p, id => { const q = LADDER.bench.parts.find(x => x.id === id); return { here: !!q, x: q && q.x, y: q && q.y, n: LADDER.bench.parts.length, dragging: !!document.querySelector('.dragging'), ghost: !!document.querySelector('.tray-ghost'), sel: LADDER.bench.sel }; }, part.id);
    ok(`${vn}: a cancelled part drag leaves the part where it was, no tap, nothing stuck`, st.here && st.n === part.n && Math.abs(st.x - part.x) < 1 && Math.abs(st.y - part.y) < 1 && !st.dragging && !st.ghost && JSON.stringify(st.sel) === part.sel, JSON.stringify(st));
    let pt = await woodPoint(p), y0 = await ev(p, () => scrollY);
    ok(`${vn}: page still scrolls after the cancelled drag`, pt && Math.abs(await panFrom(p, pt) - y0) >= 50);
    // drag a drawer part and let go over the goal card (off target): nothing placed, no ghost, scrolling fine
    await ev(p, () => { const d = document.querySelector('.tray-item:not(:disabled)'); d.scrollIntoView({ block: 'end' }); }); await sleep(100);
    const t = await ev(p, () => { const d = document.querySelector('.tray-item:not(:disabled)'), r = d.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), n: LADDER.bench.parts.length }; });
    await p.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: t.x, y: t.y }] });
    for (let i = 1; i <= 8; i++) { await p.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: t.x + 70 * i / 8, y: t.y + 2 }] }); await sleep(16); }
    await p.cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await sleep(300);
    st = await ev(p, () => ({ n: LADDER.bench.parts.length, ghost: !!document.querySelector('.tray-ghost'), hot: !!document.querySelector('.drop-hot') }));
    ok(`${vn}: a cancelled drawer drag places nothing and leaves no ghost`, st.n === t.n && !st.ghost && !st.hot, JSON.stringify(st));
    // drag a part off the top of the bench and let go there (off target): it stays on the bench, scrolling fine
    await ev(p, () => { const s = document.querySelector('.bench-scene'); scrollTo(0, s.getBoundingClientRect().top + scrollY - 120); }); await sleep(80);
    const q2 = await ev(p, id => { const r = document.querySelector('#part-' + id).getBoundingClientRect(); return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + 30), n: LADDER.bench.parts.length }; }, part.id);
    await p.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q2.cx, y: q2.cy }] });
    for (let i = 1; i <= 10; i++) { await p.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: q2.cx, y: Math.max(5, q2.cy - 200 * i / 10) }] }); await sleep(16); }
    await p.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300);
    st = await ev(p, id => ({ here: LADDER.bench.parts.some(x => x.id === id), n: LADDER.bench.parts.length, dragging: !!document.querySelector('.dragging') }), part.id);
    ok(`${vn}: a part dropped off the bench stays on the bench, nothing stuck`, st.here && st.n === q2.n && !st.dragging, JSON.stringify(st));
    await ev(p, () => { const s = document.querySelector('.bench-scene'); scrollTo(0, s.getBoundingClientRect().top + scrollY - 20); }); await sleep(80);
    pt = await woodPoint(p); y0 = await ev(p, () => scrollY);
    ok(`${vn}: page still scrolls after the off-target drags`, pt && Math.abs(await panFrom(p, pt) - y0) >= 50);
    ok(`${vn}: the page has no scroll lock`, await ev(p, () => [document.documentElement, document.body].every(e => { const s = getComputedStyle(e); return s.overflowY !== 'hidden' && s.position !== 'fixed' && s.touchAction !== 'none'; })));
    await close(p);
  }

  // ---------- 3. changing step or sub-tab on a phone does not throw the page down to the step strip ----------
  for (const vn of ['iPhone 14 390x844', 'iPhone SE 375x667']) {
    const p = await open(VP[vn], 6);
    await ev(p, () => scrollTo(0, document.querySelector('#gate-tab-and').getBoundingClientRect().top + scrollY - 20)); await sleep(80);
    const y0 = await ev(p, () => scrollY);
    await p.tap('#gate-tab-and'); await sleep(300);
    let y = await ev(p, () => scrollY);
    ok(`${vn}: tapping a Step 6 gate tab keeps the page where it was`, Math.abs(y - y0) < 40, `scrollY ${Math.round(y0)} -> ${Math.round(y)}`);
    const r = await ev(p, () => { const ol = document.querySelector('#step-nav'), c = document.querySelector('#step-nav .current').getBoundingClientRect(), a = ol.getBoundingClientRect(); return c.left >= a.left - 1 && c.right <= a.right + 1; });
    ok(`${vn}: the current step is scrolled into view in the step strip`, r);
    await close(p);
  }

  // ---------- 4. Step 4: the coil controls are in view and work once the magnet is placed ----------
  const H4 = MD.steps[4].hints;
  for (const vn of ['iPhone SE 375x667', 'iPhone 14 390x844', 'desktop 1280x800']) {
    const vp = VP[vn], touch = !!vp.hasTouch, p = await open(vp, 4);
    // put an element on screen above the docked coil controls (a person scrolls a little to see what the dock covers)
    const reveal = s => ev(p, s => { const e = document.querySelector(s), r = e.getBoundingClientRect(), t = document.querySelector('#magnet-tools');
      const dock = t && getComputedStyle(t).position === 'sticky' ? t.getBoundingClientRect().height : 0;
      if (r.top < 0 || r.bottom > innerHeight - dock - 8) scrollBy(0, r.bottom - (innerHeight - dock - 12)); }, s);
    const act = async s => { await reveal(s); await sleep(30); return touch ? p.tap(s) : p.click(s); };
    await ev(p, () => LADDER.bench.clear && LADDER.bench.clear()); await sleep(60);
    const before = await ev(p, () => ['#magnet-turns-less', '#magnet-turns-more', '#magnet-wire-insulated'].map(s => document.querySelector(s).disabled));
    ok(`${vn} step 4: coil controls disabled before the magnet is placed`, before.every(Boolean), JSON.stringify(before));
    const ids0 = await ev(p, () => LADDER.bench.parts.map(x => x.id));
    await act('#tray-magnet'); await sleep(250);
    const mag = await ev(p, b => LADDER.bench.parts.find(x => x.kind === 'magnet' && !b.includes(x.id)), ids0);
    const view = await ev(p, () => ['#magnet-tools', '#magnet-turns-less', '#magnet-turns', '#magnet-turns-more', '#magnet-wire-insulated'].map(s => {
      const e = document.querySelector(s), r = e.getBoundingClientRect(), hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      return { s, dis: !!e.disabled, inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, onTop: !!hit && (hit === e || e.contains(hit) || hit.contains(e)) }; }));
    ok(`${vn} step 4: after placing the magnet its controls are enabled and on screen`, mag && view.every(v => !v.dis && v.inView && v.onTop), JSON.stringify(view.filter(v => v.dis || !v.inView || !v.onTop)));
    await sleep(600);   // let a smooth scroll finish
    const both = await ev(p, id => { const a = document.querySelector('#part-' + id).getBoundingClientRect(), t = document.querySelector('#magnet-tools').getBoundingClientRect();
      return a.top >= 0 && a.bottom <= t.top + 1 && t.bottom <= innerHeight + 1; }, mag && mag.id);
    ok(`${vn} step 4: the new magnet and its controls are on screen together`, both);
    const hint = await ev(p, () => { const h = document.querySelector('#magnet-hint'); return h ? h.textContent : null; });
    ok(`${vn} step 4: a hint by the controls uses Joseph's wording`, hint === H4[0], JSON.stringify(hint));
    const attn = await ev(p, () => document.querySelector('#magnet-tools').classList.contains('attn'));
    ok(`${vn} step 4: the controls are highlighted when the magnet arrives`, attn);
    // wire the magnet to a pile, insulate it, then More turns must make it stronger
    let pile = await ev(p, () => (LADDER.bench.parts.find(x => x.kind === 'pile') || {}).id);
    if (!pile) { const ids1 = await ev(p, () => LADDER.bench.parts.map(x => x.id)); await act('#tray-pile'); await sleep(150); pile = await ev(p, b => LADDER.bench.parts.find(x => x.kind === 'pile' && !b.includes(x.id)).id, ids1); }
    for (const [a, c] of [[`#term-${pile}-pos`, `#term-${mag.id}-a`], [`#term-${mag.id}-b`, `#term-${pile}-neg`]]) { await act(a); await sleep(30); await act(c); await sleep(60); }
    if (!await ev(p, id => LADDER.bench.parts.find(x => x.id === id).insulated, mag.id)) { await act('#magnet-wire-insulated'); await sleep(120); }
    const pull = () => ev(p, id => { const m = LADDER.bench.res && LADDER.bench.res.magnets[id]; return m ? m.pull : 0; }, mag.id);
    const t0 = await ev(p, id => LADDER.bench.parts.find(x => x.id === id).turns, mag.id), s0 = await pull();
    const more = await ev(p, () => { const r = document.querySelector('#magnet-turns-more').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    await act('#magnet-turns-more'); await sleep(200);
    const t1 = await ev(p, id => LADDER.bench.parts.find(x => x.id === id).turns, mag.id), s1 = await pull();
    ok(`${vn} step 4: More turns (still on screen after wiring) adds turns and makes the magnet stronger`, more && t1 > t0 && s0 > 0 && s1 > s0, `turns ${t0}->${t1}, pull ${s0 && s0.toFixed(2)}->${s1 && s1.toFixed(2)}`);
    await close(p);
  }
  // reduced motion: the highlight does not animate
  {
    const ctx = await b.createBrowserContext(), p = await ctx.newPage(); p.ctx = ctx;
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.setViewport(VP['iPhone 14 390x844']);
    await p.goto(B + '?unlock=all', { waitUntil: 'networkidle0' }); await p.waitForFunction('window.LADDER&&LADDER.ready');
    await ev(p, () => { LADDER.fast = true; LADDER.go(4); LADDER.bench.clear && LADDER.bench.clear(); }); await sleep(100);
    await p.tap('#tray-magnet'); await sleep(150);
    const r = await ev(p, () => { const t = document.querySelector('#magnet-tools'), s = getComputedStyle(t); return { attn: t.classList.contains('attn'), anim: s.animationName, ring: s.boxShadow }; });
    ok('step 4 with reduced motion: the controls are marked without animation', r.attn && r.anim === 'none' && /\d/.test(r.ring), JSON.stringify(r));
    await ctx.close();
  }

  ok('no page errors', !errs.length, errs.slice(0, 5).join(' | '));
  await b.close();
  const f = R.filter(r => !r.pass).length;
  console.log(`\n${R.length - f}/${R.length} passed`);
  process.exit(f ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
