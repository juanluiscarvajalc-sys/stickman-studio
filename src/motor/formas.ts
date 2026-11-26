// Formas irregulares: nada de cubos, esferas ni conos perfectos. Cada geometría se subdivide y sus vértices se
// desplazan con ruido 3D que depende de la POSICIÓN (no del índice), así los vértices repetidos en las aristas se
// mueven igual y no se abren grietas. Más texturas de piedra para muros y torres, y detalle para montañas.
import * as THREE from "three";
import { ctex, jit } from "./paint";

const h3 = (x: number, y: number, z: number, s: number) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 19.3) * 43758.5453; return v - Math.floor(v); };
const n3 = (x: number, y: number, z: number, s: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => h3(xi + dx, yi + dy, zi + dz, s);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
};
export const ruido3 = (x: number, y: number, z: number, s: number) => n3(x, y, z, s) * 0.6 + n3(x * 2.3, y * 2.3, z * 2.3, s + 7) * 0.3 + n3(x * 5.1, y * 5.1, z * 5.1, s + 13) * 0.1;

/** desplaza los vértices: radial desde el centro (bolas, rocas) o por eje (cajas: amp por eje) */
export const irregular = (g: THREE.BufferGeometry, amp: number | [number, number, number], freq = 1.5, seed = 1, radial = true) => {
  const p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
  const [ax, ay, az] = typeof amp === "number" ? [amp, amp, amp] : amp;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = ruido3(v.x * freq, v.y * freq, v.z * freq, seed) - 0.5;
    if (radial) { const L = v.length() || 1; v.multiplyScalar(1 + (n * 2 * ax) / Math.max(L, 0.3)); }
    else { v.x += (ruido3(v.x * freq + 5, v.y * freq, v.z * freq, seed + 1) - 0.5) * 2 * ax; v.y += n * 2 * ay; v.z += (ruido3(v.x * freq, v.y * freq + 9, v.z * freq, seed + 2) - 0.5) * 2 * az; }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  p.needsUpdate = true; g.computeVertexNormals(); return g;
};

const cache = new Map<string, THREE.BufferGeometry>();
const una = (k: string, f: () => THREE.BufferGeometry) => { let g = cache.get(k); if (!g) { g = f(); cache.set(k, g); } return g; };
/** copa de árbol: bola abollada (4 variantes) */
export const copaGeo = (v: number) => una("copa" + (v % 4), () => irregular(new THREE.IcosahedronGeometry(1, 4), 0.22, 1.7, 3 + (v % 4) * 11));
/** roca: piedra facetada e irregular */
export const rocaGeo = (v: number) => una("roca" + (v % 5), () => irregular(new THREE.IcosahedronGeometry(1, 2), 0.32, 1.3, 40 + (v % 5) * 7).scale(1, 0.7, 1).translate(0, 0.45, 0));
/** caja con caras abolladas (paredes, tablas, cajones): amp por eje, en metros relativos a la caja unitaria */
export const cajaGeo = (key: string, sx: number, sy: number, sz: number, amp: [number, number, number], freq = 2.5) =>
  una("caja" + key, () => irregular(new THREE.BoxGeometry(1, 1, 1, sx, sy, sz), amp, freq, key.length * 3, false));
/** cilindro irregular (troncos, torres, barriles) */
export const cilGeo = (key: string, rt: number, rb: number, seg: number, alt: number, amp: number) =>
  una("cil" + key, () => irregular(new THREE.CylinderGeometry(rt, rb, 1, seg, alt), [amp, amp * 0.3, amp], 3, key.length * 5, false));
/** falda de pino con borde dentado e irregular */
export const faldaGeo = (v: number) => una("falda" + (v % 3), () => {
  const c = new THREE.ConeGeometry(0.5, 1, 16, 3, true), p = c.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
    const k = 1 + (y < -0.45 ? 0.16 * Math.sin(a * 9 + v) + 0.1 * (h3(Math.round(a * 20), 0, 0, v) - 0.5) : 0) + (ruido3(x * 3, y * 3, z * 3, v) - 0.5) * 0.25;
    p.setXYZ(i, x * k, y - (y < -0.45 ? 0.08 * Math.abs(Math.sin(a * 9 + v)) : 0), z * k);
  }
  c.computeVertexNormals(); return c;
});

type G = CanvasRenderingContext2D;
const U = (r: () => number, a: number, b: number) => a + (b - a) * r();
/** muro de bloques de piedra gris (como la referencia): hileras de bloques rectangulares de anchos distintos,
 *  junta oscura fina, bisel claro arriba, grietas y musgo; abajo más sucio y con musgo verde */
export const piedraMuroTex = () => ctex("piedraMuro", 1024, 1024, (g, r) => {
  const S = 1024, filas = 8, H = S / filas;
  g.fillStyle = "#5d6068"; g.fillRect(0, 0, S, S);
  const cols = ["#a3a6ad", "#959aa3", "#adb0b5", "#8c9099", "#9ea0a4", "#b4b4b2", "#9a9790"];
  for (let f = 0; f < filas; f++) {
    let x = -U(r, 0, 120);
    while (x < S) {
      const w = U(r, 110, 200), c = jit(r, cols[Math.floor(r() * cols.length)], 0.08, 5, 0.25), y = f * H;
      for (const ox of [0, -S, S]) {
        const X = x + ox + 3, Y = y + 3, W = w - 6, Hh = H - 6;
        if (X + W < 0 || X > S) continue;
        g.fillStyle = c; g.beginPath(); g.moveTo(X + 4, Y); g.lineTo(X + W - 3, Y + U(r, -1, 2)); g.lineTo(X + W, Y + Hh - 3); g.lineTo(X + W - 5, Y + Hh); g.lineTo(X + 2, Y + Hh - U(r, 0, 3)); g.lineTo(X, Y + 4); g.closePath(); g.fill();
        g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(X + 3, Y + 1, W - 8, 5);
        g.fillStyle = "rgba(0,0,0,0.16)"; g.fillRect(X + 3, Y + Hh - 6, W - 8, 6);
        for (let k = 0; k < 5; k++) { g.fillStyle = r() < 0.5 ? "rgba(60,60,66,0.18)" : "rgba(255,255,255,0.12)"; g.beginPath(); g.ellipse(X + U(r, 8, W - 8), Y + U(r, 8, Hh - 8), U(r, 6, 22), U(r, 3, 9), 0, 0, 6.3); g.fill(); }
        if (r() < 0.2) { g.strokeStyle = "rgba(40,40,46,0.5)"; g.lineWidth = 2; g.beginPath(); let cx = X + U(r, 10, W - 10), cy = Y + 4; g.moveTo(cx, cy); for (let k = 0; k < 4; k++) { cx += U(r, -12, 12); cy += Hh / 5; g.lineTo(cx, cy); } g.stroke(); }
      }
      x += w;
    }
  }
  // suciedad y musgo hacia abajo (la textura se repite en alto: la fila de abajo es la del pie del muro)
  const gr = g.createLinearGradient(0, S * 0.55, 0, S); gr.addColorStop(0, "rgba(70,80,50,0)"); gr.addColorStop(1, "rgba(70,90,40,0.35)");
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) { const x = r() * S, y = S * (0.7 + 0.3 * r()); g.fillStyle = ["rgba(96,130,60,0.55)", "rgba(120,150,70,0.5)", "rgba(70,100,45,0.5)"][i % 3]; g.beginPath(); g.ellipse(x, y, U(r, 4, 16), U(r, 2, 7), 0, 0, 6.3); g.fill(); }
});

/** detalle de montaña (gris, se multiplica por el color de vértice): bosque en motitas, vetas de roca, cárcavas */
export const monteTex = () => ctex("monteDetalle", 1024, 1024, (g, r) => {
  const S = 1024; g.fillStyle = "#ffffff"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) { const x = r() * S, y = r() * S, s = U(r, 2, 6); g.fillStyle = r() < 0.7 ? `rgba(30,50,25,${U(r, 0.25, 0.55)})` : "rgba(255,255,240,0.35)"; g.beginPath(); g.arc(x, y, s, 0, 6.3); g.fill(); }
  g.lineCap = "round";
  for (let i = 0; i < 120; i++) { let x = r() * S, y = r() * S; g.strokeStyle = r() < 0.6 ? "rgba(70,70,80,0.35)" : "rgba(255,255,255,0.4)"; g.lineWidth = U(r, 1.5, 4); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += U(r, -14, 14); y += U(r, 10, 30); g.lineTo(x, y); } g.stroke(); }
});

/** nube pintada suave (cúmulo): bolas difusas, arriba blanca y abajo sombreada; para tarjetas que miran a cámara */
export const nubeTex = (v: number, pal: { lit: string; mid: string; shade: string }) => ctex(`nubeSuave${v}_${pal.lit}`, 512, 256, (g, r0) => {
  let s = v * 977 + 13; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; void r0;
  const W = 512, H = 256, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const m = cv.getContext("2d")!;
  const nb = 26;
  for (let i = 0; i < nb; i++) {
    const t = r(), cx = 70 + t * (W - 140), cen = 1 - Math.abs(t - 0.5) * 1.5, rad = U(r, 30, 70) * (0.6 + cen * 0.6), cy = H - 50 - cen * U(r, 20, 90) - rad * 0.3;
    const gr = m.createRadialGradient(cx, cy, 0, cx, cy, rad); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.75, "rgba(255,255,255,0.95)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    m.fillStyle = gr; m.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  m.globalCompositeOperation = "destination-out"; const fl = m.createLinearGradient(0, H - 60, 0, H - 20); fl.addColorStop(0, "rgba(0,0,0,0)"); fl.addColorStop(1, "rgba(0,0,0,1)"); m.fillStyle = fl; m.fillRect(0, H - 60, W, 60);
  m.globalCompositeOperation = "source-atop";
  const col = m.createLinearGradient(0, 30, 0, H - 30); col.addColorStop(0, pal.lit); col.addColorStop(0.55, pal.mid); col.addColorStop(1, pal.shade);
  m.fillStyle = col; m.fillRect(0, 0, W, H);
  for (let i = 0; i < 18; i++) { const cx = U(r, 60, W - 60), cy = U(r, 40, H - 80), rad = U(r, 20, 50); const gr = m.createRadialGradient(cx - rad * 0.3, cy - rad * 0.4, 0, cx, cy, rad); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); m.fillStyle = gr; m.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); }
  g.drawImage(cv, 0, 0);
});
