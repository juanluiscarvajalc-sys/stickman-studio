// Suelos y paisaje con el nivel de detalle de la referencia: césped de hojas sueltas (instancias), tierra con
// huellas de carreta y piedritas, adoquín de época, losas de patio de castillo, campos de cultivo en parches a lo
// lejos con setos, colinas y montañas de relieve real (con bruma por distancia) y nubes con volumen.
import * as THREE from "three";
import { ctex, jit } from "./paint";
import { twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { monteTex, nubeTex } from "./formas";
import { foto } from "./texturas";
import type { Lugar } from "./plan";

type G = CanvasRenderingContext2D; type R = () => number;
const U = (r: R, a: number, b: number) => a + (b - a) * r();
const TAU = Math.PI * 2;
const pick = <T,>(r: R, a: T[]) => a[Math.floor(r() * a.length) % a.length];
const wrap2 = (S: number, x: number, y: number, rad: number, fn: (x: number, y: number) => void) => {
  for (const ox of [0, -S, S]) for (const oy of [0, -S, S]) { const X = x + ox, Y = y + oy; if (X + rad > 0 && X - rad < S && Y + rad > 0 && Y - rad < S) fn(X, Y); }
};
const blotch = (g: G, x: number, y: number, rad: number, sx: number, rgb: string, a: number) => {
  g.save(); g.translate(x, y); g.scale(sx, 1);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(-rad, -rad, rad * 2, rad * 2); g.restore();
};
const rgb = (hex: string) => { const c = new THREE.Color(hex); return `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`; };
/** piedra redondeada irregular (polígono suave) */
const piedra = (g: G, r: R, cx: number, cy: number, rx: number, ry: number) => {
  const n = 9, pts: [number, number][] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, k = U(r, 0.82, 1.08); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  g.beginPath(); g.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  g.closePath();
};

// ---------------- paletas de césped por lugar ----------------
export type Pasto = { base: string; luz: string; sombra: string; hojas: string[]; flores: string[] };
export const PASTO: Record<string, Pasto> = {
  campo: { base: "#74b23e", luz: "#9ccc52", sombra: "#4f8f33", hojas: ["#5e9e32", "#78b43e", "#8cc449", "#a6d45a", "#4c8a2c"], flores: ["#f7f3e8", "#f4d24a", "#f3a9bb"] },
  granja: { base: "#86b448", luz: "#b2cc5a", sombra: "#5f9238", hojas: ["#6ea23a", "#8ab846", "#a3c656", "#c4c866", "#5a8e32"], flores: ["#f4d24a", "#f7f3e8"] },
  bosque: { base: "#4f8a38", luz: "#6fa448", sombra: "#335f2c", hojas: ["#3e7430", "#4f8a38", "#5f9a40", "#2f6228", "#76a84a"], flores: ["#f7f3e8", "#b08ad8"] },
  montana: { base: "#7aa64a", luz: "#a4bc62", sombra: "#55803a", hojas: ["#6a9a3e", "#88ae4c", "#a8be5e", "#b8b870", "#557e36"], flores: ["#f7f3e8", "#b08ad8", "#f4d24a"] },
  pueblo: { base: "#6eae3c", luz: "#96c850", sombra: "#4c8a30", hojas: ["#5a9a32", "#74b03c", "#8ac24a", "#4a862c"], flores: ["#f7f3e8", "#f4d24a", "#f3a9bb", "#e86a5a"] },
  castillo: { base: "#6aa83a", luz: "#90c24c", sombra: "#4a842e", hojas: ["#568f30", "#6eaa3a", "#86bc48", "#467e2a"], flores: ["#f7f3e8", "#f4d24a"] },
  playa: { base: "#9ab45a", luz: "#b8c46a", sombra: "#748c44", hojas: ["#8aa850", "#a8b860", "#c0c070"], flores: [] },
  desierto: { base: "#b8a45e", luz: "#d0bc72", sombra: "#8e7c46", hojas: ["#a49650", "#bcae64", "#8a8a48"], flores: [] },
};

/** césped pintado: manchas grandes de luz y sombra (variación amplia, como la referencia), matas cortas y florecitas */
export const cespedTex = (lugar: string) => ctex("cesped_" + lugar, 1024, 1024, (g, r) => {
  const P = PASTO[lugar] ?? PASTO.campo, S = 1024;
  g.fillStyle = P.base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 22; i++) { const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 120, 340), l = r() > 0.5;
    wrap2(S, x, y, rad * 1.5, (xx, yy) => blotch(g, xx, yy, rad, 1.5, rgb(l ? P.luz : P.sombra), U(r, 0.3, 0.55))); }
  for (let i = 0; i < 260; i++) { const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 14, 40);
    wrap2(S, x, y, rad, (xx, yy) => blotch(g, xx, yy, rad, 1.6, rgb(pick(r, P.hojas)), 0.35)); }
  g.lineCap = "round";
  for (let i = 0; i < 4200; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), h = U(r, 8, 20), lean = U(r, -5, 5), c = pick(r, P.hojas);
    wrap2(S, x, y, 24, (xx, yy) => {
      g.strokeStyle = c; g.lineWidth = U(r, 1.5, 2.6); g.globalAlpha = 0.75;
      g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + lean * 0.3, yy - h * 0.6, xx + lean, yy - h); g.stroke();
    });
  }
  g.globalAlpha = 1;
  for (let i = 0; i < (P.flores.length ? 40 : 0); i++) { const x = U(r, 0, S), y = U(r, 0, S), c = pick(r, P.flores);
    wrap2(S, x, y, 8, (xx, yy) => { g.fillStyle = c; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(xx + Math.cos(k * 1.26) * 3, yy + Math.sin(k * 1.26) * 3, 2.4, 0, TAU); g.fill(); }
      g.fillStyle = "#f0b830"; g.beginPath(); g.arc(xx, yy, 1.8, 0, TAU); g.fill(); }); }
});

/** camino de tierra (u = ancho, v = largo): huellas de rueda, lomo central con matas, piedritas, bordes con pasto */
export const caminoTex = (lugar: string) => ctex("camino_" + lugar, 512, 1024, (g, r) => {
  const W = 512, H = 1024, P = PASTO[lugar] ?? PASTO.campo;
  const base = lugar === "desierto" || lugar === "playa" ? "#d2ad72" : lugar === "bosque" ? "#9a7650" : "#c49058";
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) { const x = U(r, 40, W - 40), y = U(r, 0, H), rad = U(r, 30, 90), d = r() < 0.6;
    for (const oy of [0, -H, H]) blotch(g, x, y + oy, rad, 0.7, d ? "120,84,50" : "236,206,150", U(r, 0.12, 0.25)); }
  // huellas de rueda: dos bandas más oscuras y hundidas, con borde claro
  for (const u of [0.3, 0.7]) {
    const gr = g.createLinearGradient(W * (u - 0.07), 0, W * (u + 0.07), 0);
    gr.addColorStop(0, "rgba(255,236,200,0)"); gr.addColorStop(0.25, "rgba(255,236,200,0.25)"); gr.addColorStop(0.45, "rgba(110,72,40,0.35)");
    gr.addColorStop(0.6, "rgba(110,72,40,0.3)"); gr.addColorStop(1, "rgba(110,72,40,0)");
    g.fillStyle = gr; g.fillRect(W * (u - 0.07), 0, W * 0.14, H);
  }
  // matas en el lomo central y en los bordes
  g.lineCap = "round";
  for (let i = 0; i < 900; i++) {
    const side = r(), x = side < 0.25 ? U(r, W * 0.44, W * 0.56) : side < 0.62 ? U(r, 0, W * 0.12) : U(r, W * 0.88, W);
    const y = U(r, 0, H), h = U(r, 6, 18), c = pick(r, P.hojas);
    for (const oy of [0, -H, H]) { g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + oy); g.lineTo(x + U(r, -4, 4), y + oy - h); g.stroke(); }
  }
  for (let i = 0; i < 380; i++) { const x = U(r, 30, W - 30), y = U(r, 0, H), rx = U(r, 2, 6), d = r() < 0.35;
    for (const oy of [0, -H, H]) { g.fillStyle = d ? "rgba(96,70,46,0.6)" : pick(r, ["#efe0c2", "#e2cfaa", "#d8c4a0"]); g.beginPath(); g.ellipse(x, y + oy, rx, rx * 0.7, 0, 0, TAU); g.fill(); } }
});

/** adoquín de época: piedras redondeadas irregulares en tonos grises y pardos, juntas de tierra con musgo */
export const adoquinTex = () => ctex("adoquinEpoca2", 1024, 1024, (g, r) => {
  const S = 1024, N = 15, C = S / N;
  g.fillStyle = "#857a6c"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 160; i++) { const x = U(r, 0, S), y = U(r, 0, S); wrap2(S, x, y, 10, (xx, yy) => { g.fillStyle = pick(r, ["rgba(90,120,60,0.6)", "rgba(70,60,48,0.6)", "rgba(110,140,70,0.5)"]); g.beginPath(); g.arc(xx, yy, U(r, 3, 7), 0, TAU); g.fill(); }); }
  const cols = ["#a89c8c", "#9e9384", "#b0a493", "#a3988a", "#999389", "#a59b8f", "#ada290", "#9b968f"];
  for (let row = 0; row < N; row++) for (let col = 0; col < N; col++) {
    const cx = (col + 0.5 + (row % 2) * 0.5) * C + U(r, -6, 6), cy = (row + 0.5) * C + U(r, -5, 5);
    const rx = C * U(r, 0.47, 0.53), ry = C * U(r, 0.45, 0.52), c = jit(r, pick(r, cols), 0.12, 8, 0.25);
    const seed = r() * 1e6;
    wrap2(S, cx, cy, C, (xx, yy) => {
      const rr2 = (() => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s % 10000) / 10000; }; })();
      piedra(g, rr2, xx, yy, rx, ry); g.fillStyle = c; g.fill();
      g.save(); piedra(g, rr2, xx, yy, rx, ry); g.clip();
      const gr = g.createLinearGradient(xx - rx, yy - ry, xx + rx, yy + ry);
      gr.addColorStop(0, "rgba(255,248,232,0.16)"); gr.addColorStop(0.5, "rgba(255,248,232,0)"); gr.addColorStop(1, "rgba(50,40,30,0.18)");
      g.fillStyle = gr; g.fillRect(xx - rx, yy - ry, rx * 2, ry * 2);
      g.restore();
    });
  }
  for (let i = 0; i < 26; i++) { const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 60, 200), d = r() < 0.6;
    wrap2(S, x, y, rad * 1.3, (xx, yy) => blotch(g, xx, yy, rad, 1.3, d ? "70,55,40" : "255,240,215", d ? 0.12 : 0.08)); }
});

/** losas de patio (castillo): hileras desfasadas de piedras rectangulares, junta fina, bisel claro, grietas y musgo */
export const losasTex = () => ctex("losasPatio", 1024, 1024, (g, r) => {
  const S = 1024, rows = 6, H = S / rows;
  g.fillStyle = "#7a6e68"; g.fillRect(0, 0, S, S);
  const cols = ["#c4b6b3", "#b5a8a5", "#a79998", "#cdbdb0", "#bfb3a4", "#b0a69a"];
  for (let row = 0; row < rows; row++) {
    let x = U(r, -120, 0);
    while (x < S) {
      const w = U(r, 120, 260), c = jit(r, pick(r, cols), 0.08, 6, 0.2), y = row * H;
      for (const ox of [0, -S, S]) {
        const X = x + ox + 2.5, Y = y + 2.5, Wd = w - 5, Hd = H - 5;
        if (X + Wd < 0 || X > S) continue;
        g.fillStyle = c; g.fillRect(X, Y, Wd, Hd);
        g.fillStyle = "rgba(255,250,240,0.22)"; g.fillRect(X, Y, Wd, 5); g.fillRect(X, Y, 4, Hd);
        g.fillStyle = "rgba(60,50,50,0.18)"; g.fillRect(X, Y + Hd - 5, Wd, 5);
        for (let k = 0; k < 3; k++) blotch(g, X + U(r, 0, Wd), Y + U(r, 0, Hd), U(r, 20, 60), 1.4, r() < 0.5 ? "90,80,80" : "255,255,250", 0.08);
        if (r() < 0.25) { g.strokeStyle = "rgba(70,60,60,0.45)"; g.lineWidth = 1.6; g.beginPath(); let cx = X + U(r, 10, Wd - 10), cy = Y + 6; g.moveTo(cx, cy); for (let k = 0; k < 5; k++) { cx += U(r, -14, 14); cy += Hd / 6; g.lineTo(cx, cy); } g.stroke(); }
      }
      x += w;
    }
  }
  for (let i = 0; i < 220; i++) { const row = Math.floor(r() * rows), x = U(r, 0, S); wrap2(S, x, row * H, 8, (xx, yy) => { g.fillStyle = pick(r, ["rgba(96,130,60,0.75)", "rgba(120,150,70,0.7)"]); g.beginPath(); g.ellipse(xx, yy, U(r, 4, 12), U(r, 2, 4), 0, 0, TAU); g.fill(); }); }
});

/** arena con ondas */
export const arenaTex = () => ctex("arenaOndas", 1024, 1024, (g, r) => {
  const S = 1024; g.fillStyle = "#e6c890"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 24; i++) { const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 100, 300), l = r() < 0.5;
    wrap2(S, x, y, rad * 1.5, (xx, yy) => blotch(g, xx, yy, rad, 1.5, l ? "250,232,190" : "200,160,105", 0.3)); }
  g.lineWidth = 3;
  for (let i = 0; i < 70; i++) { const y = U(r, 0, S), a = U(r, 6, 14), ph = U(r, 0, TAU);
    for (const oy of [0, -S, S]) { g.strokeStyle = "rgba(190,150,96,0.35)"; g.beginPath(); for (let x = 0; x <= S; x += 16) { const yy = y + oy + Math.sin(x / 90 + ph) * a; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke();
      g.strokeStyle = "rgba(255,244,215,0.4)"; g.beginPath(); for (let x = 0; x <= S; x += 16) { const yy = y + oy - 4 + Math.sin(x / 90 + ph) * a; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); } }
  for (let i = 0; i < 300; i++) { const x = U(r, 0, S), y = U(r, 0, S); g.fillStyle = pick(r, ["rgba(170,130,90,0.5)", "rgba(255,245,225,0.6)"]); g.beginPath(); g.arc(x, y, U(r, 1.5, 3.5), 0, TAU); g.fill(); }
});

/** campos de cultivo vistos de lejos: parches de colores con surcos, setos oscuros en los bordes y caminos */
export const camposTex = (lugar: string) => ctex("campos_" + lugar, 2048, 2048, (g, r) => {
  const S = 2048, P = PASTO[lugar] ?? PASTO.campo;
  g.fillStyle = P.base; g.fillRect(0, 0, S, S);
  const colores = ["#7cb442", "#94c450", "#e2c45e", "#d8b04a", "#a07448", "#6aa23a", "#b6cc5c", "#c9a456", "#8cbc4a"];
  const N = 7, C = S / N;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x0 = i * C + U(r, -30, 30), y0 = j * C + U(r, -30, 30), w = C * U(r, 0.85, 1.1), h = C * U(r, 0.85, 1.1);
    const c = pick(r, colores), ang = r() < 0.5 ? 0 : Math.PI / 2 + U(r, -0.3, 0.3);
    g.save(); g.translate(x0 + w / 2, y0 + h / 2); g.rotate(U(r, -0.25, 0.25));
    g.fillStyle = c; g.fillRect(-w / 2, -h / 2, w, h);
    g.rotate(ang); g.strokeStyle = "rgba(0,0,0,0.09)"; g.lineWidth = 6;
    for (let s = -w; s < w; s += 22) { g.beginPath(); g.moveTo(s, -h); g.lineTo(s, h); g.stroke(); }
    g.restore();
    // seto en el borde: puntos verde oscuro
    g.fillStyle = "#2f5a26";
    for (let k = 0; k < 26; k++) { g.beginPath(); g.arc(x0 + (k / 26) * w, y0 + U(r, -4, 4), U(r, 6, 11), 0, TAU); g.fill(); }
    if (r() < 0.5) for (let k = 0; k < 26; k++) { g.beginPath(); g.arc(x0 + U(r, -4, 4), y0 + (k / 26) * h, U(r, 6, 11), 0, TAU); g.fill(); }
  }
  g.strokeStyle = "#c9a06a"; g.lineWidth = 16; g.lineCap = "round";
  for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(U(r, 0, S), 0); g.bezierCurveTo(U(r, 0, S), S / 3, U(r, 0, S), (2 * S) / 3, U(r, 0, S), S); g.stroke(); }
});

/** máscara de borde irregular para discos de suelo (plaza, patio): blanco dentro, transparente fuera */
export const bordeTex = (key: string) => ctex("borde_" + key, 512, 512, (g, r) => {
  g.fillStyle = "#000"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#fff"; g.beginPath();
  for (let i = 0; i <= 72; i++) { const a = (i / 72) * TAU, rad = 236 * (0.9 + 0.06 * Math.sin(a * 5 + 1) + 0.04 * (r() - 0.5)); const x = 256 + Math.cos(a) * rad, y = 256 + Math.sin(a) * rad; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.fill();
});

// ---------------- ruido para el relieve ----------------
const h2 = (x: number, y: number, s: number) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
const vnoise = (x: number, y: number, s: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
export const fbm = (x: number, y: number, s: number, oct = 5) => { let f = 0, a = 0.5, k = 1; for (let i = 0; i < oct; i++) { f += a * vnoise(x * k, y * k, s + i * 17); k *= 2.03; a *= 0.5; } return f; };
const ridged = (x: number, y: number, s: number) => { let f = 0, a = 0.55, k = 1; for (let i = 0; i < 5; i++) { f += a * (1 - Math.abs(2 * vnoise(x * k, y * k, s + i * 31) - 1)) ** 2; k *= 2.1; a *= 0.5; } return f; };

const TERR = new Map<string, THREE.Material>();
/** relieve en anillo alrededor del escenario: colinas cerca, montañas con roca y nieve lejos (según el lugar) */
const anillo = (lugar: Lugar, seed: number, R0: number, R1: number, NA: number, NR: number, cerca: boolean) => {
  const montes = ["montana", "castillo", "bosque", "desierto"].includes(lugar) ? 1 : ["campo", "granja", "pueblo"].includes(lugar) ? 0.6 : 0;
  const desierto = lugar === "desierto";
  const pos = new Float32Array(NA * NR * 3), colr = new Float32Array(NA * NR * 3), uv = new Float32Array(NA * NR * 2);
  const P = PASTO[lugar] ?? PASTO.campo;
  // laderas: verde de bosque con manchas; roca gris-lavanda en lo empinado; nieve en las cumbres (paleta de la referencia)
  const cG = new THREE.Color(P.base), cG2 = new THREE.Color(cerca ? P.sombra : "#3f7a3a"), cF = new THREE.Color("#2f5e30");
  const cR = new THREE.Color(desierto ? "#c98e58" : "#9a96a0"), cR2 = new THREE.Color(desierto ? "#a86e40" : "#6f6c7c"), cS = new THREE.Color("#f2f5fb");
  const tmp = new THREE.Color();
  for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) {
    const a = (i / (NA - 1)) * TAU, t = j / (NR - 1), rr = R0 + (R1 - R0) * t * t;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr - 6;
    const env = THREE.MathUtils.smoothstep(rr, 62, 102);
    const col = fbm(x / 70, z / 70, seed, 5) * 28 * env;                               // colinas suaves
    const env2 = THREE.MathUtils.smoothstep(rr, 150, 300);
    const mon = ridged(x / 110, z / 110, seed + 9) * 180 * env2 * montes;              // montañas con crestas
    const y = col + mon - 3 * (1 - env);
    const k = (j * NA + i) * 3; pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
    const sc = cerca ? 300 : 70;
    uv[(j * NA + i) * 2] = x / sc + 0.5; uv[(j * NA + i) * 2 + 1] = (z + y * 0.6) / sc + 0.5;
    const roca = THREE.MathUtils.smoothstep(mon, 14, 50) * THREE.MathUtils.smoothstep(ridged(x / 30, z / 30, seed + 2), 0.15, 0.4);
    tmp.copy(cG).lerp(cG2, fbm(x / 25, z / 25, seed + 3, 3) * 0.9);
    if (!cerca) tmp.lerp(cF, THREE.MathUtils.smoothstep(fbm(x / 18, z / 18, seed + 8, 3), 0.45, 0.62) * 0.8);   // manchas de bosque
    tmp.lerp(cR, roca).lerp(cR2, roca * fbm(x / 9, z / 9, seed + 5, 3) * 0.8);
    if (!desierto && montes > 0.6) tmp.lerp(cS, THREE.MathUtils.smoothstep(y + fbm(x / 8, z / 8, seed + 6, 2) * 25, 110, 140));
    colr[k] = tmp.r; colr[k + 1] = tmp.g; colr[k + 2] = tmp.b;
  }
  const idx: number[] = [];
  for (let j = 0; j < NR - 1; j++) for (let i = 0; i < NA - 1; i++) { const a = j * NA + i, b = a + 1, c = a + NA, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(colr, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const key = "terr_" + lugar + cerca + (foto("monte") ? "f" : "");
  let m = TERR.get(key);
  if (!m) {
    const usaCampos = cerca && ["campo", "granja", "pueblo", "castillo", "montana"].includes(lugar);
    const det = foto("monte", 1, 1) ?? monteTex(); det.repeat.set(1, 1);
    m = twoTone(new THREE.MeshLambertMaterial({ vertexColors: true, map: usaCampos ? camposTex(lugar) : det }));
    TERR.set(key, m);
  }
  const mesh = new THREE.Mesh(geo, m); mesh.receiveShadow = true; mesh.layers.set(NOINK);
  return mesh;
};
/** relieve: anillo cercano (colinas con campos de cultivo) y anillo lejano (montañas con bosque, roca y nieve) */
export const relieve = (lugar: Lugar, seed: number) => {
  const g = new THREE.Group();
  g.add(anillo(lugar, seed, 62, 165, 360, 30, true));
  g.add(anillo(lugar, seed, 160, 460, 420, 46, false));
  return g;
};

// ---------------- césped de hojas sueltas ----------------
let MATA: THREE.BufferGeometry | null = null;
const mataGeo = () => {
  if (MATA) return MATA;
  const P: number[] = [], C: number[] = [], N: number[] = [];
  const blades = 16;
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * TAU + Math.sin(b * 7.1) * 0.6, d = 0.04 + 0.08 * ((b * 0.37) % 1);
    const bx = Math.cos(a) * d * 1.4, bz = Math.sin(a) * d * 1.4, h = 0.28 + 0.26 * ((b * 0.61) % 1), w = 0.017;
    const lx = Math.cos(a) * 0.35 * h, lz = Math.sin(a) * 0.35 * h;   // se abren hacia afuera
    const px = -Math.sin(a), pz = Math.cos(a);
    const seg = [[0, 1], [0.5, 0.7], [1, 0]] as const;               // (altura relativa, ancho relativo)
    for (let s = 0; s < 2; s++) {
      const [y0, w0] = seg[s], [y1, w1] = seg[s + 1];
      const q = (yy: number, ww: number, side: number) => [bx + lx * yy * yy + px * w * ww * side, yy * h, bz + lz * yy * yy + pz * w * ww * side];
      const v = [q(y0, w0, -1), q(y0, w0, 1), q(y1, w1, -1), q(y1, w1, 1)];
      const sh = (yy: number) => 0.32 + 0.68 * yy;                   // base oscura, punta clara
      for (const [vi, yy] of [[0, y0], [1, y0], [2, y1], [1, y0], [3, y1], [2, y1]] as const) { P.push(...v[vi]); C.push(sh(yy), sh(yy), sh(yy)); N.push(0, 1, 0); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  MATA = g; return g;
};
export const PASTO_U = { uTime: { value: 0 } };
let MAT_MATA: THREE.Material | null = null;
const mataMat = () => {
  if (MAT_MATA) return MAT_MATA;
  const m = twoTone(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, rd) => {
    prev(sh, rd);
    Object.assign(sh.uniforms, PASTO_U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vec4 wp0 = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float sway = sin(uTime * 1.7 + wp0.x * 0.35 + wp0.z * 0.27) * 0.06 + sin(uTime * 3.1 + wp0.x) * 0.02;
        transformed.x += sway * position.y * position.y * 8.0;
        // las matas pegadas a la lente se encogen (no tapan la toma)
        float dc = length(wp0.xyz - cameraPosition);
        transformed *= smoothstep(0.9, 2.4, dc);`);
  };
  m.customProgramCacheKey = () => "mata3";
  MAT_MATA = m; return m;
};
/** siembra matas de pasto donde zona(x, z) devuelve una altura > 0 */
export const cesped = (lugar: string, r: R, zona: (x: number, z: number) => number, n = 16000, radio = 40) => {
  const P = PASTO[lugar] ?? PASTO.campo;
  const im = new THREE.InstancedMesh(mataGeo(), mataMat(), n);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), e = new THREE.Euler();
  let k = 0;
  for (let i = 0; i < n * 4 && k < n; i++) {
    // más densas cerca del escenario (donde mira la cámara)
    const d = 1.5 + Math.pow(r(), 1.6) * radio, a = r() * TAU, x = Math.cos(a) * d, z = Math.sin(a) * d - 3;
    const hz = zona(x, z); if (hz <= 0) continue;
    if (fbm(x / 6, z / 6, 3, 2) < 0.33 && r() < 0.7) continue;                      // claros: la hierba va en manchones
    const s = U(r, 0.7, 1.25) * hz;
    e.set(U(r, -0.12, 0.12), r() * TAU, U(r, -0.12, 0.12)); q.setFromEuler(e);
    M.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s * U(r, 0.8, 1.3), s * U(r, 0.7, 1.4), s * U(r, 0.8, 1.3)));
    im.setMatrixAt(k, M); im.setColorAt(k, c.set(pick(r, P.hojas)).multiplyScalar(1.25)); k++;
  }
  im.count = k; im.castShadow = false; im.receiveShadow = true; im.layers.set(NOINK); im.frustumCulled = false;
  return im;
};

// ---------------- árboles lejanos (setos y arboledas) ----------------
export const arboleda = (lugar: string, r: R, libre: (x: number, z: number) => boolean, n = 420) => {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const pino = lugar === "bosque" || lugar === "montana";
  const geo = pino ? new THREE.ConeGeometry(0.8, 2.6, 7).translate(0, 1.3, 0) : g.translate(0, 1, 0);
  const im = new THREE.InstancedMesh(geo, twoTone(new THREE.MeshLambertMaterial({ color: "#ffffff" })), n);
  const M = new THREE.Matrix4(), c = new THREE.Color(), tonos = pino ? ["#2f6a3a", "#3a7a44", "#285e34"] : ["#3f7f30", "#4e8f36", "#5c9a3c", "#36702c"];
  let k = 0;
  // hileras (setos) y grupos
  for (let i = 0; i < 60 && k < n; i++) {
    const a0 = r() * TAU, d0 = U(r, 40, 180), x0 = Math.cos(a0) * d0, z0 = Math.sin(a0) * d0 - 6, ang = r() * TAU, len = U(r, 6, 22), fila = r() < 0.6;
    for (let j = 0; j < len && k < n; j++) {
      const x = fila ? x0 + Math.cos(ang) * j * 2.6 : x0 + U(r, -8, 8), z = fila ? z0 + Math.sin(ang) * j * 2.6 : z0 + U(r, -8, 8);
      if (!libre(x, z)) continue;
      const s = U(r, 1.6, 3.2);
      M.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s * U(r, 0.9, 1.4), s));
      im.setMatrixAt(k, M); im.setColorAt(k, c.set(pick(r, tonos))); k++;
    }
  }
  im.count = k; im.castShadow = false; im.layers.set(NOINK);
  return im;
};

// ---------------- nubes con volumen ----------------
const NUBE_U = { uLit: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uSh: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3(0, 1, 0) } };
let NUBE_M: THREE.ShaderMaterial | null = null;
const nubeMat = () => NUBE_M ??= new THREE.ShaderMaterial({
  uniforms: NUBE_U, fog: false,
  vertexShader: "varying vec3 vN; varying float vY; void main(){ vN = normalize(mat3(modelMatrix) * normal); vY = normal.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: `uniform vec3 uLit, uMid, uSh, uSun; varying vec3 vN; varying float vY;
    void main(){ float l = dot(normalize(vN), normalize(uSun)) * 0.5 + 0.5; float up = vN.y * 0.5 + 0.5;
      float k = clamp(l * 0.45 + up * 0.7 - 0.1, 0.0, 1.0);
      vec3 c = mix(uSh, uMid, smoothstep(0.0, 0.55, k)); c = mix(c, uLit, smoothstep(0.45, 1.0, k));
      gl_FragColor = vec4(c, 1.0); }`,
});
/** nubes suaves pintadas (cúmulos difusos con base plana), siempre de frente a la cámara */
export const nubes = (r: R, pal: { lit: string; mid: string; shade: string }, n = 12) => {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: nubeTex(i % 6, pal), transparent: true, depthWrite: false, fog: false, toneMapped: false }));
    const a = Math.PI * U(r, 0.05, 0.95), d = U(r, 480, 820), w = U(r, 150, 300);
    sp.position.set(Math.cos(a) * d, U(r, 90, 210), -Math.sin(a) * d); sp.scale.set(w, w * 0.5, 1);
    sp.layers.set(NOINK); sp.renderOrder = -0.8; g.add(sp);
  }
  return g;
};
export const nubesLuz = (pal: { lit: string; mid: string; shade: string }, sun: THREE.Vector3) => {
  untone(pal.lit, NUBE_U.uLit.value); untone(pal.mid, NUBE_U.uMid.value); untone(pal.shade, NUBE_U.uSh.value); NUBE_U.uSun.value.copy(sun);
};

// ---------------- bosques lejanos y bruma por capas ----------------
const montesDe = (lugar: Lugar) => ["montana", "castillo", "bosque", "desierto"].includes(lugar) ? 1 : ["campo", "granja", "pueblo"].includes(lugar) ? 0.6 : 0;
/** altura del relieve en (x, z): la misma fórmula del anillo */
export const alturaEn = (lugar: Lugar, seed: number, x: number, z: number) => {
  const rr = Math.hypot(x, z + 6);
  const env = THREE.MathUtils.smoothstep(rr, 62, 102), env2 = THREE.MathUtils.smoothstep(rr, 150, 300);
  return { y: fbm(x / 70, z / 70, seed, 5) * 28 * env + ridged(x / 110, z / 110, seed + 9) * 180 * env2 * montesDe(lugar) - 3 * (1 - env), mon: ridged(x / 110, z / 110, seed + 9) * 180 * env2 * montesDe(lugar) };
};
/** miles de árboles sobre las laderas, en manchas de bosque (como el bosque en motitas de la referencia) */
export const bosqueLejano = (lugar: Lugar, seed: number, r: R) => {
  if (lugar === "desierto" || lugar === "playa" || lugar === "ciudad" || lugar === "interior") return null;
  const n = lugar === "bosque" || lugar === "montana" ? 9000 : 6000;
  const pino = new THREE.ConeGeometry(1, 3.2, 6).translate(0, 1.6, 0), copa = new THREE.IcosahedronGeometry(1.3, 1).translate(0, 1.7, 0);
  const mat = twoTone(new THREE.MeshLambertMaterial({ color: "#ffffff" }));
  const grupos = [new THREE.InstancedMesh(pino, mat, n), new THREE.InstancedMesh(copa, mat, n)];
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), k = [0, 0];
  const tonos = [["#2a5a30", "#335f34", "#24502c", "#3a6a3a"], ["#3f7a34", "#4a8638", "#356c2e", "#5a9040"]];
  for (let i = 0; i < n * 6 && k[0] + k[1] < n; i++) {
    const a = r() * TAU, d = 75 + Math.pow(r(), 0.8) * 330, x = Math.cos(a) * d, z = Math.sin(a) * d - 6;
    if (fbm(x / 40, z / 40, seed + 21, 3) < 0.47) continue;                                  // solo en manchas de bosque
    const { y, mon } = alturaEn(lugar, seed, x, z);
    if (mon > 45 || y > 100) continue;                                                       // no sobre roca ni nieve
    const t = r() < (lugar === "bosque" || lugar === "montana" || d > 200 ? 0.75 : 0.35) ? 0 : 1;
    const s = (1.4 + r() * 1.6) * (d > 220 ? 1.6 : 1);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * TAU);
    M.compose(new THREE.Vector3(x, y - 0.5, z), q, new THREE.Vector3(s, s * (0.8 + r() * 0.5), s));
    grupos[t].setMatrixAt(k[t], M); grupos[t].setColorAt(k[t], c.set(tonos[t][Math.floor(r() * 4)])); k[t]++;
  }
  const g = new THREE.Group();
  grupos.forEach((im, i) => { im.count = k[i]; im.castShadow = false; im.receiveShadow = false; im.layers.set(NOINK); im.frustumCulled = false; g.add(im); });
  return g;
};
/** velos de bruma entre los anillos del paisaje: lo lejano se aclara hacia el color del horizonte por capas */
export const brumas = () => {
  const tex = ctex("brumaGrad", 8, 256, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.55, "rgba(255,255,255,0.35)"); gr.addColorStop(0.9, "rgba(255,255,255,0.6)"); gr.addColorStop(1, "rgba(255,255,255,0.6)");
    g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
  });
  const g = new THREE.Group(), mats: THREE.MeshBasicMaterial[] = [];
  for (const [R, H, a] of [[150, 45, 0.3], [240, 90, 0.38], [340, 140, 0.5]] as const) {
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, side: THREE.BackSide, opacity: a, toneMapped: true });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 96, 1, true), m); cyl.position.set(0, H / 2 - 4, -6); cyl.layers.set(NOINK); cyl.renderOrder = -0.5;
    g.add(cyl); mats.push(m);
  }
  return { g, mats };
};
