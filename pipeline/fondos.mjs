// Fondos fotográficos por escena con Pollinations (gratis, sin cuenta). El Diseñador escribe la descripción del
// paisaje (en inglés, sin personas); aquí se pide la imagen panorámica, se recorta la marca de agua de abajo, se
// agranda y se guarda en public/fondos/<proyecto>/ para que el motor la ponga detrás de la escena 3D.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ffmpeg = (args) => new Promise((ok, mal) => { const p = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] }); let e = ""; p.stderr.on("data", (d) => (e += d)); p.on("close", (c) => (c ? mal(new Error(e.slice(-300))) : ok())); });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const HORA_EN = { dia: "bright daylight, partly cloudy blue sky", atardecer: "golden hour sunset, warm orange sky", amanecer: "soft pink dawn light, misty", noche: "night, moonlit deep blue sky, stars, dark landscape" };
const LUGAR_EN = {
  campo: "rolling green countryside meadows and farm fields, distant hills", pueblo: "distant medieval village rooftops among green hills",
  bosque: "dense pine forest and wooded hills", castillo: "green valley with distant mountains and forests, medieval era",
  ciudad: "distant old european city skyline with towers", playa: "calm sea horizon and sandy coast", desierto: "vast desert dunes and rocky mesas",
  montana: "majestic mountain range with pine forests and snowy peaks", interior: "", granja: "farmland with wheat fields, hay and a distant barn",
  aerodromo: "flat open airfield in the countryside, distant hangars and low tree line, wide sky", mansion: "wooded countryside estate, bare trees and distant hills around a lonely road", calle: "old american city skyline with brick buildings and water towers",
  cementerio: "old cemetery hillside with bare trees and distant gothic mausoleums", gasolinera: "flat rural highway landscape with telephone poles and fields",
  puerto: "dark sea horizon with a distant lighthouse and a misty coastline",
};
const INTERIORES = ["interior", "habitacion", "oficina", "tribunal", "carcel", "cabina", "cielo"];
const HORA_NOIR = { dia: "overcast grey sky, diffuse light", atardecer: "dim cloudy dusk, last light on the horizon", amanecer: "cold misty dawn", noche: "dark night, moon behind clouds, deep blue shadows, faint fog" };
const slugF = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "general";
/** descripción por defecto si el Diseñador no la mandó */
export const promptFondo = (e, plan = {}) => {
  if (plan.estilo === "noir") {
    const base = LUGAR_EN[e.ambiente?.lugar] || LUGAR_EN.campo;
    return `wide panoramic landscape photo, ${plan.fondoEpoca ? plan.fondoEpoca + ", " : ""}${base}, ${HORA_NOIR[e.ambiente?.hora] ?? HORA_NOIR.noche}, 1930s film noir mood, desaturated, cinematic, mysterious, atmospheric haze, low horizon in the lower third, no people, no cars in the foreground, no text, photorealistic, highly detailed`;
  }
  const base = (e.fondo && String(e.fondo).trim()) || LUGAR_EN[e.ambiente?.lugar] || LUGAR_EN.campo;
  return `wide panoramic landscape photo, ${base}, ${HORA_EN[e.ambiente?.hora] ?? HORA_EN.dia}, low horizon in the lower third, atmospheric haze, no people, no text, no buildings in the foreground, photorealistic, highly detailed`;
};

/** genera un fondo por escena (salvo interiores); deja en cada escena e.fondoImg con la ruta pública */
export const generarFondos = async (plan, carpeta, log = console.log) => {
  const rel = path.posix.join("fondos", carpeta);
  const dest = path.join(RAIZ, "public", rel);
  fs.mkdirSync(dest, { recursive: true });
  let hechos = 0, ultimo = 0;
  // episodios: biblioteca compartida por época + lugar + hora (+ variante), así se reutilizan entre escenas y episodios
  const bib = plan.modo === "episodio";
  const dirBib = path.join(RAIZ, "public", "fondos", "biblioteca");
  if (bib) fs.mkdirSync(dirBib, { recursive: true });
  for (const e of plan.escenas) {
    if (INTERIORES.includes(e.ambiente?.lugar) || e.titulo) { e.fondoImg = null; continue; }
    // un solo fondo por lugar y hora en todo el episodio (si cambiaba por capítulo, los árboles lejanos saltaban de una escena a otra)
    const base = bib ? `${slugF(plan.fondoEpoca)}_${e.ambiente?.lugar}_${e.ambiente?.hora}_${plan.estilo || "normal"}_` : null;
    const clave = bib ? base + ([0, 1].find((v) => fs.existsSync(path.join(dirBib, base + v + ".jpg"))) ?? 0) : null;
    if (bib && fs.existsSync(path.join(dirBib, clave + ".jpg"))) { e.fondoImg = `fondos/biblioteca/${clave}.jpg`; continue; }
    const prompt = promptFondo(e, plan), seed = bib ? 3000 + [...clave].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 99991, 7) : 1000 + e.id * 17;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=2048&height=768&nologo=true&model=flux&seed=${seed}`;
    const crudo = path.join(bib ? dirBib : dest, `${bib ? clave : "esc_" + e.id}_crudo.jpg`), fin = path.join(bib ? dirBib : dest, `${bib ? clave : "esc_" + e.id}.jpg`);
    let ok = fs.existsSync(fin);                                                      // ya generado antes: se reutiliza
    for (let i = 1; i <= 5 && !ok; i++) {
      try {
        // sin cuenta, Pollinations admite ~1 imagen cada 18 s: se respeta su Retry-After (nunca se paga nada)
        const espera = ultimo + 19000 - Date.now(); if (espera > 0) await esperar(espera);
        ultimo = Date.now();
        const r = await fetch(url, { signal: AbortSignal.timeout(120000) });
        if (r.status === 402 || r.status === 429) { const ra = Number(r.headers.get("retry-after")) || 20; await esperar((ra + 2) * 1000); throw new Error(`esperando turno (${r.status})`); }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 10000) throw new Error("imagen vacía");
        fs.writeFileSync(crudo, buf);
        // recorta la franja de abajo (marca de agua) y agranda a 2048 de ancho
        await ffmpeg(["-v", "error", "-y", "-i", crudo, "-vf", "crop=iw:ih*0.92:0:0,scale=2048:-2:flags=lanczos", "-q:v", "3", fin]);
        fs.unlinkSync(crudo);
        ok = true;
      } catch (err) { log(`Fondo escena ${e.id}: intento ${i} (${err.message})`); }
    }
    e.fondoImg = ok ? (bib ? `fondos/biblioteca/${clave}.jpg` : path.posix.join(rel, `esc_${e.id}.jpg`)) : null;
    if (ok) hechos++;
    log(`Fondo escena ${e.id}: ${ok ? "listo" : "sin fondo (se usa el paisaje 3D)"}`);
  }
  return hechos;
};
