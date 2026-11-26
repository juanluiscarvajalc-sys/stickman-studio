"""Voces de ElevenLabs (de pago; el texto viaja a su servicio). La clave se lee de ELEVENLABS_API_KEY y nunca se escribe.

tts(texto, voice_id, mp3, velocidad, estilo) -> [{"w","a","b"}]  (tiempos por palabra, como edge-tts)
Variables opcionales en .env:
  ELEVENLABS_MODEL        modelo (por defecto eleven_multilingual_v2)
  ELEVENLABS_CONCURRENCIA pedidos a la vez (por defecto 2; el plan Starter permite 3)
"""
import base64
import json
import os
import time
import urllib.error
import urllib.request

API = "https://api.elevenlabs.io/v1"
MODELO = os.environ.get("ELEVENLABS_MODEL") or "eleven_multilingual_v2"
SIGNOS = set(".,;:!?¡¿\"'«»()[]—–-…")


class SinCreditos(RuntimeError):
    pass


def _vel(v):
    """«+8%» -> 1.08 (ElevenLabs acepta 0.7 a 1.2)"""
    try:
        f = 1 + float(str(v).replace("%", "")) / 100
    except ValueError:
        f = 1.0
    return max(0.7, min(1.2, round(f, 2)))


def palabras_de(al):
    """agrupa la alineación por caracteres en palabras con su inicio y fin"""
    cs, ini, fin = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    ws, cur, a, b = [], "", None, None
    for c, s, e in zip(cs + [" "], ini + [0], fin + [0]):
        if c.isspace():
            limpio = "".join(ch for ch in cur if ch not in SIGNOS)
            if limpio:
                ws.append({"w": limpio, "a": round(a, 3), "b": round(b, 3)})
            cur, a = "", None
            continue
        if a is None:
            a = s
        cur, b = cur + c, e
    return ws


def tts(texto, voice_id, mp3, velocidad="+0%", estilo=0.35):
    clave = os.environ.get("ELEVENLABS_API_KEY")
    if not clave:
        raise RuntimeError("Falta ELEVENLABS_API_KEY en .env")
    cuerpo = json.dumps({
        "text": texto, "model_id": MODELO,
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": estilo, "use_speaker_boost": True,
                           "speed": _vel(velocidad)},
    }).encode("utf-8")
    url = f"{API}/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128"
    for intento in range(6):
        req = urllib.request.Request(url, data=cuerpo, method="POST",
                                     headers={"xi-api-key": clave, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                j = json.loads(r.read())
            with open(mp3, "wb") as f:
                f.write(base64.b64decode(j["audio_base64"]))
            return palabras_de(j.get("alignment") or j["normalized_alignment"])
        except urllib.error.HTTPError as err:
            txt = err.read().decode("utf-8", "replace")[:300]
            if err.code == 401 or "quota" in txt:
                raise SinCreditos(f"ElevenLabs: sin créditos o clave inválida ({err.code}): {txt}")
            if err.code in (429, 500, 502, 503, 504):
                time.sleep(3 * (intento + 1))
                continue
            raise RuntimeError(f"ElevenLabs respondió {err.code}: {txt}")
        except (urllib.error.URLError, TimeoutError) as err:
            time.sleep(3 * (intento + 1))
    raise RuntimeError("ElevenLabs no respondió tras varios intentos")
