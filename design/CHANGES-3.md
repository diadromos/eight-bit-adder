# CHANGES-3: John's workbench art direction (steps 1–5), bench modules (6–9), themed furniture

This replaces the flat organic look of the step 1–5 parts with a realistic, layered early-20th-century workbench. The file plan and API idea are unchanged: generated SVG art, a CSS layer and a small classic-script helper. Everything new lives in `design/bench/`. Nothing of Ken's (HTML, JS, app.css) was edited.

## Files (design/bench/)
| file | what it is |
|---|---|
| `bench-gen.py` | the generator: shared `bn-*` defs (brass, porcelain, slate, iron, copper and coil gradients; wood-grain pattern; felt; glass; heat glow; shadow and glow filters) and every part. Run `python3 bench-gen.py` |
| `*.svg` (12) | standalone parts with embedded defs: `lamp`, `bulb`, `dry-cell`, `wet-cell`, `knife-switch`, `magnet`, `iron`, `relay`, `terminal`, `spark`, `tray`, `bench-top` |
| `bench-art.js` | `window.BENCH_ART`: the same parts as strings, plus `defs` (inject once) |
| `bench.css` | the theme. Load **after** `style.css`. Covers the scene (`.bn-scene`), lamp `--heat`, knife, magnet, relay, screws, cloth wire `.cw`, `.module.bench` / `.bakelite`, `.ladder`, `.goal-card`, `.bn-burst`, `.binrow`, and reduced motion |
| `bench.js` | `window.BENCH`: `installDefs`, `part`, `place`, `PINS`, `benchTop`, `wire`/`wirePath`/`setWire`, `heat`, `knife`, `magnet`, `relay`, `spark`, `tighten`/`loosen`, `burst`, `binaryRow`/`setBinary`, `flash`, `reduce` |
| `BENCH-PINS.md` | pins, pivots, moving layers and state hooks for every part |
| `ANIMATION.md` | each animation's timing, easing, keyframes and pivot, its reduced-motion version, and snippets |
| `bench-preview.html/.png` | every part in every state |
| `anim-frames.html/.png` | the real animations frozen frame by frame, plus a reduced-motion row |
| `mockup-bench.html`, `mockup-bench-390.png`, `mockup-bench-1280.png` | step 3 (AND) on the bench: ladder, goal card (met), scene, next-up module, binary readout |

## The look
- **Bench:** an SVG wood-grain pattern (grain strands, knots, plank seams, vignette) with a CSS wood fallback underneath, and a felt-lined parts drawer with a brass pull.
- **Hardware:** brass binding posts with slotted screws and washers, on porcelain, slate or wood bases.
- **Lamp:** carbon-filament lamp with glass highlights, a brass Edison base and a looped filament. `--heat` drives the filament colour (carbon, then orange, then white-gold), its glow, a warm glass tint and the halo.
- **Cells:** a No. 6 dry cell (cardboard jacket, pitch top) and a Leclanché-style wet cell (glass jar, zinc rod, copper plate).
- **Knife switch:** slate base, copper blade, turned wooden handle, brass hinge and jaw clips.
- **Electromagnet:** a nail wrapped in enamelled copper on a wood block, plus a loose iron piece.
- **Relay:** armature relay with coil, L-shaped iron yoke, pivoting armature, return spring, and NC/NO contacts on brass posts.
- **Cloth wire:** braided texture in brown, red, green, black or cream, with quadratic sag. A live wire gets an amber overlay plus optional moving flow; an unknown wire gets a pale dotted overlay. Slate/amber stays the logic language.
- **Steps 6–9:** `.module.bench` is a wooden box and `.module.bench.bakelite` a bakelite one. Both take an engraved brass title plate and brass-screw terminals with cloth leads. It is the same markup as `.module`, so `.on`, `.x` and `.unknown` still read amber or slate.
- **Ladder:** brass plates. Done plates are polished with a check, the current one is lit, locked ones are dull.
- **Goal card:** a ruled index card under a brass tack; `.met` warms it.
- **Burst:** brass sparks.
- **Binary row:** 8 carbon bulbs on a wooden strip with engraved place values.

## Fits Ken's app.js with no JS change for basic states
`apply()` already toggles exactly the classes the bench CSS listens to:
- `[data-lamp]` → `.on`: the lamp warms through the `--heat` transition.
- `[data-sw]` → `.closed` / `.on`: the blade swings shut through the CSS transition and the blade glows.
- `[data-energ]` → `.energized`: the armature swings with a bouncy CSS curve.
- `[data-w]` → `.on` / `.unknown` / `.flow`: the cloth wire turns amber, dotted, or flowing.

The extras are optional JS calls: the spark, the magnet overshoot, the relay spark and screw tightening (`BENCH.knife/relay/magnet/tighten/spark`).

## What Ken needs to do (markup/JS, not done by me)
1. Load `design/bench/bench.css` after `style.css`, then load `bench-art.js` and `bench.js`. Call `BENCH.installDefs()` once.
2. Steps 1–5 in `draw.js`: build the circuits from `BENCH_ART` instead of `PARTS`. Use `BENCH.place(key, x, y, scale, "data-lamp='out'")` and draw wires with `BENCH.wire(...pinA, ...pinB, {net:'out', color:'brown'})`, taking pin coordinates from `place().pin()`. The old fixed wire coordinates will not line up with the new art, so they must be replaced. Name mapping:

   | old part | bench part |
   |---|---|
   | `battery` | `dry-cell` (or `wet-cell`) |
   | `switch` | `knife-switch` |
   | `lamp` | `lamp` |
   | `relay-no` / `relay-nc` | `relay`, wired to its `no` or `nc` pin |
   | `ground` | `terminal` (labelled "return") |

   Wrap each circuit in `.bn-scene` with `BENCH.benchTop()` as its first child.
3. To get sparks and overshoot, call `BENCH.knife(el, on)` from the switch click handler, and `BENCH.relay(el, on)` for each relay whose state changed, in place of letting `apply()` flip the class. `apply()` toggling the class still works without them.
4. Steps 6–9: add `bench` (and optionally `bakelite`) to the existing `.module` elements.
5. Ladder, goal and burst: use `<ol class="ladder">` with `li.rung.done/.current/.locked > span.n`, then `.goal-card > h3 + p + ul.checks > li(.ok)` with `.met`, then `BENCH.burst(container, x, y)`.
6. Binary row: `BENCH.binaryRow(el, value)` once, then `BENCH.setBinary(el, value)`.
7. Optional "calm motion" setting: toggle `html.bn-reduce`. This is honoured as well as the OS `prefers-reduced-motion`.

## Reduced motion
Every state has an instant version: the class or variable changes at once and the part gets a 450 ms glow (`.bn-flash`) that appears at full strength and fades without growing. There is no swing, overshoot, spark, burst or flow. The bottom row of `anim-frames.png` shows it.

## Notes
- The scene container class is **`.bn-scene`**, not `.bench`. `.bench` is the module modifier (`.module.bench`), and an earlier draft that used both collided.
- `BENCH.part(key, attrs)` merges a `class='…'` in `attrs` into the part's own classes, and replaces width/height when they are given, so `place()` sizing works.
- Pivots are plain `transform-origin` values in viewBox px, with the default SVG `transform-box: view-box`. A part nested in a scene `<svg>` keeps its own viewBox, so its pivots stay correct.
