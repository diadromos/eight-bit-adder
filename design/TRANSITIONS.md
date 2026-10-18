# Levels transition: switch circuit → gate → module (and back)

Demo: `transition-demo.html` (buttons, or `?dir=collapse|expand&t=<ms>` to freeze). Frames: `transition-frames.png` (collapse at 0, 200, 420, 640 and 860 ms, plus expand at 300 ms).

All three layers sit stacked in one positioned stage, centered (`position:absolute;left:50%;top:50%;translate:-50% -50%`):
`#circuit` (switch-level SVG), `#gate` (`GATES.and`), `#module` (`.module` with `svg.micon` in its title).

## Easings
| name | value | use |
|---|---|---|
| out | `cubic-bezier(.2,.8,.2,1)` | things arriving (gate scale-in, pin stubs) |
| in | `cubic-bezier(.4,0,1,1)` | things leaving (circuit fade, wire retract) |
| inout | `cubic-bezier(.65,0,.35,1)` | moves between two resting places (gate → icon) |
| spring | `cubic-bezier(.3,1.35,.6,1)` | module box growing (slight overshoot) |

## Collapse timeline (total 860 ms)
| t (ms) | what | how |
|---|---|---|
| 0–280 | circuit cross-fades out toward its centre | opacity 1→0, `scale(1)→scale(.6)`, blur 0→2px, **in** |
| 80–280 | gate scales in from the circuit's centre (FLIP) | from `scale(min(Cw/Gw, Ch/Gh)·.75)` and opacity 0 → `scale(1)`, **out** |
| 440–600 | wires retract into the pin stubs | each `.lead`: `stroke-dasharray:L L`, `stroke-dashoffset 0 → ±L` (input leads shrink toward the body, the output lead back toward the body), **in** |
| 520–740 | gate shrinks into the module's title icon (FLIP) | `translate(Ix-Gx, Iy-Gy) scale(Iw/Gw)` using the `.micon` rect, **inout**; it fades out 740–780 |
| 560–800 | module box grows around it | from `scale(Gw/Mw, Gh/Mh)` and opacity 0 → `scale(1)`, **spring** |
| 740–820 | module icon fades in (hand-off from the moving gate) | opacity 0→1 |
| 700–860 | pin stubs slide out of the box edges, 40 ms stagger | `translateX(±14px)`, opacity 0 → none, **out** |

Rects are measured once at the start with `getBoundingClientRect()`, relative to the stage (the FLIP "First/Last"). Only `transform`, `opacity`, `filter` and `stroke-dashoffset` are animated.

## Web Animations snippet
```js
const r = el => { const s = stage.getBoundingClientRect(), b = el.getBoundingClientRect();
  return { x: b.left - s.left + b.width/2, y: b.top - s.top + b.height/2, w: b.width, h: b.height }; };
const C = r(circuit), G = r(gate), M = r(module.firstElementChild), I = r(module.querySelector('.micon'));
const gs = Math.min(C.w/G.w, C.h/G.h) * .75, toIcon = `translate(${I.x-G.x}px,${I.y-G.y}px) scale(${I.w/G.w})`;
const T = 860, plan = [
  [circuit, [{opacity:1,transform:'scale(1)',filter:'blur(0)'},{opacity:0,transform:'scale(.6)',filter:'blur(2px)'}], {delay:0, duration:280, easing:EASE.in}],
  // the gate's two phases are ONE animation with offsets, so a later phase's backwards fill can't override the earlier one
  [gate, [{opacity:0,transform:`scale(${gs})`,offset:0,easing:EASE.out},
          {opacity:1,transform:'scale(1)',offset:200/700},
          {opacity:1,transform:'scale(1)',offset:440/700,easing:EASE.inout},
          {opacity:1,transform:toIcon,offset:660/700},
          {opacity:0,transform:toIcon,offset:1}], {delay:80, duration:700}],
  ...[...gate.querySelectorAll('.lead')].map(l => { const L = l.getTotalLength(), out = l.classList.contains('lead-out');
     return [l, [{strokeDasharray:`${L} ${L}`,strokeDashoffset:0},{strokeDasharray:`${L} ${L}`,strokeDashoffset: out ? L : -L}], {delay:440, duration:160, easing:EASE.in}]; }),
  [module, [{opacity:0,transform:`scale(${G.w/M.w},${G.h/M.h})`},{opacity:1,transform:'scale(1)'}], {delay:560, duration:240, easing:EASE.spring}],
  [module.querySelector('.micon'), [{opacity:0},{opacity:1}], {delay:740, duration:80}],
  ...[...module.querySelectorAll('.mpin')].map((p,i) => [p,
     [{opacity:0,transform:`translateX(${p.closest('.out') ? -14 : 14}px)`},{opacity:1,transform:'none'}], {delay:700+i*40, duration:120, easing:EASE.out}]),
];
function run(dir) {          // dir: 'collapse' | 'expand'
  document.getAnimations().forEach(a => a.cancel());
  return Promise.all(plan.map(([el, kf, o]) => el.animate(kf, { ...o, fill: 'both',
    direction: dir === 'expand' ? 'reverse' : 'normal',
    delay: dir === 'expand' ? T - (o.delay + o.duration) : o.delay }).finished));
}
```
- **Expand** is the exact reverse: the same keyframes with `direction:'reverse'` and mirrored delays (`T - (delay + duration)`). The pins tuck in, the box shrinks onto the gate, the gate grows back from the icon, the leads extend, and the gate expands to the circuit's size while the circuit fades back in. Reversed easings read correctly: "in" becomes an ease-out on the way back.
- Rebuild `plan` (re-measure) before each run if the layout may have changed.
- For a module that expands in place (`.module` → `.minner`), use the same FLIP idea:
  1. Measure the collapsed card.
  2. Toggle `.expanded`.
  3. Measure the expanded card.
  4. Animate `transform: scale(first/last)` → none on the card (240 ms, **spring**).
  5. Animate the `.minner` content opacity 0 → 1, delayed 120 ms (160 ms, **out**).
  6. The chevron rotates via CSS.

## Reduced motion
With `prefers-reduced-motion: reduce`, skip the timeline: swap the layers with a 150 ms opacity cross-fade (or an instant swap). The `.flow` dashes and `.rippling` animation are also disabled in `style.css`.
