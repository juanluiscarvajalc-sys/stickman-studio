# Hoja de escenarios: une las fotos de cada decorado (con su hora y clima) en una sola imagen con rótulos.
# Uso: python pipeline/hoja_escenarios.py <fichas.json> <salida.jpg>
import json, sys
from PIL import Image, ImageDraw, ImageFont

def fuente(n, negrita=False):
    for f in (["georgiab.ttf", "arialbd.ttf"] if negrita else ["georgia.ttf", "arial.ttf"]):
        try: return ImageFont.truetype("C:/Windows/Fonts/" + f, n)
        except OSError: pass
    return ImageFont.load_default()

d = json.load(open(sys.argv[1], encoding="utf8"))
fichas = d["fichas"]
COLS, W, H, PIE, CAB, M = 3, 960, 540, 120, 130, 24
filas = (len(fichas) + COLS - 1) // COLS
hoja = Image.new("RGB", (COLS * (W + M) + M, CAB + filas * (H + PIE + M) + M), "#e9e6de")
g = ImageDraw.Draw(hoja)
g.text((M + 10, 30), d["titulo"], font=fuente(64, True), fill="#1e1a22")
for k, f in enumerate(fichas):
    x, y = M + (k % COLS) * (W + M), CAB + (k // COLS) * (H + PIE + M)
    g.rectangle([x - 2, y - 2, x + W + 1, y + H + PIE + 1], fill="#fbfaf6", outline="#c9c4b8", width=2)
    try: hoja.paste(Image.open(f["img"]).convert("RGB").resize((W, H)), (x, y))
    except OSError: g.text((x + 20, y + 20), "sin imagen", font=fuente(30), fill="#a8433a")
    g.text((x + 14, y + H + 8), f["titulo"][:46], font=fuente(34, True), fill="#1e1a22")
    g.text((x + 14, y + H + 50), f["sub"][:70], font=fuente(24), fill="#7a3a2a")
    g.text((x + 14, y + H + 82), ("gente: " + f["gente"] + ("  ·  utilería: " + f["util"] if f["util"] else ""))[:80], font=fuente(21), fill="#5a5560")
hoja.save(sys.argv[2], quality=88)
print(sys.argv[2])
