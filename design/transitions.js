/* design/transitions.js — FLIP morphs for Expand / Package (TRANSITIONS.md), Web Animations API only.
   Classic script: sets window.morphExpand, window.morphCollapse, window.morphSwap (also window.TRANSITIONS).
   Reduced-motion safe: with prefers-reduced-motion: reduce everything becomes a 150 ms cross-fade (or instant).
   Animates only transform, opacity, filter and stroke-dashoffset (plus the container's height so the page below
   doesn't jump; set opts.height=false to skip that).

   ── The one Ken needs for stages 2-4 (content is re-rendered with innerHTML) ──
   morphSwap(container, render, opts) -> Promise
       container : the element whose content changes, e.g. $('#draw-half')
       render    : () => { container.innerHTML = ... }   (called synchronously, after the "First" snapshot)
       opts.dir  : 'expand' (module -> insides)  |  'collapse' (insides -> module)        default 'expand'
       opts.match: attribute that pairs old and new pieces, default 'data-bit' (8-bit chain card i <-> gate cell i)
       opts.duration: base duration, default 300 (whole morph ~ 520-620 ms)
     Replaces swapAnim():  if (animate) morphSwap(el, () => { el.innerHTML = html; }, { dir }); else el.innerHTML = html;
     Call render() for the new state (app.js render()) right after; class toggles on the new DOM are fine mid-morph.

   ── Two elements that are both in the DOM (e.g. stage-1 stacked layers) ──
   morphCollapse(fromEl, toEl, opts) / morphExpand(fromEl, toEl, opts) -> Promise
       fromEl is the visible view, toEl the one to show (must already be laid out: visibility:hidden is fine,
       display:none is not). The caller swaps visibility in opts.onSwap (called once, at the start) and does the
       final resting state when the promise resolves.

   What happens (TRANSITIONS.md timeline, condensed for content swaps):
     collapse: old insides shrink + blur + fade toward the module box (in, 0-280) / module box grows from the
               old insides' rect (spring, 120-380) / pins slide out of the box edges, 40 ms stagger (out) /
               title icon fades in (hand-off).
     expand  : the module ghost grows toward the new insides and fades (in) / insides scale in from the module's
               rect (out) / wires draw in from their sources (stroke-dashoffset, 60 ms stagger by column).
     matched pieces (opts.match): each old piece flies to its new partner (translate + scale, inout), e.g. the
               8 chain cards land on the 8 gate-level cells and back.
*/
(function (root) {
  'use strict';
  const EASE = { out: 'cubic-bezier(.2,.8,.2,1)', in: 'cubic-bezier(.4,0,1,1)', inout: 'cubic-bezier(.65,0,.35,1)', spring: 'cubic-bezier(.3,1.35,.6,1)' };
  const reduce = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const canAnimate = () => typeof Element !== 'undefined' && !!Element.prototype.animate;
  const R = el => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width || 1, h: b.height || 1, cx: b.left + b.width / 2, cy: b.top + b.height / 2 }; };
  const flip = (a, b) => `translate(${a.cx - b.cx}px,${a.cy - b.cy}px) scale(${a.w / b.w},${a.h / b.h})`;       // put b where a is
  const flipU = (a, b) => { const s = Math.min(a.w / b.w, a.h / b.h); return `translate(${a.cx - b.cx}px,${a.cy - b.cy}px) scale(${s})`; }; // uniform
  const done = anims => Promise.all(anims.map(a => a && a.finished.catch(() => {})));
  let live = [];                                    // running morph, cancelled if a new one starts
  let ghosts = [];                                  // every snapshot element of the running morph
  const clearGhosts = () => { ghosts.forEach(g => g.remove()); ghosts = []; };
  function cancelLive() { live.forEach(f => { try { f(); } catch (e) {} }); live = []; clearGhosts(); }

  // an absolutely positioned (document coordinates) snapshot of el (keeps computed look via the same classes; svgs are cloned as-is)
  function ghost(el, r) {
    const g = el.cloneNode(true);
    g.removeAttribute('id'); g.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    g.classList.add('morph-ghost'); g.setAttribute('aria-hidden', 'true');
    Object.assign(g.style, { left: (r.x + root.scrollX) + 'px', top: (r.y + root.scrollY) + 'px', width: r.w + 'px', height: r.h + 'px', boxSizing: 'border-box' });
    document.body.appendChild(g);
    live.push(() => g.remove());
    ghosts.push(g);
    return g;
  }
  function fade(el, from, to, ms) { return el.animate([{ opacity: from }, { opacity: to }], { duration: ms, easing: 'linear', fill: 'both' }); }

  // the box we morph to/from: the .module card if there is one, else the content itself
  const focusOf = c => c.querySelector('.module') || (c.children.length === 1 ? c.firstElementChild : null) || c.querySelector(':scope > svg') || c.firstElementChild || c;

  function wiresIn(scope, delay) {
    const paths = [...scope.querySelectorAll('svg .wire, svg .carry')].slice(0, 260);
    if (!paths.length) return [];
    const xs = paths.map(p => { try { return p.getBBox().x; } catch (e) { return 0; } });
    const minX = Math.min(...xs), maxX = Math.max(...xs) || 1;
    // later (right) columns start later; for right-to-left drawings pass data-flow-dir="rtl" on the svg
    const rtl = scope.querySelector('svg[data-flow-dir=rtl], svg.ripple-gates');
    return paths.map((p, i) => {
      let L = 0; try { L = p.getTotalLength(); } catch (e) {}
      if (!L) return null;
      const k = (xs[i] - minX) / (maxX - minX || 1), col = rtl ? 1 - k : k;
      return p.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }],
        { delay: delay + Math.round(col * 4) * 60, duration: 220, easing: EASE.out, fill: 'backwards' });
    }).filter(Boolean);
  }
  function pinsOut(scope, delay) {
    return [...scope.querySelectorAll('.mpin')].map((p, i) => p.animate(
      [{ opacity: 0, transform: `translateX(${p.closest('.out') ? -14 : 14}px)` }, { opacity: 1, transform: 'none' }],
      { delay: delay + i * 40, duration: 140, easing: EASE.out, fill: 'backwards' }));
  }
  function iconIn(scope, delay) {
    const ic = scope.querySelector('.micon');
    return ic ? [ic.animate([{ opacity: 0 }, { opacity: 1 }], { delay, duration: 90, fill: 'backwards' })] : [];
  }

  // matched pieces: old[match=k] flies to new[match=k]
  function matched(oldRoot, newRoot, attr, oldRects, dir, D) {
    const anims = [];
    if (!attr) return anims;
    const best = new Map();                          // per key, the biggest new element (cell card, not a minimap chip)
    newRoot.querySelectorAll(`[${attr}]`).forEach(n => { const k = n.getAttribute(attr), r = R(n), b = best.get(k);
      if (!b || r.w * r.h > b.r.w * b.r.h) best.set(k, { n, r }); });
    best.forEach(({ n }) => {
      const k = n.getAttribute(attr), o = oldRects.get(k);
      if (!o || n.closest('.morph-ghost')) return;
      const nr = R(n);
      if (o.html) {                                   // fly a copy of the old piece to the new spot
        const g = ghost(o.el, o.r);
        g.style.transformOrigin = '50% 50%';             // uniform scale so the card's text doesn't stretch
        anims.push(g.animate([{ transform: 'none', opacity: 1 }, { opacity: .85, offset: .45 }, { transform: flipU(nr, o.r), opacity: 0 }],
          { duration: D * 1.5, delay: (+k || 0) * 18, easing: EASE.inout, fill: 'both' }));
      } else if (!(n instanceof SVGElement)) {         // old piece was SVG: invert the new HTML piece from it
        n.style.transformOrigin = '50% 50%';
        anims.push(n.animate([{ transform: flipU(o.r, nr), opacity: 0 }, { opacity: .9, offset: .55 }, { transform: 'none', opacity: 1 }],
          { duration: D * 1.4, delay: (+k || 0) * 18, easing: EASE.inout, fill: 'backwards' }));
      }
    });
    return anims;
  }

  function morphSwap(container, render, opts) {
    opts = Object.assign({ dir: 'expand', match: 'data-bit', duration: 300, height: true }, opts || {});
    if (!canAnimate() || !container) { render(); return Promise.resolve(); }
    cancelLive();
    if (reduce()) {                                   // reduced motion: plain cross-fade
      render();
      const a = container.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear' });
      return a.finished.catch(() => {});
    }
    const D = opts.duration, collapse = opts.dir === 'collapse';
    // FIRST
    const cR = R(container), oldFocus = focusOf(container), fR = R(oldFocus);
    const oldRects = new Map();
    if (opts.match) container.querySelectorAll(`[${opts.match}]`).forEach(e => {
      const k = e.getAttribute(opts.match), r = R(e), o = oldRects.get(k);
      if (!o || r.w * r.h > o.r.w * o.r.h) oldRects.set(k, { el: e, r, html: !(e instanceof SVGElement) }); });
    const g = ghost(container, cR);
    g.style.background = 'transparent'; g.style.boxShadow = 'none';
    // LAST: render now, but measure in a microtask so layout changes made later in the same task
    // (e.g. Ken's body.wide toggle in updateModbar) are included. Microtasks run before the next paint.
    render();
    return new Promise(res => queueMicrotask(res)).then(() => playSwap(container, opts, D, collapse, cR, fR, oldRects, g));
  }
  function playSwap(container, opts, D, collapse, cR, fR, oldRects, g) {
    const nR = R(container), newFocus = focusOf(container), tR = R(newFocus);
    const anims = [];
    const hasPairs = opts.match && [...oldRects.keys()].some(k => container.querySelector(`[${opts.match}="${k}"]`));
    // INVERT + PLAY
    if (opts.height && Math.abs(nR.h - cR.h) > 1) {
      container.classList.add('morphing');
      anims.push(container.animate([{ height: cR.h + 'px' }, { height: nR.h + 'px' }], { duration: D * 1.2, easing: EASE.out }));
    }
    // old content leaves toward the new focus
    anims.push(g.animate([{ transform: 'none', opacity: 1, filter: 'blur(0)' },
                          { transform: hasPairs ? 'none' : flipU(tR, fR), opacity: 0, filter: 'blur(2px)' }],
      { duration: D * (hasPairs ? .6 : .95), easing: EASE.in, fill: 'both' }));
    g.style.transformOrigin = `${fR.cx - cR.x}px ${fR.cy - cR.y}px`;
    // new content arrives from the old focus rect
    const inv = collapse ? flip(fR, tR) : flipU(fR, tR);
    newFocus.style.transformOrigin = 'center'; newFocus.style.transformBox = 'border-box';
    anims.push(newFocus.animate([{ transform: hasPairs ? 'scale(.98)' : inv, opacity: 0 }, { transform: 'none', opacity: 1 }],
      hasPairs ? { delay: 0, duration: D * .5, easing: EASE.out, fill: 'backwards' }
               : { delay: collapse ? D * .4 : D * .25, duration: collapse ? D * .9 : D, easing: collapse ? EASE.spring : EASE.out, fill: 'backwards' }));
    if (newFocus !== container) [...container.children].forEach(ch => { if (ch !== newFocus && !ch.contains(newFocus)) anims.push(ch.animate([{ opacity: 0 }, { opacity: 1 }], { delay: D * .6, duration: D * .6, fill: 'backwards' })); });
    if (collapse) { anims.push(...pinsOut(container, D * 1.1), ...iconIn(container, D * 1.05)); }
    else anims.push(...wiresIn(container, D * .55));
    anims.push(...matched(g, container, opts.match, oldRects, opts.dir, D));
    let cancelled = false;
    live.push(() => { cancelled = true; anims.forEach(a => a.cancel()); container.classList.remove('morphing'); newFocus.style.transformOrigin = ''; newFocus.style.transformBox = ''; });
    return done(anims).then(() => { if (!cancelled) { clearGhosts(); anims.forEach(a => a.cancel()); container.classList.remove('morphing');
      newFocus.style.transformOrigin = ''; newFocus.style.transformBox = ''; container.querySelectorAll('[style*="transform-origin"]').forEach(n => { n.style.transformOrigin = ''; }); live = []; } });
  }

  // two live elements (both laid out). onSwap() should make toEl the visible one.
  function morphPair(fromEl, toEl, opts, collapse) {
    opts = opts || {};
    if (!canAnimate()) { opts.onSwap && opts.onSwap(); return Promise.resolve(); }
    cancelLive();
    if (reduce()) { opts.onSwap && opts.onSwap(); const a = fade(toEl, 0, 1, 150); return a.finished.catch(() => {}).then(() => a.cancel()); }
    const D = opts.duration || 300;
    const fF = opts.fromFocus || focusOf(fromEl), tF = opts.toFocus || focusOf(toEl);
    const a = R(fF), b = R(tF), g = ghost(fromEl, R(fromEl));
    g.style.transformOrigin = `${a.cx - R(fromEl).x}px ${a.cy - R(fromEl).y}px`;
    opts.onSwap && opts.onSwap();
    const anims = [
      g.animate([{ transform: 'none', opacity: 1, filter: 'blur(0)' }, { transform: flipU(b, a), opacity: 0, filter: 'blur(2px)' }], { duration: D * .95, easing: EASE.in, fill: 'both' }),
      tF.animate([{ transform: collapse ? flip(a, b) : flipU(a, b), opacity: 0 }, { transform: 'none', opacity: 1 }],
        { delay: D * (collapse ? .4 : .25), duration: D * (collapse ? .9 : 1), easing: collapse ? EASE.spring : EASE.out, fill: 'backwards' })
    ];
    if (collapse) anims.push(...pinsOut(toEl, D * 1.1), ...iconIn(toEl, D * 1.05)); else anims.push(...wiresIn(toEl, D * .55));
    let cancelled = false;
    live.push(() => { cancelled = true; anims.forEach(x => x.cancel()); });
    return done(anims).then(() => { if (!cancelled) { clearGhosts(); anims.forEach(x => x.cancel()); live = []; } });
  }
  const morphCollapse = (fromEl, toEl, opts) => morphPair(fromEl, toEl, opts, true);
  const morphExpand = (fromEl, toEl, opts) => morphPair(fromEl, toEl, opts, false);

  root.TRANSITIONS = { morphSwap, morphExpand, morphCollapse, EASE, reduce };
  root.morphSwap = morphSwap; root.morphExpand = morphExpand; root.morphCollapse = morphCollapse;
})(window);
