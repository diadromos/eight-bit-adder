/* sfx.js: OPTIONAL quiet workbench sounds for the 8-bit adder (Michael; see SOUND-NOTES.md). Not loaded by any page yet.
   Load after js/app.js:  <script src="design/sounds/sfx.js"></script>
   API (window.SFX):
     SFX.setEnabled(bool)        call from the mute toggle's click: the first enabling click creates/resumes the AudioContext
                                 (autoplay policy) and preloads all clips. Sound is OFF by default.
     SFX.play(name, {vol, delay}) one-shot by file name or group: 'relay-engage', 'relay-release' (round-robin a/b),
                                 'knife-switch-close', 'knife-switch-open', 'spark-crackle', 'magnet-snap',
                                 'binding-post-screw', 'lamp-warmup-tick', 'bell-desk', 'bell-brass', 'chime' (= bell-desk)
     SFX.hum(bool)               start/stop the seamless filament-hum loop (fades 120 ms)
     SFX.autoHook(rootEl)        optional: listens to the page's own class changes (no app.js edits needed):
                                   [data-energ] .energized on/off  -> relay-engage / relay-release
                                   .part-switch .closed on/off     -> knife-switch-close (+ spark) / knife-switch-open
                                   [data-lamp] .on                 -> lamp-warmup-tick, and the hum while any visible lamp is lit
                                 Elements drawn in the last 250 ms are ignored, so stage switches and redraws stay silent.
     SFX.log                     last 50 played events (name, at ms, gain) for tests. */
(function () {
  'use strict';
  const BASE = (document.currentScript && document.currentScript.src.replace(/[^/]*$/, '')) || 'design/sounds/';
  const FILES = ['relay-engage-a', 'relay-engage-b', 'relay-release-a', 'relay-release-b', 'knife-switch-close', 'knife-switch-open',
    'spark-crackle', 'magnet-snap', 'binding-post-screw', 'lamp-warmup-tick', 'filament-hum-loop', 'bell-desk', 'bell-brass'];
  // default gains (0-1), loudness-matched and deliberately quiet: one-shots land around -32..-40 LUFS, chime ~-30
  const VOL = { 'relay-engage': .25, 'relay-release': .18, 'knife-switch-close': .35, 'knife-switch-open': .3, 'spark-crackle': .3,
    'magnet-snap': .3, 'binding-post-screw': .3, 'lamp-warmup-tick': .2, 'filament-hum-loop': .03, 'bell-desk': .18, 'bell-brass': .18 };
  const GROUPS = { 'relay-engage': ['relay-engage-a', 'relay-engage-b'], 'relay-release': ['relay-release-a', 'relay-release-b'], chime: ['bell-desk'] };
  const VARY = { pitch: .05, gain: .12 };   // +-2.5 % pitch, 0..-1.1 dB per hit (bells and hum: none)
  const MAX_PER_40MS = 3;                   // many relays switching at once: at most 3 clicks per 40 ms, staggered 9 ms
  let ctx = null, master = null, loading = null, on = false, humSrc = null, humGain = null, humWanted = false;
  const bufs = {}, rr = {}, recent = [];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;   // sounds still play; only motion is reduced
  const ext = () => (new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'mp3');
  function load() {
    if (loading) return loading;
    const e = ext();
    loading = Promise.all(FILES.map(n => fetch(BASE + n + '.' + e).then(r => r.arrayBuffer())
      .then(a => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej))).then(b => { bufs[n] = b; })
      .catch(err => console.warn('sfx: could not load', n, err))));
    return loading;
  }
  function unlock() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
    }
    if (ctx.state !== 'running') ctx.resume();
    return load().then(() => { if (humWanted) startHum(); });
  }
  const groupOf = n => Object.keys(GROUPS).find(g => GROUPS[g].includes(n)) || n;
  function play(name, opt = {}) {
    if (!on || !ctx || ctx.state !== 'running' || document.hidden) return;
    let file = name;
    if (GROUPS[name]) { rr[name] = (rr[name] || 0) + 1; file = GROUPS[name][rr[name] % GROUPS[name].length]; }
    const b = bufs[file]; if (!b) return;
    const now = ctx.currentTime;
    while (recent.length && now - recent[0] > .04) recent.shift();
    const isClick = /relay/.test(file);
    if (isClick && recent.length >= MAX_PER_40MS) return;
    const extra = isClick ? recent.length * .009 : 0;
    if (isClick) recent.push(now);
    const s = ctx.createBufferSource(), g = ctx.createGain(), vary = !/bell|hum/.test(file);
    s.buffer = b;
    s.playbackRate.value = vary ? 1 + (Math.random() - .5) * VARY.pitch : 1;
    const gain = (opt.vol != null ? opt.vol : VOL[groupOf(file)] != null ? VOL[groupOf(file)] : .25) * (vary ? 1 - Math.random() * VARY.gain : 1);
    g.gain.value = gain; s.connect(g); g.connect(master);
    s.start(now + (opt.delay || 0) / 1000 + extra);
    SFX.log.push({ name: file, at: Math.round(performance.now()), gain: +gain.toFixed(3) }); if (SFX.log.length > 50) SFX.log.shift();
  }
  // seamless hum: the file is 1.25 s of a signal that repeats exactly every 1.000 s, so the 0.1-1.1 s window loops
  // without a seam even if the decoder adds encoder delay/padding at the ends.
  function startHum() {
    if (humSrc || !on || !ctx || ctx.state !== 'running' || !bufs['filament-hum-loop']) return;
    humSrc = ctx.createBufferSource(); humGain = ctx.createGain();
    humSrc.buffer = bufs['filament-hum-loop']; humSrc.loop = true; humSrc.loopStart = .1; humSrc.loopEnd = 1.1;
    humGain.gain.setValueAtTime(0, ctx.currentTime); humGain.gain.linearRampToValueAtTime(VOL['filament-hum-loop'], ctx.currentTime + .12);
    humSrc.connect(humGain); humGain.connect(master); humSrc.start(ctx.currentTime, .1);
  }
  function stopHum() {
    if (!humSrc) return;
    const s = humSrc, g = humGain, t = ctx.currentTime; humSrc = humGain = null;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + .12); s.stop(t + .13);
  }
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { stopHum(); ctx.suspend(); } else if (on) ctx.resume().then(() => { if (humWanted) startHum(); });
  });

  function autoHook(root) {
    root = root || document.body;
    let drawnAt = 0;
    const seen = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility === 'visible' && !el.closest('[hidden]');  // hidden layers stay silent
    const has = (old, c) => (' ' + (old || '') + ' ').includes(' ' + c + ' ');
    const updateHum = () => {
      const lit = [...root.querySelectorAll('[data-lamp].on')].some(seen);
      SFX.hum(lit);
    };
    new MutationObserver(list => {
      let lamp = false;
      for (const m of list) {
        if (m.type === 'childList') { if ([...m.addedNodes].some(n => n.nodeType === 1)) drawnAt = performance.now(); continue; }   // text updates don't count
        const el = m.target, now = el.classList, was = m.oldValue;
        if (el.matches('[data-lamp]')) lamp = true;
        if (performance.now() - drawnAt < 250 || !seen(el)) continue;   // fresh drawing (stage switch, expand/package) or not visible: stay quiet
        if (el.matches('[data-energ]') && now.contains('energized') !== has(was, 'energized'))
          play(now.contains('energized') ? 'relay-engage' : 'relay-release', { delay: 30 });   // lever spring reaches contact ~60 ms; 30 ms feels tight
        if (el.matches('.part-switch, [data-sw]') && now.contains('closed') !== has(was, 'closed')) {
          if (now.contains('closed')) { play('knife-switch-close', { delay: 40 }); play('spark-crackle', { delay: 60 }); }
          else play('knife-switch-open');
        }
        if (el.matches('[data-lamp]') && now.contains('on') && !has(was, 'on')) play('lamp-warmup-tick', { delay: 20 });
      }
      if (lamp || list.some(m => m.attributeName === 'class' && m.target.classList.contains('lv-layer')) || list.some(m => (m.type === 'childList' && [...m.addedNodes, ...m.removedNodes].some(n => n.nodeType === 1)) || m.attributeName === 'hidden')) updateHum();
    }).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden'], attributeOldValue: true });
    updateHum();
  }

  window.SFX = {
    log: [], volumes: VOL,
    get enabled() { return on; },
    setEnabled(v) {
      on = !!v; try { localStorage.setItem('adder-sfx', on ? '1' : '0'); } catch (e) {}
      if (on) return unlock();
      stopHum(); if (ctx) ctx.suspend(); return Promise.resolve();
    },
    play,
    hum(v) { humWanted = !!v; if (humWanted) startHum(); else stopHum(); },
    autoHook
  };
})();
