// Orquestador: guion → Organizador → Diseñador → Voz → Editor → Validador → Render → Sonido → MP4.
// Cada paso guarda su resultado en proyectos/<carpeta>/ para poder revisar y repetir.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { agente, hayClave } from "./deepseek.mjs";
import { ORGANIZADOR, DISENADOR, EDITOR, VALIDADOR } from "./prompts.mjs";
import { validarPlan, aplicarCorrecciones } from "./validar.mjs";
import { organizarLocal } from "./local.mjs";
import { fotos, video, invalidarPaquete } from "../pipeline/render.mjs";
import { generarFondos } from "../pipeline/fondos.mjs";
import { buildSync } from "esbuild";
import { pathToFileURL } from "node:url";

/** el director automático vive en TypeScript (lo usa el motor); lo empaquetamos para usarlo aquí también */
let _director = null;
const director = async () => {
  if (_director) return _director;
  const out = path.join(RAIZ, "out", "director.bundle.mjs");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  buildSync({ entryPoints: [path.join(RAIZ, "src", "motor", "director.ts")], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error" });
  _director = await import(pathToFileURL(out).href + `?v=${Date.now()}`);
  return _director;
};

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PY = process.env.PYTHON || "python";

const correr = (cmd, args, log) => new Promise((ok, mal) => {
  const p = spawn(cmd, args, { cwd: RAIZ, windowsHide: true });
  let err = "";
  p.stdout.on("data", (d) => String(d).split(/\r?\n/).filter(Boolean).forEach((l) => log(l)));
  p.stderr.on("data", (d) => { err += d; });
  p.on("close", (c) => (c === 0 ? ok() : mal(new Error(`${cmd} ${args[0]} terminó con código ${c}: ${err.slice(-600)}`))));
});
const guardar = (dir, nombre, obj) => fs.writeFileSync(path.join(dir, nombre), typeof obj === "string" ? obj : JSON.stringify(obj, null, 2), "utf8");
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "historia";

/** opciones: { guion, voz, velocidad, calidad: "borrador"|"final", soloPlan, log, paso, progreso } */
export const generar = async (op) => {
  const log = op.log ?? console.log, paso = op.paso ?? (() => {}), progreso = op.progreso ?? (() => {});
  const usarIA = hayClave() && !op.local;
  const fecha = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const dir = path.join(RAIZ, "proyectos", `${fecha}-${slug(op.guion.split(/[.\n]/)[0])}`);
  fs.mkdirSync(dir, { recursive: true });
  guardar(dir, "guion.txt", op.guion);
  log(usarIA ? "Agentes: DeepSeek" : "Agentes: modo local (sin DeepSeek; resultado básico)");

  // 1. Organizador
  paso("organizador", "trabajando");
  const org = usarIA
    ? await agente({ nombre: "Organizador", system: ORGANIZADOR, user: `GUION DEL USUARIO:\n${op.guion}`, log, temperatura: 0.8 })
    : organizarLocal(op.guion);
  guardar(dir, "1_organizador.json", org);
  log(`Organizador: ${org.escenas?.length ?? 0} escenas, ${org.personajes?.length ?? 0} personajes`);
  paso("organizador", "listo");

  // 2. Diseñador
  paso("disenador", "trabajando");
  let dis;
  if (usarIA) dis = await agente({ nombre: "Diseñador", system: DISENADOR, user: { historia: org }, log, temperatura: 0.7 });
  else dis = { personajes: org.personajes, escenas: org.escenas };
  guardar(dir, "2_disenador.json", dis);
  const plan = {
    titulo: org.titulo,
    personajes: dis.personajes ?? org.personajes ?? [],
    escenas: (org.escenas ?? []).map((e, i) => {
      const d = (dis.escenas ?? []).find((x) => Number(x.id) === Number(e.id)) ?? dis.escenas?.[i] ?? {};
      return { id: i + 1, narracion: e.narracion, ambiente: d.ambiente ?? { lugar: e.lugar, hora: e.hora }, actores: d.actores ?? e.actores ?? [],
        objetos: d.objetos ?? e.objetos ?? [], multitudes: d.multitudes ?? [], luces: d.luces ?? [], camara: e.camara, transicion: e.transicion, efectos: e.efectos ?? [] };
    }),
  };
  validarPlan(plan);
  paso("disenador", "listo");

  // 3. Voz y tiempos
  paso("voz", "trabajando");
  const vdir = path.join(dir, "voz");
  let tiempos = null;
  try {
    guardar(dir, "voz_entrada.json", { voz: op.voz || "es-MX-JorgeNeural", velocidad: op.velocidad || "+8%", escenas: plan.escenas.map((e) => ({ id: e.id, narracion: e.narracion })) });
    await correr(PY, ["pipeline/voz.py", path.join(dir, "voz_entrada.json"), vdir], (l) => log(`Voz: ${l}`));
    tiempos = JSON.parse(fs.readFileSync(path.join(vdir, "tiempos.json"), "utf8"));
    for (const e of plan.escenas) { const t = tiempos.escenas.find((x) => x.id === e.id); if (t) { e.inicio = t.inicio; e.duracion = t.duracion; } }
  } catch (err) {
    log(`Voz: no se pudo generar (${err.message.slice(0, 160)}). Se usan tiempos estimados, sin narración.`);
    let t = 0;
    for (const e of plan.escenas) { const n = e.narracion.split(/\s+/).length; e.inicio = t; e.duracion = Math.max(1.6, n / 3.5); t += e.duracion; }
  }
  paso("voz", tiempos ? "listo" : "aviso");

  // 4. Editor
  paso("editor", "trabajando");
  if (usarIA) {
    const pal = tiempos?.palabras ?? [];
    const entrada = plan.escenas.map((e) => ({ id: e.id, narracion: e.narracion, duracion: e.duracion, lugar: e.ambiente.lugar, hora: e.ambiente.hora,
      actores: e.actores.map((a) => ({ id: a.id, accion: a.accion, luego: a.luego, mano: a.mano })),
      objetos: e.objetos.map((o, k) => ({ indice: k, tipo: o.tipo, estado: o.estado, t: o.t, material: o.material })),
      multitudes: (e.multitudes ?? []).map((m, k) => ({ indice: k, tipo: m.tipo, cantidad: m.cantidad, accion: m.accion, t: m.t })),
      luces: (e.luces ?? []).map((l, k) => ({ indice: k, tipo: l.tipo, cantidad: l.cantidad, crecer: l.crecer })),
      palabras: pal.filter((w) => w.a >= e.inicio && w.a < e.inicio + e.duracion).map((w) => ({ w: w.w, t: +(w.a - e.inicio).toFixed(2) })) }));
    const ed = await agente({ nombre: "Editor", system: EDITOR, user: { escenas: entrada }, log, temperatura: 0.6 });
    guardar(dir, "3_editor.json", ed);
    for (const x of ed.escenas ?? []) {
      const e = plan.escenas.find((y) => y.id === Number(x.id)); if (!e) continue;
      Object.assign(e, { camara: x.camara ?? e.camara, tomas: x.tomas ?? e.tomas, transicion: x.transicion ?? e.transicion, efectos: x.efectos ?? e.efectos, rotulo: x.rotulo ?? null });
      for (const aj of x.ajustes_luego ?? []) { const a = e.actores.find((z) => z.id === aj.actor); if (a?.luego) a.luego.t = Number(aj.t) || a.luego.t; }
      for (const aj of x.ajustes_objeto ?? []) { const o = e.objetos[Number(aj.indice)]; if (o && Number.isFinite(Number(aj.t))) o.t = Number(aj.t); }
    }
  }
  paso("editor", "listo");

  // 5. Validador: verificador automático + agente
  paso("validador", "trabajando");
  let { problemas } = validarPlan(plan, { durTotal: tiempos?.total });
  log(`Verificador automático: ${problemas.length} detalle(s) corregido(s)`);
  if (usarIA) {
    const v = await agente({ nombre: "Validador", system: VALIDADOR, user: { plan, problemas_automaticos: problemas }, log, temperatura: 0.3 });
    guardar(dir, "4_validador.json", v);
    const n = aplicarCorrecciones(plan, v.correcciones);
    log(`Validador: ${v.aprobado ? "aprobado" : "con observaciones"}; ${(v.problemas ?? []).length} problema(s), ${n} corrección(es) aplicada(s)`);
    for (const p of (v.problemas ?? []).slice(0, 8)) log(`  · ${p}`);
    ({ problemas } = validarPlan(plan, { durTotal: tiempos?.total }));
  }
  plan.audio = { voz: null, mezcla: null, palabras: tiempos?.palabras ?? [] };
  // ritmo: toda escena queda con tomas cada 1.2–2.2 s (las del Editor se respetan; si faltan, las completa el director)
  const { tomasDe } = await director();
  let nEd = 0, nTot = 0;
  for (const e of plan.escenas) { nEd += e.tomas?.length ?? 0; e.tomas = tomasDe(e, plan.audio.palabras); nTot += e.tomas.length; }
  const durTot = plan.escenas.reduce((s, e) => s + e.duracion, 0);
  log(`Tomas: ${nTot} en ${durTot.toFixed(0)} s (una cada ${(durTot / Math.max(1, nTot)).toFixed(1)} s; ${nEd} del Editor)`);
  guardar(dir, "plan.json", plan);
  paso("validador", "listo");
  if (op.soloPlan) return { dir, plan };

  // 6a. Fondos fotográficos (Pollinations): un paisaje por escena detrás de la escena 3D
  paso("fondos", "trabajando");
  try {
    const n = await generarFondos(plan, path.basename(dir), (l) => log(l));
    invalidarPaquete(); guardar(dir, "plan.json", plan);
    paso("fondos", n ? "listo" : "aviso");
  } catch (err) { log(`Fondos: falló (${err.message.slice(0, 200)}); se usa el paisaje 3D`); paso("fondos", "aviso"); }

  // 6. Sonido (música + efectos + voz, -14 LUFS)
  paso("sonido", "trabajando");
  let mezcla = null;
  try {
    fs.mkdirSync(vdir, { recursive: true });
    await correr(PY, ["pipeline/sonido.py", path.join(dir, "plan.json"), vdir], (l) => log(`Sonido: ${l}`));
    mezcla = path.join(vdir, "mezcla.wav");
  } catch (err) { log(`Sonido: falló (${err.message.slice(0, 200)})`); }
  paso("sonido", mezcla ? "listo" : "aviso");

  // 7. Render
  paso("render", "trabajando");
  const escala = op.calidad === "final" ? 1 : 0.5;
  const prev = await fotos({ plan, carpeta: path.join(dir, "fotos"), cuadros: plan.escenas.map((e) => Math.round((e.inicio + e.duracion * 0.6) * 30)), escala: 0.35, log });
  op.fotos?.(prev);
  const mudo = path.join(dir, "video_mudo.mp4");
  await video({ plan, salida: mudo, escala, log, progreso });
  const final = path.join(dir, "video_final.mp4");
  if (mezcla) await correr("ffmpeg", ["-v", "error", "-y", "-i", mudo, "-i", mezcla, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", final], log);
  else fs.copyFileSync(mudo, final);
  paso("render", "listo");
  log(`Video listo: ${final}`);
  return { dir, plan, final };
};

// CLI: node agentes/orquestador.mjs guion.txt [--local] [--final]
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const g = fs.readFileSync(process.argv[2], "utf8");
  const r = await generar({ guion: g, local: process.argv.includes("--local"), calidad: process.argv.includes("--final") ? "final" : "borrador",
    progreso: (p) => process.stdout.write(`\rrender ${p}%   `) });
  console.log("\n", r.final);
  process.exit(0);
}
