# On-page text

Plain explanation paragraphs for each stage of the 8-bit adder (Stage 0, switches, through Stage 4, the ripple-carry adder), plus the modules idea, the zoom panel and a note on overflow vs. carry-out. Each section gives the text in Markdown and as an exact HTML snippet to paste verbatim. Tooltips live in [tooltips.json](tooltips.json).

## Stage 0: Switches

Every part of this adder is made from one simple thing: a switch. Close the switch and current flows, so the lamp lights up. Open it and the lamp goes dark. Call lit 1 and dark 0, and you have a bit. In a real computer, no finger flips the switch. It's a transistor, or a relay in early machines, flipped by electricity coming from another switch. Because one switch can control the next, switches can be wired together to make decisions.

HTML to paste:

```html
<p>Every part of this adder is made from one simple thing: a switch. Close the switch and current flows, so the lamp lights up. Open it and the lamp goes dark. Call lit 1 and dark 0, and you have a bit. In a real computer, no finger flips the switch. It's a transistor, or a relay in early machines, flipped by electricity coming from another switch. Because one switch can control the next, switches can be wired together to make decisions.</p>
```

Switch states:

| Switch | Lamp |
|:-:|:-:|
| open | off (0) |
| closed | on (1) |

```html
<table>
  <thead><tr><th>Switch</th><th>Lamp</th></tr></thead>
  <tbody>
    <tr><td>open</td><td>off (0)</td></tr>
    <tr><td>closed</td><td>on (1)</td></tr>
  </tbody>
</table>
```

## Stage 1: Gates

A gate is a few switches wired so the lamp answers a simple question about its inputs. AND puts two switches in a row, so the lamp lights only when A and B are both on. OR puts them side by side, so either one will do. NOT uses a normally-closed relay: turning its input on pulls the switch open, so the output is the opposite of the input. XOR means one or the other, but not both. It is built from the other three: (A OR B) AND NOT (A AND B).

HTML to paste:

```html
<p>A gate is a few switches wired so the lamp answers a simple question about its inputs. AND puts two switches in a row, so the lamp lights only when A and B are both on. OR puts them side by side, so either one will do. NOT uses a normally-closed relay: turning its input on pulls the switch open, so the output is the opposite of the input. XOR means one or the other, but not both. It is built from the other three: (A OR B) AND NOT (A AND B).</p>
```

### Gate truth tables

**AND (two switches in series)**

| A | B | A AND B |
|:-:|:-:|:-:|
| 0 | 0 | 0 |
| 0 | 1 | 0 |
| 1 | 0 | 0 |
| 1 | 1 | 1 |

```html
<table>
  <thead><tr><th>A</th><th>B</th><th>A AND B</th></tr></thead>
  <tbody>
    <tr><td>0</td><td>0</td><td>0</td></tr>
    <tr><td>0</td><td>1</td><td>0</td></tr>
    <tr><td>1</td><td>0</td><td>0</td></tr>
    <tr><td>1</td><td>1</td><td>1</td></tr>
  </tbody>
</table>
```

**OR (two switches in parallel)**

| A | B | A OR B |
|:-:|:-:|:-:|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 1 |

```html
<table>
  <thead><tr><th>A</th><th>B</th><th>A OR B</th></tr></thead>
  <tbody>
    <tr><td>0</td><td>0</td><td>0</td></tr>
    <tr><td>0</td><td>1</td><td>1</td></tr>
    <tr><td>1</td><td>0</td><td>1</td></tr>
    <tr><td>1</td><td>1</td><td>1</td></tr>
  </tbody>
</table>
```

**NOT (one normally-closed switch)**

| A | NOT A |
|:-:|:-:|
| 0 | 1 |
| 1 | 0 |

```html
<table>
  <thead><tr><th>A</th><th>NOT A</th></tr></thead>
  <tbody>
    <tr><td>0</td><td>1</td></tr>
    <tr><td>1</td><td>0</td></tr>
  </tbody>
</table>
```

**XOR (one or the other, not both)**

| A | B | A XOR B |
|:-:|:-:|:-:|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

```html
<table>
  <thead><tr><th>A</th><th>B</th><th>A XOR B</th></tr></thead>
  <tbody>
    <tr><td>0</td><td>0</td><td>0</td></tr>
    <tr><td>0</td><td>1</td><td>1</td></tr>
    <tr><td>1</td><td>0</td><td>1</td></tr>
    <tr><td>1</td><td>1</td><td>0</td></tr>
  </tbody>
</table>
```

**XOR built from AND, OR and NOT** (each step worked out; the last two columns always match)

| A | B | A OR B | A AND B | NOT (A AND B) | (A OR B) AND NOT (A AND B) | A XOR B |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| 0 | 1 | 1 | 0 | 1 | 1 | 1 |
| 1 | 0 | 1 | 0 | 1 | 1 | 1 |
| 1 | 1 | 1 | 1 | 0 | 0 | 0 |

```html
<table>
  <thead><tr><th>A</th><th>B</th><th>A OR B</th><th>A AND B</th><th>NOT (A AND B)</th><th>(A OR B) AND NOT (A AND B)</th><th>A XOR B</th></tr></thead>
  <tbody>
    <tr><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td></tr>
    <tr><td>0</td><td>1</td><td>1</td><td>0</td><td>1</td><td>1</td><td>1</td></tr>
    <tr><td>1</td><td>0</td><td>1</td><td>0</td><td>1</td><td>1</td><td>1</td></tr>
    <tr><td>1</td><td>1</td><td>1</td><td>1</td><td>0</td><td>0</td><td>0</td></tr>
  </tbody>
</table>
```

## Modules built from modules

Once a gate works, you don't need to watch its switches anymore. Package it, and it becomes a single block with inputs and an output. The half adder is built from gate blocks, the full adder from half adder blocks, and the 8-bit adder from full adder blocks. Engineers call this abstraction: once you trust a part, you think about what it does, not how it does it. Nothing is hidden for good, though. Expand any block to open it back up: the adders open down to their gates, and the Gates stage opens all the way down to switches.

HTML to paste:

```html
<p>Once a gate works, you don't need to watch its switches anymore. Package it, and it becomes a single block with inputs and an output. The half adder is built from gate blocks, the full adder from half adder blocks, and the 8-bit adder from full adder blocks. Engineers call this abstraction: once you trust a part, you think about what it does, not how it does it. Nothing is hidden for good, though. Expand any block to open it back up: the adders open down to their gates, and the Gates stage opens all the way down to switches.</p>
```

## Stage 2: Half adder

A half adder adds two single bits, A and B. There are only four cases. 0 + 0 is 0. 0 + 1 and 1 + 0 are both 1. And 1 + 1 is 2, which binary writes as 10: a 0 in this column and a 1 carried to the next. Two gates do all the work. The XOR gate makes the sum bit: it gives 1 when exactly one input is 1. The AND gate makes the carry: it gives 1 only when both inputs are 1.

Truth table:

| A | B | Sum (XOR) | Carry (AND) |
|:-:|:-:|:-:|:-:|
| 0 | 0 | 0 | 0 |
| 0 | 1 | 1 | 0 |
| 1 | 0 | 1 | 0 |
| 1 | 1 | 0 | 1 |

HTML table:

```html
<table>
  <thead><tr><th>A</th><th>B</th><th>Sum (XOR)</th><th>Carry (AND)</th></tr></thead>
  <tbody>
    <tr><td>0</td><td>0</td><td>0</td><td>0</td></tr>
    <tr><td>0</td><td>1</td><td>1</td><td>0</td></tr>
    <tr><td>1</td><td>0</td><td>1</td><td>0</td></tr>
    <tr><td>1</td><td>1</td><td>0</td><td>1</td></tr>
  </tbody>
</table>
```

HTML to paste:

```html
<p>A half adder adds two single bits, A and B. There are only four cases. 0 + 0 is 0. 0 + 1 and 1 + 0 are both 1. And 1 + 1 is 2, which binary writes as 10: a 0 in this column and a 1 carried to the next. Two gates do all the work. The XOR gate makes the sum bit: it gives 1 when exactly one input is 1. The AND gate makes the carry: it gives 1 only when both inputs are 1.</p>
```

## Stage 3: Full adder

A half adder has no way to take in a carry from the column to its right. A full adder fixes that by adding three bits: A, B and a carry-in. It is built from two half adders. The first adds A and B. The second adds that result to the carry-in, giving the final sum bit. If either half adder produces a carry, the OR gate passes it on as the carry-out. Three 1s make 3, which is binary 11: sum 1, carry 1.

Truth table:

| A | B | Carry-in | Sum | Carry-out |
|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 0 | 0 | 0 |
| 0 | 0 | 1 | 1 | 0 |
| 0 | 1 | 0 | 1 | 0 |
| 0 | 1 | 1 | 0 | 1 |
| 1 | 0 | 0 | 1 | 0 |
| 1 | 0 | 1 | 0 | 1 |
| 1 | 1 | 0 | 0 | 1 |
| 1 | 1 | 1 | 1 | 1 |

HTML table (also used by the zoom panel):

```html
<table>
  <thead><tr><th>A</th><th>B</th><th>Carry-in</th><th>Sum</th><th>Carry-out</th></tr></thead>
  <tbody>
    <tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
    <tr><td>0</td><td>0</td><td>1</td><td>1</td><td>0</td></tr>
    <tr><td>0</td><td>1</td><td>0</td><td>1</td><td>0</td></tr>
    <tr><td>0</td><td>1</td><td>1</td><td>0</td><td>1</td></tr>
    <tr><td>1</td><td>0</td><td>0</td><td>1</td><td>0</td></tr>
    <tr><td>1</td><td>0</td><td>1</td><td>0</td><td>1</td></tr>
    <tr><td>1</td><td>1</td><td>0</td><td>0</td><td>1</td></tr>
    <tr><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr>
  </tbody>
</table>
```

HTML to paste:

```html
<p>A half adder has no way to take in a carry from the column to its right. A full adder fixes that by adding three bits: A, B and a carry-in. It is built from two half adders. The first adds A and B. The second adds that result to the carry-in, giving the final sum bit. If either half adder produces a carry, the OR gate passes it on as the carry-out. Three 1s make 3, which is binary 11: sum 1, carry 1.</p>
```

## Stage 4: 8-bit ripple-carry adder

To add two 8-bit numbers, line up eight full adders, one per column, the way you add numbers by hand from right to left. Bit 0, worth 1, sits on the right; bit 7, worth 128, sits on the left. Each adder hands its carry-out to the carry-in of its left-hand neighbor, so one carry can ripple across the whole row. The carry-in switch feeds the rightmost adder, and whatever carries out of bit 7 lights the carry-out. Try Step or Slow mode to watch the carry travel.

HTML to paste:

```html
<p>To add two 8-bit numbers, line up eight full adders, one per column, the way you add numbers by hand from right to left. Bit 0, worth 1, sits on the right; bit 7, worth 128, sits on the left. Each adder hands its carry-out to the carry-in of its left-hand neighbor, so one carry can ripple across the whole row. The carry-in switch feeds the rightmost adder, and whatever carries out of bit 7 lights the carry-out. Try Step or Slow mode to watch the carry travel.</p>
```

## Zoom panel

The zoom panel shows one full adder up close. Pick a bit position from 0 to 7 to see that column's two half adders and its OR gate, with the current value on every wire. The truth table lists all eight ways its three inputs can be set, and the row that matches right now is highlighted. For bit 0, the carry-in comes from the carry-in switch. For every other bit, it comes from the carry-out of the bit to its right.

The zoom panel uses the full adder truth table above.

HTML to paste:

```html
<p>The zoom panel shows one full adder up close. Pick a bit position from 0 to 7 to see that column's two half adders and its OR gate, with the current value on every wire. The truth table lists all eight ways its three inputs can be set, and the row that matches right now is highlighted. For bit 0, the carry-in comes from the carry-in switch. For every other bit, it comes from the carry-out of the bit to its right.</p>
```

## Overflow vs. carry-out

Carry-out and overflow ask two different questions about the same 8 bits. Read as unsigned, 8 bits hold 0 to 255, and carry-out lights when the total is bigger: 200 + 100 = 300, so the sum shows 44 (300 - 256) with carry-out on. Read as signed (two's complement), they hold -128 to 127, with bit 7 as the sign. Overflow lights when the signed answer won't fit: 100 + 50 = 150, which reads as -106, so overflow is on and carry-out is off. That only happens when both inputs share a sign and the sum's sign differs; in circuit terms, carry into bit 7 XOR carry out of bit 7. Carry-in adds 1 more: 127 + 0 with carry-in on gives 128, read as -128, an overflow.

HTML to paste:

```html
<p>Carry-out and overflow ask two different questions about the same 8 bits. Read as unsigned, 8 bits hold 0 to 255, and carry-out lights when the total is bigger: 200 + 100 = 300, so the sum shows 44 (300 - 256) with carry-out on. Read as signed (two's complement), they hold -128 to 127, with bit 7 as the sign. Overflow lights when the signed answer won't fit: 100 + 50 = 150, which reads as -106, so overflow is on and carry-out is off. That only happens when both inputs share a sign and the sum's sign differs; in circuit terms, carry into bit 7 XOR carry out of bit 7. Carry-in adds 1 more: 127 + 0 with carry-in on gives 128, read as -128, an overflow.</p>
```

One-line version (usable as a tooltip):

> Carry-out means the unsigned total went past 255; overflow means the signed answer fell outside -128 to 127. Either can happen without the other.

```html
<p>Carry-out means the unsigned total went past 255; overflow means the signed answer fell outside -128 to 127. Either can happen without the other.</p>
```

### Worked checks

| Inputs | Carry-in | True total | 8-bit sum | Signed reading | Carry-out | Overflow |
|---|:-:|:-:|:-:|---|:-:|:-:|
| 200 + 100 | 0 | 300 | 44 | -56 + 100 = 44 | on | off |
| 100 + 50 | 0 | 150 | 150 | 100 + 50 reads as -106 | off | on |
| 255 + 0 | 1 | 256 | 0 | -1 + 0 + 1 = 0 | on | off |
| 127 + 0 | 1 | 128 | 128 | 127 + 0 + 1 reads as -128 | off | on |
| 128 + 128 | 0 | 256 | 0 | -128 + -128 reads as 0 | on | on |
