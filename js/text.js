/* ============================================================================
   ALL ON-PAGE TEXT LIVES HERE (and in Joseph's docs/ files).
   - Tooltips: docs/tooltips.json (Joseph), applied verbatim as title= on each #id.
   - Stage paragraphs and truth tables: docs/page-text.md (Joseph), the ```html blocks, verbatim.
   - FALLBACK below is only used for ids Joseph's files don't cover yet, or if the docs
     can't be fetched (e.g. the page opened from file://). Marked PLACEHOLDER.
   ============================================================================ */
(function (root) {
  'use strict';
  const FALLBACK = {
    tips: {
      // PLACEHOLDER: ids not in docs/tooltips.json yet (awaiting Joseph)
      '#haA': 'Input A for the half adder. Click to flip it between 0 and 1.',
      '#haB': 'Input B for the half adder. Click to flip it between 0 and 1.',
      '#faA': 'Input A for the full adder. Click to flip it between 0 and 1.',
      '#faB': 'Input B for the full adder. Click to flip it between 0 and 1.',
      '#faC': 'Carry-in for the full adder. Click to flip it between 0 and 1.'
    },
    // PLACEHOLDER: only shown if docs/page-text.md can't be loaded
    sections: {
      'Stage 0': { p: ['<p>A switch lights a lamp. Lit is 1, dark is 0.</p>'], tables: [] },
      'Stage 1': { p: ['<p>Switches wired together make gates.</p>'], tables: [] },
      'Modules': { p: ['<p>A working circuit can be packaged as a module and expanded again.</p>'], tables: [] },
      'Stage 2': { p: ['<p>A half adder adds two bits with XOR and AND.</p>'], tables: [] },
      'Stage 3': { p: ['<p>A full adder adds A, B and a carry-in.</p>'], tables: [] },
      'Stage 4': { p: ['<p>Eight full adders pass the carry from bit 0 to bit 7.</p>'], tables: [] },
      'Zoom': { p: ['<p>One full adder up close, with its truth table.</p>'], tables: [] },
      'Overflow': { p: ['<p>Carry-out and overflow are different.</p>', '<p>Carry-out: past 255. Overflow: outside -128 to 127.</p>'], tables: [] }
    }
  };

  /* Split page-text.md into "## " sections; collect ```html blocks (<p> vs <table>) and Markdown tables. */
  function parsePageText(md) {
    const out = {};
    md.split(/\n(?=## )/).forEach(function (sec) {
      const m = sec.match(/^## (.+)/); if (!m) return;
      const title = m[1].trim(), key = sectionKey(title);
      const s = { title, p: [], tables: [], mdTables: [] };
      const re = /```html\n([\s\S]*?)```/g; let b;
      while ((b = re.exec(sec))) { const h = b[1].trim(); (h.startsWith('<table') ? s.tables : s.p).push(h); }
      // Markdown tables that have no html block (e.g. Stage 0 "Switch states")
      const noCode = sec.replace(/```[\s\S]*?```/g, '');
      const tre = /((?:^\|.*\|\s*$\n?)+)/gm; let t;
      while ((t = tre.exec(noCode))) s.mdTables.push(mdTable(t[1]));
      out[key] = s;
    });
    return out;
  }
  function sectionKey(t) {
    if (/^Stage (\d)/.test(t)) return 'Stage ' + t.match(/^Stage (\d)/)[1];
    if (/^Modules/.test(t)) return 'Modules';
    if (/^Zoom/.test(t)) return 'Zoom';
    if (/^Overflow/.test(t)) return 'Overflow';
    return t;
  }
  function mdTable(src) {
    const rows = src.trim().split('\n').map(r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    const head = rows[0], body = rows.slice(2);
    return '<table><thead><tr>' + head.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' +
      body.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  }

  async function loadText() {
    const T = { tips: Object.assign({}, FALLBACK.tips), sections: FALLBACK.sections, source: 'fallback' };
    try {
      const [tj, md] = await Promise.all([
        fetch('docs/tooltips.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null),
        fetch('docs/page-text.md', { cache: 'no-cache' }).then(r => r.ok ? r.text() : null)
      ]);
      if (tj) { Object.assign(T.tips, tj); T.source = 'docs'; }
      if (md) T.sections = Object.assign({}, FALLBACK.sections, parsePageText(md));
    } catch (e) { /* file:// or offline: keep fallback */ }
    return T;
  }
  root.TEXT = { loadText, parsePageText, FALLBACK };
})(window);
