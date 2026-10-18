# Sound notes: workbench sounds for the 8-bit adder

These are by Michael (sound design) for John Hall. Every sound is **original and procedurally synthesized** by `gen-sounds.py`
(numpy + ffmpeg, fixed seeds, so the output is deterministic). No samples, recordings or third-party audio were used, so no CC0 or other attribution is
needed. **License:** original work made for John Hall, free to use, modify and redistribute in this project.

The palette is quiet and dry: what an early-1900s bench sounds like up close. Brass, nickel and soft iron are modelled as clusters of
inharmonic decaying partials, the clicks are short filtered noise bursts, and the wooden base gives a low thunk. There is no reverb, so the sounds sit
close to the listener.

## Files
All files are mono at 44.1 kHz. The MP3s are 96 kbps CBR (LAME with a gapless tag) and the OGGs are Vorbis q4. The masters are 16-bit WAVs in `wav/`.
- **Peaks:** every master peaks at **-1.0 dBFS**. Decoded MP3/OGG peaks fall between -1.8 and -0.4 dBFS, so nothing clips.
- **Leading silence:** none. Each file starts at the first sample above -40 dB of its peak.
- **Clicks:** none. Every file has a 0.3 ms fade-in and a 12 ms fade-out (60 ms on the bells).
- **Masters vs. defaults:** the masters are full-scale so they keep their resolution. The **quietness comes from the default volume** column below.
  Those gains are loudness-matched, so the one-shots land at about -32 to -40 LUFS and the chime at about -30 LUFS when played.

| file (.mp3 / .ogg / wav/.wav) | dur | mp3 / ogg | LUFS (master) | default vol | sound | the hit is at |
|---|---|---|---|---|---|---|
| `relay-engage-a` | 84 ms | 1.9 / 4.3 KB | -22.3 | 0.25 | armature slaps the pole: bright tick + 2.1/3.4/5.7 kHz ring + two contact bounces | 0–1 ms |
| `relay-engage-b` | 84 ms | 1.9 / 4.3 KB | -23.6 | 0.25 | variant (2.4/3.7/6.2 kHz) | 0–1 ms |
| `relay-release-a` | 73 ms | 1.6 / 4.2 KB | -24.8 | 0.18 | the spring pulls it back: duller and lighter (low-passed) | 2 ms |
| `relay-release-b` | 72 ms | 1.6 / 4.2 KB | -24.6 | 0.18 | variant | 2 ms |
| `knife-switch-close` | 227 ms | 3.4 / 5.1 KB | -23.2 | 0.35 | 26 ms blade scrape into the jaws → clack + wooden-base thunk + faint jaw ring | **~20 ms** |
| `knife-switch-open` | 174 ms | 2.8 / 5.2 KB | -22.3 | 0.3 | release "tchk" + short metal slide | 0–1 ms |
| `spark-crackle` | 172 ms | 2.8 / 5.6 KB | -29.1 | 0.3 | small DC spark: dense crackle thinning out + a faint "zt" | 0–2 ms |
| `magnet-snap` | 247 ms | 3.7 / 5.1 KB | -21.7 | 0.3 | 16 ms whip-in → hard iron clank + low ring + tiny rebound | **~9 ms** |
| `binding-post-screw` | 363 ms | 4.9 / 7.1 KB | -22.3 | 0.3 | knurled brass nut spun down: 7 fine thread ticks over friction → firm "tock" when tight | the ticks start at 0; **tock at ~264 ms** |
| `lamp-warmup-tick` | 182 ms | 2.8 / 4.3 KB | -22.4 | 0.2 | filament "tink" + a soft rising glow tone | 0–2 ms |
| `filament-hum-loop` | 1250 ms (1.000 s loop) | 15.3 / 9.5 KB | -9.6 | **0.03** | faint 120 Hz-family filament/dynamo hum with airy fizz and a slow 3 Hz waver | loop |
| `bell-desk` | 1600 ms | 19.6 / 8.6 KB | -15.4 | 0.18 | nickel counter bell "ding" at 2.12 kHz (struck-dome partials, slow beating) | 0 ms |
| `bell-brass` | 1604 ms | 19.6 / 8.9 KB | -14.8 | 0.18 | small brass hand bell at 1.32 kHz, warmer, with a gentle second tap at 190 ms | 0 ms |

**Size:** all 26 web files come to 158 KB (largest 19.6 KB). The masters come to 529 KB. Everything except the two bells and the hum is under 400 ms.

**Hum loop:** the hum is a signal that repeats **exactly every 1.000 s**. Every partial is a whole number of cycles per second, and the noise is shaped
in the frequency domain, so it wraps around. The file holds 1.25 s of it. Loop **0.1–1.1 s** (`loopStart = 0.1`, `loopEnd = 1.1`) and start at offset 0.1.
Any 1.000 s window of a periodic signal is seamless, so this holds up even when a decoder adds MP3 encoder delay at the start or Vorbis trims a little at the end.
I measured the seam step on decoded WAV, OGG and MP3: it is inside the signal's normal sample-to-sample range.

## Trigger mapping
**Ladder** (`docs/ladder-text.md`, Steps 1–9; Henri's bench parts in `design/bench/`).
That code doesn't exist yet, so the names below describe the moments; Ken, wire them to whatever the events end up being called:

| moment | sound | when | vol |
|---|---|---|---|
| a wire end is attached to a terminal / binding post (Step 2 on) | `binding-post-screw` | on drop/connect. The "tight" tock is at +264 ms, so if a "connected" highlight follows, light it at about +260 ms | 0.3 |
| a bulb lights (Step 2, 3, 5, 7) | `lamp-warmup-tick` (+20 ms), then the hum loop while **any** bulb is lit | as the filament starts to glow | 0.2 / 0.03 |
| a circuit closes and current starts to flow | `spark-crackle` | at the closing contact (+20–60 ms after a knife-switch close) | 0.3 |
| knife switch closed / opened (Step 3 on) | `knife-switch-close` / `knife-switch-open` | close: start the sound 20 ms **before** the blade visually seats, or delay the seat animation 20 ms. Open: at the start of the lift | 0.35 / 0.3 |
| the electromagnet grabs the iron (Step 4) | `magnet-snap` | the clank is at +9 ms, so start it about 9 ms before the iron touches the pole | 0.3 |
| the iron drops when switched off (Step 4) | `relay-release-*` at 0.25 (soft drop). Optional, since no sound was requested for this | on release | 0.25 |
| a relay coil is energized / de-energized (Step 5, 6, 8, 9) | `relay-engage` / `relay-release`, round-robin a/b | when the armature moves | 0.25 / 0.18 |
| **step complete** (any `**Success:**` line), gate or module earned | `bell-desk` (the "chime") | when the success text or badge appears | 0.18 |
| final step 9 (or reset-progress confirm, if you want a farewell) | `bell-brass` | the same | 0.18 |

**The current page** (`index.html`, `js/app.js`). `SFX.autoHook()` maps these with no app.js edits:

| element / class change (set by `apply()` in app.js) | sound |
|---|---|
| `[data-energ]` gains `.energized` / loses it (relay parts, e.g. Stage 1 in the switches view) | `relay-engage` / `relay-release`, +30 ms (the lever's 180 ms spring `transform` reaches contact at about 60 ms) |
| `.part-switch` / `[data-sw]` gains `.closed` (Stage 0 `#sw`) | `knife-switch-close` (+40 ms) + `spark-crackle` (+60 ms) |
| `.part-switch` / `[data-sw]` loses `.closed` | `knife-switch-open` |
| `[data-lamp]` gains `.on` | `lamp-warmup-tick` (+20 ms). The hum runs while any **visible** lamp is lit |

- **Visibility:** elements in a hidden layer stay silent. That covers `.lv-layer` without `.vis`, `[hidden]`, and anything not displayed. For example, toggling A in the gate-symbol view doesn't click the hidden relays.
- **Redraws:** elements drawn in the last 250 ms are ignored too, so stage switches, Expand/Package and redraws make no sound.
- **Instant mode:** this can flip many relays at once, so relay clicks are capped at **3 per 40 ms**, staggered 9 ms apart.
- **Tested** in headless Chrome against the real page:
  - Stage 0 close: tick, close and spark.
  - Stage 0 open: open only.
  - Gates switch view: A on gives engage, B on gives engage + lamp tick, A off gives release.
  - Symbol view, stage switches and the ripple stage: silent.
  - No console errors.

## Integration tips (for Ken)
- **Off by default, with a mute toggle.** Add a "Sound" button (`aria-pressed`, off on load). Its click calls `SFX.setEnabled(true)`.
  That **first enabling click unlocks audio**: it creates and resumes the AudioContext, which browsers only allow inside a user gesture, and preloads and decodes every clip (about 80 KB in OGG).
  `setEnabled(false)` stops the hum and suspends the context. The choice is saved under `localStorage['adder-sfx']`, but it can't auto-enable on load: audio still needs a click.
- **Use Web Audio, not `<audio>`.** Buffers decode once and overlap freely with low latency. On iOS, `<audio>` plays only one sound at a time and lags.
  `sfx.js` picks OGG when `canPlayType('audio/ogg; codecs="vorbis"')` says yes, and falls back to MP3 (Safari).
- **Round-robin and variation.** Use `SFX.play('relay-engage')` and `'relay-release'`, which alternate a/b. Each hit also gets ±2.5% pitch and up to -1.1 dB of random gain.
  The bells and the hum always play unvaried.
- **Hum.** Call `SFX.hum(true/false)`. It plays one shared loop with the 0.1–1.1 s loop points above and 120 ms fades in and out. Never start one hum per bulb.
- **Levels.** Use the default vol column, which is exported as `SFX.volumes` if you want a master slider. Keep the bell as the loudest thing, about 0.18.
  At most a few clips overlap, so you don't need a limiter.
- **Background tab.** When the tab is hidden, the hum stops and the context is suspended. It resumes on return if sound is on.
- **Reduced motion:** sounds still play, because they're feedback, not motion. If John wants silence under reduced motion as well, add one check in `play()`. The `reduced` helper is already there.
- **Mobile.** The iOS silent switch mutes Web Audio, which is expected. Make the toggle easy to tap. On the user's first enabling tap, `sfx.js` resumes the context.
- **Regenerating.** Run `python3 gen-sounds.py`. Vorbis writes a random stream serial, so re-rendering changes the OGG bytes even when the audio is identical. Restore unchanged files with `git checkout` to keep diffs clean.

## sfx.js (optional helper, not loaded by any page yet)
Load it after `js/app.js` with `<script src="design/sounds/sfx.js"></script>`. Then:
`SFX.setEnabled(bool)`, `SFX.play(name, {vol, delay})`, `SFX.hum(bool)`, `SFX.autoHook(rootEl)` (the current page), and `SFX.log` (the last 50 plays, for tests).
For the ladder, call `SFX.play('binding-post-screw')`, `'magnet-snap'`, `'knife-switch-close'`, `'spark-crackle'` and `'chime'` from your own event handlers.
