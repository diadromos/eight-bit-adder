# CHANGES-4: workbench art follow-up for Tommy Flowers' ladder

The ladder code was found at /workspace/eight-bit-adder (`python3 -m http.server 8770`, a git repo). It was read and not edited. Every change of ours is under `design/`. Because `index.html` loads `design/style.css`, `design/bench/bench.css`, `bench-art.js` and `bench.js`, the design side is **already live** in the ladder. Nothing breaks without the patch: the ladder still passes its functional tests against the new design files.

Changes Tommy's files need: **`design/CHANGES-4-tommy.diff`**. `git apply --check` passes on the current HEAD.

```
cd /workspace/eight-bit-adder && git apply design/CHANGES-4-tommy.diff
NODE_PATH=… node tests/addertest.js        # with the patch on a copy: 34/34 (ladder 33/33, classic 29/29)
```

## 1. Voltaic pile and moving-coil voltmeter
- **`BENCH.pile(cells, {cls})`** (source `bench/pile.src.js`, also inlined as `BENCH_ART.pile`, plus `voltaic-pile.svg` with 3 cells).
  - Copper / brine-card / zinc discs as proper cylinder bands, with a brine stain at the foot.
  - Glass guide rods, brass top and bottom plates, a pressure-screw yoke and the copper + lead.
  - Binding screws on a walnut plinth.
  - **Same contract as his stand-in**: viewBox 0 0 90 160, pins − (16,147) and + (74,147), `g.cell[data-cell=i]` (`.flipped`). So his overlay buttons (`getBBox` of `[data-cell]`) line up unchanged.
  - `cls:'one'` crops to a single cell for the tray.
- **`BENCH_ART.voltmeter`** (`voltmeter.svg`):
  - walnut case, brass bezel, a cream card dial with a mirror band, 0–6 V scale with 0.1 V ticks, maker's plate and a zero-adjust screw;
  - pins − (22,96) and + (118,96);
  - `.needle` pivots at (70,76), using the same −60°…+60° mapping as his code; stop pins at ±64°.
- **`BENCH.meter(svg, volts, {max:6})`**:
  - a damped moving-coil swing (WAAPI, 650 ms, overshoot then two smaller rebounds);
  - under reduced motion (OS setting or `.bn-reduce`) the needle sets at once and a flash plays.
- CSS: `.bn-pile.on .cu` glow, `.bn-pile.one .frame{display:none}`, `.bn-voltmeter.over` (red pointer).
- Docs: `bench/BENCH-PINS.md` (pins and pivots), `bench/ANIMATION.md` (swing keyframes).
- Preview: `bench/pile-voltmeter-preview.png` shows 0–6 cells, a flipped cell, `.on`, meters at 0/1.5/3/6/over, the swing frames and the reduced-motion frame.

## 2. Full-adder thumbnail clipped (cause: CSS, ours)
- The cause was not the viewBox. Our `.module.bench > .mtitle` was `white-space:nowrap` and had a fixed icon. In the tray the module is shrunk (`.mthumb .module{min-width:0}` plus zoom) inside a narrow box. The unbreakable title plate forced the module wider than the thumb, so the Sum/Cout side and the plate text were cut off. style.css's 18px side margins made it worse.
- Fix in `bench/bench.css`:
  - the title wraps (`text-wrap:balance`, `min-width:0`);
  - the icon is a fixed 28×19 engraved glyph (`flex:none`);
  - module side margins are 14px.
- No change is needed on his side. Before/after: `bench/thumb-fix-before-after.png`.

## 3. Step 9 at 390px: carry from bit 3 to bit 4
- His HEAD already has a `wireRoute` that sends this wire along the gap between the rows, so the *finished* wire is orthogonal. Two problems remained:
  - the vertical runs sat exactly on the module edges, at the pin x;
  - the **rubber-band wire while dragging** still used the straight sag, which is the diagonal seen while wiring.
- New in `bench.js`:
  - `BENCH.wire(..., {route})`: rounded elbows, plus a slight sag on long level runs;
  - `BENCH.route(pts)`;
  - `BENCH.rowRoute(p, q, {gapY, outP, outQ, lead, minX, maxX})`: leaves each pin sideways by `lead`, drops into the gap between the rows, runs along it, and keeps the verticals on the bench.
- Patch (what he should call):
  - step 9's `wireRoute` returns `BENCH.rowRoute(p, q, {gapY:(top+bot)/2, outP:side(p), outQ:side(q), lead:16, minX:6, maxX:b.W-6})`, where `side` = +1 for an output pin and −1 for an input pin;
  - `art.js wireSvg` passes `route` to `BENCH.wire`; his `routePath` and the regex path-swap are removed;
  - `bench.js termDown` draws the rubber band through `cfg.wireRoute` too, so it is orthogonal while dragging.
- Mockup: `bench/mockup-step9-390.png`.

## 4. Parts drawer inside the `.bn-scene`
- Markup and helpers:
  - `BENCH.drawerHtml({label, slotsId, pullId, pullLabel, open})` makes `.bn-drawer > .bn-drawer-box > .bn-drawer-slots#tray`;
  - the front panel `.bn-drawer-front` has an engraved label and a brass cup pull, `button.bn-drawer-pull[aria-expanded]`;
  - `BENCH.drawer(el, open?)` toggles it.
- CSS (`.bn-scene.has-drawer`):
  - reserves `--bn-drawer-h` (150px open, 44px closed via `:has()`) as content-box padding below the stage. His `layout()` keeps setting the height for the stage alone and needs no change;
  - each child of the slots becomes a felt compartment; his old absolute `left:` values are overridden, and at least 4 compartments always show;
  - the box slides over 260 ms, or instantly under reduced motion;
  - phone sizes come from `@media (max-width:420px)`.
- Patch (bench.js and step 1 in app.js):
  - put the drawer inside `#bench`, and drop `.tray-wrap` and the `BENCH_ART.tray` box art;
  - the tray buttons go straight into `#tray`;
  - the pull has id `tray-pull` (his test needs an id on every control);
  - `overTray` uses the drawer rect, and `overStage` uses the stage rect minus the drawer, so dropping on the drawer returns the part;
  - step 1's drop test ignores the drawer;
  - step 1 calls `BENCH.meter` instead of setting the needle transform, and the old `.meter-box .needle` transition is removed from ladder.css (a CSS transition would override the WAAPI swing).

## Exactly what Tommy needs to do
1. `git apply design/CHANGES-4-tommy.diff` (4 files: js/ladder/app.js, bench.js, art.js, css/ladder.css), then run his tests.
2. Optional: add a tooltip or label string for the new `#tray-pull` button in his tooltip copy. It currently uses the default `aria-label` "Parts drawer" (`pullLabel` overrides it).
3. Optional: `.tray-wrap`, `.tray-label` and `.tray-box` in ladder.css are now unused and can be deleted.
4. Optional, his step-9 CSS: at 116px module width with 5px plate padding, the two screw heads on the title plate touch the word "adder". Giving the plate `padding-inline:12px`, or hiding `.mtitle::before/::after` in step 9, clears it.

Nothing was sent or posted. His HTML/JS/CSS and git were not touched; only `git apply --check` was run.
