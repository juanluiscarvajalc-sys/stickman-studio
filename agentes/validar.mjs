// Verificador automático: revisa el plan contra el catálogo y lo deja SIEMPRE renderizable
// (corrige valores fuera de catálogo, posiciones, ids, tiempos). Devuelve la lista de problemas que encontró.
import { C } from "./catalogo.mjs";

const HEX = /^#[0-9a-fA-F]{6}$/;
const sinTilde = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, "_");
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** valor del catálogo más parecido (exacto, sin tildes, prefijo o sinónimo); si no, el defecto */
const SIN = {
  acciones: { anotar: "escribir", apuntar_libreta: "escribir", tomar_notas: "escribir", fotos: "fotografiar", foto: "fotografiar", sacar_fotos: "fotografiar", fotografia: "fotografiar",
    entrevista: "entrevistar", preguntar: "entrevistar", preocupado: "preocuparse", angustiarse: "preocuparse", acechar: "espiar", vigilar: "espiar", observar: "espiar", esconderse: "espiar",
    subir: "trepar", escalar: "trepar", subir_escalera: "trepar", meterse: "entrar", entrar_ventana: "entrar", volar: "pilotar", pilotear: "pilotar", gesticular: "explicar", argumentar: "explicar",
    llorar: "cubrirse", taparse: "cubrirse", leer_carta: "leer", asiente: "asentir", afirmar: "asentir", niega: "negar", cruzarse_de_brazos: "cruzar_brazos", brazos_cruzados: "cruzar_brazos", rascarse: "dudar", rogar: "suplicar", rezar: "suplicar", abrazo: "abrazar", consuela: "consolar", aguardar: "esperar", tiembla: "temblar", desesperado: "desesperarse", telefonear: "llamar", telefono: "llamar", reloj: "mirar_reloj", dar: "entregar", ofrecer: "entregar", golpear_puerta: "tocar_puerta", tocar: "tocar_puerta", alto: "detener", parar: "detener", amenaza: "amenazar", contar: "enumerar", suspiro: "suspirar", reirse: "reir", aproximarse: "acercarse", retrocede: "retroceder", pasearse: "ir_y_venir", caminar_nervioso: "ir_y_venir", cuidar: "arropar", tapar: "arropar", acostar: "arropar", acunar: "arropar", andar: "caminar", camina: "caminar", corre: "correr", habla: "hablar", decir: "hablar", grita: "hablar", gritar: "hablar", apuntar: "senalar", senala: "senalar",
    festejar: "celebrar", saltar: "celebrar", asustarse: "sorpresa", asombro: "sorpresa", sentarse: "sentado", sienta: "sentado", caerse: "caer", tropezar: "caer",
    llevar: "cargar", sostener: "cargar", golpear: "martillar", clavar: "martillar", martilla: "martillar", empuja: "empujar", tirar: "lanzar", arrojar: "lanzar", come: "comer", morder: "comer", hornear: "cargar", dudar: "encogerse", quieto: "parado", esperar: "parado", mirar: "parado", pensar: "pensar", saluda: "saludar" },
  expresiones: { alegre: "feliz", contento: "feliz", triste: "dolor", miedo: "nervioso", asustado: "nervioso", asombrado: "sorpresa", sorprendido: "sorpresa",
    furioso: "enojado", molesto: "enojado", enfadado: "enojado", tranquilo: "neutral", aliviado: "alivio", riendo: "risa", confundido: "mareado", preocupado: "nervioso" },
  lugares: { almacen: "supermercado", mercado: "supermercado", tienda_comestibles: "supermercado", colmado: "supermercado", pista: "aerodromo", aeropuerto: "aerodromo", aldea: "pueblo", villa: "pueblo", plaza: "pueblo", casa: "interior", cocina: "interior", taller: "interior", avenida: "calle", callejon: "calle", cuarto: "habitacion", dormitorio: "habitacion", nursery: "habitacion",
    despacho: "oficina", comisaria: "oficina", laboratorio: "oficina", juzgado: "tribunal", corte: "tribunal", sala: "tribunal", prision: "carcel", celda: "carcel", penal: "carcel",
    residencia: "mansion", finca: "mansion", hacienda: "mansion", tumbas: "cementerio", panteon: "cementerio", estacion: "gasolinera", muelle: "puerto", barco: "puerto",
    fortaleza: "castillo", murallas: "castillo", selva: "bosque", jungla: "bosque", rio: "campo", lago: "campo", mar: "playa", costa: "playa", rancho: "granja", monte: "montana", pradera: "campo" },
  horas: { manana: "dia", mediodia: "dia", tarde: "atardecer", amanecer: "atardecer", anochecer: "atardecer", madrugada: "noche" },
};
const elegir = (lista, v, def, sin = {}) => {
  const s = sinTilde(v);
  if (lista.includes(s)) return [s, false];
  if (sin[s]) return [sin[s], true];
  const p = lista.find((x) => s.startsWith(x) || x.startsWith(s));
  if (s && p) return [p, true];
  return [def, true];
};


/** vestuario y rasgos por defecto según quién es (si el Diseñador no los mandó): cada uno distinto y de su oficio */
/** vestuario de los años 30 (episodios policiales) según el oficio */
const sugerido30 = (p, i) => {
  const n = sinTilde(`${p.id || ""} ${p.nombre || ""} ${p.descripcion || ""}`), mujer = !!p.vestido || /anne|madre|esposa|ninera|betty|senora|mujer|dona/.test(n);
  const nino = p.complexion === "nino" || /bebe|nino|hijo|pequeno|jr/.test(n);
  const policia = /policia|oficial|agente|patrull|sargento|guardia|marinero/.test(n), sospechoso = /secuestr|desconocido|sospechoso|extrano|john|intruso|silueta|hauptmann|acusado/.test(n);
  const experto = /experto|koehler|cientific|medico|doctor|laborator/.test(n), formal = /detective|investigador|inspector|periodista|reporter|fotograf|fiscal|abogado|defensor|juez|condon|intermediario|lindbergh|charles|piloto|empleado|cliente/.test(n);
  const sombrero = nino ? "pelo" : mujer ? (i % 2 ? "cloche" : "pelo") : policia ? "gorra_policia" : sospechoso || formal ? "fedora" : "pelo";
  const ropa = policia ? "uniforme" : experto ? "bata" : sospechoso ? "gabardina" : mujer || nino ? "liso" : /juez/.test(n) ? "gabardina" : "traje";
  const peinado = mujer ? ["mono", "rizado", "coleta"][i % 3] : nino ? "rizado" : ["liso", "liso", "punta", "calvo"][i % 4];
  const rasgos = nino ? ["mejillas"] : mujer ? [] : [["cejas"], ["barba_corta"], ["gafas"], ["cejas", "arrugas"], []][i % 5];
  return { ropa, peinado, rasgos, sombrero };
};
let EPOCA = null;
const moderno = () => !!EPOCA && Number(EPOCA) >= 1850;
const sugerido = (p, i) => {
  if (EPOCA && Number(EPOCA) >= 1850) return sugerido30(p, i);
  const n = sinTilde(`${p.id || ""} ${p.nombre || ""}`), mujer = !!p.vestido || /abuela|madre|mama|nina|reina|princesa|senora|dona|mujer|hija|esposa|bruja/.test(n);
  const nino = p.complexion === "nino" || /nino|nina|chico|chica|hijo|hija|pequeno/.test(n), viejo = /abuel|anciano|viejo|vieja|sabio/.test(n);
  const ropa = /soldado|guardia|capitan|sargento|guerrero|caballero/.test(n) ? "acolchado" : /general|rey|reina|principe|princesa|noble|duque|conde|senor/.test(n) ? "capa"
    : /panader|cociner|herrer|carnicer|tabern|posader/.test(n) ? "delantal" : /mercader|comerciante|vendedor|alcalde/.test(n) ? "chaleco"
    : /campesin|granjer|pastor|mendig|leñador|lenador/.test(n) ? ["parches", "tunica"][i % 2] : mujer ? ["liso", "delantal", "rayas"][i % 3] : ["rayas", "chaleco", "cuadros", "liso", "parches"][i % 5];
  const peinado = viejo ? (mujer ? "mono" : "calvo") : mujer ? ["largo", "coleta", "mono", "rizado"][i % 4] : nino ? ["punta", "rizado", "liso"][i % 3] : ["liso", "rizado", "punta", "calvo"][i % 4];
  const rasgos = viejo ? ["arrugas", mujer ? "gafas" : "barba"] : nino ? [["pecas"], ["mejillas"], ["pecas", "mejillas"]][i % 3] : mujer ? [["mejillas"], [], ["pecas"]][i % 3]
    : [["cejas", "barba_corta"], ["barba"], ["perilla"], ["gafas", "patillas"], ["cejas", "barba"], ["barba_corta"]][i % 6];
  const sombrero = /soldado|guardia|guerrero|caballero/.test(n) ? "casco" : /general|capitan|comandante|sargento/.test(n) ? "casco_pluma" : /rey|reina|princesa|principe/.test(n) ? "corona"
    : /monje|ladron|bruja|mago|ermitano/.test(n) ? "capucha" : /campesin|granjer|pastor|segador/.test(n) ? (mujer ? "panuelo" : "paja") : /pintor|artista|poeta/.test(n) ? "boina"
    : /ninja|luchador|herrer/.test(n) ? "cinta" : "pelo";
  return { ropa, peinado, rasgos, sombrero };
};

export const validarPlan = (plan, { durTotal } = {}) => {
  EPOCA = plan.epoca ?? null;
  const problemas = [];
  const P = (m) => problemas.push(m);
  plan.titulo = String(plan.titulo || "Mi historia").slice(0, 80);
  // ---- personajes ----
  const ids = new Set();
  plan.personajes = (plan.personajes || []).slice(0, 30).map((p, i) => {
    const id = sinTilde(p.id || p.nombre || `p${i}`).replace(/[^a-z0-9_]/g, "") || `p${i}`;
    ids.add(id);
    const color = (k, d) => { if (p[k] == null || p[k] === "") return d; if (!HEX.test(p[k])) { P(`personaje ${id}: color ${k} inválido (${p[k]})`); return d; } return p[k]; };
    const [complexion] = elegir(C.complexiones, p.complexion, "adulto");
    const [sombrero, s2] = elegir(C.sombreros, p.sombrero, sugerido(p, i).sombrero, { yelmo: "casco", casco_de_hierro: "casco", penacho: "casco_pluma", diadema: "corona", capuchon: "capucha", "sombrero de paja": "paja", sombrero_de_paja: "paja", panuelo: "panuelo", "pañuelo": "panuelo", gorro: "gorra", vincha: "cinta", banda: "cinta" });
    if (s2 && p.sombrero) P(`personaje ${id}: sombrero "${p.sombrero}" → ${sombrero}`);
    return { id, nombre: String(p.nombre || id), complexion, piel: color("piel", "#f5c9a0"), camisa: color("camisa", ["#3f6fb5", "#c0353a", "#2f7a5a", "#7b5ac9", "#f08a2c"][i % 5]),
      pantalon: color("pantalon", "#3b3f52"), zapatos: color("zapatos", "#4a3426"), sombrero: moderno() && /^(casco|casco_pluma|corona|capucha|chaco|chaco_alto|bonete|cinta)$/.test(sombrero) ? sugerido(p, i).sombrero : sombrero, colorSombrero: color("colorSombrero", "#4a3020"),
      vestido: p.vestido && HEX.test(p.vestido) ? p.vestido : null, bigote: p.bigote && HEX.test(p.bigote) ? p.bigote : null,
      cinturon: p.cinturon && HEX.test(p.cinturon) ? p.cinturon : null,
      peinado: elegir(C.peinados, p.peinado, sugerido(p, i).peinado, { rulos: "rizado", crespo: "rizado", erizado: "punta", pelado: "calvo", cola: "coleta", trenza: "trenzas", rodete: "mono", chongo: "moño_bajo", gomina: "engominado", bob: "melena", rapada: "rapado" })[0],
      ropa: ((x) => moderno() && /^(acolchado|capa|tunica)$/.test(x) ? sugerido(p, i).ropa : x)(elegir(C.ropas, p.ropa, sugerido(p, i).ropa, { gambeson: "acolchado", armadura: "acolchado", manto: "capa", mandil: "delantal", traje_de_tres_piezas: "terno", frac: "smoking", tuxedo: "smoking", sobretodo: "abrigo", jersey: "sueter", sueter_de_lana: "sueter", uniforme_de_preso: "rayas_preso", enfermera: "uniforme_enfermera", ninera: "uniforme_ninera", piloto: "chaqueta_cuero" })[0]),
      colorRopa2: p.colorRopa2 && HEX.test(p.colorRopa2) ? p.colorRopa2 : ["#f4ecd8", "#8c3b4a", "#d9a441", "#2f5f6a", "#5d7a3a"][i % 5],
      rasgos: (Array.isArray(p.rasgos) ? p.rasgos : sugerido(p, i).rasgos).map((x) => elegir(C.rasgos, x, "")[0]).filter((x) => x && !(/barba|perilla|patillas/.test(x) && p.vestido)).slice(0, 4),
      // ficha ampliada (diseño de personajes): papel, edad, pelo aparte del sombrero, accesorios y estampado del vestido
      papel: p.papel ? String(p.papel).slice(0, 60) : undefined, edad: Number.isFinite(Number(p.edad)) ? clamp(Number(p.edad), 0, 100) : undefined,
      colorPelo: p.colorPelo && HEX.test(p.colorPelo) ? p.colorPelo : undefined,
      accesorios: (Array.isArray(p.accesorios) ? p.accesorios : []).map((x) => C.accesorios.includes(sinTilde(x)) ? sinTilde(x) : "").filter(Boolean).slice(0, 5),
      colorAccesorio: p.colorAccesorio && HEX.test(p.colorAccesorio) ? p.colorAccesorio : undefined,
      estampado: C.estampados.includes(sinTilde(p.estampado)) ? sinTilde(p.estampado) : undefined, _base: p };
  }).map((q) => {
    // vestuarios alternativos: cada uno se valida como un personaje completo (base + lo que cambia) y se guarda entero
    const p0 = q._base; delete q._base;
    if (Array.isArray(p0.vestuarios) && p0.vestuarios.length) {
      const ep = EPOCA;
      q.vestuarios = p0.vestuarios.slice(0, 4).flatMap((v, k) => {
        if (!v || typeof v !== "object") return [];
        const sub = { epoca: ep, personajes: [{ ...p0, ...v, id: q.id, nombre: q.nombre, vestuarios: undefined }], escenas: [] };
        validarPlan(sub); EPOCA = ep;
        const { id: _i, nombre: _n, papel: _p, edad: _e, ...campos } = sub.personajes[0];
        if (campos.sombrero === "ninguno") campos.sombrero = "pelo";
        return [{ ...campos, id: sinTilde(v.id || `alt${k + 1}`).replace(/[^a-z0-9_]/g, "") || `alt${k + 1}`, lugares: (Array.isArray(v.lugares) ? v.lugares : []).map(sinTilde).filter((l) => C.lugares.includes(l)), usar: v.usar ? String(v.usar).slice(0, 80) : undefined }];
      });
    }
    // "ninguno" dejaba la cabeza sin pelo (el pelo se dibuja como sombrero): sin sombrero = su pelo
    if (q.sombrero === "ninguno") { q.sombrero = "pelo"; if (!q.colorPelo) q.colorPelo = q.colorSombrero; }
    return q;
  });
  // ---- escenas ----
  // salas de época: hasta dónde pueden pararse los actores (medio ancho, z mínima frente a la pared del fondo)
  const SALA = { habitacion: [3.0, -2.9], oficina: [3.5, -3.1], tribunal: [5.2, -4.4], carcel: [1.7, -5.2], supermercado: [1.9, -4.2] };
  let t = 0;
  plan.escenas = (plan.escenas || []).map((e, i) => {
    const id = i + 1;
    const amb = e.ambiente || {};
    const [lugar, l2] = elegir(C.lugares, amb.lugar, "campo", SIN.lugares); if (l2) P(`escena ${id}: lugar "${amb.lugar}" → ${lugar}`);
    const [hora, h2] = elegir(C.horas, amb.hora, "dia", SIN.horas); if (h2) P(`escena ${id}: hora "${amb.hora}" → ${hora}`);
    const usados = [];
    let actores = (e.actores || []).filter((a) => {
      const aid = sinTilde(a.id).replace(/[^a-z0-9_]/g, "");
      if (!ids.has(aid)) { P(`escena ${id}: actor "${a.id}" no existe en personajes, se quita`); return false; }
      if (usados.includes(aid)) { P(`escena ${id}: actor ${aid} repetido`); return false; }
      usados.push(aid); a.id = aid; return true;
    }).slice(0, 8).map((a) => {
      const [accion, a2] = elegir(C.acciones, a.accion, "parado", SIN.acciones); if (a2) P(`escena ${id}: acción "${a.accion}" → ${accion}`);
      const [expresion, x2] = elegir(C.expresiones, a.expresion, "neutral", SIN.expresiones); if (x2) P(`escena ${id}: expresión "${a.expresion}" → ${expresion}`);
      let x = clamp(num(a.x, 0), -4.5, 4.5), z = clamp(num(a.z, 0), -3.5, 3);
      let hacia = Array.isArray(a.hacia) && a.hacia.length === 2 ? [clamp(num(a.hacia[0], x), -6, 6), clamp(num(a.hacia[1], z), -4, 3)] : null;
      if ((accion === "caminar" || accion === "correr") && !hacia) { hacia = [clamp(x + (x > 0 ? -3 : 3), -5, 5), z]; P(`escena ${id}: ${a.id} camina sin destino, se le pone uno`); }
      let luego = null;
      if (a.luego && typeof a.luego === "object") {
        const [la] = elegir(C.acciones, a.luego.accion, accion, SIN.acciones), [le] = elegir(C.expresiones, a.luego.expresion, expresion, SIN.expresiones);
        luego = { t: Math.max(0.2, num(a.luego.t, 1)), accion: la, expresion: le };
      }
      let mano = null;
      if (a.mano) { const [m] = elegir(C.en_mano, a.mano, "", { hogaza: "pan", baguette: "pan", sobre: "carta", mensaje: "carta", celular: "telefono", vela: "antorcha", ramo: "flor", torta: "pastel", bolsa: "saco", dinero: "moneda", cesta: "canasta" }); if (m) mano = m; else P(`escena ${id}: objeto en la mano "${a.mano}" no existe, se quita`); }
      // secuencia de acciones (pasos): caminar a otro punto, detenerse, pensar, señalar, tomar algo…
      const SAL = SALA[lugar], cx = (v) => SAL ? clamp(v, -SAL[0], SAL[0]) : clamp(v, -5.5, 5.5), cz = (v) => SAL ? clamp(v, SAL[1], 3) : clamp(v, -4, 3);
      const pasos = (Array.isArray(a.pasos) ? a.pasos : []).slice(0, 8).flatMap((p) => {
        if (!p || typeof p !== "object") return [];
        const [pa] = elegir(C.acciones, p.accion, "parado", SIN.acciones);
        const pe = p.expresion ? elegir(C.expresiones, p.expresion, expresion, SIN.expresiones)[0] : null;
        let ph = Array.isArray(p.hacia) && p.hacia.length === 2 ? [cx(num(p.hacia[0], x)), cz(num(p.hacia[1], z))] : null;
        if ((pa === "caminar" || pa === "correr") && !ph) ph = [cx(x + (x > 0 ? -2.5 : 2.5)), cz(z)];
        let pm;
        if (p.mano === null || p.mano === "" || p.mano === "nada") pm = null;
        else if (p.mano) { const [m] = elegir(C.en_mano, p.mano, "", { sobre: "carta", nota: "carta", dinero: "billetes", diario: "periodico" }); if (m) pm = m; }
        const t = p.t != null && p.t !== "" && Number.isFinite(Number(p.t)) ? Math.max(0.3, Number(p.t)) : null;
        return [{ t, cuando: typeof p.cuando === "string" ? p.cuando : null, accion: pa, expresion: pe, hacia: ph, ...(pm !== undefined ? { mano: pm } : {}) }];
      });
      if (SAL) { x = cx(x); z = cz(z); if (hacia) hacia = [cx(hacia[0]), cz(hacia[1])]; }
      return { id: a.id, x, z, accion, expresion, hacia, luego, escala: clamp(num(a.escala, 1), 0.5, 2.5), mano, ...(pasos.length ? { pasos } : {}),
        ...(a.alto != null ? { alto: clamp(num(a.alto, 3), 0.5, 6) } : {}), ...(a.subido != null ? { subido: clamp(num(a.subido, 0), 0, 5) } : {}), ...(a.vestuario ? { vestuario: String(a.vestuario) } : {}) };
    });
    // separación mínima de 1.1 m
    for (let j = 0; j < actores.length; j++) for (let k = 0; k < j; k++) {
      const A = actores[j], B = actores[k];
      if (Math.hypot(A.x - B.x, A.z - B.z) < 1.1) { A.x = clamp(B.x + (j % 2 ? -1.3 : 1.3), -4.5, 4.5); P(`escena ${id}: ${A.id} encimado con ${B.id}, se separa`); }
    }
    const duracion = Math.max(0.8, num(e.duracion, 3));
    const objetos = (e.objetos || []).slice(0, 10).flatMap((o) => {
      const [tipo, o2] = elegir(C.objetos, o.tipo, "", {});
      if (!tipo) { P(`escena ${id}: objeto "${o.tipo}" no existe, se quita`); return []; }
      if (o2) P(`escena ${id}: objeto "${o.tipo}" → ${tipo}`);
      let x = clamp(num(o.x, 3), -9, 9), z = clamp(num(o.z, -4), -14, 2);
      // nada encima de un actor
      const grande = ["casa", "torre", "muro"].includes(tipo) ? 6.5 * clamp(num(o.escala, 1), 0.3, 3) : ["pan_gigante", "horno", "bote", "carreta", "tienda"].includes(tipo) ? 2.6 : 1.4;
      // objetos con los que se actúa (la escalera que se trepa, el árbol detrás del que se espía, la cuna, el escritorio) se quedan donde están
      const usa = (a) => (["escalera"].includes(tipo) && ["trepar", "entrar"].includes(a.accion)) || (["arbol", "pino", "arbusto", "seto", "auto", "auto_policia", "kiosco", "farola"].includes(tipo) && a.accion === "espiar")
        || (tipo === "cuna" && a.accion === "arropar") || (["escritorio", "mesa", "silla", "banca", "sillon", "estrado", "archivador"].includes(tipo)) || (a.pasos ?? []).some((q) => ["trepar", "entrar", "espiar"].includes(q.accion));
      for (const a of actores) if (Math.hypot(a.x - x, a.z - z) < grande && !usa(a)) {
        // los edificios van al fondo y a un lado, para que no llenen todo el cuadro detrás del personaje
        if (grande > 3) { z = Math.min(z, a.z - grande); x = x >= a.x ? Math.max(x, a.x + 3) : Math.min(x, a.x - 3); }
        else { z = Math.min(z, a.z - 2.5); x += x >= a.x ? 1.2 : -1.2; }
      }
      // muro, torre y casa son fondo: bien detrás de los actores, así no tapan el cuadro entero en los planos cercanos
      const fondoMin = { muro: 11, torre: 9, casa: 8 }[tipo];
      if (fondoMin && actores.length) {
        const zf = Math.min(...actores.map((a) => a.z)) - fondoMin * Math.max(1, clamp(num(o.escala, 1), 0.3, 3) * 0.8);
        if (z > zf) { z = zf; P(`escena ${id}: ${tipo} muy cerca de los actores, se manda al fondo`); }
      }
      x = clamp(x, -12, 12); z = clamp(z, -26, 2);
      if (SALA[lugar]) { x = clamp(x, -SALA[lugar][0] - 0.6, SALA[lugar][0] + 0.6); z = clamp(z, SALA[lugar][1] - 0.8, 2); }
      const [estado] = elegir(C.estados, o.estado, "normal", { caer: "derrumbe", cae: "derrumbe", colapso: "derrumbe", destruir: "derrumbe", romper: "derrumbe", vibrar: "temblor", aparecer: "aparece", elevar: "sube", flotar: "sube" });
      const [material] = elegir(C.materiales, o.material, "normal", { dorado: "oro" });
      return [{ tipo, x, z, escala: clamp(num(o.escala, 1), 0.3, 3), giro: num(o.giro, 0), estado, t: clamp(num(o.t, 0.5), 0, Math.max(0, duracion - 0.3)), material }];
    });
    const cam = e.camara || {};
    const [tipo, c2] = elegir(C.camaras, cam.tipo, "acercamiento"); if (c2 && cam.tipo) P(`escena ${id}: cámara "${cam.tipo}" → ${tipo}`);
    const [plano] = elegir(C.planos, cam.plano, actores.length > 2 ? "general" : "medio");
    let objetivo = sinTilde(cam.objetivo || "grupo");
    if (objetivo !== "grupo" && !actores.some((a) => a.id === objetivo)) objetivo = actores[0]?.id ?? "grupo";
    if (tipo === "seguimiento" && !actores.some((a) => a.id === objetivo && (a.accion === "caminar" || a.accion === "correr"))) {
      const m = actores.find((a) => a.accion === "caminar" || a.accion === "correr"); if (m) objetivo = m.id;
    }
    const [transicion] = elegir(C.transiciones, e.transicion, i === 0 ? "corte" : "corte");
    const efectos = (e.efectos || []).slice(0, 6).flatMap((f) => {
      const [ft, f2] = elegir(C.efectos, f.tipo, "", {});
      if (!ft) { P(`escena ${id}: efecto "${f.tipo}" no existe`); return []; }
      void f2;
      const actor = f.actor && actores.some((a) => a.id === sinTilde(f.actor)) ? sinTilde(f.actor) : actores[0]?.id ?? null;
      return [{ tipo: ft, t: clamp(num(f.t, duracion / 2), 0, duracion - 0.1), actor, x: num(f.x, 0), z: num(f.z, 0) }];
    });
    if (!actores.length && !objetos.length && !(e.multitudes?.length) && !(e.luces?.length)) P(`escena ${id}: está vacía (sin actores ni objetos)`);
    // multitudes y luces masivas
    const multitudes = (Array.isArray(e.multitudes) ? e.multitudes : []).slice(0, 4).map((m) => {
      const [tipo] = elegir(C.tipos_multitud, m.tipo, "pueblo", { soldados: "ejercito", tropa: "ejercito", gente: "pueblo", vecinos: "pueblo", aldeanos: "pueblo", espectadores: "publico", peatones: "transeuntes", transeunte: "transeuntes", periodistas: "prensa", reporteros: "prensa", fotografos: "prensa" });
      const [formacion] = elegir(C.formaciones, m.formacion, tipo === "ejercito" ? "filas" : "grupo", { fila: "filas", ronda: "circulo" });
      const [accion] = elegir(C.acciones_multitud, m.accion, "parado", { "dar vueltas": "girar", vueltas: "girar", ronda: "girar", rodear: "girar", bailar: "girar", caminar: "marchar", avanzar: "marchar", correr: "correr", huir: "correr", festejar: "celebrar", luchar: "pelear" });
      const [mano] = m.mano ? elegir(C.en_mano, m.mano, "", { vela: "antorcha", lanza: "espada" }) : [""];
      let z = clamp(num(m.z, -12), -120, 6), x = clamp(num(m.x, 0), -120, 120);
      let ancho = clamp(num(m.ancho, 20), 2, 240); let fondo = clamp(num(m.fondo, 8), 1, 160);
      if (SALA[lugar]) {
        const [mx, zf] = SALA[lugar], a0 = ancho, z0m = z;
        ancho = Math.min(ancho, mx * 2); fondo = Math.min(fondo, 3); x = clamp(x, -mx + ancho / 2, mx - ancho / 2); z = clamp(z, zf + fondo / 2, 2.5 - fondo / 2);
        if (a0 !== ancho || z0m !== z) P(`escena ${id}: la multitud no cabía en la sala, se acomoda adentro`);
      }
      // que no pise a los actores con nombre: si los cubre, se va detrás de ellos
      const zmax = Math.min(...actores.map((a) => a.z), 0) - 2;
      if (actores.length && z + fondo / 2 > zmax && Math.abs(x) < ancho / 2 + 1 && formacion !== "circulo") { z = zmax - fondo / 2; P(`escena ${id}: la multitud tapaba a los actores, se manda detrás`); }
      // que un muro, una casa o una torre no la esconda: delante del edificio si cabe, si no, a un lado
      for (const o of objetos) {
        const med = { muro: [7, 1], casa: [3.2, 2.6], torre: [2.4, 2.4] }[o.tipo]; if (!med) continue;
        const k = o.escala ?? 1, w = med[0] * k, hd = med[1] * k;
        if (Math.abs(x - o.x) >= w + ancho / 2 || z - fondo / 2 > o.z + hd || z + fondo / 2 < o.z - hd - 30) continue;
        const z0 = o.z + hd + 1, hueco = (actores.length ? zmax : z0 + fondo) - z0;
        if (hueco >= 1.5) { fondo = Math.min(fondo, hueco); z = z0 + fondo / 2; }
        else x = o.x + Math.sign(x - o.x || 1) * (w + ancho / 2 + 1);
        P(`escena ${id}: la multitud quedaba escondida detrás de ${o.tipo}, se mueve`);
      }
      const u = m.uniforme && typeof m.uniforme === "object" ? { camisa: HEX.test(m.uniforme.camisa) ? m.uniforme.camisa : "#357650", pantalon: HEX.test(m.uniforme.pantalon) ? m.uniforme.pantalon : "#3d4440",
        sombrero: elegir(C.sombreros, m.uniforme.sombrero, "chaco")[0], colorSombrero: HEX.test(m.uniforme.colorSombrero) ? m.uniforme.colorSombrero : "#3a3d47" } : null;
      return { tipo, cantidad: clamp(Math.round(num(m.cantidad, 100)), 3, SALA[lugar] ? Math.max(3, Math.round(ancho * fondo * 1.4)) : 4000), x, z, ancho, fondo, formacion, accion,
        hacia: Array.isArray(m.hacia) && m.hacia.length === 2 ? [num(m.hacia[0], x), num(m.hacia[1], z)] : null, mano: mano || null, uniforme: u,
        t: m.t == null ? null : clamp(num(m.t, 0), 0, Math.max(0, duracion - 0.3)) };
    });
    const fondo = typeof e.fondo === "string" ? e.fondo.replace(/[\n\r"]/g, " ").replace(/\b(person|people|man|woman|stickman|character)s?\b/gi, "").slice(0, 300).trim() || null : null;
    // si dan vueltas, que sea en ronda de verdad (círculo) y del tamaño de la multitud
    for (const m of multitudes) if (m.accion === "girar") { m.formacion = "circulo"; m.fondo = m.ancho; m.hacia = null; }
    const luces = (Array.isArray(e.luces) ? e.luces : []).slice(0, 4).map((l) => {
      const [tipo] = elegir(C.tipos_luz, l.tipo, "antorchas", { fuego: "antorchas", fuegos: "antorchas", lamparas: "faroles", farolas: "faroles", luces: "antorchas" });
      const [movimiento] = elegir(C.mov_luz, l.movimiento, "quietas", { girar: "circulo", titilar: "parpadeo" });
      const crecer = Array.isArray(l.crecer) ? l.crecer.filter((c) => Array.isArray(c) && c.length === 2).map((c) => [clamp(num(c[0], 0), 0, duracion), clamp(Math.round(num(c[1], 0)), 0, 5000)]) : null;
      const cantidad = clamp(Math.round(Math.max(num(l.cantidad, 100), ...(crecer ?? []).map((c) => c[1]))), 1, 5000);
      return { tipo, cantidad, x: clamp(num(l.x, 0), -150, 150), z: clamp(num(l.z, -20), -200, 6), ancho: clamp(num(l.ancho, 20), 1, 300), fondo: clamp(num(l.fondo, 10), 1, 200),
        altura: clamp(num(l.altura, tipo === "ventanas" ? 2 : 1.8), 0, 40), movimiento, crecer: crecer && crecer.length ? crecer : null };
    });
    // luces que giran en círculo con una multitud en escena = la gente con antorchas: van con la multitud, no sueltas
    // (antes quedaban fuera de las murallas mientras la gente estaba dentro)
    // «caminaron en círculos / daban vueltas con antorchas»: lo hace la GENTE, dentro de las murallas (no luces sueltas)
    const ronda = /(caminar|caminaron|caminaban|marcharon|marchaban|daban|dieron|dando|giraban|giraron|corrian|bailaban)[a-z ]{0,20}(vueltas|circulos|ronda)|en circulos|en ronda|dar vueltas|daban vueltas/.test(sinTilde(e.narracion || "").replace(/_/g, " "));
    if (ronda) {
      const muro = objetos.find((o) => o.tipo === "muro");
      let mm = multitudes.filter((m) => m.tipo === "pueblo" || m.tipo === "publico").sort((x, y) => y.cantidad - x.cantidad)[0];
      if (!mm) { mm = { tipo: "pueblo", cantidad: 60, x: 0, z: -9, ancho: 8, fondo: 8, formacion: "circulo", accion: "girar", hacia: null, mano: null, uniforme: null, t: null }; multitudes.push(mm); }
      let n = clamp(Math.round(Math.max(mm.cantidad, ...luces.filter((l) => l.movimiento === "circulo").map((l) => Math.min(l.cantidad, 160)))), 20, 160), R = Math.max(3.5, Math.sqrt(n) * 0.5);
      // que la ronda quepa entre el muro y los actores (si no, más chica y con menos gente)
      if (muro && actores.length) { const hueco = Math.min(...actores.map((a) => a.z)) - 1.5 - (muro.z + 2.5); if (2 * R > hueco) { R = Math.max(2.5, hueco / 2); n = clamp(Math.round((R / 0.5) ** 2), 16, n); } }
      let z = -6 - R;
      if (muro) z = Math.max(z, muro.z + 2.5 + R);                                                         // dentro de las murallas
      if (actores.length) z = Math.min(z, Math.min(...actores.map((a) => a.z)) - 1.5 - R);
      Object.assign(mm, { cantidad: n, x: 0, z, ancho: 2 * R, fondo: 2 * R, formacion: "circulo", accion: "girar", hacia: null });
      if (luces.some((l) => l.tipo === "antorchas") || /antorcha|fuego|luz|luces/.test(sinTilde(e.narracion || "").replace(/_/g, " "))) mm.mano = "antorcha";
      for (let k = luces.length - 1; k >= 0; k--) if ((luces[k].movimiento === "circulo" || luces[k].tipo === "antorchas") && (luces[k].altura ?? 1.8) <= 3) luces.splice(k, 1);
      for (let k = multitudes.length - 1; k >= 0; k--) if (multitudes[k] !== mm && multitudes[k].tipo === "pueblo") multitudes.splice(k, 1);
      P(`escena ${id}: la gente da vueltas en ronda dentro de las murallas (${n}, ${mm.mano ? "con antorchas" : "sin antorchas"})`);
    }
    for (let k = luces.length - 1; k >= 0; k--) {
      const l = luces[k], mm = multitudes.find((m) => m.accion === "girar") ?? (l.movimiento === "circulo" ? multitudes[0] : null);
      if (!mm || (l.movimiento !== "circulo" && l.tipo !== "antorchas")) continue;
      if (mm.mano !== "antorcha") { mm.mano = "antorcha"; if (l.movimiento === "circulo") { mm.accion = "girar"; mm.formacion = "circulo"; mm.fondo = mm.ancho; } }
      luces.splice(k, 1); P(`escena ${id}: las luces en círculo pasan a ser antorchas de la multitud (van juntas)`);
    }
    // dos que caminan a la vez no se cruzan: se comparan sus recorridos en el tiempo y el segundo se desvía
    const posEn = (a, k) => a.hacia ? [a.x + (a.hacia[0] - a.x) * k, a.z + (a.hacia[1] - a.z) * k] : [a.x, a.z];
    for (let j = 0; j < actores.length; j++) for (let q = 0; q < j; q++) {
      const A = actores[j], B = actores[q]; if (!A.hacia && !B.hacia) continue;
      for (let s = 0; s <= 20; s++) {
        const [ax, az] = posEn(A, s / 20), [bx, bz] = posEn(B, s / 20);
        if (Math.hypot(ax - bx, az - bz) < 0.85) {
          const mv = A.hacia ? A : B, otro = mv === A ? B : A;
          mv.hacia = [mv.hacia[0], clamp(otro.z + (mv.z >= otro.z ? 1.3 : -1.3), -4, 3)];
          P(`escena ${id}: ${A.id} y ${B.id} se cruzaban al caminar, ${mv.id} se desvía`); break;
        }
      }
    }
    // antorchas que se mueven (en círculo o marchando) las lleva GENTE: se pone la multitud que las carga debajo
    for (const l of luces) {
      if (l.tipo !== "antorchas" || (l.movimiento !== "circulo" && l.movimiento !== "marchar") || (l.altura ?? 1.8) > 3) continue;
      if (multitudes.some((m) => m.mano === "antorcha" && Math.hypot(m.x - l.x, m.z - l.z) < Math.max(l.ancho, l.fondo) / 2)) continue;
      const n = clamp(Math.round(Math.min(l.cantidad, 300)), 20, 300), R = Math.max(3, Math.sqrt(n) * 0.45);
      multitudes.push({ tipo: "pueblo", cantidad: n, x: l.x, z: l.z, ancho: 2 * R, fondo: 2 * R, formacion: "circulo", accion: l.movimiento === "circulo" ? "girar" : "marchar", hacia: null, mano: "antorcha", uniforme: null, t: null });
      l.ancho = Math.max(2 * R + 2, Math.min(l.ancho, 4 * R)); l.fondo = Math.max(2 * R + 2, Math.min(l.fondo, 4 * R)); l.altura = 1.75;
      P(`escena ${id}: las antorchas que se mueven ahora las llevan ${n} aldeanos`);
    }
    // actores que caminan no atraviesan a otros: el destino se corre para rodearlos
    for (const a of actores) {
      if (!a.hacia) continue;
      for (const b of actores) {
        if (b === a) continue;
        const [x0, z0] = [a.x, a.z], [x1, z1] = a.hacia, vx = x1 - x0, vz = z1 - z0, L2 = vx * vx + vz * vz || 1;
        const s2 = Math.max(0, Math.min(1, ((b.x - x0) * vx + (b.z - z0) * vz) / L2)), dx = x0 + vx * s2 - b.x, dz = z0 + vz * s2 - b.z;
        if (s2 > 0.05 && s2 < 0.98 && Math.hypot(dx, dz) < 0.9) { a.hacia = [x1, clamp(b.z + (dz >= 0 ? 1.1 : -1.1), -4, 3)]; P(`escena ${id}: ${a.id} atravesaba a ${b.id} al caminar, se desvía`); }
        if (Math.hypot(a.hacia[0] - b.x, a.hacia[1] - b.z) < 1.0) { a.hacia = [a.hacia[0] + (a.hacia[0] >= b.x ? 1.1 : -1.1), a.hacia[1]]; P(`escena ${id}: ${a.id} terminaba encima de ${b.id}, se corre`); }
      }
    }
    // una multitud que marcha no pasa por encima de los actores: se detiene antes
    for (const m of multitudes) if (m.hacia && actores.length) {
      const zFrente = Math.min(...actores.map((a) => a.z)) - 1.5 - m.fondo / 2;
      if (m.hacia[1] > zFrente && Math.abs(m.hacia[0] - m.x) < m.ancho) { m.hacia = [m.hacia[0], Math.min(m.hacia[1], zFrente)]; P(`escena ${id}: la multitud iba a pasar por encima de los actores, se detiene antes`); }
    }
    const enEsc = new Set(actores.map((a) => a.id));
    const okObj = (o) => o === "grupo" || enEsc.has(o) || (/^objeto:\d+$/.test(o) && Number(o.split(":")[1]) < objetos.length)
      || (/^multitud:\d+$/.test(o) && Number(o.split(":")[1]) < multitudes.length) || (/^luces:\d+$/.test(o) && Number(o.split(":")[1]) < luces.length);
    const tomas = [];
    for (const tm of [...(Array.isArray(e.tomas) ? e.tomas : [])].sort((a, b) => num(a?.t, 0) - num(b?.t, 0))) {
      const tt = num(tm?.t, NaN);
      if (!Number.isFinite(tt) || tt < 0 || tt > duracion - 0.4) continue;
      if (tomas.length && tt - tomas[tomas.length - 1].t < 0.9) continue;
      let obj = sinTilde(tm.objetivo || "grupo").replace(/^(objeto|multitud|luces)_?(\d+)$/, "$1:$2");
      if (!okObj(obj)) { P(`escena ${id}: toma con objetivo "${tm.objetivo}" desconocido → grupo`); obj = "grupo"; }
      const [plano] = elegir(C.planos_toma, tm.plano, "medio", { primerisimo: "detalle", cara: "rostro", plano_general: "general", primer: "primer_plano" });
      const [angulo] = elegir(C.angulos, tm.angulo, "frente", { contrapicado: "bajo", picado: "alto", aereo: "cenital", perfil: "lado", sobre_el_hombro: "hombro" });
      const [mov] = elegir(C.movs, tm.mov, "empuje", { acercamiento: "empuje", zoom: "empuje" });
      const desde = tm.desde && enEsc.has(sinTilde(tm.desde)) ? sinTilde(tm.desde) : null;
      tomas.push({ t: tomas.length ? +tt.toFixed(2) : 0, objetivo: obj, plano, angulo: angulo === "hombro" && !desde ? "frente" : angulo, mov, desde,
        pos: Array.isArray(tm.pos) && tm.pos.length === 3 && tm.pos.every(Number.isFinite) ? tm.pos : null, mira: Array.isArray(tm.mira) && tm.mira.length === 3 && tm.mira.every(Number.isFinite) ? tm.mira : null });
    }
    const inicio = num(e.inicio, t);
    t = inicio + duracion;
    return { id, narracion: String(e.narracion || ""), inicio, duracion, ambiente: { lugar, hora, semilla: num(amb.semilla, id), clima: C.climas.includes(sinTilde(amb.clima ?? "")) ? sinTilde(amb.clima) : undefined, escenario: amb.escenario ? sinTilde(String(amb.escenario)).replace(/[^a-z0-9_]/g, "") : undefined, oscuro: amb.oscuro ? true : undefined, bebeEnCuna: amb.bebeEnCuna ? true : undefined }, actores, objetos,
      camara: { tipo, plano, objetivo }, tomas, multitudes, luces, fondo, fondoImg: e.fondoImg ?? null, transicion: i === 0 ? "corte" : transicion, efectos, rotulo: e.rotulo ? String(e.rotulo).slice(0, 26) : null,
      titulo: e.titulo ? String(e.titulo).slice(0, 80) : null, subtitulo: e.subtitulo ? String(e.subtitulo).slice(0, 60) : null, habla: e.habla ?? null, capitulo: e.capitulo ?? null,
      ...(e.establecer ? { establecer: true } : {}), ...(Array.isArray(e.tomasFijas) && e.tomasFijas.length ? { tomasFijas: e.tomasFijas } : {}) };
  });
  // destellos: máximo 2
  let dest = 0;
  for (const e of plan.escenas) if (e.transicion === "destello" && ++dest > 2) { e.transicion = "fundido"; P(`escena ${e.id}: demasiados destellos, se cambia a fundido`); }
  // misma cámara dos veces seguidas
  for (let i = 1; i < plan.escenas.length; i++) if (plan.escenas[i].camara.tipo === plan.escenas[i - 1].camara.tipo && plan.escenas[i].camara.tipo !== "seguimiento")
    P(`escena ${i + 1}: repite la cámara "${plan.escenas[i].camara.tipo}" de la anterior`);
  if (durTotal && Math.abs(t - durTotal) > 0.5) P(`la suma de escenas (${t.toFixed(1)} s) no coincide con la voz (${durTotal.toFixed(1)} s)`);
  if (!plan.escenas.length) P("el plan no tiene escenas");
  return { plan, problemas };
};

/** aplica correcciones del validador {escena, campo, valor} */
export const aplicarCorrecciones = (plan, correcciones = []) => {
  let n = 0;
  for (const c of correcciones || []) {
    const e = plan.escenas.find((x) => x.id === Number(c.escena));
    if (!e || typeof c.campo !== "string") continue;
    const ruta = c.campo.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
    let o = e;
    for (let i = 0; i < ruta.length - 1; i++) { if (o == null) break; o = o[ruta[i]]; }
    if (o != null && typeof o === "object") { o[ruta[ruta.length - 1]] = c.valor; n++; }
  }
  return n;
};
