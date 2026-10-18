# Gate pins (all three gates share one coordinate system)

viewBox `0 0 60 40` (drawn at 60x40; scale freely, since the pins scale with it)

| pin | x | y | notes |
|---|---|---|---|
| input A | 0 | 12 | upper input lead (`path.lead-a`) |
| input B | 0 | 28 | lower input lead (`path.lead-b`) |
| output | 60 | 20 | output lead (`path.lead-out`) |

Body extents: AND x 14.4 to 47.8; OR x 12 to 47.8; XOR back curve at x ≈ 10 to 16, body x 16 to 48.2. The leads run from the pins to the body. The body (`path.body`) is drawn last, with a fill, so it covers the lead ends cleanly.

To place a gate at (gx, gy) at native size in a circuit SVG, nest it: `<svg x=gx y=gy width=60 height=40 viewBox='0 0 60 40' class='gate ...'>`. Then the pins are at (gx, gy+12), (gx, gy+28) and (gx+60, gy+20).

**Classes:**
- `svg.gate` (+ `gate-and` / `gate-or` / `gate-xor`). Toggle `on` when the output is 1.
- `path.lead-a`, `path.lead-b`, `path.lead-out` can each take `on` too (input lit, gate off, e.g. AND with one input high).
- `path.body` is the gate shape; its fill comes from CSS (`--gate-fill-0/1`).
- `path.back` is XOR's extra back curve.

Strokes use `currentColor`, so `.gate{color:…}` drives the outline color.

## NOT (`not.svg`, `GATES.not`)
Same viewBox `0 0 60 40` and classes.

| pin | x | y |
|---|---|---|
| input A | 0 | 20 (`path.lead-a`) |
| output | 60 | 20 (`path.lead-out`) |

Triangle body x 15.6 to 42.4; the output bubble (`circle.body.bubble`) is centred at (46.6,20) with r 3.8. Put `on` on the svg when the output is 1, i.e. when the input is 0. Mark the input lead with `lead-a.on` when the input is 1, so a lit input next to a dark gate reads correctly.
