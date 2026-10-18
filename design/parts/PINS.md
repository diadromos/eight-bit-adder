# Part pins

All parts: stroke `currentColor`, round caps/joins, stroke-width 2.4. Toggle state classes on the root `<svg class='part part-…'>`. Strings are in `parts.js` (`window.PARTS[key]`). Every pin also appears in a comment inside each SVG.

| key | viewBox | pins | state classes |
|---|---|---|---|
| `switch` | 0 0 60 40 | a (0,20), b (60,20); hinge (14,20) | `closed` (or `[aria-checked=true]`) rotates the lever shut; `on` = current flowing |
| `relay-no` | 0 0 60 64 | contact a (0,20), b (60,20); coil c1 (14,60), c2 (46,60) | `energized` closes the NO contact and lights the coil; `on` = contact conducting |
| `relay-nc` | 0 0 60 64 | same as relay-no | closed at rest; `energized` opens it (the NOT gate) |
| `lamp` | 0 0 60 40 | a (0,20), b (60,20) | `on` = lit (fill, filament and glow) |
| `battery` | 0 0 60 40 | + (0,20), − (60,20) | `on` optional (source is always live) |
| `ground` | 0 0 60 40 | g (30,0) | `on` optional |
| `npn` | 0 0 60 60 | base (0,30), collector (40,0), emitter (40,60) | `on` = conducting |

**Placing parts:** nest at native size, e.g. `PARTS.switch.replace('<svg ', "<svg x='120' y='0' ")`. The pins are then offset by (x, y).

**Tappable switch:** wrap it in `<button class="switch-btn" role="switch" aria-checked="false" aria-label="A">…</button>`. The button gives a 44px target, and pressing it previews the lever moving halfway.

**Current flow:** add `flow` to a lit wire (`<path class="wire on flow">`). Dashes move in the path's direction, so draw paths from + toward −. Add `flow-back` to reverse. With reduced motion the dashes are disabled and the wire is solid amber.

## `not-relay`: NOT, stage 1 (normally-closed relay)
A group (`svg.part-group.part-not-relay`, viewBox `0 0 140 72`) containing a `relay-nc` at (0,0) and a `lamp` at (80,0).

| pin | x | y |
|---|---|---|
| source + (into the NC contact) | 0 | 20 |
| lamp out (to ground) | 140 | 20 |
| input (coil c1) | 14 | 72 |
| coil c2 (to ground) | 46 | 72 |

The default string is the input-0 state: contact closed, lamp lit, `wire.mid` lit.

For input 1:
- add `energized` to `svg.part-relay` and remove `on` from it;
- remove `on` from `svg.part-lamp` and from `path.wire.mid` (and from `wire.out`);
- add `on` to `path.wire.in`.

Result: the coil glows, the contact springs open, and the lamp goes dark.
