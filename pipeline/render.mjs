// Render con la API de Remotion: empaqueta una vez, abre el navegador una vez (con reintentos, porque en
// Windows el arranque de Chrome headless a veces tarda más de 25 s) y lo reutiliza para fotos y video.
// Uso CLI:
//   node pipeline/render.mjs fotos  <plan.json> <carpeta> 30,150,250 [escala]
//   node pipeline/render.mjs video  <plan.json> <salida.mp4> [escala]
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { openBrowser, selectComposition, renderStill, renderMedia } from "@remotion/renderer";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROMIUM = { gl: "angle", enableMultiProcessOnLinux: true };

let _bundle = null;
/** vuelve a empaquetar en el próximo render (p. ej. tras agregar fondos nuevos a public/) */
export const invalidarPaquete = () => { _bundle = null; };
export const empaquetar = async (log = console.log) => {
  if (_bundle) return _bundle;
  log("Empaquetando el motor…");
  _bundle = await bundle({ entryPoint: path.join(RAIZ, "src", "index.ts"), publicDir: path.join(RAIZ, "public"), onProgress: () => {} });
  return _bundle;
};

export const abrirNavegador = async (log = console.log) => {
  let ultimo;
  for (let i = 1; i <= 5; i++) {
    try {
      return await openBrowser("chrome", { chromiumOptions: CHROMIUM, logLevel: "error" });
    } catch (e) {
      ultimo = e;
      log(`El navegador no arrancó (intento ${i}/5), reintentando…`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw ultimo;
};

const comp = async (serveUrl, inputProps, browser) =>
  selectComposition({ serveUrl, id: "Historia", inputProps, puppeteerInstance: browser, chromiumOptions: CHROMIUM, logLevel: "error" });

export const fotos = async ({ plan, carpeta, cuadros, escala = 0.5, log = console.log, extra = {} }) => {
  const serveUrl = await empaquetar(log), browser = await abrirNavegador(log);
  try {
    const inputProps = { plan, ...extra };
    const composition = await comp(serveUrl, inputProps, browser);
    fs.mkdirSync(carpeta, { recursive: true });
    const out = [];
    for (const f of cuadros) {
      const salida = path.join(carpeta, `cuadro_${String(f).padStart(4, "0")}.jpg`);
      await renderStill({ serveUrl, composition, frame: Math.min(f, composition.durationInFrames - 1), output: salida, inputProps, scale: escala,
        imageFormat: "jpeg", jpegQuality: 88, puppeteerInstance: browser, chromiumOptions: CHROMIUM, timeoutInMilliseconds: 120000, logLevel: "error" });
      log(`Foto del cuadro ${f} lista`);
      out.push(salida);
    }
    return out;
  } finally { await browser.close({ silent: true }).catch(() => {}); }
};

/** hoja de personajes (composición "Hoja") en un JPG */
export const hoja = async ({ props, salida, escala = 0.5, log = console.log }) => {
  const serveUrl = await empaquetar(log), browser = await abrirNavegador(log);
  try {
    const composition = await selectComposition({ serveUrl, id: "Hoja", inputProps: props, puppeteerInstance: browser, chromiumOptions: CHROMIUM, logLevel: "error" });
    fs.mkdirSync(path.dirname(salida), { recursive: true });
    await renderStill({ serveUrl, composition, frame: 0, output: salida, inputProps: props, scale: escala, imageFormat: "jpeg", jpegQuality: 90,
      puppeteerInstance: browser, chromiumOptions: CHROMIUM, timeoutInMilliseconds: 180000, logLevel: "error" });
    return salida;
  } finally { await browser.close({ silent: true }).catch(() => {}); }
};

export const video = async ({ plan, salida, escala = 1, log = console.log, progreso = () => {}, concurrencia = 1 }) => {
  const serveUrl = await empaquetar(log), browser = await abrirNavegador(log);
  try {
    const inputProps = { plan };
    const composition = await comp(serveUrl, inputProps, browser);
    log(`Renderizando ${composition.durationInFrames} cuadros…`);
    let ult = -1;
    await renderMedia({ serveUrl, composition, codec: "h264", crf: 18, outputLocation: salida, inputProps, scale: escala,
      puppeteerInstance: browser, chromiumOptions: CHROMIUM, concurrency: concurrencia, imageFormat: "jpeg", jpegQuality: 92,
      timeoutInMilliseconds: 180000, logLevel: "error",
      onProgress: ({ progress }) => { const p = Math.floor(progress * 100); if (p !== ult) { ult = p; progreso(p); } } });
    return salida;
  } finally { await browser.close({ silent: true }).catch(() => {}); }
};

// ---------------- CLI ----------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [modo, planPath, destino, a, b] = process.argv.slice(2);
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const extra = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
  if (modo === "fotos") await fotos({ plan, carpeta: destino, cuadros: a.split(",").map(Number), escala: Number(b ?? 0.5), extra });
  else if (modo === "video") await video({ plan, salida: destino, escala: Number(a ?? 1), progreso: (p) => process.stdout.write(`\r${p}%`) });
  else console.log("uso: fotos|video …");
  process.exit(0);
}
