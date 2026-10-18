/* text.js: loads Joseph's docs/ladder-text.md and parses it exactly as documented at the top of that file.
   Every string the page shows from it is used verbatim; only {placeholders} are filled in (fill()). */
(function (root) {
  'use strict';
  function parse(md) {
    const out = { intro: [], steps: {}, reset: {} };
    md.split(/\n(?=## )/).forEach(sec => {
      const m = sec.match(/^## (.+)/); if (!m) return;
      const title = m[1].trim(), f = {};
      sec.split('\n').forEach(line => {
        const r = line.match(/^\*\*(.+?):\*\*\s?(.*)$/); if (!r) return;
        (f[r[1]] = f[r[1]] || []).push(r[2].trim());
      });
      const s = title.match(/^Step (\d+): (.+)$/);
      if (s) {
        const goals = {};
        Object.keys(f).forEach(k => { const g = k.match(/^Goal \((.+)\)$/); if (g) goals[g[1]] = f[k][0]; });
        out.steps[+s[1]] = { n: +s[1], title: s[2], intro: (f.Intro || [])[0] || '', goal: (f.Goal || [])[0] || '', goals,
          hints: f.Hint || [], success: (f.Success || [])[0] || '', learned: (f['What you learned'] || [])[0] || '' };
      } else if (/^Ladder intro/.test(title)) out.intro = f.Intro || [];
      else if (/^Reset progress/.test(title)) out.reset = { question: (f.Question || [])[0], confirm: (f.Confirm || [])[0], cancel: (f.Cancel || [])[0] };
    });
    return out;
  }
  const fill = (s, vars) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m));
  async function load() {
    const r = await fetch('docs/ladder-text.md', { cache: 'no-cache' });
    if (!r.ok) throw new Error('docs/ladder-text.md: HTTP ' + r.status);
    return parse(await r.text());
  }
  const API = { parse, fill, load };
  if (typeof module !== 'undefined') module.exports = API;
  root.LADDER_TEXT = API;
})(typeof window !== 'undefined' ? window : globalThis);
