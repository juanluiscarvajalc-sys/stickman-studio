"""Voz del narrador con edge-tts (voces neuronales gratuitas de Microsoft; el texto viaja a su servicio en línea).

Genera una pista por escena, mide su duración y los tiempos de cada palabra, y las une en una sola voz.wav.
Uso: python voz.py entrada.json carpeta_salida
  entrada.json = {"voz": "es-MX-JorgeNeural", "velocidad": "+8%", "escenas": [{"id": 1, "narracion": "..."}]}
Salida: carpeta/voz.wav y carpeta/tiempos.json = {"escenas": [{"id", "inicio", "duracion"}], "palabras": [{"w","a","b"}]}
"""
import asyncio
import json
import os
import subprocess
import sys

import edge_tts

PAUSA = 0.12  # silencio entre escenas (el estilo casi no tiene pausas)
SR = 48000


async def una(texto, voz, vel, mp3, tono="+0Hz"):
    com = edge_tts.Communicate(texto, voz, rate=vel, pitch=tono, boundary="WordBoundary")
    palabras = []
    with open(mp3, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                a = ch["offset"] / 1e7
                palabras.append({"w": ch["text"], "a": round(a, 3), "b": round(a + ch["duration"] / 1e7, 3)})
    return palabras


# ---------------- modo natural ----------------
# frase por frase: pausas de respiración que varían según la puntuación, y entonación y ritmo levemente distintos
# en cada frase (la lectura de corrido de edge-tts suena plana). Después, un procesado cálido de estudio.
import math
import re

FRASE = re.compile(r"[^.!?…]+(?:[.!?…]+[»\"')]*|$)")


def _h(n):
    x = math.sin(n * 12.9898 + 78.233) * 43758.5453
    return x - math.floor(x)


def _pct(v):
    try:
        return float(str(v).replace("%", ""))
    except ValueError:
        return 0.0


def frases(texto):
    texto = re.sub(r"\s*[—–]\s*", ", ", texto).replace(" ,", ",")
    fs = [f.strip() for f in FRASE.findall(texto) if f.strip()]
    # une las frases muy cortas a la siguiente (una palabra suelta suena cortada)
    out = []
    for f in fs:
        if out and len(out[-1].split()) < 3:
            out[-1] += " " + f
        else:
            out.append(f)
    return out or [texto]


def pausa_tras(f, k):
    if f.endswith("…") or f.endswith("..."):
        return 0.62 + 0.15 * k
    if f.endswith("?") or f.endswith("!"):
        return 0.42 + 0.12 * k
    return 0.30 + 0.16 * k


async def una_natural(texto, voz, vel, mp3, semilla, tmp):
    base = _pct(vel)
    partes, palabras, t = [], [], 0.0
    fs = frases(texto)
    for i, f in enumerate(fs):
        k = _h(semilla * 31 + i)
        tono = f"{round((k - 0.5) * 5):+d}Hz"            # ±2 Hz: menos monótono, misma voz
        ritmo = f"{round(base + (k - 0.5) * 6):+d}%"      # ±3 % de velocidad
        pm = os.path.join(tmp, f"f{i:02d}.mp3")
        # a veces el servicio no devuelve audio para una combinación; se reintenta con otro matiz de tono
        for j, tn in enumerate([tono, "+1Hz", "-1Hz"]):
            try:
                ws = await una(f, voz, ritmo, pm, tn)
                break
            except Exception:
                if j == 2:
                    # último recurso: esa frase con una voz en español parecida (mejor que perder la escena)
                    alt = "es-MX-DaliaNeural" if any(n in voz for n in ("Ava", "Emma", "Dalia", "Female")) else "es-MX-JorgeNeural"
                    if alt == voz:
                        raise
                    print(f"frase con voz de respaldo {alt}", flush=True)
                    ws = await una(f, alt, ritmo, pm, "+0Hz")
                    break
                await asyncio.sleep(1.0)
        pw = os.path.join(tmp, f"f{i:02d}.wav")
        pausa = 0.0 if i == len(fs) - 1 else pausa_tras(f, _h(semilla * 7 + i))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", pm, "-af",
                        f"areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur={pausa:.3f}",
                        "-ar", str(SR), "-ac", "1", pw], check=True)
        palabras += [{"w": w["w"], "a": round(w["a"] + t, 3), "b": round(w["b"] + t, 3)} for w in ws]
        partes.append(pw)
        t += duracion(pw)
    lista = os.path.join(tmp, "l.txt")
    with open(lista, "w", encoding="utf-8") as fl:
        for pw in partes:
            fl.write(f"file '{os.path.abspath(pw)}'\n")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista, "-c:a", "libmp3lame", "-b:a", "192k", mp3], check=True)
    return palabras


# voz cálida: quita graves sucios y el brillo metálico de la síntesis, comprime suave y suma un poco de cuerpo
CALIDO = ("highpass=f=75,equalizer=f=180:t=q:w=1.0:g=2.5,equalizer=f=3200:t=q:w=1.2:g=-1.5,"
          "equalizer=f=7000:t=q:w=1.5:g=-3.5,lowpass=f=11500,"
          "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2")
SALA = "aecho=0.8:0.5:24|41:0.10|0.06"  # sala chica muy sutil (solo diálogos)


def duracion(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True).stdout.strip()
    return float(out)


async def main(entrada, carpeta):
    cfg = json.load(open(entrada, encoding="utf-8"))
    voz, vel = cfg.get("voz", "es-MX-JorgeNeural"), cfg.get("velocidad", "+8%")
    os.makedirs(carpeta, exist_ok=True)
    t, escenas, palabras, partes = 0.0, [], [], []
    # cada escena puede traer su voz (personajes con diálogo), su velocidad, su pausa y un silencio (carteles)
    sem = asyncio.Semaphore(int(cfg.get("paralelo", 4)))
    # voces "el:<id>" = ElevenLabs (de pago, solo si hay clave); el resto, edge-tts
    sem_el = asyncio.Semaphore(int(os.environ.get("ELEVENLABS_CONCURRENCIA") or 2))
    natural = bool(cfg.get("natural"))

    async def tts(e):
        texto = (e.get("narracion") or "").strip()
        if not texto: return []
        mp3 = os.path.join(carpeta, f"esc_{e['id']:03d}.mp3")
        js = mp3 + ".json"
        if os.path.exists(mp3) and os.path.getsize(mp3) > 1000 and os.path.exists(js):
            return json.load(open(js, encoding="utf-8"))
        v = e.get("voz") or voz
        if v.startswith("el:"):
            import voz_eleven
            async with sem_el:
                ws = await asyncio.to_thread(voz_eleven.tts, texto, v[3:], mp3, e.get("velocidad") or vel, float(e.get("estilo", 0.35)))
            json.dump(ws, open(js, "w", encoding="utf-8"))
            return ws
        async with sem:
            for intento in range(5):
                try:
                    if natural:
                        tmp = os.path.join(carpeta, f"tmp_{e['id']:03d}")
                        os.makedirs(tmp, exist_ok=True)
                        ws = await una_natural(texto, v, e.get("velocidad") or vel, mp3, int(e["id"]), tmp)
                    else:
                        ws = await una(texto, v, e.get("velocidad") or vel, mp3)
                    if os.path.getsize(mp3) > 1000:
                        json.dump(ws, open(js, "w", encoding="utf-8"))
                        return ws
                except Exception as err:  # el servicio en línea a veces corta la conexión
                    print(f"escena {e['id']}: reintento {intento + 1} ({err})", flush=True)
                await asyncio.sleep(1.5 * (intento + 1))
        raise RuntimeError(f"no se pudo generar la voz de la escena {e['id']}")

    todas = await asyncio.gather(*[tts(e) for e in cfg["escenas"]])
    for e, ws in zip(cfg["escenas"], todas):
        texto = (e.get("narracion") or "").strip()
        wav = os.path.join(carpeta, f"esc_{e['id']:03d}.wav")
        pausa = float(e.get("pausa", PAUSA))
        if texto:
            mp3 = os.path.join(carpeta, f"esc_{e['id']:03d}.mp3")
            # recorta el silencio del final y deja la pausa de esa escena
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-af",
                            f"areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                            + ((CALIDO + "," + (SALA + "," if e.get("sala") else "")) if natural else "")
                            + f"apad=pad_dur={pausa}",
                            "-ar", str(SR), "-ac", "1", wav], check=True)
        else:
            ws = []
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-t", str(e.get("silencio", 1.5)), wav], check=True)
        d = duracion(wav)
        escenas.append({"id": e["id"], "inicio": round(t, 3), "duracion": round(d, 3)})
        palabras += [{"w": w["w"], "a": round(w["a"] + t, 3), "b": round(w["b"] + t, 3)} for w in ws]
        partes.append(wav)
        t += d
        print(f"escena {e['id']}: {d:.2f} s", flush=True)
    lista = os.path.join(carpeta, "lista.txt")
    with open(lista, "w", encoding="utf-8") as f:
        for p in partes:
            f.write(f"file '{os.path.abspath(p)}'\n")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy",
                    os.path.join(carpeta, "voz.wav")], check=True)
    json.dump({"escenas": escenas, "palabras": palabras, "total": round(t, 3)},
              open(os.path.join(carpeta, "tiempos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"voz total {t:.2f} s", flush=True)


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1], sys.argv[2]))
