# CHANGES-6: copper/brass stub on the left of the step-5 piles

**Nothing needs applying in Tommy's files.** The fix is entirely in `design/bench/`, which his `index.html` loads directly. For review: `design/CHANGES-6-design.diff`. There is no `CHANGES-6-tommy.diff`.

## Cause
The cause was neither a lead strap nor a wire sag. It was a class-name clash.
- The pile's two brass plates (the cylinder bands above and below the stack) had `class='plate top'` and `class='plate bottom'`.
- The ladder styles its HTML name labels with `css/ladder.css:64`, `.bn-part .plate{position:absolute;left:50%;translate:-50% 0;…}`.
- Inside a `.bn-part` (bench steps 2–5), that `translate:-50%` also hit the SVG paths. Each band moved about 45 viewBox units left, half the 90-wide frame.
- The result was the brass strips poking out to the left at the top-plate and bottom-plate heights, and plates with no side face where they belonged.
- Step 1 was unaffected because its pile sits in `#pile-art`, not in a `.bn-part`.

## Fix
- `pile.src.js`: the bands are now `pile-plate top` and `pile-plate bottom`. I regenerated `bench-art.js` and `voltaic-pile.svg` with `bench-gen.py`; no other part changed.
- `bench.css`: the `.on` glow selector is now `.bn-pile.on .pile-plate.top`.
- `BENCH-PINS.md`: notes the plate class names.
- I checked that no other class in our SVG parts is moved by his CSS. `.slot` and `.coil` match his rules but carry no geometry that affects SVG.

## Checked
- `design/bench/pile-stub-before-after.png`: step 5 before (stubs) and after (clean), plus a step-1 pile with 3 cells after, at 3.0 V.
- His tests on a temp copy of HEAD e6f334d with the new `design/`: **39/39** (ladder 38/38, classic 29/29).

## What Tommy must do
Nothing: reload. If any of his own code queried `.bn-pile .plate`, it should now use `.pile-plate`. His current code doesn't.
