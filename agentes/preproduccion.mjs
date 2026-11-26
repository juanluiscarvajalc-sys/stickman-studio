// PREPRODUCCIÓN — antes de animar nada:
//  Etapa 1 · ANALISTA: lee el guion completo y arma la biblia del episodio: personajes (papel, edad, aspecto, forma de actuar),
//            lugares (cómo son, gente de fondo, horas y climas) y secuencias (dónde, cuándo, quién hace qué y qué siente).
//  Etapa 2 · DISEÑADOR: diseña los personajes uno por uno con la biblioteca completa, conociendo a los ya diseñados para que
//            nadie se parezca a otro; un VERIFICADOR automático y un REVISOR corrigen lo que no encaje con su papel; se dibuja la
//            hoja de personajes para aprobar.
//  Etapa 3 · ESCENÓGRAFO: decorados fijos (mismo id = mismo decorado en todo el video), con sus horas, climas, gente de fondo y
//            utilería; reglas fijas para vuelos (pista, cielo, cabina) y prensa (en la calle, nunca en un cuarto); hoja de escenarios.
// Uso: node agentes/preproduccion.mjs guiones/ep01_lindbergh.md proyectos/ep01-lindbergh-v3 [--etapa 2|3]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { agente, hayClave, cargarEnv } from "./deepseek.mjs";
import { C } from "./catalogo.mjs";
import { textoBiblioteca, DESC, textoBibliaVisual } from "./biblioteca.mjs";
import { validarPlan } from "./validar.mjs";
import { partirGuion } from "./episodio.mjs";
import { rutaPersonajesFijos } from "./estudio.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const guardar = (dir, n, o) => { fs.mkdirSync(path.dirname(path.join(dir, n)), { recursive: true }); fs.writeFileSync(path.join(dir, n), JSON.stringify(o, null, 1), "utf8"); };
const leer = (dir, n) => { const p = path.join(dir, n); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };
const sinT = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pool = async (items, n, f) => { const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await f(items[k], k); } })); return out; };

// ---------------- etapa 1: análisis del guion ----------------
const ANALISTA = `Eres el ANALISTA DE GUION de una serie animada de casos reales (personajes de dibujo animado en escenarios 3D).
Antes de que nadie anime, lees el guion COMPLETO y preparas la biblia de producción, como en una serie de televisión.

1) PERSONAJES: TODOS los que aparecen o se mencionan actuando (con o sin diálogo), sin el narrador. Incluye a los que no hablan
   (el bebé, el secuestrador, los periodistas, los policías). Para cada uno:
   - id (minúsculas sin tildes ni espacios), nombre, papel (su oficio o función en la historia), importancia: principal | secundario | menor
   - sexo "h" | "m", edad (número; un bebé de meses = 1), clase social
   - aspecto: descripción física CONCRETA (contextura, altura, pelo, rasgos, edad aparente) basada en el personaje real si es histórico
   - vestuario: qué viste según su época, oficio y clase (los oficios se reconocen por la ropa: uniforme, toga, bata, delantal…)
   - personalidad y comoActua: gestos y manera de moverse (el detective anota y observa, la niñera es atenta y luego desesperada…)
   - objetos: lo que suele llevar en la mano; expresiones: las 4 emociones que más muestra en la historia
   - capitulos: números de capítulo donde aparece
   Dos personajes NUNCA deben poder confundirse: si el guion no dice cómo son, invéntales diferencias claras.
2) LUGARES: cada sitio donde ocurre algo. id, nombre, descripcion concreta (qué hay, cómo es de grande, qué época), elementos
   (objetos importantes: la escalera, la cuna, la ventana…), gente_de_fondo (quién más hay: transeúntes, clientes, policías; o nadie),
   y momentos: las combinaciones de hora (dia, atardecer, noche, amanecer) y clima (despejado, nublado, lluvia, niebla, nieve) que
   pide el guion. El clima y la hora salen del guion: NO todo es de noche ni con lluvia.
   motor = el lugar del catálogo que más se parece: ${C.lugares.join(", ")}; si ninguno sirve, "nuevo".
Devuelve SOLO JSON: {"titulo": "...", "epoca": 1932, "region": "...", "fondoEpoca": "época y región EN INGLÉS para fondos fotográficos",
 "tono": "...", "personajes": [...], "lugares": [...]}`;

const SECUENCIAS = `Eres el ANALISTA DE GUION. Para UN capítulo del guion, describes cada escena como la filmaría una serie de televisión.
Para cada bloque «ESCENA» del capítulo (en orden, uno por bloque): bloque (el nombre exacto del bloque), lugar (id de la lista
de lugares), hora (dia, atardecer, noche, amanecer), clima (despejado, nublado, lluvia, niebla, nieve), resumen (qué pasa),
personajes: [{id, hace: "acciones concretas y visibles que hace mientras se narra (anota en su libreta, sube la escalera, carga al
bebé, saca fotos con flash, espía detrás de un árbol…)", siente: una expresión del catálogo}], momentos_clave: ["imágenes que no
pueden faltar"], gente_de_fondo: "quién más se ve".
Expresiones del catálogo: ${C.expresiones.join(", ")}.
Devuelve SOLO JSON: {"escenas": [...]}`;

export const etapa1 = async (guion, dir, log = console.log) => {
  let biblia = leer(dir, "biblia.json");
  if (!biblia) {
    log("Etapa 1: el analista lee el guion completo…");
    biblia = await agente({ nombre: "Analista", system: ANALISTA + textoBibliaVisual(), user: `GUION COMPLETO:\n${guion.slice(0, 70000)}`, temperatura: 0.4, maxTokens: 8000, log });
    biblia.personajes = (biblia.personajes ?? []).map((p) => ({ ...p, id: sinT(p.id || p.nombre).replace(/[^a-z0-9_]/g, "") }));
    guardar(dir, "biblia.json", biblia);
  }
  log(`Biblia: ${biblia.personajes?.length ?? 0} personajes, ${biblia.lugares?.length ?? 0} lugares`);
  if (!biblia.secuencias) {
    const partes = partirGuion(guion), caps = [...new Set(partes.bloques.map((b) => b.cap))];
    const ids = biblia.personajes.map((p) => `${p.id} (${p.papel})`).join(", "), lugs = (biblia.lugares ?? []).map((l) => `${l.id} (${l.nombre})`).join(", ");
    const porCap = await pool(caps, 4, async (c) => {
      const bl = partes.bloques.filter((b) => b.cap === c);
      const r = await agente({ nombre: `Secuencias cap ${c}`, system: SECUENCIAS + textoBibliaVisual(), temperatura: 0.4, maxTokens: 8000, log,
        user: `PERSONAJES: ${ids}\nLUGARES: ${lugs}\n\nCAPÍTULO ${c} — ${bl[0]?.capTitulo ?? ""}\n\n${bl.map((b) => `### ${b.nombre}\n${b.texto}`).join("\n\n")}` });
      return (r.escenas ?? []).map((e) => ({ cap: c, ...e }));
    });
    biblia.secuencias = porCap.flat();
    guardar(dir, "biblia.json", biblia);
  }
  log(`Secuencias: ${biblia.secuencias.length} escenas analizadas`);
  return biblia;
};

// ---------------- etapa 2: diseño de personajes ----------------
const DISENADOR = () => `Eres el DISEÑADOR DE PERSONAJES de una serie animada (personajes de dibujo: cabeza redonda grande, cuerpo ovalado, brazos
y piernas de línea; se distinguen por la silueta, el sombrero, el peinado, la ropa, los colores, los rasgos y los accesorios).
Diseñas UN personaje a la vez, a partir de su ficha de la biblia, usando SOLO los valores de la biblioteca de abajo.
Reglas:
- Su papel se tiene que reconocer de un vistazo (un policía con uniforme y gorra, un juez con toga, una niñera con delantal y cofia,
  un fotógrafo de prensa con credencial y cámara, un bebé con complexion bebe y mameluco).
- Edad: bebé (0–3) = bebe; 4–12 = nino; 13–17 = adolescente; 65+ = anciano o arrugas y pelo canoso.
- Debe ser INCONFUNDIBLE con los ya diseñados (te los paso): cambia silueta (complexion), sombrero, peinado, colores de ropa y pelo.
  Dos personas de la misma casa o del mismo oficio se distinguen por colores, peinado, bigote, gafas o complexion.
- Colores de la época y de su clase social, en #hex. Piel natural y variada. colorPelo aparte del sombrero.
- Mujeres de antes de 1960: casi siempre "vestido" (#hex) con "estampado"; la camisa del mismo color o la blusa.
- sombrero "pelo" = sin sombrero (se ve el peinado); con sombrero el pelo igual asoma: elige peinado y colorPelo siempre.
- objetoTipico: lo que lleva en la mano en la hoja de personajes (de la lista de objetos o null). expresionesTipicas: 4 del catálogo.
ESTILO (el aprobado por el cliente): personajes ricos en detalle y fáciles de distinguir.
- Cada personaje con al menos DOS detalles propios bien visibles: un accesorio, un rasgo, un estampado, un peinado característico, un bigote…
- Colores con contraste entre ropa, pelo y sombrero. Aunque la época sea sobria, la paleta varía ENTRE personajes (burdeos, azul petróleo,
  verde botella, mostaza, gris perla, marrón chocolate, crema, azul marino, ciruela): no todos marrones ni grises.
- Las mujeres con estampado, accesorios (aretes, perlas, lazo) y peinado de la época. Los del mismo oficio (varios policías) se
  distinguen por bigote, gafas, peinado, complexion y tono de piel.
VESTUARIOS: el principal es el que usa en la MAYORÍA de sus escenas (en su casa, en la calle, en el juicio). Si en algunas escenas
cambia de ropa por el contexto (piloto que vuela, preso en la cárcel, pijama de noche, uniforme de trabajo, gala), agrega
"vestuarios": [{"id": "aviador", "lugares": ["aerodromo", "cielo", "cabina"], "usar": "cuando vuela", ...SOLO los campos que cambian}].
Lugares del motor: ${C.lugares.join(", ")}. Te paso las escenas donde aparece para que decidas.
Devuelve SOLO JSON: {"id","nombre","papel","edad","sexo","complexion","piel","colorPelo","peinado","sombrero","colorSombrero","ropa",
 "camisa","colorRopa2","pantalon","zapatos","vestido","estampado","rasgos":[],"accesorios":[],"colorAccesorio","bigote","cinturon",
 "objetoTipico","expresionesTipicas":[],"vestuarios":[],"porque":"una frase: cómo se reconoce su papel y en qué se diferencia de los demás"}

BIBLIOTECA:
${textoBiblioteca()}`;

const REVISOR = `Eres el REVISOR DE PERSONAJES de una serie animada. Recibes las fichas de la biblia, los diseños y una lista de problemas
detectados (papel que no se reconoce, edad que no corresponde, dos personajes que se parecen). Corriges SOLO lo necesario,
con valores de la biblioteca, para que cada personaje se reconozca por su papel y nadie se confunda con otro.
Devuelve SOLO JSON: {"cambios": [{"id": "...", "campos": {"sombrero": "...", "camisa": "#...", ...}, "motivo": "..."}]}`;

const CAMPOS = ["nombre", "papel", "edad", "complexion", "piel", "colorPelo", "peinado", "sombrero", "colorSombrero", "ropa", "camisa", "colorRopa2", "pantalon", "zapatos",
  "vestido", "estampado", "rasgos", "accesorios", "colorAccesorio", "bigote", "cinturon", "objetoTipico", "expresionesTipicas", "vestuarios"];
const resumen = (d) => `${d.id} (${d.papel}, ${d.edad ?? "?"} años): ${d.complexion}, ${d.sombrero}${d.colorSombrero ? " " + d.colorSombrero : ""}, pelo ${d.peinado} ${d.colorPelo ?? ""}, ` +
  `ropa ${d.ropa} ${d.vestido ? "vestido " + d.vestido : "camisa " + d.camisa}, rasgos ${(d.rasgos ?? []).join("/") || "-"}, accesorios ${(d.accesorios ?? []).join("/") || "-"}${d.bigote ? ", bigote" : ""}`;

/** escenas de la biblia donde aparece un personaje: lugar del motor, hora y lo que hace (para elegir vestuarios) */
const escenasDe = (biblia, id) => {
  const motor = Object.fromEntries((biblia.lugares ?? []).map((l) => [l.id, l.motor]));
  const ls = (biblia.secuencias ?? []).filter((s) => (s.personajes ?? []).some((p) => p.id === id))
    .map((s) => `cap ${s.cap}: ${s.lugar} (${motor[s.lugar] ?? "?"}), ${s.hora} — ${(s.personajes.find((p) => p.id === id)?.hace ?? "").slice(0, 90)}`);
  return ls.join("\n") || "(no figura en las escenas analizadas)";
};
/** la ropa de un contexto (volar) no puede ser la principal: pasa a vestuario alternativo y el principal es ropa de calle */
/** colores de la época bien distintos entre sí, para separar a dos personajes que se parecen */
const PALETA = ["#6e2a35", "#2c5a6a", "#2f5a3a", "#a8842e", "#9aa0a6", "#4a3024", "#e2d6b8", "#1f2c4a", "#5a3a5e", "#8a4a2a", "#3e4a2a", "#7a7f8a", "#b86a4a", "#2a2a2e"];
const diferenciarColor = (a, todos) => {
  const usados = todos.filter((x) => x !== a).map((x) => x.vestido ?? x.camisa);
  const mejor = PALETA.map((c) => [c, Math.min(...usados.map((u) => dist(c, u)))]).sort((p, q) => q[1] - p[1])[0][0];
  if (a.vestido) a.vestido = mejor; a.camisa = mejor;
};
const otroSombrero = (a, todos) => {
  const pap = sinT(a.papel ?? "");
  // los oficios que se reconocen por el sombrero lo conservan (detective: fedora o bombín; prensa: fedora)
  const opciones = /detective|investigador|inspector/.test(pap) ? ["fedora", "bombin"] : /periodista|reporter|fotograf/.test(pap) && !a.vestido ? ["fedora", "gorra_plana"]
    : a.vestido ? ["cloche", "pamela", "pelo", "lazo"] : ["fedora", "bombin", "gorra_plana", "pelo", "boina"];
  const cuenta = (s) => todos.filter((x) => x.sombrero === s).length;
  return opciones.filter((s) => s !== a.sombrero).sort((p, q) => cuenta(p) - cuenta(q))[0];
};
/** misma ropa (p. ej. dos policías): cambian cara y cuerpo */
const diferenciarCara = (a, b) => {
  const cuerpos = ["robusto", "delgado", "alto", "bajo", "adulto"].filter((c) => c !== b.complexion && !["bebe", "nino", "anciano"].includes(a.complexion));
  if (a.complexion === b.complexion && cuerpos.length) a.complexion = cuerpos[(a.id.length + b.id.length) % cuerpos.length];
  const peinados = ["raya_lado", "engominado", "rapado", "entradas", "rizado", "liso"].filter((p) => p !== b.peinado);
  if (a.peinado === b.peinado) a.peinado = peinados[a.id.length % peinados.length];
  if (!a.vestido && !a.bigote && !b.bigote) { a.bigote = a.colorPelo ?? "#3a2a1e"; a.accesorios = [...new Set([...(a.accesorios ?? []), a.id.length % 2 ? "bigote_grueso" : "bigote_fino"])].slice(0, 5); }
  else if (!(a.rasgos ?? []).includes("gafas") && !(b.rasgos ?? []).includes("gafas")) a.rasgos = [...(a.rasgos ?? []), "gafas"].slice(0, 4);
  if (dist(a.colorPelo, b.colorPelo) < 60) a.colorPelo = ["#1c1814", "#7a4a2a", "#c8a060", "#8a8a86", "#4a3020"].find((c) => dist(c, b.colorPelo) > 80);
};
const sacarAviador = (d) => {
  if (!/piloto|aviador|aviadora/.test(sinT(d.papel ?? ""))) return false;
  if (d.sombrero !== "casco_aviador" && d.ropa !== "chaqueta_cuero") return false;
  const alt = { id: "aviador", lugares: ["aerodromo", "cielo", "cabina"], usar: "cuando vuela o está junto al avión", sombrero: d.sombrero, colorSombrero: d.colorSombrero, ropa: d.ropa, camisa: d.camisa, accesorios: d.accesorios };
  d.vestuarios = [...(d.vestuarios ?? []).filter((v) => v.id !== "aviador"), alt];
  d.sombrero = "fedora"; d.colorSombrero = "#4a4038"; d.ropa = "terno"; d.camisa = "#34405a"; d.colorRopa2 = "#5a6478";
  d.accesorios = [...new Set([...(d.accesorios ?? []).filter((a) => a !== "bufanda"), "corbata"])]; d.colorAccesorio = d.colorAccesorio ?? "#7a2a34";
  return true;
};
const hex = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h ?? "")); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const dist = (a, b) => { const x = hex(a), y = hex(b); return x && y ? Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) : 999; };

/** reglas de oficio y edad: [prueba sobre papel/nombre, qué exige, corrección automática] */
const REGLAS = [
  [/^(el |la |un |una )?(bebe|lactante|recien nacido)/, (d) => d.complexion === "bebe", "es un bebé: complexion bebe y mameluco", (d) => { d.complexion = "bebe"; d.ropa = "mameluco"; if (!["pelo", "gorro_bebe"].includes(d.sombrero)) d.sombrero = "pelo"; d.peinado = "pelusa"; d.vestido = null; d.bigote = null; }],
  [/^(?!.*(detective|investigador|inspector|jefe)).*(policia|patrull|sargento|agente|oficial)/, (d) => d.ropa === "uniforme" && d.sombrero === "gorra_policia", "policía: uniforme y gorra_policia", (d) => { d.ropa = "uniforme"; d.sombrero = "gorra_policia"; d.accesorios = [...new Set([...(d.accesorios ?? []), "placa"])].slice(0, 5); }],
  [/detective|investigador|inspector/, (d) => ["fedora", "bombin"].includes(d.sombrero) && d.ropa !== "uniforme", "detective: fedora o bombín, sin uniforme", (d) => { if (!["fedora", "bombin"].includes(d.sombrero)) d.sombrero = "fedora"; if (d.ropa === "uniforme") d.ropa = "gabardina"; }],
  [/periodista|reporter|fotograf|prensa/, (d) => (d.accesorios ?? []).includes("credencial_prensa") && ["camara_foto", "libreta", "microfono"].includes(d.objetoTipico), "periodista: credencial de prensa y cámara, libreta o micrófono", (d) => { d.accesorios = [...new Set([...(d.accesorios ?? []), "credencial_prensa"])].slice(0, 5); if (!["camara_foto", "libreta", "microfono"].includes(d.objetoTipico)) d.objetoTipico = /fotograf/.test(sinT(d.papel)) ? "camara_foto" : "libreta"; if (d.sombrero === "pelo") d.sombrero = "fedora"; }],
  [/\bjuez\b/, (d) => d.ropa === "toga" && dist(d.camisa, "#000000") < 120, "juez: toga negra", (d) => { d.ropa = "toga"; d.camisa = "#1c1c22"; d.pantalon = "#1c1c22"; }],
  [/ninera|nana|institutriz|niñera/, (d) => ["uniforme_ninera", "delantal"].includes(d.ropa), "niñera: uniforme de niñera o delantal", (d) => { d.ropa = "uniforme_ninera"; }],
  [/enfermer/, (d) => d.ropa === "uniforme_enfermera", "enfermera: uniforme de enfermera", (d) => { d.ropa = "uniforme_enfermera"; if (d.sombrero === "pelo") d.sombrero = "cofia"; }],
  [/preso|recluso|presidiario/, (d) => d.ropa === "rayas_preso", "preso: rayas de presidiario", (d) => { d.ropa = "rayas_preso"; }],
  [/medico|doctor|cientific|laboratorio|experto en madera|forense/, (d) => d.ropa === "bata", "médico o experto de laboratorio: bata", (d) => { d.ropa = "bata"; }],
];
/** ropa que es de un oficio: nadie más la usa (un fiscal con toga o una asistente con delantal de niñera confunden) */
const EXCLUSIVA = { toga: /\bjuez\b/, uniforme: /polic|patrull|guardia|sargento|oficial|agente|vigilancia|carcel|celador/,
  uniforme_ninera: /ninera|nana|institutriz|criada|empleada domestica|mucama|sirvienta/, uniforme_enfermera: /enfermer/,
  rayas_preso: /preso|recluso|presidiario|condenado/, uniforme_militar: /militar|soldado|coronel|general|capitan|sargento/ };
REGLAS.push([/./, (d) => !EXCLUSIVA[d.ropa] || EXCLUSIVA[d.ropa].test(sinT(d.papel ?? "")), "lleva ropa de otro oficio", (d) => { d.ropa = d.vestido ? "liso" : "terno"; }]);

/** verificador automático: devuelve {id: [problemas]} */
/** personajes recurrentes de la serie con imagen maestra (guiones/personajes_fijos.json) */
export const personajesFijos = () => { try { return JSON.parse(fs.readFileSync(rutaPersonajesFijos(), "utf8")); } catch { return []; } };
const fijoDe = (f) => { const k = sinT(`${f.id} ${f.nombre}`); return personajesFijos().find((p) => (p.busca ?? [p.id]).some((b) => k.includes(b))) ?? null; };
/** los personajes contemporáneos (sala de investigación) no siguen las reglas de vestuario de la época de la historia */
const contemporaneo = (f, d) => !!(d?.fijo || /contempor|ficti|actualidad|sala de (analisis|investigacion)/.test(sinT(`${f?.papel ?? ""} ${d?.papel ?? ""}`)));
export const verificar = (disenos, biblia) => {
  const notas = {}, N = (id, m) => (notas[id] ??= []).push(m);
  const ficha = (id) => biblia.personajes.find((p) => p.id === id) ?? {};
  for (const d of disenos) {
    const f = ficha(d.id), quien = sinT(f.papel ?? d.papel ?? ""), edad = Number(f.edad ?? d.edad);
    for (const [re, ok, msg] of REGLAS) if (re.test(quien) && !ok(d)) N(d.id, msg);
    if (/piloto|aviador|aviadora/.test(quien) && (d.sombrero === "casco_aviador" || d.ropa === "chaqueta_cuero")) N(d.id, "la ropa de aviador va como vestuario alternativo (lugares aerodromo, cielo, cabina); el principal es ropa de calle");
    if (Number.isFinite(edad)) {
      if (edad <= 3 && d.complexion !== "bebe") N(d.id, `tiene ${edad} años: complexion bebe`);
      else if (edad >= 4 && edad <= 12 && d.complexion !== "nino") N(d.id, `tiene ${edad} años: complexion nino`);
      else if (edad >= 13 && edad <= 17 && d.complexion !== "adolescente") N(d.id, `tiene ${edad} años: complexion adolescente`);
      else if (edad >= 65 && d.complexion !== "anciano" && !(d.rasgos ?? []).includes("arrugas")) N(d.id, `tiene ${edad} años: anciano o arrugas`);
    }
    if (f.sexo === "m" && !d.vestido && Number(biblia.epoca) < 1960 && !/policia|piloto|aviadora/.test(quien) && !contemporaneo(f, d)) N(d.id, "mujer de antes de 1960 sin vestido");
  }
  // parecidos: misma silueta y colores parecidos
  for (let i = 0; i < disenos.length; i++) for (let j = 0; j < i; j++) {
    const a = disenos[i], b = disenos[j], chico = (x) => ["bebe", "nino"].includes(x.complexion);
    if (chico(a) !== chico(b)) continue;
    // con el mismo uniforme (policías, niñeras, presos) se comparan cara y cuerpo: el uniforme igual es lo esperado
    if (a.ropa === b.ropa && /uniforme|rayas_preso|toga/.test(a.ropa)) {
      const f = (a.complexion === b.complexion) + (a.peinado === b.peinado) + (dist(a.colorPelo, b.colorPelo) < 50) + (!!a.bigote === !!b.bigote && (a.rasgos ?? []).includes("gafas") === (b.rasgos ?? []).includes("gafas"));
      if (f >= 3) N(a.id, `se parece demasiado a ${b.id} (misma silueta y colores parecidos)`);
      continue;
    }
    let s = 0;
    if (a.sombrero === b.sombrero) s += 2;
    if (a.ropa === b.ropa) s += 2;
    if (a.peinado === b.peinado) s += 1;
    if (a.complexion === b.complexion) s += 1;
    if (!!a.vestido === !!b.vestido) s += 1;
    if (dist(a.vestido ?? a.camisa, b.vestido ?? b.camisa) < 70) s += 2;
    if (dist(a.colorPelo, b.colorPelo) < 50) s += 1;
    if (a.sombrero !== "pelo" && dist(a.colorSombrero, b.colorSombrero) < 50) s += 1;
    if (!!a.bigote === !!b.bigote && (a.rasgos ?? []).join() === (b.rasgos ?? []).join()) s += 1;
    if (s >= 9) N(a.id, `se parece demasiado a ${b.id} (misma silueta y colores parecidos)`);
  }
  return notas;
};

const aplicar = (d, campos) => { for (const [k, v] of Object.entries(campos ?? {})) if (CAMPOS.includes(k)) d[k] = v; };
const normalizar = (disenos, biblia) => {
  const plan = { epoca: biblia.epoca, personajes: disenos.map((d) => ({ ...d })), escenas: [] };
  validarPlan(plan);
  return plan.personajes.map((p, i) => ({ ...p, fijo: disenos[i].fijo || undefined, sexo: disenos[i].sexo, vestuarios: p.vestuarios?.map((v, k) => ({ ...v, usar: disenos[i].vestuarios?.[k]?.usar ?? v.usar })), objetoTipico: C.en_mano.includes(disenos[i].objetoTipico) ? disenos[i].objetoTipico : null,
    expresionesTipicas: (disenos[i].expresionesTipicas ?? []).filter((x) => C.expresiones.includes(x)).slice(0, 4), porque: disenos[i].porque }));
};

export const etapa2 = async (biblia, dir, log = console.log) => {
  const orden = { principal: 0, secundario: 1, menor: 2 };
  const fichas = [...biblia.personajes].sort((a, b) => (orden[a.importancia] ?? 1) - (orden[b.importancia] ?? 1));
  const disenos = [];
  for (const f of fichas) {
    let d = leer(dir, `disenos/${f.id}.json`);
    const fx = fijoDe(f);
    if (fx) { d = { ...fx, id: f.id, nombre: fx.nombre, fijo: true }; delete d.busca; guardar(dir, `disenos/${f.id}.json`, d); log(`${fx.nombre}: diseño fijo de la serie (imagen maestra)`); }
    if (!d) {
      log(`Diseñando a ${f.nombre} (${f.papel})…`);
      d = await agente({ nombre: `Diseño ${f.id}`, system: DISENADOR() + textoBibliaVisual(), temperatura: 0.6, maxTokens: 1800, log,
        user: `ÉPOCA: ${biblia.epoca} · ${biblia.region ?? ""}\nFICHA:\n${JSON.stringify(f, null, 1)}\n\nESCENAS DONDE APARECE:\n${escenasDe(biblia, f.id)}\n\nYA DISEÑADOS (no te parezcas a ninguno):\n${disenos.map(resumen).join("\n") || "(ninguno)"}` });
      d.id = f.id; d.nombre = d.nombre || f.nombre; d.papel = d.papel || f.papel; d.edad = d.edad ?? f.edad; d.sexo = d.sexo || f.sexo;
      guardar(dir, `disenos/${f.id}.json`, d);
    }
    d.sexo = f.sexo ?? d.sexo;   // el sexo lo fija la biblia ("h"/"m"); el diseñador a veces usa "f"
    disenos.push({ ...normalizar([d], biblia)[0], fijo: !!d.fijo });
  }
  // revisión: verificador automático + revisor, hasta 2 vueltas; las reglas de oficio y edad se aseguran al final
  let finales = disenos, log2 = [];
  for (let vuelta = 1; vuelta <= 2; vuelta++) {
    const notas = verificar(finales, biblia);
    const n = Object.values(notas).flat().length;
    log(`Revisión ${vuelta}: ${n} problema(s)`);
    if (!n) break;
    const r = await agente({ nombre: `Revisor ${vuelta}`, system: REVISOR + "\n\nBIBLIOTECA:\n" + textoBiblioteca(), temperatura: 0.3, maxTokens: 6000, log,
      user: `PROBLEMAS:\n${Object.entries(notas).map(([id, m]) => `- ${id}: ${m.join("; ")}`).join("\n")}\n\nDISEÑOS:\n${finales.map(resumen).join("\n")}\n\nFICHAS:\n${biblia.personajes.map((p) => `${p.id}: ${p.papel}, ${p.edad} años, ${p.aspecto ?? ""}`).join("\n")}` });
    for (const c of r.cambios ?? []) { const d = finales.find((x) => x.id === c.id); if (d && !d.fijo) { aplicar(d, c.campos); log2.push({ vuelta, id: c.id, campos: c.campos, motivo: c.motivo }); } }
    finales = normalizar(finales, biblia);
  }
  for (const d of finales) {
    if (d.fijo) continue;
    const f = biblia.personajes.find((p) => p.id === d.id) ?? {}, quien = sinT(f.papel ?? d.papel ?? ""), edad = Number(f.edad ?? d.edad);
    for (const [re, ok, msg, fix] of REGLAS) if (re.test(quien) && !ok(d)) { fix(d); log2.push({ vuelta: "auto", id: d.id, motivo: msg }); }
    // mujer de antes de 1960 sin vestido: vestido del color de su ropa, y nada de sombreros de hombre
    if (f.sexo === "m" && !d.vestido && Number(biblia.epoca) < 1960 && edad > 3) {
      d.vestido = d.camisa ?? "#5a5560"; d.bigote = null; d.rasgos = (d.rasgos ?? []).filter((x) => !/barba|perilla|patillas/.test(x));
      if (["fedora", "bombin", "gorra_plana", "gorra"].includes(d.sombrero)) d.sombrero = "cloche";
      if (["traje", "terno", "gabardina", "smoking"].includes(d.ropa)) d.ropa = "liso";
      log2.push({ vuelta: "auto", id: d.id, motivo: "mujer de su época: con vestido" });
    }
    if (sacarAviador(d)) log2.push({ vuelta: "auto", id: d.id, motivo: "el traje de aviador pasa a vestuario de vuelo; en casa y en la calle, traje" });
    // los vestuarios alternativos tampoco usan ropa de otro oficio (un abogado con toga, un periodista de uniforme)
    const papelD = sinT(f.papel ?? d.papel ?? "");
    if (d.vestuarios?.length) {
      const antes = d.vestuarios.length;
      d.vestuarios = d.vestuarios.filter((v) => !EXCLUSIVA[v.ropa] || EXCLUSIVA[v.ropa].test(papelD));
      if (d.vestuarios.length < antes) log2.push({ vuelta: "auto", id: d.id, motivo: "se quita un vestuario con ropa de otro oficio" });
    }
    // ojeras solo para quien muestra cansancio, preocupación o tristeza (si no, todos parecen agotados)
    if ((d.rasgos ?? []).includes("ojeras") && !(d.expresionesTipicas ?? []).some((x) => ["cansado", "preocupado", "triste", "llorando", "aterrado"].includes(x))) d.rasgos = d.rasgos.filter((x) => x !== "ojeras");
    // un adulto no puede tener cuerpo de bebé, niño o adolescente
    if (Number.isFinite(edad) && edad >= 18 && ["bebe", "nino", "adolescente"].includes(d.complexion)) { d.complexion = edad >= 65 ? "anciano" : "adulto"; log2.push({ vuelta: "auto", id: d.id, motivo: `tiene ${edad} años: cuerpo de adulto` }); }
    if (Number.isFinite(edad) && edad <= 3) REGLAS[0][3](d);
    else if (Number.isFinite(edad) && edad <= 12) d.complexion = "nino";
    else if (Number.isFinite(edad) && edad <= 17 && d.complexion !== "nino") d.complexion = "adolescente";
    if (["bebe", "nino"].includes(d.complexion)) d.rasgos = (d.rasgos ?? []).filter((x) => !["ojeras", "arrugas", "cicatriz", "barba", "barba_corta", "perilla", "patillas"].includes(x));
  }
  finales = normalizar(finales, biblia);
  // último paso: si dos todavía se parecen, se diferencian con reglas fijas (no depende del humor del revisor)
  for (let n = 0; n < 4; n++) {
    const notas = verificar(finales, biblia), pares = Object.entries(notas).flatMap(([id, ms]) => ms.map((m) => [id, /a (\S+) \(misma/.exec(m)?.[1]]).filter(([, o]) => o));
    if (!pares.length) break;
    for (const [id, otroId] of pares) {
      let a = finales.find((x) => x.id === id), b = finales.find((x) => x.id === otroId); if (!a || !b) continue;
      if (a.fijo) [a, b] = [b, a];
      if (a.fijo) continue;
      if (dist(a.vestido ?? a.camisa, b.vestido ?? b.camisa) < 70 && !/uniforme/.test(a.ropa)) diferenciarColor(a, finales);
      if (a.sombrero === b.sombrero && a.sombrero !== "gorra_policia") a.sombrero = otroSombrero(a, finales);
      if (a.ropa === b.ropa || a.sombrero === b.sombrero) diferenciarCara(a, b);
      log2.push({ vuelta: "auto", id: a.id, motivo: `se diferencia de ${b.id}` });
    }
    finales = normalizar(finales, biblia);
  }
  const pendientes = verificar(finales, biblia);
  guardar(dir, "personajes.json", finales);
  guardar(dir, "revision_personajes.json", { cambios: log2, pendientes });
  return { personajes: finales, pendientes };
};

export const hojaPersonajes = async (biblia, personajes, pendientes, dir, log = console.log) => {
  const { hoja } = await import("../pipeline/render.mjs");
  const salida = path.join(dir, "hoja_personajes.jpg");
  await hoja({ props: { titulo: biblia.titulo ?? "Personajes", personajes, notas: pendientes }, salida, escala: 0.5, log });
  return salida;
};

// ---------------- etapa 3: escenarios ----------------
const LUG_DESC = {
  mansion: "exterior de residencia colonial de dos pisos con jardín, árboles fijos y camino libre hasta la puerta",
  calle: "calle de ciudad de los años 30: edificios de ladrillo, aceras, faroles, autos antiguos, kiosco",
  cementerio: "lápidas, verja de hierro, faroles", gasolinera: "surtidores antiguos bajo un techo, taller", puerto: "muelle de madera, mar y barco",
  bosque: "bosque con pinos y matorral", campo: "campo abierto con árboles", playa: "playa y mar",
  aerodromo: "pista de aterrizaje con hangares y manga de viento (despegue y aterrizaje del avión)", cielo: "en pleno vuelo entre nubes, sobre el mar, sin suelo",
  cabina: "adentro del avión: tablero, ventanillas, asiento del piloto",
  habitacion: "INTERIOR cuarto infantil con cuna, ventana con postigos, chimenea", oficina: "INTERIOR oficina de detectives con escritorios, archivadores, pared de pruebas",
  tribunal: "INTERIOR sala de tribunal con estrado, jurado, bancas", carcel: "INTERIOR pasillo de celdas", supermercado: "INTERIOR almacén de comestibles con estanterías, fruta y mostrador",
};
const ESCENOGRAFO = () => `Eres el ESCENÓGRAFO de una serie animada de casos reales (personajes de dibujo en decorados 3D, años 20-30).
Con la biblia del guion (lugares y secuencias) defines los ESCENARIOS FIJOS del episodio, como los decorados de un estudio de televisión:
se construyen UNA vez y se reutilizan; cada vez que la historia vuelve a un sitio, se ve igual (mismos árboles, mismas casas).

Decorados que el motor sabe construir (motor):
${Object.entries(LUG_DESC).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

REGLAS:
1) Un escenario por sitio físico. El exterior y el interior de un edificio son escenarios distintos (exterior de la mansión ≠ cuarto del bebé).
   Nunca juntes en un escenario dos sitios distintos (una calle y un avión en vuelo son tres escenarios: calle, aerodromo/cielo, cabina).
2) VUELOS: si la historia cuenta un vuelo, crea: aerodromo (despegue y aterrizaje en la pista), cielo (el avión en el aire) y cabina
   (el piloto adentro). La secuencia del vuelo usa los tres, en orden: aerodromo, cielo, cabina, aerodromo.
3) PRENSA Y CURIOSOS: el acoso de periodistas a gente famosa NUNCA ocurre dentro de un cuarto privado: pasa en la calle (con
   transeúntes y prensa) o en el supermercado. Las calles SIEMPRE tienen transeúntes (que no parezca una ciudad deshabitada).
4) GENTE DE FONDO de cada escenario: lista de {"tipo": transeuntes|prensa|publico|guardias, "cantidad": número, "accion": parado|marchar}.
   Un cuarto privado no tiene gente de fondo. Un jardín de una casa aislada tampoco (solo los personajes de la escena).
5) HORA Y CLIMA (momentos): las combinaciones {hora: dia|atardecer|noche|amanecer, clima: despejado|nublado|lluvia|niebla|nieve}
   que pide el guion en ese sitio. Que haya variedad: de día con sol, atardeceres, niebla en el cementerio… Lluvia SOLO si el guion la
   menciona. No todo es de noche.
6) UTILERÍA FIJA del decorado (no objetos de la historia como la escalera o la nota): de esta lista: farola, auto, auto_policia, kiosco,
   buzon, hidrante, banca, seto, barril, cajas, valla, lampara, arbol, pino, arbusto. Máximo 4 por escenario.
7) Para cada secuencia (por su índice), la lista ordenada de escenarios que usa.
Devuelve SOLO JSON: {"escenarios": [{"id": "exterior_mansion", "nombre": "...", "motor": "mansion", "descripcion": "...",
 "momentos": [{"hora": "noche", "clima": "despejado"}], "gente": [], "utileria": ["auto"]}],
 "secuencias": [{"i": 0, "escenarios": ["exterior_mansion", "cuarto_bebe"]}]}`;

const VUELO = /avion|vuelo|vuela|despeg|aterriz|piloto|atlantico/;
const PRENSA = /periodist|prensa|reporter|fotograf|flash|mediatic|acos|asedi|privacidad/;
import { CAMARAS_SET } from "./coherencia.mjs";
export { CAMARAS_SET };
const PRIVADO = ["habitacion", "mansion"];

export const etapa3 = async (biblia, dir, log = console.log) => {
  let esc = leer(dir, "escenarios_agente.json");
  if (!esc) {
    log("Etapa 3: el escenógrafo define los decorados fijos…");
    const sec = biblia.secuencias.map((s, i) => `[${i}] cap ${s.cap} · ${s.bloque} · lugar ${s.lugar} · ${s.hora}/${s.clima}\n  ${s.resumen}\n  gente: ${s.gente_de_fondo ?? ""}\n  ` +
      (s.personajes ?? []).map((p) => `${p.id}: ${p.hace}`).join(" | ")).join("\n");
    const lug = (biblia.lugares ?? []).map((l) => `- ${l.id} (${l.motor ?? "?"}): ${l.nombre}. ${l.descripcion} Gente: ${l.gente_de_fondo ?? ""}. Momentos: ${(l.momentos ?? []).map((m) => m.hora + "/" + m.clima).join(", ")}`).join("\n");
    esc = await agente({ nombre: "Escenógrafo", system: ESCENOGRAFO(), temperatura: 0.3, maxTokens: 8000, log,
      user: `ÉPOCA: ${biblia.epoca} · ${biblia.region}\nLUGARES DE LA BIBLIA:\n${lug}\n\nSECUENCIAS:\n${sec}` });
    guardar(dir, "escenarios_agente.json", esc);
  }
  for (const s of biblia.secuencias) delete s.escenarios;
  // ---- reglas fijas (no dependen de que el agente acierte) ----
  const cambios = [];
  const motores = Object.keys(LUG_DESC), lista = (esc.escenarios ?? []).filter((s) => s && s.id);
  const SIN = { ciudad: "calle", pueblo: "calle", interior: "oficina", nuevo: "oficina", avion: "cielo", pista: "aerodromo", aeropuerto: "aerodromo", almacen: "supermercado", mercado: "supermercado", congreso: "tribunal", mar: "puerto" };
  for (const s of lista) {
    s.id = sinT(s.id).replace(/[^a-z0-9_]/g, "");
    const m = sinT(s.motor);
    if (!motores.includes(m)) { const n = SIN[m] ?? (/congreso|sala|juzgado/.test(sinT(s.nombre)) ? "tribunal" : "calle"); cambios.push(`${s.id}: motor "${s.motor}" → ${n}`); s.motor = n; } else s.motor = m;
    s.momentos = (s.momentos ?? []).map((x) => ({ hora: C.horas.includes(sinT(x.hora)) ? sinT(x.hora) : "dia", clima: C.climas.includes(sinT(x.clima)) ? sinT(x.clima) : "despejado" }));
    s.gente = (s.gente ?? []).map((g) => ({ tipo: C.tipos_multitud.includes(sinT(g.tipo)) ? sinT(g.tipo) : "transeuntes", cantidad: Math.max(3, Math.min(60, Math.round(Number(g.cantidad) || 12))), accion: g.accion === "marchar" ? "marchar" : "parado" }));
    // siglo XX: el público es gente de la época (no aldeanos)
    if ((biblia.epoca ?? 0) >= 1900) for (const g of s.gente) if (g.tipo === "publico" || g.tipo === "pueblo") g.tipo = "transeuntes";
    if (["habitacion", "oficina", "cabina", "cielo"].includes(s.motor) && s.gente.length) { s.gente = []; cambios.push(`${s.id}: un ${s.motor} no lleva gente de fondo (solo los personajes de la escena)`); }
    if (s.motor === "cementerio" && !s.utileria.includes("lapida")) s.utileria.unshift("lapida");
    s.utileria = (s.utileria ?? []).map(sinT).filter((u) => C.objetos.includes(u)).slice(0, 4);
    if (s.motor === "calle" && !s.gente.some((g) => g.tipo === "transeuntes")) { s.gente.push({ tipo: "transeuntes", cantidad: 24, accion: "marchar" }); cambios.push(`${s.id}: la calle lleva transeúntes`); }
    if (s.motor === "supermercado" && !s.gente.some((g) => g.tipo === "transeuntes")) s.gente.push({ tipo: "transeuntes", cantidad: 6, accion: "parado" });
  }
  const porId = new Map(lista.map((s) => [s.id, s]));
  const asegurar = (id, motor, nombre, momentos, extra = {}) => {
    if (porId.has(id)) return porId.get(id);
    const ya = lista.find((s) => s.motor === motor); if (ya) return ya;
    const s = { id, nombre, motor, descripcion: LUG_DESC[motor], momentos, gente: [], utileria: [], ...extra };
    lista.push(s); porId.set(id, s); cambios.push(`se agrega el escenario ${id} (${motor})`); return s;
  };
  const asig = new Map((esc.secuencias ?? []).map((x) => [Number(x.i), (x.escenarios ?? []).map((v) => sinT(v).replace(/[^a-z0-9_]/g, "")).filter((v) => porId.has(v))]));
  biblia.secuencias.forEach((s, i) => {
    let ids = asig.get(i) ?? [];
    if (!ids.length) { const l = lista.find((x) => x.id === sinT(s.lugar)) ?? lista.find((x) => x.motor === (biblia.lugares ?? []).find((l) => l.id === s.lugar)?.motor); if (l) ids = [l.id]; }
    const texto = sinT(`${s.resumen} ${(s.personajes ?? []).map((p) => p.hace).join(" ")} ${(s.momentos_clave ?? []).join(" ")}`);
    // vuelo: pista → cielo → cabina → pista
    if (VUELO.test(texto) && !ids.some((v) => ["aerodromo", "cielo", "cabina"].includes(porId.get(v)?.motor))) {
      const a = asegurar("aerodromo", "aerodromo", "Aeródromo", [{ hora: "amanecer", clima: "nublado" }, { hora: "atardecer", clima: "despejado" }]);
      const c = asegurar("cielo_vuelo", "cielo", "El avión en vuelo", [{ hora: "dia", clima: "despejado" }]);
      const k = asegurar("cabina_avion", "cabina", "Cabina del avión", [{ hora: "dia", clima: "despejado" }]);
      ids = [a.id, c.id, k.id, a.id, ...ids]; cambios.push(`secuencia ${i}: el vuelo pasa por pista, cielo, cabina y pista`);
    }
    if (VUELO.test(texto)) { const a = ids.findIndex((v) => porId.get(v)?.motor === "aerodromo"), c = ids.findLastIndex((v) => ["cielo", "cabina"].includes(porId.get(v)?.motor));
      if (a >= 0 && c > a && !ids.slice(c).some((v) => porId.get(v)?.motor === "aerodromo")) { ids = [...ids.slice(0, c + 1), ids[a], ...ids.slice(c + 1)]; cambios.push(`secuencia ${i}: el avión aterriza otra vez en la pista`); } }
    // prensa: nunca dentro de un cuarto privado
    if (PRENSA.test(texto)) {
      const privados = ids.filter((v) => PRIVADO.includes(porId.get(v)?.motor));
      if ((privados.length || !ids.length) && !ids.some((v) => ["calle", "supermercado"].includes(porId.get(v)?.motor))) {
        const yaCalle = biblia.secuencias.slice(0, i).some((x) => (x.escenarios ?? []).some((v) => porId.get(v)?.motor === "calle"));
        const cl = yaCalle ? asegurar("supermercado", "supermercado", "Supermercado (acoso de la prensa)", [{ hora: "dia", clima: "despejado" }], { gente: [{ tipo: "transeuntes", cantidad: 6, accion: "parado" }, { tipo: "prensa", cantidad: 6, accion: "parado" }] })
          : asegurar("calle_prensa", "calle", "Calle con prensa y curiosos", [{ hora: "dia", clima: "despejado" }], { gente: [{ tipo: "transeuntes", cantidad: 24, accion: "marchar" }, { tipo: "prensa", cantidad: 10, accion: "parado" }] });
        if (!cl.gente.some((g) => g.tipo === "prensa")) cl.gente.push({ tipo: "prensa", cantidad: 10, accion: "parado" });
        ids = [...ids, cl.id]; cambios.push(`secuencia ${i}: la prensa acosa en la calle (${cl.id}), no en un cuarto`);
      }
    }
    s.escenarios = ids.filter((v, j) => ids.indexOf(v) === j || porId.get(v)?.motor === "aerodromo");
    // los momentos de cada escenario incluyen la hora y el clima de las secuencias que lo usan
    for (const v of s.escenarios) { const e2 = porId.get(v); if (!e2) continue; const m = { hora: s.hora, clima: s.clima };
      if (["habitacion", "oficina", "tribunal", "carcel", "supermercado", "cabina", "cielo"].includes(e2.motor) || VUELO.test(texto)) continue;
      if (C.horas.includes(m.hora) && C.climas.includes(m.clima) && !e2.momentos.some((x) => x.hora === m.hora && x.clima === m.clima)) e2.momentos.push(m); }
  });
  for (const s of lista) if (!s.momentos.length) s.momentos = [{ hora: "dia", clima: "despejado" }];
  // la prensa del supermercado: si hay un supermercado y la historia tiene prensa, que se vea en el decorado
  const usados = new Set(biblia.secuencias.flatMap((s) => s.escenarios ?? []));
  const final = lista.filter((s) => usados.has(s.id));
  for (const s of lista) if (!usados.has(s.id)) cambios.push(`${s.id}: ninguna secuencia lo usa, se quita`);
  esc = { escenarios: final, secuencias: biblia.secuencias.map((s, i) => ({ i, escenarios: s.escenarios })) };
  guardar(dir, "escenarios.json", esc);
  guardar(dir, "biblia.json", biblia);
  guardar(dir, "revision_escenarios.json", { cambios });
  log(`Escenarios: ${final.length} decorados fijos; ${cambios.length} correcciones automáticas`);
  return { escenarios: final, cambios };
};

/** una escena de prueba por escenario y momento (sin actores): el decorado con su hora, clima, gente de fondo y utilería */
const escenaDeEscenario = (s, m) => {
  const interior = ["habitacion", "oficina", "tribunal", "carcel", "supermercado", "cabina"].includes(s.motor);
  const objetos = [], multitudes = [];
  if (s.motor === "aerodromo") objetos.push({ tipo: "avion", x: -3, z: -6.5, giro: 0.35 });
  if (s.motor === "cielo") objetos.push({ tipo: "avion", x: 0, z: -2, estado: "vuela" });
  const SPOT = s.motor === "calle" ? [[-4.6, -9], [4.6, -6], [-4.6, -2], [4.6, -15]] : [[-5, -6], [5.5, -5], [-6, -1], [6, 0]];
  if (s.motor === "cementerio") for (let k = 0; k < 12; k++) objetos.push({ tipo: "lapida", x: -6 + (k % 4) * 4 + (k % 2) * 0.6, z: -12 + Math.floor(k / 4) * 3, giro: 0 });
  if (!interior) s.utileria.filter((u) => u !== "lapida").forEach((u, k) => { const [x, z] = SPOT[k % SPOT.length]; objetos.push({ tipo: u, x, z, giro: u === "auto" || u === "auto_policia" ? Math.PI / 2 : 0 }); });
  for (const g of s.gente) {
    const uni = g.tipo === "guardias" ? { camisa: "#26324a", pantalon: "#26324a", sombrero: "gorra_policia", colorSombrero: "#1e2638" } : null;
    if (interior) { const k2 = multitudes.length; if (k2 >= 2) continue;
      multitudes.push({ tipo: g.tipo, cantidad: Math.min(g.cantidad, 6), x: k2 ? 2.2 : -2.2, z: s.motor === "tribunal" ? -0.6 : -2.4, ancho: 2.6, fondo: 1.4, formacion: "grupo", accion: "parado", uniforme: uni }); continue; }
    if (g.tipo === "transeuntes" && s.motor === "calle") {
      const n = Math.max(4, Math.round(g.cantidad / 2));
      multitudes.push({ tipo: "transeuntes", cantidad: n, x: -5.6, z: -3, ancho: 1.2, fondo: 10, formacion: "grupo", accion: "marchar", hacia: [-5.6, 4] });
      multitudes.push({ tipo: "transeuntes", cantidad: n, x: 5.6, z: -2, ancho: 1.2, fondo: 10, formacion: "grupo", accion: "marchar", hacia: [5.6, -6] });
    } else if (g.tipo === "prensa") multitudes.push({ tipo: "prensa", cantidad: Math.min(g.cantidad, 14), x: 0, z: -4, ancho: 5, fondo: 2.5, formacion: "grupo", accion: "parado" });
    else multitudes.push({ tipo: g.tipo, cantidad: Math.min(g.cantidad, 24), x: 0, z: -14, ancho: 14, fondo: 5, formacion: "grupo", accion: g.accion, hacia: g.accion === "marchar" ? [10, -14] : null, uniforme: uni });
  }
  return { narracion: "", duracion: 4, ambiente: { lugar: s.motor, hora: m.hora, clima: m.clima, escenario: s.id }, actores: [], objetos, multitudes,
    camara: { tipo: "plano_general", plano: interior ? "general" : "panoramico", objetivo: "grupo" },
    tomas: [{ t: 0, objetivo: "grupo", plano: interior ? "general" : "panoramico", angulo: "frente", mov: "empuje", pos: CAMARAS_SET[s.motor]?.[0] ?? null, mira: CAMARAS_SET[s.motor]?.[1] ?? null }], transicion: "corte", efectos: [] };
};

export const hojaEscenarios = async (biblia, escenarios, dir, log = console.log) => {
  const { fotos } = await import("../pipeline/render.mjs");
  const casillas = escenarios.flatMap((s) => s.momentos.slice(0, 3).map((m) => ({ s, m })));
  const plan = { titulo: "Escenarios", formato: "horizontal", modo: "episodio", estilo: "noir", epoca: biblia.epoca ?? 1932, personajes: [], escenas: casillas.map(({ s, m }) => escenaDeEscenario(s, m)) };
  const { plan: p } = validarPlan(plan);
  p.escenas.forEach((e, k) => { e.tomas = plan.escenas[k].tomas; e.ambiente.clima = casillas[k].m.clima; e.ambiente.escenario = casillas[k].s.id; });
  guardar(dir, "escenarios_prueba.json", p);
  const carpeta = path.join(dir, "escenarios");
  fs.rmSync(carpeta, { recursive: true, force: true });
  const cuadros = p.escenas.map((e) => Math.round((e.inicio + e.duracion * 0.6) * 30));
  const imgs = await fotos({ plan: p, carpeta, cuadros, escala: 0.5, log });
  const fichas = casillas.map(({ s, m }, k) => ({ img: imgs[k], titulo: s.nombre, sub: `${s.id} · ${s.motor} · ${m.hora} · ${m.clima}`,
    gente: s.gente.map((g) => `${g.cantidad} ${g.tipo}`).join(", ") || "sin gente de fondo", util: s.utileria.join(", ") }));
  fs.writeFileSync(path.join(carpeta, "fichas.json"), JSON.stringify({ titulo: `${biblia.titulo ?? "Episodio"} · escenarios`, fichas }, null, 1), "utf8");
  const salida = path.join(dir, "hoja_escenarios.jpg");
  const { execFileSync } = await import("node:child_process");
  execFileSync("python", [path.join(RAIZ, "pipeline", "hoja_escenarios.py"), path.join(carpeta, "fichas.json"), salida], { stdio: "inherit" });
  return salida;
};

// ---------------- CLI ----------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cargarEnv();
  if (!hayClave()) { console.error("Falta DEEPSEEK_API_KEY en .env"); process.exit(1); }
  const [guionPath, carpeta] = process.argv.slice(2);
  const dir = path.resolve(RAIZ, carpeta ?? "proyectos/preproduccion");
  fs.mkdirSync(dir, { recursive: true });
  const guion = fs.readFileSync(path.resolve(RAIZ, guionPath), "utf8");
  const etapa = Number(process.argv[process.argv.indexOf("--etapa") + 1]) || 0;
  const biblia = await etapa1(guion, dir);
  if (!etapa || etapa === 2) {
    const { personajes, pendientes } = await etapa2(biblia, dir);
    const hoja = await hojaPersonajes(biblia, personajes, pendientes, dir);
    console.log(`Hoja de personajes: ${hoja}`);
    console.log(`Pendientes tras la revisión: ${Object.values(pendientes).flat().length}`);
  }
  if (!etapa || etapa === 3) {
    const { escenarios, cambios } = await etapa3(biblia, dir);
    for (const c of cambios) console.log("  · " + c);
    console.log(`Hoja de escenarios: ${await hojaEscenarios(biblia, escenarios, dir)}`);
  }
  process.exit(0);
}
