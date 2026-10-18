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
   - **`.fa`:** `.idx`, `.io` (dots for A, B, Cin), and `.out` (`.s`, `.co`). Tapping a row toggles `aria-expanded` and inserts a `.detail` panel with the gate-level circuit of that adder right below it (one open at a time).
   - **`.link`:** `svg.v` holds `line.carry` plus a `.clbl` label (`c5=1`). While the ripple passes, the incoming link gets `.rippling` and the receiving `.fa` gets `.pulse`, then `.active`.
6. Optional detail cards: Full adder, Half adder, the Levels strip (switch circuit → gate → module, stacked vertically on phone) and Modules.
7. `footer`.

## Desktop (≥900px)
- **`.top` grid:** a left column (340–400px) with Inputs, Sum and Ripple; a right column with the carry chain and the details.
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
