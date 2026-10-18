/* design/wires.js — small SVG/schematic helpers for the 8-bit adder (classic script, sets window.WIRES).
   No dependencies; uses the classes in design/style.css.

   WIRES.hop(x1, y, x2, crossXs, r=5)          horizontal wire path "M.. H.." with a semicircle bridge over each x in crossXs
   WIRES.hopV(x, y1, y2, crossYs, r=5)         same for a vertical wire (bridge bulges to the right)
   WIRES.gap(d)                                '<path class="wire-gap" d="..."/>' (draw right before the crossing wire)
   WIRES.group(x, y, w, h, label, attrs)       dashed half-adder box with a label tab on its top edge (SVG string)
   WIRES.schematic(canvasEl, opts)             wraps Ken's gate-level 8-bit svg in the full-width .schem frame:
        opts = { onClose: fn, title: '8-bit adder', subtitle: 'gate level' }
        - header: title, phone swipe hint, 2x4 minimap (7..4 over 3..0, like the drawing), Close button
        - inserts a .cell-bg card behind every <g class="cell" data-bit="i"> (consistent spacing + bit framing)
        - minimap chips carry data-w="s<i>" so app.js render() lights them with the sum bit
        - chip click scrolls that adder into view (phone) and flashes its card
        - legend: 0 / 1 / not yet computed / carry spine
        returns the .schem element (call again after re-rendering the svg; it is idempotent per element)
*/
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hop(x1, y, x2, crossXs, r) {
    r = r || 5; const dir = x2 >= x1 ? 1 : -1;
    const xs = (crossXs || []).slice().sort((a, b) => dir * (a - b));
    let d = `M${x1} ${y}`;
    xs.forEach(x => { d += ` H${x - dir * r} A${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${x + dir * r} ${y}`; });
    return d + ` H${x2}`;
  }
  function hopV(x, y1, y2, crossYs, r) {
    r = r || 5; const dir = y2 >= y1 ? 1 : -1;
    const ys = (crossYs || []).slice().sort((a, b) => dir * (a - b));
    let d = `M${x} ${y1}`;
    ys.forEach(y => { d += ` V${y - dir * r} A${r} ${r} 0 0 ${dir > 0 ? 0 : 1} ${x} ${y + dir * r}`; });
    return d + ` V${y2}`;
  }
  const gap = d => `<path class="wire-gap" d="${d}"/>`;
  function group(x, y, w, h, label, attrs) {
    attrs = attrs || '';
    let s = `<rect class="group" ${attrs} x="${x}" y="${y}" width="${w}" height="${h}"/>`;
    if (label) {
      const tw = Math.round(label.length * 5.6 + 14);
      s += `<rect class="group-tab" ${attrs} x="${x + 12}" y="${y - 8}" width="${tw}" height="16"/>` +
           `<text class="group-label" ${attrs} x="${x + 12 + tw / 2}" y="${y + 3}" text-anchor="middle">${label}</text>`;
    }
    return s;
  }

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function schematic(canvas, opts) {
    opts = opts || {};
    if (!canvas) return null;
    let box = canvas.closest('.schem');
    const svg = canvas.querySelector('svg');
    if (!box) {
      box = el('div', 'schem');
      canvas.parentNode.insertBefore(box, canvas);
      const head = el('div', 'schem-head');
      head.appendChild(el('h3', 'schem-title', `${opts.title || '8-bit adder'} <small>${opts.subtitle || 'gate level · carry flows right to left'}</small>`));
      head.appendChild(el('span', 'schem-hint', 'swipe ↔'));
      const map = el('div', 'schem-map'); map.setAttribute('role', 'group'); map.setAttribute('aria-label', 'Jump to bit');
      [7, 6, 5, 4, 3, 2, 1, 0].forEach(i => {
        const b = el('button', '', String(i)); b.type = 'button'; b.dataset.bit = i; b.dataset.w = 's' + i;
        b.setAttribute('aria-label', 'Show bit ' + i); map.appendChild(b);
      });
      head.appendChild(map);
      const close = el('button', 'btn schem-close', 'Close'); close.type = 'button'; close.setAttribute('aria-label', 'Close gate-level view');
      close.addEventListener('click', () => opts.onClose && opts.onClose());
      head.appendChild(close);
      box.appendChild(head);
      box.appendChild(canvas);
      box.appendChild(el('div', 'schem-legend', '<span><i></i>0</span><span><i class="l1"></i>1</span><span><i class="lx"></i>not computed yet</span><span><i class="lc"></i>carry chain c0 → c8</span>'));
      map.addEventListener('click', e => { const b = e.target.closest('button[data-bit]'); if (b) focusBit(box, +b.dataset.bit); });
      canvas.addEventListener('scroll', () => trackVisible(box), { passive: true });
      root.addEventListener('resize', () => trackVisible(box));
    }
    canvas.classList.add('schem-canvas');
    canvas.classList.remove('detail');
    if (svg) addCellCards(svg);
    requestAnimationFrame(() => trackVisible(box));
    return box;
  }

  // a rounded card behind each full adder, sized from the cell's own geometry plus its pins/labels
  function addCellCards(svg) {
    if (svg.querySelector('.cell-bg')) return;
    const svgM = svg.getScreenCTM && svg.getScreenCTM(); if (!svgM) return;
    const inv = svgM.inverse(), first = svg.firstChild;
    svg.querySelectorAll('g.cell[data-bit]').forEach(g => {
      const b = g.getBBox(), m = inv.multiply(g.getScreenCTM());
      const pts = [[b.x, b.y], [b.x + b.width, b.y + b.height]].map(([x, y]) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }));
      const x0 = Math.min(pts[0].x, pts[1].x), x1 = Math.max(pts[0].x, pts[1].x), y0 = Math.min(pts[0].y, pts[1].y), y1 = Math.max(pts[0].y, pts[1].y);
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('class', 'cell-bg'); r.dataset.bit = g.dataset.bit;
      // pads: top covers "bit i" + A/B pins (y-60), right covers the B input pin, bottom the S output label
      r.setAttribute('x', x0 - 8); r.setAttribute('y', y0 - 62); r.setAttribute('width', x1 - x0 + 30); r.setAttribute('height', y1 - y0 + 62 + 70);
      svg.insertBefore(r, first);
    });
  }

  function focusBit(box, i) {
    const canvas = box.querySelector('.schem-canvas'), card = box.querySelector(`.cell-bg[data-bit="${i}"]`);
    if (!card) return;
    if (canvas.scrollWidth > canvas.clientWidth + 2) {
      const cr = canvas.getBoundingClientRect(), r = card.getBoundingClientRect();
      canvas.scrollTo({ left: canvas.scrollLeft + (r.left + r.width / 2) - (cr.left + cr.width / 2), behavior: reduce() ? 'auto' : 'smooth' });
    }
    card.classList.remove('flash'); void card.getBBox(); card.classList.add('flash');
  }

  function trackVisible(box) {
    const canvas = box.querySelector('.schem-canvas'); if (!canvas) return;
    const cr = canvas.getBoundingClientRect();
    box.querySelectorAll('.cell-bg[data-bit]').forEach(c => {
      const r = c.getBoundingClientRect(), vis = r.right > cr.left + 24 && r.left < cr.right - 24;
      const chip = box.querySelector(`.schem-map button[data-bit="${c.dataset.bit}"]`);
      if (chip) chip.classList.toggle('vis', vis);
    });
  }

  root.WIRES = { hop, hopV, gap, group, schematic, focusBit };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.WIRES;
})(typeof window !== 'undefined' ? window : globalThis);
