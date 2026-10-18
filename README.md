# 8-bit Adder

Every sum a computer has ever made, from the first to the last, was carried out by a handful of humble gates passing ones and zeros along a line, each doing its small, faithful duty in the dark. This toy lets you watch them at it.

It is an interactive page that builds an 8-bit adder from the ground up, starting with a single switch. Wire switches into logic gates, gates into adders, and see how they add two numbers from 0 to 255.


## The workbench ladder (`index.html`)

The main page is a nine-step ladder set on an early-1900s wooden workbench. Each step unlocks when the thing you built works, and what you build becomes a part in the tray for later steps:

1. **Battery.** Stack voltaic cells (about 1 V each) into a pile that reads exactly 3 V.
2. **Wire and bulb.** Wire the pile to a small bulb so the filament glows (a short circuit doesn't count).
3. **Knife switch.** Add a switch, then turn the bulb on, off and on again with it.
4. **Electromagnet.** Wind enough insulated wire (60 turns or more) to lift the iron, then open the switch and drop it.
5. **Relay.** Light a bulb through the normally-open contact, then through the normally-closed one.
6. **Gates.** Build NOT, AND and OR from relays and pass each truth table, then make XOR from those modules.
7. **Binary.** Use eight bulbs to show 13, then 29, then 42.
8. **Half adder, then full adder.** Build each from gate modules and pass its truth table.
9. **8-bit adder.** Put eight full adders in the slots, wire the carry chain and add 13 + 29 = 42.

Drag parts from the tray, or tap one to place it. Wire them by tapping or dragging from one brass screw to another. Under the bench, a DC solver runs current through the circuit you actually built: cell polarity, bulb current, relay pull-in and short circuits all count. Steps 6 to 9 hand over to the gate-level simulator in `js/sim.js`.

Progress is saved in `localStorage`. **Reset progress** clears it, but step 1 always stays open. `?unlock=all` opens every step, and `?step=N` jumps to one. Sound is off until you turn it on. **Calm motion**, or the system's reduced-motion setting, stops the animations.

The step text comes word for word from [docs/ladder-text.md](docs/ladder-text.md). The art is Henri's (`design/bench/`) and the sounds are Michael's (`design/sounds/`).

## The classic simulator (`classic.html`)

The original five-stage simulator lives on at `classic.html`.

### The five stages

0. **Switches.** A switch drives a lamp: closed is 1, open is 0. In a real computer the switch is a transistor (or, in early machines, a relay).
1. **Gates.** Switches wired into gates: AND (two in series), OR (two in parallel), NOT (a normally-closed switch), and XOR, built from the other three as (A OR B) AND NOT (A AND B).
2. **Half adder.** Adds two single bits with an XOR gate (the sum) and an AND gate (the carry).
3. **Full adder.** Two half adders plus an OR gate, so it can also take a carry coming in from the right.
4. **8-bit ripple-carry adder.** Eight full adders side by side. Each passes its carry to its left-hand neighbor, so a carry can ripple across the whole row.

A **zoom panel** shows any one of the eight full adders up close, with its truth table and the current row highlighted.

## Modules built from modules

Each stage is built from the stage before it. Once a gate works, you can show it as its standard symbol and **package** it as a module: a single block you reuse without thinking about its insides. Half adders are made of gate modules, full adders of half adder modules, and the 8-bit adder of full adder modules. This is called abstraction. Nothing is sealed for good, though: **expand** a module to look inside. The adder stages open down to their gates; the Gates stage opens all the way down to switches.

## How to use it

- Pick a stage with the tabs at the top.
- In Stage 0, flip the switch and watch the lamp.
- In Stage 1, pick a gate, flip its inputs, toggle between the switch view and the gate symbol, and package it as a module.
- In any stage, expand a module to see what it's made of.
- Set A and B by clicking their bits, or type a number from 0 to 255 in the decimal boxes.
- Turn on **carry-in** to add an extra 1.
- Read the answer in binary, decimal and hex. Watch the **carry-out** and **overflow** lights.
- Use **Slow** (the default) or **Step** mode to watch signals pass through the gates and the carry ripple from bit 0 to bit 7.
- Use the zoom picker, or click a full adder in the chain, to inspect one bit's full adder.

Bit 0 is on the right and is worth 1. Each bit to the left is worth twice as much, up to bit 7, worth 128.

## Controls

| Control | What it does |
|---|---|
| `#tab-switch`, `#tab-gates`, `#tab-half`, `#tab-full`, `#tab-ripple` | Switch between the five stages (0–4) |
| `#sw` | Stage 0: flip the switch to light the lamp |
| `#gateA`, `#gateB` | Stage 1: the gate's inputs (B is hidden for NOT) |
| `#haA`, `#haB` | Stage 2: the half adder's inputs |
| `#faA`, `#faB`, `#faC` | Stage 3: the full adder's inputs (`#faC` is carry-in) |
| `#gatePick` | Stage 1: choose AND, OR, NOT or XOR |
| `#symbolToggle` | Show a gate as wired switches or as its symbol |
| `#package` | Fold the circuit back up into modules |
| `#expand` | Open a module one layer (adders down to gates; Gates stage down to switches) |
| `#a0`–`#a7`, `#b0`–`#b7` | Flip a bit of A or B (bit 0 = 1, bit 7 = 128) |
| `#cin` | Carry-in: add an extra 1 |
| `#aDec`, `#bDec` | Type A or B as a decimal number, 0–255 |
| `#aHex`, `#bHex` | Type A or B in hex, 00–FF |
| `#sum` | The 8-bit result in binary, decimal and hex |
| `#cout` | Carry-out: the true total was more than 255 |
| `#overflow` | Signed overflow: the answer doesn't fit in -128 to 127 |
| `#mode` | Instant, Slow or Step (Slow is the default) |
| `#step` | Next step: one more layer of gates (Step mode) |
| `#speed` | How fast Slow mode plays, 60–800 ms per gate |
| `#random` | Random values for A and B |
| `#reset` | Set everything back to 0 |
| `#zoom` | Pick a bit (0–7) to inspect in the zoom panel, or click a full adder in the chain |

Carry-out and overflow are different things; see [Overflow vs. carry-out](docs/page-text.md#overflow-vs-carry-out).

## Run it locally

It's a static page with no build step. Serve the folder and open it in a browser:

```sh
cd eight-bit-adder
python3 -m http.server 8000
```

Then visit <http://localhost:8000> for the ladder or <http://localhost:8000/classic.html> for the classic page.

You can also open the pages directly, but browsers block the page from reading `docs/` over `file://`, so you'll see short placeholder text instead of the full explanations and tooltips.

Handy for testing on the classic page: URL options such as `?stage=ripple&a=127&b=1&cin=0&mode=step&depth=1&zoom=7&gate=XOR` open the page in a given state.

## Files

```
eight-bit-adder/
├── README.md                this file
├── index.html               the 9-step workbench ladder
├── classic.html             the original five-stage simulator
├── css/
│   ├── app.css              classic page: layout and states on top of design/style.css
│   └── ladder.css           ladder page layout
├── js/
│   ├── sim.js               gate-level simulator: every value is computed gate by gate
│   ├── draw.js              draws each stage as SVG
│   ├── levels.js            the switches → gate → module animation
│   ├── text.js              loads docs/ text (with short fallbacks)
│   ├── app.js               classic page: state, inputs, timing modes, rendering
│   └── ladder/              the ladder: circuit.js (DC + logic solver), text.js (reads ladder-text.md),
│                            art.js, bench.js (tray, parts, wiring), app.js (steps, unlocks, saving)
├── docs/
│   ├── page-text.md         on-page paragraphs and truth tables (read by the page)
│   ├── ladder-text.md       step text for the ladder (read verbatim by index.html)
│   └── tooltips.json        tooltip text for every control, keyed by #id (read by the page)
├── design/
│   ├── style.css            the visual style
│   ├── LAYOUT.md            layout plan (bit order, phone vs. desktop)
│   ├── TRANSITIONS.md       the switches → gate → module transition
│   ├── CHANGES-2.md         second design review: what changed and what to apply
│   ├── CHANGES-2-ken.diff   the exact code edits proposed in that review
│   ├── wires.js             wire-drawing helpers: crossings, half-adder boxes, the full-width 8-bit gate view
│   ├── transitions.js       Expand/Package animations for stages 2–4 (reduced-motion safe)
│   ├── mockup.html, mockup-desktop.png, mockup-phone.png   early style mockup
│   ├── gates-preview.html/.png, parts-preview.html/.png    previews of the drawings
│   ├── transition-demo.html, transition-frames.png         transition demo and frames
│   ├── xor-relay-preview.html/.png                         the XOR relay circuit in all 4 input states
│   ├── review-*.png         renders of the app from the second design review
│   ├── CHANGES-3.md         third design review: the workbench art
│   ├── bench/               Henri's workbench art: bench.js (BENCH helpers), bench.css, bench-art.js,
│   │                        BENCH-PINS.md, ANIMATION.md, previews and mockups
│   ├── sounds/              Michael's sounds (mp3/ogg) and sfx.js
│   ├── gates/               AND, OR, NOT, XOR symbols (SVGs, gates.js, gates-gen.py, PINS.md)
│   └── parts/               battery, switch, lamp, ground, relays, transistor, and
│                            xor-relay.svg (the whole XOR gate built from relays)
│                            (SVGs, parts.js, parts-gen.py, PINS.md)
├── tests/
│   ├── addertest.js         ladder browser tests, then runs classictest.js (puppeteer-core + Chrome, port 8770)
│   ├── classictest.js       classic page browser tests
│   ├── laddercapture.js     captures the ladder screenshots in screenshots/
│   └── addercapture.js      captures the classic screenshots in shots/
├── screenshots/             ladder screenshots, desktop (1280) and phone (390)
└── shots/                   classic screenshots, a slow-mode video and test results
```

The explanation paragraphs and truth tables shown on the page are in [docs/page-text.md](docs/page-text.md).
