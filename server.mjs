// Servidor local de Stickman Studio: sirve la ventana del guion (ui/index.html) y corre el orquestador.
// Solo escucha en 127.0.0.1. Un trabajo a la vez (el render usa toda la GPU).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generar } from "./agentes/orquestador.mjs";
import { generarEpisodio } from "./agentes/episodio.mjs";
import { hayClave } from "./agentes/deepseek.mjs";

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.PORT || 4500);
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json; charset=utf-8", ".mp4": "video/mp4", ".jpg": "image/jpeg", ".png": "image/png", ".wav": "audio/wav", ".txt": "text/plain; charset=utf-8" };

const trabajos = new Map(); // id -> { estado, eventos[], clientes:Set, resultado }
let ocupado = false;

const emitir = (job, ev) => {
  job.eventos.push(ev);
  const linea = `data: ${JSON.stringify(ev)}\n\n`;
  for (const c of job.clientes) c.write(linea);
};

const servirArchivo = (res, file) => {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end("no existe"); }
  const tipo = TIPOS[path.extname(file).toLowerCase()] || "application/octet-stream";
  const size = fs.statSync(file).size, range = res.req.headers.range;
  if (range && tipo === "video/mp4") {
    const [a, b] = range.replace("bytes=", "").split("-"), ini = Number(a), fin = b ? Number(b) : size - 1;
    res.writeHead(206, { "Content-Type": tipo, "Content-Range": `bytes ${ini}-${fin}/${size}`, "Accept-Ranges": "bytes", "Content-Length": fin - ini + 1 });
    return fs.createReadStream(file, { start: ini, end: fin }).pipe(res);
  }
  res.writeHead(200, { "Content-Type": tipo, "Content-Length": size });
  fs.createReadStream(file).pipe(res);
};
const dentro = (base, rel) => { const p = path.resolve(base, rel); return p.startsWith(path.resolve(base) + path.sep) ? p : null; };
const leerCuerpo = (req) => new Promise((ok) => { let s = ""; req.on("data", (d) => { s += d; if (s.length > 2e6) req.destroy(); }); req.on("end", () => ok(s)); });
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(obj)); };
const urlDe = (abs) => "/archivos/" + path.relative(path.join(RAIZ, "proyectos"), abs).split(path.sep).map(encodeURIComponent).join("/");

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  try {
    if (req.method === "GET" && (u.pathname === "/" || u.pathname === "/index.html")) return servirArchivo(res, path.join(RAIZ, "ui", "index.html"));
    if (req.method === "GET" && u.pathname === "/api/estado") return json(res, 200, { deepseek: hayClave(), ocupado });
    if (req.method === "GET" && u.pathname.startsWith("/archivos/")) {
      const f = dentro(path.join(RAIZ, "proyectos"), decodeURIComponent(u.pathname.slice("/archivos/".length)));
      return f ? servirArchivo(res, f) : (res.writeHead(403), res.end());
    }
    if (req.method === "GET" && u.pathname === "/api/proyectos") {
      const base = path.join(RAIZ, "proyectos");
      const lista = fs.existsSync(base) ? fs.readdirSync(base).filter((d) => fs.existsSync(path.join(base, d, "guion.txt"))).sort().reverse().slice(0, 30).map((d) => {
        const v = [path.join(base, d, "video_final.mp4"), path.join(base, d, "episodio_final.mp4")].find((x) => fs.existsSync(x)) ?? path.join(base, d, "video_final.mp4");
        return { carpeta: d, guion: fs.readFileSync(path.join(base, d, "guion.txt"), "utf8").slice(0, 140), video: fs.existsSync(v) ? urlDe(v) : null };
      }) : [];
      return json(res, 200, lista);
    }
    if (req.method === "POST" && u.pathname === "/api/generar") {
      if (ocupado) return json(res, 409, { error: "Ya hay un video generándose. Espera a que termine." });
      const op = JSON.parse(await leerCuerpo(req) || "{}");
      if (!op.guion || op.guion.trim().length < 10) return json(res, 400, { error: "Escribe un guion (al menos una frase)." });
      const id = Date.now().toString(36);
      const job = { estado: "corriendo", eventos: [], clientes: new Set() };
      trabajos.set(id, job); ocupado = true;
      json(res, 200, { id });
      // guion largo con capítulos/escenas → modo episodio (horizontal, cine negro, por capítulos); si no, short
      const episodio = op.episodio ?? /^#\s*CAP[IÍ]TULO|^###\s*ESCENA/im.test(op.guion);
      (episodio ? generarEpisodio : generar)({
        guion: episodio ? op.guion.trim() : op.guion.trim().slice(0, 6000), voz: op.voz, velocidad: op.velocidad, calidad: op.calidad, local: !!op.local,
        escala: op.calidad === "final" ? 1 : 0.6667, concurrencia: 2,
        log: (m) => emitir(job, { tipo: "log", m: String(m) }),
        paso: (n, e) => emitir(job, { tipo: "paso", n, e }),
        progreso: (p) => emitir(job, { tipo: "progreso", p }),
        fotos: (fs_) => emitir(job, { tipo: "fotos", urls: fs_.map(urlDe) }),
      }).then((r) => {
        job.estado = "listo";
        emitir(job, { tipo: "fin", video: urlDe(r.final), plan: urlDe(path.join(r.dir, fs.existsSync(path.join(r.dir, "plan.json")) ? "plan.json" : "plan_base.json")), carpeta: r.dir });
      }).catch((e) => {
        job.estado = "error";
        emitir(job, { tipo: "error", m: e.message });
      }).finally(() => { ocupado = false; });
      return;
    }
    if (req.method === "GET" && u.pathname.startsWith("/api/eventos/")) {
      const job = trabajos.get(u.pathname.split("/").pop());
      if (!job) return json(res, 404, { error: "trabajo no encontrado" });
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      for (const ev of job.eventos) res.write(`data: ${JSON.stringify(ev)}\n\n`);
      job.clientes.add(res);
      req.on("close", () => job.clientes.delete(res));
      return;
    }
    res.writeHead(404); res.end("no encontrado");
  } catch (e) { json(res, 500, { error: e.message }); }
}).listen(PUERTO, "127.0.0.1", () => console.log(`Stickman Studio listo: http://127.0.0.1:${PUERTO}`));
