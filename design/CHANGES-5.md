# CHANGES-5: full-adder thumbnail in the parts drawer

**Nothing needs applying in Tommy's files.** The fix is CSS-only, in `design/bench/bench.css`, which his `index.html` loads directly, so it is already live. For review: `design/CHANGES-5-design.diff` (`diff -u` against the pre-change copy). No `CHANGES-5-tommy.diff` is needed.

## Cause
I checked step 9 at 390px and at 1280px. The thumbnail is the real `.module.bench` inside `.mthumb` (`zoom:.4`), squeezed into a 71px drawer compartment (77px at desktop). That leaves a 58px middle column (73px at 1280) for the brass plate, and only 26–41px for its content after the 12px side padding. That content was the 28px gate icon plus "FULL ADDER" at 14px (the word "ADDER" alone is 54px). It overflowed the plate by 19px at 390 and 12px at 1280. Because the plate is a centred flex row, the overflow spilled out on both sides, so the text was drawn on top of the icon. This is the same width pinch as CHANGES-4 §2 (I made the title wrap then), but wrapping can't make "ADDER" narrower than the plate.

## Fix (design/bench/bench.css)
- **Drawer only** (`.bn-drawer .module.bench`):
  - The pin letters A/B/Cin/Sum/Cout are hidden. They were about 5px on screen and unreadable; the brass screws stay.
  - That widens the plate to roughly 106–121px. The title goes up to 18px on two lines (FULL / ADDER).
  - The gate icon now stacks **above** the title when they don't fit side by side, and sits inline when they do (XOR/AND/OR/NOT in step 8).
  - The plate screws move to the top corners.
- **All bench modules**: the plate uses `justify-content:safe center` plus `flex-wrap:wrap`, so an icon that doesn't fit drops onto its own line instead of sliding under the text. On the bench this changes nothing visible: the measured plate widths in steps 8–9 are the same before and after.

## Checked
- `design/bench/thumb-fix2-before-after.png` (2x zoom):
  - drawer thumbnail before and after at 390 and 1280;
  - after: the step-9 bench module, the step-8 bench module (icon kept) and a step-8 drawer thumbnail.
- His tests, against a temp copy of HEAD 1f60eee with the new `design/`: **38/38** (ladder 37/37, classic 29/29).

## What Tommy must do
Nothing to apply; just reload. If his drawer move puts the tray buttons somewhere other than inside `.bn-drawer`, either keep the `.bn-drawer` wrapper or tell us the new container so the selector can follow it.

Note: Tommy's commit e6f334d (00:26 UTC, drawer keep-out plus the 'Parts drawer' label) already picked up the final `bench.css`, `CHANGES-5-design.diff` and `thumb-fix2-before-after.png`; I checked they are identical to the final versions. Only this file, `CHANGES-5.md`, is still uncommitted.
