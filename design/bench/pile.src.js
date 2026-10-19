/* voltaic pile, drawn for any number of cells (inlined into bench-art.js by bench-gen.py as BENCH_ART.pile).
   cells = [{flip:bool}, ...] bottom to top; opt.cls = extra classes on the root (e.g. 'big', 'one', 'on', 'short').
   viewBox 0 0 90 160 (cropped to 2 100 86 58 with cls 'one'; same as the old stand-in, so overlays that use height/160 keep working).
   Pins: '-' (16,147) from the bottom plate, '+' (74,147) from the top plate. Each cell is g.cell[data-cell=i]
   (.flipped when copper is at the bottom) holding .zn / .cloth.card / .cu bands; the stack spans x 20..70. */
function (cells, opt) {
  cells = cells || []; opt = opt || {};
  var n = cells.length, X0 = 20, X1 = 70, RX = 25, RY = 3.4, BASE = 129;
  var ch = n ? Math.min(15, 90 / n) : 15, dz = ch * 0.36, dc = ch * 0.28;
  var F = function (v) { return (Math.round(v * 10) / 10).toString(); };
  // a band of the cylinder (side face) from yt (top) to yb (bottom): both edges are the front halves of ellipses
  var band = function (yt, yb, fill, cls, stroke) {
    return "<path class='" + cls + "' d='M" + X0 + ' ' + F(yt) + ' A' + RX + ' ' + RY + ' 0 0 0 ' + X1 + ' ' + F(yt) + ' L' + X1 + ' ' + F(yb) +
      ' A' + RX + ' ' + RY + ' 0 0 1 ' + X0 + ' ' + F(yb) + " Z' fill='" + fill + "' stroke='" + (stroke || 'rgba(20,10,4,.45)') + "' stroke-width='.35'/>";
  };
  var rim = function (y, col, op) { return "<path d='M" + (X0 + 1) + ' ' + F(y + .4) + ' A' + (RX - 1) + ' ' + (RY - .4) + ' 0 0 0 ' + (X1 - 1) + ' ' + F(y + .4) + "' fill='none' stroke='" + col + "' stroke-width='.6' opacity='" + op + "'/>"; };
  // .one (a single cell in the tray): no frame, and the viewBox is cropped to the plinth and the discs
  var one = /(^|\s)one(\s|$)/.test(opt.cls || ''), vb = one ? "2 100 86 58' width='86' height='58" : "0 0 90 160' width='90' height='160";
  var s = "<svg class='bn bn-pile" + (opt.cls ? ' ' + opt.cls : '') + "' viewBox='" + vb + "' overflow='visible' role='img' aria-label='Voltaic pile, " + n + " cell" + (n === 1 ? '' : 's') + "'>";
  // plinth: top face + front face, with a damp brine stain under the stack
  s += "<g class='plinth' filter='url(#bn-shadow)'><rect x='3' y='134' width='84' height='23' rx='4' fill='url(#bn-woodedge)'/><rect x='3' y='126' width='84' height='14' rx='5' fill='url(#bn-woodpiece)'/></g>";
  s += "<rect x='5' y='127' width='80' height='1.6' rx='.8' fill='#fff' opacity='.25'/><path d='M8 145 C30 143.5 60 146.5 82 144.6' stroke='#2a1606' stroke-width='.6' opacity='.5' fill='none'/>";
  if (n) s += "<ellipse class='stain' cx='45' cy='131' rx='" + F(29 + Math.min(n, 6)) + "' ry='4.2' fill='#3b2410' opacity='.45'/>";
  // back glass rod (behind the stack)
  s += "<rect class='rod back frame' x='43' y='16' width='4' height='114' rx='2' fill='url(#bn-glassrod)' opacity='.75'/>";
  // bottom plate (brass disc) with a tab to the - screw. Class 'pile-plate', not 'plate': the ladder's .bn-part .plate is its HTML name label (position/translate)
  s += "<path d='M22 133 C19 136 16 138 16 144' stroke='url(#bn-brass-h)' stroke-width='3' fill='none' stroke-linecap='round'/>";
  s += band(BASE, BASE + 3.4, 'url(#bn-brass-h)', 'pile-plate bottom', '#5a3f10');
  s += "<ellipse cx='45' cy='" + BASE + "' rx='" + RX + "' ry='" + RY + "' fill='url(#bn-brass)' stroke='#5a3f10' stroke-width='.4'/>";
  var y = BASE;
  cells.forEach(function (c, i) {
    var L = c && c.flip ? [['url(#bn-cu-h)', 'cu', dz], ['url(#bn-card-h)', 'cloth card', dc], ['url(#bn-zn-h)', 'zn', dz]]
                        : [['url(#bn-zn-h)', 'zn', dz], ['url(#bn-card-h)', 'cloth card', dc], ['url(#bn-cu-h)', 'cu', dz]];
    var top = y - ch, g = "<g class='cell" + (c && c.flip ? ' flipped' : '') + "' data-cell='" + i + "'>";
    // invisible hit box first so getBBox() covers the whole cell
    g += "<rect class='cell-box' x='" + X0 + "' y='" + F(top) + "' width='" + (X1 - X0) + "' height='" + F(ch) + "' fill='none'/>";
    L.forEach(function (l) {
      var yb = y, yt = y - l[2];
      g += band(yt, yb, l[0], l[1]);
      if (l[1] === 'cu') g += rim(yt, '#ffd9b8', .7);
      else if (l[1] === 'zn') g += rim(yt, '#f2f6f8', .55);
      else { // brine-soaked card: darker wet edge, a bead of brine on the side
        g += rim(yt, '#c9b48e', .35);
        var dx = X0 + 6 + ((i * 17) % 34);
        g += "<path class='brine' d='M" + dx + ' ' + F(yb + RY * .55) + ' q1.3 2.4 0 3.4 q-1.3 -1 0 -3.4z' + "' fill='#d9e6e0' opacity='.55'/>";
      }
      y = yt;
    });
    s += g + '</g>';
  });
  // top plate + pressure screw down from the yoke
  var tp = y - 3;
  s += band(tp, y, 'url(#bn-brass-h)', 'pile-plate top', '#5a3f10');
  s += "<ellipse cx='45' cy='" + F(tp) + "' rx='" + RX + "' ry='" + RY + "' fill='url(#bn-brass)' stroke='#5a3f10' stroke-width='.4'/>";
  s += "<ellipse cx='45' cy='" + F(tp) + "' rx='" + (RX - 6) + "' ry='" + (RY - 1.2) + "' fill='none' stroke='#fff0bd' stroke-width='.5' opacity='.5'/>";
  // + lead: copper wire from the top-plate tab, round the outside of the right rod, down to the + screw
  s += "<path class='lead plus' d='M69 " + F(tp + 1.5) + ' C78 ' + F(tp + 1) + ' 84 ' + F(tp + 6) + ' 84 ' + F(tp + 18) + " L84 128 C84 136 78 138 74 144' fill='none' stroke='url(#bn-coil)' stroke-width='1.9' stroke-linecap='round'/>";
  s += "<circle cx='69' cy='" + F(tp + 1.5) + "' r='1.6' fill='url(#bn-brass-r)'/>";
  s += "<g class='frame'>";
  s += "<rect class='press' x='43' y='20' width='4' height='" + F(Math.max(0, tp - 21)) + "' fill='url(#bn-brass-h)' stroke='#5a3f10' stroke-width='.3'/>";
  for (var k = 22; k < tp - 2; k += 2.2) s += "<path d='M43 " + F(k) + " L47 " + F(k + 1) + "' stroke='#6e4f16' stroke-width='.35' opacity='.6'/>";
  s += "<rect x='40' y='" + F(tp - 3) + "' width='10' height='3' rx='1' fill='url(#bn-brass-h)' stroke='#5a3f10' stroke-width='.3'/>";
  // front glass rods + wooden yoke with brass collars and the knurled pressure knob
  s += "<rect class='rod' x='11' y='16' width='5' height='114' rx='2.5' fill='url(#bn-glassrod)'/><rect class='rod' x='74' y='16' width='5' height='114' rx='2.5' fill='url(#bn-glassrod)'/>";
  s += "<path d='M12.3 20 V126 M75.3 20 V126' stroke='#fff' stroke-width='.8' opacity='.55'/>";
  s += "<g class='yoke' filter='url(#bn-shadow)'><rect x='5' y='10' width='80' height='11' rx='5.5' fill='url(#bn-woodpiece)' stroke='#3a1f0a' stroke-width='.5'/></g>";
  s += "<rect x='8' y='11' width='74' height='1.4' rx='.7' fill='#fff' opacity='.22'/>";
  s += "<ellipse cx='13.5' cy='21' rx='4.4' ry='1.6' fill='url(#bn-brass)'/><ellipse cx='76.5' cy='21' rx='4.4' ry='1.6' fill='url(#bn-brass)'/>";
  s += "<ellipse cx='13.5' cy='10.4' rx='3.4' ry='1.3' fill='url(#bn-brass-r)'/><ellipse cx='76.5' cy='10.4' rx='3.4' ry='1.3' fill='url(#bn-brass-r)'/>";
  s += "<rect x='38' y='2' width='14' height='9' rx='2.5' fill='url(#bn-brass-h)' stroke='#5a3f10' stroke-width='.5'/>";
  for (var q = 40; q <= 50; q += 2) s += "<path d='M" + q + " 3 V10' stroke='#6e4f16' stroke-width='.5' opacity='.7'/>";
  s += '</g>';
  // binding screws on the plinth front, engraved signs
  s += "{SCREW:-:16:147}{SCREW:+:74:147}";
  s += "<text x='27' y='150.5' font-family='Georgia,serif' font-size='8' font-weight='700' fill='#f0d6a8' opacity='.85'>\u2212</text><text x='58' y='150.5' font-family='Georgia,serif' font-size='8' font-weight='700' fill='#f0d6a8' opacity='.85'>+</text>";
  return s + '</svg>';
}
