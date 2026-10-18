# Bench animations

Every animation is real code in `bench.js` (WAAPI) or `bench.css` (transitions). `anim-frames.png` is rendered by pausing those exact animations (`anim-frames.html`).

**Reduced motion.** Applies when the OS asks for it, or when `<html class="bn-reduce">` is set (an in-app "calm motion" toggle; `BENCH.reduce()` checks both). The new state is applied **at once** and the part gets `.bn-flash`: a 450 ms glow that is fully on immediately and then fades. Under reduced motion there is no swing, overshoot, spark, burst or wire flow.

| animation | call | timing / easing | pivot / motion | reduced-motion version |
|---|---|---|---|---|
| Filament warming | `BENCH.heat(lamp, 0..1)` | `--heat` transition, `--bn-heat-ms` 700 ms, `cubic-bezier(.35,0,.25,1)` | heat drives the filament colour (dark carbon, then orange `.fil-hot`, then white-gold `.fil-white` above .55), the filament glow (drop-shadow radius = heat × 3px), `.warm` glass tint and `.halo` (opacity and scale .6 to 1) | `transition:none`: jumps to the final heat, plus flash |
| Knife blade closing | `BENCH.knife(sw, true)` | CSS transition 360 ms (`--bn-swing-ms`), `cubic-bezier(.55,0,.8,.3)` (accelerates like a dropped blade) | `.blade` rotates −38° to 0 about (34,70). At the end of the swing (read from the computed transition duration): spark at the jaw, then a 140 ms settle wobble (−1.6°) | blade snaps shut, plus flash; no spark |
| Iron snaps to nail | `BENCH.magnet(m, true)` | WAAPI 230 ms, `cubic-bezier(.55,0,1,.45)` (pulled harder as it gets closer) | `.iron` keyframes `0 → -14px @.62 → -11.4px @.82 → -12px`. Release: `-12 → +1.5 @.7 → 0`, 300 ms ease-out | iron jumps, plus flash |
| Relay pulls in / drops out | `BENCH.relay(r, on)` | WAAPI 190 ms, `cubic-bezier(.5,0,.75,.5)` | `.armature` about (92,22): `0 → -7.4° @.55 → -6° @.75 → -6.7° @.9 → -6.5°`, a click with a bounce. Spark at NO 95 ms in (at NC when it drops out) | armature jumps, plus flash |
| Spark | `BENCH.spark(g)` | WAAPI 160 ms | `.flash` scales .3 → 1.2 → 1.5 and fades; `.star` scales up, turns 28° and is gone by 85%. The group is only visible while the animation runs, so nothing lingers if it is interrupted | hidden (`display:none`) |
| Screw tightening | `BENCH.tighten(screwG)` | WAAPI 480 ms, `cubic-bezier(.3,.6,.2,1)` | `.slot` 0 → 270° about the screw centre; the copper loop slides in 6px and settles under the head; the head dips (scale .94 at 85%) as it seats | slot set to 270° and loop drawn, plus flash |
| Step solved: burst | `BENCH.burst(container, x, y)` | 600–900 ms | warm core, 14 brass rays, 10 falling sparks | no burst; the container flashes |
| Current flow on a live wire | class `.on.flow` on `g.cw` | CSS `cwflow` 600 ms linear infinite | dashes travel along the path direction | flow layer hidden; the steady amber overlay stays |

## Snippets

```css
/* lamp: everything follows one number */
@property --heat { syntax:'<number>'; inherits:true; initial-value:0 }
.bn-lamp { transition: --heat 700ms cubic-bezier(.35,0,.25,1) }
.bn-lamp .fil-hot   { opacity: min(1, calc(var(--heat) * 2.4)) }
.bn-lamp .fil-white { opacity: max(0, calc((var(--heat) - .55) * 2.3)) }
.bn-lamp .halo      { opacity: var(--heat); transform: scale(calc(.6 + var(--heat) * .4)) }

/* knife: the pivot is set inline on the group as style='transform-origin:34px 70px' */
.bn-knife .blade { transform: rotate(-38deg); transition: transform 360ms cubic-bezier(.55,0,.8,.3) }
.bn-knife.closed .blade { transform: none }
```

```js
// relay click with a bounce (bench.js)
arm.animate([{transform:'rotate(0deg)'},{transform:'rotate(-7.4deg)',offset:.55},
             {transform:'rotate(-6deg)',offset:.75},{transform:'rotate(-6.7deg)',offset:.9},
             {transform:'rotate(-6.5deg)'}], {duration:190, easing:'cubic-bezier(.5,0,.75,.5)'});
setTimeout(() => BENCH.spark(relay.querySelector('.spark-no')), 95);

// iron snapping to the nail with overshoot
iron.animate([{transform:'translateX(0)'},{transform:'translateX(-14px)',offset:.62},
              {transform:'translateX(-11.4px)',offset:.82},{transform:'translateX(-12px)'}],
             {duration:230, easing:'cubic-bezier(.55,0,1,.45)'});
```

## Order of events when a circuit closes (for example knife B in step 3)

1. `BENCH.knife(swB, true)`: the blade swings, and the spark comes at the end of the swing.
2. Once that promise resolves, update the logic: `BENCH.setWire(g, 1)` for each wire in the loop, add `.on` to the screws and switches, then `BENCH.heat(lamp, 1)`.
3. If the goal is now met: add `.met` to `.goal-card`, set `li.ok` on the checks, and call `BENCH.burst(scene, x, y)` over the lamp.

All helpers return promises (or resolve at once under reduced motion), so the steps can be chained.
