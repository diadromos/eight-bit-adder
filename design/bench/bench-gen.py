# Generates the workbench art: design/bench/*.svg and bench-art.js (window.BENCH_ART).
# All SVG strings use single quotes only. Shared gradients/patterns live in DEFS (ids prefixed bn-);
# inline use: inject BENCH_ART.defs once per page (bench.js does it: BENCH.installDefs()).
import json, math, random
O='/workspace/eight-bit-adder/design/bench/'
R=random.Random(7)
f=lambda v: f'{v:.1f}'.rstrip('0').rstrip('.')

DEFS = """<svg xmlns='http://www.w3.org/2000/svg' width='0' height='0' style='position:absolute' aria-hidden='true' focusable='false'><defs>
<linearGradient id='bn-brass' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#6e4f16'/><stop offset='.28' stop-color='#d8b35a'/><stop offset='.46' stop-color='#fff0bd'/><stop offset='.62' stop-color='#c99a3a'/><stop offset='1' stop-color='#5e420f'/></linearGradient>
<linearGradient id='bn-brass-h' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#5e420f'/><stop offset='.3' stop-color='#d8b35a'/><stop offset='.45' stop-color='#fff0bd'/><stop offset='.65' stop-color='#b98a2e'/><stop offset='1' stop-color='#5e420f'/></linearGradient>
<radialGradient id='bn-brass-r' cx='.38' cy='.32' r='.75'><stop offset='0' stop-color='#fff6cf'/><stop offset='.35' stop-color='#e6c064'/><stop offset='.75' stop-color='#9c7224'/><stop offset='1' stop-color='#5b3f0e'/></radialGradient>
<radialGradient id='bn-washer' cx='.4' cy='.35' r='.8'><stop offset='0' stop-color='#f3dc98'/><stop offset='.6' stop-color='#b48a35'/><stop offset='1' stop-color='#6a4c16'/></radialGradient>
<linearGradient id='bn-copper' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#5a2510'/><stop offset='.35' stop-color='#d47c45'/><stop offset='.5' stop-color='#ffc8a0'/><stop offset='.7' stop-color='#b5602e'/><stop offset='1' stop-color='#4f200c'/></linearGradient>
<linearGradient id='bn-coil' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#5a2510'/><stop offset='.3' stop-color='#c86a32'/><stop offset='.45' stop-color='#f6b07a'/><stop offset='.7' stop-color='#a4501f'/><stop offset='1' stop-color='#4a1c08'/></linearGradient>
<linearGradient id='bn-coil-v' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#5a2510'/><stop offset='.3' stop-color='#c86a32'/><stop offset='.45' stop-color='#f6b07a'/><stop offset='.7' stop-color='#a4501f'/><stop offset='1' stop-color='#4a1c08'/></linearGradient>
<radialGradient id='bn-porcelain' cx='.35' cy='.25' r='.9'><stop offset='0' stop-color='#ffffff'/><stop offset='.45' stop-color='#f3efe5'/><stop offset='.85' stop-color='#d6cfbd'/><stop offset='1' stop-color='#b7ad97'/></radialGradient>
<linearGradient id='bn-porcelain-h' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#b9af9a'/><stop offset='.25' stop-color='#f6f2e9'/><stop offset='.4' stop-color='#ffffff'/><stop offset='.75' stop-color='#ddd6c4'/><stop offset='1' stop-color='#a49a84'/></linearGradient>
<linearGradient id='bn-slate' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#4a5058'/><stop offset='1' stop-color='#2a2e34'/></linearGradient>
<linearGradient id='bn-slate-edge' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#2a2e34'/><stop offset='1' stop-color='#17191d'/></linearGradient>
<linearGradient id='bn-iron' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#33373d'/><stop offset='.4' stop-color='#8b929b'/><stop offset='.55' stop-color='#a9b0b8'/><stop offset='1' stop-color='#3d4148'/></linearGradient>
<linearGradient id='bn-iron-h' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#33373d'/><stop offset='.4' stop-color='#8b929b'/><stop offset='.55' stop-color='#a9b0b8'/><stop offset='1' stop-color='#3d4148'/></linearGradient>
<linearGradient id='bn-woodpiece' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#a7703a'/><stop offset='.5' stop-color='#8a5527'/><stop offset='1' stop-color='#5f3714'/></linearGradient>
<linearGradient id='bn-woodedge' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#5f3714'/><stop offset='1' stop-color='#3a1f0a'/></linearGradient>
<linearGradient id='bn-handle' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#3e200b'/><stop offset='.35' stop-color='#a86a33'/><stop offset='.5' stop-color='#d39a5c'/><stop offset='1' stop-color='#4a260c'/></linearGradient>
<linearGradient id='bn-cardboard' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#4d321b'/><stop offset='.22' stop-color='#a77a49'/><stop offset='.42' stop-color='#e4c08c'/><stop offset='.72' stop-color='#a57444'/><stop offset='1' stop-color='#3f2814'/></linearGradient>
<linearGradient id='bn-label' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#6b2f1c'/><stop offset='.25' stop-color='#b4553a'/><stop offset='.42' stop-color='#d9785a'/><stop offset='.75' stop-color='#9c4630'/><stop offset='1' stop-color='#4f1f12'/></linearGradient>
<linearGradient id='bn-pitch' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#3a332c'/><stop offset='1' stop-color='#14110e'/></linearGradient>
<linearGradient id='bn-zinc' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#5c6266'/><stop offset='.45' stop-color='#c4cbcf'/><stop offset='1' stop-color='#6a7175'/></linearGradient>
<linearGradient id='bn-jar' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#cfe6e0' stop-opacity='.45'/><stop offset='.18' stop-color='#ffffff' stop-opacity='.16'/><stop offset='.5' stop-color='#bfe0d8' stop-opacity='.06'/><stop offset='.85' stop-color='#ffffff' stop-opacity='.12'/><stop offset='1' stop-color='#a9cfc6' stop-opacity='.5'/></linearGradient>
<linearGradient id='bn-liquid' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#8fb9ad' stop-opacity='.55'/><stop offset='1' stop-color='#4f8676' stop-opacity='.7'/></linearGradient>
<radialGradient id='bn-glass' cx='.38' cy='.32' r='.75'><stop offset='0' stop-color='#ffffff' stop-opacity='.10'/><stop offset='.7' stop-color='#dbe8ee' stop-opacity='.10'/><stop offset='.93' stop-color='#cfdde4' stop-opacity='.32'/><stop offset='1' stop-color='#ffffff' stop-opacity='.55'/></radialGradient>
<radialGradient id='bn-heat' cx='.5' cy='.5' r='.5'><stop offset='0' stop-color='#fff1c2' stop-opacity='.95'/><stop offset='.35' stop-color='#ffc35a' stop-opacity='.55'/><stop offset='1' stop-color='#ff9a2a' stop-opacity='0'/></radialGradient>
<radialGradient id='bn-flash' cx='.5' cy='.5' r='.5'><stop offset='0' stop-color='#ffffff'/><stop offset='.3' stop-color='#fff1b0' stop-opacity='.9'/><stop offset='1' stop-color='#ffb84a' stop-opacity='0'/></radialGradient>
<radialGradient id='bn-bakelite' cx='.35' cy='.25' r='1'><stop offset='0' stop-color='#6b3a1e'/><stop offset='.6' stop-color='#3b1d0d'/><stop offset='1' stop-color='#1f0e05'/></radialGradient>
<linearGradient id='bn-felt' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#1f3a2c'/><stop offset='1' stop-color='#2c4b3a'/></linearGradient>
<pattern id='bn-wood' patternUnits='userSpaceOnUse' width='420' height='96'>
 <rect width='420' height='96' fill='#8f5a2a'/>
 <rect width='420' height='96' fill='url(#bn-wood-tone)'/>
 GRAIN
</pattern>
<linearGradient id='bn-wood-tone' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#a46a34'/><stop offset='.3' stop-color='#8c5627'/><stop offset='.55' stop-color='#9c6430'/><stop offset='.8' stop-color='#7f4b20'/><stop offset='1' stop-color='#a46a34'/></linearGradient>
<radialGradient id='bn-vignette' cx='.5' cy='.45' r='.75'><stop offset='.55' stop-color='#000' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='.45'/></radialGradient>
<filter id='bn-shadow' x='-20%' y='-20%' width='140%' height='150%'><feDropShadow dx='0' dy='3' stdDeviation='2.6' flood-color='#1a0d03' flood-opacity='.55'/></filter>
<filter id='bn-blur' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='4'/></filter>
<filter id='bn-glowf' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='1.6' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter>
</defs></svg>"""
# wood grain: long wavy darker/lighter strands, tiled seamlessly (each strand is periodic in x over 420)
g=[]
for k in range(16):
    y=3+k*6+R.uniform(-1.5,1.5); amp=R.uniform(.8,2.6); ph=R.uniform(0,6.28); n=R.choice([1,2])
    pts=[(x, y+amp*math.sin(2*math.pi*n*x/420+ph)) for x in range(0,421,15)]
    d='M'+' L'.join(f'{f(x)} {f(yy)}' for x,yy in pts)
    col=R.choice(['#5e3412','#6a3b16','#b47a40','#c88c4c','#4f2a0d'])
    g.append(f"<path d='{d}' fill='none' stroke='{col}' stroke-width='{f(R.uniform(.5,1.6))}' opacity='{f(R.uniform(.25,.55))}'/>")
# a couple of knots-like lens shapes (periodic placement inside tile)
for (cx,cy) in [(120,40),(320,70)]:
    for r in range(1,5):
        g.append(f"<ellipse cx='{cx}' cy='{cy}' rx='{6+r*5}' ry='{1.4+r*1.3}' fill='none' stroke='#5a3010' stroke-width='.8' opacity='{f(.42-r*.07)}'/>")
DEFS=DEFS.replace('GRAIN','\n '.join(g))

def svg(cls,w,h,body,note,extra=''):
    return (f"<svg class='bn {cls}' viewBox='0 0 {w} {h}' width='{w}' height='{h}' overflow='visible'{extra}>"
            f"<!-- {note} -->{body}</svg>")

# ---------- reusable bits ----------
def screw(cx,cy,pin,r=5.2,cls=''):
    """binding screw seen from above: washer, slotted brass head. .slot rotates about (cx,cy)."""
    return (f"<g class='bn-screw {cls}' data-pin='{pin}'>"
            f"<circle cx='{cx}' cy='{cy+1.4}' r='{r+3.4}' fill='#000' opacity='.35'/>"
            f"<circle class='washer' cx='{cx}' cy='{cy}' r='{r+3}' fill='url(#bn-washer)' stroke='#5a3f10' stroke-width='.6'/>"
            f"<g class='wire-end' style='transform-origin:{cx}px {cy}px'></g>"
            f"<circle class='head' cx='{cx}' cy='{cy}' r='{r}' fill='url(#bn-brass-r)' stroke='#4e360b' stroke-width='.7'/>"
            f"<g class='slot' style='transform-origin:{cx}px {cy}px'><path d='M{f(cx-r*.8)} {cy} H{f(cx+r*.8)}' stroke='#3b2706' stroke-width='1.5' stroke-linecap='round'/>"
            f"<path d='M{f(cx-r*.8)} {f(cy+.7)} H{f(cx+r*.8)}' stroke='#fff2c0' stroke-width='.45' opacity='.7'/></g>"
            f"<circle class='pin-ring' cx='{cx}' cy='{cy}' r='{r+4.4}' fill='none'/></g>")

def base(x,y,w,h,mat='wood',edge=6,rx=6):
    """a base block seen slightly from above: top face + front edge."""
    top={'wood':'url(#bn-woodpiece)','slate':'url(#bn-slate)','porcelain':'url(#bn-porcelain)','bakelite':'url(#bn-bakelite)'}[mat]
    ed={'wood':'url(#bn-woodedge)','slate':'url(#bn-slate-edge)','porcelain':'#b6ad98','bakelite':'#160a03'}[mat]
    s=(f"<g class='bn-base' filter='url(#bn-shadow)'><rect x='{x}' y='{y+edge}' width='{w}' height='{h}' rx='{rx}' fill='{ed}'/>"
       f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='{rx}' fill='{top}'/></g>")
    if mat=='wood':
        for k in range(3):
            yy=y+h*(k+1)/4+R.uniform(-1,1)
            s+=f"<path d='M{x+4} {f(yy)} C{x+w*.3} {f(yy-1.5)} {x+w*.6} {f(yy+1.5)} {x+w-4} {f(yy)}' stroke='#5a3210' stroke-width='.7' opacity='.35' fill='none'/>"
    s+=f"<rect x='{x+1.5}' y='{y+1}' width='{w-3}' height='2' rx='1' fill='#fff' opacity='{.22 if mat!='slate' else .12}'/>"
    return s

def spark(cx,cy,cls='bn-spark'):
    pts=[]
    for i in range(16):
        a=i*math.pi/8; rr=11 if i%2==0 else 3.2
        if i%4==2: rr=7
        pts.append(f'{f(cx+rr*math.cos(a))},{f(cy+rr*math.sin(a))}')
    return (f"<g class='{cls}' style='transform-origin:{cx}px {cy}px' pointer-events='none'>"
            f"<circle class='flash' cx='{cx}' cy='{cy}' r='16' fill='url(#bn-flash)'/>"
            f"<polygon class='star' points='{' '.join(pts)}' fill='#fffbe6' stroke='#ffd166' stroke-width='.8'/></g>")

P={}; NOTES={}

# ---------- BULB: carbon filament lamp in a porcelain socket on a wood base ----------
def bulb_body(cx=45, cy=50, r=31):
    fil=(f"M{cx-5} 92 L{cx-6} 84 C{cx-16} 66 {cx-21} 44 {cx-10} 36 C{cx-3} 31 {cx+1} 40 {cx} 48 "
         f"C{cx-1} 40 {cx+3} 31 {cx+10} 36 C{cx+21} 44 {cx+16} 66 {cx+6} 84 L{cx+5} 92")
    s =(f"<g class='halo' pointer-events='none'><circle cx='{cx}' cy='{cy}' r='{r*2.1}' fill='url(#bn-heat)'/></g>"
        # glass envelope with the old-style exhaust tip on top, narrowing to the neck
        f"<path class='glass' d='M{cx-11} 90 C{cx-14} 82 {cx-r} 76 {cx-r} {cy} C{cx-r} {cy-r*.62} {cx-r*.55} {cy-r} {cx-3} {cy-r-1} L{cx-1.4} {cy-r-7} L{cx+1.4} {cy-r-7} L{cx+3} {cy-r-1} C{cx+r*.55} {cy-r} {cx+r} {cy-r*.62} {cx+r} {cy} C{cx+r} 76 {cx+14} 82 {cx+11} 90 Z' fill='url(#bn-glass)' stroke='#d9e6ea' stroke-opacity='.55' stroke-width='1'/>"
        f"<path class='warm' d='M{cx-11} 90 C{cx-14} 82 {cx-r} 76 {cx-r} {cy} C{cx-r} {cy-r*.62} {cx-r*.55} {cy-r} {cx} {cy-r} C{cx+r*.55} {cy-r} {cx+r} {cy-r*.62} {cx+r} {cy} C{cx+r} 76 {cx+14} 82 {cx+11} 90 Z' fill='#ffcf70'/>"
        # stem / lead-in wires
        f"<path d='M{cx-4} 96 L{cx-5} 92 M{cx+4} 96 L{cx+5} 92' stroke='#8a8f93' stroke-width='1.1'/>"
        f"<path d='M{cx-6} 92 C{cx-6} 88 {cx+6} 88 {cx+6} 92 L{cx+5} 97 L{cx-5} 97 Z' fill='#cfdde2' opacity='.5'/>"
        f"<g class='filament'><path class='fil-cold' d='{fil}' fill='none' stroke='#2a1a10' stroke-width='1.5' stroke-linecap='round'/>"
        f"<path class='fil-hot' d='{fil}' fill='none' stroke='#ff7a1a' stroke-width='1.7' stroke-linecap='round'/>"
        f"<path class='fil-white' d='{fil}' fill='none' stroke='#fff4c4' stroke-width='1.3' stroke-linecap='round'/></g>"
        # glass highlights
        f"<path d='M{cx-r+7} {cy+4} C{cx-r+6} {cy-10} {cx-r+12} {cy-20} {cx-12} {cy-r+6}' fill='none' stroke='#fff' stroke-width='3' stroke-linecap='round' opacity='.55'/>"
        f"<path d='M{cx+r-9} {cy-14} C{cx+r-7} {cy-9} {cx+r-6} {cy-3} {cx+r-6} {cy+3}' fill='none' stroke='#fff' stroke-width='1.6' stroke-linecap='round' opacity='.35'/>"
        f"<circle cx='{cx-14}' cy='{cy-17}' r='2.2' fill='#fff' opacity='.7'/>")
    # brass Edison screw base
    s+=f"<path d='M{cx-12} 96 H{cx+12} L{cx+11} 118 C{cx+6} 121 {cx-6} 121 {cx-11} 118 Z' fill='url(#bn-brass-h)' stroke='#5a3f10' stroke-width='.7'/>"
    for k in range(5):
        y=99+k*4
        s+=f"<path d='M{cx-12} {y} C{cx-4} {y+2.6} {cx+4} {y+2.6} {cx+12} {y-.6}' fill='none' stroke='#4e360b' stroke-width='1' opacity='.75'/><path d='M{cx-11} {y+1} C{cx-4} {y+3.4} {cx+4} {y+3.4} {cx+11} {y+.4}' fill='none' stroke='#fff3c4' stroke-width='.5' opacity='.6'/>"
    return s
def lamp():
    cx=45
    s=base(4,132,82,18,'wood')+screw(16,141,'a')+screw(74,141,'b')
    # porcelain socket
    s+=(f"<path d='M{cx-20} 120 H{cx+20} L{cx+22} 136 C{cx+12} 140 {cx-12} 140 {cx-22} 136 Z' fill='url(#bn-porcelain-h)' stroke='#9f9580' stroke-width='.7' filter='url(#bn-shadow)'/>"
        f"<ellipse cx='{cx}' cy='120' rx='20' ry='3.4' fill='#efe9dc' stroke='#9f9580' stroke-width='.6'/>"
        f"<path d='M{cx-17} 124 C{cx-8} 126 {cx+8} 126 {cx+17} 124' stroke='#fff' stroke-width='1.2' opacity='.8' fill='none'/>")
    s+=f"<g class='bulb'>{bulb_body(cx)}</g>"
    return svg('bn-lamp',90,152,s,"Carbon-filament lamp in a porcelain socket. viewBox 0 0 90 152. Pins: a (16,141), b (74,141). "
               "State: CSS var --heat 0..1 on the svg (or class on = 1). Layers: .halo, .glass, .warm, .filament(.fil-cold/.fil-hot/.fil-white), base screws .bn-screw.")
P['lamp']=lamp()
def mini_bulb():
    s=f"<g class='bulb' transform='translate(0 -6)'>{bulb_body(45)}</g>"
    return svg('bn-lamp bn-minibulb',90,118,s,"Bare carbon bulb (for the binary row). viewBox 0 0 90 118 (base tip at y=113). --heat 0..1.")
P['bulb']=mini_bulb()

# ---------- DRY CELL ----------
def dry_cell():
    x0,x1,y0,y1=10,62,30,136; cx=(x0+x1)/2
    s=f"<ellipse cx='{cx}' cy='{y1+2}' rx='30' ry='5' fill='#000' opacity='.35'/>"
    s+=f"<path d='M{x0} {y0} V{y1} C{x0+8} {y1+5} {x1-8} {y1+5} {x1} {y1} V{y0} Z' fill='url(#bn-cardboard)'/>"
    # printed label band
    s+=f"<path d='M{x0} 52 V112 C{x0+8} 115 {x1-8} 115 {x1} 112 V52 C{x1-8} 55 {x0+8} 55 {x0} 52 Z' fill='url(#bn-label)'/>"
    s+=f"<path d='M{x0} 56 C{x0+8} 59 {x1-8} 59 {x1} 56 M{x0} 108 C{x0+8} 111 {x1-8} 111 {x1} 108' stroke='#f3d9a0' stroke-width='.9' fill='none' opacity='.85'/>"
    s+=(f"<text x='{cx}' y='70' text-anchor='middle' font-family='Georgia,serif' font-size='7.5' font-weight='700' fill='#fbe7c0' letter-spacing='.5'>No. 6</text>"
        f"<text x='{cx}' y='83' text-anchor='middle' font-family='Georgia,serif' font-size='9.5' font-weight='700' fill='#fff1d0' letter-spacing='.6'>DRY</text>"
        f"<text x='{cx}' y='94' text-anchor='middle' font-family='Georgia,serif' font-size='9.5' font-weight='700' fill='#fff1d0' letter-spacing='.6'>CELL</text>"
        f"<text x='{cx}' y='104' text-anchor='middle' font-family='Georgia,serif' font-size='6' fill='#fbe7c0' letter-spacing='.4'>1½ VOLTS</text>")
    s+=f"<path d='M{x0+6} {y0+6} V{y1-4}' stroke='#fff' stroke-width='2.4' opacity='.18' stroke-linecap='round'/>"
    # top: pitch seal + rolled rim
    s+=f"<ellipse cx='{cx}' cy='{y0}' rx='26' ry='6' fill='url(#bn-pitch)' stroke='#7a5a36' stroke-width='1.6'/>"
    s+=f"<ellipse cx='{cx}' cy='{y0-.5}' rx='22' ry='4' fill='none' stroke='#5c4a38' stroke-width='.6' opacity='.7'/>"
    # posts: + carbon centre post with knurled nut, - zinc edge post
    def post(px,py,sign):
        return (f"<rect x='{px-3}' y='{py}' width='6' height='{y0-py+1}' fill='url(#bn-brass-h)'/>"
                f"<rect x='{px-5.5}' y='{py+4}' width='11' height='6' rx='1.5' fill='url(#bn-brass-h)' stroke='#5a3f10' stroke-width='.5'/>"
                + ''.join(f"<path d='M{f(px-4.5+i*1.8)} {py+4.5} V{py+9.5}' stroke='#5a3f10' stroke-width='.5' opacity='.6'/>" for i in range(6))
                +screw(px,py,sign,4.2))
    s+=post(cx,8,'+')+post(x1-8,14,'-')
    s+=(f"<text x='{cx-12}' y='12' font-family='Georgia,serif' font-size='9' font-weight='700' fill='#e9d6b0'>+</text>"
        f"<text x='{x1+1}' y='18' font-family='Georgia,serif' font-size='10' font-weight='700' fill='#e9d6b0'>−</text>")
    return svg('bn-drycell',72,144,s,"Dry cell, cardboard-wrapped. viewBox 0 0 72 144. Pins: + (36,8), - (54,14) (screw centres).")
P['dry-cell']=dry_cell()

# ---------- WET CELL ----------
def wet_cell():
    s="<ellipse cx='50' cy='126' rx='44' ry='5' fill='#000' opacity='.35'/>"
    s+="<path d='M12 34 V118 C12 124 88 124 88 118 V34' fill='url(#bn-liquid)' opacity='0'/>"
    s+="<path d='M13 56 V117 C13 123 87 123 87 117 V56 C70 59 30 59 13 56 Z' fill='url(#bn-liquid)'/>"
    s+="<ellipse cx='50' cy='56' rx='37' ry='3' fill='#cfe8df' opacity='.35'/>"
    # plates through the liquid: zinc rod and copper plate
    s+="<rect x='28' y='28' width='9' height='84' rx='3' fill='url(#bn-zinc)'/><rect x='60' y='28' width='14' height='80' rx='1.5' fill='url(#bn-copper)' opacity='.95'/>"
    s+="<rect x='28' y='56' width='9' height='56' rx='3' fill='#2c4b44' opacity='.35'/><rect x='60' y='56' width='14' height='52' fill='#2c4b44' opacity='.35'/>"
    for k in range(5): s+=f"<circle cx='{f(66+R.uniform(-4,4))}' cy='{f(66+k*9)}' r='{f(R.uniform(.8,1.6))}' fill='#e8fff8' opacity='.55'/>"
    # glass jar
    s+="<path d='M10 30 V118 C10 126 90 126 90 118 V30' fill='url(#bn-jar)' stroke='#d6ece6' stroke-opacity='.7' stroke-width='1.2'/>"
    s+="<path d='M16 36 V112' stroke='#fff' stroke-width='3' opacity='.4' stroke-linecap='round'/><path d='M84 40 V100' stroke='#fff' stroke-width='1.2' opacity='.3'/>"
    s+="<ellipse cx='50' cy='30' rx='40' ry='4.5' fill='none' stroke='#e2f2ee' stroke-width='1.6' opacity='.7'/>"
    # wooden lid bar
    s+="<g filter='url(#bn-shadow)'><rect x='4' y='19' width='92' height='12' rx='3' fill='url(#bn-woodpiece)'/><rect x='4' y='28' width='92' height='4' rx='2' fill='url(#bn-woodedge)'/></g>"
    s+="<path d='M8 23 C30 22 60 24.5 92 23' stroke='#5a3210' stroke-width='.7' opacity='.4' fill='none'/>"
    s+=screw(32,14,'-',4.4)+screw(67,14,'+',4.4)
    s+="<rect x='29' y='18' width='6' height='3' fill='url(#bn-brass-h)'/><rect x='64' y='18' width='6' height='3' fill='url(#bn-brass-h)'/>"
    s+=("<text x='18' y='12' font-family='Georgia,serif' font-size='10' font-weight='700' fill='#e9d6b0'>−</text>"
        "<text x='77' y='12' font-family='Georgia,serif' font-size='9' font-weight='700' fill='#e9d6b0'>+</text>")
    return svg('bn-wetcell',100,132,s,"Wet cell: glass jar, zinc rod (-) and copper plate (+), wooden lid. viewBox 0 0 100 132. Pins: - (32,14), + (67,14).")
P['wet-cell']=wet_cell()

# ---------- KNIFE SWITCH ----------
def knife():
    hx,hy=34,70          # hinge pivot
    s=base(4,74,152,20,'slate',7,7)
    s+=screw(16,84,'a')+screw(144,84,'b')
    # brass straps from screws to hinge / jaw
    s+=f"<path d='M16 84 H{hx}' stroke='url(#bn-brass)' stroke-width='5' opacity='.0'/>"
    s+=f"<rect x='22' y='81.5' width='{hx-18}' height='5' rx='1.5' fill='url(#bn-brass)' opacity='.9'/><rect x='118' y='81.5' width='22' height='5' rx='1.5' fill='url(#bn-brass)' opacity='.9'/>"
    # hinge clip: two brass cheeks, pivot rivet
    s+=f"<path d='M{hx-6} 84 V{hy-6} C{hx-6} {hy-10} {hx+6} {hy-10} {hx+6} {hy-6} V84 Z' fill='url(#bn-brass-h)' stroke='#5a3f10' stroke-width='.7'/>"
    # jaw clip (two springy cheeks)
    s+="<path d='M116 84 V62 C116 58 119 57 120 60 V84 Z M126 84 V62 C126 58 123 57 122 60 V84 Z' fill='url(#bn-brass-h)' stroke='#5a3f10' stroke-width='.7'/>"
    # the blade + handle, rotate about (hx,hy)
    L=88
    blade=(f"<rect x='{hx}' y='{hy-3}' width='{L}' height='6' rx='2' fill='url(#bn-copper)' stroke='#4f200c' stroke-width='.6'/>"
           f"<path d='M{hx+4} {hy-1.6} H{hx+L-4}' stroke='#ffd9bf' stroke-width='.8' opacity='.8'/>"
           # cross-bar + wooden handle rising from the tip
           f"<rect x='{hx+L-6}' y='{hy-5}' width='8' height='10' rx='2' fill='url(#bn-brass-h)' stroke='#5a3f10' stroke-width='.5'/>"
           f"<path d='M{hx+L-2} {hy-5} V{hy-14}' stroke='#5a3f10' stroke-width='3'/>"
           f"<rect x='{hx+L-7.5}' y='{hy-40}' width='11' height='28' rx='5.5' fill='url(#bn-handle)' stroke='#2e1606' stroke-width='.7'/>"
           f"<ellipse cx='{hx+L-2}' cy='{hy-40}' rx='6.5' ry='3.5' fill='#8a5427' stroke='#2e1606' stroke-width='.6'/>"
           f"<path d='M{hx+L-5} {hy-36} V{hy-16}' stroke='#f0c38c' stroke-width='1.3' opacity='.55' stroke-linecap='round'/>")
    s+=f"<g class='blade' style='transform-origin:{hx}px {hy}px'>{blade}</g>"
    s+=f"<circle cx='{hx}' cy='{hy}' r='3' fill='url(#bn-brass-r)' stroke='#4e360b' stroke-width='.6'/>"
    s+="<path d='M116 62 V60' stroke='none'/>"
    s+=spark(121,hy)
    return svg('bn-knife',160,104,s,f"Knife switch on a slate base. viewBox 0 0 160 104. Pins: a (16,84), b (144,84). "
               f"Blade pivot (hinge) ({hx},{hy}); closed = rotate(0), open = rotate(-38deg). Contact (spark) at (121,{hy}). Class closed on the svg closes it.")
P['knife-switch']=knife()

# ---------- NAIL ELECTROMAGNET + IRON PIECE ----------
def magnet():
    s=base(4,22,142,48,'wood',7,8)
    s+=screw(22,58,'a')+screw(128,58,'b')
    y=38
    # field glow (shown when on)
    s+=f"<g class='field' pointer-events='none'><ellipse cx='88' cy='{y}' rx='58' ry='22' fill='none' stroke='#ffc247' stroke-width='1.2' stroke-dasharray='3 5' opacity='.6'/><ellipse cx='88' cy='{y}' rx='72' ry='30' fill='none' stroke='#ffc247' stroke-width='1' stroke-dasharray='2 6' opacity='.4'/></g>"
    # nail: head at left, point at right (x=150)
    s+=f"<g filter='url(#bn-shadow)'><path d='M22 {y-2.6} H140 L152 {y} L140 {y+2.6} H22 Z' fill='url(#bn-iron)' stroke='#262a2f' stroke-width='.6'/>"
    s+=f"<rect x='16' y='{y-9}' width='7' height='18' rx='2' fill='url(#bn-iron-h)' stroke='#262a2f' stroke-width='.6'/></g>"
    # coil turns of enamelled copper wire
    turns=''
    for k in range(26):
        x=40+k*3.6
        turns+=f"<path d='M{f(x-1.2)} {y+8} C{f(x-3.2)} {y+3} {f(x-3.2)} {y-3} {f(x-1.2)} {y-8.4} C{f(x+.8)} {y-9.6} {f(x+2.4)} {y-6} {f(x+2.2)} {y-1}' fill='none' stroke='url(#bn-coil-v)' stroke-width='3.4' stroke-linecap='round'/>"
    s+=f"<g class='coil'><rect x='37' y='{y-9}' width='96' height='18' rx='6' fill='#6b2a0e'/>{turns}"
    s+=f"<path d='M38 {y-6} H132' stroke='#ffd0a8' stroke-width='1' opacity='.55'/></g>"
    # leads to the screws
    s+=f"<path d='M39 {y+8} C34 {y+14} 26 {y+14} 22 58' fill='none' stroke='url(#bn-coil)' stroke-width='1.8' stroke-linecap='round'/>"
    s+=f"<path d='M132 {y+8} C134 {y+14} 130 {y+14} 128 58' fill='none' stroke='url(#bn-coil)' stroke-width='1.8' stroke-linecap='round'/>"

    # iron piece (a small iron bar) resting on the bench to the right; slides left to the nail point when on
    s+=(f"<g class='iron' data-travel='-14'><ellipse cx='172' cy='{y+12}' rx='12' ry='2.4' fill='#000' opacity='.3'/>"
        f"<rect x='164' y='{y-8}' width='16' height='18' rx='2.5' fill='url(#bn-iron-h)' stroke='#22262b' stroke-width='.7'/>"
        f"<path d='M167 {y-6} V{y+8}' stroke='#c7cdd3' stroke-width='1' opacity='.5'/></g>")
    return svg('bn-magnet',190,90,s,"Nail electromagnet: iron nail with enamelled copper turns on a wood block, plus a loose iron piece. viewBox 0 0 190 90. "
               "Pins: a (22,58), b (128,58). Nail point (152,38). .iron rests at x=164 and travels translateX(-12px) to touch the point (overshoot -14 -> -12). Class on = energized.")
P['magnet']=magnet()
def iron_piece():
    s=("<ellipse cx='18' cy='26' rx='12' ry='2.4' fill='#000' opacity='.3'/><rect x='10' y='6' width='16' height='18' rx='2.5' fill='url(#bn-iron-h)' stroke='#22262b' stroke-width='.7'/>"
       "<path d='M13 8 V22' stroke='#c7cdd3' stroke-width='1' opacity='.5'/>")
    return svg('bn-iron',36,30,s,"Loose iron piece. viewBox 0 0 36 30.")
P['iron']=iron_piece()

# ---------- ARMATURE RELAY ----------
def relay():
    s=base(4,96,176,22,'wood',6,7)
    # terminals on the base: coil c1 c2, common, NC, NO
    for x,p in [(18,'c1'),(40,'c2'),(98,'com'),(134,'nc'),(166,'no')]: s+=screw(x,107,p,4.6)
    labels=[(18,'COIL'),(98,'COM'),(134,'NC'),(166,'NO')]
    for x,t in labels: s+=f"<text x='{x+ (11 if t=='COIL' else 0)}' y='126' text-anchor='middle' font-family='Georgia,serif' font-size='6.5' font-weight='700' fill='#f0d6a8' opacity='.85' letter-spacing='.6'>{t}</text>"
    # coil bobbin (vertical) with copper turns
    cx0,cx1,ty,by=44,78,34,98
    s+=f"<g class='coil'><rect x='{cx0-5}' y='{by-5}' width='{cx1-cx0+10}' height='6' rx='1.5' fill='#3b160a'/><rect x='{cx0-5}' y='{ty-1}' width='{cx1-cx0+10}' height='6' rx='1.5' fill='#3b160a'/>"
    s+=f"<rect x='{cx0}' y='{ty+5}' width='{cx1-cx0}' height='{by-ty-10}' fill='url(#bn-coil)'/>"
    for k in range(int((by-ty-10)/2.6)):
        yy=ty+6.3+k*2.6
        s+=f"<path d='M{cx0} {f(yy)} C{cx0+10} {f(yy+.9)} {cx1-10} {f(yy+.9)} {cx1} {f(yy)}' stroke='#4a1c08' stroke-width='.6' opacity='.55' fill='none'/>"
    s+=f"<path d='M{cx0+5} {ty+6} V{by-6}' stroke='#ffd0a8' stroke-width='1.6' opacity='.35'/></g>"
    # iron core top (pole face)
    s+=f"<rect x='{(cx0+cx1)/2-7}' y='{ty-6}' width='14' height='6' rx='1' fill='url(#bn-iron-h)' stroke='#22262b' stroke-width='.6'/>"
    # coil leads to c1/c2
    s+=f"<path d='M{cx0} {by-8} C30 {by-6} 20 100 18 107' fill='none' stroke='url(#bn-coil)' stroke-width='1.6'/><path d='M{cx0+4} {by-3} C44 100 41 103 40 107' fill='none' stroke='url(#bn-coil)' stroke-width='1.6'/>"
    # L-shaped iron yoke: under the coil and up its right side
    s+=f"<path d='M{cx0-6} {by} H96 V24 H88 V{by-6} H{cx0-6} Z' fill='url(#bn-iron-h)' stroke='#22262b' stroke-width='.7' filter='url(#bn-shadow)'/>"
    s+=f"<path d='M92 {by-2} V26' stroke='#c7cdd3' stroke-width='1' opacity='.4'/>"
    # common strap from yoke to the COM screw
    s+="<path d='M96 90 H100 V104' fill='none' stroke='url(#bn-brass-h)' stroke-width='3'/>"
    # NC contact: a brass post rising from the NC screw to just under the armature tip
    s+="<rect x='131.5' y='27' width='5' height='78' fill='url(#bn-brass-h)' stroke='#5a3f10' stroke-width='.5'/><rect x='129' y='25' width='10' height='4' rx='1.5' fill='url(#bn-brass-r)'/>"
    # NO contact: post up from the NO screw, then an arm over the tip with a contact screw pointing down
    s+="<path d='M163.5 105 V6 H136 V10 H168.5 V105 Z' fill='url(#bn-brass-h)' stroke='#5a3f10' stroke-width='.5'/>"
    s+="<rect x='131' y='9' width='10' height='6' rx='1.5' fill='url(#bn-brass-r)' stroke='#5a3f10' stroke-width='.5'/><path d='M133 12 H139' stroke='#3b2706' stroke-width='1'/>"
    # return spring from armature (x=118) down to a pin on the yoke foot... anchored on the base
    sp="M118 22 "+' '.join(f"L{f(118+(3 if k%2 else -3))} {f(25+k*4.2)}" for k in range(1,13))+" L118 80"
    s+=f"<g class='spring'><path d='{sp}' fill='none' stroke='#9aa3ab' stroke-width='1.3' stroke-linejoin='round'/></g>"
    s+="<rect x='115' y='80' width='6' height='18' fill='url(#bn-brass-h)' stroke='#5a3f10' stroke-width='.4'/>"
    # armature: pivots at the yoke top (92,20); lies over the pole face, tip contact rivet at x=134
    px,py=92,20
    arm=(f"<path d='M44 {py} H{px+4} L138 {py-1} C141 {py-1} 141 {py+3} 138 {py+3} L{px+4} {py+3.6} H44 C41 {py+3.6} 41 {py} 44 {py} Z' fill='url(#bn-iron)' stroke='#22262b' stroke-width='.7'/>"
         f"<rect x='46' y='{py-4}' width='38' height='4' rx='1' fill='url(#bn-iron)' stroke='#22262b' stroke-width='.5'/>"
         f"<circle cx='134' cy='{py+2}' r='2.6' fill='url(#bn-brass-r)'/><circle cx='134' cy='{py-0.4}' r='2.2' fill='url(#bn-brass-r)'/>")
    s+=f"<g class='armature' style='transform-origin:{px}px {py+2}px'>{arm}</g>"
    s+=f"<circle cx='{px}' cy='{py+2}' r='2.6' fill='url(#bn-brass-r)' stroke='#4e360b' stroke-width='.5'/>"
    s+=spark(134,14,'bn-spark spark-no')+spark(134,26,'bn-spark spark-nc')
    return svg('bn-relay',184,128,s,"Armature (clapper) relay. viewBox 0 0 184 128. Pins: c1 (18,107), c2 (40,107) coil; com (98,107); nc (134,107); no (166,107). "
               "Armature pivot (92,22): rest = rotate(0) tip on NC post (134,25); energized = rotate(-6.5deg) tip up against the NO screw (134,15). "
               "Spring .spring (stretches when energized). Sparks .spark-no at (134,14), .spark-nc at (134,26). Class energized on the svg.")
P['relay']=relay()

# ---------- SCREW TERMINAL (standalone, for the tightening animation) ----------
def terminal():
    s=base(2,18,44,16,'porcelain',5,8)
    s+=screw(24,26,'t',6)
    return svg('bn-terminal',48,42,s,"Binding-screw terminal on a porcelain block. viewBox 0 0 48 42. Pin t (24,26). .slot rotates about (24,26); BENCH.tighten() adds the wire loop under the washer.")
P['terminal']=terminal()

# ---------- SPARK (standalone) ----------
P['spark']=svg('bn-spark-solo',40,40,spark(20,20),"Spark: .flash (radial) + .star. viewBox 0 0 40 40, centre (20,20).")

# ---------- PARTS TRAY / DRAWER ----------
def tray(w=360,h=118):
    s=(f"<g filter='url(#bn-shadow)'><rect x='0' y='8' width='{w}' height='{h-8}' rx='8' fill='url(#bn-woodedge)'/>"
       f"<rect x='0' y='0' width='{w}' height='{h-12}' rx='8' fill='url(#bn-woodpiece)'/></g>")
    cols=4; cw=(w-24-(cols-1)*8)/cols
    for i in range(cols):
        x=12+i*(cw+8)
        s+=f"<rect x='{f(x)}' y='12' width='{f(cw)}' height='{h-36}' rx='5' fill='url(#bn-felt)' stroke='#3b2209' stroke-width='2'/>"
        s+=f"<path d='M{f(x+3)} 15 H{f(x+cw-3)}' stroke='#000' stroke-width='3' opacity='.35'/>"
    # front edge with a brass pull
    s+=f"<rect x='{w/2-26}' y='{h-21}' width='52' height='8' rx='4' fill='url(#bn-brass)' stroke='#5a3f10' stroke-width='.6'/>"
    s+=f"<circle cx='{w/2-20}' cy='{h-17}' r='1.6' fill='#5a3f10'/><circle cx='{w/2+20}' cy='{h-17}' r='1.6' fill='#5a3f10'/>"
    s+=f"<rect x='3' y='2' width='{w-6}' height='2.5' rx='1.2' fill='#fff' opacity='.2'/>"
    return svg('bn-tray',w,h,s,f"Parts tray (drawer) with {cols} felt compartments. viewBox 0 0 {w} {h}. Compartment i: x = 12 + i*{f(cw+8)}, y = 12, w = {f(cw)}, h = {h-36}.")
P['tray']=tray()

# ---------- BENCH TOP (background) ----------
def bench_top(w=1200,h=700):
    s=(f"<rect width='{w}' height='{h}' fill='url(#bn-wood)'/>"
       f"<rect width='{w}' height='{h}' fill='url(#bn-vignette)'/>")
    # plank seams
    for y in range(140,h,140): s+=f"<path d='M0 {y} H{w}' stroke='#3a1f0a' stroke-width='2' opacity='.55'/><path d='M0 {y+1.5} H{w}' stroke='#c08850' stroke-width='.8' opacity='.35'/>"
    return f"<svg class='bn bn-benchtop' viewBox='0 0 {w} {h}' preserveAspectRatio='xMidYMid slice' width='100%' height='100%'>{s}</svg>"
P['bench-top']=bench_top()

# ---------- write files ----------
for k,v in P.items():
    if k=='bench-top': body=v
    else: body=v
    # standalone files embed the defs so they render on their own
    sv=body.replace("<svg ","<svg xmlns='http://www.w3.org/2000/svg' ",1)
    defs_inner=DEFS[DEFS.index('<defs>'):DEFS.index('</defs>')+7]
    sv=sv.replace('>',''+'>'+defs_inner,1) if False else sv
    i=sv.index('>')+1
    sv=sv[:i]+defs_inner+sv[i:]
    open(O+k+'.svg','w').write(sv)
assert '"' not in DEFS and all('"' not in v for v in P.values())
open(O+'bench-art.js','w').write("// Generated by bench-gen.py. Workbench SVG strings (single quotes only). Classic script: window.BENCH_ART.\n"
  "// BENCH_ART.defs = one hidden <svg><defs> with every gradient/pattern/filter (ids bn-*); inject once per page (BENCH.installDefs()).\n"
  "// Parts: "+', '.join(P.keys())+". Pins and pivots: BENCH-PINS.md.\n"
  "(function(){var A="+json.dumps(dict(defs=DEFS,**P),indent=1)+";\n if(typeof window!=='undefined')window.BENCH_ART=A;\n if(typeof module!=='undefined')module.exports=A;})();\n")
print('ok',len(P))
