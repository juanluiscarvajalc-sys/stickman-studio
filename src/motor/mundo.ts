// Mundo 3D procedural por escena: cielo, niebla, sol con sombras, suelo pintado, escenografía según el lugar
// y los objetos que pidió el diseñador. Todo con materiales twoTone (shade.ts) para que la tinta y la luz
// tengan el mismo look que las plantillas. El escenario de los actores es un círculo de ~6 m en el origen;
// la cámara vive del lado +z, así que la escenografía nunca se pone en ese cono (no tapa a nadie).
import * as THREE from "three";
import { twoTone, untone, TONE, CHAR } from "./shade";
import { NOINK } from "./ink";
import { ctex, rep, grassHD, cobbleHD, planksHD, stoneHD, roofHD, facadeHD, cloudHD, CLOUD_DAY, CLOUD_GOLD, rng, jit } from "./paint";
import { LUZ, Luz } from "./luces";
import { Fuente, fijarCalidas } from "./calida";
import { fuego, humo, FUEGO_U } from "./fuego";
import { foto, fondoDe } from "./texturas";
import { copaGeo, rocaGeo, cajaGeo, cilGeo, faldaGeo, piedraMuroTex } from "./formas";
import { cespedTex, caminoTex, adoquinTex, losasTex, arenaTex, bordeTex, relieve, cesped, arboleda, nubes, PASTO_U, bosqueLejano, brumas } from "./suelos";
import type { Escena, Lugar, Objeto, TipoObjeto, Material } from "./plan";
import { clamp01, esInterior, semillaTexto } from "./plan";
import type { Clima } from "./plan";
import { crearEpoca, asfaltoTex, concretoTex } from "./epoca";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------- materiales (cacheados) ----------------
const MATS = new Map<string, THREE.Material>();
const mat = (key: string, make: () => THREE.MeshLambertMaterialParameters, liftK = 1) => {
  let m = MATS.get(key);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(make()), liftK); MATS.set(key, m); }
  return m;
};
const col = (c: string) => mat("c" + c, () => ({ color: c }));
const glow = (c: string, k = 3) => {
  const key = "g" + c + k;
  let m = MATS.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: true }); m.userData.glow = true; MATS.set(key, m); }
  return m;
};

const sand = () => ctex("arena", 1024, 1024, (g, r) => {
  g.fillStyle = "#e8c98a"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) {
    const x = r() * 1024, y = r() * 1024, s = 2 + r() * 7;
    g.fillStyle = r() < 0.5 ? "rgba(190,150,90,0.35)" : "rgba(255,240,200,0.4)";
    g.beginPath(); g.ellipse(x, y, s * 2, s, 0, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = "rgba(170,130,80,0.35)"; g.lineWidth = 4;
  for (let i = 0; i < 26; i++) { const y = r() * 1024; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(300, y - 30, 700, y + 30, 1024, y); g.stroke(); }
});
const dirt = () => ctex("tierra", 1024, 1024, (g, r) => {
  g.fillStyle = "#b48a5c"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 1800; i++) {
    const x = r() * 1024, y = r() * 1024, s = 3 + r() * 10;
    g.fillStyle = ["rgba(140,100,64,0.45)", "rgba(205,170,120,0.45)", "rgba(120,86,56,0.35)"][i % 3];
    g.beginPath(); g.ellipse(x, y, s * 1.4, s, r() * 3, 0, Math.PI * 2); g.fill();
  }
});
const snow = () => ctex("nieve", 512, 512, (g, r) => {
  g.fillStyle = "#eef3fb"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 600; i++) { g.fillStyle = "rgba(180,195,230,0.35)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 8 + r() * 14, 4 + r() * 6, 0, 0, Math.PI * 2); g.fill(); }
});

const haloTex = () => ctex("haloLuna", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.12, "rgba(255,255,255,0.45)"); gr.addColorStop(0.4, "rgba(255,255,255,0.1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const crust = () => ctex("corteza", 512, 512, (g, r) => {
  g.fillStyle = "#d39a52"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = ["rgba(160,95,40,0.45)", "rgba(240,200,130,0.5)", "rgba(120,70,30,0.35)"][i % 3];
    g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 9, 2 + r() * 5, r() * 3, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = "rgba(110,60,25,0.55)"; g.lineWidth = 6;
  for (let i = 0; i < 6; i++) { const y = 40 + i * 80; g.beginPath(); g.moveTo(60, y); g.quadraticCurveTo(256, y - 30, 452, y + 10); g.stroke(); }
});
const cheese = () => ctex("queso", 512, 512, (g, r) => {
  g.fillStyle = "#f2c84b"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { const x = r() * 512, y = r() * 512, s = 8 + r() * 26; g.fillStyle = "#d9a52a"; g.beginPath(); g.arc(x, y, s, 0, 6.3); g.fill(); g.fillStyle = "#c08a1e"; g.beginPath(); g.arc(x + s * 0.2, y + s * 0.2, s * 0.7, 0, 6.3); g.fill(); }
});
const MATERIAL: Record<Exclude<Material, "normal">, () => THREE.Material> = {
  pan: () => mat("m_pan", () => ({ map: rep(crust(), 1, 1) })),
  oro: () => glow("#ffd24a", 1.15),
  hielo: () => col("#bfe6f5"),
  madera: () => col("#b07a48"),
  piedra: () => mat("m_piedra", () => ({ map: rep(stoneHD(), 2, 2) })),
  chocolate: () => col("#6b3a22"),
  queso: () => mat("m_queso", () => ({ map: rep(cheese(), 1, 1) })),
};
const aplicarMaterial = (o: THREE.Object3D, m: Material) => {
  if (m === "normal" || !MATERIAL[m as Exclude<Material, "normal">]) return;
  const mm = MATERIAL[m as Exclude<Material, "normal">]();
  o.traverse((c) => { if (c instanceof THREE.Mesh && !(c.material instanceof THREE.MeshBasicMaterial && m !== "oro")) c.material = mm; });
};

// ---------------- piezas de escenografía ----------------
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o;
};
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14),
  cone: new THREE.ConeGeometry(0.5, 1, 14),
  ico: new THREE.IcosahedronGeometry(1, 1),
  dode: new THREE.DodecahedronGeometry(1, 0),
  sph: new THREE.SphereGeometry(1, 18, 12),
  blob: new THREE.SphereGeometry(1, 14, 10),
  falda: (() => { const c = new THREE.ConeGeometry(0.5, 1, 12, 1, true); const p = c.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) { const k = 1 + 0.12 * Math.sin(i * 2.7); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); p.setY(i, p.getY(i) - 0.06 * (i % 2)); } c.computeVertexNormals(); return c; })(),
};
const prism = () => {
  const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 0.5); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); return g;
};
const PRISM = prism();
const LEAF = ["#5fae3a", "#4f9e33", "#6cbb45", "#7cc24a"];


// ---------------- luz cálida y decoración (sets densos) ----------------
/** hora de la escena que se está construyendo (las casas encienden ventanas de noche) */
let NOCHE = false;
/** estilo de cine negro (episodios policiales): árboles en silueta, calles mojadas, luz fría y faroles */
let NOIR = false;
/** interior con la luz apagada (las lámparas del decorado no brillan) */
let OSCURO = false;
/** marca una fuente de luz cálida (calida.ts) dentro de una pieza */
const llamaTex = () => ctex("llama", 256, 384, (g) => {
  const gota = (cx: number, base: number, w: number, h: number, c: string) => {
    g.beginPath(); g.moveTo(cx, base - h);
    g.bezierCurveTo(cx + w * 0.15, base - h * 0.62, cx + w * 0.62, base - h * 0.5, cx + w * 0.5, base - h * 0.2);
    g.bezierCurveTo(cx + w * 0.42, base + 2, cx - w * 0.42, base + 2, cx - w * 0.5, base - h * 0.2);
    g.bezierCurveTo(cx - w * 0.62, base - h * 0.5, cx - w * 0.15, base - h * 0.62, cx, base - h);
    g.fillStyle = c; g.fill();
  };
  gota(128, 380, 230, 360, "#e8481c"); gota(92, 372, 110, 230, "#e8481c"); gota(168, 372, 110, 250, "#e8481c");
  gota(128, 372, 170, 270, "#ff8a1e"); gota(128, 366, 110, 180, "#ffc62e"); gota(128, 360, 56, 100, "#fff2a8");
});
/** llama de caricatura (sin tinta, no la apaga la luz de la escena) apoyada en (x, y, z) */
const llama = (g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number) => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: llamaTex(), transparent: true, alphaTest: 0.05, toneMapped: false, fog: false, depthWrite: false }));
  sp.center.set(0.5, 0); sp.position.set(x, y, z); sp.scale.set(w, h, 1); sp.layers.set(NOINK); sp.renderOrder = 2.5; g.add(sp); return sp;
};
/** halo aditivo que mira siempre a la cámara (fuego, faroles) */
const halo = (g: THREE.Object3D, x: number, y: number, z: number, hex: string, s: number, k = 0.8) => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(hex).multiplyScalar(k), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sp.position.set(x, y, z); sp.scale.setScalar(s); sp.layers.set(NOINK); sp.renderOrder = 2; g.add(sp); return sp;
};
const calida = (g: THREE.Object3D, x: number, y: number, z: number, hex: string, i: number, r: number, flick = 0) => {
  const o = new THREE.Object3D(); o.position.set(x, y, z); o.userData.calida = { col: new THREE.Color(hex), i, r, flick }; g.add(o); return o;
};
const lona = (a: string, b: string) => ctex("lona" + a + b, 256, 256, (g) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 32, 0, 32, 256); }
  g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, 226, 256, 30);
});
const tabla = (fondo: string, icono: number) => ctex("tabla" + fondo + icono, 256, 160, (g) => {
  g.fillStyle = "#6e4a30"; g.fillRect(0, 0, 256, 160); g.fillStyle = fondo; g.fillRect(12, 12, 232, 136);
  g.strokeStyle = "rgba(60,35,20,0.6)"; g.lineWidth = 4; g.strokeRect(20, 20, 216, 120);
  g.fillStyle = "#3b2a22"; g.strokeStyle = "#3b2a22"; g.lineWidth = 10; g.lineCap = "round";
  if (icono === 0) { g.beginPath(); g.ellipse(128, 84, 62, 30, 0, 0, 6.3); g.fillStyle = "#c9873c"; g.fill(); g.stroke(); for (const x of [96, 128, 160]) { g.beginPath(); g.moveTo(x - 8, 70); g.lineTo(x + 8, 96); g.stroke(); } }
  else if (icono === 1) { g.fillStyle = "#f2c84b"; g.fillRect(92, 50, 60, 72); g.strokeRect(92, 50, 60, 72); g.beginPath(); g.arc(160, 86, 18, -1.4, 1.4); g.stroke(); g.fillStyle = "#fff"; g.fillRect(92, 44, 60, 14); }
  else if (icono === 2) { g.beginPath(); g.ellipse(120, 82, 50, 24, 0, 0, 6.3); g.fillStyle = "#7fa8d8"; g.fill(); g.stroke(); g.beginPath(); g.moveTo(168, 82); g.lineTo(198, 60); g.lineTo(198, 104); g.closePath(); g.fill(); g.stroke(); }
  else { g.beginPath(); g.moveTo(80, 120); g.lineTo(128, 40); g.lineTo(176, 120); g.closePath(); g.fillStyle = "#d8443a"; g.fill(); g.stroke(); }
});
const emblema = (c: string) => ctex("emblema" + c, 128, 256, (g) => {
  g.fillStyle = c; g.fillRect(0, 0, 128, 256);
  g.fillStyle = "#f2c84b"; g.fillRect(0, 0, 128, 14); g.fillRect(0, 200, 128, 10);
  g.beginPath(); g.moveTo(0, 210); g.lineTo(64, 256); g.lineTo(128, 210); g.fillStyle = c; g.fill();
  g.beginPath(); g.arc(64, 100, 34, 0, 6.3); g.fillStyle = "#f2c84b"; g.fill();
  g.beginPath(); g.moveTo(64, 72); g.lineTo(84, 118); g.lineTo(44, 118); g.closePath(); g.fillStyle = c; g.fill();
});
type Deco = "puesto" | "letrero" | "heno" | "estandarte" | "antorcha" | "flores" | "lenia" | "banco" | "campana" | "maceta" | "cesta" | "tronco";
const deco: Record<Deco, (r: () => number) => THREE.Object3D> = {
  puesto: (r) => {
    const g = new THREE.Group(), wood = col("#9a6a3e");
    const t = mesh(GEO.box, wood, 0, 0.9, 0); t.scale.set(2.6, 0.12, 1.2); g.add(t);
    const f = mesh(GEO.box, col("#8a5a34"), 0, 0.45, 0.55); f.scale.set(2.6, 0.9, 0.08); g.add(f);
    for (const [x, z] of [[-1.25, 0.55], [1.25, 0.55], [-1.25, -0.55], [1.25, -0.55]]) { const p = mesh(GEO.box, wood, x, z > 0 ? 1.15 : 1.35, z); p.scale.set(0.1, z > 0 ? 2.3 : 2.7, 0.1); g.add(p); }
    const [a, b] = [["#d8443a", "#f4ecd8"], ["#3f6fb5", "#f4ecd8"], ["#2f7a5a", "#f2c84b"], ["#e08a2e", "#f4ecd8"]][Math.floor(r() * 4)];
    const aw = mesh(GEO.box, mat("lona" + a, () => ({ map: lona(a, b) })), 0, 2.45, 0.05); aw.scale.set(2.9, 0.06, 1.6); aw.rotation.x = 0.28; g.add(aw);
    const fr = [["#e04a3a", "#f2c84b", "#7cc24a"], ["#d39a52", "#c9873c", "#f2d49a"], ["#7fa8d8", "#c9c4b8", "#e8a07a"]][Math.floor(r() * 3)];
    for (let i = 0; i < 9; i++) { const s = mesh(GEO.sph, col(fr[i % 3]), -1 + (i % 5) * 0.5 + r() * 0.1, 1.05, -0.3 + Math.floor(i / 5) * 0.45); s.scale.setScalar(0.16 + r() * 0.06); g.add(s); }
    return g;
  },
  letrero: (r) => {
    const g = new THREE.Group(), wood = col("#7a4f33");
    const p = mesh(GEO.box, wood, 0, 1.2, 0); p.scale.set(0.12, 2.4, 0.12); g.add(p);
    const fondo = ["#f4ecd8", "#f2d49a", "#d8e6f0"][Math.floor(r() * 3)], ic = Math.floor(r() * 4);
    const t = mesh(GEO.box, [wood, wood, wood, wood, mat("tabla" + fondo + ic, () => ({ map: tabla(fondo, ic) })), wood] as unknown as THREE.Material, 0, 2.1, 0.1);
    t.scale.set(1.3, 0.8, 0.08); g.add(t);
    return g;
  },
  heno: (r) => {
    const g = new THREE.Group(), y = col("#e2b84e");
    for (let i = 0; i < 2 + Math.floor(r() * 2); i++) { const b = mesh(GEO.box, y, (i % 2) * 1.3 - 0.6, 0.4 + (i === 2 ? 0.8 : 0), (r() - 0.5) * 0.2); b.scale.set(1.2, 0.8, 0.8); g.add(b);
      for (const s of [-0.3, 0.3]) { const c = mesh(GEO.box, col("#9a7a2e"), b.position.x + s, b.position.y, 0); c.scale.set(0.05, 0.82, 0.82); g.add(c); } }
    return g;
  },
  estandarte: (r) => {
    const g = new THREE.Group(), c = ["#b5302a", "#2f4f9a", "#2f7a45", "#7a2f7a"][Math.floor(r() * 4)];
    const p = mesh(GEO.cyl, col("#5a3a24"), 0, 2.4, 0); p.scale.set(0.12, 4.8, 0.12); g.add(p);
    const x = mesh(GEO.box, col("#5a3a24"), 0, 4.5, 0.05); x.scale.set(1.3, 0.08, 0.08); g.add(x);
    const b = mesh(GEO.box, mat("emb" + c, () => ({ map: emblema(c) })), 0, 3.4, 0.08); b.scale.set(1.1, 2.2, 0.04); g.add(b);
    const k = new THREE.Mesh(GEO.sph, glow("#f2c84b", 1.1)); k.position.set(0, 4.9, 0); k.scale.setScalar(0.16); g.add(k);
    return g;
  },
  antorcha: () => {
    const g = new THREE.Group();
    const p = mesh(GEO.cyl, col("#5a3a24"), 0, 0.9, 0); p.scale.set(0.12, 1.8, 0.12); g.add(p);
    const cup = mesh(GEO.cone, col("#3a3530"), 0, 1.85, 0); cup.scale.set(0.3, 0.3, 0.3); cup.rotation.x = Math.PI; g.add(cup);
    fuego(g, 0, 1.92, 0, 0.36, true);
    calida(g, 0, 2.3, 0, "#ff9a40", 1.6, 7, 1); halo(g, 0, 2.25, 0, "#ff9a40", 1.5);
    return g;
  },
  flores: (r) => {
    const g = new THREE.Group(), leaf = col(LEAF[Math.floor(r() * 4)]), pc = col(["#f4f1ea", "#f2c84b", "#f5a0b8", "#d8443a", "#b08ad8"][Math.floor(r() * 5)]);
    const m = mesh(GEO.ico, leaf, 0, 0.18, 0); m.scale.set(0.6, 0.25, 0.5); g.add(m);
    for (let i = 0; i < 7; i++) { const s = mesh(GEO.sph, pc, (r() - 0.5) * 1, 0.38 + r() * 0.1, (r() - 0.5) * 0.8); s.scale.setScalar(0.09); s.castShadow = false; g.add(s); }
    return g;
  },
  lenia: (r) => {
    const g = new THREE.Group(), w = col("#8f5d3b");
    for (let i = 0; i < 9; i++) { const row = i < 4 ? 0 : i < 7 ? 1 : 2, k = i - [0, 4, 7][row]; const l = mesh(GEO.cyl, w, -0.6 + k * 0.4 + row * 0.2, 0.18 + row * 0.32, 0); l.scale.set(0.34, 1.2 + r() * 0.2, 0.34); l.rotation.x = Math.PI / 2; g.add(l); }
    return g;
  },
  banco: () => {
    const g = new THREE.Group(), w = col("#a86f42");
    const s = mesh(GEO.box, w, 0, 0.48, 0); s.scale.set(1.8, 0.08, 0.45); g.add(s);
    const b = mesh(GEO.box, w, 0, 0.85, -0.2); b.scale.set(1.8, 0.4, 0.06); g.add(b);
    for (const x of [-0.75, 0.75]) { const l = mesh(GEO.box, col("#2e2f38"), x, 0.24, 0); l.scale.set(0.08, 0.48, 0.42); g.add(l); }
    return g;
  },
  campana: (r) => {
    const g = new THREE.Group(), c = ["#e0d2a8", "#d8c9a0", "#c9b88c"][Math.floor(r() * 3)];
    const osc = "#" + new THREE.Color(c).multiplyScalar(0.82).getHexString();
    const t = mesh(PRISM, mat("carpa" + c, () => ({ map: rep(lona(c, osc), 2, 1) })), 0, 0, 0); t.scale.set(3, 4.4, 3.6); g.add(t);
    const cu = mesh(GEO.cyl, col("#5a3a24"), 0, 2.2, 0); cu.scale.set(0.1, 0.1, 3.9); cu.rotation.x = Math.PI / 2; g.add(cu);
    for (const s of [-1, 1]) { const st = mesh(GEO.box, col("#8a6a44"), s * 1.75, 0.1, 0); st.scale.set(0.08, 0.2, 3.4); g.add(st); }
    const d = mesh(PRISM, col("#3b2a22"), 0, 0, 1.81); d.scale.set(1, 1.6, 0.02); g.add(d);
    const p = mesh(GEO.cyl, col("#5a3a24"), 0, 2.6, 0); p.scale.set(0.06, 1.2, 0.06); g.add(p);
    const fl = mesh(GEO.box, col(["#b5302a", "#2f4f9a"][Math.floor(r() * 2)]), 0.35, 3.0, 0); fl.scale.set(0.7, 0.4, 0.03); g.add(fl);
    return g;
  },
  maceta: (r) => {
    const g = new THREE.Group();
    const p = mesh(GEO.cyl, col("#c2603e"), 0, 0.3, 0); p.scale.set(0.6, 0.6, 0.6); g.add(p);
    const b = mesh(GEO.ico, col(LEAF[Math.floor(r() * 4)]), 0, 0.85, 0); b.scale.setScalar(0.45); g.add(b);
    return g;
  },
  cesta: (r) => {
    const g = new THREE.Group();
    const b = mesh(GEO.cyl, col("#c9a06a"), 0, 0.25, 0); b.scale.set(0.8, 0.5, 0.8); g.add(b);
    const c = ["#e04a3a", "#f2c84b", "#7cc24a", "#d39a52"][Math.floor(r() * 4)];
    for (let i = 0; i < 4; i++) { const s = mesh(GEO.sph, col(c), (i % 2 - 0.5) * 0.3, 0.55, (Math.floor(i / 2) - 0.5) * 0.3); s.scale.setScalar(0.15); g.add(s); }
    return g;
  },
  tronco: (r) => { const l = mesh(GEO.cyl, col("#8f5d3b"), 0, 0.3, 0); l.scale.set(0.6, 2.4 + r(), 0.6); l.rotation.z = Math.PI / 2; return l; },
};


const pickR = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length) % a.length];
const hojasTex = () => ctex("hojasTex", 512, 512, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { const x = r() * 512, y = r() * 512, s = 6 + r() * 12, a = r() * 6.28;
    g.fillStyle = r() < 0.5 ? "rgba(255,255,230,0.35)" : "rgba(30,60,20,0.28)";
    g.beginPath(); g.ellipse(x, y, s, s * 0.45, a, 0, 6.28); g.fill(); }
});
const cortezaTex = () => ctex("cortezaArbol", 128, 256, (g, r) => {
  g.fillStyle = "#8f5d3b"; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 26; i++) { const x = r() * 128; g.strokeStyle = r() < 0.6 ? "rgba(70,40,22,0.6)" : "rgba(190,140,100,0.4)"; g.lineWidth = 2 + r() * 3; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, 80, x - 8, 170, x + 4, 256); g.stroke(); }
});
const pajaTex = () => ctex("pajaTecho", 512, 512, (g, r) => {
  g.fillStyle = "#d49934"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) { const x = r() * 512, y = r() * 512, l = 18 + r() * 30;
    g.strokeStyle = ["rgba(240,189,89,0.8)", "rgba(128,89,61,0.55)", "rgba(200,140,50,0.7)"][i % 3]; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + l); g.stroke(); }
  for (let y = 40; y < 512; y += 64) { g.fillStyle = "rgba(110,70,30,0.35)"; g.fillRect(0, y, 512, 6); }
});

const build = ({
  arbol: (r: () => number) => {
    // copa de bolas suaves con textura de hojas, tronco que se abre en ramas; tres variantes (redondo, álamo, frutal)
    const g = new THREE.Group(), v = r(), alamo = v < 0.22, frutal = v > 0.8, h = alamo ? 2.2 + r() : 1.8 + r() * 1.4;
    const tr = mesh(cilGeo("tronco", 0.13, 0.25, 9, 6, 0.035), mat("tronco", () => ({ map: rep(cortezaTex(), 1, 2) })), 0, h / 2, 0); tr.scale.set(1, h, 1); tr.rotation.z = (r() - 0.5) * 0.12; g.add(tr);
    for (const s of [-1, 1]) { const rb = mesh(cilGeo("rama", 0.05, 0.1, 6, 3, 0.02), col("#7a4f33"), s * 0.35, h * 0.85, 0); rb.scale.set(1, 1.1 + r() * 0.4, 1); rb.rotation.z = -s * (0.55 + r() * 0.4); g.add(rb); }
    const tonos = alamo ? ["#4f8f36", "#5c9a3c", "#467f30"] : ["#5fae3a", "#4f9e33", "#6cbb45", "#7cc24a", "#56a238"];
    const base = tonos[Math.floor(r() * tonos.length)];
    const nb = alamo ? 5 : 7 + Math.floor(r() * 4);
    for (let i = 0; i < nb; i++) {
      const a2 = r() * 6.28, rad = alamo ? 0.25 : i ? 0.75 + r() * 0.45 : 0;
      const s2 = alamo ? 0.95 + r() * 0.3 : 0.75 + r() * 0.6;
      const c = jit(r, base, 0.12, 6, 0.1);
      const m = mesh(copaGeo(Math.floor(r() * 4)), mat("hoja" + c, () => ({ color: c, map: hojasTex() })), Math.cos(a2) * rad, h + (alamo ? 0.4 + i * 0.75 : 0.5 + r() * 1.1), Math.sin(a2) * rad); m.rotation.set(r() * 6, r() * 6, r() * 6);
      m.scale.set(s2, s2 * (alamo ? 1.25 : 0.92), s2); g.add(m);
    }
    if (frutal) for (let i = 0; i < 9; i++) { const a2 = r() * 6.28, f = mesh(GEO.sph, col(["#e04a3a", "#f2a23a"][i % 2]), Math.cos(a2) * 1.25, h + 0.4 + r() * 1.2, Math.sin(a2) * 1.25); f.scale.setScalar(0.12); g.add(f); }
    return g;
  },
  pino: (r) => {
    const g = new THREE.Group(), h = 4 + r() * 3.5;
    const tr = mesh(new THREE.CylinderGeometry(0.12, 0.22, 1, 8), mat("tronco", () => ({ map: rep(cortezaTex(), 1, 2) })), 0, 0.7, 0); tr.scale.set(1, 1.4, 1); g.add(tr);
    const c0 = ["#2f7a45", "#3a8a4e", "#2a6e40", "#357e48"][Math.floor(r() * 4)];
    const pisos = 4 + Math.floor(r() * 2);
    for (let i = 0; i < pisos; i++) {
      const k = i / pisos, c = jit(r, c0, 0.1, 4, 0.1);
      const m = mesh(faldaGeo(i + Math.floor(r() * 3)), mat("pino" + c, () => ({ color: c, map: hojasTex() })), 0, 1.0 + k * h * 0.78 + h * 0.12, 0);
      const s2 = (2.5 - k * 1.9) * (0.9 + r() * 0.2); m.scale.set(s2, h * 0.3, s2); m.rotation.y = r() * 6.28; g.add(m);
    }
    return g;
  },
  arbusto: (r) => {
    const g = new THREE.Group(), c0 = LEAF[Math.floor(r() * 4)];
    for (let i = 0; i < 4; i++) { const c = jit(r, c0, 0.1, 5, 0.1); const m = mesh(copaGeo(i + Math.floor(r() * 4)), mat("hoja" + c, () => ({ color: c, map: hojasTex() })), (i - 1.5) * 0.45, 0.42, (r() - 0.5) * 0.4); m.scale.set(0.6, 0.5, 0.55); m.rotation.y = r() * 6; g.add(m); }
    return g;
  },
  casa: (r, lugar) => {
    // formas, tamaños, colores, techos y estados distintos (paleta de fachadas de la referencia)
    const g = new THREE.Group();
    const forma = pickR(r, ["cabana", "dos_pisos", "dos_pisos", "alta", "ele", "ele", "torreon"]);
    const pisos = forma === "cabana" ? 1 : forma === "alta" ? 3 : 2;
    const w = forma === "alta" ? 3.6 + r() * 1.2 : forma === "cabana" ? 4 + r() * 1.5 : 5 + r() * 2.2;
    const d = forma === "alta" ? 4 + r() : 4.2 + r() * 1.6, h = pisos * 2.8 + 0.4 + r() * 0.5;
    const estado = r() < 0.58 ? "nueva" : r() < 0.82 ? "gastada" : "ruina";
    const PAL = ["#f3e6d2", "#e58e6e", "#df585d", "#a3cdc7", "#e8c070", "#f4f1ea", "#c8b8d8", "#b8d4a0", "#f2c9a0"];
    let wall = pickR(r, PAL);
    if (estado !== "nueva") wall = "#" + new THREE.Color(wall).lerp(new THREE.Color("#8a7a68"), estado === "ruina" ? 0.35 : 0.18).getHexString();
    const sh = pickR(r, ["#3f6fb5", "#2f7a5a", "#a8433a", "#5a7a3a", "#816e89", "#c08a3e"]);
    const ladrillo = r() < 0.15, timber = !ladrillo && r() < 0.35;
    const techo = lugar === "granja" || lugar === "campo" ? pickR(r, ["paja", "paja", "teja"]) : pickR(r, ["teja", "teja", "pizarra", "teja_oscura", "paja"]);
    const cuerpo = (bw: number, bh: number, bd: number, puerta: boolean, key: string) => {
      const fr = facadeHD(`f${key}${wall}${sh}${Math.round(bw)}${Math.round(bh)}${puerta}${ladrillo}${timber}`, bw, bh, { wall, shutter: sh, door: puerta, timber, brick: ladrillo });
      const ld = facadeHD(`l${key}${wall}${sh}${Math.round(bd)}${Math.round(bh)}${ladrillo}${timber}`, bd, bh, { wall, shutter: sh, door: false, timber, brick: ladrillo });
      const mf = mat("fac" + fr.uuid, () => ({ map: fr })), ml = mat("fac" + ld.uuid, () => ({ map: ld }));
      const b = mesh(GEO.box, [ml, ml, col(wall), col(wall), mf, mf] as unknown as THREE.Material, 0, bh / 2, 0); b.scale.set(bw, bh, bd); return b;
    };
    const tejado = (tw: number, th: number, td: number, y: number) => {
      const tm = techo === "paja" ? mat("paja", () => ({ map: rep(pajaTex(), 2, 2) })) : techo === "pizarra" ? mat("pizarra", () => ({ map: rep(roofHD("#8a93a8", true), 2, 2) }))
        : techo === "teja_oscura" ? mat("tejaO", () => ({ map: rep(roofHD("#9a4a3a"), 2, 2) })) : mat("tejaR", () => ({ map: rep(roofHD("#dc8872"), 2, 2) }));
      const t = mesh(PRISM, tm, 0, y, 0); t.scale.set(tw + 0.7, th, td + (techo === "paja" ? 0.9 : 0.5)); return t;
    };
    const body = cuerpo(w, h, d, true, lugar); g.add(body);
    const roofH = techo === "paja" ? 2.6 + r() * 0.8 : 2.0 + r() * 1.2;
    const roof = tejado(w, roofH, d, h);
    if (estado === "ruina") { roof.scale.x *= 0.6; roof.position.x = -w * 0.2; roof.rotation.z = 0.08; }
    g.add(roof);
    if (forma === "ele") { // ala lateral más baja
      const w2 = w * 0.6, h2 = h * 0.72, d2 = d * 0.85;
      const ala = cuerpo(d2, h2, w2, false, lugar + "a"); ala.position.set(w / 2 + d2 / 2 - 0.05, h2 / 2, -d * 0.12); ala.rotation.y = Math.PI / 2; g.add(ala);
      const t2 = tejado(d2, roofH * 0.8, w2, h2); t2.position.set(w / 2 + d2 / 2 - 0.05, h2, -d * 0.12); t2.rotation.y = Math.PI / 2; g.add(t2);
    }
    if (forma === "torreon") {
      const tw = 2.2, th = h + 2.6, tz = mesh(GEO.cyl, col(wall), -w / 2 + 0.6, th / 2, -d / 2 + 0.6); tz.scale.set(tw, th, tw); g.add(tz);
      const cp = mesh(GEO.cone, col(techo === "pizarra" ? "#6c7590" : "#c2553e"), -w / 2 + 0.6, th + 1.1, -d / 2 + 0.6); cp.scale.set(tw * 1.25, 2.4, tw * 1.25); g.add(cp);
      const vt = mesh(GEO.box, col("#5761a8"), -w / 2 + 0.6, th - 1.4, -d / 2 + 0.6 + tw / 2); vt.scale.set(0.5, 0.8, 0.05); g.add(vt);
    }
    // chimenea
    if (r() < 0.7 && estado !== "ruina") { const ch = mesh(GEO.box, ladrillo ? col("#b5543c") : col("#9a8a7a"), w * 0.28, h + roofH * 0.6, -d * 0.15); ch.scale.set(0.55, roofH * 0.9, 0.55); g.add(ch);
      const cap = mesh(GEO.box, col("#5a4a40"), w * 0.28, h + roofH * 1.05, -d * 0.15); cap.scale.set(0.7, 0.12, 0.7); g.add(cap);
      if (r() < 0.6) humo(g, w * 0.28, h + roofH * 1.1, -d * 0.15, 0.9); }
    // toldo sobre la puerta, jardineras con flores, balcón
    const nWin = Math.max(1, Math.floor(w / 2.2)), floorsF = Math.max(1, Math.floor(h / 2.8)), puertaX = ((Math.floor(nWin / 2) + 0.5) * w) / nWin - w / 2;
    if (r() < 0.45) { const [ca, cb] = pickR(r, [["#d8443a", "#f4ecd8"], ["#3f6fb5", "#f4ecd8"], ["#2f7a5a", "#f2c84b"]]);
      const aw = mesh(GEO.box, mat("lona" + ca, () => ({ map: lona(ca, cb) })), puertaX, 2.55, d / 2 + 0.55); aw.scale.set(1.9, 0.05, 1.1); aw.rotation.x = 0.35; g.add(aw); }
    if (estado !== "ruina") for (let fl = 0; fl < floorsF; fl++) for (let i = 0; i < nWin; i++) {
      if ((fl === 0 && i === Math.floor(nWin / 2)) || r() < 0.55) continue;
      const cx = ((i + 0.5) * w) / nWin - w / 2, cy = fl * 2.8 + 0.9;
      const jb = mesh(GEO.box, col("#8a5a34"), cx, cy - 0.05, d / 2 + 0.16); jb.scale.set(1.05, 0.22, 0.3); g.add(jb);
      for (let k = 0; k < 5; k++) { const fc = col(["#e04a3a", "#f2c84b", "#f5a0b8", "#f4f1ea", "#b08ad8"][Math.floor(r() * 5)]); const fl2 = mesh(GEO.sph, fc, cx - 0.4 + k * 0.2, cy + 0.12, d / 2 + 0.18); fl2.scale.setScalar(0.1); fl2.castShadow = false; g.add(fl2); }
    }
    if (pisos >= 2 && r() < 0.35 && estado !== "ruina") {
      const bl = mesh(GEO.box, col("#7a5236"), 0, 2.85, d / 2 + 0.45); bl.scale.set(w * 0.5, 0.12, 0.9); g.add(bl);
      for (let k = 0; k <= 6; k++) { const pb = mesh(GEO.box, col("#6a4528"), -w * 0.25 + (k / 6) * w * 0.5, 3.25, d / 2 + 0.86); pb.scale.set(0.05, 0.7, 0.05); g.add(pb); }
      const rl = mesh(GEO.box, col("#6a4528"), 0, 3.6, d / 2 + 0.86); rl.scale.set(w * 0.5, 0.07, 0.07); g.add(rl);
    }
    // desgaste: parches de ladrillo a la vista, manchas de humedad; ruina: ventanas tapiadas con tablas
    if (estado !== "nueva") for (let k = 0; k < (estado === "ruina" ? 4 : 2); k++) {
      const px = (r() - 0.5) * w * 0.8, py = 0.6 + r() * (h - 1.4);
      const pt = mesh(GEO.box, col(r() < 0.6 ? "#b5543c" : "#8a7a68"), px, py, d / 2 + 0.01); pt.scale.set(0.5 + r() * 0.7, 0.3 + r() * 0.5, 0.02); pt.castShadow = false; g.add(pt);
    }
    if (estado === "ruina") for (let i = 0; i < nWin; i++) {
      if (i === Math.floor(nWin / 2)) continue;
      const cx = ((i + 0.5) * w) / nWin - w / 2;
      for (const [dy, rot] of [[1.35, 0.3], [1.7, -0.25]]) { const tb = mesh(GEO.box, col("#9a7a52"), cx, dy, d / 2 + 0.04); tb.scale.set(1.2, 0.16, 0.04); tb.rotation.z = rot; g.add(tb); }
    }
    if (NOCHE && estado !== "ruina") { // misma grilla de ventanas que facadeHD: la mayoría encendidas, con su charco de luz delante
      const floors = floorsF;
      for (let fl = 0; fl < floors; fl++) for (let i = 0; i < nWin; i++) {
        if (fl === 0 && i === Math.floor(nWin / 2)) {
          const lx = ((i + 0.5) * w) / nWin - w / 2, lm = new THREE.Mesh(GEO.box, glow("#ffd27a", 4)); lm.position.set(lx + 0.75, 2.45, d / 2 + 0.2); lm.scale.set(0.22, 0.3, 0.22); g.add(lm);
          calida(g, lx, 2.3, d / 2 + 1.2, "#ffb860", 1.3, 6, 0.3); continue;
        }
        if (r() < 0.25) continue;
        const cx = ((i + 0.5) * w) / nWin - w / 2, cy = fl * 2.8 + 0.9 + 0.625;
        const win = new THREE.Mesh(GEO.box, glow(r() < 0.5 ? "#ffc46a" : "#ffd98e", 2.4)); win.position.set(cx, cy, d / 2 + 0.012); win.scale.set(0.85, 1.25, 0.01); g.add(win);
        if (fl === 0 || r() < 0.4) calida(g, cx, cy - 0.2, d / 2 + 1.0, "#ffb050", 0.9, 4.5);
      }
    }
    g.userData.chimenea = estado !== "ruina";
    return g;
  },
  torre: () => {
    const g = new THREE.Group();
    const t = mesh(cilGeo("torre", 0.5, 0.54, 28, 12, 0.012), mat("torreGris", () => ({ map: foto("muro", 3.2, 2.6) ?? rep(piedraMuroTex(), 3, 2.4) })), 0, 5, 0); t.scale.set(4, 10, 4); g.add(t);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, b = mesh(cajaGeo("almena" + (i % 3), 3, 3, 2, [0.03, 0.04, 0.03]), mat("almena", () => ({ map: foto("muro", 0.28, 0.25) ?? rep(piedraMuroTex(), 0.3, 0.25) })), Math.cos(a) * 2.05, 10.3, Math.sin(a) * 2.05); b.scale.set(0.7, 0.7, 0.5); b.rotation.y = -a; g.add(b); }
    const c = mesh(GEO.cone, col("#a8433a"), 0, 11.6, 0); c.scale.set(5, 3.4, 5); g.add(c);
    for (const y of [4.2, 7.6]) { const w = new THREE.Mesh(GEO.box, NOCHE ? glow("#ffc46a", 2.6) : col("#2a2430")); w.position.set(0, y, 2.0); w.scale.set(0.7, 1.2, 0.05); g.add(w); }
    if (NOCHE) calida(g, 0, 6, 3.5, "#ffb050", 1.2, 7);
    const fl = mesh(GEO.box, col("#b5302a"), 0.9, 14.6, 0); fl.scale.set(1.6, 0.9, 0.05); g.add(fl);
    const pl = mesh(GEO.cyl, col("#5a3a24"), 0, 14.1, 0); pl.scale.set(0.08, 2.4, 0.08); g.add(pl);
    return g;
  },
  muro: () => {
    const g = new THREE.Group();
    const m = mat("muroGris", () => ({ map: foto("muro", 3.5, 1.5) ?? rep(piedraMuroTex(), 3.3, 1.4) })), mA = mat("almena", () => ({ map: foto("muro", 0.28, 0.25) ?? rep(piedraMuroTex(), 0.3, 0.25) }));
    const w = mesh(cajaGeo("muro", 28, 12, 2, [0.004, 0.005, 0.014]), m, 0, 3, 0); w.scale.set(14, 6, 2); g.add(w);
    const rr = rng(7);
    for (let i = 0; i < 7; i++) { const b = mesh(cajaGeo("almena" + (i % 3), 3, 3, 2, [0.03, 0.04, 0.03]), mA, -6 + i * 2 + (rr() - 0.5) * 0.2, 6.45 + (rr() - 0.5) * 0.15, 0); b.scale.set(1.0 + rr() * 0.25, 0.9 + rr() * 0.3, 2.1); b.rotation.y = (rr() - 0.5) * 0.06; g.add(b); }
    // camino de ronda de madera y contrafuertes
    const cr = mesh(cajaGeo("tabla", 6, 1, 2, [0.002, 0.03, 0.01]), mat("tablaMuro", () => ({ map: rep(planksHD(), 4, 0.5) })), 0, 5.9, -1.4); cr.scale.set(14, 0.15, 1.0); g.add(cr);
    for (const x of [-5.2, 5.2]) { const cf = mesh(cajaGeo("contra", 3, 8, 3, [0.03, 0.006, 0.03]), m, x, 2.4, 1.3); cf.scale.set(1.0, 4.8, 0.8); g.add(cf); }
    const arco = mesh(GEO.box, col("#3a2a22"), 0, 1.9, 1.02); arco.scale.set(3.2, 3.8, 0.05); g.add(arco);
    const gate = mesh(GEO.box, mat("porton", () => ({ map: rep(planksHD(), 1, 1) })), 0, 1.7, 1.06); gate.scale.set(2.8, 3.4, 0.08); g.add(gate);
    for (const x of [-1.6, 1.6]) { const j = mesh(GEO.box, col("#9a958c"), x, 2.1, 1.1); j.scale.set(0.5, 4.2, 0.3); g.add(j); }
    for (const x of [-4.6, 4.6]) {
      const c = x < 0 ? "#b5302a" : "#2f4f9a", b = mesh(GEO.box, mat("emb" + c, () => ({ map: emblema(c) })), x, 3.9, 1.05); b.scale.set(1.4, 2.8, 0.04); g.add(b);
    }
    for (const x of [-2.4, 2.4]) {
      const s = mesh(GEO.box, col("#3a3530"), x, 3.1, 1.15); s.scale.set(0.16, 0.5, 0.25); g.add(s);
      fuego(g, x, 3.33, 1.25, 0.34, true);
      calida(g, x, 3.6, 2.0, "#ff9a40", 1.0, 5.5, 1); halo(g, x, 3.6, 1.35, "#ff9a40", 1.5);
    }
    const hiedra = col("#4f8a3a");
    for (const [x, y, sx, sy] of [[-6.2, 1.6, 1.0, 2.2], [6.0, 2.2, 1.2, 2.8], [-3.4, 0.4, 1.4, 0.6], [3.2, 0.35, 1.6, 0.5]]) for (let k = 0; k < 4; k++) { const v = mesh(copaGeo(k), hiedra, x + (k - 1.5) * sx * 0.3, y + (k % 2) * sy * 0.35, 1.02); v.scale.set(sx * 0.35, sy * 0.4, 0.12); g.add(v); }
    return g;
  },
  roca: (r) => {
    const g = new THREE.Group(), c = ["#b0a698", "#a39b90", "#bdb2a2", "#9a948c"][Math.floor(r() * 4)];
    const m = mesh(rocaGeo(Math.floor(r() * 5)), mat("roca" + c, () => ({ color: c, map: foto("roca", 0.6, 0.6) ?? rep(piedraMuroTex(), 0.3, 0.3) })), 0, 0, 0); m.scale.set(0.9 + r(), 0.7 + r() * 0.6, 0.8 + r() * 0.6); m.rotation.y = r() * 6; g.add(m);
    if (r() < 0.6) { const s2 = mesh(rocaGeo(Math.floor(r() * 5)), mat("roca" + c, () => ({ color: c })), 0.9 + r() * 0.4, 0, 0.3); s2.scale.setScalar(0.35 + r() * 0.25); g.add(s2); }
    return g;
  },
  carreta: () => {
    const g = new THREE.Group(), wood = col("#9a6a3e");
    const b = mesh(GEO.box, wood, 0, 0.9, 0); b.scale.set(2.4, 0.6, 1.4); g.add(b);
    for (const [x, z] of [[-0.8, 0.8], [0.8, 0.8], [-0.8, -0.8], [0.8, -0.8]]) { const w = mesh(GEO.cyl, col("#6a4528"), x, 0.5, z); w.scale.set(1, 0.15, 1); w.rotation.x = Math.PI / 2; g.add(w); }
    const h = mesh(GEO.box, wood, 1.9, 0.75, 0); h.scale.set(1.6, 0.12, 0.12); g.add(h);
    return g;
  },
  cajas: (r) => {
    const g = new THREE.Group(), wood = col("#c08a4e");
    void wood;
    for (let i = 0; i < 3; i++) { const s = 0.7 + r() * 0.25; const b = mesh(cajaGeo("cajon", 3, 3, 3, [0.012, 0.012, 0.012]), mat("cajonT", () => ({ map: rep(planksHD(), 0.6, 0.6) })), (i % 2) * 0.8 - 0.4, s / 2 + (i === 2 ? 0.75 : 0), 0); b.scale.setScalar(s); b.rotation.y = r() * 0.5; g.add(b); }
    return g;
  },
  barril: (r) => {
    const g = new THREE.Group(), pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.36 + 0.07 * Math.sin(t * Math.PI), t * 1.1)); }
    const b = mesh(new THREE.LatheGeometry(pts, 16), mat("barrilT", () => ({ map: rep(planksHD(), 2, 0.5) }))); g.add(b);
    const tapa = mesh(new THREE.CircleGeometry(0.36, 16), col("#7a4f33"), 0, 1.1, 0); tapa.rotation.x = -Math.PI / 2; g.add(tapa);
    for (const y of [0.15, 0.55, 0.95]) { const a = mesh(new THREE.TorusGeometry(0.36 + 0.07 * Math.sin((y / 1.1) * Math.PI) + 0.01, 0.022, 4, 20), col("#4a4440"), 0, y, 0); a.rotation.x = Math.PI / 2; g.add(a); }
    g.rotation.y = r() * 6; return g;
  },
  valla: () => {
    const g = new THREE.Group(), wood = col("#b9895a");
    for (let i = 0; i < 5; i++) { const p = mesh(GEO.box, wood, -3 + i * 1.5, 0.55, 0); p.scale.set(0.14, 1.1, 0.14); g.add(p); }
    for (const y of [0.45, 0.85]) { const b = mesh(GEO.box, wood, 0, y, 0); b.scale.set(6.2, 0.12, 0.08); g.add(b); }
    return g;
  },
  farol: () => {
    const g = new THREE.Group();
    const p = mesh(GEO.cyl, col("#2e2f38"), 0, 1.6, 0); p.scale.set(0.12, 3.2, 0.12); g.add(p);
    const l = new THREE.Mesh(GEO.box, glow("#ffd27a", 4)); l.position.set(0, 3.3, 0); l.scale.set(0.35, 0.45, 0.35); g.add(l);
    calida(g, 0, 3.0, 0, "#ffc070", 1.6, 9); halo(g, 0, 3.3, 0, "#ffc070", 1.6, 0.6);
    return g;
  },
  fogata: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) { const l = mesh(GEO.cyl, col("#6a4528"), 0, 0.12, 0); l.scale.set(0.16, 1.2, 0.16); l.rotation.set(Math.PI / 2.3, i * 0.8, 0); g.add(l); }
    fuego(g, 0, 0.1, 0, 1.0, true);
    calida(g, 0, 0.9, 0, "#ff8a30", 2.4, 10, 1); halo(g, 0, 0.7, 0, "#ff8a30", 3.2);
    return g;
  },
  mesa: () => {
    const g = new THREE.Group(), madera = mat("mesaTabla", () => ({ map: rep(planksHD(), 1, 0.3) })), wood = col("#8a5a34");
    for (let k = 0; k < 4; k++) { const t = mesh(cajaGeo("tablaMesa" + (k % 2), 6, 1, 2, [0.004, 0.08, 0.01]), madera, 0, 0.9 + (k % 2) * 0.008, -0.41 + k * 0.275); t.scale.set(2.05 + (k % 2) * 0.06, 0.09, 0.26); t.rotation.y = (k - 1.5) * 0.008; g.add(t); }
    for (const [x, z] of [[-0.85, 0.42], [0.85, 0.42], [-0.85, -0.42], [0.85, -0.42]]) { const l = mesh(cilGeo("pata", 0.045, 0.06, 7, 4, 0.008), wood, x, 0.44, z); l.scale.set(1, 0.9, 1); g.add(l); }
    for (const z of [-0.42, 0.42]) { const tv = mesh(cajaGeo("trav", 4, 1, 1, [0.003, 0.05, 0.05]), wood, 0, 0.2, z); tv.scale.set(1.7, 0.06, 0.06); g.add(tv); }
    return g;
  },
  palmera: (r) => {
    const g = new THREE.Group(), h = 5 + r() * 2;
    for (let i = 0; i < 6; i++) { const s = mesh(GEO.cyl, col("#a77b4f"), Math.sin(i * 0.3) * 0.3, i * h / 6 + h / 12, 0); s.scale.set(0.42 - i * 0.03, h / 6, 0.42 - i * 0.03); g.add(s); }
    const leaf = col("#4c9e3a");
    for (let i = 0; i < 6; i++) { const l = mesh(GEO.box, leaf, 0, h + 0.1, 0); l.scale.set(3, 0.08, 0.6); l.rotation.set(0, i * 1.05, -0.35); l.translateX(1.3); g.add(l); }
    return g;
  },
  cactus: (r) => {
    const g = new THREE.Group(), c = col("#4f9a52"), h = 1.8 + r() * 1.2;
    const t = mesh(GEO.cyl, c, 0, h / 2, 0); t.scale.set(0.5, h, 0.5); g.add(t);
    for (const s of [-1, 1]) { const a = mesh(GEO.cyl, c, s * 0.45, h * 0.55, 0); a.scale.set(0.3, 0.8, 0.3); g.add(a); const b = mesh(GEO.cyl, c, s * 0.25, h * 0.4, 0); b.scale.set(0.5, 0.25, 0.3); b.rotation.z = Math.PI / 2; g.add(b); }
    return g;
  },
  pozo: () => {
    const g = new THREE.Group(), st = stoneHD();
    const b = mesh(GEO.cyl, mat("pozo", () => ({ map: rep(st, 2, 1) })), 0, 0.5, 0); b.scale.set(1.8, 1, 1.8); g.add(b);
    for (const s of [-1, 1]) { const p = mesh(GEO.box, col("#8a5a34"), s * 0.8, 1.4, 0); p.scale.set(0.12, 1.8, 0.12); g.add(p); }
    const r2 = mesh(PRISM, col("#a8433a"), 0, 2.3, 0); r2.scale.set(2.2, 0.9, 1.4); g.add(r2);
    return g;
  },
  tienda: (r) => { const m = mesh(GEO.cone, col(["#e0c088", "#c25a5a", "#5a7ac2"][Math.floor(r() * 3)]), 0, 1.3, 0); m.scale.set(3, 2.6, 3); return m; },
  horno: () => {
    const g = new THREE.Group(), brick = col("#c2603e");
    const b = mesh(GEO.box, col("#9a958c"), 0, 0.45, 0); b.scale.set(2.6, 0.9, 2.4); g.add(b);
    const d = mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), brick, 0, 0.9, 0); d.scale.set(1.25, 1.2, 1.15); g.add(d);
    const m = new THREE.Mesh(GEO.cyl, glow("#ff8a2a", 4)); m.position.set(0, 1.25, 1.1); m.rotation.x = Math.PI / 2; m.scale.set(0.8, 0.12, 0.6); g.add(m);
    const c = mesh(GEO.cyl, brick, 0.5, 2.3, -0.4); c.scale.set(0.35, 1.2, 0.35); g.add(c);
    calida(g, 0, 1.2, 1.8, "#ff8a30", 1.6, 5, 0.6);
    return g;
  },
  pan_gigante: () => {
    const g = new THREE.Group();
    const l = mesh(GEO.sph, MATERIAL.pan(), 0, 0.75, 0); l.scale.set(2.2, 0.9, 1.15); g.add(l);
    for (const x of [-1, 0, 1]) { const c = mesh(GEO.box, col("#9a5a26"), x * 0.75, 1.58, 0); c.scale.set(0.12, 0.08, 1.4); c.rotation.y = 0.5; g.add(c); }
    return g;
  },
  silla: () => {
    const g = new THREE.Group(), w = col("#a86f42");
    const s2 = mesh(GEO.box, w, 0, 0.5, 0); s2.scale.set(0.6, 0.08, 0.6); g.add(s2);
    for (const [x, z] of [[-0.25, 0.25], [0.25, 0.25], [-0.25, -0.25], [0.25, -0.25]]) { const l = mesh(GEO.box, w, x, 0.25, z); l.scale.set(0.07, 0.5, 0.07); g.add(l); }
    const b = mesh(GEO.box, w, 0, 0.95, -0.27); b.scale.set(0.6, 0.85, 0.07); g.add(b);
    return g;
  },
  cama: () => {
    const g = new THREE.Group();
    const f = mesh(GEO.box, col("#8a5a34"), 0, 0.3, 0); f.scale.set(1.5, 0.6, 2.4); g.add(f);
    const m = mesh(GEO.box, col("#f4f1ea"), 0, 0.65, 0); m.scale.set(1.4, 0.18, 2.3); g.add(m);
    const bl = mesh(GEO.box, col("#3f6fb5"), 0, 0.76, 0.3); bl.scale.set(1.45, 0.08, 1.6); g.add(bl);
    const p = mesh(GEO.box, col("#ffffff"), 0, 0.82, -0.85); p.scale.set(0.9, 0.18, 0.4); g.add(p);
    const h = mesh(GEO.box, col("#8a5a34"), 0, 0.85, -1.2); h.scale.set(1.5, 1.1, 0.1); g.add(h);
    return g;
  },
  bote: () => {
    const g = new THREE.Group();
    const h = mesh(GEO.box, col("#9a6438"), 0, 0.45, 0); h.scale.set(1.3, 0.6, 3.2); g.add(h);
    const pr = mesh(GEO.cone, col("#9a6438"), 0, 0.45, 2.0); pr.scale.set(1.3, 1.0, 0.6); pr.rotation.x = Math.PI / 2; g.add(pr);
    const m = mesh(GEO.cyl, col("#6a4528"), 0, 2.2, 0.2); m.scale.set(0.12, 3.4, 0.12); g.add(m);
    const sail = mesh(PRISM, col("#f4ecd8"), 0.05, 1.0, 0.2); sail.scale.set(0.05, 5.4, 2.2); sail.rotation.y = Math.PI / 2; g.add(sail);
    return g;
  },
  estatua: () => {
    const g = new THREE.Group(), s = col("#c9c4b8");
    const p = mesh(GEO.box, s, 0, 0.6, 0); p.scale.set(1.4, 1.2, 1.4); g.add(p);
    const b = mesh(GEO.cyl, s, 0, 1.9, 0); b.scale.set(0.6, 1.4, 0.6); g.add(b);
    const h = mesh(GEO.sph, s, 0, 2.95, 0); h.scale.setScalar(0.38); g.add(h);
    return g;
  },
} satisfies Partial<Record<TipoObjeto, (r: () => number, lugar: Lugar) => THREE.Object3D>>) as unknown as Record<TipoObjeto, (r: () => number, lugar: Lugar) => THREE.Object3D>;

// ---------------- época años 30 (epoca.ts) ----------------
const EP = crearEpoca({ mesh, mat, col, glow, calida, halo, noche: () => NOCHE, apagado: () => OSCURO });
Object.assign(build, EP.B30);
/** cine negro: follaje y troncos casi negros (siluetas contra la niebla y los faroles) */
const silueta = (o: THREE.Object3D) => o.traverse((m) => { if (m instanceof THREE.Mesh) m.material = col(m.position.y < 1.2 && m.geometry !== GEO.sph ? "#0c0b0c" : "#121816"); });
for (const k of ["arbol", "pino", "arbusto"] as TipoObjeto[]) { const f = build[k]; build[k] = (r, l) => { const o = f(r, l); if (NOIR) silueta(o); return o; }; }
/** cine negro: apaga el verde de pasto, matas y bosques lejanos (colores por instancia o del material) */
const oscurecer = <T extends THREE.Object3D>(o: T, k = 0.32): T => { o.traverse((m) => {
  if (m instanceof THREE.InstancedMesh && m.instanceColor) { const a = m.instanceColor.array as Float32Array; for (let i = 0; i < a.length; i += 3) { const y = (a[i] + a[i + 1] + a[i + 2]) / 3; a[i] = (a[i] * 0.4 + y * 0.6) * k; a[i + 1] = (a[i + 1] * 0.4 + y * 0.6) * k; a[i + 2] = (a[i + 2] * 0.4 + y * 0.6) * k * 1.1; } m.instanceColor.needsUpdate = true; }
  else if (m instanceof THREE.Mesh && (m.material as THREE.MeshLambertMaterial).color) { const mm = (m.material as THREE.MeshLambertMaterial).clone(); mm.color.multiplyScalar(k); m.material = mm; }
}); return o; };
/** reflejo de una luz sobre el piso mojado: franja vertical que se estira hacia la cámara */
const reflejoTex = () => ctex("reflejo30", 64, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.25, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, "rgba(0,0,0,1)"); gx.addColorStop(0.5, "rgba(0,0,0,0)"); gx.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out"; g.fillStyle = gx; g.fillRect(0, 0, 64, 256);
});
const charcoTex = () => ctex("charco30", 256, 256, (g, r) => {
  g.fillStyle = "rgba(0,0,0,0)"; g.clearRect(0, 0, 256, 256);
  g.filter = "blur(10px)";
  for (let k = 0; k < 7; k++) { g.fillStyle = "rgba(255,255,255,0.8)"; g.beginPath(); g.ellipse(128 + (r() - 0.5) * 120, 128 + (r() - 0.5) * 80, 30 + r() * 50, 16 + r() * 30, r() * 3, 0, 7); g.fill(); }
});


// set denso alrededor del escenario (anillo de 8–20 m): lo que llena el cuadro en la referencia
type Pieza = TipoObjeto | Deco;
const SET: Partial<Record<Lugar, [Pieza, number, number, number][]>> = {
  pueblo: [["casa", 7, 15, 22], ["puesto", 4, 9, 14], ["letrero", 3, 8, 13], ["barril", 5, 8, 15], ["cajas", 4, 8, 15], ["flores", 8, 8, 16], ["maceta", 4, 8, 13], ["farol", 4, 9, 15], ["banco", 2, 8, 13], ["carreta", 1, 10, 15], ["cesta", 4, 8, 12]],
  ciudad: [["puesto", 4, 8, 13], ["letrero", 4, 8, 13], ["maceta", 6, 8, 13], ["banco", 3, 8, 13], ["cesta", 3, 8, 12], ["farol", 4, 8, 13]],
  castillo: [["estandarte", 6, 9, 16], ["antorcha", 6, 8, 14], ["campana", 4, 12, 20], ["heno", 3, 9, 16], ["cajas", 3, 8, 14], ["barril", 4, 8, 14], ["carreta", 1, 10, 15], ["lenia", 2, 8, 14]],
  campo: [["valla", 4, 9, 16], ["heno", 3, 10, 18], ["flores", 14, 8, 18], ["letrero", 1, 8, 12], ["tronco", 2, 9, 16]],
  granja: [["heno", 6, 9, 18], ["valla", 6, 9, 18], ["flores", 8, 8, 16], ["carreta", 1, 10, 16], ["cesta", 4, 8, 13], ["lenia", 2, 8, 14], ["letrero", 1, 8, 12]],
  bosque: [["lenia", 2, 8, 14], ["tronco", 4, 8, 16], ["flores", 8, 8, 16], ["roca", 6, 8, 16]],
  desierto: [["tienda", 3, 10, 18], ["campana", 2, 12, 20], ["cajas", 3, 8, 14], ["barril", 3, 8, 14], ["carreta", 1, 10, 16], ["cesta", 3, 8, 13]],
  playa: [["barril", 2, 8, 14], ["cajas", 2, 8, 14], ["cesta", 3, 8, 12], ["tronco", 2, 8, 14]],
  montana: [["lenia", 2, 8, 14], ["campana", 1, 12, 18], ["tronco", 3, 8, 16], ["flores", 6, 8, 16]],
  mansion: [["arbol", 8, 10, 22], ["arbusto", 8, 8, 14], ["farola", 2, 8, 12], ["pino", 4, 14, 24]],
  calle: [],
  cementerio: [["lapida", 30, 7, 20], ["arbol", 5, 10, 20], ["farola", 3, 8, 14]],
  gasolinera: [["auto", 2, 9, 14], ["barril", 4, 8, 13], ["cajas", 2, 8, 12], ["farola", 2, 8, 12]],
  puerto: [["barril", 4, 8, 13], ["cajas", 4, 8, 13], ["farola", 3, 8, 12]],
};
/** utilería pegada al escenario (4.5–10 m) en los lugares de los años 30: enmarca a los actores y llena el cuadro */
const CERCA: Partial<Record<Lugar, [Pieza, number, number, number][]>> = {
  mansion: [["seto", 5, 5, 9], ["arbusto", 5, 5, 9], ["farola", 2, 5.5, 8], ["banca", 1, 5.5, 8], ["arbol", 3, 7, 11]],
  calle: [["farola", 4, 5.2, 9], ["hidrante", 2, 5, 8], ["cubo", 3, 5, 8], ["buzon", 1, 5, 8], ["kiosco", 1, 6, 9], ["auto", 2, 6.5, 10], ["cajas", 2, 5, 8], ["barril", 2, 5, 8]],
  cementerio: [["lapida", 16, 4.6, 10], ["arbol", 2, 8, 11], ["farola", 1, 6, 9]],
  gasolinera: [["barril", 3, 5, 8], ["cubo", 2, 5, 8], ["auto", 1, 6.5, 9], ["cajas", 2, 5, 8], ["hidrante", 1, 5, 8]],
  puerto: [["barril", 4, 5, 9], ["cajas", 4, 5, 9], ["farola", 2, 5, 8], ["cubo", 1, 5, 8]],
};
/** como libre(), pero deja acercarse hasta 4.6 m del centro (lugares de época, más cerrados) */
const cerca = (x: number, z: number, rad = 1.2) => {
  if (Math.hypot(x, z) < 4.6 + rad * 0.6) return false;
  if (z > -2 && z < 60 && Math.abs(x) < 5 + 0.75 * Math.max(0, z) + rad) return false;
  return true;
};
const pieza = (p: Pieza, r: () => number, lugar: Lugar) => (p in deco ? deco[p as Deco](r) : build[p as TipoObjeto](r, lugar));

/** pasto, flores y piedritas por instancias: rompen el suelo liso (sin tinta, no tapan nada) */
const matas = (R: THREE.Group, r: () => number, lugar: Lugar) => {
  const verde = !["playa", "desierto", "ciudad", "interior"].includes(lugar);
  const n = verde ? 2600 : 700, radio = 38;
  const geo = verde ? new THREE.ConeGeometry(0.09, 0.38, 4) : new THREE.DodecahedronGeometry(0.12, 0);
  if (verde) geo.translate(0, 0.17, 0);
  const im = new THREE.InstancedMesh(geo, mat("matas" + verde, () => ({ color: "#ffffff" })), n);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  const tonos = verde ? ["#4f9a33", "#6cb845", "#3f8a2e", "#86c45a", "#5aa83c"] : lugar === "ciudad" ? ["#8a857e", "#9a958c", "#77726c"] : ["#c9a06a", "#b08a5a", "#e2c48e"];
  let k = 0;
  for (let i = 0; i < n * 3 && k < n; i++) {
    const a = r() * Math.PI * 2, d = 2 + Math.sqrt(r()) * radio, x = Math.cos(a) * d, z = Math.sin(a) * d - 4;
    if (Math.hypot(x, z) < 6.8 && lugar !== "playa") continue;         // claro del escenario
    // las matas se agrupan (manchas), como en la referencia
    if (verde && Math.sin(x * 0.35 + 1.3) * Math.cos(z * 0.31) < -0.25) continue;
    const s = 0.7 + r() * 0.9;
    q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.4, r() * 6.28, (r() - 0.5) * 0.4));
    M.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.7 + r() * 0.8), s));
    im.setMatrixAt(k, M); im.setColorAt(k, c.set(tonos[Math.floor(r() * tonos.length)])); k++;
  }
  im.count = k; im.receiveShadow = true; im.castShadow = false; im.layers.set(NOINK); R.add(im);
  if (verde) { // florecitas sueltas
    const fg = new THREE.SphereGeometry(0.07, 6, 4), fm = new THREE.InstancedMesh(fg, mat("florecitas", () => ({ color: "#ffffff" })), 500);
    let j = 0;
    for (let i = 0; i < 1500 && j < 500; i++) {
      const a = r() * Math.PI * 2, d = 6.8 + Math.sqrt(r()) * 30, x = Math.cos(a) * d, z = Math.sin(a) * d - 4;
      if (!libre(x, z, 1)) continue;                                     // cerca de la lente serían bolas borrosas
      M.makeTranslation(x, 0.22, z); fm.setMatrixAt(j, M); fm.setColorAt(j, c.set(["#f4f1ea", "#f2c84b", "#f5a0b8", "#ffffff"][Math.floor(r() * 4)])); j++;
    }
    fm.count = j; fm.layers.set(NOINK); R.add(fm);
  }
};

/** trayectoria de lo que se desplaza (avión que despega, aterriza o vuela): posición y cabeceo en el segundo t */
export const movObjeto = (ob: Objeto, t: number, dur: number): { x: number; y: number; z: number; rz: number; rx: number } => {
  const u = clamp01(t / Math.max(1, dur));
  if (ob.estado === "despega") {
    // carrera por la pista acelerando; a mitad de la escena se levanta la nariz y sube
    const k = clamp01((u - 0.48) / 0.52);
    return { x: ob.x - 16 + 40 * Math.pow(u, 1.7), y: 9 * k * k, z: ob.z, rz: Math.min(0.2, k * 0.55), rx: 0 };
  }
  if (ob.estado === "aterriza") {
    // baja planeando, toca la pista (rebote corto) y frena hasta detenerse
    const v = 1 - Math.pow(1 - u, 1.8), k = clamp01(1 - u / 0.45), toque = u > 0.45 && u < 0.58 ? 0.12 * Math.sin(((u - 0.45) / 0.13) * Math.PI) : 0;
    return { x: ob.x - 26 + 30 * v, y: 8 * k * k + toque, z: ob.z, rz: k > 0 ? 0.03 + 0.06 * (1 - k) : 0.02 * Math.max(0, 1 - (u - 0.45) / 0.2), rx: 0 };
  }
  if (ob.estado === "vuela") return { x: ob.x, y: 0.22 * Math.sin(t * 1.3), z: ob.z, rz: 0.025 * Math.sin(t * 0.9), rx: 0.07 * Math.sin(t * 0.6) };
  return { x: ob.x, y: 0, z: ob.z, rz: 0, rx: 0 };
};

/** ¿se puede poner escenografía en (x, z)? fuera del escenario y fuera del cono de la cámara (+z) */
const libre = (x: number, z: number, rad = 1.5) => {
  if (Math.hypot(x, z) < 7 + rad) return false;
  if (z > -2 && z < 60 && Math.abs(x) < 5 + 0.75 * Math.max(0, z) + rad) return false;
  return true;
};

type Receta = { suelo: () => THREE.Texture; tile: number; esparcir: [TipoObjeto, number][]; colinas: string | null; montanas: boolean; camino: boolean; agua: boolean; fondo?: (g: THREE.Group, r: () => number) => void };
const RECETA: Record<Lugar, Receta> = {
  campo: { suelo: grassHD, tile: 6, esparcir: [["arbol", 14], ["arbusto", 14], ["roca", 8]], colinas: "#6fae48", montanas: false, camino: true, agua: false },
  pueblo: { suelo: grassHD, tile: 6, esparcir: [["casa", 9], ["arbol", 8], ["arbusto", 8], ["barril", 4], ["cajas", 3]], colinas: "#6fae48", montanas: false, camino: true, agua: false },
  bosque: { suelo: grassHD, tile: 6, esparcir: [["pino", 34], ["arbol", 22], ["arbusto", 18], ["roca", 8]], colinas: "#3f8a45", montanas: false, camino: true, agua: false },
  castillo: { suelo: grassHD, tile: 6, esparcir: [["arbol", 8], ["roca", 6], ["arbusto", 8]], colinas: "#6fae48", montanas: true, camino: true, agua: false,
    fondo: (g) => { for (let i = -2; i <= 2; i++) { const m = build.muro(Math.random, "castillo"); m.position.set(i * 14, 0, -22); g.add(m); }
      for (const x of [-35, -7, 21]) { const t = build.torre(Math.random, "castillo"); t.position.set(x, 0, -22); g.add(t); } } },
  ciudad: { suelo: cobbleHD, tile: 4, esparcir: [["farol", 6], ["barril", 3], ["cajas", 3]], colinas: null, montanas: false, camino: false, agua: false,
    fondo: (g, r) => { for (let i = 0; i < 9; i++) for (const z of [-16, -26]) { const c = build.casa(r, "ciudad"); c.position.set(-40 + i * 10 + r() * 2, 0, z); c.scale.set(1.3, 1.6 + r() * 0.8, 1.3); g.add(c); }
      for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const c = build.casa(r, "ciudad"); c.position.set(s * (16 + i * 2), 0, -6 + i * 9); c.rotation.y = -s * Math.PI / 2; c.scale.set(1.3, 1.8, 1.3); g.add(c); } } },
  playa: { suelo: sand, tile: 10, esparcir: [["palmera", 10], ["roca", 6]], colinas: null, montanas: false, camino: false, agua: true },
  desierto: { suelo: sand, tile: 10, esparcir: [["cactus", 14], ["roca", 10], ["tienda", 3]], colinas: "#e2b26e", montanas: true, camino: false, agua: false },
  montana: { suelo: grassHD, tile: 6, esparcir: [["pino", 24], ["roca", 16], ["arbusto", 6]], colinas: "#5c9a48", montanas: true, camino: true, agua: false },
  interior: { suelo: planksHD, tile: 3, esparcir: [], colinas: null, montanas: false, camino: false, agua: false },
  habitacion: { suelo: planksHD, tile: 3, esparcir: [], colinas: null, montanas: false, camino: false, agua: false },
  oficina: { suelo: planksHD, tile: 3, esparcir: [], colinas: null, montanas: false, camino: false, agua: false },
  tribunal: { suelo: planksHD, tile: 3, esparcir: [], colinas: null, montanas: false, camino: false, agua: false },
  carcel: { suelo: planksHD, tile: 3, esparcir: [], colinas: null, montanas: false, camino: false, agua: false },
  mansion: { suelo: grassHD, tile: 6, esparcir: [["arbol", 16], ["pino", 10], ["arbusto", 10]], colinas: "#4f7a40", montanas: false, camino: true, agua: false,
    fondo: (g, r) => { const m = build.mansion(r, "mansion"); m.position.set(CASA.x, 0, CASA.z); m.userData.sinObst = true; g.add(m); } },
  calle: { suelo: grassHD, tile: 6, esparcir: [], colinas: null, montanas: false, camino: false, agua: false,
    // la calle sigue a lo lejos (sin pared al fondo): edificios a los dos lados hasta 60 m y una manzana cruzada lejos
    fondo: (g, r) => { for (let i = 0; i < 7; i++) { if (i === 3) continue; const c = build.edificio(r, "calle"); c.position.set(-30 + i * 10, 0, -13); g.add(c); }
      for (let i = 0; i < 3; i++) { const c = build.edificio(r, "calle"); c.position.set(-10 + i * 10, 0, -72); g.add(c); }
      for (const s of [-1, 1]) for (let i = -6; i < 6; i++) { const c = build.edificio(r, "calle"); c.position.set(s * 11.2, 0, -6 + i * 9); c.rotation.y = -s * Math.PI / 2; g.add(c); } } },
  cementerio: { suelo: grassHD, tile: 6, esparcir: [["arbol", 10], ["pino", 8]], colinas: "#3f6a3a", montanas: false, camino: true, agua: false,
    fondo: (g) => { for (let i = -14; i <= 14; i++) { const p = mesh(GEO.box, col("#1c1d22"), i * 2.2, 1.1, -16); p.scale.set(0.08, 2.2, 0.08); g.add(p); const t = mesh(GEO.cone, col("#1c1d22"), i * 2.2, 2.3, -16); t.scale.set(0.16, 0.25, 0.16); g.add(t); }
      const b = mesh(GEO.box, col("#1c1d22"), 0, 1.9, -16); b.scale.set(64, 0.08, 0.08); g.add(b); } },
  gasolinera: { suelo: grassHD, tile: 6, esparcir: [["arbol", 6]], colinas: null, montanas: false, camino: false, agua: false,
    fondo: (g, r) => { const e = build.edificio(r, "gasolinera"); e.position.set(0, 0, -12); e.scale.set(1, 0.42, 0.9); g.add(e);
      for (const x of [-2.2, 2.2]) { const s = build.surtidor(r, "gasolinera"); s.position.set(x, 0, -6.5); g.add(s); }
      const te = mesh(GEO.box, col("#e9e4d8"), 0, 3.6, -6.5); te.scale.set(8, 0.25, 4); g.add(te); for (const x of [-3.6, 3.6]) { const c = mesh(GEO.cyl, col("#e9e4d8"), x, 1.8, -6.5); c.scale.set(0.25, 3.6, 0.25); g.add(c); } } },
  puerto: { suelo: sand, tile: 10, esparcir: [["roca", 6]], colinas: null, montanas: false, camino: false, agua: true,
    fondo: (g, r) => { const m = mesh(GEO.box, mat("muelle30", () => ({ map: rep(planksHD(), 1, 6) })), 0, 0.5, -16); m.scale.set(4, 0.3, 26); g.add(m);
      for (let k = 0; k < 8; k++) for (const s of [-1, 1]) { const p = mesh(GEO.cyl, col("#3a2a20"), s * 1.9, 0.2, -5 - k * 3.4); p.scale.set(0.3, 1.6, 0.3); g.add(p); }
      const b = build.barco(r, "puerto"); b.position.set(6.5, 0, -14); b.rotation.y = 0.3; g.add(b); } },
  aerodromo: { suelo: grassHD, tile: 6, esparcir: [], colinas: "#5f7a50", montanas: false, camino: false, agua: false,
    fondo: (g, r) => {
      // pista de aterrizaje a lo largo de x (z = -6.5), con línea central, hangares y manga de viento
      const p = mesh(GEO.box, mat("pista30", () => ({ map: rep(asfaltoTex(), 50, 1.5) })), 0, 0.02, -6.5); p.scale.set(420, 0.04, 12); p.receiveShadow = true; g.add(p);
      for (let i = -26; i <= 26; i++) { const l = mesh(GEO.box, col("#e9e6dc"), i * 8, 0.05, -6.5); l.scale.set(4, 0.02, 0.3); l.castShadow = false; g.add(l); }
      for (const s of [-1, 1]) { const b = mesh(GEO.box, col("#d8d4c8"), 0, 0.05, -6.5 + s * 5.6); b.scale.set(420, 0.02, 0.18); b.castShadow = false; g.add(b); }
      for (const [x, z, w] of [[-34, -30, 18], [-10, -34, 14], [16, -32, 16]] as [number, number, number][]) {
        const h = mesh(GEO.box, col("#7a7e84"), x, 3.2, z); h.scale.set(w, 6.4, 12); g.add(h);
        const te = mesh(GEO.cyl, col("#5e6268"), x, 6.4, z); te.scale.set(12, w, 5); te.rotation.set(0, 0, Math.PI / 2); g.add(te);
        const pu = mesh(GEO.box, col("#26282c"), x, 2.6, z + 6.05); pu.scale.set(w * 0.7, 5.2, 0.1); g.add(pu);
        for (let k = 0; k < 4; k++) { const ve = mesh(GEO.box, col("#b9c4cc"), x - w * 0.3 + k * w * 0.2, 5.2, z + 6.06); ve.scale.set(w * 0.12, 0.5, 0.05); g.add(ve); }
      }
      const poste = mesh(GEO.cyl, col("#d8d4c8"), 15, 2.5, -15); poste.scale.set(0.12, 5, 0.12); g.add(poste);
      const manga = mesh(GEO.cone, col("#e8e2d0"), 16.1, 4.7, -15); manga.scale.set(0.55, 2.2, 0.55); manga.rotation.z = -Math.PI / 2 - 0.25; g.add(manga);
      for (let i = 0; i < 18; i++) { const v = mesh(GEO.box, col("#6a5a48"), -60 + i * 7, 0.6, -18); v.scale.set(0.12, 1.2, 0.12); g.add(v); }
      const vb = mesh(GEO.box, col("#6a5a48"), -0.5, 1.0, -18); vb.scale.set(126, 0.08, 0.08); g.add(vb);
      void r;
    } },
  cielo: { suelo: grassHD, tile: 6, esparcir: [], colinas: null, montanas: false, camino: false, agua: false },
  cabina: { suelo: planksHD, tile: 3, esparcir: [], colinas: null, montanas: false, camino: false, agua: false },
  supermercado: { suelo: planksHD, tile: 3, esparcir: [], colinas: null, montanas: false, camino: false, agua: false },
  granja: { suelo: grassHD, tile: 6, esparcir: [["valla", 8], ["arbol", 8], ["cajas", 3], ["barril", 3], ["pozo", 1]], colinas: "#79b24c", montanas: false, camino: true, agua: false,
    fondo: (g, r) => { const c = build.casa(r, "granja"); c.position.set(-14, 0, -18); c.scale.set(1.6, 1.4, 1.6); g.add(c); } },
};

/** casa de la mansión: cerca del escenario, con la puerta al final del camino (agentes/coherencia.mjs usa lo mismo) */
export const CASA = { x: 3.1, z: -8.5 };

// ---------------- cine negro ----------------
/** luz de película policial: noche fría y oscura con niebla azulada; de día, cielo nublado y gris */
const noirDe = (l0: Luz, hora: string, interior: boolean, clima?: Clima): Luz => {
  const l = noirBase(l0, hora, interior);
  if (interior || !clima || clima === "nublado") return l;
  const noche = hora === "noche", tarde = hora === "atardecer" || hora === "amanecer";
  if (clima === "despejado") return noche
    ? { ...l, L: { ...l.L, lit: [0.44, 0.5, 0.72], fogNear: 30, fogFar: 240, sunI: 1.3 } }
    : { ...l, L: { ...l.L, lit: tarde ? [1.05, 0.88, 0.72] : [1.02, 0.98, 0.9], shade: tarde ? [0.3, 0.22, 0.3] : [0.3, 0.32, 0.4], fog: tarde ? "#c9a58c" : "#a9b8c6", fogNear: 40, fogFar: 320, sunI: l0.L.sunI * 0.95, el: tarde ? 14 : 48 },
      K: { ...l.K, sky: tarde ? { c: ["#f0c08a", "#e0a07a", "#b98288", "#86708c", "#4e4e72"], e: [0, 4, 10, 20, 45] } : { c: ["#d7e0e6", "#b8cad8", "#9bb4c9", "#7f9cb8", "#64829f"], e: [0, 4, 10, 20, 45] } } };
  if (clima === "lluvia") return noche ? l
    : { ...l, L: { ...l.L, lit: [0.68, 0.7, 0.74], shade: [0.2, 0.21, 0.26], fog: "#5e666e", fogNear: 12, fogFar: 130, sunI: l0.L.sunI * 0.35 },
      K: { ...l.K, sky: { c: ["#7a8086", "#6c7278", "#5e646a", "#50565c", "#42484e"], e: [0, 4, 10, 20, 45] } } };
  if (clima === "niebla") return { ...l, L: { ...l.L, fog: noche ? "#2a3242" : "#a4aab0", fogNear: 3, fogFar: noche ? 38 : 55 },
    K: { ...l.K, sky: noche ? { c: ["#2a3242", "#283040", "#232a38", "#1c2230", "#151a24"], e: [0, 4, 10, 20, 45] } : { c: ["#a4aab0", "#a0a6ac", "#9aa0a6", "#949aa0", "#8e949a"], e: [0, 4, 10, 20, 45] } } };
  // nieve
  return { ...l, L: { ...l.L, lit: noche ? [0.5, 0.56, 0.78] : [1.04, 1.04, 1.08], shade: noche ? [0.1, 0.11, 0.18] : [0.42, 0.45, 0.55], fog: noche ? "#2c3446" : "#c4ccd4", fogNear: 14, fogFar: 140 },
    K: { ...l.K, sky: noche ? l.K.sky : { c: ["#d4dae0", "#c4ccd4", "#b4bec8", "#a4b0bc", "#94a2b0"], e: [0, 4, 10, 20, 45] } } };
};
const noirBase = (l: Luz, hora: string, interior: boolean): Luz => {
  if (interior) return { ...l, L: { ...l.L, lit: hora === "noche" ? [0.24, 0.25, 0.34] : [0.62, 0.6, 0.56], shade: hora === "noche" ? [0.07, 0.07, 0.1] : [0.16, 0.16, 0.2], lift: [0.015, 0.015, 0.02], sunI: l.L.sunI * (hora === "noche" ? 0.35 : 0.6), hemiI: l.L.hemiI * 0.5 }, grade: "noir" as Luz["grade"] };
  if (hora === "noche") return { ...l, L: { ...l.L, lit: [0.36, 0.42, 0.62], shade: [0.07, 0.08, 0.14], lift: [0.02, 0.025, 0.05], fog: "#1a2232", fogNear: 14, fogFar: 150, sunI: 1.1, hemiI: 0.22, sky: "#141c2c", ground: "#07090e" },
    K: { ...l.K, sky: { c: ["#2a3448", "#1e2738", "#151c2a", "#0e1420", "#080b12"], e: [0, 3, 9, 18, 45] } }, grade: "noir" as Luz["grade"] };
  return { ...l, L: { ...l.L, lit: [0.92, 0.9, 0.88], shade: [0.26, 0.27, 0.32], lift: [0.03, 0.03, 0.04], fog: "#7e868e", fogNear: 20, fogFar: 220, sunI: l.L.sunI * 0.55, el: 50 },
    K: { ...l.K, sky: { c: ["#a9adb0", "#9a9fa4", "#8a9096", "#7a8188", "#6a727a"], e: [0, 4, 10, 20, 45] } }, grade: "noir" as Luz["grade"] };
};

// ---------------- mundo de una escena ----------------
export class Mundo {
  root = new THREE.Group();
  luz: Luz;
  sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog: THREE.Fog;
  private clouds: THREE.Mesh[] = [];
  private agua: THREE.Mesh | null = null;
  /** objetos de la historia con estado animado */
  private vivos: { o: THREE.Object3D; ob: Objeto; y0: number; s0: THREE.Vector3; dir: number }[] = [];
  private sunDir = new THREE.Vector3();
  interior: boolean;
  /** medidas de la sala (interiores de época): la cámara no sale de ellas */
  sala: { mx: number; h: number; z0: number } | null = null;
  /** volúmenes que pueden tapar a la cámara: centro xz, radio, alto */
  obstaculos: { x: number; z: number; r: number; h: number }[] = [];
  /** fuentes de luz cálida del decorado (posición en el mundo) */
  fuentes: Fuente[] = [];
  private calidaK = 1;
  private luna: THREE.Group | null = null;
  private nubes3d: THREE.Group | null = null;
  private brumaMats: THREE.MeshBasicMaterial[] = [];
  private fondoCielo: string | null = null; private fondoSuelo: string | null = null;

  constructor(e: Escena, estilo?: string | null) {
    const SEM = e.ambiente.escenario ? semillaTexto(e.ambiente.escenario) : e.ambiente.semilla ?? e.id;
    const R = this.root, r = rng(SEM * 97 + 13), rec = RECETA[e.ambiente.lugar] ?? RECETA.campo;
    this.clima = e.ambiente.clima;
    this.luz = LUZ[e.ambiente.hora] ?? LUZ.dia;
    this.interior = esInterior(e.ambiente.lugar);
    this.dur = e.duracion ?? 6;
    const aire = e.ambiente.lugar === "cielo";
    NOCHE = e.ambiente.hora === "noche"; NOIR = estilo === "noir";
    if (NOIR) this.luz = noirDe(this.luz, e.ambiente.hora, this.interior, e.ambiente.clima);
    // cuarto a oscuras: casi negro, azulado (la luna por la ventana); las lámparas apagadas
    if (this.interior && e.ambiente.oscuro) this.luz = { ...this.luz, L: { ...this.luz.L, lit: [0.2, 0.23, 0.36], shade: [0.04, 0.045, 0.08], lift: [0.01, 0.012, 0.02], sunI: this.luz.L.sunI * 0.25, hemiI: this.luz.L.hemiI * 0.3 } };
    OSCURO = !!(this.interior && e.ambiente.oscuro);
    this.calidaK = OSCURO ? 0.12 : this.interior ? 1 : NOIR ? (e.ambiente.hora === "noche" ? 1.1 : 0.55) : e.ambiente.hora === "noche" ? 0.5 : e.ambiente.hora === "atardecer" || e.ambiente.hora === "amanecer" ? 0.4 : 0.15;
    // cielo: 5 paradas de color por elevación
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.fog = new THREE.Fog("#b8d0ec", 25, 300);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 0.5); R.add(this.hemi);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.sun); R.add(this.sun.target);
    // suelo según el lugar: césped pintado, arena con ondas, adoquín de época o tablas (interior)
    const L0 = e.ambiente.lugar, duro = ["calle", "gasolinera"].includes(L0), verde = !this.interior && !aire && !duro && !["playa", "desierto", "ciudad", "puerto"].includes(L0);
    const baseTex = L0 === "carcel" ? rep(concretoTex(), 400 / 4, 400 / 4) : this.interior ? rep(planksHD(), 400 / 3, 400 / 3) : duro ? rep(asfaltoTex(), 400 / 8, 400 / 8) : L0 === "ciudad" ? foto("adoquin", 400 / 3) ?? rep(adoquinTex(), 400 / 3.2, 400 / 3.2)
      : L0 === "playa" || L0 === "desierto" || L0 === "puerto" ? rep(arenaTex(), 400 / 9, 400 / 9) : rep(cespedTex(L0), 400 / 7, 400 / 7);
    const conFondo = !this.interior && !!fondoDe(e.fondoImg);
    if (conFondo) baseTex.repeat.multiplyScalar(180 / 400);
    const ground = new THREE.Mesh(conFondo ? new THREE.CircleGeometry(90, 96) : new THREE.PlaneGeometry(400, 400),
      conFondo ? mat("sueloF" + L0, () => ({ map: baseTex, alphaMap: bordeTex("sueloFondo"), alphaTest: 0.5 })) : mat("suelo" + L0, () => ({ map: baseTex })));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; if (!aire) R.add(ground);
    // plaza adoquinada (pueblo) o patio de losas (castillo), con borde irregular
    const plaza = L0 === "pueblo" ? 13 : L0 === "castillo" ? 12 : 0;
    if (plaza) {
      const t = L0 === "pueblo" ? foto("adoquin", plaza * 2 / 3) ?? rep(adoquinTex(), plaza * 2 / 3.2, plaza * 2 / 3.2) : rep(losasTex(), plaza * 2 / 4, plaza * 2 / 4);
      const pz = new THREE.Mesh(new THREE.CircleGeometry(plaza, 64), mat("plaza" + L0, () => ({ map: t, alphaMap: bordeTex(L0), alphaTest: 0.5 })));
      pz.rotation.x = -Math.PI / 2; pz.position.set(0, 0.014, -3); pz.receiveShadow = true; R.add(pz);
    }
    // camino de tierra con huellas (pasa por el escenario y se pierde a lo lejos)
    const ROT = 0.25, OFF = 3.2, caminoEn = (x: number, z: number, m = 0) => { const lx = (x - OFF) * Math.cos(ROT) - (z + 4) * Math.sin(ROT); return Math.abs(lx) < 2.6 + m; };
    // zonas donde no va vegetación ni utilería: el camino a la casa, la casa y su porche, la pista del aeródromo
    const casa = L0 === "mansion" && !(e.objetos ?? []).some((o) => o.tipo === "mansion");
    this.fuera = (x, z, rad) => {
      if (rec.camino && caminoEn(x, z, rad + 0.6)) return false;
      if (casa && x > CASA.x - 8.6 - rad && x < CASA.x + 13.6 + rad && z < CASA.z + 4.2 + rad) return false;
      if (casa && Math.abs(x - CASA.x) < 3 + rad && z < CASA.z + 7.5 + rad) return false;
      if (L0 === "aerodromo" && Math.abs(z + 6.5) < 8 + rad && Math.abs(x) < 150) return false;
      return true;
    };
    if (rec.camino || L0 === "desierto") {
      const t = (L0 !== "desierto" ? foto("camino", 1, 140 / 4.6) : null) ?? (() => { const c = caminoTex(L0).clone(); c.repeat.set(1, 140 / 9); c.needsUpdate = true; return c; })();
      const geo = new THREE.PlaneGeometry(4.6, 140).rotateX(-Math.PI / 2);
      const path = new THREE.Mesh(geo, mat("camino" + L0, () => ({ map: t })));
      path.rotation.y = ROT; path.position.set(OFF, 0.012, -4); path.position.add(new THREE.Vector3(Math.sin(ROT), 0, Math.cos(ROT)).multiplyScalar(-40)); path.receiveShadow = true; R.add(path);
    }
    // césped de hojas sueltas: denso y alto lejos, corto donde están los actores; nada sobre plaza ni camino
    if (verde) R.add(((o) => (NOIR ? oscurecer(o, NOCHE ? 0.3 : 0.55) : o))(cesped(L0, r, (x, z) => {
      if (plaza && Math.hypot(x, z + 3) < plaza + 0.3) return 0;
      if (rec.camino && caminoEn(x, z)) return 0;
      if (L0 === "aerodromo" && Math.abs(z + 6.5) < 6.2) return 0;
      const d = Math.hypot(x, z); return d < 3.2 ? 0.32 : d < 6 ? 0.6 : 1;
    }, L0 === "bosque" ? 20000 : 16000)));
    if (rec.agua) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(600, 300), new THREE.MeshBasicMaterial({ color: "#2aa7c0" }));
      w.rotation.x = -Math.PI / 2; w.position.set(0, 0.05, -165); w.layers.set(NOINK); R.add(w); this.agua = w;
      const foam = new THREE.Mesh(new THREE.PlaneGeometry(600, 1.2), new THREE.MeshBasicMaterial({ color: "#f4fbff" }));
      foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.06, -15.2); foam.layers.set(NOINK); R.add(foam);
    }
    // colinas y montañas con relieve real (anillo); la playa mira al mar y se queda con las de antes
    // fondo fotográfico (Pollinations): un cilindro de 360° alrededor con la foto en espejo; reemplaza relieve,
    // bosques lejanos, bruma, nubes y cielo pintado. Lo cercano (suelo, pasto, casas, muros, gente) sigue en 3D.
    const fondo = this.interior ? null : fondoDe(e.fondoImg);
    if (fondo) {
      const Rf = 170, img = fondo.tex.image as HTMLImageElement, asp = img.width / img.height, H = (2 * Math.PI * Rf) / (2 * asp);
      const t = fondo.tex.clone(); t.repeat.set(-2, 1); t.offset.set(1.5, 0); t.needsUpdate = true;   // centro de la foto hacia -z, sin espejo (BackSide)
      const cil = new THREE.Mesh(new THREE.CylinderGeometry(Rf, Rf, H, 128, 1, true), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, toneMapped: false, depthWrite: false }));
      const bajo = 1.6 - (1 - 0.62) * H; cil.position.set(0, bajo + H / 2, -6); cil.layers.set(NOINK); cil.renderOrder = -0.9; R.add(cil);
      this.fondoCielo = fondo.cielo; this.fondoSuelo = fondo.suelo;
    }
    const conRelieve = !this.interior && !aire && L0 !== "playa" && !fondo;
    if (conRelieve) {
      const sd = SEM % 97;
      const ki = NOCHE ? 0.25 : 0.5, nn = <T extends THREE.Object3D>(o: T) => (NOIR ? oscurecer(o, ki) : o);
      R.add(nn(relieve(L0, sd))); if (verde) R.add(nn(arboleda(L0, r, (x, z) => libre(x, z, 3) && this.fuera(x, z, 3))));
      const bq = bosqueLejano(L0, sd, r); if (bq) R.add(nn(bq));
      const br = brumas(); R.add(br.g); this.brumaMats = br.mats;
    }
    if (rec.colinas && !conRelieve && !fondo) for (let i = 0; i < 18; i++) {
      const a = Math.PI * (0.05 + 0.9 * (i / 17)) + (r() - 0.5) * 0.1, d = 90 + r() * 70;
      const h = mesh(GEO.sph, col(rec.colinas), Math.cos(a) * d * 1.3, -6, -Math.sin(a) * d);
      h.scale.set(30 + r() * 30, 14 + r() * 12, 22 + r() * 16); h.castShadow = false; R.add(h);
    }
    if (rec.montanas && !conRelieve && !fondo) for (let i = 0; i < 9; i++) {
      const x = -260 + i * 65 + r() * 20, z = -240 - r() * 80, s = 70 + r() * 60, h = 80 + r() * 70;
      const m = mesh(GEO.cone, col(e.ambiente.lugar === "desierto" ? "#c98e58" : "#7d8aa6"), x, h / 2 - 4, z); m.scale.set(s, h, s); m.castShadow = false; R.add(m);
      if (e.ambiente.lugar !== "desierto") { const c = mesh(GEO.cone, mat("nieve", () => ({ map: snow() })), x, h - 4 - h * 0.14, z); c.scale.set(s * 0.29, h * 0.29, s * 0.29); c.castShadow = false; R.add(c); }
    }
    if (L0 === "interior") this.habitacion(R); else if (L0 === "cabina") this.cabina(R, r); else if (this.interior) this.sala = EP.sala(R, L0, SEM, e.objetos ?? [], { bebe: !!e.ambiente.bebeEnCuna }) ?? null;
    if (aire) this.vuelo(R, r);
    if (duro) this.acera(R, L0);
    if (!(L0 === "mansion" && (e.objetos ?? []).some((o) => o.tipo === "mansion"))) rec.fondo?.(R, r);
    // esparcir escenografía fuera del escenario y del cono de cámara
    for (const [tipo, n] of rec.esparcir) {
      let puestos = 0;
      for (let k = 0; k < n * 12 && puestos < n; k++) {
        const a = r() * Math.PI * 2, d = 9 + r() * (tipo === "casa" ? 30 : 45), x = Math.cos(a) * d * 1.2, z = Math.sin(a) * d - 6;
        if (!libre(x, z, tipo === "casa" ? 4 : 1.5) || !this.fuera(x, z, tipo === "casa" ? 4 : 1.5)) continue;
        const o = build[tipo](r, e.ambiente.lugar); o.position.set(x, 0, z); o.rotation.y = tipo === "casa" ? Math.round(r() * 4) * (Math.PI / 2) * 0 + (r() - 0.5) * 0.5 : r() * 6.28;
        R.add(o); puestos++;
      }
    }
    // set denso cerca del escenario (casas mirando al centro, puestos, letreros, estandartes, antorchas…)
    for (const [p, n, r0, r1] of SET[e.ambiente.lugar] ?? []) {
      let puestos = 0;
      for (let k = 0; k < n * 20 && puestos < n; k++) {
        const a = r() * Math.PI * 2, d = r0 + r() * (r1 - r0), x = Math.cos(a) * d * 1.15, z = Math.sin(a) * d - 3;
        const rad = p === "casa" ? 4 : p === "campana" || p === "puesto" ? 2 : 1.2;
        if (!libre(x, z, rad) || !this.fuera(x, z, rad)) continue;
        if (this.decor.some((q) => Math.hypot(q[0] - x, q[1] - z) < q[2] + rad)) continue;
        const o = pieza(p, r, e.ambiente.lugar); o.position.set(x, 0, z);
        o.rotation.y = Math.atan2(-x, -z) + (p === "casa" || p === "puesto" || p === "letrero" || p === "campana" || p === "banco" ? (r() - 0.5) * 0.3 : r() * 6.28);
        R.add(o); this.decor.push([x, z, rad]); puestos++;
      }
    }
    for (const [p, n, r0, r1] of NOIR ? CERCA[e.ambiente.lugar] ?? [] : []) {
      let puestos = 0;
      for (let k = 0; k < n * 25 && puestos < n; k++) {
        const a = r() * Math.PI * 2, d = r0 + r() * (r1 - r0), x = Math.cos(a) * d * 1.1, z = Math.sin(a) * d - 2;
        const rad = p === "auto" ? 2.4 : p === "kiosco" || p === "arbol" ? 1.5 : 0.8;
        if (!cerca(x, z, rad) || !this.fuera(x, z, rad)) continue;
        if (z > 0.5 && p !== "farola" && p !== "auto") continue;                      // nada que tape la cámara por delante
        if (L0 === "calle" && p !== "auto" && Math.abs(x) < 5.2) continue;                  // en la acera, no en la calzada
        if (this.decor.some((q) => Math.hypot(q[0] - x, q[1] - z) < q[2] + rad)) continue;
        const o = pieza(p, r, e.ambiente.lugar); o.position.set(x, 0, z);
        o.rotation.y = p === "auto" ? (x < 0 ? Math.PI / 2 : -Math.PI / 2) : p === "kiosco" || p === "banca" || p === "buzon" ? Math.atan2(-x, -z) : r() * 6.28;
        if (p === "auto") o.position.x = Math.sign(x) * 3.8;
        R.add(o); this.decor.push([o.position.x, z, rad]); puestos++;
      }
    }
    if (!this.interior && !aire && !verde && !duro && L0 !== "puerto") matas(R, r, e.ambiente.lugar);
    // objetos del diseñador (sí pueden ir en el escenario: son parte de la historia)
    for (const ob of e.objetos ?? []) this.objeto(R, ob, r, e.ambiente.lugar);
    // inventario de obstáculos (todo lo sólido y no muy grande; el suelo, el cielo y las colinas lejanas no cuentan)
    const caja = new THREE.Box3(), tam = new THREE.Vector3(), cen = new THREE.Vector3();
    for (const ch of R.children) {
      if (ch === this.sky || ch === ground || ch instanceof THREE.Light || ch.layers.mask === 1 << NOINK || ch.userData.sinObst) continue;
      caja.setFromObject(ch); if (caja.isEmpty()) continue;
      caja.getSize(tam); caja.getCenter(cen);
      if (tam.y < 0.7 || Math.max(tam.x, tam.z) > 40 || Math.hypot(cen.x, cen.z) > 80) continue;
      this.obstaculos.push({ x: cen.x, z: cen.z, r: 0.5 * Math.max(tam.x, tam.z) * 0.9, h: caja.max.y });
    }
    // lo que brilla (fuego, ventanas, faroles) va sin tinta
    R.traverse((o) => { if (o instanceof THREE.Mesh && (o.material as THREE.Material).userData?.glow) o.layers.set(NOINK); });
    // fuentes de luz cálida (marcadas con calida() dentro de cada pieza)
    R.updateMatrixWorld(true);
    R.traverse((o) => { const c = o.userData.calida; if (c) this.fuentes.push({ p: o.getWorldPosition(new THREE.Vector3()), col: c.col, r: c.r, i: c.i, flick: c.flick }); });
    const llueve = e.ambiente.clima ? e.ambiente.clima === "lluvia" : NOIR;
    if (llueve && !this.interior && !aire) this.mojado(R, L0, r);
    if (!this.interior && !aire && (e.ambiente.clima === "lluvia" || e.ambiente.clima === "nieve")) this.precipitacion(R, e.ambiente.clima);
    if (!this.interior && !aire && e.ambiente.clima === "nieve") this.nevado(R, r);
    // luna con halo (de noche)
    if (NOCHE && !this.interior) {
      const lu = new THREE.Group();
      const disco = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: untone("#fff4d6").multiplyScalar(1.6), fog: false }));
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: haloTex(), color: new THREE.Color("#b9c8ff").multiplyScalar(0.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      disco.scale.setScalar(26); halo.scale.setScalar(200); halo.position.z = -1;
      lu.add(halo, disco); lu.traverse((o) => o.layers.set(NOINK)); lu.renderOrder = -0.9;
      R.add(lu); this.luna = lu;
    }
    // nubes (tarjetas planas, lejos)
    // nubes con volumen (cúmulos de bolas)
    // cielo fotográfico (día y atardecer): trae sus propias nubes
    const cieloFoto = this.interior || aire || e.ambiente.hora === "noche" || fondo || (e.ambiente.clima && e.ambiente.clima !== "despejado") || (NOIR && !e.ambiente.clima) ? null : foto(e.ambiente.hora === "dia" ? "cieloDia" : "cieloAtardecer");
    if (cieloFoto) { this.sky.material = new THREE.MeshBasicMaterial({ map: cieloFoto, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }); }
    if (!this.interior && !aire && !cieloFoto && !fondo && !(NOIR && NOCHE)) { const pal = NOIR ? (NOCHE ? { lit: "#3c4458", mid: "#2b3244", shade: "#1d2232" } : { lit: "#c4c6c8", mid: "#9ea2a8", shade: "#767c84" }) : e.ambiente.hora === "noche" ? { lit: "#9aa8d4", mid: "#6e7cab", shade: "#4a5684" } : this.luz.K.cloud; this.nubes3d = nubes(r, pal, 12); R.add(this.nubes3d); }
    if (false) {
      const pal = CLOUD_DAY;
      for (let i = 0; i < 7; i++) {
        const t = cloudHD(i % 4, pal);
        const c = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
        const a = Math.PI * (0.15 + 0.7 * r()), d = 260 + r() * 200;
        c.position.set(Math.cos(a) * d, 70 + r() * 90, -Math.sin(a) * d); c.scale.set(140 + r() * 80, 70 + r() * 40, 1);
        c.layers.set(NOINK); c.renderOrder = -0.8; R.add(c); this.clouds.push(c);
      }
    }
    // dirección del sol relativa al escenario (fija por escena; la luz de la plantilla es relativa a la cámara,
    // aquí la ponemos relativa a la cámara típica que mira hacia -z)
    const L = this.luz.L, az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
    this.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
  }

  private decor: [number, number, number][] = [];
  private dur = 6;
  private clima: Clima | undefined;
  private gotas: { geo: THREE.BufferGeometry; base: Float32Array; v: Float32Array; nieve: boolean } | null = null;
  /** lluvia (rayas inclinadas) o nieve (copos que bajan meciéndose) alrededor de la cámara */
  private precipitacion(R: THREE.Group, clima: Clima) {
    const nieve = clima === "nieve", n = nieve ? 2600 : 3200, r = rng(77);
    const base = new Float32Array(n * 3), v = new Float32Array(n), pos = new Float32Array(n * (nieve ? 3 : 6));
    for (let i = 0; i < n; i++) { base[i * 3] = (r() - 0.5) * 60; base[i * 3 + 1] = r() * 22; base[i * 3 + 2] = (r() - 0.5) * 60; v[i] = nieve ? 0.9 + r() * 0.8 : 15 + r() * 6; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const o = nieve ? new THREE.Points(geo, new THREE.PointsMaterial({ color: "#f4f6fa", size: 0.09, transparent: true, opacity: 0.9, depthWrite: false }))
      : new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: NOCHE ? "#8a9ab8" : "#c4ccd6", transparent: true, opacity: NOCHE ? 0.45 : 0.55, depthWrite: false }));
    o.frustumCulled = false; o.layers.set(NOINK); o.renderOrder = 2; R.add(o);
    this.gotas = { geo, base, v, nieve };
  }
  /** manchas de nieve en el suelo y en los techos cercanos */
  private nevado(R: THREE.Group, r: () => number) {
    const m = new THREE.MeshBasicMaterial({ color: "#eef2f6", alphaMap: charcoTex(), transparent: true, depthWrite: false });
    for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, d = 3 + r() * 30; const c = new THREE.Mesh(new THREE.PlaneGeometry(3 + r() * 5, 2 + r() * 4), m);
      c.rotation.x = -Math.PI / 2; c.rotation.z = r() * 3; c.position.set(Math.cos(a) * d, 0.03, Math.sin(a) * d - 4); c.layers.set(NOINK); R.add(c); }
  }
  private fuera: (x: number, z: number, rad: number) => boolean = () => true;
  private pasan: { o: THREE.Object3D; x0: number; v: number; s0?: THREE.Vector3 }[] = [];
  private ventanillas: THREE.Texture[] = [];

  /** en pleno vuelo: sin suelo; mar muy abajo, un colchón de nubes y nubes sueltas que pasan hacia atrás */
  private vuelo(R: THREE.Group, r: () => number) {
    const L = this.luz.L;
    // cielo con contraste (no una masa gris): claro en el horizonte, más oscuro arriba
    this.luz = { ...this.luz, L: { ...L, fog: NOCHE ? "#2a3346" : "#c9cfd4", fogNear: 40, fogFar: 520 },
      K: { ...this.luz.K, sky: NOCHE ? { c: ["#2e3850", "#232c40", "#1a2132", "#121826", "#0b0f18"], e: [0, 4, 12, 26, 60] }
        : { c: ["#e6e9ec", "#d3d9de", "#b1bcc6", "#8d9aa8", "#6c7a8a"], e: [0, 5, 14, 28, 62] } } };
    const mar = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: NOCHE ? "#0e141e" : "#56626c" }));
    mar.rotation.x = -Math.PI / 2; mar.position.y = -420; mar.layers.set(NOINK); R.add(mar);
    const blanco = col(NOCHE ? "#7d889c" : "#f4f5f6"), sombra = col(NOCHE ? "#56607a" : "#d6dbe0");
    const nube = (s: number) => {
      const g = new THREE.Group(), k = 4 + Math.floor(r() * 5);
      for (let i = 0; i < k; i++) {
        const b = mesh(GEO.sph, i % 3 === 2 ? sombra : blanco, (i - k / 2) * s * 0.55 + (r() - 0.5) * s * 0.3, (r() - 0.3) * s * 0.35, (r() - 0.5) * s * 0.5);
        b.scale.set(s * (0.7 + r() * 0.5), s * (0.45 + r() * 0.3), s * (0.6 + r() * 0.4)); b.castShadow = false; b.receiveShadow = false; g.add(b);
      }
      return g;
    };
    const todas = new THREE.Group();
    // colchón de nubes abajo (lento) y nubes sueltas a la altura del avión (rápidas): dan la sensación de velocidad
    for (let i = 0; i < 70; i++) { const o = nube(9 + r() * 10); o.position.set(0, -26 - r() * 14, -260 + r() * 300); o.scale.y = 0.6; todas.add(o); this.pasan.push({ o, x0: -230 + r() * 460, v: 7 }); }
    for (let i = 0; i < 34; i++) {
      const lado = r() < 0.75 ? -1 : 1, z = lado < 0 ? -14 - r() * 110 : 34 + r() * 60;
      const o = nube(2.5 + r() * 4); o.position.set(0, -9 + r() * 22, z); todas.add(o); this.pasan.push({ o, x0: -230 + r() * 460, v: 24 + r() * 8 });
    }
    R.add(todas);
  }

  /** adentro del avión: fuselaje estrecho de chapa, tablero de instrumentos y ventanillas con el cielo que pasa */
  private cabina(R: THREE.Group, r: () => number) {
    const mx = 1.15, H = 1.75, z0 = -1.2, chapa = col("#8e959c"), oscura = col("#4a5058"), cuero = col("#5a3e2c");
    const fondo = mesh(GEO.box, chapa, 0, H / 2, z0 - 0.1); fondo.scale.set(mx * 2 + 0.4, H, 0.2); R.add(fondo);
    for (const s of [-1, 1]) { const w = mesh(GEO.box, chapa, s * (mx + 0.1), H / 2, 3.4); w.scale.set(0.2, H, 9.4); R.add(w); }
    const te = mesh(GEO.box, oscura, 0, H + 0.08, 3.4); te.scale.set(mx * 2 + 0.4, 0.16, 9.4); te.castShadow = false; R.add(te);
    for (let k = 0; k < 9; k++) { const c = mesh(GEO.box, oscura, 0, H - 0.02, z0 + 0.4 + k * 1.0); c.scale.set(mx * 2, 0.06, 0.08); R.add(c); }   // cuadernas
    for (let k = 0; k < 9; k++) for (const s of [-1, 1]) { const c = mesh(GEO.box, oscura, s * mx, H / 2, z0 + 0.4 + k * 1.0); c.scale.set(0.04, H, 0.08); R.add(c); }
    // ventanillas: el cielo con nubes se desliza (el avión avanza)
    const cielo = ctex("cieloVentanilla", 512, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#7d8a98"); gr.addColorStop(0.6, "#c9d0d6"); gr.addColorStop(1, "#e4e7ea");
      g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(255,255,255,${0.55 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * 512, 120 + r() * 120, 30 + r() * 60, 12 + r() * 20, 0, 0, 7); g.fill(); }
    }).clone();
    cielo.wrapS = THREE.RepeatWrapping; cielo.needsUpdate = true; this.ventanillas.push(cielo);
    const vidrio = new THREE.MeshBasicMaterial({ map: cielo, toneMapped: false });
    for (const s of [-1, 1]) for (const z of [-0.5, 0.6]) {
      const v = new THREE.Mesh(GEO.box, vidrio); v.position.set(s * (mx - 0.05), 1.12, z); v.scale.set(0.02, 0.55, 0.8); v.layers.set(NOINK); R.add(v);
      const m = mesh(GEO.box, oscura, s * (mx + 0.0), 1.12, z); m.scale.set(0.03, 0.65, 0.9); R.add(m);
    }
    // tablero de instrumentos frente al piloto (bajo, para verle la cara) y palanca
    const tab = mesh(GEO.box, col("#2c2e33"), 0, 0.32, 0.95); tab.scale.set(1.5, 0.64, 0.3); R.add(tab);
    for (let k = 0; k < 5; k++) { const rel = mesh(GEO.cyl, col("#e9e4d6"), -0.56 + k * 0.28, 0.66, 0.9); rel.scale.set(0.16, 0.03, 0.16); R.add(rel);
      const ag = mesh(GEO.box, col("#1a1a1e"), -0.56 + k * 0.28, 0.69, 0.9); ag.scale.set(0.015, 0.01, 0.07); ag.rotation.y = r() * 3; R.add(ag); }
    const pal = mesh(GEO.cyl, oscura, 0.05, 0.3, 0.45); pal.scale.set(0.05, 0.6, 0.05); pal.rotation.x = -0.25; R.add(pal);
    // asiento de cuero detrás del piloto y una luz fría de las ventanillas
    const resp = mesh(GEO.box, cuero, 0, 0.75, -0.55); resp.scale.set(0.8, 1.0, 0.14); R.add(resp);
    const as = mesh(GEO.box, cuero, 0, 0.16, -0.25); as.scale.set(0.8, 0.32, 0.6); R.add(as);
    const luz = new THREE.PointLight("#dfe8f2", 16, 7, 1.4); luz.position.set(0, 1.5, 1.2); R.add(luz);
    calida(R, 0, 1.5, 1.6, "#e8eef4", 1.0, 5);
    this.sala = { mx: mx - 0.15, h: H - 0.12, z0 };
  }

  /** aceras de piedra a los lados de la calle y franja central de la calzada */
  private acera(R: THREE.Group, L0: string) {
    if (L0 !== "calle") return;
    for (const s of [-1, 1]) { const a = mesh(GEO.box, mat("acera30", () => ({ map: rep(concretoTex(), 2, 30) })), s * 6.4, 0.1, 0); a.scale.set(3.4, 0.2, 160); R.add(a);
      const b = mesh(GEO.box, col("#8a8a8a"), s * 4.7, 0.1, 0); b.scale.set(0.2, 0.22, 160); R.add(b); }
  }

  /** piso mojado: charcos oscuros que brillan y el reflejo largo de cada luz cálida hacia la cámara */
  private mojado(R: THREE.Group, L0: string, r: () => number) {
    const duro = ["calle", "gasolinera", "puerto"].includes(L0);
    const cm = new THREE.MeshBasicMaterial({ color: NOCHE ? "#24324c" : "#3a4046", alphaMap: charcoTex(), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let k = 0; k < (NOCHE ? (duro ? 22 : 8) : 5); k++) {
      const a = r() * Math.PI * 2, d = 2 + r() * 22, x = Math.cos(a) * d, z = Math.sin(a) * d - 4;
      const c = new THREE.Mesh(new THREE.PlaneGeometry(2 + r() * 3, 1.5 + r() * 2.5), cm); c.rotation.x = -Math.PI / 2; c.rotation.z = r() * 3; c.position.set(x, 0.025, z); c.layers.set(NOINK); R.add(c);
    }
    for (const f of this.fuentes) {
      if (f.p.y < 1.4 || Math.hypot(f.p.x, f.p.z) > 45) continue;
      const m = new THREE.MeshBasicMaterial({ map: reflejoTex(), color: f.col.clone().multiplyScalar(duro ? 0.9 : 0.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, f.p.y * 2.6), m); p.rotation.x = -Math.PI / 2;
      p.position.set(f.p.x, 0.035, f.p.z + f.p.y * 1.1); p.layers.set(NOINK); p.renderOrder = 1; R.add(p);
    }
  }

  /** fija las fuentes cálidas de este cuadro (las del decorado + las que pasa el elenco: antorchas, luces masivas) */
  calidas(cam: THREE.PerspectiveCamera, foco: THREE.Vector3, t: number, extra: Fuente[] = []) {
    fijarCalidas(extra.length ? [...this.fuentes, ...extra] : this.fuentes, cam, foco, t, this.calidaK);
  }

  private objeto(R: THREE.Group, ob: Objeto, r: () => number, lugar: Lugar) {
    const f = build[ob.tipo];
    if (!f) return;
    const o = f(r, lugar);
    o.position.set(ob.x, 0, ob.z); o.rotation.y = ob.giro ?? 0; o.scale.multiplyScalar(ob.escala ?? 1);
    if (ob.material && ob.material !== "normal") aplicarMaterial(o, ob.material);
    if (ob.estado === "tirada") { o.rotation.order = "YXZ"; o.rotation.x = -(Math.PI / 2 - 0.32); o.position.y = 0.05; R.add(o); return; }
    R.add(o);
    if (ob.estado && ob.estado !== "normal") this.vivos.push({ o, ob, y0: 0, s0: o.scale.clone(), dir: r() < 0.5 ? -1 : 1 });
  }

  private habitacion(R: THREE.Group) {
    const W = 16, D = 14, H = 5.5, wall = col("#e9d8bc"), trim = col("#8a5a34");
    const back = mesh(GEO.box, wall, 0, H / 2, -D / 2); back.scale.set(W, H, 0.3); R.add(back);
    for (const s of [-1, 1]) { const w = mesh(GEO.box, wall, s * W / 2, H / 2, 0); w.scale.set(0.3, H, D); R.add(w); }
    const ceil = mesh(GEO.box, col("#d8c6a6"), 0, H, 0); ceil.scale.set(W, 0.3, D); ceil.castShadow = false; R.add(ceil);
    const base = mesh(GEO.box, trim, 0, 0.2, -D / 2 + 0.2); base.scale.set(W, 0.4, 0.1); R.add(base);
    for (const x of [-4, 4]) {
      const win = new THREE.Mesh(GEO.box, glow("#cfe8ff", 1.6)); win.position.set(x, 2.8, -D / 2 + 0.17); win.scale.set(2.2, 1.8, 0.05); R.add(win);
      const fr = mesh(GEO.box, trim, x, 2.8, -D / 2 + 0.19); fr.scale.set(0.12, 1.9, 0.06); R.add(fr);
      const fr2 = mesh(GEO.box, trim, x, 2.8, -D / 2 + 0.19); fr2.scale.set(2.3, 0.12, 0.06); R.add(fr2);
    }
    const lamp = new THREE.PointLight("#ffd9a0", 18, 18, 1.6); lamp.position.set(0, 4.4, 0); R.add(lamp);
    calida(R, 0, 4.2, 0, "#ffd9a0", 0.5, 12);
    // chimenea con fuego (pared izquierda)
    const ch = mesh(GEO.box, mat("chimenea", () => ({ map: rep(stoneHD(), 1, 2) })), -W / 2 + 0.6, 1.6, -2.5); ch.scale.set(1.0, 3.2, 2.6); R.add(ch);
    const hueco = mesh(GEO.box, col("#2a1a14"), -W / 2 + 1.12, 0.75, -2.5); hueco.scale.set(0.05, 1.3, 1.5); R.add(hueco);
    fuego(R, -W / 2 + 1.05, 0.1, -2.5, 0.62, false);
    calida(R, -W / 2 + 2.0, 0.9, -2.5, "#ff8a30", 2.2, 7, 1);
    // estante con frascos (pared del fondo)
    for (const x of [-5.5, 5.5]) {
      const est = mesh(GEO.box, trim, x, 1.6, -D / 2 + 0.45); est.scale.set(2.4, 3.2, 0.6); R.add(est);
      for (let k = 0; k < 3; k++) { const tb = mesh(GEO.box, col("#c9a06a"), x, 0.6 + k * 0.95, -D / 2 + 0.8); tb.scale.set(2.3, 0.06, 0.5); R.add(tb);
        for (let j = 0; j < 4; j++) { const fr = mesh(GEO.cyl, col(["#7fa8d8", "#e04a3a", "#f2c84b", "#7cc24a"][(j + k) % 4]), x - 0.8 + j * 0.53, 0.82 + k * 0.95, -D / 2 + 0.8); fr.scale.set(0.28, 0.38, 0.28); R.add(fr); } }
    }
    // cuadros en la pared y alfombra
    for (const [x, c] of [[0, "#7fa8d8"], [-2.2, "#e8a07a"], [2.2, "#7cc24a"]] as [number, string][]) {
      const m2 = mesh(GEO.box, trim, x, 3.5, -D / 2 + 0.2); m2.scale.set(1.2, 0.9, 0.06); R.add(m2);
      const lz = mesh(GEO.box, col(c), x, 3.5, -D / 2 + 0.24); lz.scale.set(0.95, 0.65, 0.02); R.add(lz);
    }
    const alf = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32), col("#a8433a")); alf.rotation.x = -Math.PI / 2; alf.position.y = 0.015; alf.receiveShadow = true; R.add(alf);
    const alf2 = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.85, 32), col("#f2c84b")); alf2.rotation.x = -Math.PI / 2; alf2.position.y = 0.02; R.add(alf2);
    // mesa con sillas y macetas en las esquinas
    const me = build.mesa(Math.random, "interior"); me.position.set(5.2, 0, -2.2); me.rotation.y = 0.3; R.add(me);
    for (const [x, z, a] of [[4.0, -1.6, 1.2], [6.3, -2.9, -2.0]]) { const s = build.silla(Math.random, "interior"); s.position.set(x, 0, z); s.rotation.y = a; R.add(s); }
    for (const [x, z] of [[-7, -6], [7, -6], [-7, 4], [7, 4]]) { const p = deco.maceta(Math.random); p.position.set(x, 0, z); R.add(p); }
    fuego(R, 5.2, 0.98, -2.2, 0.12, false);
  }

  /** luz, cielo y niebla por cuadro (uniformes compartidos de shade.ts) */
  update(cam: THREE.PerspectiveCamera, scene: THREE.Scene, focus: THREE.Vector3, t: number) {
    const L = this.luz.L, K = this.luz.K;
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const dist = cam.position.distanceTo(focus), Rr = THREE.MathUtils.clamp(dist * 1.15 + 9, 14, 80);
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    if (OSCURO) { TONE.uShadeCol.value.set(0.04, 0.045, 0.08); TONE.uShadeLift.value.set(0.01, 0.012, 0.02); }
    else if (this.interior) { if (NOIR) { TONE.uShadeCol.value.set(0.17, 0.16, 0.22); TONE.uShadeLift.value.set(0.02, 0.02, 0.03); } else { TONE.uShadeCol.value.set(0.55, 0.5, 0.62); TONE.uShadeLift.value.set(0.06, 0.05, 0.06); } }
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(this.fondoCielo ?? h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    // bruma de la referencia: lo lejano se acerca al color del horizonte (montañas azuladas de día, rosadas al atardecer)
    untone(this.fondoSuelo ?? L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = this.interior ? 400 : Math.max(L.fogFar, this.brumaMats.length ? 720 : 460);
    for (const m of this.brumaMats) untone(L.fog, m.color);
    PASTO_U.uTime.value = t; FUEGO_U.uTime.value = t; FUEGO_U.uNoche.value = this.luz.nombre === "night" ? 1 : 0;
    scene.fog = this.fog; scene.background = null;
    for (const c of this.clouds) c.lookAt(cam.position.x, c.position.y, cam.position.z);
    for (const n of this.pasan) { const w = 460; const x = ((((n.x0 - n.v * t) + w / 2) % w) + w) % w - w / 2; n.o.position.x = x;
      n.s0 = n.s0 ?? n.o.scale.clone(); const k = Math.min(1, Math.max(0.001, (w / 2 - Math.abs(x)) / 70)); n.o.scale.copy(n.s0).multiplyScalar(k * k * (3 - 2 * k)); }
    for (const tx of this.ventanillas) tx.offset.x = (t * 0.09) % 1;
    if (this.gotas) {
      const { geo, base, v, nieve } = this.gotas, p = geo.attributes.position.array as Float32Array, n = v.length, cx = cam.position.x, cz = cam.position.z - 12;
      for (let i = 0; i < n; i++) {
        const y = (((base[i * 3 + 1] - v[i] * t) % 22) + 22) % 22, x = cx + base[i * 3] + (nieve ? 0.4 * Math.sin(t * 0.8 + i) : -0.12 * y), z = cz + base[i * 3 + 2];
        if (nieve) { p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z; }
        else { p[i * 6] = x; p[i * 6 + 1] = y; p[i * 6 + 2] = z; p[i * 6 + 3] = x + 0.08; p[i * 6 + 4] = y + 0.55; p[i * 6 + 5] = z; }
      }
      geo.attributes.position.needsUpdate = true;
    }
    if (this.luna) { this.luna.position.copy(cam.position).addScaledVector(new THREE.Vector3(-this.sunDir.x, Math.max(0.35, this.sunDir.y), this.sunDir.z).normalize(), 900); this.luna.lookAt(cam.position); }
    if (this.agua) untone(K.water.near, (this.agua.material as THREE.MeshBasicMaterial).color);
    // estados animados de los objetos de la historia
    for (const v of this.vivos) {
      const t0 = v.ob.t ?? 0, u = t - t0;
      v.o.position.set(v.ob.x, v.y0, v.ob.z); v.o.scale.copy(v.s0); v.o.rotation.x = 0; v.o.rotation.z = 0; v.o.visible = true;
      if (v.ob.estado === "derrumbe" && u > 0) {
        const k = clamp01(u / 0.7), e = k * k;                      // cae acelerando
        v.o.rotation.z = v.dir * 1.25 * e; v.o.rotation.x = 0.25 * e;
        v.o.position.y = -0.35 * e; v.o.scale.y = v.s0.y * (1 - 0.45 * e);
        if (k >= 1) { const b = Math.max(0, 1 - (u - 0.7) / 0.25); v.o.rotation.z += v.dir * 0.05 * Math.sin((u - 0.7) * 40) * b; }
      } else if (v.ob.estado === "temblor" && u > 0) {
        v.o.position.x = v.ob.x + 0.06 * Math.sin(u * 47); v.o.rotation.z = 0.025 * Math.sin(u * 39);
      } else if (v.ob.estado === "aparece") {
        if (u < 0) v.o.visible = false;
        else { const k = clamp01(u / 0.45), sc = k < 1 ? 1.15 * Math.sin(k * Math.PI * 0.62) / Math.sin(Math.PI * 0.62) : 1; v.o.scale.copy(v.s0).multiplyScalar(Math.max(0.001, Math.min(1.15, sc))); }
      } else if (v.ob.estado === "despega" || v.ob.estado === "aterriza" || v.ob.estado === "vuela") {
        const m = movObjeto(v.ob, t, this.dur);
        v.o.position.set(m.x, m.y, m.z); v.o.rotation.z = m.rz; v.o.rotation.x = m.rx;
        const he = v.o.getObjectByName("helice"); if (he) he.rotation.x = t * 29;
      } else if (v.ob.estado === "sube" && u > 0) {
        const k = clamp01(u / 1.6); v.o.position.y = 3.2 * k * k * (3 - 2 * k);
      }
    }
    void V;
  }
}
