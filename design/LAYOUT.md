# Layout plan: 8-bit ripple-carry adder

## Ordering decision: MSB first everywhere; bit 7 at the top on phone, bit 0 at the right on desktop
- Binary is written MSB → LSB, and the toggles, the result readout and the chain all use that same order. A user can then read any bit column straight across, from coin to adder to sum digit, with no mental flip.
- The carry starts at bit 0, next to Cin, and rises: up the spine on phone, leftward on desktop. That matches written column addition, where the carry moves toward the more significant digit, i.e. left.
- On phone, "up" is the analogue of "left". Bit 0 sits at the bottom of the chain, nearest the thumb and Cin. In Slow/Step mode the light climbs the spine like a level filling up, and the readout (MSB first) above it reads naturally.
- I rejected bit 0 at the top: it would make the chain read LSB-first, unlike every number on screen, and the vertical order would contradict the horizontal coins right above it.

## Phone (390px)
Order, top to bottom:
1. `h1` + `.tabs[role=tablist]`: the 5 stage tabs (`button.tab[role=tab][aria-selected]`, each with a `.n` number badge). The bar scrolls horizontally when it overflows.
2. `section.panel#inputs`:
   - `.operand` × 2 (A, B). Each has a `.name` label above `.bits`, which holds 8 `button.bit` (MSB → LSB) with `aria-pressed`, `aria-label="A bit 7"` and a `.idx` sub-label.
   - Cin is a single `button.bit`.
   - Coins are about 40×48px on a 390px screen. `::after` extends the hit area across the 3px gaps, so each target is about 42×52.
3. `section.panel.result`:
   - `.bin` holds 8 spans (`b` for 1, `i` for 0).
   - `.dec` reads `A + B + Cin = n → 8-bit m`.
   - `.lights` holds `.light` (Carry out) and `.light.warn` (Overflow, signed: c7 XOR c8).
4. `section.panel` (Ripple): `.seg[role=radiogroup]` (Instant / Slow / Step), then `button.btn.primary.next` ("Next step", disabled unless in Step mode), then `label.speed` with a range slider.
   - The slider runs left = slower: label it "slower … faster" and map `delay = max + min - value`.
5. `section.panel` (Carry chain): `.chain`, alternating `.link` and `.fa` from the top: `.link`(c8 = Cout), `.fa`[7], `.link`(c7), … `.fa`[0], `.link`(c0 = Cin).
   - **`.fa`:** `.idx`, `.io` (dots for A, B, Cin), and `.out` (`.s`, `.co`). Tapping a card selects it for the Zoom panel (`.selected` + `aria-current="true"`, one at a time); see *Selected card ↔ zoom panel* below. (The first plan expanded a `.detail` under the card; the built app uses the zoom panel instead, which is better.)
   - **`.link`:** `svg.v` holds `line.carry` plus a `.clbl` label (`c5=1`). While the ripple passes, the incoming link gets `.rippling` and the receiving `.fa` gets `.pulse`, then `.active`.
6. Optional detail cards: Full adder, Half adder, the Levels strip (switch circuit → gate → module, stacked vertically on phone) and Modules.
7. `footer`.

## Desktop (≥900px)
- **`.top` grid:** a fixed left column `var(--side-w)` = **384px** with Inputs, Sum and Timing; a right column with the carry chain and the details. The A/B label sits **above** its coins (as on phone), coins are a fixed **40×48px** (`--coin`) with 3px gaps and a 10px nibble gap (`span.nib`), hit area 44×52: 8 coins + gaps = 354px, which fits 384 − 28 padding. No wider column is needed.
- **Gate-level 8-bit view (`body.wide`):** `.top` becomes one column; `.side` becomes a row of three panels (Inputs `var(--side-w)` | Sum | Timing); the stage panel below it is full width.
- **`.chain.row`:** a horizontal row in the same DOM order (bit 7 … bit 0), so bit 0 lands at the right and the carry flows leftward. `.link` switches to the horizontal `svg.h`.
- 8 cards plus 9 links fit from 1180px of content width down to about 900px. Below 1000px you can wrap into a 4×2 grid (`.chain.row{flex-wrap:wrap}`, two rows of 4: bits 7–4 above 3–0). In that grid, draw the c4 carry as an elbow from the right end of the bottom row to the top row.
- **`.detail-row`:** full-adder detail (2fr) next to the half adder (1fr). The Levels and Modules panels go below.

## Gate-level detail (full adder)
- **Layout:** in a `viewBox 0 0 340 165` with nested gate SVGs at native 60×40:
  - XOR1 (60,20), AND1 (60,90), XOR2 (160,40), AND2 (160,100), OR (240,100);
  - inputs A, B, Cin at the left, Sum and Cout at the right.
  - The wiring is in `mockup.html` and can be copied.
- **Lighting:**
  - Each wire is `path.wire` + `.on` when its value is 1.
  - Gates take `.on` from their output.
  - Mark input leads `lead-a.on` / `lead-b.on` so a gate with a single lit input reads correctly.

## Modules
- **Markup:**
  - `.module` contains `.mpins.in` > `.mpin[.on] > span` (A, B, Cin), then `.mtitle` (optional `svg.micon.gate` + title + `button.mexp[aria-expanded]`), then `.mpins.out` (S, Cout), then `.minner`.
  - Expanded state: add `.expanded` on `.module` (or set `aria-expanded=true` on the button). The `.minner` inset panel then shows the inner circuit.
  - `.module.on` gives a soft amber rim when any output is 1.
- **Animation:** collapse/expand is in TRANSITIONS.md.

## Review 2 additions

### Full-width gate-level view (stage 4 expanded)
```
<div class="schem">
  <div class="schem-head">
    <h3 class="schem-title">8-bit adder <small>gate level · carry flows right to left</small></h3>
    <span class="schem-hint">swipe ↔</span>                         (phone only)
    <div class="schem-map" role="group" aria-label="Jump to bit">      2×4 minimap, same order as the drawing
      <button data-bit="7" data-w="s7">7</button> … <button data-bit="0" data-w="s0">0</button>
    </div>
    <button class="btn schem-close">Close</button>                     (calls setDepth(0))
  </div>
  <div class="schem-canvas" id="rippleScroll"><svg class="circ ripple-gates">…</svg></div>
  <div class="schem-legend">0 · 1 · not computed yet · carry chain</div>
</div>
```
- `WIRES.schematic(scrollEl, { onClose })` (design/wires.js) builds all of this around Ken's existing `#rippleScroll`. It is idempotent: call it again after each re-render.
- Phone: the canvas scrolls horizontally (`--schem-min:1080px`) with 16px edge fades. It opens scrolled to bit 0 (Ken already does this). Minimap chips get `.vis` for the adders in view; tapping one smooth-scrolls to that adder and flashes its card. Desktop: the svg fits the width, and the chips only flash.
- Each `<g class="cell" data-bit>` gets a `.cell-bg` rounded card behind it, so the 8 adders read as 8 equal tiles on the 360-unit pitch. Bit labels stay as Ken's `.bitl` (17px, ink colour).
- Carry spine: every `.carry` in `.ripple-gates` is 5px wide on an 11px halo. It is a lighter slate at 0 and glows amber at 1, so c0→c8, including the c4 elbow between the rows, reads as one highlighted spine.

### Selected card ↔ zoom panel
- Card: `.fa.selected` / `.fa[aria-current=true]` (Ken's current `aria-expanded=true` is matched too). It gets a green outline, and its index badge turns green. On phone there is a small green "zoom ↓" tag; on desktop, a green notch under the card points down at the zoom panel.
- Zoom panel (`#zoompanel` or `.zoom-panel`): a green inset ring with a 3px green strip on top. The bit picker `select#zoom` is styled as a green pill; label its options "Bit 7 … Bit 0" so the header reads **ZOOM [Bit 5 ▾] full adder**. A static alternative is `<span class="zoom-badge">Bit 5</span>`.
- Green means *selected*; amber always means *logic 1*. A card can be both `.active` (amber ripple ring) and `.selected` (green outline) because one uses box-shadow and the other uses outline.

### Half-adder groups, unknown state, crossings
- Groups: `WIRES.group(x, y, w, h, 'Half 1')` builds `rect.group` + `rect.group-tab` + `text.group-label`, with the tab centred on the top edge. In the full adder, use boxes `(52,-4,76,144)` and `(152,14,76,136)` with viewBox `0 -14 340 179`, so the tabs clear the XOR labels.
- Unknown / not yet computed (Slow, Step): `.unknown` (Ken's `.x` works as an alias) on `.wire .carry .gate .pin .part .lbl .val .dot .s .co`. It shows a faint dotted line with no glow, so it can't be confused with 0 (solid slate) or 1 (amber).
- Crossings: prefer a hop (`WIRES.hop(x1, y, x2, [crossX…])` / `WIRES.hopV`), as used in `PARTS['xor-relay']`. Alternatively draw `WIRES.gap(d)` (`.wire-gap`, a 10px band in `--gap-bg`, default `--inset`) right before the wire that passes over. Junctions keep a `.jdot`, so a gap never reads as a T-junction.
