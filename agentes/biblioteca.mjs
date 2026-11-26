// Biblioteca de vestuario y actuación: qué sabe dibujar el motor, qué es cada pieza y cuándo usarla.
// La leen el analista del guion, el diseñador de personajes y el revisor. Sirve para cualquier historia y época,
// no solo para un episodio: cada entrada dice para qué tipo de personaje queda bien.
import { C } from "./catalogo.mjs";
import { rutaBibliaVisual } from "./estudio.mjs";

export const DESC = {
  complexiones: {
    adulto: "adulto de contextura media (la mayoría de los adultos)", robusto: "adulto corpulento, ancho de torso (policía veterano, carnicero, jefe)",
    delgado: "adulto flaco y espigado (empleado nervioso, sospechoso escurridizo, científico)", alto: "adulto más alto que el resto (protagonista imponente, detective)",
    bajo: "adulto bajo y ancho (cantinero, ayudante, comerciante)", anciano: "persona mayor de 65+ (abuelo, juez veterano, testigo anciano); combínalo con arrugas y pelo canoso",
    adolescente: "13 a 17 años (repartidor de periódicos, aprendiz, hijo mayor)", nino: "niño de 4 a 12 años", bebe: "bebé o niño de 0 a 3 años: muy pequeño, cabeza grande, mameluco",
  },
  peinados: {
    liso: "pelo corto común con flequillo suelto", raya_lado: "corto peinado con raya al costado (hombre formal de los años 20–50)",
    engominado: "peinado hacia atrás con gomina y brillo (galán, gánster, abogado, años 20–40)", entradas: "corto con entradas en la frente (hombre de 40+)",
    rapado: "rapado muy corto (soldado, preso, deportista)", calvo: "calvo con mechones a los costados (hombre mayor)", punta: "pelo parado en puntas (joven travieso)",
    rizado: "rulos cortos", afro: "pelo afro voluminoso", flequillo: "flequillo recto sobre la frente (niña, joven moderna)",
    ondulado: "ondas al agua cortas pegadas a la cabeza (mujer de los años 20–30)", ondulado_largo: "ondas largas hasta los hombros (actriz, dama elegante de los 30–40)",
    melena: "melena corta hasta la mandíbula, estilo bob (mujer joven de los 20–30, secretaria, periodista)", largo: "pelo largo suelto hasta los hombros",
    mono: "rodete alto (señora, maestra, institutriz)", moño_bajo: "moño bajo en la nuca (niñera, enfermera, empleada doméstica, mujer recatada)",
    coleta: "cola de caballo baja", cola_alta: "cola de caballo alta con lazo (chica joven)", trenzas: "dos trenzas con lazos (niña, campesina)",
    pelusa: "unos pocos rulitos de bebé",
  },
  sombreros: {
    pelo: "sin sombrero: se ve el peinado", fedora: "sombrero de fieltro con ala (detective, periodista, gánster, hombre de los 20–50)",
    bombin: "bombín de copa redonda (banquero, abogado, caballero inglés, hombre de 1890–1930)", gorra_plana: "gorra plana de repartidor (canillita, obrero, chofer, joven pobre de 1900–1940)",
    gorra_policia: "gorra de plato de policía", gorra: "gorra de visera moderna (mecánico, deportista)", sombrero_copa: "galera de copa alta (aristócrata del siglo XIX, mago)",
    cloche: "sombrero campana pegado a la cabeza (mujer de los 20–30)", pamela: "sombrero de ala ancha con cinta y flor (dama elegante, mujer rica)",
    velo: "sombrerito con velo negro (viuda, funeral, luto)", cofia: "cofia blanca (enfermera, niñera, criada, mesera)", lazo: "lazo en el pelo (niña, joven)",
    diadema: "vincha fina en el pelo", boina: "boina (pintor, francés, obrero)", paja: "sombrero de paja (campesino, verano)", sombrero_vaquero: "sombrero vaquero",
    gorro_marinero: "gorro blanco de marinero", gorro_chef: "gorro alto de cocinero", gorro_lana: "gorro de lana (invierno, trabajador)", gorro_bebe: "gorrito tejido de bebé",
    casco_aviador: "casco de cuero de piloto con antiparras (aviador de 1910–1940)", casco: "casco de hierro (soldado antiguo)", corona: "corona (rey, reina)",
    capucha: "capucha (monje, ladrón medieval)", panuelo: "pañuelo atado en la cabeza (campesina, pirata)", cinta: "cinta en la frente",
  },
  ropas: {
    traje: "saco y corbata (hombre formal)", terno: "traje de tres piezas con chaleco (hombre importante, empresario, piloto famoso en público, fiscal)",
    smoking: "smoking negro con pajarita (gala, fiesta de noche)", gabardina: "gabardina con cinturón (detective, espía, sospechoso)",
    abrigo: "sobretodo largo cruzado (invierno, hombre o mujer)", abrigo_piel: "abrigo largo con cuello de piel (mujer rica, invierno)",
    uniforme: "uniforme de policía con placa y cinturón", uniforme_militar: "uniforme militar con bolsillos y cinturón", toga: "toga negra larga (juez)",
    bata: "bata blanca (médico, científico, experto de laboratorio)", chaqueta_cuero: "chaqueta de cuero con cuello de lana (aviador, motociclista)",
    camisa: "camisa sola con bolsillo (obrero, hombre en casa, verano)", sueter: "suéter tejido (hombre en casa, estudiante, invierno)",
    overol: "overol con tirantes (granjero, mecánico, carpintero)", chaleco: "chaleco abierto (comerciante, cantinero)", delantal: "delantal (cocinera, panadero, ama de casa)",
    uniforme_ninera: "cuello blanco y delantal blanco (niñera o empleada de una casa grande)", uniforme_enfermera: "uniforme blanco con cruz roja (enfermera)",
    pijama: "pijama a rayas (de noche en la casa)", mameluco: "mameluco de una pieza con broches (bebé)", rayas_preso: "rayas horizontales de presidiario",
    liso: "ropa lisa sin detalles", rayas: "camiseta a rayas (marinero)", cuadros: "camisa a cuadros (campo, leñador)", parches: "ropa remendada (pobreza)",
    acolchado: "jubón acolchado medieval", capa: "capa (noble medieval)", tunica: "túnica medieval",
  },
  estampados: { liso: "vestido liso", floreado: "vestido floreado (primavera, mujer alegre o del campo)", lunares: "vestido de lunares (años 30–50)", cuadros: "vestido a cuadros (campo, niña)", rayas: "vestido a rayas finas" },
  rasgos: {
    gafas: "anteojos redondos", barba: "barba larga", barba_corta: "barba de pocos días", perilla: "perilla", patillas: "patillas largas", pecas: "pecas",
    mejillas: "mejillas rosadas (niños, mujeres jóvenes)", cejas: "cejas gruesas y marcadas (rudo, serio)", arrugas: "arrugas (mayor de 50)",
    ojeras: "ojeras (cansancio, insomnio, preocupación permanente)", cicatriz: "cicatriz en la mejilla (matón, veterano)", lunar: "lunar junto a la boca (mujer glamorosa)",
  },
  accesorios: {
    corbata: "corbata (usa colorAccesorio)", pajarita: "moño en el cuello (mesero, profesor, elegante)", tirantes: "tiradores sobre la camisa",
    bufanda: "bufanda al cuello (invierno, artista)", collar_perlas: "collar de perlas (mujer rica)", aretes: "aretes (mujer)", guantes: "guantes blancos (chofer, dama, mayordomo)",
    reloj_bolsillo: "cadena de reloj de bolsillo sobre el chaleco (señor mayor, banquero)", placa: "placa dorada en el pecho (policía, sheriff, detective)",
    credencial_prensa: "tarjeta PRENSA en la cinta del sombrero (periodista, fotógrafo de diario de los años 20–50)", flor_solapa: "flor en la solapa (novio, galán)",
    cuello_blanco: "cuello blanco redondo (niñera, colegiala, institutriz)", brazalete: "brazalete en el brazo (luto, policía auxiliar)", monoculo: "monóculo (aristócrata)",
    cigarrillo: "cigarrillo en la boca (detective, gánster, periodista)", pipa: "pipa en la boca (detective clásico, profesor, abuelo)",
    bigote_fino: "bigote fino de lápiz (galán, gánster de los 30)", bigote_grueso: "bigote grueso de cepillo (policía, militar, padre)", bigote_manubrio: "bigote de manubrio con puntas (siglo XIX, barbero)",
  },
  expresiones: {
    neutral: "tranquilo", serio: "serio, firme", sonrisa: "sonrisa leve", feliz: "feliz", risa: "carcajada", nervioso: "nervioso, con gota de sudor", sorpresa: "sorprendido",
    alivio: "aliviado", mareado: "aturdido", dolor: "dolor", silbar: "silbando", enojado: "enojado", triste: "triste", asustado: "asustado", pensativo: "pensando",
    picaro: "pícaro, satisfecho", cansado: "agotado, párpados caídos y ojeras", preocupado: "preocupado, cejas arriba", sospechoso: "ojos entrecerrados mirando de reojo",
    llorando: "llorando con lágrimas", gritando: "gritando", aterrado: "aterrado", decidido: "decidido, mandíbula firme", dormido: "dormido",
    confundido: "confundido, una ceja arriba", asco: "asco", timido: "tímido, ruborizado",
  },
  en_mano: {
    libreta: "libreta y lápiz (detective o policía anotando testimonios, periodista)", camara_foto: "cámara de prensa con flash (fotógrafo de diario)",
    microfono: "micrófono de radio antiguo (periodista de radio, entrevista)", revolver: "revólver (policía, criminal)", esposas: "esposas (arresto)", placa: "placa de policía en la mano (identificarse)",
    carpeta: "carpeta con documentos (fiscal, abogado, investigador)", maletin: "maletín (abogado, médico)", maleta: "maleta de viaje", bolsa_compras: "bolsa de supermercado",
    biberon: "biberón", osito: "osito de peluche", bebe: "bebé en brazos", sombrero: "sombrero en la mano (saludo, respeto, duelo)", baston: "bastón (anciano, caballero)",
    vaso: "vaso de whisky", botella: "botella", telefono_antiguo: "teléfono de candelabro de los años 20–40", telefono: "teléfono moderno", mazo: "martillo de juez",
    fotografia: "fotografía (mostrar una foto como prueba)", mapa: "mapa", reloj_bolsillo: "reloj de bolsillo en la mano (apuro, hora)", cigarrillo: "cigarrillo en la mano", pipa: "pipa en la mano",
    nota: "nota escrita a mano (nota de rescate, carta anónima)", carta: "sobre o carta", periodico: "periódico", billetes: "billetes", dinero_fajo: "fajo de billetes atado",
    lupa: "lupa", linterna: "linterna", ramo: "ramo de flores", rifle: "rifle", cuchillo: "cuchillo", jeringa: "jeringa (médico)", radio: "radio portátil antigua",
    pasaporte: "pasaporte", lampara_aceite: "farol de aceite", vela: "vela", libro: "libro", taza: "taza", llave: "llave"
  },
};

/** arquetipos de oficio: cómo se ve y cómo actúa cada papel (guía, no obligación; el guion manda) */
export const ARQUETIPOS = `
- policía de calle: complexion robusto o adulto, sombrero gorra_policia, ropa uniforme (azul oscuro), accesorios placa (+ bigote_grueso a veces), objetos libreta, esposas, revolver.
  Actúa firme: manos en la cintura, señala, anota, contiene a la gente.
- detective / investigador: fedora, gabardina o terno, accesorios cigarrillo o pipa, rasgos cejas u ojeras; objetos libreta, lupa, fotografia, carpeta.
  Actúa observando: piensa, anota en la libreta, examina con la lupa, interroga.
- periodista: fedora con credencial_prensa, traje o terno arrugado, objetos libreta o microfono. Fotógrafo de prensa: lo mismo + camara_foto.
  Actúan en grupo: se amontonan, sacan fotos con flash, extienden el micrófono, persiguen.
- niñera / empleada doméstica de casa grande: vestido de color sobrio (gris, azul, verde oscuro), ropa uniforme_ninera, sombrero cofia o pelo con moño_bajo,
  NUNCA igual a la señora de la casa. Actúa atenta y servicial; ante una desgracia, preocupada y llorando.
- señora de clase alta (años 30): vestido elegante (con estampado o liso), cloche o pamela, peinado ondulado o melena, collar_perlas, aretes.
- piloto / aviador: chaqueta_cuero, casco_aviador o fedora, bufanda; cuando es famoso y está en público, terno.
- juez: anciano o adulto, toga, gafas, arrugas, objeto mazo. Fiscal: terno, carpeta, bigote. Abogado defensor: traje, maletin, gafas.
- sospechoso / criminal: gabardina o abrigo oscuro, fedora bajado, expresiones sospechoso y serio; nunca igual a un detective (otro color, otra silueta).
- preso: rayas_preso, rapado. Testigo anciano: anciano, baston, sombrero en la mano.
- bebé: complexion bebe, ropa mameluco (blanco, celeste o crema), sombrero gorro_bebe o pelo con peinado pelusa, rasgos mejillas.
- niño de los años 30: gorra_plana, overol o camisa con tirantes. Niña: vestido con estampado, lazo, trenzas.
- médico / experto de laboratorio: bata, gafas, objetos jeringa, carpeta. Enfermera: uniforme_enfermera + cofia.
- obrero / carpintero / mecánico: overol o camisa, gorra_plana o gorra, objetos martillo o maletin de herramientas.
- mesero / mayordomo: smoking o terno negro, pajarita, guantes. Chofer: abrigo, gorra, guantes.
- gente de la calle (extras): ropa de la época en colores variados y apagados; NO necesitan ficha propia.`;

/** texto de la biblioteca para los agentes: cada valor con su descripción */
export const textoBiblioteca = () => {
  const sec = (titulo, k, lista) => `${titulo}:\n` + lista.map((v) => `  ${v}: ${DESC[k]?.[v] ?? ""}`).join("\n");
  return [
    sec("COMPLEXION (cuerpo y edad)", "complexiones", C.complexiones),
    sec("PEINADO", "peinados", C.peinados),
    sec("SOMBRERO (\"pelo\" = sin sombrero, se ve el peinado; el pelo también asoma bajo los sombreros)", "sombreros", C.sombreros),
    sec("ROPA (estilo del torso; el color va en camisa)", "ropas", C.ropas),
    sec("ESTAMPADO DEL VESTIDO (solo si lleva vestido)", "estampados", C.estampados),
    sec("RASGOS DE LA CARA (hasta 4)", "rasgos", C.rasgos),
    sec("ACCESORIOS (hasta 5)", "accesorios", C.accesorios),
    sec("EXPRESIONES", "expresiones", C.expresiones),
    sec("OBJETOS EN LA MANO", "en_mano", C.en_mano.filter((x) => DESC.en_mano[x] !== undefined || true)),
    "ARQUETIPOS DE OFICIO:" + ARQUETIPOS,
  ].join("\n\n");
};

// ---------------- actuación ----------------
/** qué hace cada acción en pantalla (para el director de escena) */
export const ACCIONES_DESC = {
  parado: "quieto, respira y parpadea", caminar: "camina hacia \"hacia\":[x,z]", correr: "corre hacia \"hacia\"", hablar: "habla moviendo una mano (la boca se mueve con su voz)",
  saludar: "saluda con la mano en alto", senalar: "señala con el brazo extendido", celebrar: "salta con los brazos arriba", sorpresa: "se lleva las manos a la cabeza",
  sentado: "sentado en el suelo o un banco", caer: "se desploma", cargar: "lleva algo con los dos brazos (con mano \"bebe\": carga al bebé)", encogerse: "se encoge de hombros",
  manos_cadera: "manos en la cintura (autoridad, impaciencia)", pensar: "mano en el mentón, mira de lado (reflexiona, sospecha)", martillar: "martilla", empujar: "empuja con las dos manos", comer: "come", lanzar: "lanza algo",
  escribir: "ANOTA en la libreta (libreta en una mano, lápiz que se mueve en la otra): detective tomando testimonio, policía tomando datos, periodista. Usa mano \"libreta\"",
  fotografiar: "levanta la cámara de prensa a la cara y dispara FLASH cada ~2 s. Usa mano \"camara_foto\". Para fotógrafos de prensa",
  entrevistar: "extiende el micrófono hacia alguien (pregunta). Usa mano \"microfono\". Ponlo a 1–1.5 m del entrevistado, a un lado",
  preocuparse: "se retuerce las manos frente al pecho, balanceándose (angustia, espera de noticias). Con expresión preocupado o asustado",
  espiar: "se inclina y se asoma por un costado (detrás de un árbol, un auto, una esquina), una mano apoyada. Con expresión sospechoso",
  trepar: "sube una escalera DE ESPALDAS a la cámara (se ve la nuca); sube 0.5 m por segundo hasta \"alto\" (3 m = ventana del segundo piso)",
  entrar: "arriba de la escalera, se mete por la ventana y desaparece (usar como paso después de trepar)",
  pilotar: "sentado con las manos en la palanca (cabina del avión). Con expresión cansado o decidido",
  explicar: "gesticula con las dos manos abiertas al hablar (discusión, argumento, alegato)",
  cubrirse: "se tapa la cara con las manos (llanto, vergüenza, esquivar las cámaras)",
  arropar: "inclinado sobre la cuna o la cama, acomoda la manta del bebé con las dos manos (niñera, madre). Va junto a la cuna, no encima",
  asentir: "mueve la cabeza que sí (está de acuerdo, escucha, entiende)", negar: "mueve la cabeza que no (rechaza, no lo puede creer)",
  cruzar_brazos: "brazos cruzados sobre el pecho (desconfianza, enojo contenido, autoridad que espera)", dudar: "se rasca la cabeza (duda, no entiende)",
  suplicar: "manos juntas frente al pecho (ruega, pide por favor, reza)", abrazar: "brazos abiertos que rodean a alguien (ponerlo frente a otro actor a 0.6 m)",
  consolar: "mano sobre el hombro de otro (ponerlo a 0.7 m del que sufre)", esperar: "manos en los bolsillos, cambia el peso de pie (espera, aburrimiento)",
  temblar: "tiembla abrazándose (miedo, frío, shock)", desesperarse: "manos en la cabeza balanceándose (desesperación, mala noticia)",
  llamar: "habla por teléfono con el auricular en la oreja (mano telefono_antiguo)", mirar_reloj: "saca el reloj de bolsillo, lo mira con la cabeza baja y luego mira alrededor (impaciencia, hora exacta)",
  entregar: "extiende la mano ofreciendo algo o para dar la mano (mano: el objeto que entrega)", tocar_puerta: "golpea una puerta con el puño",
  detener: "palma adelante: ¡alto! (policía que detiene, rechaza a la prensa)", amenazar: "puño en alto que sacude (ira, amenaza)",
  enumerar: "mano en alto contando con los dedos 1, 2, 3, marcando cada punto con la cabeza (explica pruebas, hechos, pasos)", suspirar: "inhala inflando el pecho, exhala bajando la cabeza con los ojos cerrados y se le ve el aliento (cansancio, resignación, alivio)",
  reir: "ríe con las manos en la cintura dando saltitos (con expresión risa)",
  acercarse: "camina despacio y con cautela hacia \"hacia\" (sospecha, miedo, acercarse a una prueba)",
  retroceder: "retrocede de frente a la cámara con la palma adelante (miedo, sorpresa); sin \"hacia\" retrocede 1.3 m",
  ir_y_venir: "camina de un lado a otro sin parar con giros (nervios, espera de noticias). Solo como acción principal, no en pasos",
  leer: "sostiene con las dos manos un papel delante del pecho y lo lee. Usa mano \"nota\", \"carta\", \"periodico\" o \"carpeta\"",
};

/** recetas de puesta en escena (coordenadas en metros; la cámara del decorado mira hacia -z) */
export const RECETAS_ACTUACION = `
- ESPIAR DETRÁS DE UN ÁRBOL: objeto arbol (escala 1.5, tronco grueso) en (x, z); el actor en (x+0.2, z-0.4), accion espiar, expresión sospechoso.
  El tronco lo tapa a medias y se asoma por el costado. Lo mismo detrás de un auto o una esquina.
- ESCALERA A LA VENTANA DEL CUARTO (exterior de la mansión): objeto escalera en (-0.9, -3.15) apoyada en la pared bajo la ventana del segundo piso.
  El que sube: actor en (-0.9, -2.95), pasos: [{t:0, accion:"trepar"}, {t:6, accion:"entrar"}] (6 s para subir 3 m). Cámara de costado y algo alta.
  La escalera queda APOYADA en la pared; después del secuestro puede quedar tirada en el jardín (estado "tirada"), nunca en medio del jardín de pie.
- CUARTO A OSCURAS: ambiente.oscuro = true (lámparas apagadas, solo la luna). El secuestrador "cargar" con mano "bebe", expresión sospechoso.
- TESTIMONIO: el testigo "preocuparse" o "hablar" con expresión preocupado; el detective a 1.5–2 m "escribir" con mano libreta, expresión serio o pensativo.
- PRENSA: en la calle o el supermercado (NUNCA en el cuarto). Fotógrafo "fotografiar" + camara_foto, reportero "entrevistar" + microfono, a los lados del famoso;
  detrás, multitud "prensa" (6–10). El famoso "cubrirse" o "manos_cadera" con expresión enojado o asustado. En la calle, multitud "transeuntes" en las aceras (x = ±5.6).
- CONVERSACIÓN: dos personajes a 1.6–2 m, uno "explicar" y otro "hablar" o "pensar"; las expresiones según lo que sienten (preocupado, serio, triste).
- VUELO: aeródromo con objeto avion estado "despega" (rueda por la pista y se eleva) o "aterriza"; cielo con avion estado "vuela"; cabina con el piloto "pilotar".
- GESTICULACIÓN HUMANA (lo más importante para que parezca una película): las personas NUNCA están quietas como estatuas.
  * Quien habla ya mueve la boca, la cabeza y las manos solo (el motor alterna gestos). Ponle "hablar" o "explicar"; "enumerar" si cuenta hechos.
  * Quien escucha REACCIONA con pasos cada 2–4 s: asentir, negar, cruzar_brazos, dudar, pensar, suspirar, manos_cadera, según lo que siente.
  * Una mala noticia: sorpresa → desesperarse o cubrirse → suspirar. Miedo: retroceder → temblar. Ira: amenazar o cruzar_brazos. Ruego: suplicar.
  * Espera angustiosa: ir_y_venir, mirar_reloj, preocuparse. Un policía que frena a la prensa: detener. Llamada: llamar con telefono_antiguo.
  * Consuelo entre personajes: uno "consolar" o "abrazar" a 0.6–0.7 m del otro, que "cubrirse" o "suspirar".
  * La cara acompaña al gesto: el motor ajusta la expresión si no corresponde (amenazar = enojado, suspirar = cansado, retroceder = aterrado…).
    Elige tú la expresión que corresponde a lo que siente el personaje.
  * Una escena de 8 s con alguien en la misma acción todo el tiempo está MAL: dale 2 o 3 pasos con acciones y expresiones distintas.
  * Movimiento: no todo es caminar. Usa acercarse (cautela), retroceder (miedo), correr (urgencia), ir_y_venir (nervios), o quedarse y gesticular.
- LEER UNA NOTA / UNA PRUEBA: "leer" con mano nota, carta, periodico o fotografia; los demás alrededor "pensar" o "preocuparse".`;

export const textoActuacion = () => "ACCIONES (qué se ve en pantalla):\n" + Object.entries(ACCIONES_DESC).map(([k, v]) => `  ${k}: ${v}`).join("\n") + "\n\nRECETAS DE PUESTA EN ESCENA:" + RECETAS_ACTUACION + textoLecciones();

// ---------------- lecciones aprendidas (crecen con cada corrección del usuario: agentes/lecciones.json) ----------------
import fs from "node:fs";
const LECC = new URL("./lecciones.json", import.meta.url);
// biblia visual de la serie (guiones/biblia_visual.md): apariencia y reglas que no cambian entre episodios
export const textoBibliaVisual = () => { try { return "\n\nBIBLIA VISUAL DE LA SERIE (obligatoria, manda sobre cualquier otra preferencia de estilo):\n" + fs.readFileSync(rutaBibliaVisual(), "utf8"); } catch { return ""; } };
export const lecciones = () => { try { return JSON.parse(fs.readFileSync(LECC, "utf8")); } catch { return []; } };
export const aprender = (texto, tema = "general") => { const l = lecciones(); if (!l.some((x) => x.texto === texto)) { l.push({ fecha: new Date().toISOString().slice(0, 10), tema, texto }); fs.writeFileSync(LECC, JSON.stringify(l, null, 1)); } return l.length; };
export const textoLecciones = () => { const l = lecciones(); return l.length ? "\n\nLECCIONES APRENDIDAS (errores que el productor ya corrigió; NO los repitas):\n" + l.map((x) => `  - [${x.tema}] ${x.texto}`).join("\n") : ""; };
