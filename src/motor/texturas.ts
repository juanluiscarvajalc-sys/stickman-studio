// Texturas fotográficas CC0 (Poly Haven, ver public/texturas/LICENCIAS.md). Se cargan una vez antes de dibujar
// (Historia.tsx espera con delayRender) y el motor las usa si están; si faltan, vuelve a las pintadas por código.
import * as THREE from "three";
import { staticFile } from "remotion";

const LISTA = {
  muro: "castle_wall_varriation.jpg", roca: "aerial_rocks_02.jpg", monte: "aerial_grass_rock.jpg", pasto: "leafy_grass.jpg",
  adoquin: "cobblestone_floor_08.jpg", camino: "grass_path_2.jpg", cieloDia: "cielo_dia.jpg", cieloAtardecer: "cielo_atardecer.jpg",
} as const;
export type ClaveTex = keyof typeof LISTA;
const BASE: Partial<Record<ClaveTex, THREE.Texture>> = {};
let promesa: Promise<void> | null = null;

export const cargarTexturas = () => promesa ??= Promise.all((Object.keys(LISTA) as ClaveTex[]).map((k) =>
  new THREE.TextureLoader().loadAsync(staticFile("texturas/" + LISTA[k])).then((t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; BASE[k] = t;
  }).catch(() => { /* sin esa textura: se usa la pintada */ }))).then(() => undefined);

/** copia con su propia repetición, o null si no se cargó */
export const foto = (k: ClaveTex, rx = 1, ry = rx) => {
  const b = BASE[k]; if (!b) return null;
  const c = b.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c;
};
export const hayFoto = (k: ClaveTex) => !!BASE[k];

// ---------------- fondos fotográficos por escena (Pollinations, ver pipeline/fondos.mjs) ----------------
const FONDOS = new Map<string, { tex: THREE.Texture; cielo: string; suelo: string }>();
const promF = new Map<string, Promise<void>>();
/** color medio de una franja de la imagen (para empalmar el cielo de arriba y el suelo de abajo) */
const colorFranja = (img: HTMLImageElement, y0: number, y1: number) => {
  const c = document.createElement("canvas"); c.width = 32; c.height = 32; const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0, 32, 32); const d = g.getImageData(0, Math.floor(y0 * 32), 32, Math.max(1, Math.floor((y1 - y0) * 32))).data;
  let r = 0, gg = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
  return "#" + new THREE.Color().setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace).getHexString();
};
export const cargarFondos = (rutas: string[]) => Promise.all(rutas.filter(Boolean).map((ruta) => {
  let p = promF.get(ruta);
  if (!p) {
    p = new THREE.TextureLoader().loadAsync(staticFile(ruta)).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.MirroredRepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
      const img = t.image as HTMLImageElement;
      FONDOS.set(ruta, { tex: t, cielo: colorFranja(img, 0, 0.08), suelo: colorFranja(img, 0.9, 1) });
    }).catch(() => { /* sin fondo: paisaje 3D */ });
    promF.set(ruta, p);
  }
  return p;
})).then(() => undefined);
export const fondoDe = (ruta?: string | null) => (ruta ? FONDOS.get(ruta) ?? null : null);
