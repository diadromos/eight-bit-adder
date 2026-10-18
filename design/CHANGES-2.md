# Design review 2: what changed, and what Ken needs to do

Everything below is in `design/`. I did not touch Ken's HTML, JS, `css/app.css` or git. The reviewed copy of the app (with the changes below applied) was served from a scratch copy. The exact proposed edits are in **`CHANGES-2-ken.diff`** (a unified diff against your current `css/app.css`, `index.html`, `js/app.js` and `js/draw.js`; `git apply --check` passes). Apply it, or use it as a reference.

The current app already picks up `design/style.css` (index.html links it before app.css), so the CSS-only improvements show up without any edits. See `review-asis-1280.png`: the selected card and the zoom-panel link already work there through your `aria-expanded`.

## New / changed files
| file | what |
|---|---|
| `style.css` | Desktop left column redesign; `body.wide` layout; unknown state; `.group` boxes; `.wire-gap`; selected card ↔ zoom panel; `.schem` full-width gate view and carry spine; `.jdot`; `.wire.gnd`; `.operand.single`; `.morph-ghost` / `.morphing`; `.part-xor-relay` text sizes |
| `transitions.js` (new) | `morphSwap`, `morphExpand`, `morphCollapse` (FLIP + WAAPI, reduced-motion safe) |
| `wires.js` (new) | `WIRES.hop`, `hopV`, `gap`, `group`, `schematic` (full-width frame, minimap, cell cards) |
| `parts/parts-gen.py`, `parts/parts.js`, `parts/xor-relay.svg` | new `PARTS['xor-relay']` |
| `parts/PINS.md`, `LAYOUT.md`, `TRANSITIONS.md` | documented |
| `xor-relay-preview.html/.png` | the XOR part in all 4 input states |
| `review-*.png` | renders of the real app with the changes applied |

## 1. Desktop left column (coins ≥ 40px without widening)
**Chosen:** the label goes above the coins, coins are a fixed 40px, and the nibbles are split.
- On desktop the A/B name now sits above its coins (as on phone) instead of in a 28px column.
- Coins are a fixed `--coin: 40px` × 48px with 3px gaps and a 10px nibble gap. Your `span.nib` is already in the markup.
- The hit area is 44×52 (`.bit::after`).
- The column is a fixed `--side-w: 384px`.
- `.operand.single` coins (Cin and the gate inputs) are a fixed 52px at every width.

**Ken: delete from `css/app.css`:**
- `.top{grid-template-columns:minmax(410px,440px) minmax(0,1fr)}`
- the two `body.wide .top` / `body.wide .side` rules (now in style.css, using `--side-w`)
- `@media (min-width:900px){.operand .nums{grid-column:2}}` (style.css also neutralises it, so it is harmless if left)
- the `.operand.single{…}`, `.operand.single .bits{…}` and `.operand.single .bit{…}` rules

## 2. 8-bit gate-level view (full width)
- `.schem` frame contents:
  - header: title + subtitle, phone "swipe ↔" hint, 2×4 minimap 7..4 / 3..0 (sum bit underlined amber, chips in view highlighted), Close button (44px)
  - horizontally scrollable `.schem-canvas` (min 1080px on phone, edge fades)
  - legend
- `.cell-bg` rounded tiles behind the 8 adders give an even pitch.
- The carry chain is the spine: 5px on an 11px halo, lighter slate at 0, amber glow at 1. That covers c0→c8 including the c4 elbow between the rows.
- **Ken:** after rendering `#rippleScroll`, call `WIRES.schematic($('#rippleScroll'), { onClose: () => setDepth(0) })`. Load `design/wires.js` before `js/draw.js`. Delete the `.scrollx…` rules (3 lines) from app.css. The `.schem-canvas` rules replace them, and your `scrollLeft = scrollWidth` still opens on bit 0.
- Renders: `review-gatelevel-1280.png`, `review-gatelevel-390.png`, `review-step-1280.png` (Step mode, 4 steps in, unknown wires dotted).

## 3. Selected card ↔ zoom panel
- `.fa.selected` / `.fa[aria-current=true]`: green outline, green index badge, a "zoom ↓" tag on phone, and a green notch under the card on desktop. Your current `aria-expanded=true` is matched too.
- `#zoompanel` (or `.zoom-panel`): green ring with a 3px green top strip. `select#zoom` is a green pill.
- **Ken (recommended):**
  - In `renderChainState`, replace `aria-expanded` with `fa.classList.toggle('selected', i === S.zoom)` + `aria-current="true"` on the selected card. A `role=button` that doesn't expand anything shouldn't announce "expanded".
  - Label the zoom options "Bit 7 … Bit 0" and drop the word "bit" from the label, so the header reads **ZOOM [Bit 5 ▾] full adder**.

## 4. transitions.js
- **Ken:** load `design/transitions.js`.
- In `drawStage`, replace the `swapAnim(...)` calls with `morphSwap(el, () => { el.innerHTML = html; }, { dir })`, and have `setDepth` pass `nd > od ? 'expand' : 'collapse'` as `animate`. Exact code is in TRANSITIONS.md and the diff.
- Then delete `swapAnim`.
- Stage 4 also matches the 8 chain cards to the 8 gate cells (`data-bit`), so they fly into place.
- Stage 1 keeps your `js/levels.js`.
- Frames: `review-morph-half.png`, `review-morph-ripple.png`.

## 5. XOR relay circuit → `PARTS['xor-relay']`
- Built from four NO relays, one NC relay, a lamp, a battery and grounds.
- Routing is orthogonal, with labelled dashed sections: A AND B (series), A OR B (parallel), NOT, and the A XOR B lamp.
- The one crossing is a hop.
- It uses your data hooks and net names (`one A B a1 o1 out`), so `apply()` drives it unchanged.
- **Ken:** in `gateCircuit`, `if (g === 'XOR') return svg('0 0 548 516', PARTS['xor-relay'].replace('<svg ', "<svg x='0' y='0' "));`
- Pins: `parts/PINS.md`. Renders: `review-xor-1280.png`, `review-xor-390.png`, `xor-relay-preview.png`.

## 6. Unknown state, groups, crossings
- **Unknown:** `.unknown` on `.wire .carry .gate .pin .part .lbl .val .clbl .dot .s .co`. Your `.x` is accepted as an alias, so no JS change is needed. It is a faint dotted line with no glow, distinct from 0 (solid slate) and 1 (amber). `.fresh` (just settled) is now in the kit too.
- **Groups:** `rect.group` + `rect.group-tab` + `text.group-label`, or `WIRES.group(x, y, w, h, label)`. Add `.on` for an amber tint.
- **Crossings:** `WIRES.hop(x1, y, x2, [xs])` / `WIRES.hopV(x, y1, y2, [ys])` (preferred), or `WIRES.gap(d)` → `.wire-gap` drawn before the crossing wire (`--gap-bg`, default `--inset`). Your `.halo` is the same idea; keep `.jdot` at real junctions.
- **Ken:**
  - In `faBody` replace the two `rect.habox` with `WIRES.group(52, -4, 76, 144, 'Half 1') + WIRES.group(152, 14, 76, 136, 'Half 2')`.
  - Change the viewBox of `fullGates` (depth 2) and `zoomFA` to `0 -14 340 179`, so the tabs clear the XOR labels.
  - Then delete from app.css: `.habox`, `.hal`, the `.wire.x/.carry.x/.gate.x` + `.wire.fresh` rules, `.jdot`, and `.wire.gnd`.
- Render: `review-full-1280.png`.

## Renders (real app, 390 and 1280)
- `review-ripple-1280.png`, `review-ripple-390.png`: chain + selected card + zoom panel
- `review-gatelevel-1280.png`, `review-gatelevel-390.png`: full-width gate level
- `review-step-1280.png`: Step mode, unknown state
- `review-xor-1280.png`, `review-xor-390.png`: stage-1 XOR (new part)
- `review-full-1280.png`: stage 3 with the half-adder groups
- `review-morph-half.png`, `review-morph-ripple.png`: transitions.js frames
- `review-asis-1280.png`: your current code with only the new style.css (nothing breaks)

## Not changed / notes
- Colours, the palette and all earlier class names are unchanged. Amber is still logic 1; green is UI/selection.
- When the gate view collapses, the page relayouts (`body.wide` off). The old drawing fades out where it was, while the cards fly from the gate cells into the chain. That is expected FLIP behaviour.
