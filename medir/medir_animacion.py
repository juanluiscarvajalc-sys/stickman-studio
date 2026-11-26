"""Mide la animación cuadro a cuadro de uno o varios videos (sin mirar imágenes: solo números).

Por cada par de cuadros consecutivos calcula:
  - dif: cambio medio de la imagen (0-255)
  - corte: cambio de plano
  - cámara: traslación, zoom y giro globales (flujo óptico + afín RANSAC)
  - local: lo que se mueve DESPUÉS de compensar la cámara (personajes, objetos, texto)
Y resume: animación "en unos/dos/tres", duración de planos, pausas de pose, movimientos de cámara,
curva de aceleración (easing), acentos de movimiento por segundo, color y densidad de línea.

Uso:
  python medir/medir_animacion.py out/ricks/*.mp4 --salida out/ricks/medidas.json
  python medir/medir_animacion.py episodio.mp4 --segmentos 20 --dur 60 --salida out/medidas_nuestro.json
"""
import argparse, glob, json, math, sys
import cv2
import numpy as np

ANCHO = 270          # se mide a baja resolución: suficiente para movimiento, rápido
UMBRAL_QUIETO = 0.35 # dif media por debajo = cuadro repetido (tolerancia a ruido de compresión)
UMBRAL_LOCAL = 14    # píxel "se movió" tras compensar cámara


def camara(prev, cur):
    pts = cv2.goodFeaturesToTrack(prev, 300, 0.01, 6)
    if pts is None or len(pts) < 12:
        return None
    nxt, st, _ = cv2.calcOpticalFlowPyrLK(prev, cur, pts, None, winSize=(21, 21), maxLevel=3)
    ok = st.ravel() == 1
    if ok.sum() < 12:
        return None
    M, inl = cv2.estimateAffinePartial2D(pts[ok], nxt[ok], method=cv2.RANSAC, ransacReprojThreshold=1.0)
    if M is None or inl is None or inl.sum() < max(10, 0.4 * ok.sum()):
        return None
    esc = math.hypot(M[0, 0], M[1, 0])
    rot = math.degrees(math.atan2(M[1, 0], M[0, 0]))
    return M, esc, rot


def tramos(bools):
    """Longitudes de rachas de True."""
    out, n = [], 0
    for b in bools:
        if b:
            n += 1
        elif n:
            out.append(n); n = 0
    if n:
        out.append(n)
    return out


def pct(a, p):
    return float(np.percentile(a, p)) if len(a) else 0.0


def medir_rango(cap, fps, ini, fin):
    cap.set(cv2.CAP_PROP_POS_FRAMES, ini)
    ok, f = cap.read()
    if not ok:
        return None
    h0, w0 = f.shape[:2]
    alto = int(round(ANCHO * h0 / w0))
    def prep(fr):
        s = cv2.resize(fr, (ANCHO, alto), interpolation=cv2.INTER_AREA)
        return s, cv2.cvtColor(s, cv2.COLOR_BGR2GRAY)
    pc, pg = prep(f)
    hist_p = cv2.calcHist([cv2.cvtColor(pc, cv2.COLOR_BGR2HSV)], [0, 1], None, [16, 8], [0, 180, 0, 256]); cv2.normalize(hist_p, hist_p)
    filas = []
    sat, bordes = [], []
    borde = int(ANCHO * 0.04)
    for k in range(ini + 1, fin):
        ok, f = cap.read()
        if not ok:
            break
        cc, cg = prep(f)
        hsv = cv2.cvtColor(cc, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1], None, [16, 8], [0, 180, 0, 256]); cv2.normalize(hist, hist)
        dif = float(cv2.absdiff(pg, cg).mean())
        corr = float(cv2.compareHist(hist_p, hist, cv2.HISTCMP_CORREL))
        corte = (corr < 0.55 and dif > 12) or dif > 45
        r = {"dif": dif, "corte": bool(corte), "tx": 0.0, "ty": 0.0, "zoom": 0.0, "rot": 0.0, "local": 0.0, "localMag": 0.0, "camOK": False}
        if not corte and dif >= UMBRAL_QUIETO:
            cam = camara(pg, cg)
            if cam:
                M, esc, rot = cam
                r.update(tx=float(M[0, 2]) / ANCHO, ty=float(M[1, 2]) / ANCHO, zoom=esc - 1.0, rot=rot, camOK=True)
                comp = cv2.warpAffine(pg, M, (ANCHO, alto), borderMode=cv2.BORDER_REPLICATE)
            else:
                comp = pg
            res = cv2.absdiff(comp, cg)[borde:-borde, borde:-borde]
            mov = res > UMBRAL_LOCAL
            r["local"] = float(mov.mean())
            # manchas compactas de movimiento (personajes/objetos) vs. movimiento difuso (paralaje del fondo)
            m8 = cv2.morphologyEx(mov.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
            nb, lab, stats, _ = cv2.connectedComponentsWithStats(m8)
            areas = sorted([int(s[cv2.CC_STAT_AREA]) for s in stats[1:]], reverse=True)
            tot = float(m8.size)
            r["manchas"] = sum(1 for a in areas if a > 0.002 * tot)
            r["mancha_mayor"] = areas[0] / tot if areas else 0.0
            r["compacto"] = (sum(areas[:3]) / max(1, sum(areas))) if areas else 0.0
            gh, gw = mov.shape[0] // 3, mov.shape[1] // 3
            r["grid"] = [float(mov[y * gh:(y + 1) * gh, x * gw:(x + 1) * gw].mean()) for y in range(3) for x in range(3)]
            r["localMag"] = float(res[mov].mean()) if mov.any() else 0.0
        filas.append(r)
        if k % 6 == 0:
            sat.append(float(hsv[..., 1].mean()))
            bordes.append(float((cv2.Canny(cg, 80, 160) > 0).mean()))
        pg, hist_p = cg, hist
    return filas, sat, bordes, (w0, h0)


def resumir(filas, fps, sat, bordes):
    n = len(filas)
    if n < 10:
        return None
    dif = np.array([r["dif"] for r in filas])
    corte = np.array([r["corte"] for r in filas])
    quieto = (dif < UMBRAL_QUIETO) & ~corte
    # animación en "unos/dos/tres": rachas de cuadros distintos separadas por repetidos
    rep = tramos(quieto)                       # rachas de cuadros repetidos
    nuevo = ~quieto
    # duración de cada dibujo distinto = 1 + repetidos que le siguen
    durs = []
    i = 0
    while i < n:
        if nuevo[i]:
            j = i + 1
            while j < n and quieto[j]:
                j += 1
            durs.append(j - i)
            i = j
        else:
            i += 1
    durs = np.array(durs) if durs else np.array([1])
    hist_durs = {str(k): float(np.mean(np.clip(durs, 1, 6) == k)) for k in range(1, 7)}
    # planos
    cortes_idx = np.where(corte)[0]
    limites = [0] + list(cortes_idx + 1) + [n]
    planos = [(limites[j], limites[j + 1]) for j in range(len(limites) - 1) if limites[j + 1] - limites[j] > 2]
    dur_planos = np.array([(b - a) / fps for a, b in planos])
    # cámara
    tx = np.array([r["tx"] for r in filas]); ty = np.array([r["ty"] for r in filas])
    zm = np.array([r["zoom"] for r in filas]); rot = np.array([r["rot"] for r in filas])
    vel_cam = np.hypot(tx, ty) * fps                 # anchos de pantalla por segundo
    vel_zoom = np.abs(zm) * fps                      # fracción de escala por segundo
    cam_mueve = ((vel_cam > 0.004) | (vel_zoom > 0.006)) & ~corte
    planos_cam = []
    easing = []
    sacudidas = 0
    for a, b in planos:
        seg = cam_mueve[a:b]
        planos_cam.append(float(seg.mean()))
        v = np.hypot(vel_cam[a:b], vel_zoom[a:b])
        if seg.mean() > 0.5 and b - a > 8:
            k = max(1, int(fps * 0.1))
            vs = np.convolve(v, np.ones(k) / k, mode="same")
            if vs.mean() > 0:
                easing.append(float(vs.max() / vs.mean()))      # 1 = lineal; >1.5 = acelera/frena
                tercio = len(vs) // 3
                easing_ini = vs[:tercio].mean() / (vs.mean() + 1e-9)
        # sacudidas: cambio brusco de dirección de cámara
        sx = np.sign(tx[a:b]); sacudidas += int(np.sum((sx[1:] * sx[:-1] < 0) & (vel_cam[a + 1:b] > 0.03)))
    zoom_total = [float(np.prod(1 + zm[a:b]) - 1) for a, b in planos]
    # movimiento local (personajes)
    loc = np.array([r["local"] for r in filas])
    activo = (loc > 0.004) & ~corte
    pausas = np.array(tramos(~activo & ~corte)) / fps        # pausas de pose (nada se mueve salvo cámara)
    movs = np.array(tramos(activo)) / fps                    # duración de cada movimiento
    # acentos: picos de movimiento local por segundo
    k = max(1, int(fps * 0.08))
    ls = np.convolve(loc, np.ones(k) / k, mode="same")
    picos = [i for i in range(1, n - 1) if ls[i] > ls[i - 1] and ls[i] >= ls[i + 1] and ls[i] > max(0.02, 2.0 * np.median(ls))]
    # quitar picos muy juntos (<0.15 s)
    ac = []
    for p in picos:
        if not ac or p - ac[-1] > 0.15 * fps:
            ac.append(p)
    seg = n / fps
    # dónde se mueve (rejilla 3x3, fila por fila: arriba, centro, abajo)
    gr = np.array([r.get("grid", [0] * 9) for r in filas if not r["corte"]])
    grid = [round(100 * float(v), 2) for v in gr.mean(0)] if len(gr) else [0] * 9
    # golpes de cámara: ráfagas rápidas de paneo o zoom (velocidad > 0.3 pantallas/s o zoom > 0.25/s)
    rap = ((vel_cam > 0.3) | (vel_zoom > 0.25)) & ~corte
    golpes = tramos(rap)
    # vibración: lo que queda del paneo tras quitar la deriva lenta (media móvil de 0.5 s)
    kk = max(3, int(fps * 0.5))
    txs = np.convolve(tx, np.ones(kk) / kk, mode="same"); tys = np.convolve(ty, np.ones(kk) / kk, mode="same")
    jit = np.hypot(tx - txs, ty - tys)[~corte]
    # frecuencia dominante de la vibración horizontal
    xx = (tx - txs)[~corte]
    f_dom = 0.0
    if len(xx) > 64:
        sp = np.abs(np.fft.rfft(xx - xx.mean())); fr = np.fft.rfftfreq(len(xx), 1 / fps)
        sp[fr < 0.5] = 0; f_dom = float(fr[int(np.argmax(sp))])
    # perfil del golpe: cuadros hasta el pico y del pico al final
    subida, bajada = [], []
    vv = np.hypot(vel_cam, vel_zoom)
    i = 0
    while i < n:
        if rap[i]:
            j = i
            while j < n and rap[j]:
                j += 1
            pk = i + int(np.argmax(vv[i:j]))
            subida.append(pk - i + 1); bajada.append(j - pk)
            i = j
        else:
            i += 1
    act = [r for r in filas if r["local"] > 0.004 and not r["corte"]]
    return {
        "manchas_por_cuadro": round(float(np.median([r.get("manchas", 0) for r in act])) if act else 0, 1),
        "mancha_mayor_%": round(100 * float(np.median([r.get("mancha_mayor", 0) for r in act])) if act else 0, 2),
        "movimiento_compacto_%": round(100 * float(np.median([r.get("compacto", 0) for r in act])) if act else 0, 1),
        "grid_local_%": grid,
        "golpes_cam_por_min": round(60 * len(golpes) / seg, 1),
        "golpe_cuadros_mediana": float(np.median(golpes)) if golpes else 0,
        "golpe_subida_cuadros": float(np.median(subida)) if subida else 0,
        "golpe_bajada_cuadros": float(np.median(bajada)) if bajada else 0,
        "vibracion_px_por_cuadro_1080": round(1080 * pct(jit, 50), 2),
        "vibracion_p90_1080": round(1080 * pct(jit, 90), 2),
        "vibracion_hz": round(f_dom, 2),
        "fps": fps, "segundos": round(seg, 2), "cuadros": n,
        "cuadros_repetidos_%": round(100 * quieto.mean(), 1),
        "dibujo_dura_cuadros_hist": {k: round(v, 3) for k, v in hist_durs.items()},
        "dibujo_dura_cuadros_mediana": float(np.median(durs)),
        "dibujos_distintos_por_seg": round(len(durs) / seg, 2),
        "cortes_por_min": round(60 * len(cortes_idx) / seg, 1),
        "plano_seg_mediana": round(pct(dur_planos, 50), 2),
        "plano_seg_p25_p75": [round(pct(dur_planos, 25), 2), round(pct(dur_planos, 75), 2)],
        "cam_frames_con_movimiento_%": round(100 * cam_mueve.mean(), 1),
        "cam_planos_con_movimiento_%": round(100 * float(np.mean(np.array(planos_cam) > 0.5)), 1) if planos_cam else 0,
        "cam_vel_pan_mediana_anchos_s": round(pct(vel_cam[cam_mueve], 50), 4),
        "cam_vel_pan_p90": round(pct(vel_cam[cam_mueve], 90), 4),
        "cam_vel_zoom_mediana_s": round(pct(vel_zoom[cam_mueve], 50), 4),
        "cam_vel_zoom_p90": round(pct(vel_zoom[cam_mueve], 90), 4),
        "cam_zoom_por_plano_mediana": round(pct(np.abs(zoom_total), 50), 4),
        "cam_zoom_por_plano_p90": round(pct(np.abs(zoom_total), 90), 4),
        "cam_zoom_in_%": round(100 * float(np.mean(np.array(zoom_total) > 0.01)), 1) if zoom_total else 0,
        "cam_rot_grados_p90": round(pct(np.abs(rot[cam_mueve]), 90), 3),
        "cam_easing_pico_sobre_media": round(pct(easing, 50), 2),
        "cam_sacudidas_por_min": round(60 * sacudidas / seg, 1),
        "local_area_media_%": round(100 * loc[~corte].mean(), 2),
        "local_area_p90_%": round(100 * pct(loc[~corte], 90), 2),
        "local_magnitud_media": round(float(np.mean([r["localMag"] for r in filas if r["local"] > 0.004] or [0])), 1),
        "local_frames_activos_%": round(100 * activo.mean(), 1),
        "pausa_pose_seg_mediana": round(pct(pausas, 50), 2),
        "pausa_pose_seg_p90": round(pct(pausas, 90), 2),
        "pausas_por_min": round(60 * len(pausas) / seg, 1),
        "movimiento_seg_mediana": round(pct(movs, 50), 2),
        "acentos_por_seg": round(len(ac) / seg, 2),
        "saturacion_media": round(float(np.mean(sat)), 1) if sat else 0,
        "densidad_linea_%": round(100 * float(np.mean(bordes)), 2) if bordes else 0,
    }


def medir_video(ruta, segmentos=0, dur=60.0):
    cap = cv2.VideoCapture(ruta)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    rangos = [(0, total)]
    if segmentos:
        largo = int(dur * fps)
        paso = max(largo, (total - largo) // max(1, segmentos - 1))
        rangos = [(min(total - largo - 1, j * paso), min(total - 1, j * paso + largo)) for j in range(segmentos)]
    res = []
    for a, b in rangos:
        m = medir_rango(cap, fps, a, b)
        if not m:
            continue
        filas, sat, bordes, tam = m
        s = resumir(filas, fps, sat, bordes)
        if s:
            s["resolucion"] = list(tam)
            s["desde_seg"] = round(a / fps, 1)
            res.append(s)
            print(f"  {ruta} @{a / fps:.0f}s: dibujos/s={s['dibujos_distintos_por_seg']} planos={s['plano_seg_mediana']}s cam={s['cam_frames_con_movimiento_%']}% local={s['local_area_media_%']}% acentos/s={s['acentos_por_seg']}", flush=True)
    cap.release()
    return res


def agregar(lista):
    claves = [k for k, v in lista[0].items() if isinstance(v, (int, float))]
    out = {}
    for k in claves:
        a = np.array([x[k] for x in lista], dtype=float)
        out[k] = {"mediana": round(float(np.median(a)), 3), "p25": round(pct(a, 25), 3), "p75": round(pct(a, 75), 3)}
    out["grid_local_%"] = [round(float(np.median([x["grid_local_%"][i] for x in lista])), 2) for i in range(9)]
    h = {}
    for x in lista:
        for kk, v in x["dibujo_dura_cuadros_hist"].items():
            h.setdefault(kk, []).append(v)
    out["dibujo_dura_cuadros_hist"] = {kk: round(float(np.mean(v)), 3) for kk, v in h.items()}
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("videos", nargs="+")
    ap.add_argument("--segmentos", type=int, default=0)
    ap.add_argument("--dur", type=float, default=60)
    ap.add_argument("--salida", required=True)
    a = ap.parse_args()
    rutas = sorted(sum([glob.glob(v) for v in a.videos], []))
    todos = []
    for r in rutas:
        todos += medir_video(r, a.segmentos, a.dur)
    json.dump({"muestras": todos, "resumen": agregar(todos)}, open(a.salida, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print("listo:", a.salida, len(todos), "muestras")
