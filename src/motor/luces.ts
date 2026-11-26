// Luz por hora del día: día y atardecer vienen medidos de la plantilla (lights.ts); la noche es nuestra
// (luna fría, sombras azul profundo, faroles y fogatas cálidos que el bloom hace brillar).
import { LIGHTS, LOOK, LightPreset, WorldLook } from "./lights";
import type { Hora } from "./plan";

const NOCHE: LightPreset = {
  az: 55, el: 38,
  lit: [0.56, 0.64, 1.0], shade: [0.17, 0.18, 0.36], lift: [0.05, 0.06, 0.12], lambert: 0.35, sideK: 0.84, term: 0.2,
  charTint: [0.86, 0.9, 1.04], charShade: 0.86, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.8, 0.82, 1.0],
  blob: [0.55, 0.55, 0.7], actorShadow: false,
  top: "#0b1430", hor: "#2a3a6a", skyCurve: [0.0, 0.5, 0.6], fog: "#3d5290", fogNear: 28, fogFar: 260, sunDisc: "#000000",
  sunCol: "#b8c8ff", sunI: 1.6, sky: "#22305a", ground: "#141a2a", hemiI: 0.35,
  bias: -0.00025, normalBias: 0.015,
};
const NOCHE_LOOK: WorldLook = {
  sky: { c: ["#5470b2", "#415d9f", "#304a88", "#22386e", "#14234a"], e: [0, 3, 9, 18, 45] },
  water: { near: "#16305a", mid: "#122650", far: "#1a2c58", crest: "#5f7fc0", trough: "#0a1838", glint: "#dfe8ff", shade: [0.5, 0.56, 0.72] },
  cloud: { lit: "#7f90c4", mid: "#62739f", shade: "#43517d" },
  bounce: [0, 0, 0],
  sat: 1.0,
};

const AMANECER: LightPreset = { ...LIGHTS.golden, az: -118, el: 13, lit: [1.42, 0.98, 0.82], shade: [0.24, 0.27, 0.46], lift: [0.05, 0.06, 0.15],
  charTint: [1.0, 0.86, 0.8], fog: "#eec3b6", fogNear: 40, fogFar: 380, sunCol: "#ffc0a0", sunI: 4.6, sunDisc: "#ffe0c8" };
const AMANECER_LOOK: WorldLook = { ...LOOK.golden, sky: { c: ["#ffd7b8", "#f8bfae", "#d7aec6", "#9fb0d8", "#6286c4"], e: [0, 4, 10, 20, 42] },
  cloud: { lit: "#ffe2d0", mid: "#f2b8b8", shade: "#a99ac8" } };
export type Luz = { L: LightPreset; K: WorldLook; grade: "day" | "golden" | "noir"; nombre: "day" | "golden" | "night" };
export const LUZ: Record<Hora, Luz> = {
  dia: { L: { ...LIGHTS.day, az: 112, el: 36 }, K: LOOK.day, grade: "day", nombre: "day" },
  amanecer: { L: AMANECER, K: AMANECER_LOOK, grade: "golden", nombre: "golden" },
  // sol de atardecer más alto y de lado (la plantilla lo ponía casi a contraluz, relativo a su cámara)
  atardecer: { L: { ...LIGHTS.golden, az: 128, el: 15 }, K: LOOK.golden, grade: "golden", nombre: "golden" },
  noche: { L: NOCHE, K: NOCHE_LOOK, grade: "golden", nombre: "night" },
};
