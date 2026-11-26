// Lo que el motor sabe dibujar. Debe coincidir con src/motor/plan.ts (las mismas listas).
export const C = {
  lugares: ["campo", "pueblo", "bosque", "castillo", "ciudad", "playa", "desierto", "montana", "interior", "granja",
    "mansion", "calle", "cementerio", "gasolinera", "puerto", "habitacion", "oficina", "tribunal", "carcel", "aerodromo", "cielo", "cabina", "supermercado"],
  horas: ["dia", "atardecer", "noche", "amanecer"],
  climas: ["despejado", "nublado", "lluvia", "niebla", "nieve"],
  acciones: ["parado", "caminar", "correr", "hablar", "saludar", "senalar", "celebrar", "sorpresa", "sentado", "caer", "cargar", "encogerse", "manos_cadera", "pensar", "martillar", "empujar", "comer", "lanzar", "escribir", "fotografiar", "entrevistar", "preocuparse", "espiar", "trepar", "entrar", "pilotar", "explicar", "cubrirse", "leer", "arropar", "asentir", "negar", "cruzar_brazos", "dudar", "suplicar", "abrazar", "consolar", "esperar", "temblar", "desesperarse", "llamar", "mirar_reloj", "entregar", "tocar_puerta", "detener", "amenazar", "enumerar", "suspirar", "reir", "acercarse", "retroceder", "ir_y_venir"],
  expresiones: ["neutral", "serio", "sonrisa", "feliz", "risa", "nervioso", "sorpresa", "alivio", "mareado", "dolor", "silbar", "enojado", "triste", "asustado", "pensativo", "picaro", "cansado", "preocupado", "sospechoso", "llorando", "gritando", "aterrado", "decidido", "dormido", "confundido", "asco", "timido"],
  camaras: ["acercamiento", "alejamiento", "paneo_izq", "paneo_der", "orbita", "grua_sube", "grua_baja", "seguimiento", "plano_general", "contrapicado"],
  planos: ["primer_plano", "medio", "general", "panoramico"],
  planos_toma: ["detalle", "rostro", "primer_plano", "medio", "general", "panoramico"],
  angulos: ["frente", "bajo", "alto", "cenital", "lado", "hombro"],
  movs: ["empuje", "alejar", "paneo", "subir", "bajar", "orbita"],
  transiciones: ["corte", "fundido", "destello", "barrido"],
  efectos: ["destello", "estrellas", "polvo", "notas", "chispas", "signo", "anillo"],
  objetos: ["arbol", "pino", "arbusto", "casa", "torre", "muro", "roca", "carreta", "cajas", "barril", "valla", "farol", "fogata", "mesa", "palmera", "cactus", "pozo", "tienda", "estatua", "horno", "pan_gigante", "silla", "cama", "bote",
    "auto", "auto_policia", "avion", "escalera", "cuna", "lapida", "surtidor", "escritorio", "archivador", "pizarra", "estrado", "banca", "rejas", "mansion", "edificio", "barco", "farola", "lampara",
    "hidrante", "cubo", "buzon", "seto", "kiosco", "estante", "sillon"],
  en_mano: ["pan", "martillo", "paraguas", "libro", "espada", "taza", "carta", "saco", "flor", "antorcha", "escoba", "pala", "moneda", "llave", "canasta", "telefono", "bandera", "pastel", "periodico", "maletin", "lupa", "linterna", "billetes", "bebe", "libreta", "camara_foto", "microfono", "revolver", "esposas", "placa", "carpeta", "maleta", "bolsa_compras", "biberon", "osito", "sombrero", "baston", "vaso", "botella", "telefono_antiguo", "mazo", "fotografia", "mapa", "reloj_bolsillo", "cigarrillo", "pipa", "nota", "ramo", "rifle", "cuchillo", "jeringa", "radio", "dinero_fajo", "pasaporte", "lampara_aceite", "vela"],
  estados: ["normal", "derrumbe", "temblor", "aparece", "sube", "despega", "vuela", "aterriza", "tirada"],
  materiales: ["normal", "pan", "oro", "hielo", "madera", "piedra", "chocolate", "queso"],
  tipos_multitud: ["ejercito", "pueblo", "publico", "guardias", "transeuntes", "prensa"],
  formaciones: ["filas", "grupo", "circulo"],
  acciones_multitud: ["parado", "marchar", "celebrar", "correr", "pelear", "girar"],
  peinados: ["liso", "rizado", "punta", "mono", "coleta", "largo", "calvo", "engominado", "raya_lado", "ondulado", "ondulado_largo", "melena", "flequillo", "trenzas", "cola_alta", "moño_bajo", "rapado", "entradas", "afro", "pelusa"],
  ropas: ["liso", "acolchado", "rayas", "cuadros", "parches", "chaleco", "delantal", "capa", "tunica", "traje", "gabardina", "uniforme", "bata", "terno", "smoking", "abrigo", "abrigo_piel", "toga", "uniforme_militar", "chaqueta_cuero", "sueter", "overol", "pijama", "mameluco", "rayas_preso", "camisa", "uniforme_enfermera", "uniforme_ninera"],
  rasgos: ["gafas", "barba", "barba_corta", "perilla", "patillas", "pecas", "mejillas", "cejas", "arrugas", "ojeras", "cicatriz", "lunar"],
  accesorios: ["corbata", "pajarita", "tirantes", "bufanda", "collar_perlas", "aretes", "guantes", "reloj_bolsillo", "placa", "credencial_prensa", "flor_solapa", "cuello_blanco", "brazalete", "monoculo", "cigarrillo", "pipa", "bigote_fino", "bigote_grueso", "bigote_manubrio"],
  estampados: ["liso", "floreado", "lunares", "cuadros", "rayas"],
  tipos_luz: ["antorchas", "ventanas", "faroles", "velas"],
  mov_luz: ["quietas", "circulo", "parpadeo", "marchar"],
  sombreros: ["ninguno", "pelo", "gorra", "sombrero_copa", "bonete", "chaco", "chaco_alto", "casco", "casco_pluma", "corona", "capucha", "cinta", "paja", "boina", "panuelo", "fedora", "gorra_policia", "cloche", "bombin", "gorra_plana", "pamela", "sombrero_vaquero", "gorro_marinero", "gorro_chef", "gorro_lana", "cofia", "lazo", "diadema", "velo", "gorro_bebe", "casco_aviador"],
  complexiones: ["adulto", "robusto", "nino", "bebe", "anciano", "delgado", "alto", "adolescente", "bajo"],
};

export const DESCRIPCION = `
CATÁLOGO DEL MOTOR (usa SOLO estos valores exactos, sin tildes):
- lugares: ${C.lugares.join(", ")} (cada lugar ya trae su decorado lleno: casas, puestos, letreros, estandartes, antorchas, carpas, matas;
  de noche las casas encienden las ventanas. NO rellenes con muros ni casas: pon solo los objetos que la historia
  nombra, y un muro o una torre solo si la frase habla de ellos)
- LUGARES DE LOS AÑOS 30 (casos policiales): mansion = residencia colonial de dos pisos con jardín y árboles; calle = calle de
  ciudad con edificios de ladrillo, aceras, faroles y autos antiguos; cementerio = lápidas, verja de hierro, faroles; gasolinera =
  surtidores antiguos bajo un techo; puerto = muelle de madera, mar y barco; INTERIORES: habitacion = cuarto infantil con cuna y
  ventana; oficina = escritorio, archivadores y pared de pruebas; tribunal = estrado del juez, bandera, bancas; carcel = pasillo de celdas.
  AVIONES: aerodromo = pista de aterrizaje con hangar y manga de viento (avion con estado "despega", "aterriza" o "normal" estacionado);
  cielo = en pleno vuelo entre nubes, sin suelo (avion con estado "vuela"); cabina = adentro del avion (el piloto "sentado").
  supermercado = almacén de comestibles por dentro (estanterías con latas, góndolas, fruta, mostrador y caja registradora).
  climas (ambiente.clima): despejado, nublado, lluvia, niebla, nieve; ambiente.escenario = id del decorado fijo de preproducción.
  GENTE DE FONDO: multitud "transeuntes" (gente de la época paseando) y "prensa" (reporteros con cámaras, libretas y micrófonos).
  Para historias del siglo XX usa SOLO estos lugares (y campo, bosque, playa); nunca pueblo, castillo ni ciudad (son medievales).
- horas: ${C.horas.join(", ")}
- acciones de personaje: ${C.acciones.join(", ")}
  (caminar/correr necesitan "hacia":[x,z]; caer = se desploma; sentado = sentado en el suelo; cargar = brazos al frente;
   senalar = brazo extendido; celebrar = brazos arriba saltando; sorpresa = manos a la cabeza; encogerse = hombros arriba;
   martillar = golpea con un martillo una y otra vez; empujar = empuja con los dos brazos; comer = se lleva la mano a la boca;
   lanzar = tira algo por encima del hombro, el objeto de su mano desaparece al lanzarlo)
- PASOS de un actor ("pasos"): secuencia de acciones dentro de la escena, en orden. Cada paso: {"cuando": palabra exacta
  de la narración donde empieza (o "t": segundos), "accion", "expresion" (opcional), "hacia": [x,z] si camina/corre,
  "mano": objeto que toma (o null si lo suelta)}. Cada paso arranca donde terminó el anterior; al llegar caminando se queda
  parado hasta el siguiente paso. Así un personaje entra, se acerca a un objeto, lo mira, lo toma y se va.
- objeto en la mano de un actor ("mano"): ${C.en_mano.join(", ")}  (con "cargar" se sostiene con las dos manos y se ve más grande)
- expresiones: ${C.expresiones.join(", ")}
- tipos de cámara: ${C.camaras.join(", ")}
- planos: ${C.planos.join(", ")}
- TOMAS (lo más importante del ritmo): planos de toma ${C.planos_toma.join(", ")}; ángulos ${C.angulos.join(", ")};
  movimientos dentro de la toma ${C.movs.join(", ")}. detalle = primerísimo plano de las manos/objeto en la mano o de un
  objeto; rostro = solo la cara; bajo = cámara en el suelo mirando hacia arriba; alto = desde arriba en diagonal;
  cenital = casi desde el techo; lado = de perfil; hombro = sobre el hombro de "desde" mirando a "objetivo".
  objetivo de una toma = id de actor, "grupo" u "objeto:N" (N = índice del objeto en la lista de objetos de esa escena).
- transiciones: ${C.transiciones.join(", ")}
- efectos 2D: ${C.efectos.join(", ")}
- objetos 3D: ${C.objetos.join(", ")}
  (años 30: auto = sedán antiguo; auto_policia = patrulla blanca y negra; avion = monoplano plateado; escalera = escalera de
   madera apoyada; cuna; lapida; surtidor; escritorio con lámpara; archivador; pizarra = tablero de pruebas con fotos y cuerdas
   rojas; estrado = estrado del juez; banca; rejas = barrotes de celda; mansion y edificio = construcciones grandes, van al
   fondo z <= -12; barco; farola = farol de calle; lampara = lámpara de pie; hidrante; cubo = tacho de basura de
   metal; buzon = buzón de correo; seto = cerco de arbustos; kiosco = puesto de periódicos; estante = estantería con
   libros; sillon = sillón tapizado)
- estado de un objeto 3D ("estado" + "t" en segundos desde el inicio de la escena): ${C.estados.join(", ")}
  (derrumbe = se cae con polvo, sacudida y golpe; temblor = vibra; aparece = brota de la nada; sube = se eleva 3 m)
- material de un objeto 3D ("material"): ${C.materiales.join(", ")}  (p. ej. una casa de pan = {"tipo":"casa","material":"pan"})
- MULTITUDES ("multitudes" de la escena): cientos o miles de monitos (máx. 4000) para ejércitos, el pueblo entero o
  un público. {"tipo": ${C.tipos_multitud.join("|")}, "cantidad": 300, "x": 0, "z": -14, "ancho": 30, "fondo": 12,
  "formacion": ${C.formaciones.join("|")}, "accion": ${C.acciones_multitud.join("|")}, "hacia": [x,z] o null,
  "mano": objeto en la mano o null (con "antorcha" cada persona lleva su luz), "uniforme": {"camisa","pantalon","sombrero","colorSombrero"} o null,
  "t": segundo en que aparece o null}. Va DETRÁS de los actores (z más negativo) o a los lados. Úsala SIEMPRE que la
  narración hable de muchas personas («tres mil soldados», «todo el pueblo», «la multitud»).
- LUCES MASIVAS ("luces" de la escena): {"tipo": ${C.tipos_luz.join("|")}, "cantidad": 400, "x": 0, "z": -30, "ancho": 40,
  "fondo": 20, "altura": 1.8, "movimiento": ${C.mov_luz.join("|")}, "crecer": [[0, 400], [1.5, 800], [3, 1000]] o null}.
  Úsalas cuando la historia hable de luces, fuego, ventanas encendidas de noche, velas, antorchas a lo lejos.
- objetivo de una toma también puede ser "multitud:N" o "luces:N".
- VESTUARIO AÑOS 30: "fedora" (sombrero de fieltro de detective, periodista o sospechoso), "gorra_policia" (policía),
  "cloche" (sombrero campana de mujer); ropa "traje" (saco con corbata), "gabardina" (abrigo largo con cinturón), "uniforme"
  (policía con placa), "bata" (bata blanca de experto o médico). Nunca cascos, coronas ni capuchas en historias modernas.
  En la mano: periodico, maletin, lupa, linterna, billetes, bebe (un bebé envuelto en brazos), carta, telefono.
- PERSONAJES DISTINTOS ENTRE SÍ: cada personaje lleva "peinado" (${C.peinados.join("|")}), "ropa" (${C.ropas.join("|")}),
  "colorRopa2" (#hex del estampado, chaleco, delantal o capa) y "rasgos" (lista de ${C.rasgos.join(", ")}). Que no haya dos
  personajes con la misma combinación de color de camisa, peinado y ropa. Ropa de época: soldados "acolchado", campesinos
  "delantal"/"parches"/"tunica", nobles "capa", comerciantes "chaleco".
- Multitud "girar": la gente da vueltas en ronda (con "mano": "antorcha" cada uno lleva su luz). Si dan vueltas DENTRO de un muro,
  pon la multitud entre los actores y el muro (z mayor que el del muro), nunca luces sueltas fuera.
- sombreros/peinado: ${C.sombreros.join(", ")}  (pelo usa colorSombrero como color del pelo; gorra usa colorSombrero)
- complexion: ${C.complexiones.join(", ")}
ESCENARIO: los actores se paran en un círculo de 6 m alrededor del origen (x de -4 a 4, z de -3 a 3). La cámara mira
desde +z hacia -z: x negativo = izquierda de la pantalla, z negativo = más lejos. Separa a los personajes al menos 1.2 m.
Los objetos pueden ir en x -6..6, z -6..2 (no los pongas entre la cámara y los personajes: z > 2 tapa).
`;
