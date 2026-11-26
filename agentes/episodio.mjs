// Modo EPISODIO (videos largos de casos policiales, horizontales, estilo cine negro).
// guion largo → reparto (1 llamada) → director por bloque (varias en paralelo) → carteles de capítulo → validador
// → fondos de biblioteca → por cada capítulo: voz (cada personaje con su voz) + sonido + render → unión final.
// Cada paso guarda su resultado; si se corta, al volver a correr con la misma carpeta retoma donde quedó.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildSync } from "esbuild";
import { agente, hayClave } from "./deepseek.mjs";
import { DESCRIPCION } from "./catalogo.mjs";
import { textoActuacion, textoBibliaVisual } from "./biblioteca.mjs";
import { coherencia, nuevoEstado, CAMARAS_SET, MANSION } from "./coherencia.mjs";
import { revisarBloque } from "./revisor.mjs";
import { validarPlan } from "./validar.mjs";
import { video, invalidarPaquete } from "../pipeline/render.mjs";
import { generarFondos } from "../pipeline/fondos.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PY = process.env.PYTHON || "python";
const guardar = (dir, n, o) => fs.writeFileSync(path.join(dir, n), typeof o === "string" ? o : JSON.stringify(o, null, 1), "utf8");
const leer = (dir, n) => { const p = path.join(dir, n); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "episodio";
const correr = (cmd, args, log) => new Promise((ok, mal) => {
  const p = spawn(cmd, args, { cwd: RAIZ, windowsHide: true }); let err = "";
  p.stdout.on("data", (d) => String(d).split(/\r?\n/).filter(Boolean).forEach((l) => log(l)));
  p.stderr.on("data", (d) => { err += d; });
  p.on("close", (c) => (c === 0 ? ok() : mal(new Error(`${cmd} ${args[0]} terminó con código ${c}: ${err.slice(-600)}`))));
});
let _dir = null;
const director = async () => {
  if (_dir) return _dir;
  const out = path.join(RAIZ, "out", "director.bundle.mjs");
  buildSync({ entryPoints: [path.join(RAIZ, "src", "motor", "director.ts")], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error" });
  return (_dir = await import(pathToFileURL(out).href + `?v=${Date.now()}`));
};
/** corre tareas con un máximo de n a la vez */
const pool = async (items, n, f) => { const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await f(items[k], k); } })); return out; };

// ---------------- 1. partir el guion ----------------
/** devuelve { titulo, subtitulo, bloques: [{ cap, capTitulo, capEtiqueta, nombre, texto }] } */
export const partirGuion = (guion) => {
  const L = guion.replace(/\r/g, "").split("\n");
  let titulo = "", subtitulo = "", cap = 0, capTitulo = "", capEtiqueta = "", cur = null;
  const bloques = [];
  const limpia = (s) => s.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
  for (const l of L) {
    const t = l.trim();
    if (/^#\s+EPISODIO/i.test(t)) { titulo = limpia(t).replace(/^EPISODIO\s*\d+\s*[:—-]\s*/i, ""); continue; }
    if (/^###\s+(?!ESCENA)/i.test(t) && !subtitulo && !cap) { subtitulo = limpia(t); continue; }
    if (/^#\s+(PR[OÓ]LOGO|CAP[IÍ]TULO|EP[IÍ]LOGO)/i.test(t)) {
      cap++; const x = limpia(t).split(/\s+[—–-]\s+/); capEtiqueta = x[0]; capTitulo = x.slice(1).join(" — ") || x[0]; cur = null; continue;
    }
    if (/^###\s+ESCENA/i.test(t)) { cur = { cap, capTitulo, capEtiqueta, nombre: limpia(t), texto: "" }; bloques.push(cur); continue; }
    if (/^#\s*FIN/i.test(t) || /^##\s+FIN/i.test(t)) { cur = null; continue; }
    if (cur) cur.texto += l + "\n";
  }
  for (const b of bloques) b.texto = b.texto.replace(/^\*\*Tiempo aproximado.*$/gim, "").replace(/\n{3,}/g, "\n\n").replace(/^---$/gm, "").trim();
  return { titulo: titulo || "Episodio", subtitulo, bloques: bloques.filter((b) => b.texto.length > 20) };
};

// ---------------- prompts ----------------
const REPARTO = `Eres el DIRECTOR DE CASTING de un canal de YouTube de casos policiales reales animados con monitos de palito
(cabeza redonda, cuerpo ovalado, brazos y piernas de línea) en mundos 3D de estilo cine negro.
Lees el guion completo y devuelves el reparto: TODOS los personajes con diálogo o que aparecen (máx. 28), sin el narrador.
Para cada uno: id corto (minúsculas, sin espacios ni tildes), nombre, descripcion (oficio, edad, aspecto), sexo ("h"/"m"),
y su diseño visual con valores del catálogo: complexion, piel (#hex natural), camisa, pantalon, zapatos, vestido (solo
mujeres, #hex o null), sombrero, colorSombrero, peinado, ropa, colorRopa2, rasgos, bigote (#hex o null).
Época: ropa y sombreros de la época de la historia (años 30: fedora, gorra_policia, cloche; traje, gabardina, uniforme,
bata). Colores sobrios de época (grises, marrones, azul marino, negro, burdeos) pero distintos entre personajes.
Los personajes que el guion pide sin rostro (el secuestrador, una silueta) van con fedora y gabardina oscuras.
Un bebé o niño pequeño: complexion "nino".
Devuelve SOLO JSON: {"titulo": "...", "epoca": 1932, "fondoEpoca": "descripción EN INGLÉS de época y región para fondos
fotográficos, p. ej. 1930s rural New Jersey, USA", "personajes": [ ... ]}
${DESCRIPCION}`;

const DIRECTOR = `Eres el DIRECTOR de un episodio largo de un canal de casos policiales reales animados con monitos de palito
en mundos 3D de estilo cine negro (horizontal 16:9, narrador pausado, tomas largas, misterio, respeto por las víctimas).
Recibes UN BLOQUE del guion (una escena del guion con NARRADOR, diálogos de personajes, indicaciones VISUAL y SONIDO) y el reparto.
Conviértelo en una lista de ESCENAS FILMABLES en orden:
- NARRACIÓN LITERAL: copia el texto del NARRADOR y de cada diálogo EXACTAMENTE como está (no resumas, no inventes, no
  cambies palabras). Junta frases seguidas del narrador en escenas de 1 a 3 frases (máx. ~40 palabras).
- Cada línea de diálogo es su propia escena, con "habla": id del personaje que la dice (el narrador = null). El que habla
  está en la escena con accion "hablar" y la cámara apunta a él. Si el guion dice «RECREACIÓN» igual va como diálogo.
- Las indicaciones VISUAL dicen qué se ve: úsalas para el lugar, la hora, los actores, los objetos y la cámara de las escenas
  que siguen. SONIDO, «CORTE A NEGRO» y similares no se narran.
- «TEXTO EN PANTALLA: X» o «TEXTO FINAL: X» → una escena sin narración con "titulo": "X".
- Continuidad: mientras la historia siga en el mismo sitio, repite el mismo lugar, hora y los mismos objetos en las mismas
  posiciones. Cambia la cámara entre escenas (no repitas el mismo tipo dos veces seguidas).
- Lo que no se debe mostrar (un cuerpo, violencia) NO se muestra: muestra la reacción de los personajes o el lugar vacío.
- Un bebé dormido NO va como actor: basta la "cuna" (objeto) en la habitación. Un bebé en brazos: el adulto con
  accion "cargar" y "mano": "bebe". Nunca pongas un bebé o niño pequeño sentado en el suelo.
- DECORADOS FIJOS: si recibes "escenarios", cada escena lleva "ambiente": {"escenario": id, "lugar": su motor, "hora", "clima"}
  usando SOLO esos escenarios, en el orden en que la historia pasa por ellos, con una de sus horas y climas. No agregues árboles
  ni casas sueltas: el decorado ya los tiene. Si recibes "secuencia", es el análisis de la escena: quién está, QUÉ HACE y qué siente;
  haz que lo actúen (acciones y recetas de abajo) en las escenas donde la narración lo cuenta.
- En el lugar "mansion" la casa grande ya está al fondo: no agregues el objeto "mansion" allí.
- Un avión: despegando o aterrizando en "aerodromo" (avion estado "despega" o "aterriza"), volando en "cielo" (estado "vuela")
  y el piloto adentro en "cabina" (accion "pilotar").
- Escenario: actores en x -4..4, z -3..3, separados 1.2 m o más; objetos en x -6..6, z -6..2; edificios grandes al fondo.
- Usa la hora que pide el guion (noche, atardecer…) y los lugares de los años 30 del catálogo.
- ES UNA PELÍCULA, NO UNA PRESENTACIÓN: nadie se queda quieto mirando a cámara. Mientras el narrador habla, el
  protagonista de la escena HACE lo que se cuenta o algo coherente con ello: camina por el lugar, se acerca a un objeto,
  revisa papeles en el escritorio, mira por la ventana, señala la pizarra, se sienta, se agarra la cabeza, lee el
  periódico, carga al bebé, se acerca a la escalera, se aleja… Para eso cada actor lleva "pasos": 2 a 4 acciones en
  orden, cada una con "cuando" = una palabra EXACTA de la narración de esa escena en la que empieza.
  Ejemplo: "pasos": [{"cuando": "noche", "accion": "caminar", "hacia": [2, -1.5]}, {"cuando": "ventana", "accion": "pensar",
  "expresion": "pensativo"}, {"cuando": "nadie", "accion": "sorpresa", "expresion": "asustado"}].
- Los personajes ENTRAN y SALEN caminando: empiezan en un borde (x = -4 o 4) con accion "caminar" y "hacia" al punto
  donde hacen algo; para ir hacia un objeto, "hacia" = un punto a 1 m del objeto. Quien habla también se mueve: camina
  unos pasos y vuelve a "hablar". Los que escuchan reaccionan (pensar, encogerse, manos_cadera, senalar, sorpresa).
- Tono serio: nada de "celebrar", saltos ni "saludar" salvo que el guion lo pida.
- Escenarios llenos y cerrados: además del decorado del lugar, pon 2 a 4 objetos de utilería cerca de los actores
  (en la calle: auto, farola, hidrante, cubo, kiosco, buzon; en el jardín: seto, banca, farola; en la oficina:
  escritorio, archivador, estante, lampara; en la habitación: cuna, sillon, estante, lampara). Que la acción use esos objetos.
- En interiores (habitacion, oficina, carcel, supermercado) la sala es chica: actores en x -3..3 y z -2.5..2.5.
Devuelve SOLO JSON:
{"escenas": [{"narracion": "texto exacto", "habla": null, "titulo": null,
  "ambiente": {"lugar": "mansion", "hora": "noche"},
  "actores": [{"id": "charles", "x": -4, "z": 0, "accion": "caminar", "expresion": "serio", "hacia": [-1, -1], "mano": null,
               "pasos": [{"cuando": "palabra", "accion": "pensar", "expresion": "pensativo", "hacia": null, "mano": null}]}],
  "objetos": [{"tipo": "escalera", "x": -2, "z": -1, "escala": 1, "giro": 0, "estado": "normal", "material": "normal"}],
  "multitudes": [], "luces": [],
  "camara": {"tipo": "acercamiento", "plano": "general", "objetivo": "charles"}, "transicion": "corte", "efectos": [], "rotulo": null}]}
"rotulo" = fecha o cifra clave discreta arriba (p. ej. "1 de marzo de 1932", "$50.000"); úsalo cuando la narración dé una fecha.
Cada personaje ACTÚA lo que dice la narración, como un actor de televisión (no se queda parado): usa las acciones y recetas de abajo.
${DESCRIPCION}

${textoActuacion()}`;

// ---------------- voces ----------------
// Brian (narrador) y Ava son voces "multilingües", más humanas; el resto, voces en español con el modo natural
const VOCES_H = ["es-MX-JorgeNeural", "en-AU-WilliamMultilingualNeural", "es-ES-AlvaroNeural", "es-AR-TomasNeural", "es-CO-GonzaloNeural", "es-US-AlonsoNeural", "es-CL-LorenzoNeural", "es-VE-SebastianNeural", "es-PE-AlexNeural", "es-CR-JuanNeural", "es-UY-MateoNeural"];
const VOCES_M = ["en-US-AvaMultilingualNeural", "en-US-EmmaMultilingualNeural", "es-MX-DaliaNeural", "es-ES-ElviraNeural", "es-AR-ElenaNeural", "es-CO-SalomeNeural", "es-US-PalomaNeural", "es-CL-CatalinaNeural"];
let NARRADOR = "en-US-BrianMultilingualNeural";

/** ElevenLabs (si hay ELEVENLABS_API_KEY): reparte las voces de la cuenta por sexo y edad. Devuelve {narrador, voces} con ids "el:<id>".
 *  ELEVENLABS_NARRADOR = id de la voz del narrador (opcional). Se guarda en voces.json para que no cambie al reanudar. */
const vocesEleven = async (personajes, dir, log) => {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) return null;
  const f = path.join(dir, "voces.json");
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": k } });
  if (!r.ok) throw new Error(`ElevenLabs /voices respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const lista = ((await r.json()).voices ?? []).map((v) => ({ id: v.voice_id, nombre: v.name, g: String(v.labels?.gender ?? "").toLowerCase(),
    edad: String(v.labels?.age ?? "").toLowerCase(), uso: String(v.labels?.use_case ?? v.labels?.["use case"] ?? "").toLowerCase() }));
  if (!lista.length) throw new Error("La cuenta de ElevenLabs no tiene voces");
  const narr = lista.find((v) => v.id === process.env.ELEVENLABS_NARRADOR)
    ?? lista.find((v) => v.g === "male" && /narra|story|document/.test(v.uso)) ?? lista.find((v) => v.g === "male") ?? lista[0];
  const resto = lista.filter((v) => v !== narr);
  const H = resto.filter((v) => v.g !== "female"), M = resto.filter((v) => v.g === "female");
  const edadDe = (p) => { const n = Number(String(p.descripcion ?? "").match(/(\d{2})\s*a/)?.[1]); return n >= 55 ? "old" : n && n < 30 ? "young" : "middle"; };
  const usadas = new Map(), voces = {};
  for (const p of personajes) {
    const pool = (p.sexo === "m" || p.vestido ? M : H).length ? (p.sexo === "m" || p.vestido ? M : H) : resto.length ? resto : [narr];
    const e = edadDe(p);
    // la menos usada, prefiriendo la edad parecida
    const v = [...pool].sort((a, b) => (usadas.get(a.id) ?? 0) - (usadas.get(b.id) ?? 0) || (b.edad.includes(e) ? 1 : 0) - (a.edad.includes(e) ? 1 : 0))[0];
    usadas.set(v.id, (usadas.get(v.id) ?? 0) + 1);
    voces[String(p.id).toLowerCase()] = "el:" + v.id;
  }
  const out = { narrador: "el:" + narr.id, voces, nombres: Object.fromEntries([[narr.id, narr.nombre], ...resto.map((v) => [v.id, v.nombre])]) };
  fs.writeFileSync(f, JSON.stringify(out, null, 1));
  log(`ElevenLabs: narrador ${narr.nombre}; ${Object.keys(voces).length} personajes con ${usadas.size} voces de la cuenta`);
  return out;
};

// ---------------- dinamismo ----------------
const SALA = { habitacion: [3.0, -2.9], oficina: [3.5, -3.1], tribunal: [5.2, -4.4], carcel: [1.7, -5.2], supermercado: [1.9, -4.2] };
const ACTUAR = ["escribir", "fotografiar", "entrevistar", "preocuparse", "espiar", "trepar", "entrar", "pilotar", "explicar", "cubrirse", "leer", "cargar", "arropar", "asentir", "negar", "cruzar_brazos", "dudar", "suplicar", "abrazar", "consolar", "esperar", "temblar", "desesperarse", "llamar", "mirar_reloj", "entregar", "tocar_puerta", "detener", "amenazar", "enumerar", "suspirar", "reir", "acercarse", "retroceder", "ir_y_venir"];
const norm = (w) => String(w ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9ñ]/g, "");
const hsh = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const REAC = ["pensar", "senalar", "manos_cadera", "encogerse"];
/** pone en segundos los pasos («cuando» = palabra de la narración) y, si la escena quedó quieta, la mueve:
 *  el protagonista entra caminando, recorre el lugar o reacciona; quien habla da unos pasos y gesticula */
export const dinamizar = (e, palabras) => {
  const dur = e.duracion ?? 0; if (!e.actores?.length || dur < 2.5 || e.titulo) return;
  const ws = palabras.filter((w) => w.a >= e.inicio - 0.05 && w.a < e.inicio + dur).map((w) => ({ n: norm(w.w), t: w.a - e.inicio }));
  const S = SALA[e.ambiente?.lugar], cx = (v) => Math.max(-(S?.[0] ?? 4.2), Math.min(S?.[0] ?? 4.2, v)), cz = (v) => Math.max(S?.[1] ?? -3.5, Math.min(2.6, v));
  for (const a of e.actores) {
    if (!a.pasos?.length) continue;
    let desde = 0;
    for (const p of a.pasos) {
      if (p.t == null && p.cuando) {
        const c = norm(p.cuando);
        const w = ws.find((x) => x.t > desde + 0.3 && (x.n === c || (c.length > 4 && x.n.startsWith(c.slice(0, c.length - 2)))));
        if (w) p.t = w.t;
      }
      if (p.t != null) desde = p.t;
    }
    // los que no encontraron su palabra: a mitad de camino entre sus vecinos
    a.pasos.forEach((p, i) => {
      if (p.t != null) return;
      const prev = a.pasos.slice(0, i).reverse().find((q) => q.t != null)?.t ?? 0;
      const next = a.pasos.slice(i + 1).find((q) => q.t != null)?.t ?? dur * 0.92;
      p.t = prev + (next - prev) / 2;
    });
    a.pasos = a.pasos.filter((p) => p.t > 0.25 && p.t < dur - 0.4).sort((p, q) => p.t - q.t).filter((p, i, arr) => i === 0 || p.t - arr[i - 1].t > 0.7);
    for (const p of a.pasos) { delete p.cuando; if (p.hacia) p.hacia = [cx(p.hacia[0]), cz(p.hacia[1])]; }
    if (!a.pasos.length) delete a.pasos;
  }
  const quieta = !e.actores.some((a) => a.pasos?.length || ((a.accion === "caminar" || a.accion === "correr") && a.hacia) || a.luego || ACTUAR.includes(a.accion));
  if (!quieta || dur < 4) return;
  const ids = e.actores.map((a) => a.id), main = e.actores.find((a) => a.id === (e.habla || e.camara?.objetivo)) ?? e.actores[0];
  const h = hsh(e.id * 7 + dur), objs = (e.objetos ?? []).filter((o) => Math.abs(o.x) < 6 && o.z > -6 && o.z < 2.5);
  if (main.accion === "sentado" || main.accion === "caer") return;
  // nadie termina encima de otro: si el destino cae a menos de 1.3 m de alguien, se corre hacia el lado libre
  const otros = e.actores.filter((a) => a !== main);
  const aparta = (d) => { for (let n = 0; n < 4; n++) { const o = otros.find((a) => Math.hypot(a.x - d[0], a.z - d[1]) < 1.3); if (!o) break; d = [cx(d[0] + (d[0] >= o.x ? 1.4 : -1.4)), d[1]]; if (Math.abs(d[0]) >= (S?.[0] ?? 4.2)) d = [cx(o.x + (o.x > 0 ? -1.4 : 1.4)), cz(d[1] - 0.6)]; } return d; };
  const lejos = otros.length ? Math.sign(main.x - otros.reduce((s2, a) => s2 + a.x, 0) / otros.length) || 1 : (main.x > 0 ? -1 : 1);
  if (e.habla && e.habla === main.id) {
    // diálogo: habla, da unos pasos hablando, gesticula y vuelve a hablar
    const dx = main.x > 0 ? -1.4 : 1.4;
    main.pasos = [{ t: dur * 0.3, accion: "caminar", hacia: aparta([cx(main.x + (otros.length ? lejos * 1.2 : dx)), cz(main.z + 0.4)]) }, { t: dur * 0.3 + 1.3, accion: "hablar" },
      ...(dur > 7 ? [{ t: dur * 0.68, accion: REAC[Math.floor(h * 4)] }, { t: dur * 0.68 + 1.4, accion: "hablar" }] : [])];
  } else if (h < 0.4) {
    // entra caminando desde el borde hasta su lugar y ahí reacciona
    const lado = main.x > 0 ? 1 : -1, x0 = main.x, z0 = main.z, acc0 = main.accion === "caminar" || main.accion === "correr" ? "pensar" : main.accion;
    main.x = cx(x0 + lado * 2.6); main.z = cz(z0 + 0.6); main.accion = "caminar"; main.hacia = [x0, z0];
    main.pasos = [{ t: Math.min(dur * 0.45, 0.4 + Math.hypot(main.x - x0, main.z - z0) / 1.4), accion: acc0 === "parado" ? "pensar" : acc0 },
      ...(dur > 7 ? [{ t: dur * 0.72, accion: REAC[Math.floor(h * 10) % 4] }] : [])];
  } else if (h < 0.75 || objs.length) {
    // recorre el lugar: camina hacia un objeto (o a un costado) y se detiene a mirarlo
    const o = objs[Math.floor(h * 97) % Math.max(1, objs.length)];
    const dest = aparta(o ? [cx(o.x + (o.x > main.x ? -1.1 : 1.1)), cz(o.z + 1.0)] : [cx(main.x + (otros.length ? lejos * 2 : main.x > 0 ? -2 : 2)), cz(main.z - 0.8)]);
    const llega = dur * 0.22 + 0.4 + Math.hypot(dest[0] - main.x, dest[1] - main.z) / 1.4;
    main.pasos = [{ t: dur * 0.22, accion: "caminar", hacia: dest }, { t: llega, accion: "pensar", expresion: "pensativo" },
      ...(dur > 8 ? [{ t: Math.max(llega + 1.5, dur * 0.8), accion: REAC[Math.floor(h * 13) % 4] }] : [])];
  } else {
    main.pasos = [{ t: dur * 0.3, accion: "pensar", expresion: "pensativo" }, { t: dur * 0.62, accion: REAC[1 + (Math.floor(h * 7) % 3)] }];
  }
  // los demás reaccionan una vez a mitad de la escena (un gesto o un par de pasos)
  for (const a of e.actores) if (a !== main && !a.pasos?.length && a.accion !== "sentado" && a.accion !== "caer") {
    const k = hsh(ids.indexOf(a.id) * 31 + e.id);
    a.pasos = k < 0.5 ? [{ t: dur * (0.4 + k * 0.3), accion: REAC[Math.floor(k * 8) % 4] }]
      : [{ t: dur * (0.35 + k * 0.2), accion: "caminar", hacia: [cx(a.x + (a.x > main.x ? 0.9 : -0.9)), cz(a.z - 0.5)] }];
    // si el principal camina hacia donde termina este, este se queda con un gesto
    const fin = main.pasos?.filter((p) => p.hacia).pop()?.hacia ?? main.hacia;
    const suyo = a.pasos[0].hacia ?? [a.x, a.z];
    if (fin && Math.hypot(fin[0] - suyo[0], fin[1] - suyo[1]) < 1.3) a.pasos = [{ t: dur * 0.5, accion: REAC[Math.floor(k * 8) % 4] }];
  }
  for (const a of e.actores) if (a.pasos) { a.pasos = a.pasos.filter((p) => p.t < dur - 0.4); if (!a.pasos.length) delete a.pasos; }
};

/** opciones: { guion, carpeta?, log, paso, progreso, desde?, hasta? (capítulos), escala (1 = 1920x1080), concurrencia } */
export const generarEpisodio = async (op) => {
  const log = op.log ?? console.log, paso = op.paso ?? (() => {}), progreso = op.progreso ?? (() => {});
  if (!hayClave()) throw new Error("El modo episodio necesita DEEPSEEK_API_KEY en .env");
  const partes = partirGuion(op.guion);
  let bloques = partes.bloques;
  if (op.desde != null || op.hasta != null) bloques = bloques.filter((b) => b.cap >= (op.desde ?? 0) && b.cap <= (op.hasta ?? 999));
  const dir = op.carpeta ? path.resolve(RAIZ, op.carpeta) : path.join(RAIZ, "proyectos", `${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}-ep-${slug(partes.titulo)}`);
  fs.mkdirSync(dir, { recursive: true });
  guardar(dir, "guion.txt", op.guion);
  log(`Episodio «${partes.titulo}»: ${bloques.length} bloques en ${new Set(bloques.map((b) => b.cap)).size} capítulos`);

  // 1. reparto
  paso("organizador", "trabajando");
  let rep = leer(dir, "1_reparto.json");
  if (!rep) {
    const dialogos = [...new Set((op.guion.match(/^\*\*[^*\n]{2,60}:\*\*/gm) ?? []).map((s) => s.replace(/\*|:/g, "").trim()))];
    rep = await agente({ nombre: "Reparto", system: REPARTO + textoBibliaVisual(), user: `PERSONAJES CON DIÁLOGO: ${dialogos.join(", ")}\n\nGUION:\n${op.guion.slice(0, 60000)}`, log, temperatura: 0.5, maxTokens: 8000 });
    guardar(dir, "1_reparto.json", rep);
  }
  // personajes diseñados en preproducción (agentes/preproduccion.mjs): mandan sobre el reparto rápido
  const pre = leer(dir, "personajes.json");
  if (pre?.length) { rep.personajes = pre.map((p) => ({ ...p, descripcion: `${p.papel ?? ""}${p.edad != null ? ", " + p.edad + " años" : ""}` })); log("Reparto: se usan los personajes diseñados en preproducción"); }
  log(`Reparto: ${rep.personajes?.length ?? 0} personajes · época ${rep.epoca ?? "?"}`);
  paso("organizador", "listo");

  // 2. director por bloque (4 a la vez)
  paso("disenador", "trabajando");
  const reparto = (rep.personajes ?? []).map((p) => ({ id: p.id, nombre: p.nombre, descripcion: p.descripcion }));
  // preproducción: secuencias de la biblia y decorados fijos (agentes/preproduccion.mjs)
  const biblia = leer(dir, "biblia.json"), escs = leer(dir, "escenarios.json");
  const E = new Map((escs?.escenarios ?? []).map((s) => [s.id, s]));
  const clave = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const secDe = (b) => biblia?.secuencias?.find((s) => clave(s.bloque) === clave(b.nombre)) ?? null;
  const conPre = !!(biblia?.secuencias && E.size);
  if (conPre) log(`Preproducción: ${biblia.secuencias.length} secuencias y ${E.size} decorados fijos`);
  const datosEsc = (sq) => (sq?.escenarios ?? []).filter((v) => E.has(v)).map((v) => { const s = E.get(v);
    return { id: s.id, lugar: s.motor, nombre: s.nombre, momentos: s.momentos, gente: s.gente, nota: s.motor === "mansion" ? `escalera bajo la ventana del cuarto: (${MANSION.escalera.x}, ${MANSION.escalera.z}); árbol del espía: (${MANSION.arbolEspia.x}, ${MANSION.arbolEspia.z})` : undefined }; });
  let hechos = 0;
  const porBloque = await pool(bloques, 4, async (b, k) => {
    const n = `${conPre ? "2_dir" : "2_bloque"}_${String(partes.bloques.indexOf(b) + 1).padStart(2, "0")}.json`;   // número del bloque en el guion completo (aunque se filtren capítulos)
    let r = leer(dir, n);
    if (!r) {
      const sq = conPre ? secDe(b) : null;
      const extra = sq ? { secuencia: { resumen: sq.resumen, hora: sq.hora, clima: sq.clima, personajes: sq.personajes, momentos_clave: sq.momentos_clave, gente_de_fondo: sq.gente_de_fondo }, escenarios: datosEsc(sq) } : {};
      r = await agente({ nombre: `Director ${b.nombre}`, system: DIRECTOR + textoBibliaVisual(), user: { reparto, capitulo: `${b.capEtiqueta} — ${b.capTitulo}`, bloque: b.nombre, guion: b.texto, ...extra }, log, temperatura: 0.55, maxTokens: 12000 });
      guardar(dir, n, r);
    }
    progreso(Math.round((++hechos / bloques.length) * 100));
    return r;
  });
  paso("disenador", "listo");
  // continuidad: reglas fijas sobre lo que propuso el director, en el orden de la historia
  if (conPre) {
    // revisor de DeepSeek: revisa por escrito cada bloque contra el guion y la biblia (4 a la vez, con caché)
    paso("revisor", "trabajando");
    const revs = await pool(bloques, 4, (b, k) => { const n = `2_rev_${String(partes.bloques.indexOf(b) + 1).padStart(2, "0")}.json`;
      return revisarBloque(porBloque[k]?.escenas ?? [], { secuencia: secDe(b), personajes: rep.personajes ?? [], nombre: b.nombre, log,
        cache: { leer: () => leer(dir, n), guardar: (r) => guardar(dir, n, r) } }).catch((err) => { log(`Revisor ${b.nombre}: falló (${err.message.slice(0, 120)})`); return []; }); });
    log(`Revisor: ${revs.flat().length} correcciones`);
    paso("revisor", "listo");
    const estado = nuevoEstado(), informe = [];
    bloques.forEach((b, k) => { const sq = secDe(b); const cs = coherencia(porBloque[k]?.escenas ?? [], { secuencia: sq, escenarios: E, personajes: rep.personajes ?? [], estado });
      if (cs.length || revs[k]?.length) informe.push({ bloque: b.nombre, revisor: revs[k] ?? [], reglas: cs }); });
    guardar(dir, "3_continuidad.json", informe);
    log(`Continuidad: ${informe.reduce((s, x) => s + x.reglas.length, 0)} correcciones de reglas fijas en ${informe.length} bloques`);
  }

  // 3. armar el plan: cartel del episodio, cartel por capítulo, escenas de cada bloque
  const escenas = [];
  const cartel = (titulo, subtitulo, cap) => escenas.push({ narracion: "", titulo, subtitulo, capitulo: cap, ambiente: { lugar: "interior", hora: "noche" }, actores: [], objetos: [], camara: { tipo: "plano_general", plano: "general", objetivo: "grupo" }, transicion: "fundido", efectos: [] });
  if (!op.desde || op.desde <= 1) cartel(partes.titulo, "EPISODIO", bloques[0]?.cap ?? 1);
  let capPrev = -1;
  bloques.forEach((b, k) => {
    if (b.cap !== capPrev) { cartel(b.capTitulo.toUpperCase(), b.capEtiqueta.toUpperCase(), b.cap); capPrev = b.cap; }
    (porBloque[k]?.escenas ?? []).forEach((e, j) => {
      if (!e || (!String(e.narracion || "").trim() && !e.titulo)) return;
      escenas.push({ ...e, capitulo: b.cap, transicion: j === 0 ? "fundido" : e.transicion === "destello" ? "corte" : e.transicion });
    });
  });
  const plan = { titulo: partes.titulo, formato: "horizontal", modo: "episodio", estilo: "noir", epoca: rep.epoca ?? 1930, fondoEpoca: rep.fondoEpoca ?? "",
    personajes: rep.personajes ?? [], escenas: escenas.map((e, i) => ({ ...e, id: i + 1 })) };
  // voces: narrador + una por personaje (por sexo, sin repetir mientras alcancen)
  const voces = {}; let ih = 0, im = 0;
  for (const p of plan.personajes) voces[String(p.id).toLowerCase()] = p.sexo === "m" || p.vestido ? VOCES_M[im++ % VOCES_M.length] : VOCES_H[ih++ % VOCES_H.length];
  const el = await vocesEleven(plan.personajes, dir, log);
  if (el) { NARRADOR = el.narrador; Object.assign(voces, el.voces); }
  const { problemas } = validarPlan(plan);
  for (const e of plan.escenas) e.habla = e.habla && plan.personajes.some((p) => p.id === e.habla) ? e.habla : null;
  log(`Plan: ${plan.escenas.length} escenas; verificador: ${problemas.length} detalle(s) corregido(s)`);
  guardar(dir, "plan_base.json", plan);

  // 4. fondos (biblioteca compartida; ~19 s por imagen nueva)
  paso("fondos", "trabajando");
  try { const n = await generarFondos(plan, path.basename(dir), log); invalidarPaquete(); log(`Fondos: ${n} nuevos`); paso("fondos", "listo"); }
  catch (err) { log(`Fondos: falló (${err.message.slice(0, 200)})`); paso("fondos", "aviso"); }
  guardar(dir, "plan_base.json", plan);

  // 5. por capítulo: voz, tiempos, tomas, sonido, video
  const { tomasDe } = await director();
  const caps = [...new Set(plan.escenas.map((e) => e.capitulo))];
  const tramos = [];
  for (const [ci, c] of caps.entries()) {
    const tdir = path.join(dir, `cap_${String(c).padStart(2, "0")}`); fs.mkdirSync(tdir, { recursive: true });
    const final = path.join(tdir, "tramo.mp4"); tramos.push(final);
    if (fs.existsSync(final)) { log(`Capítulo ${c}: ya estaba listo`); continue; }
    const sub = { ...plan, escenas: plan.escenas.filter((e) => e.capitulo === c).map((e, i) => ({ ...e, id: i + 1 })) };
    paso("voz", "trabajando");
    guardar(tdir, "voz_entrada.json", { voz: NARRADOR, velocidad: "-4%", paralelo: 4, natural: true, escenas: sub.escenas.map((e) => ({ id: e.id, narracion: e.titulo ? "" : e.narracion,
      voz: e.habla ? voces[e.habla] : NARRADOR, velocidad: e.habla ? "+0%" : "-4%", estilo: e.habla ? 0.5 : 0.3, sala: !!e.habla && ["habitacion", "oficina", "tribunal", "carcel"].includes(e.ambiente?.lugar), pausa: e.habla ? 0.3 : 0.5, silencio: e.titulo ? 3.6 : 1.2 })) });
    await correr(PY, ["pipeline/voz.py", path.join(tdir, "voz_entrada.json"), path.join(tdir, "voz")], (l) => /total|reintento/.test(l) && log(`Voz cap ${c}: ${l}`));
    const tiempos = JSON.parse(fs.readFileSync(path.join(tdir, "voz", "tiempos.json"), "utf8"));
    for (const e of sub.escenas) { const t = tiempos.escenas.find((x) => x.id === e.id); if (t) { e.inicio = t.inicio; e.duracion = t.duracion; } }
    validarPlan(sub, { durTotal: tiempos.total });
    sub.audio = { voz: null, mezcla: null, palabras: tiempos.palabras ?? [] };
    for (const e of sub.escenas) dinamizar(e, sub.audio.palabras);
    for (const e of sub.escenas) {
      e.tomas = e.tomasFijas ?? tomasDe(e, sub.audio.palabras, true);
      // primera escena en un decorado: arranca con el plano fijo de ubicación del decorado
      const cam = CAMARAS_SET[e.ambiente?.lugar];
      if (e.establecer && !e.tomasFijas && cam && e.duracion > 5 && !e.habla) e.tomas = [{ t: 0, objetivo: "grupo", plano: "general", angulo: "frente", mov: "empuje", pos: cam[0], mira: cam[1] }, ...e.tomas.filter((x) => x.t >= 2.8)];
    }
    guardar(tdir, "plan.json", sub);
    if (op.animatic) {
      // animatic: un cuadro por escena (dos si es larga) para revisar antes del video
      const cuadros = [], fichas = [];
      for (const e of sub.escenas) { if (e.titulo) continue; for (const u of e.duracion > 9 ? [0.3, 0.75] : [0.55]) { cuadros.push(Math.round((e.inicio + e.duracion * u) * 30));
        fichas.push({ titulo: `${e.id}. ${e.narracion}`.slice(0, 46), sub: `${e.ambiente.escenario ?? e.ambiente.lugar} · ${e.ambiente.hora}${e.ambiente.clima ? " · " + e.ambiente.clima : ""}${e.ambiente.oscuro ? " · a oscuras" : ""}`,
          gente: e.actores.map((a) => `${a.id}: ${[a.accion, ...(a.pasos ?? []).map((p) => p.accion)].join(">")}${a.mano ? " +" + a.mano : ""}`).join(" · ") || "sin actores", util: "" }); } }
      const { fotos } = await import("../pipeline/render.mjs");
      const carpeta = path.join(tdir, "animatic"); fs.rmSync(carpeta, { recursive: true, force: true });
      const imgs = await fotos({ plan: sub, carpeta, cuadros, escala: 0.5, log: () => {} });
      fichas.forEach((f, i) => (f.img = imgs[i]));
      fs.writeFileSync(path.join(carpeta, "fichas.json"), JSON.stringify({ titulo: `Capítulo ${c} · animatic`, fichas }, null, 1));
      await correr(PY, ["pipeline/hoja_escenarios.py", path.join(carpeta, "fichas.json"), path.join(dir, `animatic_cap_${String(c).padStart(2, "0")}.jpg`)], () => {});
      log(`Capítulo ${c}: animatic listo (${cuadros.length} cuadros)`);
      continue;
    }
    paso("voz", "listo"); paso("sonido", "trabajando");
    await correr(PY, ["pipeline/sonido.py", path.join(tdir, "plan.json"), path.join(tdir, "voz")], (l) => log(`Sonido cap ${c}: ${l}`));
    paso("sonido", "listo"); paso("render", "trabajando");
    const mudo = path.join(tdir, "mudo.mp4");
    log(`Capítulo ${c} (${ci + 1}/${caps.length}): renderizando ${tiempos.total.toFixed(0)} s…`);
    const t0 = Date.now();
    await video({ plan: sub, salida: mudo, escala: op.escala ?? 1, concurrencia: op.concurrencia ?? 1, log, progreso: (p) => progreso(Math.round(((ci + p / 100) / caps.length) * 100)) });
    log(`Capítulo ${c}: render en ${((Date.now() - t0) / 60000).toFixed(1)} min`);
    // si el audio desapareció mientras se renderizaba, se rehace (la voz por escena está en caché, es rápido)
    if (!fs.existsSync(path.join(tdir, "voz", "mezcla.wav"))) {
      log(`Capítulo ${c}: faltaba la mezcla de audio, se rehace`);
      await correr(PY, ["pipeline/voz.py", path.join(tdir, "voz_entrada.json"), path.join(tdir, "voz")], () => {});
      await correr(PY, ["pipeline/sonido.py", path.join(tdir, "plan.json"), path.join(tdir, "voz")], () => {});
    }
    await correr("ffmpeg", ["-v", "error", "-y", "-i", mudo, "-i", path.join(tdir, "voz", "mezcla.wav"), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", final], log);
    fs.unlinkSync(mudo);
  }
  if (op.animatic) { paso("render", "listo"); log(`Animatic listo en ${dir}`); return { dir, plan, final: null }; }
  // 6. unión
  const lista = path.join(dir, "tramos.txt");
  fs.writeFileSync(lista, tramos.map((t) => `file '${t.replace(/\\/g, "/")}'`).join("\n"));
  const salida = path.join(dir, "episodio_final.mp4");
  await correr("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", salida], log);
  paso("render", "listo");
  log(`Episodio listo: ${salida}`);
  return { dir, plan, final: salida };
};

// CLI: node agentes/episodio.mjs guion.txt [--desde N] [--hasta N] [--escala 0.667] [--carpeta ruta] [--conc 2]
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), v = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  const r = await generarEpisodio({ guion: fs.readFileSync(a[0], "utf8"), desde: v("--desde") != null ? Number(v("--desde")) : undefined, hasta: v("--hasta") != null ? Number(v("--hasta")) : undefined,
    escala: v("--escala") ? Number(v("--escala")) : 1, carpeta: v("--carpeta"), concurrencia: v("--conc") ? Number(v("--conc")) : 1, animatic: a.includes("--animatic"),
    progreso: (p) => process.stdout.write(`\r${p}%   `) });
  console.log("\n", r.final);
  process.exit(0);
}
