// Director automático: convierte cada escena en tomas de 1.2–2.2 s pegadas a las palabras (el ritmo medido en la
// referencia: una imagen nueva por frase y casi por cada palabra importante). Si el Editor ya mandó tomas
// suficientes, se respetan; si no, se completan aquí con reglas.
import { Escena, Palabra, Toma, PlanoToma, Angulo, PLANOS_TOMA, ANGULOS, MOVS, hash } from "./plan";

const PLANO_ESCENA: Record<string, PlanoToma> = { primer_plano: "primer_plano", medio: "medio", general: "general", panoramico: "panoramico" };
let MIN_GAP = 0.9;
/** ritmo: shorts (1.2–2.2 s por toma) o episodio documental (tomas largas de 4–8 s) */
let LENTO = false;

const limpia = (e: Escena): Toma[] => {
  const ids = new Set(e.actores.map((a) => a.id));
  const ok = (o: string) => o === "grupo" || ids.has(o) || (/^objeto:\d+$/.test(o) && Number(o.split(":")[1]) < (e.objetos?.length ?? 0))
    || (/^multitud:\d+$/.test(o) && Number(o.split(":")[1]) < (e.multitudes?.length ?? 0)) || (/^luces:\d+$/.test(o) && Number(o.split(":")[1]) < (e.luces?.length ?? 0));
  const out: Toma[] = [];
  for (const t of [...(e.tomas ?? [])].sort((a, b) => a.t - b.t)) {
    if (!t || !Number.isFinite(t.t) || t.t < 0 || t.t > e.duracion - 0.4) continue;
    if (out.length && t.t - out[out.length - 1].t < MIN_GAP) continue;
    out.push({ t: out.length ? t.t : 0, objetivo: ok(t.objetivo) ? t.objetivo : "grupo",
      plano: (PLANOS_TOMA as readonly string[]).includes(t.plano) ? t.plano : "medio",
      angulo: (ANGULOS as readonly string[]).includes(t.angulo) ? t.angulo : "frente",
      mov: t.mov && (MOVS as readonly string[]).includes(t.mov) ? t.mov : "empuje", desde: t.desde && ids.has(t.desde) ? t.desde : null, pos: t.pos ?? null, mira: t.mira ?? null });
  }
  return out;
};

/** tiempos de corte: en el arranque de una palabra, cada ~1.5–2 s (relativos a la escena) */
const cortes = (e: Escena, palabras: Palabra[], fijos: number[]) => {
  const ws = palabras.map((w) => w.a - e.inicio).filter((a) => a > 0.8 && a < e.duracion - 0.6);
  const out: number[] = [0];
  const objetivo = LENTO ? (e.duracion > 14 ? 5.8 : 4.6) : e.duracion > 4 ? 1.55 : 1.35;
  let last = 0;
  const pend = [...fijos].filter((f) => f > MIN_GAP && f < e.duracion - 0.5).sort((a, b) => a - b);
  while (last + objetivo < e.duracion - 0.6) {
    const f = pend.find((x) => x >= last + MIN_GAP && x <= last + objetivo + 0.6);
    const nx = f ?? ws.find((a) => a >= last + objetivo - 0.25) ?? last + objetivo;
    if (nx > e.duracion - 0.6) break;
    if (f !== undefined) pend.splice(pend.indexOf(f), 1);
    out.push(nx); last = nx;
  }
  return out;
};

export const tomasDe = (e: Escena, palabras: Palabra[], lento = false): Toma[] => {
  LENTO = lento; MIN_GAP = lento ? 2.6 : 0.9;
  const dadas = limpia(e);
  if (dadas.length >= Math.max(1, Math.floor(e.duracion / (lento ? 7 : 2.3)))) return dadas;
  const actores = e.actores.map((a) => a.id);
  const eventos: { t: number; toma: Omit<Toma, "t"> }[] = [];
  const main = actores.includes(e.camara.objetivo) ? e.camara.objetivo : actores[0] ?? "grupo";
  const otro = actores.find((a) => a !== main) ?? null;
  // momentos que merecen su propia toma: objetos que cambian y personajes que cambian de acción
  (e.objetos ?? []).forEach((o, i) => {
    if (o.estado && o.estado !== "normal") eventos.push({ t: Math.max(0, (o.t ?? 0) - 0.15), toma: { objetivo: `objeto:${i}`, plano: ["casa", "torre", "muro"].includes(o.tipo) ? "general" : "medio", angulo: o.estado === "sube" ? "bajo" : "frente", mov: "empuje" } });
  });
  for (const a of e.actores) if (a.luego) eventos.push({ t: Math.max(0, a.luego.t - 0.1), toma: { objetivo: a.id, plano: a.luego.accion === "caer" ? "medio" : "rostro", angulo: "frente", mov: "empuje" } });
  // cada paso de un actor (echa a andar, se detiene a mirar, señala, toma algo) merece su toma
  for (const a of e.actores) for (const p of a.pasos ?? []) {
    if (!p || !(p.t > 0.4) || p.t > e.duracion - 1) continue;
    const anda = p.accion === "caminar" || p.accion === "correr";
    eventos.push({ t: Math.max(0, p.t - 0.1), toma: anda
      ? { objetivo: a.id, plano: "general", angulo: hash(e.id * 3 + p.t, 4) < 0.5 ? "lado" : "frente", mov: "paneo" }
      : { objetivo: a.id, plano: p.mano ? "detalle" : p.accion === "pensar" || p.accion === "sorpresa" ? "rostro" : "medio", angulo: "frente", mov: "empuje" } });
  }
  const especiales =(e.objetos ?? []).map((o, i) => ({ o, i })).filter(({ o }) => (o.material && o.material !== "normal") || ["horno", "pan_gigante", "estatua", "carreta", "bote", "pozo", "fogata"].includes(o.tipo));
  // repertorio rotativo (variedad de plano y ángulo, como la referencia)
  const rep: Omit<Toma, "t">[] = [];
  const conMano = e.actores.find((a) => a.mano || a.pasos?.some((p) => p?.mano));
  // las multitudes y las luces masivas son el gancho visual: van primero en el repertorio
  (e.multitudes ?? []).forEach((m, i) => {
    rep.push({ objetivo: `multitud:${i}`, plano: "panoramico", angulo: "alto", mov: "empuje" });
    rep.push({ objetivo: `multitud:${i}`, plano: "medio", angulo: "bajo", mov: "paneo" });
    if (m.t != null && m.t > 0) eventos.push({ t: Math.max(0, m.t - 0.15), toma: { objetivo: `multitud:${i}`, plano: "general", angulo: "alto", mov: "alejar" } });
  });
  (e.luces ?? []).forEach((l, i) => {
    rep.push({ objetivo: `luces:${i}`, plano: "panoramico", angulo: "frente", mov: "alejar" });
    for (const [tc] of l.crecer ?? []) if (tc > 0.5) eventos.push({ t: Math.max(0, tc - 0.15), toma: { objetivo: `luces:${i}`, plano: "panoramico", angulo: "frente", mov: "alejar" } });
  });
  const ts = cortes(e, palabras, eventos.map((x) => x.t));
  if (conMano) rep.push({ objetivo: conMano.id, plano: "detalle", angulo: "frente", mov: "empuje" });
  if (main !== "grupo") rep.push({ objetivo: main, plano: "rostro", angulo: "frente", mov: "empuje" });
  if (otro) rep.push({ objetivo: otro, plano: "primer_plano", angulo: "hombro", mov: "empuje", desde: main });
  if (especiales.length) rep.push({ objetivo: `objeto:${especiales[0].i}`, plano: "medio", angulo: "bajo", mov: "paneo" });
  rep.push({ objetivo: "grupo", plano: "general", angulo: "alto", mov: "empuje" });
  if (main !== "grupo") rep.push({ objetivo: main, plano: "medio", angulo: "bajo", mov: "orbita" });
  if (otro) rep.push({ objetivo: otro, plano: "rostro", angulo: "frente", mov: "empuje" });
  if (main !== "grupo") rep.push({ objetivo: main, plano: "primer_plano", angulo: "lado", mov: "paneo" });
  if (actores.length > 2 || !actores.length) rep.push({ objetivo: "grupo", plano: "panoramico", angulo: "cenital", mov: "alejar" });
  const ang0: Angulo = e.camara.tipo === "contrapicado" ? "bajo" : e.camara.tipo === "grua_sube" || e.camara.tipo === "grua_baja" ? "alto" : "frente";
  const primera: Omit<Toma, "t"> = { objetivo: e.camara.objetivo || main, plano: PLANO_ESCENA[e.camara.plano] ?? "medio", angulo: ang0,
    mov: e.camara.tipo === "alejamiento" ? "alejar" : e.camara.tipo === "orbita" ? "orbita" : e.camara.tipo.startsWith("paneo") ? "paneo" : e.camara.tipo === "grua_sube" ? "subir" : "empuje" };
  if (LENTO) for (const x of rep) if (x.angulo === "cenital") x.angulo = "alto";
  const out: Toma[] = [];
  let k = Math.floor(hash(e.id, 11) * rep.length);
  ts.forEach((t, j) => {
    const ev = eventos.find((x) => Math.abs(x.t - t) < 0.05);
    let tm: Omit<Toma, "t">;
    if (j === 0) tm = dadas[0] ?? primera;
    else if (ev) tm = ev.toma;
    else {
      tm = rep[k++ % rep.length];
      const prev = out[out.length - 1];
      if (prev && prev.plano === tm.plano && prev.objetivo === tm.objetivo) tm = rep[k++ % rep.length];
    }
    out.push({ t, ...tm });
  });
  return out;
};
