"""Música y efectos sintetizados (originales, sin muestras con licencia) + mezcla final a -14 LUFS.

Uso: python sonido.py plan.json carpeta   (usa carpeta/voz.wav si existe)
Salida: carpeta/mezcla.wav
- Música: base suave de acordes (pad + pulsos de marimba) cuyo ánimo sale de la hora/lugar de cada escena,
  5–10 dB debajo de la voz y con ducking mientras se habla.
- Efectos: whoosh en cada cambio de escena, golpe grave en destello/chispas/caer, puf en polvo, ding en signo.
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

SR = 48000
R = np.random.default_rng(7)


def env(n, a=0.01, r=0.2):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lp(x, k):
    # filtro paso bajo de un polo (k 0..1, menor = más oscuro)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc += k * (x[i] - acc); y[i] = acc
    return y


def nota(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def pad(freqs, dur, vol=0.12):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.0, 0.12):
            x += np.sin(2 * np.pi * f * (1 + det / 100) * t + R.random() * 6)
    return x * vol / (len(freqs) * 3) * env(n, 0.4, 0.6)


def marimba(f, dur=0.35, vol=0.18):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 9) + 0.3 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 30)
    return x * vol


def whoosh(dur=0.45, vol=0.25):
    n = int(dur * SR); x = R.standard_normal(n)
    t = np.linspace(0, 1, n); k = 0.02 + 0.25 * np.sin(np.pi * t) ** 2
    y = np.empty(n); acc = 0.0
    for i in range(n):
        acc += k[i] * (x[i] - acc); y[i] = acc
    return y * vol * np.sin(np.pi * t) ** 1.5 * 3


def golpe(vol=0.6):
    n = int(0.5 * SR); t = np.arange(n) / SR
    f = 110 * np.exp(-t * 7) + 45
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8)
    x += lp(R.standard_normal(n), 0.2) * np.exp(-t * 30) * 0.5
    return x * vol


def puf(vol=0.3):
    n = int(0.6 * SR); t = np.arange(n) / SR
    return lp(R.standard_normal(n), 0.06) * np.exp(-t * 6) * vol * 2


def ding(vol=0.22):
    n = int(0.8 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1318 * t) + 0.4 * np.sin(2 * np.pi * 2637 * t)) * np.exp(-t * 5) * vol


def poner(buf, x, t):
    i = int(t * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i]; buf[i: i + len(x)] += x


# progresiones por ánimo (midi de la raíz de cada acorde, mayor/menor)
ANIMO = {
    "dia": [(60, "M"), (67, "M"), (69, "m"), (65, "M")],
    "atardecer": [(57, "m"), (65, "M"), (60, "M"), (67, "M")],
    "noche": [(57, "m"), (53, "M"), (55, "M"), (52, "m")],
}


def acorde(root, q):
    return [root, root + (4 if q == "M" else 3), root + 7]


def main(plan_path, carpeta):
    plan = json.load(open(plan_path, encoding="utf-8"))
    esc = plan["escenas"]
    total = max(e["inicio"] + e["duracion"] for e in esc) + 0.3
    n = int(total * SR)
    mus, sfx = np.zeros(n, np.float32), np.zeros(n, np.float32)
    beat = 60 / 100  # 100 bpm
    noir = plan.get("estilo") == "noir"
    # música: un acorde por compás (4 tiempos), ánimo según la escena en ese momento
    t, k = 0.0, 0
    if noir:
        # cine negro: colchón grave y lento en menor, notas sueltas de piano, latido suave y lluvia en exteriores de noche
        prog = [(57, "m"), (53, "M"), (50, "m"), (52, "M")]
        while t < total:
            root, q = prog[k % 4]; ch = acorde(root, q)
            poner(mus, pad([nota(m - 24) for m in ch] + [nota(root - 12)], 8.8, 0.16), t)
            for j in range(2):
                f = nota(ch[int(R.integers(0, 3))] + 12)
                n2 = int(3.5 * SR); tt = np.arange(n2) / SR
                pia = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt) + 0.12 * np.sin(6 * np.pi * f * tt)) * np.exp(-tt * 1.4) * 0.07
                poner(mus, pia, t + j * 4 + R.random() * 1.5)
            t += 8; k += 1
        for e in esc:
            amb = e.get("ambiente", {})
            if amb.get("hora") == "noche" and amb.get("lugar") not in ("interior", "habitacion", "oficina", "tribunal", "carcel") and not e.get("titulo"):
                n2 = int(e["duracion"] * SR)
                if n2 > 0:
                    lluvia = np.convolve(R.standard_normal(n2), np.ones(6) / 6, mode="same") * 0.05 * env(n2, 0.6, 0.6)
                    poner(sfx, lluvia, e["inicio"])
            elif amb.get("hora") == "noche" and not e.get("titulo"):
                for kk in range(int(e["duracion"] // 1.6)):
                    poner(sfx, golpe(0.06), e["inicio"] + kk * 1.6)
    while t < total and not noir:
        e = next((x for x in reversed(esc) if x["inicio"] <= t), esc[0])
        prog = ANIMO.get(e["ambiente"]["hora"], ANIMO["dia"])
        root, q = prog[k % len(prog)]
        ch = acorde(root, q)
        poner(mus, pad([nota(m - 12) for m in ch], beat * 4 + 0.6), t)
        patron = [0, 2, 1, 2, 0, 2, 1, 2]
        for j, p in enumerate(patron):
            poner(mus, marimba(nota(ch[p] + 12), vol=0.12 if j % 2 else 0.16), t + j * beat / 2)
        poner(mus, marimba(nota(root - 24), 0.5, 0.2), t)
        t += beat * 4; k += 1
    # efectos
    for i, e in enumerate(esc):
        if i > 0 and (not noir or e.get("titulo") or e.get("ambiente") != esc[i - 1].get("ambiente")): poner(sfx, whoosh(0.8, 0.12) if noir else whoosh(), max(0, e["inicio"] - 0.4))
        for k, tm in enumerate([] if noir else (e.get("tomas") or [])):
            if k > 0: poner(sfx, whoosh(0.35, 0.09), max(0, e["inicio"] + float(tm.get("t", 0)) - 0.2))
        for ef in e.get("efectos", []) or []:
            at = e["inicio"] + float(ef.get("t", 0))
            tp = ef.get("tipo")
            if tp in ("destello", "chispas", "anillo"): poner(sfx, golpe(), at)
            elif tp == "polvo": poner(sfx, puf(), at)
            elif tp == "signo": poner(sfx, ding(), at)
            elif tp == "estrellas": poner(sfx, ding(0.12), at)
        for o in e.get("objetos", []) or []:
            if o.get("estado") == "derrumbe": poner(sfx, golpe(0.8), e["inicio"] + float(o.get("t", 0)) + 0.6); poner(sfx, puf(0.45), e["inicio"] + float(o.get("t", 0)) + 0.62)
            elif o.get("estado") == "aparece": poner(sfx, ding(0.15), e["inicio"] + float(o.get("t", 0)))
            elif o.get("estado") == "sube": poner(sfx, whoosh(1.2, 0.2), e["inicio"] + float(o.get("t", 0)))
        for a in e.get("actores", []) or []:
            lu = a.get("luego")
            if a.get("accion") == "caer": poner(sfx, golpe(0.45), e["inicio"] + 0.45)
            if lu and lu.get("accion") == "caer": poner(sfx, golpe(0.45), e["inicio"] + float(lu.get("t", 0)) + 0.45)
    voz_p = os.path.join(carpeta, "voz.wav")
    voz = np.zeros(n)
    if os.path.exists(voz_p):
        v, sr = sf.read(voz_p)
        if v.ndim > 1: v = v.mean(axis=1)
        if sr != SR:
            v = np.interp(np.arange(int(len(v) * SR / sr)) * sr / SR, np.arange(len(v)), v)
        voz[: min(n, len(v))] = v[:n]
    # ducking: la música baja 6 dB mientras hay voz
    a = np.abs(voz); w = int(0.15 * SR)
    lvl = np.convolve(a, np.ones(w) / w, mode="same")
    duck = np.where(lvl > 0.01, 0.5, 1.0)
    duck = np.convolve(duck, np.ones(w) / w, mode="same")
    mezcla = voz * 1.0 + mus * duck * 0.55 + sfx * 0.6
    mezcla *= env(n, 0.02, 0.4)
    tmp = os.path.join(carpeta, "mezcla_cruda.wav")
    sf.write(tmp, np.stack([mezcla, mezcla], 1).astype(np.float32), SR)
    out = os.path.join(carpeta, "mezcla.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", "loudnorm=I=-14:TP=-1.2:LRA=7", "-ar", str(SR), out], check=True)
    print("mezcla lista", out, flush=True)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
