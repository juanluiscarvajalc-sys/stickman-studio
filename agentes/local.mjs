// Agentes de respaldo SIN DeepSeek (reglas simples). Sirven para probar todo el flujo sin gastar nada;
// el resultado es mucho más básico que con los agentes reales.
import { C } from "./catalogo.mjs";

const sinTilde = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PALETA = [["#3f6fb5", "gorra", "#c0353a"], ["#c25a7a", "pelo", "#5a3b2a"], ["#2f7a5a", "sombrero_copa", "#2a2a33"], ["#f08a2c", "pelo", "#2a201a"], ["#7b5ac9", "bonete", "#d9a441"]];
const PIEL = ["#f5c9a0", "#ffe2c2", "#ecd0b6", "#c99067"];
const NOMUNES = new Set(["El", "La", "Los", "Las", "Un", "Una", "Esa", "Ese", "Este", "Esta", "Pero", "Por", "Fijate", "Fíjate", "Y", "Cuando", "En", "Al", "Con", "Sin", "Era", "Hace", "Todos", "Nadie", "Entonces", "Así", "Asi", "Hoy", "Ahora", "Luego", "De", "Del", "Si", "No", "Imagina", "Imagínate"]);

const PISTAS = [
  [/(bosques?|arboles|selva)/, "bosque"], [/(castillos?|murallas?|rey|reina|fortaleza|caballeros?)/, "castillo"], [/(ciudad|calles?|edificios?)/, "ciudad"],
  [/(playa|mar|isla|barcos?)/, "playa"], [/(desierto|arena|camellos?)/, "desierto"], [/(montanas?|monte|cima|nieve)/, "montana"],
  [/(dentro de|cocina|cuarto|habitacion|sala|taller)/, "interior"], [/(granja|vacas?|cosecha|gallinas?)/, "granja"], [/(pueblo|aldea|plaza|mercado|vecinos)/, "pueblo"],
];
const ACC = [[/corri|corre|huy/, "correr"], [/camin|lleg|fue a|se fue/, "caminar"], [/cay|tropez|desplom/, "caer"], [/rio|rieron|carcaj|celebr|grit.*alegr/, "celebrar"],
  [/dijo|pregunt|grit|explic|respond/, "hablar"], [/sorpren|asust|no pod.a creer|horror/, "sorpresa"], [/sent/, "sentado"], [/carg|llev|sostuv/, "cargar"], [/señal|senal|apunt/, "senalar"], [/pens|se pregunt/, "pensar"]];
const EXP = { correr: "nervioso", caminar: "neutral", caer: "mareado", celebrar: "risa", hablar: "sonrisa", sorpresa: "sorpresa", sentado: "neutral", cargar: "feliz", senalar: "feliz", pensar: "serio", parado: "neutral" };
const CAMS = ["acercamiento", "paneo_der", "orbita", "contrapicado", "alejamiento", "paneo_izq", "grua_sube"];

export const organizarLocal = (guion) => {
  const frases = guion.replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]*/g)?.map((s) => s.trim()).filter((s) => s.length > 2) ?? [];
  const nombres = [];
  for (const f of frases) for (const m of f.matchAll(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})\b/g)) if (!NOMUNES.has(m[1]) && !nombres.includes(m[1])) nombres.push(m[1]);
  if (!nombres.length) nombres.push("Pablo");
  const personajes = nombres.slice(0, 4).map((n, i) => ({ id: sinTilde(n), nombre: n, complexion: "adulto", piel: PIEL[i % 4], camisa: PALETA[i % 5][0], pantalon: "#3b3f52",
    zapatos: "#4a3426", sombrero: PALETA[i % 5][1], colorSombrero: PALETA[i % 5][2], vestido: null, bigote: i === 0 ? "#4a3426" : null, cinturon: null }));
  let lugar = "pueblo", hora = "dia";
  const escenas = frases.map((f, i) => {
    const s = sinTilde(f);
    for (const [re, l] of PISTAS) if (re.test(s)) { lugar = l; break; }
    if (/noche|luna|oscur/.test(s)) hora = "noche"; else if (/atardec|tarde|ocaso/.test(s)) hora = "atardecer"; else if (/manana|amanec|dia siguiente/.test(s)) hora = "dia";
    let presentes = personajes.filter((p) => s.includes(sinTilde(p.nombre)));
    if (!presentes.length) presentes = [personajes[i % personajes.length]];
    let accion = "hablar";
    for (const [re, a] of ACC) if (re.test(s)) { accion = a; break; }
    const actores = presentes.slice(0, 3).map((p, k) => {
      const x = (k - (presentes.length - 1) / 2) * 1.8;
      return { id: p.id, x: accion === "caminar" || accion === "correr" ? x - 2.5 : x, z: k % 2 ? -0.6 : 0, accion: k ? (accion === "hablar" ? "parado" : accion) : accion,
        expresion: EXP[accion] ?? "neutral", hacia: accion === "caminar" || accion === "correr" ? [x + 2.5, 0] : null, luego: null };
    });
    const objetos = lugar === "interior" ? [{ tipo: "mesa", x: 2.6, z: -2 }] : lugar === "pueblo" ? [{ tipo: "casa", x: -5, z: -6, giro: 0.4 }, { tipo: "barril", x: 3, z: -1.5 }] : [];
    return { id: i + 1, narracion: f, ambiente: { lugar, hora }, actores, objetos,
      camara: { tipo: accion === "caminar" || accion === "correr" ? "seguimiento" : CAMS[i % CAMS.length], plano: actores.length > 1 ? "general" : i % 3 === 0 ? "medio" : "primer_plano", objetivo: actores.length > 1 ? "grupo" : actores[0].id },
      transicion: i === 0 ? "corte" : i === 1 ? "destello" : "fundido", efectos: accion === "caer" ? [{ tipo: "polvo", t: 0.6, actor: actores[0].id }] : accion === "sorpresa" ? [{ tipo: "signo", t: 0.2, actor: actores[0].id }] : [] };
  });
  return { titulo: frases[0]?.slice(0, 40) ?? "Historia", personajes, escenas };
};
export { C };
