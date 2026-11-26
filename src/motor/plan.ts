// Contrato entre los agentes (DeepSeek) y el motor de video. Los agentes escriben un Plan en JSON;
// el validador (agentes/validador.mjs) lo corrige contra estas mismas listas antes de renderizar.
import type { Expr, Gesture, Build, Held } from "./toon";

export const FPS = 30;
export const ANCHO = 1080;
export const ALTO = 1920;
/** tamaño del cuadro según el formato del plan (shorts verticales o episodios horizontales) */
export const tamano = (p?: { formato?: string } | null): [number, number] => (p?.formato === "horizontal" ? [1920, 1080] : [ANCHO, ALTO]);
/** lugares cerrados (habitaciones con paredes y techo, sin fondo fotográfico) */
export const INTERIORES = ["interior", "habitacion", "oficina", "tribunal", "carcel", "cabina", "supermercado"] as const;
export const esInterior = (l: string) => (INTERIORES as readonly string[]).includes(l);

export const LUGARES = ["campo", "pueblo", "bosque", "castillo", "ciudad", "playa", "desierto", "montana", "interior", "granja",
  "mansion", "calle", "cementerio", "gasolinera", "puerto", "habitacion", "oficina", "tribunal", "carcel", "aerodromo", "cielo", "cabina", "supermercado"] as const;
export const HORAS = ["dia", "atardecer", "noche", "amanecer"] as const;
/** clima de la escena (el cine negro ya no es siempre lluvia: solo cuando el guion la pide) */
export const CLIMAS = ["despejado", "nublado", "lluvia", "niebla", "nieve"] as const;
export type Clima = typeof CLIMAS[number];
export const ACCIONES = ["parado", "caminar", "correr", "hablar", "saludar", "senalar", "celebrar", "sorpresa", "sentado",
  "caer", "cargar", "encogerse", "manos_cadera", "pensar", "martillar", "empujar", "comer", "lanzar",
  // actuación (series policiales): anotar en la libreta, sacar fotos con flash, entrevistar con micrófono, retorcerse las manos,
  // espiar asomado, trepar una escalera (de espaldas), entrar por una ventana (desaparece), pilotar, explicar, taparse la cara, leer
  "escribir", "fotografiar", "entrevistar", "preocuparse", "espiar", "trepar", "entrar", "pilotar", "explicar", "cubrirse", "leer", "arropar",
  // gesticulación humana: cabeza, manos y cuerpo; y movimientos que no son solo caminar
  "asentir", "negar", "cruzar_brazos", "dudar", "suplicar", "abrazar", "consolar", "esperar", "temblar", "desesperarse", "llamar", "mirar_reloj", "entregar", "tocar_puerta", "detener", "amenazar", "enumerar", "suspirar", "reir", "acercarse", "retroceder", "ir_y_venir"] as const;
export const EXPRESIONES = ["neutral", "serio", "sonrisa", "feliz", "risa", "nervioso", "sorpresa", "alivio", "mareado",
  "dolor", "silbar", "enojado", "triste", "asustado", "pensativo", "picaro", "cansado", "preocupado", "sospechoso", "llorando",
  "gritando", "aterrado", "decidido", "dormido", "confundido", "asco", "timido"] as const;
export const PEINADOS = ["liso", "rizado", "punta", "mono", "coleta", "largo", "calvo", "engominado", "raya_lado", "ondulado", "ondulado_largo", "melena", "flequillo", "trenzas", "cola_alta", "moño_bajo", "rapado", "entradas", "afro", "pelusa"] as const;
export const ROPAS = ["liso", "acolchado", "rayas", "cuadros", "parches", "chaleco", "delantal", "capa", "tunica", "traje", "gabardina", "uniforme", "bata", "terno", "smoking", "abrigo", "abrigo_piel", "toga", "uniforme_militar", "chaqueta_cuero", "sueter", "overol", "pijama", "mameluco", "rayas_preso", "camisa", "uniforme_enfermera", "uniforme_ninera"] as const;
export const RASGOS = ["gafas", "barba", "barba_corta", "perilla", "patillas", "pecas", "mejillas", "cejas", "arrugas", "ojeras", "cicatriz", "lunar"] as const;
export const ACCESORIOS = ["corbata", "pajarita", "tirantes", "bufanda", "collar_perlas", "aretes", "guantes", "reloj_bolsillo", "placa", "credencial_prensa", "flor_solapa", "cuello_blanco", "brazalete", "monoculo", "cigarrillo", "pipa", "bigote_fino", "bigote_grueso", "bigote_manubrio"] as const;
export const ESTAMPADOS = ["liso", "floreado", "lunares", "cuadros", "rayas"] as const;
export const COMPLEXIONES = ["adulto", "robusto", "nino", "bebe", "anciano", "delgado", "alto", "adolescente", "bajo"] as const;
export const CAMARAS = ["acercamiento", "alejamiento", "paneo_izq", "paneo_der", "orbita", "grua_sube", "grua_baja",
  "seguimiento", "plano_general", "contrapicado"] as const;
export const PLANOS = ["primer_plano", "medio", "general", "panoramico"] as const;
/** tomas dentro de una escena: encuadres que cambian cada 1–2 s, pegados a las palabras */
export const PLANOS_TOMA = ["detalle", "rostro", "primer_plano", "medio", "general", "panoramico"] as const;
export const ANGULOS = ["frente", "bajo", "alto", "cenital", "lado", "hombro"] as const;
export const MOVS = ["empuje", "alejar", "paneo", "subir", "bajar", "orbita"] as const;
export const TRANSICIONES = ["corte", "fundido", "destello", "barrido"] as const;
export const EFECTOS = ["destello", "estrellas", "polvo", "notas", "chispas", "signo", "anillo"] as const;
export const OBJETOS = ["arbol", "pino", "arbusto", "casa", "torre", "muro", "roca", "carreta", "cajas", "barril", "valla",
  "farol", "fogata", "mesa", "palmera", "cactus", "pozo", "tienda", "estatua", "horno", "pan_gigante", "silla", "cama", "bote",
  "auto", "auto_policia", "avion", "escalera", "cuna", "lapida", "surtidor", "escritorio", "archivador", "pizarra", "estrado", "banca", "rejas", "mansion", "edificio", "barco", "farola", "lampara",
  "hidrante", "cubo", "buzon", "seto", "kiosco", "estante", "sillon"] as const;
export const EN_MANO = ["pan", "martillo", "paraguas", "libro", "espada", "taza", "carta", "saco", "flor", "antorcha", "escoba",
  "pala", "moneda", "llave", "canasta", "telefono", "bandera", "pastel",
  "periodico", "maletin", "lupa", "linterna", "billetes", "bebe", "libreta", "camara_foto", "microfono", "revolver", "esposas", "placa", "carpeta",
  "maleta", "bolsa_compras", "biberon", "osito", "sombrero", "baston", "vaso", "botella", "telefono_antiguo", "mazo", "fotografia", "mapa",
  "reloj_bolsillo", "cigarrillo", "pipa", "nota", "ramo", "rifle", "cuchillo", "jeringa", "radio", "dinero_fajo", "pasaporte", "lampara_aceite", "vela"] as const;
export const ESTADOS = ["normal", "derrumbe", "temblor", "aparece", "sube", "despega", "vuela", "aterriza", "tirada"] as const;
export const MATERIALES = ["normal", "pan", "oro", "hielo", "madera", "piedra", "chocolate", "queso"] as const;
export const SOMBREROS = ["ninguno", "pelo", "gorra", "sombrero_copa", "bonete", "chaco", "chaco_alto", "casco", "casco_pluma", "corona", "capucha", "cinta", "paja", "boina", "panuelo", "fedora", "gorra_policia", "cloche", "bombin", "gorra_plana", "pamela", "sombrero_vaquero", "gorro_marinero", "gorro_chef", "gorro_lana", "cofia", "lazo", "diadema", "velo", "gorro_bebe", "casco_aviador"] as const;

export type Lugar = typeof LUGARES[number];
export type Hora = typeof HORAS[number];
export type Accion = typeof ACCIONES[number];
export type Expresion = typeof EXPRESIONES[number];
export type TipoCamara = typeof CAMARAS[number];
export type Plano = typeof PLANOS[number];
export type Transicion = typeof TRANSICIONES[number];
export type PlanoToma = typeof PLANOS_TOMA[number];
export type Angulo = typeof ANGULOS[number];
export type Mov = typeof MOVS[number];
/** objetivo: id de actor, "grupo" u "objeto:N" (índice en objetos); hombro usa "desde" (otro actor) */
/** pos/mira: cámara fija del decorado (como en un estudio de televisión): posición y punto al que mira, en metros */
export type Toma = { t: number; objetivo: string; plano: PlanoToma; angulo: Angulo; mov?: Mov; desde?: string | null; pos?: [number, number, number] | null; mira?: [number, number, number] | null };
export type TipoEfecto = typeof EFECTOS[number];
export type TipoObjeto = typeof OBJETOS[number];
export type Sombrero = typeof SOMBREROS[number];
export type EstadoObjeto = typeof ESTADOS[number];
export type Material = typeof MATERIALES[number];

export type Personaje = {
  id: string; nombre: string; complexion: typeof COMPLEXIONES[number];
  /** papel en la historia (detective, niñera...), edad y color de pelo (aparte del sombrero) */
  papel?: string; edad?: number; colorPelo?: string;
  accesorios?: string[]; colorAccesorio?: string; estampado?: string;
  /** vestuarios alternativos: se usan en los lugares indicados (o si la escena lo pide con actor.vestuario) */
  vestuarios?: Vestuario[];
  piel: string; camisa: string; pantalon: string; zapatos: string;
  sombrero: Sombrero; colorSombrero?: string; vestido?: string | null; bigote?: string | null; cinturon?: string | null;
  peinado?: string; ropa?: string; colorRopa2?: string; rasgos?: string[];
};
/** un paso de la secuencia de un actor; mano undefined = conserva lo que llevaba, null = manos vacías */
export type Paso = { t: number; accion: Accion; expresion?: Expresion | null; hacia?: [number, number] | null; mano?: Held | null; cuando?: string | null };
/** otro vestuario del mismo personaje (aviador, de gala, de preso…): los campos que cambian + dónde se usa */
export type Vestuario = Partial<Omit<Personaje, "vestuarios" | "id">> & { id: string; lugares?: string[]; usar?: string };
/** el aspecto de un personaje en una escena: el vestuario pedido, o el que corresponde al lugar, o el principal */
export const vestirPara = (p: Personaje, lugar?: string, pedido?: string | null): Personaje => {
  const v = (p.vestuarios ?? []).find((x) => (pedido ? x.id === pedido : !!lugar && (x.lugares ?? []).includes(lugar)));
  if (!v) return p;
  const { id: _i, lugares: _l, usar: _u, ...campos } = v;
  return { ...p, ...campos, id: p.id, vestuarios: p.vestuarios };
};
export type ActorEnEscena = {
  id: string; x: number; z: number; accion: Accion; expresion: Expresion;
  /** vestuario alternativo del personaje (id); sin esto se elige por el lugar de la escena */
  vestuario?: string | null;
  /** destino para caminar / correr (metros) */
  hacia?: [number, number] | null;
  /** cambio de acción a mitad de escena (segundos desde el inicio de la escena) */
  luego?: { t: number; accion: Accion; expresion: Expresion } | null;
  /** secuencia de acciones (cada una desde su segundo t): caminar a otro punto, detenerse, pensar, señalar, tomar algo… */
  pasos?: Paso[] | null;
  escala?: number;
  /** objeto que lleva en la mano */
  mano?: Held | null;
  /** trepar: metros que sube (por defecto 3, la ventana del segundo piso) y metros ya subidos al empezar la escena */
  alto?: number | null; subido?: number | null;
};
/** estado: derrumbe = se cae y levanta polvo en t; temblor = vibra desde t; aparece = crece desde 0 en t; sube = se eleva */
export type Objeto = { tipo: TipoObjeto; x: number; z: number; escala?: number; giro?: number; estado?: EstadoObjeto; t?: number; material?: Material };
export type Efecto = { tipo: TipoEfecto; t: number; actor?: string | null; x?: number; z?: number };
export type Escena = {
  id: number; narracion: string;
  /** segundos; el paso de tiempos los fija con la voz */
  inicio: number; duracion: number;
  /** escenario: id del decorado fijo de preproducción (mismo id = mismos árboles, casas y utilería en todo el video) */
  /** oscuro: interior con la luz apagada (solo la luna por la ventana) */
  /** bebeEnCuna: el bebé dormido dentro de la cuna (antes del secuestro) */
  ambiente: { lugar: Lugar; hora: Hora; semilla?: number; clima?: Clima; escenario?: string; oscuro?: boolean; bebeEnCuna?: boolean };
  /** descripción del paisaje de fondo (inglés, sin personas) y la imagen ya generada (ruta pública) */
  fondo?: string | null; fondoImg?: string | null;
  actores: ActorEnEscena[];
  objetos: Objeto[];
  camara: { tipo: TipoCamara; plano: Plano; objetivo: string };
  multitudes?: Multitud[] | null;
  luces?: Luces[] | null;
  /** lista de tomas (si falta o es escasa, el director automático la completa) */
  tomas?: Toma[] | null;
  transicion: Transicion;
  efectos: Efecto[];
  /** cifra o palabra discreta arriba del cuadro (opcional, sin tapar a nadie) */
  rotulo?: string | null;
  /** cartel a pantalla completa sobre negro (título del episodio o de un capítulo) */
  titulo?: string | null; subtitulo?: string | null;
  /** quién dice la frase (id de personaje) o null si es el narrador */
  habla?: string | null;
  /** capítulo al que pertenece (modo episodio) */
  capitulo?: number;
};
/** multitud: cientos o miles de monitos dibujados por instancias (ejércitos, pueblo entero, público) */
/** transeuntes: gente de la época paseando por la calle; prensa: reporteros con cámaras, libretas y micrófonos */
export const TIPOS_MULTITUD = ["ejercito", "pueblo", "publico", "guardias", "transeuntes", "prensa"] as const;
export const FORMACIONES = ["filas", "grupo", "circulo"] as const;
export const ACCIONES_MULTITUD = ["parado", "marchar", "celebrar", "correr", "pelear", "girar"] as const;
export type Multitud = {
  tipo: typeof TIPOS_MULTITUD[number]; cantidad: number; x: number; z: number; ancho: number; fondo: number;
  formacion: typeof FORMACIONES[number]; accion: typeof ACCIONES_MULTITUD[number];
  /** dirección de la marcha/carrera (punto hacia donde van) */
  hacia?: [number, number] | null;
  mano?: Held | null;
  uniforme?: { camisa: string; pantalon: string; sombrero: Sombrero; colorSombrero?: string } | null;
  /** segundo de la escena en que aparece (aparece de golpe con un pequeño rebote) */
  t?: number;
};
/** luces masivas: antorchas, ventanas, faroles o velas; pueden crecer en número con el tiempo */
export const TIPOS_LUZ = ["antorchas", "ventanas", "faroles", "velas"] as const;
export const MOV_LUZ = ["quietas", "circulo", "parpadeo", "marchar"] as const;
export type Luces = {
  tipo: typeof TIPOS_LUZ[number]; cantidad: number; x: number; z: number; ancho: number; fondo: number;
  altura?: number; movimiento?: typeof MOV_LUZ[number];
  /** cuántas se ven en cada momento: [[t, n], ...] (p. ej. [[0,400],[2,800],[4,1000]]) */
  crecer?: [number, number][] | null;
};
export type Palabra = { w: string; a: number; b: number };
export type Plan = {
  titulo: string;
  /** "vertical" (shorts, por defecto) u "horizontal" (episodios largos) */
  formato?: "vertical" | "horizontal";
  /** "short" (cortes cada 1–2 s) o "episodio" (tomas largas de documental) */
  modo?: "short" | "episodio";
  /** "noir": cine negro (calles mojadas, faroles, niebla, poco color, grano de película) */
  estilo?: "noir" | null;
  personajes: Personaje[];
  escenas: Escena[];
  audio?: { voz?: string | null; musica?: string | null; mezcla?: string | null; palabras?: Palabra[] } | null;
};

// ---------------- traducción a la API de dibujo ----------------
export const EXPR: Record<Expresion, Expr> = {
  neutral: "neutral", serio: "stern", sonrisa: "smile", feliz: "grin", risa: "laugh", nervioso: "nervous", sorpresa: "shock",
  alivio: "relief", mareado: "dazed", dolor: "pained", silbar: "whistle", enojado: "angry", triste: "sad", asustado: "scared", pensativo: "think", picaro: "smug",
  cansado: "tired", preocupado: "worried", sospechoso: "suspicious", llorando: "crying", gritando: "shout", aterrado: "terrified", decidido: "determined",
  dormido: "asleep", confundido: "confused", asco: "disgust", timido: "shy",
};
export const GESTO: Partial<Record<Accion, Gesture>> = {
  hablar: "talk", saludar: "wave", senalar: "point", celebrar: "up", sorpresa: "head", cargar: "carry", encogerse: "shrug",
  manos_cadera: "hips", pensar: "chin", empujar: "push", comer: "eat", lanzar: "throw",
  escribir: "write", fotografiar: "photo", entrevistar: "mic", preocuparse: "worry", espiar: "peek", trepar: "climb", entrar: "climb",
  pilotar: "steer", explicar: "explain", cubrirse: "cover", leer: "read", arropar: "tuck",
  cruzar_brazos: "cross", dudar: "scratch", suplicar: "plead", abrazar: "hug", consolar: "console", esperar: "pockets", temblar: "tremble",
  desesperarse: "head", llamar: "phone", mirar_reloj: "watch", entregar: "offer", tocar_puerta: "knock", detener: "stop", amenazar: "fist",
  enumerar: "count", reir: "hips", retroceder: "stop", acercarse: null as unknown as Gesture,
};
export const COMPLEXION: Record<Personaje["complexion"], Build> = { adulto: "adult", robusto: "stout", nino: "kid", bebe: "baby", anciano: "elder", delgado: "thin", alto: "tall", adolescente: "teen", bajo: "short" };
export const HAT: Record<Sombrero, string | null> = {
  ninguno: null, pelo: "hair", gorra: "cap", sombrero_copa: "tophat", bonete: "bonnet", chaco: "shako", chaco_alto: "shako_tall",
  casco: "casco", casco_pluma: "casco_pluma", corona: "corona", capucha: "capucha", cinta: "cinta", paja: "paja", boina: "boina", panuelo: "panuelo",
  fedora: "fedora", gorra_policia: "gorra_policia", cloche: "cloche", bombin: "bombin", gorra_plana: "gorra_plana", pamela: "pamela",
  sombrero_vaquero: "sombrero_vaquero", gorro_marinero: "gorro_marinero", gorro_chef: "gorro_chef", gorro_lana: "gorro_lana", cofia: "cofia", lazo: "lazo",
  diadema: "diadema", velo: "velo", gorro_bebe: "gorro_bebe", casco_aviador: "casco_aviador",
};

export const duracionTotal = (p: Plan) => Math.max(1, ...p.escenas.map((e) => e.inicio + e.duracion));
export const cuadrosTotales = (p: Plan) => Math.ceil(duracionTotal(p) * FPS);

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
/** semilla fija a partir de un texto (id del escenario) */
export const semillaTexto = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 100000; };
export const hash = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

/** cuadros de fundido por tipo de transición (estilo medido: casi sin cortes duros) */
export const FUNDIDO: Record<Transicion, number> = { corte: 0, fundido: 8, destello: 0, barrido: 6 };

export const escenaEn = (p: Plan, f: number) => {
  const t = f / FPS;
  let k = 0;
  for (let i = 0; i < p.escenas.length; i++) if (t >= p.escenas[i].inicio) k = i;
  return k;
};
/** capas a dibujar en el cuadro f: la escena base y, durante un fundido, la siguiente encima */
export const capasEn = (p: Plan, f: number): { i: number; alpha: number }[] => {
  for (let i = 1; i < p.escenas.length; i++) {
    const x = FUNDIDO[p.escenas[i].transicion];
    const a = Math.round(p.escenas[i].inicio * FPS);
    if (x && f >= a - x / 2 && f < a + x / 2) return [{ i: i - 1, alpha: 1 }, { i, alpha: (f - (a - x / 2) + 1) / (x + 1) }];
  }
  return [{ i: escenaEn(p, f), alpha: 1 }];
};
/** destello blanco de 4 cuadros al entrar en una escena con transición "destello" */
export const destelloEn = (p: Plan, f: number) => {
  for (const e of p.escenas) {
    if (e.transicion !== "destello") continue;
    const a = Math.round(e.inicio * FPS);
    if (f >= a && f < a + 4) return [1, 0.75, 0.45, 0.2][f - a];
  }
  return 0;
};
