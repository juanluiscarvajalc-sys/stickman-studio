// Imagen maestra de los personajes recurrentes de la serie (AGENTE_4/personajes/personajes_fijos.json) → AGENTE_4/personajes/personajes_fijos.jpg
// Uso: node agentes/hoja_fijos.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validarPlan } from "./validar.mjs";
import { personajesFijos } from "./preproduccion.mjs";
import { hoja, invalidarPaquete } from "../pipeline/render.mjs";
import { carpetaPersonajes } from "./estudio.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fijos = personajesFijos().map(({ busca, ...p }) => p);
const plan = { epoca: 2026, personajes: fijos.map((p) => ({ ...p })), escenas: [] };
validarPlan(plan);
const personajes = plan.personajes.map((p, i) => ({ ...p, sexo: fijos[i].sexo, porque: fijos[i].porque, expresionesTipicas: fijos[i].expresionesTipicas, objetoTipico: fijos[i].objetoTipico }));
invalidarPaquete?.();
const salida = path.join(carpetaPersonajes(), "personajes_fijos.jpg");
await hoja({ props: { titulo: "Stickman: Expedientes Criminales — personajes recurrentes", personajes, notas: {} }, salida, escala: 0.75 });
console.log("listo:", salida);
