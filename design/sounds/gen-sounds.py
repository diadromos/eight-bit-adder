#!/usr/bin/env python3
"""gen-sounds.py: procedurally synthesizes every sound in this folder (numpy + ffmpeg, no samples).
Original work by Michael (sound design) for John Hall's 8-bit adder toy (early-20th-century workbench).
Run:  python3 gen-sounds.py   -> wav/ (16-bit masters), *.mp3 (96 kbps), *.ogg (Vorbis q4), all mono 44.1 kHz.
Deterministic: fixed seeds (OGG bytes still differ per run because Vorbis picks a random stream serial)."""
import numpy as np, subprocess, os, wave
SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
WAV = os.path.join(HERE, 'wav'); os.makedirs(WAV, exist_ok=True)

# ---------------- helpers ----------------
def t_(d): return np.arange(int(round(SR * d))) / SR
def place(buf, x, at):
    i = int(round(at * SR)); n = min(len(x), len(buf) - i)
    if n > 0: buf[i:i + n] += x[:n]
    return buf
def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s = (1 - a) * v + a * s; y[i] = s
    return y
def onepole_hp(x, fc): return x - onepole_lp(x, fc)
def bp(x, f0, q):
    w = 2 * np.pi * f0 / SR; al = np.sin(w) / (2 * q); c = np.cos(w); a0 = 1 + al
    b0, b2, a1, a2 = al / a0, -al / a0, -2 * c / a0, (1 - al) / a0
    y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
    for i, v in enumerate(x):
        o = b0 * v + b2 * x2 - a1 * y1 - a2 * y2; x2, x1, y2, y1 = x1, v, y1, o; y[i] = o
    return y
def modes(dur, partials, att=0.0004):
    """sum of decaying sines: partials = [(freq, amp, decay_s), ...] -> struck metal / wood"""
    t = t_(dur); x = np.zeros(len(t))
    for f, a, d in partials: x += a * np.sin(2 * np.pi * f * t + 0.3) * np.exp(-t / d)
    return x * (1 - np.exp(-t / att))
def tick(rng, dur=.012, fc=4000, q=1.5, d=.0015):
    t = t_(dur); return bp(rng.standard_normal(len(t)), fc, q) * np.exp(-t / d)
def mix(*xs):  # add arrays of different lengths
    out = np.zeros(max(len(x) for x in xs))
    for x in xs: out[:len(x)] += x
    return out
def trim_tail(x, thr_db=-50):
    thr = 10 ** (thr_db / 20) * np.max(np.abs(x)); idx = np.where(np.abs(x) > thr)[0]
    return x[:min(len(x), idx[-1] + int(.004 * SR))]
def trim_head(x, thr_db=-40):   # no leading silence: start at the first sample above -40 dB of peak (minus 0.3 ms)
    thr = 10 ** (thr_db / 20) * np.max(np.abs(x)); i = np.argmax(np.abs(x) > thr)
    return x[max(0, i - int(.0003 * SR)):]
def fade(x, fin=.0003, fout=.012):
    x = x.copy(); a, b = max(1, int(fin * SR)), int(fout * SR)
    x[:a] *= np.linspace(0, 1, a); x[-b:] *= np.linspace(1, 0, b) ** 2
    return x
def norm(x, peak_db=-1.0): return x / np.max(np.abs(x)) * 10 ** (peak_db / 20)

# ---------------- relay armature ----------------
def relay_engage(seed, f=(2150, 3420, 5730), body=185):
    rng = np.random.default_rng(seed); b = np.zeros(int(SR * .12))
    hit = modes(.08, [(f[0], 1, .012), (f[1], .7, .008), (f[2], .45, .005), (body, .6, .018)])
    place(b, mix(hit, tick(rng, .02, 5200, 1.2, .0012) * 1.4), 0)
    place(b, mix(.35 * modes(.04, [(f[0] * 1.04, 1, .006), (f[1] * .97, .6, .004)]), .5 * tick(rng, .01, 4500, 1.5, .0008)), .0065 + .002 * rng.random())  # contact bounce
    place(b, .12 * modes(.03, [(f[0] * 1.02, 1, .004)]), .013 + .002 * rng.random())                                                                     # second, smaller bounce
    return b
def relay_release(seed, f=(1650, 2700), body=150):   # spring pulls the armature back: duller, lighter
    rng = np.random.default_rng(seed); b = np.zeros(int(SR * .1))
    place(b, onepole_lp(mix(modes(.07, [(f[0], 1, .008), (f[1], .45, .005), (body, .7, .014)]), .6 * tick(rng, .015, 2600, 1.0, .0015)), 3500), 0)
    place(b, .18 * onepole_lp(modes(.03, [(f[0] * 1.05, 1, .005)]), 3000), .009)
    return b

# ---------------- knife switch ----------------
def knife_close():  # blade swings into the brass jaws: short scrape, solid clack, wooden-base thunk, faint jaw ring
    rng = np.random.default_rng(41); b = np.zeros(int(SR * .32))
    n = t_(.028); scrape = bp(rng.standard_normal(len(n)), 3100, 2.0) * (n / .028) ** 1.5 * .35
    place(b, scrape, 0)
    hit = modes(.25, [(960, .8, .03), (1630, 1, .025), (2840, .6, .015), (4410, .3, .008), (118, .9, .035), (240, .4, .02)])
    place(b, mix(hit, 1.2 * tick(rng, .02, 3600, 1.0, .0015)), .026)
    place(b, .25 * modes(.2, [(1630 * 1.003, 1, .09), (2840 * 1.002, .5, .06)]), .03)            # jaw ring-out
    return b
def knife_open():   # blade pulled out of the jaws: a release "tchk" + metal-on-metal slide, no base thunk
    rng = np.random.default_rng(42); b = np.zeros(int(SR * .26))
    place(b, mix(modes(.12, [(1700, 1, .015), (2950, .6, .01), (4500, .25, .006), (300, .3, .01)]), tick(rng, .015, 3800, 1.2, .001)), 0)
    n = t_(.09); slide = bp(rng.standard_normal(len(n)), 4200, 3.0) * np.sin(np.pi * n / .09) ** 2 * .22
    place(b, slide, .015)
    place(b, .15 * modes(.15, [(1700 * 1.004, 1, .06)]), .02)
    return b

# ---------------- spark ----------------
def spark():        # small DC spark when a circuit closes: dense crackle that thins out, plus a faint "zt" buzz
    rng = np.random.default_rng(51); dur = .2; b = np.zeros(int(SR * dur))
    tt = 0.0
    while tt < dur * .85:
        dens = np.exp(-tt / .035)
        place(b, (.4 + .6 * dens) * rng.uniform(.4, 1) * tick(rng, .006, rng.uniform(3000, 9000), 1.2, rng.uniform(.0002, .0007)), tt)
        tt += rng.exponential(.0012 + .012 * (1 - dens))
    z = t_(.05); buzz = bp(rng.standard_normal(len(z)), 1800, 4) * np.exp(-z / .015) * (1 + np.sign(np.sin(2 * np.pi * 360 * z))) * .25
    return place(onepole_hp(b, 800), buzz, 0)

# ---------------- electromagnet ----------------
def magnet_snap():  # iron armature/keeper jumps onto the pole piece: short whip-in, hard iron clank, low ring
    rng = np.random.default_rng(61); b = np.zeros(int(SR * .3))
    w = t_(.018); place(b, bp(rng.standard_normal(len(w)), 1500, 1.5) * (w / .018) ** 2 * .25, 0)
    clank = modes(.28, [(1210, 1, .03), (2890, .7, .02), (4630, .35, .01), (6900, .15, .005), (212, .9, .05), (430, .35, .03)])
    place(b, mix(clank, 1.4 * tick(rng, .015, 4200, 1.0, .0010)), .016)
    place(b, .3 * modes(.04, [(1210 * 1.03, 1, .006), (2890, .5, .004)]), .022)            # tiny rebound
    return b

# ---------------- binding post ----------------
def binding_post():  # knurled brass nut spun down on its thread: ~7 fine ratchet ticks over friction, then a firm "tock" when tight
    rng = np.random.default_rng(71); b = np.zeros(int(SR * .40))
    times = np.cumsum([0] + list(np.linspace(.03, .046, 6) * rng.uniform(.9, 1.1, 6)))
    for k, tt in enumerate(times):
        place(b, (.35 + .05 * k) * mix(tick(rng, .01, 3300 + 150 * rng.standard_normal(), 2.5, .0012), .4 * modes(.02, [(2600 + 80 * k, 1, .003)])), tt)
    f = t_(times[-1] + .02); fr = onepole_lp(bp(rng.standard_normal(len(f)), 2200, .8), 5000) * .06 * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * f) ** 2)
    place(b, fr, 0)
    place(b, mix(modes(.12, [(1900, 1, .015), (3300, .5, .01), (420, .5, .02)]), .8 * tick(rng, .012, 3000, 1.2, .001)), times[-1] + .04)
    return b

# ---------------- lamp filament ----------------
HUM_PERIOD, HUM_LEN = 1.0, 1.25
def hum_loop():
    """faint filament/dynamo hum, PERIODIC with period exactly 1.000 s: 120 Hz family (integer cycles per second) plus
    noise shaped in the frequency domain (circular). The file is 1.25 s of that periodic signal, so ANY 1.000 s window
    loops sample-exactly: play with loopStart=0.1, loopEnd=1.1 (immune to MP3/Vorbis encoder delay and tail padding)."""
    rng = np.random.default_rng(81); N = int(SR * HUM_PERIOD); t = np.arange(int(SR * HUM_LEN)) / SR
    x = sum(a * np.sin(2 * np.pi * f * t + p) for f, a, p in [(120, 1, 0), (240, .45, 1.1), (360, .22, 2.3), (480, .1, .4), (600, .05, 1.7)])
    x *= 1 + .06 * np.sin(2 * np.pi * 3 * t)                     # slow 3 Hz waver (integer -> still seamless)
    F = np.fft.rfft(rng.standard_normal(N)); fr = np.fft.rfftfreq(N, 1 / SR)
    F *= np.exp(-((fr - 2500) / 1500) ** 2)                       # faint airy "fizz" of the filament
    noise = np.fft.irfft(F, N); noise /= np.max(np.abs(noise)); noise = np.tile(noise, 2)[:len(t)]
    return x / np.max(np.abs(x)) + .08 * noise
def warmup_tick():  # filament warming: tiny "tink" of the glass/filament + a soft rising glow tone
    rng = np.random.default_rng(82); b = np.zeros(int(SR * .2))
    place(b, mix(modes(.08, [(5200, 1, .01), (7900, .4, .005)]) * .6, .5 * tick(rng, .006, 6500, 2, .0006)), 0)
    g = t_(.18); f = 220 + 120 * (g / .18); tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * g / .18) ** 2 * .12
    place(b, tone + .05 * np.sin(2 * np.pi * 2 * np.cumsum(f) / SR) * np.sin(np.pi * g / .18) ** 2, .005)
    return b

# ---------------- bells ----------------
def desk_bell():    # nickel counter/desk bell: struck dome, inharmonic partials, slow beating pairs
    rng = np.random.default_rng(91); f0 = 2120
    P = [(1.0, 1, .9), (1.0006, .6, .85), (2.76, .45, .35), (2.762, .25, .3), (5.40, .22, .12), (8.93, .1, .05), (.507, .12, .5)]
    b = modes(1.6, [(f0 * r, a, d) for r, a, d in P], att=.0003)
    return mix(b, .5 * tick(rng, .01, 6000, 1, .0006))
def brass_bell():   # small brass hand bell (lower, warmer, a gentle second tap)
    rng = np.random.default_rng(92); f0 = 1320; b = np.zeros(int(SR * 1.7))
    P = [(1.0, 1, .7), (1.0011, .5, .65), (2.0, .35, .4), (2.66, .3, .25), (3.2, .15, .15), (5.0, .08, .06)]
    place(b, mix(modes(1.6, [(f0 * r, a, d) for r, a, d in P]), .4 * tick(rng, .01, 4000, 1, .0008)), 0)
    place(b, .32 * modes(1.4, [(f0 * r, a, d) for r, a, d in P]), .19)
    return b

SOUNDS = {
    'relay-engage-a':     lambda: relay_engage(11),
    'relay-engage-b':     lambda: relay_engage(12, (2380, 3710, 6150), 205),
    'relay-release-a':    lambda: relay_release(13),
    'relay-release-b':    lambda: relay_release(14, (1820, 2960), 165),
    'knife-switch-close': knife_close,
    'knife-switch-open':  knife_open,
    'spark-crackle':      spark,
    'magnet-snap':        magnet_snap,
    'binding-post-screw': binding_post,
    'lamp-warmup-tick':   warmup_tick,
    'filament-hum-loop':  hum_loop,
    'bell-desk':          desk_bell,
    'bell-brass':         brass_bell,
}

def write_wav(path, x):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).round().astype('<i2').tobytes())

if __name__ == '__main__':
    for name, fn in SOUNDS.items():
        x = fn().astype(float)
        if name == 'filament-hum-loop':
            x = norm(x); x[:int(.01 * SR)] *= np.linspace(0, 1, int(.01 * SR))   # 1.25 s periodic; 10 ms fade-in sits outside the loop window
        else:
            x = norm(fade(trim_tail(trim_head(norm(x))), fout=.06 if name.startswith('bell') else .012))
        wp = os.path.join(WAV, name + '.wav'); write_wav(wp, x)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wp, '-c:a', 'libmp3lame', '-b:a', '96k', os.path.join(HERE, name + '.mp3')], check=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wp, '-c:a', 'libvorbis', '-q:a', '4', os.path.join(HERE, name + '.ogg')], check=True)
        print(f'{name:20s} {len(x) / SR * 1000:6.0f} ms')
