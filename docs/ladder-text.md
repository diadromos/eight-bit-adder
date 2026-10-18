# Ladder text

Text for the 9-step ladder version of the 8-bit adder. Plain and friendly, for a curious non-engineer.

**Format (for loading, like page-text.md):**
- Each section starts with a `## ` heading. Steps are `## Step N: Title` (N = 1 to 9). The other sections are `## Ladder intro` and `## Reset progress`.
- Inside a section, each field is one line that starts with a bold label: `**Intro:**`, `**Goal:**`, `**Hint:**`, `**Success:**`, `**What you learned:**`. Steps 6 and 8 also have one `**Goal (Name):**` line per gate or module (NOT, AND, OR, XOR; Half adder, Full adder). Step 7 has one `**Challenge N:**` line per challenge, in order; the page doesn't show these yet, so they double as a check on the targets and answers. A step can have more than one `**Hint:**` line; show them in order.
- `## Ladder intro` uses `**Intro:**` (one or more lines). `## Reset progress` uses `**Question:**`, `**Confirm:**` and `**Cancel:**`.
- Text in `{curly braces}` is a placeholder for the code to fill in.
- Field text is plain (no Markdown inside it), so it can go straight into a `<p>`, a button or a tooltip.

## Ladder intro

**Intro:** Nobody hands you a computer. You earn it, one honest piece at a time: a pile of metal and salt water that pushes a little current, a wire that carries it home, a switch, a magnet, a relay that obeys. Each part works or it doesn't, and the bulb does not lie. Climb nine steps, and at the top two numbers will add themselves.
**Intro:** Each step unlocks when the thing you built works. Everything you build stays yours and becomes a part for the next step.

## Step 1: Battery

**Intro:** A battery cell is just two different metals with something salty between them. Stack zinc, salt-soaked cloth and copper, over and over, and you have a voltaic pile, the first battery ever made. Each zinc and copper cell adds about 1 volt.
**Goal:** Stack cells until your pile reaches {targetVolts} volts. The meter shows your running total.
**Hint:** Cells stacked in a row add up: each one adds its push to the one before.
**Hint:** Keep every cell the same way round, zinc then copper. Flip one, and it pushes against the others.
**Success:** {volts} volts! Your pile has enough push to light a small bulb.
**What you learned:** Voltage is the push that makes electricity move. Next, give it somewhere to go.

## Step 2: Wire and bulb

**Intro:** Electricity only flows around a complete loop, out of one end of the battery and back into the other. Put a small flashlight bulb in that loop, the kind that needs only a little current, and it lights as the current passes through.
**Goal:** Wire the bulb into a closed loop with your battery so it lights.
**Hint:** The bulb has two contacts. One wire goes from the top of your pile to one contact, and another from the other contact back to the bottom.
**Hint:** Any gap anywhere in the loop stops the current everywhere.
**Success:** It's lit! Current is flowing all the way around the loop.
**What you learned:** A circuit is a closed loop. Next, you'll make a gap you can open and close on purpose.

## Step 3: Switch

**Intro:** A switch is a gap in the loop that you can close and open. Close it and current flows, so the bulb lights; open it and the bulb goes dark.
**Goal:** Add a switch to your loop, then turn the bulb on and off with it.
**Hint:** Put the switch anywhere in the loop. Since it's one loop, any spot works.
**Success:** On, off, on. You're in control of the current.
**What you learned:** Call lit 1 and dark 0, and you have a bit. Next, you'll find a way for electricity to flip a switch instead of your finger.

## Step 4: Electromagnet

**Intro:** Current flowing through a wire makes a little magnetism around it. Wind the wire into a coil around an iron nail and the nail becomes a magnet, but only while the current flows.
**Goal:** Build an electromagnet strong enough to pick up the iron piece, then switch it off and drop it.
**Hint:** More turns of wire make a stronger magnet.
**Hint:** Use insulated wire, so the current goes around the coil instead of jumping straight across the turns.
**Success:** It grabbed the iron, and let go when you switched off.
**What you learned:** Electricity can make something move. Next, that movement will flip a switch.

## Step 5: Relay

**Intro:** A relay is a switch flipped by an electromagnet: current in its coil pulls a springy iron arm that opens or closes contacts in a second, separate circuit. A normally open relay closes when its coil is on; a normally closed relay opens.
**Goal:** Use a switch in one circuit to light a bulb in another circuit through a relay, first with a normally open relay, then with a normally closed one.
**Hint:** The relay's coil goes in the first circuit, with your switch. Its contacts go in the second circuit, with the bulb.
**Hint:** With a normally closed relay, the bulb should be lit while your switch is off.
**Success:** One circuit is now controlling another, with no hands on the second one.
**What you learned:** Because one switch can control the next, switches can be wired together to make decisions. Next, you'll make your first ones.

## Step 6: Gates

**Intro:** A gate is a few relays wired so the bulb answers a simple question about its inputs. NOT uses a normally closed relay, AND puts two relays in a row (in series), OR puts them side by side (in parallel), and XOR is built from the others as (A OR B) AND NOT (A AND B).
**Goal:** Build NOT, AND, OR, and then XOR. Each gate is earned when it passes its whole truth table, every combination of inputs, and then it becomes a module.
**Goal (NOT):** Wire one normally closed relay so the bulb is on when the input is off, and off when it is on.
**Goal (AND):** Wire two relays in series so the bulb lights only when A and B are both on.
**Goal (OR):** Wire two relays in parallel so the bulb lights when A, B or both are on.
**Goal (XOR):** Combine your OR, AND and NOT so the bulb lights when exactly one input is on.
**Hint:** NOT: turning its input on pulls the normally closed switch open, so the output is the opposite of the input. AND lights only when A and B are both on; OR lights when either one is.
**Hint:** XOR means one or the other, but not both. Start with the OR and AND gates you already have, then send A AND B through a NOT.
**Success:** {gate} passes every row. It's now a module: one block you can drop into anything you build next.
**What you learned:** Once a part works, you can stop looking inside it and just use it. Next, you'll put gates to work on numbers.

## Step 7: Binary

**Intro:** Eight bulbs in a row can show any whole number from 0 to 255, because each bulb is worth twice the one to its right: 1, 2, 4, 8, 16, 32, 64 and 128. Add up the lit bulbs, and that's your number.
**Goal:** Make {target} by lighting the right bulbs.
**Challenge 1:** Make 13. That's 8 + 4 + 1, or 00001101.
**Challenge 2:** Make 29. That's 16 + 8 + 4 + 1, or 00011101.
**Challenge 3:** Make 42. That's 32 + 8 + 2, or 00101010.
**Hint:** Start with the biggest bulb that fits, light it, and see what's left. For example, 13: 8 fits, leaving 5; then 4, leaving 1; then 1.
**Hint:** The rightmost bulb is worth 1. Light all eight and you get 255.
**Success:** That's {target}, written {binary} in binary.
**What you learned:** Bits can stand for any number, not just on and off. Next, you'll build gates that add them.

## Step 8: Half adder, then full adder

**Intro:** A half adder adds two single bits, with an XOR gate for the sum and an AND gate for the carry. A full adder also takes in a carry from the column to its right, using two half adders and an OR gate.
**Goal:** Build a half adder from your own gates and pass its truth table, then build a full adder from two half adders and an OR, and pass its truth table.
**Goal (Half adder):** Use an XOR and an AND to add two bits, giving a sum and a carry, for all four input combinations.
**Goal (Full adder):** Use two half adders and an OR to add A, B and a carry-in, giving a sum and a carry-out, for all eight input combinations.
**Hint:** 1 + 1 is 2, which binary writes as 10: a 0 in this column and a 1 carried to the next. So send A and B into both an XOR (sum) and an AND (carry).
**Hint:** For the full adder, the first half adder adds A and B, and the second adds that result to the carry-in. If either one makes a carry, the OR passes it on as the carry-out.
**Success:** {module} passes every row and joins your parts.
**What you learned:** Your gates can now do arithmetic, one column at a time. Next, you'll line up eight columns.

## Step 9: 8-bit adder

**Intro:** To add two 8-bit numbers, line up eight full adders, one per column, the way you add numbers by hand from right to left. Each adder hands its carry-out to its left-hand neighbor, so one carry can ripple across the whole row.
**Goal:** Put a full adder in each of the eight slots, wire the carry chain, then set A to {a} and B to {b} and get the right sum.
**Hint:** Bit 0, worth 1, goes on the right; bit 7, worth 128, goes on the left. Each carry-out connects to the carry-in of the adder on its left.
**Hint:** If the true total is more than 255, it won't fit in 8 bits: the carry-out lights, and the sum shows the total minus 256. Signed overflow is something different: it's when the answer falls outside -128 to 127 if you read the bits as signed numbers.
**Success:** {a} + {b} = {sum}. You built an adder from a pile of metal and salt water.
**What you learned:** This is the same kind of adding every computer does, built from nothing but switches. From here, it's the same idea repeated, only faster and smaller.

## Reset progress

**Question:** Reset your progress? Every step after Step 1 will be locked again, and all your saved modules and progress will be cleared.
**Confirm:** Reset progress
**Cancel:** Keep my progress
