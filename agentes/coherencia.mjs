// CONTINUIDAD — reglas fijas que se aplican a lo que propone el director, escena por escena y en orden:
//  · cada escena usa un decorado fijo de preproducción (mismo id = mismos árboles, casas y utilería) con su hora y clima;
//  · la escalera: apoyada en la pared bajo la ventana cuando alguien la trepa; después queda tirada en el jardín (nunca de pie en medio);
//  · la prensa nunca entra al cuarto ni a la casa: acosa en la calle o en el supermercado; la calle siempre tiene transeúntes;
//  · el vuelo: avión que despega o aterriza en la pista, que vuela en el cielo, y el piloto en la cabina;
//  · el cuarto a oscuras durante el secuestro; los oficios actúan (el detective anota, el fotógrafo dispara el flash…).
// No depende de que el agente acierte: si propone otra cosa, se corrige y se anota el cambio.

/** cámaras fijas de cada decorado (posición y punto al que mira), como las de un estudio de televisión */
export const CAMARAS_SET = {
  mansion: [[-1.5, 2.4, 9], [3.1, 3.2, -8.5]], calle: [[0, 2.6, 10], [0, 1.6, -14]], aerodromo: [[7, 2.2, 7], [-3, 1.4, -6.5]],
  cementerio: [[0, 1.9, 8], [0, 1.0, -10]], puerto: [[-2, 2.6, 8], [3, 1.2, -14]], gasolinera: [[0, 2.0, 7], [0, 1.8, -8]], bosque: [[0, 1.8, 8], [0, 1.6, -10]],
  habitacion: [[0.6, 1.8, 4.2], [-0.4, 1.2, -4]], oficina: [[0, 1.8, 4.4], [0, 1.3, -4.4]], tribunal: [[0, 2.4, 6], [0, 1.6, -7]],
  carcel: [[0, 1.8, 4], [0, 1.3, -6.5]], supermercado: [[0, 1.9, 4.6], [0, 1.3, -6]], cabina: [[0.7, 1.45, 2.3], [-0.3, 1.0, -0.6]],
};
export const INTERIOR = ["habitacion", "oficina", "tribunal", "carcel", "supermercado", "cabina"];
/** puntos fijos del exterior de la mansión (la casa está en x 3.1, z -8.5; su fachada en z -4.44) */
export const MANSION = {
  escalera: { x: -0.9, z: -3.15 }, trepa: { x: -0.9, z: -2.95 }, tirada: { x: -3.4, z: -0.4, giro: 0.9 },
  arbolEspia: { x: -4.05, z: -1.45, escala: 1.5 }, espia: { x: -3.82, z: -1.85 },
};

/** gente de fondo y utilería fija de un decorado (mismas posiciones en todas sus escenas) */
export const decorado = (s) => {
  const interior = INTERIOR.includes(s.motor), objetos = [], multitudes = [];
  const SPOT = s.motor === "calle" ? [[-4.6, -9], [4.6, -6], [-4.6, -2], [4.6, -15]] : s.motor === "mansion" ? [[-6.8, -2.6], [10.5, 1.2], [-8.5, 1.5], [9, 3.5]] : [[-5, -6], [5.5, -5], [-6, -1], [6, 0]];
  if (s.motor === "cementerio") for (let k = 0; k < 12; k++) objetos.push({ tipo: "lapida", x: -6 + (k % 4) * 4 + (k % 2) * 0.6, z: -12 + Math.floor(k / 4) * 3, giro: 0 });
  if (!interior && s.motor !== "aerodromo" && s.motor !== "cielo") (s.utileria ?? []).filter((u) => u !== "lapida" && !(s.motor === "mansion" && ["arbol", "pino", "arbusto", "seto"].includes(u)))
    .forEach((u, k) => { let [x, z] = SPOT[k % SPOT.length], giro = u === "auto" || u === "auto_policia" ? Math.PI / 2 : 0;
      // en la calle el kiosco va pegado al cordón, paralelo a la calle y de frente a ella, lejos del paso de la gente
      if (s.motor === "calle" && u === "kiosco") { x = x < 0 ? -3.9 : 3.9; z = -11; giro = x < 0 ? Math.PI / 2 : -Math.PI / 2; }
      objetos.push({ tipo: u, x, z, giro }); });
  for (const g of s.gente ?? []) {
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
  return { objetos, multitudes };
};

const sinT = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ACTUA = ["escribir", "fotografiar", "entrevistar", "preocuparse", "espiar", "trepar", "entrar", "pilotar", "explicar", "cubrirse", "leer", "cargar", "arropar", "asentir", "negar", "cruzar_brazos", "dudar", "suplicar", "abrazar", "consolar", "esperar", "temblar", "desesperarse", "llamar", "mirar_reloj", "entregar", "tocar_puerta", "detener", "amenazar", "enumerar", "suspirar", "reir", "acercarse", "retroceder", "ir_y_venir"];
const usa = (a, acc) => a.accion === acc || (a.pasos ?? []).some((p) => p.accion === acc);

/** estado que pasa de una escena a la siguiente (en orden de la historia) */
export const nuevoEstado = () => ({ escalera: "sin_usar", secuestro: false });

/**
 * corrige las escenas de UN bloque del guion. ctx: { secuencia (de la biblia), escenarios (Map id → escenario), personajes, estado }
 * devuelve la lista de cambios
 */
export const coherencia = (escenas, ctx) => {
  const { secuencia: sq, escenarios: E, personajes = [], estado } = ctx;
  const cambios = [], C = (m) => cambios.push(m);
  const ids = (sq?.escenarios ?? []).filter((v) => E.has(v));
  const papel = (id) => sinT(personajes.find((p) => p.id === id)?.papel ?? "");
  let previo = null, iVuelo = 0, subio = false;
  if (estado.escalera === "apoyada") estado.escalera = "tirada";   // bloque nuevo: la escalera ya quedó tirada en el jardín
  escenas.forEach((e, k) => {
    if (!e || e.titulo) return;
    const n = `escena ${k + 1}`, txt = sinT(e.narracion);
    e.ambiente = e.ambiente ?? {}; e.actores = e.actores ?? []; e.objetos = e.objetos ?? []; e.multitudes = e.multitudes ?? [];
    // ---- decorado fijo ----
    if (ids.length) {
      let id = sinT(e.ambiente.escenario).replace(/[^a-z0-9_]/g, "");
      if (!ids.includes(id)) {
        const porMotor = ids.find((v) => E.get(v).motor === e.ambiente.lugar);
        const avion = e.objetos.some((o) => o.tipo === "avion");
        const nuevo = porMotor ?? (avion ? ids.find((v) => ["cielo", "aerodromo"].includes(E.get(v).motor)) : null) ?? previo ?? ids[0];
        if (id || e.ambiente.lugar) C(`${n}: decorado "${id || e.ambiente.lugar}" → ${nuevo}`);
        id = nuevo;
      }
      const s = E.get(id); e.ambiente.escenario = id; e.ambiente.lugar = s.motor;
      if (!INTERIOR.includes(s.motor) && s.motor !== "cielo") {
        const m = s.momentos.find((x) => x.hora === e.ambiente.hora && x.clima === e.ambiente.clima) ?? s.momentos.find((x) => x.hora === sq.hora && x.clima === sq.clima)
          ?? s.momentos.find((x) => x.hora === (e.ambiente.hora ?? sq.hora)) ?? s.momentos[0];
        e.ambiente.hora = m.hora; e.ambiente.clima = m.clima;
      } else { e.ambiente.hora = s.motor === "cielo" || s.motor === "cabina" ? (e.ambiente.hora === "noche" ? "noche" : "dia") : sq?.hora ?? e.ambiente.hora ?? "dia"; e.ambiente.clima = "despejado"; }
      // gente de fondo y utilería fija del decorado (si el director no puso su propia multitud)
      const d = decorado(s);
      if (!e.multitudes.length) e.multitudes = d.multitudes;
      for (const o of d.objetos) if (!e.objetos.some((x) => x.tipo === o.tipo && Math.hypot(x.x - o.x, x.z - o.z) < 1.5)) e.objetos.push(o);
      if (previo !== id) e.establecer = true;                  // primera escena en este decorado: plano fijo de ubicación
      previo = id;
    }
    let L = e.ambiente.lugar;
    // mansión: nada sobre el camino a la puerta ni metido en la casa (misma geometría que src/motor/mundo.ts)
    if (L === "mansion") {
      const enCamino = (o) => Math.abs((o.x - 3.2) * Math.cos(0.25) - (o.z + 4) * Math.sin(0.25)) < (o.tipo === "auto" || o.tipo === "auto_policia" ? 4.6 : 3.2) && o.z > -5;
      const enCasa = (o) => o.x > -5.6 - 1.5 && o.x < 16.7 + 1.5 && o.z < -3.4;
      const mueble = (o) => !["escalera", "arbol"].includes(o.tipo) && !o.estado;
      const n0 = e.objetos.length; e.objetos = e.objetos.filter((o) => !(mueble(o) && (enCamino(o) || enCasa(o))));
      if (e.objetos.length < n0) C(`${n}: se quitan objetos del camino o metidos en la casa`);
    }
    if (L === "calle") for (const o of e.objetos) if (o.tipo === "kiosco") { o.x = o.x < 0 ? -3.9 : 3.9; o.z = -11; o.giro = o.x < 0 ? Math.PI / 2 : -Math.PI / 2; }
    // ---- utilería de exterior dentro de una sala (una casa o un árbol en el cuarto = mancha negra) ----
    if (INTERIOR.includes(L)) {
      const ext = ["arbol", "pino", "arbusto", "seto", "casa", "mansion", "torre", "muro", "auto", "auto_policia", "farola", "kiosco", "avion", "barco", "hidrante", "buzon", "roca", "lapida", "pozo", "valla", "carreta", "tienda"];
      const n0 = e.objetos.length; e.objetos = e.objetos.filter((o) => !ext.includes(o.tipo));
      if (e.objetos.length < n0) C(`${n}: se quitan objetos de exterior de la sala`);
    }
    // ---- la pista del aeródromo: solo el avión (nada que atraviese); el público mira desde el borde, delante de la pista ----
    if (L === "aerodromo") {
      e.multitudes.forEach((m, j) => Object.assign(m, { x: j % 2 ? 6.5 : -6.5, z: 3.2, ancho: Math.min(m.ancho ?? 4, 5), fondo: 1.6, hacia: null, accion: m.accion === "marchar" ? "celebrar" : m.accion }));
      for (const a of e.actores) if (a.z < 1.8) { a.z = 2.2; a.hacia = null; }
      const n0 = e.objetos.length; e.objetos = e.objetos.filter((o) => o.tipo === "avion" || Math.abs(o.z + 6.5) > 9);
      if (e.objetos.length < n0) C(`${n}: se quitan cajas y árboles de la pista`);
      for (const o of e.objetos) if (o.tipo === "avion") o.z = -6.5;
    }
    // ---- la niñera trabaja en el cuarto del bebé (no paseando de noche por el jardín) ----
    const ninera = e.actores.find((a) => /ninera|nana|cuidador/.test(papel(a.id)));
    if (ninera && L === "mansion" && estado.escalera === "sin_usar" && !e.actores.some((a) => a.id === "secuestrador" || /^(el |un )?(secuestrador|ladron|intruso)/.test(papel(a.id)))) {
      const cuarto = [...E.values()].find((v) => v.motor === "habitacion");
      if (cuarto) {
        e.ambiente = { ...e.ambiente, escenario: cuarto.id, lugar: "habitacion", clima: "despejado", oscuro: undefined };
        e.objetos = [{ tipo: "cuna", x: -1.2, z: -1.6, giro: 0 }]; e.multitudes = []; e.actores = [ninera]; delete e.tomasFijas;
        if (previo !== cuarto.id) e.establecer = true;
        previo = cuarto.id;
        C(`${n}: ${ninera.id} pasa al cuarto del bebé, cuidándolo`);
        L = "habitacion";
      }
    }
    // ---- el bebé no es un actor parado: va en la cuna o en brazos ----
    const bebe = e.actores.filter((a) => /bebe|charles_jr|nino_lindbergh/.test(a.id) || /^bebe/.test(papel(a.id)));
    if (bebe.length) { e.actores = e.actores.filter((a) => !bebe.includes(a)); C(`${n}: el bebé va en la cuna o en brazos, no parado`); }
    // ---- mansión: árboles del decorado (fijos), árbol del espía y escalera ----
    if (L === "mansion") {
      const antes = e.objetos.length;
      e.objetos = e.objetos.filter((o) => !["arbol", "pino", "arbusto", "seto", "mansion", "escalera"].includes(o.tipo));
      if (e.objetos.length < antes) C(`${n}: se quitan árboles o escaleras sueltos (el jardín es siempre el mismo)`);
      e.objetos.push({ tipo: "arbol", ...MANSION.arbolEspia });
      for (const a of e.actores) if (usa(a, "espiar")) { a.x = MANSION.espia.x; a.z = MANSION.espia.z; a.hacia = null; }
      const trepa = e.actores.find((a) => usa(a, "trepar") || usa(a, "entrar"))
        ?? (/escalera|trep|sub[ei]|ventana/.test(txt) && estado.escalera === "sin_usar" ? e.actores.find((a) => a.id === "secuestrador" || /^(el |un )?(secuestrador|ladron|intruso)/.test(papel(a.id))) : null);
      if (trepa) {
        // la primera vez sube desde el suelo; si el bloque vuelve a mostrarlo, ya está arriba y entra
        Object.assign(trepa, { x: MANSION.trepa.x, z: MANSION.trepa.z, accion: "trepar", hacia: null, alto: 3, subido: subio ? 2.2 : 0, expresion: trepa.expresion ?? "sospechoso" });
        trepa.pasos = [{ cuando: null, t: subio ? Math.max(1.8, (e.duracion ?? 6) * 0.55) : Math.max(4, (e.duracion ?? 8) * 0.7), accion: "entrar" }];
        e.objetos.push({ tipo: "escalera", x: MANSION.escalera.x, z: MANSION.escalera.z, giro: 0 });
        C(`${n}: ${trepa.id} ${subio ? "llega arriba y entra por la ventana" : "trepa la escalera apoyada bajo la ventana del cuarto"}`);
        estado.escalera = "apoyada"; subio = true;
        e.actores = [trepa];
        e.tomasFijas = [{ t: 0, objetivo: trepa.id, plano: "general", angulo: "frente", mov: "empuje", pos: [2.6, 2.2, 4.0], mira: [-0.9, 2.6, -3.8] }];
      } else if (estado.escalera === "apoyada") e.objetos.push({ tipo: "escalera", x: MANSION.escalera.x, z: MANSION.escalera.z, giro: 0 });
      else if (estado.escalera === "tirada") e.objetos.push({ tipo: "escalera", x: MANSION.tirada.x, z: MANSION.tirada.z, giro: MANSION.tirada.giro, estado: "tirada" });
      // el que espía: plano fijo con el tronco delante
      const esp = e.actores.find((a) => usa(a, "espiar"));
      if (esp && !trepa) e.tomasFijas = [{ t: 0, objetivo: esp.id, plano: "medio", angulo: "frente", mov: "empuje", pos: [-2.3, 1.5, 2.6], mira: [-3.9, 1.35, -1.6] }];
    } else if (e.objetos.some((o) => o.tipo === "escalera") && INTERIOR.includes(L)) { e.objetos = e.objetos.filter((o) => o.tipo !== "escalera"); C(`${n}: no hay escalera dentro de una sala`); }
    // ---- prensa: fuera de la casa ----
    const esPrensa = (a) => /periodist|reporter|fotograf|prensa/.test(a.id + " " + papel(a.id));
    if (L === "habitacion" || L === "mansion") {
      const p0 = e.actores.length; e.actores = e.actores.filter((a) => !esPrensa(a));
      const m0 = e.multitudes.length; e.multitudes = e.multitudes.filter((m) => m.tipo !== "prensa");
      if (e.actores.length < p0 || e.multitudes.length < m0) C(`${n}: la prensa no entra a la casa (acosa en la calle o el supermercado)`);
    }
    for (const a of e.actores) if (esPrensa(a) && e.habla !== a.id) {
      const foto = /grafic|fotograf/.test(papel(a.id)) || a.mano === "camara_foto";
      if (!ACTUA.includes(a.accion)) { a.accion = foto ? "fotografiar" : "entrevistar"; a.mano = foto ? "camara_foto" : a.mano === "libreta" ? "libreta" : "microfono"; if (a.mano === "libreta") a.accion = "escribir"; }
    }
    // ---- vuelo ----
    if (L === "aerodromo" && !e.objetos.some((o) => o.tipo === "avion")) {
      const aterriza = /aterriz|llega|paris|bourget|tierra/.test(txt) || iVuelo > 0;
      e.objetos.push({ tipo: "avion", x: 0, z: -6.5, estado: aterriza ? "aterriza" : "despega", t: 0 }); iVuelo++;
      C(`${n}: el avión ${aterriza ? "aterriza" : "despega"} en la pista`);
      e.tomasFijas = [{ t: 0, objetivo: `objeto:${e.objetos.length - 1}`, plano: "general", angulo: "frente", mov: "paneo" }];
    }
    if (L === "cielo") {
      e.objetos = [{ tipo: "avion", x: 0, z: -2, estado: "vuela" }];
      if (e.actores.length) { e.actores = []; C(`${n}: en el cielo solo se ve el avión (el piloto va en la cabina)`); }
      if (e.habla) e.habla = null;
    }
    if (L === "cabina") {
      const piloto = personajes.find((p) => /aviador|piloto/.test(sinT(p.papel))) ?? personajes[0];
      const ex0 = /cans|sueno|horas|agot|dorm/.test(txt) ? "cansado" : /peligr|torment|niebla|hielo|riesgo/.test(txt) ? "preocupado" : "decidido";
      const ex1 = ex0 === "cansado" ? "serio" : ex0 === "preocupado" ? "decidido" : "serio";
      e.actores = [{ id: piloto.id, x: 0, z: -0.3, accion: "pilotar", expresion: ex0,
        pasos: [{ cuando: null, t: 2.8, accion: "pilotar", expresion: ex1 }, { cuando: null, t: 6, accion: "pilotar", expresion: ex0 === "decidido" ? "feliz" : ex0 }, { cuando: null, t: 9, accion: "pilotar", expresion: ex1 }] }];
      e.tomasFijas = [{ t: 0, objetivo: piloto.id, plano: "medio", angulo: "frente", mov: "empuje", pos: CAMARAS_SET.cabina[0], mira: [0, 0.95, -0.3] }];
    }
    // ---- el cuarto a oscuras durante el secuestro ----
    if (L === "habitacion" && e.ambiente.hora === "noche") {
      const intruso = e.actores.find((a) => a.id === "secuestrador" || /^(el |un )?(secuestrador|ladron|intruso)/.test(papel(a.id)));
      e.ambiente.oscuro = intruso ? true : undefined;     // con la familia buscando, la luz está prendida
      if (intruso && !usa(intruso, "cargar") && /bebe|cuna|llev|tom|sac/.test(txt)) { intruso.accion = "cargar"; intruso.mano = "bebe"; intruso.expresion = "sospechoso"; C(`${n}: el secuestrador se lleva al bebé en brazos`); }
    }
    if (L === "habitacion") {
      const enBrazos = e.actores.some((a) => a.mano === "bebe" || (a.pasos ?? []).some((p) => p.mano === "bebe"));
      const intruso2 = e.actores.some((a) => a.id === "secuestrador" || /^(el |un )?(secuestrador|ladron|intruso)/.test(papel(a.id)));
      if (!intruso2 && estado.escalera !== "sin_usar") estado.secuestro = true;   // ya subió y la familia está en el cuarto: la cuna está vacía
      e.ambiente.bebeEnCuna = !estado.secuestro && !enBrazos ? true : undefined;
      if (intruso2 && enBrazos) estado.secuestro = true;
      // la niñera o la madre con el bebé en la cuna: lo arropa, junto a la cuna
      const cuna = e.objetos.find((o) => o.tipo === "cuna");
      for (const a of e.actores) if (cuna && e.ambiente.bebeEnCuna && /ninera|nana|cuidador/.test(papel(a.id)) && a.mano !== "bebe" && e.habla !== a.id) {
        Object.assign(a, { x: cuna.x + 1.15, z: cuna.z + 0.35, accion: "arropar", hacia: null, mano: null, expresion: "feliz" }); delete a.pasos;
        C(`${n}: ${a.id} arropa al bebé en la cuna`);
      }
      // nadie se mete dentro de la cuna: a un lado (salvo el secuestrador que saca al bebé)
      for (const a of e.actores) if (cuna && a.accion !== "arropar" && !(a.mano === "bebe" && !estado.secuestro) && Math.hypot(a.x - cuna.x, a.z - cuna.z) < 1.4) {
        const lado = cuna.x <= 0 ? 1 : -1; a.x = Math.max(-3, Math.min(3, cuna.x + lado * 1.6)); a.z = Math.min(2.2, cuna.z + 0.9);
        C(`${n}: ${a.id} se aparta de la cuna`);
      }
    }
    // ---- salas con muebles en el medio (góndolas) y el cielo: cámara fija del decorado mirando a los actores ----
    if ((L === "supermercado" || L === "cielo") && !e.tomasFijas) {
      const ps = e.actores.length ? e.actores : [{ x: 0, z: -2 }], cx = ps.reduce((s, a) => s + a.x, 0) / ps.length, cz = ps.reduce((s, a) => s + a.z, 0) / ps.length;
      e.tomasFijas = L === "cielo" ? [{ t: 0, objetivo: "grupo", plano: "general", angulo: "frente", mov: "paneo", pos: [7, 1.2, 9], mira: [0, 0.3, -2] }]
        : (() => { const h = e.actores.find((a) => a.id === e.habla);
          return h ? [{ t: 0, objetivo: h.id, plano: "medio", angulo: "frente", mov: "empuje", pos: [h.x * 0.7 + (h.x < cx ? 0.6 : -0.6), 1.65, h.z + 3.3], mira: [h.x, 1.3, h.z] }]
            : [{ t: 0, objetivo: ps[0].id ?? "grupo", plano: "general", angulo: "frente", mov: "empuje", pos: [cx * 0.5, 1.8, cz + 4.8], mira: [cx, 1.2, cz] }]; })();
    }
    // ---- oficios que actúan ----
    for (const a of e.actores) {
      if (e.habla === a.id || ACTUA.includes(a.accion) || (a.pasos ?? []).some((p) => ACTUA.includes(p.accion))) continue;
      const pa = papel(a.id);
      if (/detective|investig|inspector|policia|agente|oficial/.test(pa) && (a.mano === "libreta" || /testimon|declar|interrog|pregunt|anot/.test(txt)) && a.accion !== "caminar") { a.accion = "escribir"; a.mano = "libreta"; }
      else if (/ninera|madre|esposa/.test(pa) && ["preocupado", "asustado", "triste", "llorando"].includes(a.expresion) && a.accion === "parado") a.accion = /llor/.test(a.expresion) ? "cubrirse" : "preocuparse";
      else if (["nota", "carta", "periodico"].includes(a.mano) && a.accion === "parado") a.accion = "leer";
    }
    // ---- nadie congelado: en escenas largas los que solo escuchan cambian de gesto a mitad ----
    const QUIETO = ["parado", "pensar", "manos_cadera", "hablar"];
    for (const a of e.actores) if (e.habla !== a.id && QUIETO.includes(a.accion) && !(a.pasos ?? []).length && a.mano !== "bebe") {
      // reacciones según el tono de la escena (variadas por actor y escena, nunca la misma secuencia)
      const tenso = /secuestr|desapare|miedo|angust|desesper|muert|rescate|amenaz|policia|nota|carta|llor/.test(txt), prensa = /prensa|foto|camar|periodic|reporter/.test(txt);
      const R = prensa ? ["detener", "cruzar_brazos", "negar", "cubrirse", "suspirar"] : tenso ? ["preocuparse", "negar", "desesperarse", "suspirar", "cruzar_brazos", "pensar", "mirar_reloj"]
        : ["asentir", "cruzar_brazos", "pensar", "dudar", "manos_cadera", "asentir", "enumerar"];
      const h = (k) => R[(k * 7 + a.id.length * 3 + n.length) % R.length];
      a.pasos = [{ cuando: null, t: 2.4, accion: h(1) }, { cuando: null, t: 5.2, accion: h(2) === h(1) ? h(3) : h(2) }, { cuando: null, t: 8.2, accion: a.accion === "hablar" ? h(4) : a.accion }];
    }
    for (const a of e.actores) if (a.accion === "llamar" && !a.mano) a.mano = "telefono_antiguo";
    for (const a of e.actores) if (e.habla !== a.id && a.mano === "bebe" && a.accion === "cargar" && !(a.pasos ?? []).length) a.pasos = [{ cuando: null, t: 4, accion: "caminar", hacia: [a.x + (a.x < 0 ? 0.8 : -0.8), a.z + 0.3] }, { cuando: null, t: 5.5, accion: "cargar" }];
    // ---- la calle siempre con gente ----
    if (L === "calle" && !e.multitudes.some((m) => m.tipo === "transeuntes")) e.multitudes.push(...decorado({ motor: "calle", gente: [{ tipo: "transeuntes", cantidad: 16, accion: "marchar" }] }).multitudes);
  });
  return cambios;
};
