// Dónde viven los materiales fijos de la serie (biblia visual, personajes recurrentes, plantillas):
// C:\Users\usuario1\Downloads\Estudio_Contenido\Stickman_Expedientes\AGENTE_4 (o ESTUDIO_SERIE en .env).
// Si no existe, se usa la carpeta guiones/ del estudio.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SERIE = process.env.ESTUDIO_SERIE || path.resolve(RAIZ, "..", "Estudio_Contenido", "Stickman_Expedientes");
const AG = path.join(SERIE, "AGENTE_4");

/** ruta de un material de la serie: primero en AGENTE_4/<sub>/<nombre>, si no en guiones/<nombre> */
export const material = (sub, nombre) => {
  const a = path.join(AG, sub, nombre);
  return fs.existsSync(a) ? a : path.join(RAIZ, "guiones", nombre);
};
export const rutaBibliaVisual = () => material("biblia_visual", "biblia_visual.md");
export const rutaPersonajesFijos = () => material("personajes", "personajes_fijos.json");
export const carpetaPersonajes = () => (fs.existsSync(path.join(AG, "personajes")) ? path.join(AG, "personajes") : path.join(RAIZ, "guiones"));
