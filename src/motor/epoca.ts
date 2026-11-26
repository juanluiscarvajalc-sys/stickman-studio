// Época años 30 (casos policiales): objetos, edificios, salas interiores y decorado de los lugares nuevos.
// Recibe los ayudantes de mundo.ts (materiales twoTone, mallas, brillos y luces cálidas) para verse igual que el resto.
import * as THREE from "three";
import { ctex, rep, planksHD, rng } from "./paint";
import { cajaGeo, cilGeo, piedraMuroTex } from "./formas";

export type Ayuda = {
  mesh: (g: THREE.BufferGeometry, m: THREE.Material, x?: number, y?: number, z?: number) => THREE.Mesh;
  mat: (key: string, make: () => THREE.MeshLambertMaterialParameters, liftK?: number) => THREE.Material;
  col: (c: string) => THREE.Material;
  glow: (c: string, k?: number) => THREE.Material;
  calida: (g: THREE.Object3D, x: number, y: number, z: number, hex: string, i: number, r: number, flick?: number) => THREE.Object3D;
  halo: (g: THREE.Object3D, x: number, y: number, z: number, hex: string, s: number, k?: number) => THREE.Sprite;
  noche: () => boolean;
  apagado?: () => boolean;
};

const B = new THREE.BoxGeometry(1, 1, 1), CY = new THREE.CylinderGeometry(0.5, 0.5, 1, 18), SP = new THREE.SphereGeometry(0.5, 16, 12);
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length) % a.length];

// ---------------- texturas ----------------
export const ladrilloTex = (base = "#9a4a34") => ctex("ladrillo30" + base, 512, 512, (g, r) => {
  g.fillStyle = "#c9b8a0"; g.fillRect(0, 0, 512, 512);
  const bw = 64, bh = 22;
  for (let y = 0, f = 0; y < 512; y += bh, f++) for (let x = -(f % 2) * bw / 2; x < 512; x += bw) {
    const c = new THREE.Color(base).offsetHSL((r() - 0.5) * 0.03, (r() - 0.5) * 0.1, (r() - 0.5) * 0.1);
    g.fillStyle = "#" + c.getHexString(); g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    if (r() < 0.2) { g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(x + 2 + r() * 40, y + 4, 14, bh - 8); }
  }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(30,20,20,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 60, 8 + r() * 30, r() * 3, 0, 7); g.fill(); }
});
export const asfaltoTex = () => ctex("asfalto30", 1024, 1024, (g, r) => {
  g.fillStyle = "#5d5c60"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 9000; i++) { const v = 70 + r() * 40; g.fillStyle = `rgba(${v},${v},${v + 4},0.5)`; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 3, 2 + r() * 3); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(30,30,35,${0.08 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 30 + r() * 120, 10 + r() * 50, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(25,25,28,0.55)"; g.lineWidth = 2;
  for (let i = 0; i < 18; i++) { let x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 70; y += (r() - 0.5) * 70; g.lineTo(x, y); } g.stroke(); }
});
/** piso de baldosas en damero (almacén, cafetería) */
export const ajedrezTex = () => ctex("ajedrez30", 256, 256, (g) => {
  g.fillStyle = "#e6e0d0"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#2f3a3a"; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128);
  g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
});
/** frente de una repisa llena: 0 = latas con etiqueta, 1 = cajas y paquetes, 2 = frascos y botellas */
export const productosTex = (k: number) => ctex("productos30_" + k, 1024, 192, (g, r) => {
  g.fillStyle = "#3a2a1e"; g.fillRect(0, 0, 1024, 192);
  const cols = ["#c0353a", "#3f6fb5", "#e0a82e", "#5d7a3a", "#e8e2d0", "#8c3b4a", "#2f5f6a", "#d06a2a"];
  let x = 6;
  while (x < 1010) {
    const c = cols[Math.floor(r() * cols.length)];
    if (k === 0) { const w = 58 + r() * 10, h = 120 + r() * 40; g.fillStyle = "#b8b8b4"; g.fillRect(x, 192 - h, w, h);
      g.fillStyle = c; g.fillRect(x, 192 - h + 14, w, h - 28); g.fillStyle = "#f4efe2"; g.fillRect(x + 6, 192 - h * 0.62, w - 12, h * 0.2);
      g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x + 6, 192 - h, 8, h); x += w + 4; }
    else if (k === 1) { const w = 70 + r() * 40, h = 130 + r() * 55; g.fillStyle = c; g.fillRect(x, 192 - h, w, h);
      g.fillStyle = "#f4efe2"; g.beginPath(); g.ellipse(x + w / 2, 192 - h * 0.55, w * 0.34, h * 0.16, 0, 0, 7); g.fill();
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x + w - 8, 192 - h, 8, h); x += w + 3; }
    else { const w = 40 + r() * 16, h = 110 + r() * 70; g.fillStyle = c; g.globalAlpha = 0.85; g.fillRect(x, 192 - h * 0.8, w, h * 0.8); g.fillRect(x + w * 0.3, 192 - h, w * 0.4, h * 0.25); g.globalAlpha = 1;
      g.fillStyle = "#f4efe2"; g.fillRect(x + 4, 192 - h * 0.5, w - 8, h * 0.18); x += w + 6; }
  }
});
export const letreroTex = (texto: string, fondo = "#2f4a3a", tinta = "#f2e6c4") => ctex("letrero_" + texto + fondo, 1024, 160, (g) => {
  g.fillStyle = fondo; g.fillRect(0, 0, 1024, 160); g.strokeStyle = tinta; g.lineWidth = 6; g.strokeRect(12, 12, 1000, 136);
  g.fillStyle = tinta; g.font = "bold 74px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(texto, 512, 84);
});
export const concretoTex = () => ctex("concreto30", 512, 512, (g, r) => {
  g.fillStyle = "#7a7c80"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) { const v = 130 + r() * 50; g.fillStyle = `rgba(${v},${v},${v + 3},0.35)`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(60,60,65,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 80, 10 + r() * 40, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(70,70,75,0.6)"; g.lineWidth = 2; for (const y of [0, 256]) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
});
export const papelTex = (a: string, b: string) => ctex("papel30" + a + b, 256, 256, (g, r) => {
  g.fillStyle = a; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 32) { g.fillStyle = b; g.fillRect(x + 12, 0, 8, 256); }
  for (let y = 16; y < 256; y += 64) for (let x = 0; x < 256; x += 32) { g.fillStyle = b; g.beginPath(); g.arc(x + 16, y + (x % 64 ? 32 : 0), 5, 0, 7); g.fill(); }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(80,60,40,${r() * 0.04})`; g.fillRect(r() * 256, r() * 256, 6, 6); }
});
const corchoTex = () => ctex("corcho30", 1024, 640, (g, r) => {
  g.fillStyle = "#b98a58"; g.fillRect(0, 0, 1024, 640);
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${90 + r() * 60},${60 + r() * 40},30,0.35)`; g.fillRect(r() * 1024, r() * 640, 3, 3); }
  const pins: [number, number][] = [];
  for (let i = 0; i < 11; i++) {
    const x = 60 + (i % 4) * 240 + r() * 60, y = 50 + Math.floor(i / 4) * 200 + r() * 40, w = 110 + r() * 50, h = 80 + r() * 60;
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((r() - 0.5) * 0.15);
    const foto = r() < 0.5;
    g.fillStyle = foto ? "#f1ece0" : "#f6f0d8"; g.fillRect(-w / 2, -h / 2, w, h);
    if (foto) { g.fillStyle = `rgb(${70 + r() * 40},${70 + r() * 40},${75 + r() * 40})`; g.fillRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 24); g.fillStyle = "#c9c2b0"; g.beginPath(); g.arc(0, -6, 14, 0, 7); g.fill(); }
    else { g.strokeStyle = "#5a5a66"; g.lineWidth = 2; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(-w / 2 + 10, -h / 2 + 16 + k * 12); g.lineTo(w / 2 - 10 - r() * 30, -h / 2 + 16 + k * 12); g.stroke(); } }
    g.restore(); pins.push([x + w / 2, y + 6]);
  }
  g.strokeStyle = "#c0262c"; g.lineWidth = 4;
  for (let i = 0; i < 8; i++) { const a = pins[Math.floor(r() * pins.length)], b = pins[Math.floor(r() * pins.length)]; if (a === b) continue; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
  for (const [x, y] of pins) { g.fillStyle = "#d8443a"; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
});
const tumbaTex = () => ctex("tumba30", 256, 256, (g, r) => {
  g.fillStyle = "#a8a8a2"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) { const v = 120 + r() * 70; g.fillStyle = `rgba(${v},${v},${v - 6},0.4)`; g.fillRect(r() * 256, r() * 256, 3, 3); }
  for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(70,90,60,${0.1 + r() * 0.15})`; g.beginPath(); g.ellipse(r() * 256, 180 + r() * 76, 20 + r() * 40, 10 + r() * 20, 0, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(60,60,60,0.7)"; g.lineWidth = 3; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(70, 70 + k * 22); g.lineTo(186 - (k % 2) * 30, 70 + k * 22); g.stroke(); }
});

// ---------------- objetos ----------------
export const crearEpoca = (h: Ayuda) => {
  const { mesh, mat, col, glow, calida, halo } = h;
  const madera = () => mat("madera30", () => ({ map: rep(planksHD(), 1, 1) }));
  const ventana = (g: THREE.Object3D, x: number, y: number, z: number, w: number, hh: number, ry = 0, marco = "#f2efe6", cortina?: string) => {
    const n = h.noche();
    // cada capa a su propia profundidad, separadas a lo largo de la normal de la pared: vidrio, marco, cortinas
    const nx = Math.sin(ry), nz = Math.cos(ry), tx = Math.cos(ry), tz = -Math.sin(ry);
    const pon = (o: THREE.Object3D, lado: number, dy: number, prof: number) => { o.position.set(x + tx * lado + nx * prof, y + dy, z + tz * lado + nz * prof); o.rotation.y = ry; g.add(o); return o; };
    const v = new THREE.Mesh(B, n ? glow("#ffcf80", 2.6) : col("#3c5470")); v.scale.set(w, hh, 0.02); pon(v, 0, 0, 0);
    const f1 = mesh(B, col(marco)); f1.scale.set(w + 0.16, 0.1, 0.08); pon(f1, 0, 0, 0.05);
    const f2 = mesh(B, col(marco)); f2.scale.set(w + 0.16, 0.12, 0.1); pon(f2, 0, hh / 2, 0.06);
    const f3 = mesh(B, col(marco)); f3.scale.set(w + 0.24, 0.12, 0.16); pon(f3, 0, -hh / 2, 0.09);
    const f4 = mesh(B, col(marco)); f4.scale.set(0.08, hh, 0.08); pon(f4, 0, 0, 0.05);
    if (cortina) for (const s of [-1, 1]) { const c = mesh(B, col(cortina)); c.scale.set(w * 0.22, hh * 0.92, 0.03); pon(c, s * w * 0.4, 0.02, 0.2); }
    return n;
  };
  const rueda = (g: THREE.Object3D, x: number, y: number, z: number, r = 0.38) => {
    const w = mesh(CY, col("#1c1c20"), x, y, z); w.scale.set(r * 2, 0.26, r * 2); w.rotation.x = Math.PI / 2; g.add(w);
    const c = mesh(CY, col("#d9d4c8"), x, y, z + Math.sign(z) * 0.1); c.scale.set(r * 0.9, 0.1, r * 0.9); c.rotation.x = Math.PI / 2; g.add(c);
  };
  const auto = (r: () => number, policia = false) => {
    const g = new THREE.Group(), c = policia ? "#16171c" : pick(r, ["#1c1d22", "#4a1f24", "#1f3a2c", "#1f2a44", "#3a3530", "#5a4a3a"]), m = col(c), cromo = col("#cfd3d8");
    const cuerpo = mesh(cajaGeo("auto30", 4, 2, 2, [0.01, 0.02, 0.01]), m, -0.1, 0.78, 0); cuerpo.scale.set(3.0, 0.62, 1.6); g.add(cuerpo);
    const capo = mesh(cajaGeo("capo30", 3, 2, 2, [0.01, 0.02, 0.01]), m, 1.75, 0.92, 0); capo.scale.set(1.25, 0.55, 1.05); g.add(capo);
    const cab = mesh(cajaGeo("cab30", 3, 2, 2, [0.015, 0.02, 0.015]), m, -0.55, 1.5, 0); cab.scale.set(2.0, 0.85, 1.5); g.add(cab);
    for (const s of [-1, 1]) { const v = new THREE.Mesh(B, h.noche() ? col("#2a3550") : col("#7f9bb5")); v.position.set(-0.55, 1.58, s * 0.76); v.scale.set(1.7, 0.5, 0.02); g.add(v); }
    const pv = new THREE.Mesh(B, col("#8fa8c0")); pv.position.set(0.47, 1.56, 0); pv.rotation.z = -0.25; pv.scale.set(0.04, 0.55, 1.3); g.add(pv);
    for (const [x, z] of [[1.5, 0.82], [1.5, -0.82], [-1.25, 0.82], [-1.25, -0.82]]) {
      const gu = mesh(CY, m, x, 0.55, z); gu.scale.set(1.05, 0.34, 1.0); gu.rotation.x = Math.PI / 2; g.add(gu);
      rueda(g, x, 0.4, z);
    }
    for (const s of [-1, 1]) { const st = mesh(B, col("#2a2a2e"), 0.1, 0.4, s * 0.95); st.scale.set(2.2, 0.06, 0.3); g.add(st); }
    const pa = mesh(B, cromo, 2.42, 0.95, 0); pa.scale.set(0.08, 0.5, 0.7); g.add(pa);
    const pa2 = mesh(B, cromo, 2.5, 0.45, 0); pa2.scale.set(0.1, 0.1, 1.6); g.add(pa2);
    for (const s of [-1, 1]) { const f = new THREE.Mesh(SP, h.noche() ? glow("#fff1c4", 3) : col("#e9e4d4")); f.position.set(2.42, 1.15, s * 0.6); f.scale.setScalar(0.26); g.add(f);
      if (h.noche()) halo(g, 2.6, 1.15, s * 0.6, "#fff1c4", 1.2, 0.5); }
    const rep2 = mesh(CY, col("#1c1c20"), -1.85, 1.0, 0); rep2.scale.set(0.7, 0.2, 0.7); rep2.rotation.z = Math.PI / 2; g.add(rep2);
    if (policia) {
      for (const s of [-1, 1]) { const d = mesh(B, col("#eeeae0"), 0.1, 0.88, s * 0.81); d.scale.set(1.2, 0.42, 0.02); g.add(d); }
      const luz = new THREE.Mesh(SP, glow("#ff4a3a", 3)); luz.position.set(-0.4, 2.0, 0); luz.scale.set(0.28, 0.2, 0.28); g.add(luz);
      if (h.noche()) calida(g, -0.4, 2.1, 0, "#ff5040", 1.2, 6, 1);
    }
    return g;
  };
  const sombraPersona = () => null;
  void sombraPersona;
  const B30: Record<string, (r: () => number) => THREE.Object3D> = {
    auto: (r) => auto(r), auto_policia: (r) => auto(r, true),
    avion: () => {
      // monoplano plateado de ala alta (un solo motor, un piloto), como los aviones transatlánticos de 1927
      const g = new THREE.Group(), pl = col("#c9ccd0"), osc = col("#3a3d44");
      const pts: THREE.Vector2[] = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.62 * Math.sin(Math.min(1, t * 2.4) * Math.PI / 2) * (1 - 0.8 * Math.max(0, t - 0.35) / 0.65), -4.2 + t * 8.4)); }
      const fus = mesh(new THREE.LatheGeometry(pts, 18), pl, 0, 1.9, 0); fus.rotation.z = Math.PI / 2; g.add(fus);
      const ala = mesh(cajaGeo("ala30", 8, 1, 2, [0.002, 0.04, 0.01]), pl, 0.6, 2.75, 0); ala.scale.set(1.9, 0.14, 14.2); g.add(ala);
      for (const s of [-1, 1]) { const pu = mesh(CY, osc, 0.6, 2.2, s * 2.2); pu.scale.set(0.07, 1.4, 0.07); pu.rotation.x = s * 0.9; g.add(pu); }
      const tim = mesh(B, pl, -3.9, 2.55, 0); tim.scale.set(0.9, 1.1, 0.08); g.add(tim);
      const est = mesh(B, pl, -3.8, 1.95, 0); est.scale.set(0.8, 0.06, 3.0); g.add(est);
      const nariz = mesh(CY, col("#9aa0a8"), 4.15, 1.9, 0); nariz.scale.set(0.55, 0.3, 0.55); nariz.rotation.z = Math.PI / 2; g.add(nariz);
      const he = mesh(B, osc, 4.35, 1.9, 0); he.scale.set(0.08, 2.4, 0.18); he.rotation.x = 0.4; he.name = "helice"; g.add(he);
      for (const s of [-1, 1]) { const pa = mesh(CY, osc, 1.6, 0.9, s * 0.8); pa.scale.set(0.06, 1.5, 0.06); pa.rotation.x = s * 0.45; g.add(pa); rueda(g, 1.6, 0.36, s * 1.15, 0.34); }
      const ve = new THREE.Mesh(B, col("#7f9bb5")); ve.position.set(0.9, 2.25, 0.62); ve.scale.set(0.8, 0.35, 0.02); g.add(ve);
      return g;
    },
    escalera: (r) => {
      // escalera artesanal de madera, apoyada (inclinada hacia el fondo): peldaños desparejos
      const g = new THREE.Group(), w = mat("escalera30", () => ({ color: "#b48a5a", map: rep(planksHD(), 0.2, 1) }));
      const L = 4.2, inner = new THREE.Group();
      for (const s of [-1, 1]) { const lado = mesh(cajaGeo("larguero", 2, 8, 2, [0.02, 0.003, 0.02]), w, s * 0.26, L / 2, 0); lado.scale.set(0.07, L, 0.09); lado.rotation.z = s * 0.02; inner.add(lado); }
      for (let k = 0; k < 10; k++) { const p = mesh(B, w, (r() - 0.5) * 0.04, 0.3 + k * 0.4 + (r() - 0.5) * 0.06, 0.02); p.scale.set(0.6 + r() * 0.08, 0.06, 0.07); p.rotation.z = (r() - 0.5) * 0.08; inner.add(p); }
      inner.rotation.x = -0.32; g.add(inner); return g;
    },
    cuna: () => {
      const g = new THREE.Group(), w = col("#e9e2d2"), w2 = col("#d6cbb4");
      for (const [x, z] of [[-0.65, 0.38], [0.65, 0.38], [-0.65, -0.38], [0.65, -0.38]]) { const p = mesh(CY, w2, x, 0.55, z); p.scale.set(0.07, 1.1, 0.07); g.add(p); }
      for (const z of [-0.38, 0.38]) { for (const y of [0.35, 1.0]) { const tr = mesh(B, w, 0, y, z); tr.scale.set(1.3, 0.06, 0.05); g.add(tr); } for (let k = -5; k <= 5; k++) { const b = mesh(CY, w, k * 0.11, 0.68, z); b.scale.set(0.03, 0.62, 0.03); g.add(b); } }
      for (const x of [-0.65, 0.65]) { const cab = mesh(B, w, x, 0.75, 0); cab.scale.set(0.05, 0.75, 0.8); g.add(cab); }
      const col2 = mesh(B, col("#f7f5ef"), 0, 0.42, 0); col2.scale.set(1.24, 0.12, 0.72); g.add(col2);
      const man = mesh(cajaGeo("manta", 4, 1, 4, [0.03, 0.03, 0.03]), col("#a8c4e0"), 0.15, 0.5, 0); man.scale.set(0.8, 0.08, 0.7); g.add(man);
      const alm = mesh(SP, col("#ffffff"), -0.45, 0.52, 0); alm.scale.set(0.3, 0.1, 0.45); g.add(alm);
      return g;
    },
    lapida: (r) => {
      const g = new THREE.Group(), t = mat("tumba30", () => ({ map: tumbaTex() })), k = Math.floor(r() * 4), s = 0.85 + r() * 0.4;
      if (k === 3) { const v = mesh(cajaGeo("cruz", 2, 4, 2, [0.02, 0.01, 0.02]), t, 0, 0.75 * s, 0); v.scale.set(0.16, 1.5 * s, 0.14); g.add(v); const hz = mesh(B, t, 0, 1.05 * s, 0); hz.scale.set(0.7, 0.15, 0.14); g.add(hz); }
      else {
        const lo = mesh(cajaGeo("lapida" + k, 3, 4, 2, [0.03, 0.02, 0.03]), t, 0, 0.5 * s, 0); lo.scale.set(0.75, 1.0 * s, 0.18); g.add(lo);
        if (k !== 1) { const top = mesh(new THREE.CylinderGeometry(0.375, 0.375, 0.18, 16, 1, false, 0, Math.PI), t, 0, 1.0 * s, 0); top.rotation.set(Math.PI / 2, Math.PI / 2, 0); top.rotation.order = "YXZ"; top.rotation.set(Math.PI / 2, 0, -Math.PI / 2); g.add(top); }
      }
      const base = mesh(cajaGeo("basetumba", 2, 1, 2, [0.04, 0.02, 0.04]), t, 0, 0.06, 0.15); base.scale.set(0.95, 0.12, 0.6); g.add(base);
      g.rotation.z = (r() - 0.5) * 0.12; return g;
    },
    surtidor: (r) => {
      const g = new THREE.Group(), c = pick(r, ["#c0302c", "#d9a03a", "#2f5f9a"]);
      const b = mesh(cajaGeo("surt", 2, 4, 2, [0.01, 0.005, 0.01]), col(c), 0, 1.1, 0); b.scale.set(0.55, 2.2, 0.45); g.add(b);
      const vi = new THREE.Mesh(B, col("#e9e4d4")); vi.position.set(0, 1.55, 0.23); vi.scale.set(0.36, 0.42, 0.02); g.add(vi);
      const gl = new THREE.Mesh(SP, h.noche() ? glow("#fff1d0", 2.4) : col("#f4efe2")); gl.position.set(0, 2.5, 0); gl.scale.set(0.5, 0.55, 0.5); g.add(gl);
      if (h.noche()) calida(g, 0, 2.5, 0.3, "#ffe0a0", 1.0, 6);
      const ma = mesh(new THREE.TorusGeometry(0.28, 0.03, 6, 16, Math.PI * 1.3), col("#1c1c20"), 0.3, 0.9, 0); ma.rotation.y = Math.PI / 2; g.add(ma);
      const ba = mesh(B, col("#7a7a7a"), 0, 0.05, 0); ba.scale.set(0.8, 0.1, 0.7); g.add(ba);
      return g;
    },
    escritorio: () => {
      const g = new THREE.Group(), w = mat("escri30", () => ({ color: "#8a5a34", map: rep(planksHD(), 0.6, 0.3) }));
      const top = mesh(B, w, 0, 0.8, 0); top.scale.set(1.9, 0.08, 0.95); g.add(top);
      for (const s of [-1, 1]) { const ca = mesh(B, w, s * 0.62, 0.4, 0); ca.scale.set(0.6, 0.78, 0.9); g.add(ca); for (let k = 0; k < 3; k++) { const ti = mesh(B, col("#c9a03a"), s * 0.62, 0.18 + k * 0.24, 0.46); ti.scale.set(0.12, 0.03, 0.03); g.add(ti); } }
      const lb = mesh(CY, col("#c9a03a"), 0.6, 0.85, -0.2); lb.scale.set(0.16, 0.04, 0.16); g.add(lb);
      const lp = mesh(CY, col("#c9a03a"), 0.6, 1.0, -0.2); lp.scale.set(0.03, 0.3, 0.03); g.add(lp);
      const ls = mesh(new THREE.CylinderGeometry(0.1, 0.22, 0.18, 12, 1, false, 0, Math.PI), col("#2f6a46"), 0.6, 1.18, -0.2); ls.rotation.z = Math.PI / 2; ls.rotation.y = Math.PI / 2; g.add(ls);
      calida(g, 0.6, 1.05, 0, "#ffd9a0", 0.9, 4);
      for (let k = 0; k < 4; k++) { const pa = mesh(B, col("#f2ecdc"), -0.4 + k * 0.08, 0.85 + k * 0.006, 0.05 + k * 0.03); pa.scale.set(0.42, 0.01, 0.55); pa.rotation.y = (k - 1.5) * 0.12; g.add(pa); }
      const te = mesh(B, col("#1c1c20"), -0.7, 0.9, -0.25); te.scale.set(0.2, 0.12, 0.2); g.add(te);
      return g;
    },
    archivador: () => {
      const g = new THREE.Group(), c = col("#6f7a6a");
      const b = mesh(cajaGeo("archi", 2, 4, 2, [0.005, 0.003, 0.005]), c, 0, 0.75, 0); b.scale.set(0.55, 1.5, 0.65); g.add(b);
      for (let k = 0; k < 4; k++) { const ca = mesh(B, col("#7f8a7a"), 0, 0.22 + k * 0.36, 0.33); ca.scale.set(0.48, 0.3, 0.02); g.add(ca); const ti = mesh(B, col("#c9c4b4"), 0, 0.3 + k * 0.36, 0.35); ti.scale.set(0.14, 0.03, 0.03); g.add(ti); }
      return g;
    },
    pizarra: () => {
      // tablero de corcho con fotos, notas y cuerdas rojas (pared de investigación)
      const g = new THREE.Group();
      const marco = mesh(B, col("#6a4528"), 0, 1.6, 0); marco.scale.set(2.7, 1.75, 0.08); g.add(marco);
      const co = mesh(B, mat("corcho30", () => ({ map: corchoTex() })), 0, 1.6, 0.05); co.scale.set(2.55, 1.6, 0.02); g.add(co);
      for (const s of [-1, 1]) { const pa = mesh(B, col("#6a4528"), s * 1.1, 0.45, -0.1); pa.scale.set(0.07, 0.9, 0.07); g.add(pa); }
      return g;
    },
    estrado: () => {
      const g = new THREE.Group(), w = mat("estrado30", () => ({ color: "#7a4a2a", map: rep(planksHD(), 1.5, 0.6) }));
      const pl = mesh(B, w, 0, 0.25, 0); pl.scale.set(4.2, 0.5, 2.2); g.add(pl);
      const fr = mesh(cajaGeo("estr", 6, 2, 2, [0.003, 0.01, 0.01]), w, 0, 1.15, 0.55); fr.scale.set(3.6, 1.3, 0.25); g.add(fr);
      for (let k = -2; k <= 2; k++) { const pn = mesh(B, col("#5a3420"), k * 0.7, 1.15, 0.69); pn.scale.set(0.55, 0.9, 0.02); g.add(pn); }
      const tp = mesh(B, col("#5a3420"), 0, 1.85, 0.5); tp.scale.set(3.8, 0.1, 0.5); g.add(tp);
      const ma = mesh(CY, col("#6a3a20"), 0.8, 1.95, 0.45); ma.scale.set(0.06, 0.25, 0.06); ma.rotation.z = Math.PI / 2; g.add(ma);
      const si = mesh(B, col("#3a1f18"), 0, 1.6, -0.5); si.scale.set(0.9, 1.6, 0.15); g.add(si);
      return g;
    },
    banca: () => {
      const g = new THREE.Group(), w = mat("banca30", () => ({ color: "#8a5a34", map: rep(planksHD(), 1, 0.3) }));
      const as = mesh(B, w, 0, 0.48, 0); as.scale.set(3, 0.08, 0.5); g.add(as);
      const re = mesh(B, w, 0, 0.95, -0.24); re.scale.set(3, 0.75, 0.07); re.rotation.x = -0.1; g.add(re);
      for (const x of [-1.45, 1.45]) { const l = mesh(B, w, x, 0.5, -0.05); l.scale.set(0.08, 1.0, 0.55); g.add(l); }
      return g;
    },
    rejas: () => {
      const g = new THREE.Group(), fe = col("#3a3d44");
      for (let k = -9; k <= 9; k++) { const b = mesh(CY, fe, k * 0.17, 1.4, 0); b.scale.set(0.05, 2.8, 0.05); g.add(b); }
      for (const y of [0.05, 1.3, 2.8]) { const t = mesh(B, fe, 0, y, 0); t.scale.set(3.3, 0.08, 0.08); g.add(t); }
      const ce = mesh(B, col("#26282e"), 0.9, 1.3, 0.06); ce.scale.set(0.2, 0.3, 0.12); g.add(ce);
      return g;
    },
    farola: () => {
      const g = new THREE.Group(), fe = col("#22242a");
      const p = mesh(cilGeo("farola", 0.07, 0.11, 10, 4, 0.004), fe, 0, 2.1, 0); p.scale.set(1, 4.2, 1); g.add(p);
      const ba = mesh(CY, fe, 0, 0.2, 0); ba.scale.set(0.38, 0.4, 0.38); g.add(ba);
      const fa = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.55, 6), h.noche() ? glow("#ffd890", 3.2) : col("#e8e2c8")); fa.position.set(0, 4.45, 0); g.add(fa);
      const te = mesh(new THREE.ConeGeometry(0.34, 0.28, 6), fe, 0, 4.85, 0); g.add(te);
      calida(g, 0, 4.3, 0, "#ffc878", 1.5, 10); if (h.noche()) halo(g, 0, 4.45, 0, "#ffc878", 2.4, 0.55);
      return g;
    },
    lampara: () => {
      const g = new THREE.Group();
      const p = mesh(CY, col("#c9a03a"), 0, 0.8, 0); p.scale.set(0.05, 1.6, 0.05); g.add(p);
      const off = !!h.apagado?.();   // cuarto a oscuras: pantalla apagada y sin luz
      const pa = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.36, 0.4, 14, 1, true), off ? col("#d8cfb8") : glow("#ffe2b0", 1.6)); pa.position.set(0, 1.7, 0); g.add(pa);
      const ba = mesh(CY, col("#c9a03a"), 0, 0.03, 0); ba.scale.set(0.4, 0.06, 0.4); g.add(ba);
      if (!off) calida(g, 0, 1.6, 0, "#ffd9a0", 1.1, 6);
      return g;
    },
    mansion: (r) => {
      // residencia colonial de dos pisos: piedra encalada, techo de pizarra, chimeneas, ventanas con postigos y pórtico
      const g = new THREE.Group(), W = 15, H = 6.4, D = 8;
      const muro = mat("mansionMuro", () => ({ color: "#ece6da", map: rep(piedraMuroTex(), 3, 1.4) }));
      const cu = mesh(cajaGeo("mansion", 20, 8, 10, [0.002, 0.004, 0.003]), muro, 0, H / 2, 0); cu.scale.set(W, H, D); g.add(cu);
      const ala = mesh(cajaGeo("mansionAla", 10, 6, 8, [0.003, 0.004, 0.003]), muro, W / 2 + 2.6, H * 0.36, -0.8); ala.scale.set(5.2, H * 0.72, D * 0.8); g.add(ala);
      const te = new THREE.Shape(); te.moveTo(-W / 2 - 0.5, 0); te.lineTo(W / 2 + 0.5, 0); te.lineTo(W / 2 - 1.6, 2.6); te.lineTo(-W / 2 + 1.6, 2.6); te.closePath();
      const tg = new THREE.ExtrudeGeometry(te, { depth: D + 1, bevelEnabled: false }); tg.translate(0, 0, -(D + 1) / 2);
      const techo = mesh(tg, mat("pizarra30", () => ({ color: "#4a4e5a" })), 0, H, 0); g.add(techo);
      const te2 = mesh(B, mat("pizarra30", () => ({ color: "#4a4e5a" })), W / 2 + 2.6, H * 0.72 + 0.6, -0.8); te2.scale.set(5.6, 1.2, D * 0.85); g.add(te2);
      for (const x of [-W / 2 + 2.2, W / 2 - 2.2]) { const ch = mesh(cajaGeo("chim30", 2, 4, 2, [0.02, 0.01, 0.02]), mat("ladrilloChim", () => ({ map: rep(ladrilloTex(), 1, 2) })), x, H + 2.6, -1); ch.scale.set(0.9, 2.6, 0.9); g.add(ch); }
      const z0 = D / 2 + 0.06, post = "#2f3a34";
      let luz = false;
      for (const fila of [1.6, 4.5]) for (let k = -3; k <= 3; k++) {
        if (fila === 1.6 && k === 0) continue;
        const x = k * 2.0; luz = ventana(g, x, fila, z0, 0.95, 1.45, 0, "#f2efe6", "#e8dcc0") || luz;
        for (const s of [-1, 1]) { const p = mesh(B, col(post), x + s * 0.72, fila, z0); p.scale.set(0.4, 1.5, 0.06); g.add(p); }
      }
      for (let k = 0; k < 2; k++) ventana(g, W / 2 + 2.6 + (k - 0.5) * 2.2, 1.9, -0.8 + D * 0.4 + 0.06, 0.9, 1.3);
      const pu = mesh(B, col("#3a2a20"), 0, 1.2, z0); pu.scale.set(1.3, 2.4, 0.08); g.add(pu);
      const fron = mesh(B, col("#f4f1ea"), 0, 3.0, z0 + 1.0); fron.scale.set(3.4, 0.35, 2.2); g.add(fron);
      for (const s of [-1, 1]) { const co = mesh(CY, col("#f4f1ea"), s * 1.4, 1.45, z0 + 1.9); co.scale.set(0.3, 2.9, 0.3); g.add(co); }
      const es = mesh(B, col("#b8b2a4"), 0, 0.15, z0 + 1.2); es.scale.set(3.4, 0.3, 2.4); g.add(es);
      if (h.noche()) { calida(g, 0, 2.5, z0 + 1.2, "#ffc878", 1.4, 8); halo(g, 0, 2.6, z0 + 1.1, "#ffc878", 1.6, 0.5); }
      if (luz) calida(g, 0, 2.5, z0 + 0.5, "#ffcf80", 0.8, 10);
      void r; return g;
    },
    edificio: (r) => {
      // edificio de ladrillo de 3–5 pisos (ciudad de los años 30): cornisa, ventanas en rejilla, escalera de incendios
      const g = new THREE.Group(), pisos = 3 + Math.floor(r() * 3), W = 7 + Math.floor(r() * 3) * 1.5, H = pisos * 3.1 + 0.6, D = 7;
      const base = pick(r, ["#9a4a34", "#8a3f30", "#a65a3c", "#7a4a3a", "#b07a5a"]);
      const m = mat("ladr" + base + W, () => ({ map: rep(ladrilloTex(base), W / 2.5, H / 2.5) }));
      const cu = mesh(cajaGeo("edif" + W, 6, 8, 4, [0.002, 0.002, 0.002]), m, 0, H / 2, 0); cu.scale.set(W, H, D); g.add(cu);
      const co = mesh(B, col("#c9bba0"), 0, H + 0.2, 0.15); co.scale.set(W + 0.5, 0.45, D + 0.4); g.add(co);
      const z0 = D / 2 + 0.04, nV = Math.max(2, Math.round(W / 2));
      for (let f = 0; f < pisos; f++) for (let k = 0; k < nV; k++) {
        const x = -W / 2 + (k + 0.5) * (W / nV);
        if (f === 0 && k === Math.floor(nV / 2)) { const pu = mesh(B, col("#3a2a20"), x, 1.25, z0); pu.scale.set(1.3, 2.5, 0.08); g.add(pu); continue; }
        const enc = h.noche() && r() < 0.45;
        const v = new THREE.Mesh(B, enc ? glow("#ffcf80", 2.4) : col("#34465a")); v.position.set(x, 1.7 + f * 3.1, z0); v.scale.set(1.0, 1.5, 0.05); g.add(v);
        const di = mesh(B, col("#d8cdb4"), x, 0.9 + f * 3.1, z0 + 0.06); di.scale.set(1.2, 0.12, 0.14); g.add(di);
      }
      if (f0(r)) { const fe = col("#26282e"); for (let f = 1; f < pisos; f++) { const pl = mesh(B, fe, W / 4, 0.8 + f * 3.1, z0 + 0.5); pl.scale.set(2.4, 0.06, 0.9); g.add(pl);
        const ba = mesh(B, fe, W / 4, 1.3 + f * 3.1, z0 + 0.94); ba.scale.set(2.4, 0.05, 0.05); g.add(ba); } }
      if (r() < 0.5) { const tol = mesh(B, col(pick(r, ["#2f6a46", "#8c2f3a", "#2f4a7a"])), 0, 2.85, z0 + 0.5); tol.scale.set(W * 0.8, 0.1, 1.1); tol.rotation.x = 0.25; g.add(tol); }
      return g;
    },
    barco: (r) => {
      const g = new THREE.Group(), c = pick(r, ["#e9e4d8", "#2f4a6a", "#8a3a2a"]);
      const sh = new THREE.Shape(); sh.moveTo(-4, 1.4); sh.lineTo(-3.6, 0); sh.lineTo(3.0, 0); sh.quadraticCurveTo(4.4, 0.4, 4.8, 1.6); sh.lineTo(-4, 1.4);
      const cas = new THREE.ExtrudeGeometry(sh, { depth: 2.4, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.3, bevelSegments: 2 }); cas.translate(0, 0, -1.2);
      g.add(mesh(cas, col(c), 0, 0, 0));
      const cub = mesh(B, madera(), 0, 1.45, 0); cub.scale.set(8, 0.08, 2.4); g.add(cub);
      const cab = mesh(cajaGeo("cabina", 3, 2, 2, [0.01, 0.01, 0.01]), col("#f4f1ea"), -1.2, 2.3, 0); cab.scale.set(2.4, 1.6, 1.8); g.add(cab);
      for (const s of [-1, 1]) ventana(g, -1.2, 2.5, s * 0.92, 0.5, 0.45, 0);
      const mas = mesh(CY, col("#5a3a24"), 1.2, 4, 0); mas.scale.set(0.12, 5, 0.12); g.add(mas);
      if (h.noche()) calida(g, -1.2, 3.4, 0, "#ffd9a0", 1, 6);
      return g;
    },
  };
  const f0 = (r: () => number) => r() < 0.6;

  // ---------------- muebles de las salas (y piezas pequeñas de calle) ----------------
  const cuadro = (R: THREE.Object3D, x: number, y: number, z: number, ry: number, w: number, hh: number, r: () => number) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
    const m = mesh(B, col(pick(r, ["#6a4528", "#c9a03a", "#2a2018"])), 0, 0, 0); m.scale.set(w + 0.12, hh + 0.12, 0.05); g.add(m);
    const lienzo = mesh(B, col(pick(r, ["#4a5a4a", "#5a4a3a", "#3a4558", "#7a6a50", "#a89a80"])), 0, 0, 0.03); lienzo.scale.set(w, hh, 0.02); g.add(lienzo);
    R.add(g);
  };
  const mecedora = () => {
    const g = new THREE.Group(), w = col("#7a4a2a");
    const as = mesh(B, w, 0, 0.5, 0); as.scale.set(0.6, 0.06, 0.55); g.add(as);
    for (let k = -2; k <= 2; k++) { const v = mesh(CY, w, k * 0.12, 0.95, -0.26); v.scale.set(0.03, 0.85, 0.03); g.add(v); }
    const tope = mesh(B, w, 0, 1.38, -0.26); tope.scale.set(0.66, 0.08, 0.06); g.add(tope);
    for (const s of [-1, 1]) {
      const ba = mesh(new THREE.TorusGeometry(0.75, 0.03, 6, 20, 0.9), w, s * 0.28, 0.78, 0); ba.rotation.set(0, Math.PI / 2, Math.PI + 1.12); g.add(ba);
      for (const z of [-0.22, 0.22]) { const p = mesh(CY, w, s * 0.28, 0.27, z); p.scale.set(0.035, 0.46, 0.035); g.add(p); }
      const br = mesh(B, w, s * 0.31, 0.75, 0); br.scale.set(0.05, 0.05, 0.5); g.add(br);
    }
    return g;
  };
  const chimenea = (r: () => number, rojo = false) => {
    const g = new THREE.Group(), marco = col(rojo ? "#8a3f30" : "#e9e2d2");
    for (const s of [-1, 1]) { const p = mesh(B, marco, s * 0.75, 0.6, 0); p.scale.set(0.35, 1.2, 0.4); g.add(p); }
    const top = mesh(B, marco, 0, 1.3, 0); top.scale.set(1.85, 0.25, 0.4); g.add(top);
    const rep3 = mesh(B, col("#5a3420"), 0, 1.47, 0.05); rep3.scale.set(2.1, 0.08, 0.55); g.add(rep3);
    const boca = mesh(B, col("#141416"), 0, 0.55, 0.05); boca.scale.set(1.15, 1.1, 0.3); g.add(boca);
    const ho = mesh(B, col("#3a3a3e"), 0, 0.04, 0.4); ho.scale.set(1.9, 0.08, 0.5); g.add(ho);
    const re = mesh(SP, col("#c9a03a"), -0.6, 1.66, 0.05); re.scale.set(0.24, 0.3, 0.12); g.add(re);
    for (const x of [0.45, 0.7]) { const v = mesh(CY, col("#f4efe2"), x, 1.66, 0.05); v.scale.set(0.05, 0.3, 0.05); g.add(v); }
    void r; return g;
  };
  const baul = () => {
    const g = new THREE.Group(), w = mat("baul30", () => ({ color: "#a8784a", map: rep(planksHD(), 0.4, 0.2) }));
    const b = mesh(B, w, 0, 0.3, 0); b.scale.set(1.0, 0.6, 0.55); g.add(b);
    const t = mesh(B, col("#8a5a34"), 0, 0.63, 0); t.scale.set(1.04, 0.07, 0.59); g.add(t);
    for (const x of [-0.35, 0.35]) { const f = mesh(B, col("#3a3530"), x, 0.3, 0.28); f.scale.set(0.06, 0.6, 0.02); g.add(f); }
    return g;
  };
  const caballito = () => {
    const g = new THREE.Group(), c = col("#e9e2d2"), cr = col("#c0302c");
    const cu = mesh(SP, c, 0, 0.62, 0); cu.scale.set(0.7, 0.28, 0.24); g.add(cu);
    const cab = mesh(SP, c, 0.36, 0.86, 0); cab.scale.set(0.3, 0.2, 0.16); cab.rotation.z = 0.6; g.add(cab);
    const crin = mesh(B, cr, 0.22, 0.86, 0); crin.scale.set(0.2, 0.08, 0.04); crin.rotation.z = 0.7; g.add(crin);
    for (const x of [-0.22, 0.22]) for (const z of [-0.08, 0.08]) { const p = mesh(CY, c, x, 0.38, z); p.scale.set(0.04, 0.4, 0.04); g.add(p); }
    for (const z of [-0.12, 0.12]) { const ba = mesh(new THREE.TorusGeometry(0.9, 0.025, 6, 20, 0.75), cr, 0, 1.04, z); ba.rotation.z = Math.PI + 1.2; g.add(ba); }
    return g;
  };
  const biombo = () => {
    const g = new THREE.Group(), t = col("#d8cdb4"), m = col("#6a4528");
    for (let k = 0; k < 3; k++) { const p = new THREE.Group(); p.position.set((k - 1) * 0.52, 0, (k % 2) * 0.18); p.rotation.y = (k % 2 ? 0.35 : -0.35);
      const pa = mesh(B, t, 0, 0.95, 0); pa.scale.set(0.5, 1.6, 0.03); p.add(pa); const ma = mesh(B, m, 0, 1.78, 0); ma.scale.set(0.54, 0.06, 0.05); p.add(ma); g.add(p); }
    return g;
  };
  const perchero = () => {
    const g = new THREE.Group(), w = col("#4a2e1c");
    const p = mesh(CY, w, 0, 0.95, 0); p.scale.set(0.05, 1.9, 0.05); g.add(p);
    const ba = mesh(CY, w, 0, 0.03, 0); ba.scale.set(0.45, 0.06, 0.45); g.add(ba);
    const ab = mesh(cajaGeo("abrigo", 2, 4, 2, [0.04, 0.02, 0.04]), col("#5a5048"), 0.12, 1.35, 0.05); ab.scale.set(0.42, 0.9, 0.2); ab.rotation.z = 0.06; g.add(ab);
    const ala = mesh(CY, col("#2a2620"), 0, 1.96, 0); ala.scale.set(0.46, 0.03, 0.46); g.add(ala);
    const co = mesh(CY, col("#2a2620"), 0, 2.04, 0); co.scale.set(0.28, 0.16, 0.28); g.add(co);
    return g;
  };
  const silla30 = () => {
    const g = new THREE.Group(), w = col("#5a3420");
    const as = mesh(B, w, 0, 0.48, 0); as.scale.set(0.5, 0.06, 0.5); g.add(as);
    const re = mesh(B, w, 0, 0.85, -0.23); re.scale.set(0.5, 0.65, 0.05); g.add(re);
    for (const x of [-0.21, 0.21]) for (const z of [-0.21, 0.21]) { const p = mesh(CY, w, x, 0.24, z); p.scale.set(0.035, 0.48, 0.035); g.add(p); }
    return g;
  };
  const reloj = (R: THREE.Object3D, x: number, y: number, z: number, ry: number) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
    const c = mesh(CY, col("#4a2e1c"), 0, 0, 0); c.scale.set(0.46, 0.06, 0.46); c.rotation.x = Math.PI / 2; g.add(c);
    const e = mesh(CY, col("#f4efe2"), 0, 0, 0.035); e.scale.set(0.38, 0.02, 0.38); e.rotation.x = Math.PI / 2; g.add(e);
    for (const [l, a] of [[0.13, 0.9], [0.17, -0.4]] as [number, number][]) { const m = mesh(B, col("#1c1c20"), Math.sin(a) * l / 2, Math.cos(a) * l / 2, 0.05); m.scale.set(0.015, l, 0.01); m.rotation.z = -a; g.add(m); }
    R.add(g);
  };
  const catre = () => {
    const g = new THREE.Group(), fe = col("#3a3d44");
    const b = mesh(B, fe, 0, 0.42, 0); b.scale.set(1.9, 0.06, 0.75); g.add(b);
    const co = mesh(cajaGeo("colchon", 3, 1, 2, [0.03, 0.02, 0.03]), col("#8a8a7a"), 0, 0.52, 0); co.scale.set(1.8, 0.14, 0.7); g.add(co);
    const ma = mesh(B, col("#5a5a50"), 0.3, 0.6, 0); ma.scale.set(1.0, 0.04, 0.72); g.add(ma);
    for (const x of [-0.9, 0.9]) for (const z of [-0.33, 0.33]) { const p = mesh(CY, fe, x, 0.2, z); p.scale.set(0.04, 0.42, 0.04); g.add(p); }
    return g;
  };
  Object.assign(B30, {
    estante: (r: () => number) => {
      // estantería de madera con libros, cajas y algún objeto
      const g = new THREE.Group(), w = mat("estante30", () => ({ color: "#6a4528", map: rep(planksHD(), 0.5, 0.5) }));
      for (const s of [-1, 1]) { const l = mesh(B, w, s * 0.68, 1.0, 0); l.scale.set(0.06, 2.0, 0.38); g.add(l); }
      const fo = mesh(B, w, 0, 1.0, -0.17); fo.scale.set(1.4, 2.0, 0.03); g.add(fo);
      for (let k = 0; k < 5; k++) {
        const y = 0.05 + k * 0.48, ta = mesh(B, w, 0, y, 0); ta.scale.set(1.36, 0.04, 0.38); g.add(ta);
        if (k === 4) break;
        let x = -0.62;
        while (x < 0.58) {
          if (r() < 0.12) { x += 0.15; continue; }
          const an = 0.05 + r() * 0.06, al = 0.26 + r() * 0.14;
          const li = mesh(B, col(pick(r, ["#7a2a2a", "#2a3a5a", "#3a5a3a", "#8a6a3a", "#5a3a5a", "#d8cdb4", "#3a3530"])), x + an / 2, y + 0.02 + al / 2, 0.02); li.scale.set(an, al, 0.26);
          li.rotation.z = r() < 0.08 ? 0.25 : 0; g.add(li); x += an + 0.008;
        }
      }
      return g;
    },
    sillon: () => {
      const g = new THREE.Group(), t = col("#6a3a3a"), t2 = col("#5a2e2e");
      const as = mesh(cajaGeo("sillonA", 3, 1, 3, [0.04, 0.03, 0.04]), t, 0, 0.42, 0.05); as.scale.set(0.95, 0.3, 0.8); g.add(as);
      const re = mesh(cajaGeo("sillonR", 3, 3, 1, [0.04, 0.04, 0.03]), t2, 0, 0.9, -0.36); re.scale.set(0.95, 0.85, 0.22); g.add(re);
      for (const s of [-1, 1]) { const br = mesh(cajaGeo("sillonB", 1, 2, 3, [0.03, 0.03, 0.03]), t2, s * 0.5, 0.6, 0); br.scale.set(0.18, 0.5, 0.85); g.add(br); }
      return g;
    },
    hidrante: () => {
      const g = new THREE.Group(), c = col("#9a2a24");
      const cu = mesh(CY, c, 0, 0.32, 0); cu.scale.set(0.26, 0.64, 0.26); g.add(cu);
      const ca = mesh(SP, c, 0, 0.66, 0); ca.scale.set(0.28, 0.2, 0.28); g.add(ca);
      for (const s of [-1, 1]) { const b = mesh(CY, c, s * 0.18, 0.42, 0); b.scale.set(0.12, 0.14, 0.12); b.rotation.z = Math.PI / 2; g.add(b); }
      return g;
    },
    cubo: () => {
      const g = new THREE.Group(), c = col("#5a5d62");
      const cu = mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.9, 16), c, 0, 0.45, 0); g.add(cu);
      const ta = mesh(CY, col("#6a6d72"), 0.05, 0.93, 0); ta.scale.set(0.64, 0.05, 0.64); ta.rotation.z = 0.12; g.add(ta);
      for (const y of [0.25, 0.65]) { const an = mesh(new THREE.TorusGeometry(0.29, 0.015, 4, 20), col("#47494e"), 0, y, 0); an.rotation.x = Math.PI / 2; g.add(an); }
      return g;
    },
    buzon: () => {
      const g = new THREE.Group(), c = col("#2f4a6a");
      const cu = mesh(cajaGeo("buzon", 2, 2, 2, [0.02, 0.01, 0.02]), c, 0, 0.75, 0); cu.scale.set(0.5, 0.75, 0.45); g.add(cu);
      const te = mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.5, 16, 1, false, 0, Math.PI), c, 0, 1.12, 0); te.rotation.set(0, Math.PI / 2, Math.PI / 2); g.add(te);
      for (const s of [-1, 1]) { const p = mesh(B, col("#26282e"), s * 0.2, 0.18, 0); p.scale.set(0.06, 0.36, 0.4); g.add(p); }
      const bo = mesh(B, col("#1c1c20"), 0, 0.95, 0.23); bo.scale.set(0.3, 0.04, 0.02); g.add(bo);
      return g;
    },
    seto: (r: () => number) => {
      const g = new THREE.Group(), c = col("#2f4a32");
      for (let k = 0; k < 4; k++) { const b = mesh(SP, c, -0.9 + k * 0.6 + (r() - 0.5) * 0.1, 0.55 + r() * 0.1, (r() - 0.5) * 0.1); b.scale.set(0.8, 1.1 + r() * 0.2, 0.7); g.add(b); }
      return g;
    },
    kiosco: (r: () => number) => {
      // puesto de periódicos de esquina: techo inclinado, pilas de diarios y carteles
      const g = new THREE.Group(), w = col("#3a4a3a");
      const cu = mesh(B, w, 0, 0.5, 0); cu.scale.set(2.0, 1.0, 1.0); g.add(cu);
      const fo = mesh(B, w, 0, 1.3, -0.45); fo.scale.set(2.0, 2.6, 0.1); g.add(fo);
      const te = mesh(B, col("#5a2a24"), 0, 2.55, 0.05); te.scale.set(2.3, 0.08, 1.3); te.rotation.x = 0.18; g.add(te);
      for (let k = 0; k < 6; k++) { const p = mesh(B, col("#e9e2cc"), -0.75 + k * 0.3, 1.05, 0.1 + (k % 2) * 0.15); p.scale.set(0.26, 0.1 + r() * 0.08, 0.36); g.add(p); }
      for (let k = 0; k < 3; k++) { const c = mesh(B, col("#f1ece0"), -0.6 + k * 0.6, 1.7, -0.38); c.scale.set(0.5, 0.65, 0.02); g.add(c);
        const ti = mesh(B, col("#1c1c20"), -0.6 + k * 0.6, 1.92, -0.36); ti.scale.set(0.42, 0.08, 0.01); g.add(ti); }
      if (h.noche()) { const fo2 = new THREE.Mesh(SP, glow("#ffe2b0", 2.2)); fo2.position.set(0, 2.35, 0.3); fo2.scale.setScalar(0.16); g.add(fo2); calida(g, 0, 2.3, 0.4, "#ffd9a0", 0.9, 5); }
      return g;
    },
  });

  // ---------------- salas interiores ----------------
  /** medidas de cada sala: ancho, fondo (pared trasera en z = -fondo) y alto; la cámara se queda adentro */
  const DIM: Record<string, { W: number; Z: number; H: number }> = {
    habitacion: { W: 8.4, Z: 4.2, H: 3.3 }, oficina: { W: 9.6, Z: 4.4, H: 3.5 }, tribunal: { W: 15, Z: 7.2, H: 5.2 }, carcel: { W: 8, Z: 6.5, H: 3.3 },
    supermercado: { W: 12, Z: 6, H: 3.8 },
  };
  const sala = (R: THREE.Group, lugar: string, seed: number, objetos: { tipo: string }[] = [], op: { bebe?: boolean } = {}) => {
    const r = rng(seed * 31 + 7);
    const { W, Z, H: Hh } = DIM[lugar] ?? DIM.oficina, FR = 14, D = Z + FR, zc = (FR - Z) / 2;
    const pared = lugar === "habitacion" ? mat("papelCuna", () => ({ map: rep(papelTex("#dfe8f0", "#c8d6e6"), 4, 1.6) }))
      : lugar === "oficina" ? mat("papelOfi", () => ({ map: rep(papelTex("#d9cfb4", "#cbbf9f"), 4, 1.6) }))
      : lugar === "carcel" ? mat("muroCarcel", () => ({ map: rep(concretoTex(), 3, 1.2) }))
      : lugar === "supermercado" ? mat("paredAlm", () => ({ color: "#e4d6b4" }))
      : mat("paredTrib", () => ({ color: "#efe6d4" }));
    const zocalo = lugar === "carcel" ? col("#5d6a64") : mat("panel30", () => ({ color: "#7a4a2a", map: rep(planksHD(), 3, 0.6) }));
    const back = mesh(B, pared, 0, Hh / 2, -Z); back.scale.set(W, Hh, 0.3); R.add(back);
    for (const s of [-1, 1]) { const w = mesh(B, pared, s * W / 2, Hh / 2, zc); w.scale.set(0.3, Hh, D); R.add(w); }
    const ceil = mesh(B, col(lugar === "carcel" ? "#8a8c90" : "#ece4d4"), 0, Hh, zc); ceil.scale.set(W, 0.3, D); ceil.castShadow = false; R.add(ceil);
    const zh = lugar === "tribunal" ? 2.0 : 0.95;
    const zb = mesh(B, zocalo, 0, zh / 2, -Z + 0.2); zb.scale.set(W, zh, 0.1); R.add(zb);
    for (const s of [-1, 1]) { const zl = mesh(B, zocalo, s * (W / 2 - 0.2), zh / 2, zc); zl.scale.set(0.1, zh, D); R.add(zl); }
    const cor = mesh(B, col("#f4efe2"), 0, Hh - 0.12, -Z + 0.2); cor.scale.set(W, 0.14, 0.12); R.add(cor);
    const techoLuz = (x: number, z: number, c = "#ffe2b0") => {
      const cable = mesh(CY, col("#222"), x, Hh - 0.25, z); cable.scale.set(0.02, 0.5, 0.02); R.add(cable);
      const pan = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.3, 16, 1, true), col(lugar === "carcel" ? "#4a5450" : "#2f6a46")); pan.position.set(x, Hh - 0.6, z); R.add(pan);
      if (h.apagado?.()) { const fo = mesh(SP, col("#d8d0b8"), x, Hh - 0.72, z); fo.scale.setScalar(0.2); R.add(fo); return; }   // lámpara apagada
      const fo = new THREE.Mesh(SP, glow(c, 3)); fo.position.set(x, Hh - 0.72, z); fo.scale.setScalar(0.2); R.add(fo);
      calida(R, x, Hh - 0.85, z, c, 1.2, lugar === "tribunal" ? 14 : 8);
    };
    const pon = (o: THREE.Object3D, x: number, z: number, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; R.add(o); return o; };
    const L = -W / 2 + 0.15, Rr = W / 2 - 0.15, Bk = -Z + 0.15;
    if (lugar === "habitacion") {
      // cuarto infantil del segundo piso: chimenea, ventana con postigos y cortinas, cuna, mecedora, cómoda,
      // estantería con juguetes, baúl, biombo, caballito de madera, cuadros y alfombra
      ventana(R, 1.6, 1.75, Bk + 0.02, 1.5, 1.6, 0, "#f2efe6", "#f4e8c8");
      for (const s of [-1, 1]) { const p = mesh(B, col("#2f3a34"), 1.6 + s * 1.12, 1.75, Bk + 0.015); p.scale.set(0.5, 1.65, 0.03); R.add(p); }
      pon(chimenea(r), -1.7, Bk + 0.2);
      cuadro(R, -1.7, 2.45, Bk + 0.02, 0, 0.8, 0.6, r);
      if (!objetos.some((o) => o.tipo === "cuna")) pon(B30.cuna(r), -3.2, -2.6, Math.PI / 2);
      if (op.bebe) { // el bebé dormido bajo la manta: cabecita sobre la almohada y el bulto del cuerpo
        const b = new THREE.Group();
        const al = mesh(B, col("#f7f5ef"), -0.42, 0.52, 0); al.scale.set(0.3, 0.08, 0.4); b.add(al);
        const ca = new THREE.Mesh(SP, col("#f2c9a8")); ca.position.set(-0.36, 0.66, 0); ca.scale.setScalar(0.3); b.add(ca);
        const go = new THREE.Mesh(SP, col("#a8c4e0")); go.position.set(-0.42, 0.72, 0); go.scale.set(0.22, 0.2, 0.3); b.add(go);
        const bu = new THREE.Mesh(SP, col("#a8c4e0")); bu.position.set(0.05, 0.6, 0); bu.scale.set(0.62, 0.2, 0.42); b.add(bu);
        // en la cuna del director si puso una; si no, en la del decorado
        const cu = objetos.find((o) => o.tipo === "cuna") as { x?: number; z?: number; giro?: number; escala?: number } | undefined;
        if (cu) { b.position.set(cu.x ?? 0, 0, cu.z ?? 0); b.rotation.y = cu.giro ?? 0; b.scale.setScalar(cu.escala ?? 1); } else { b.position.set(-3.2, 0, -2.6); b.rotation.y = Math.PI / 2; }
        R.add(b);
      }
      const co = mesh(B, mat("comoda30", () => ({ color: "#e9e2d2" })), Rr - 0.4, 0.55, -2.6); co.scale.set(0.7, 1.1, 1.5); R.add(co);
      for (let k = 0; k < 3; k++) { const ca = mesh(B, col("#d6cbb4"), Rr - 0.74, 0.25 + k * 0.32, -2.6); ca.scale.set(0.02, 0.26, 1.3); R.add(ca); }
      const osito = new THREE.Group(); const ob = mesh(SP, col("#b07a4a"), 0, 0.2, 0); ob.scale.set(0.3, 0.36, 0.26); osito.add(ob); const oc = mesh(SP, col("#b07a4a"), 0, 0.45, 0); oc.scale.setScalar(0.22); osito.add(oc);
      osito.position.set(Rr - 0.4, 1.1, -2.9); R.add(osito);
      const lp = B30.lampara(r); lp.scale.setScalar(0.45); lp.position.set(Rr - 0.4, 1.1, -2.1); R.add(lp);
      cuadro(R, Rr - 0.02, 2.1, -2.6, -Math.PI / 2, 0.9, 0.65, r);
      pon(mecedora(), 2.3, -2.4, -0.5);
      pon(B30.estante(r), Rr - 0.25, 0.4, -Math.PI / 2);
      pon(baul(), L + 0.4, 0.6, Math.PI / 2);
      pon(biombo(), L + 0.6, -0.9, Math.PI / 2 - 0.2);
      pon(caballito(), 2.9, -0.3, -0.9);                         // a un lado: el centro queda libre para actuar
      cuadro(R, L + 0.02, 1.9, -1.0, Math.PI / 2, 0.6, 0.8, r);
      for (const [x, z, c] of [[-0.6, 0.9, "#e2453c"], [-0.25, 1.1, "#3f6fb5"], [-0.45, 1.3, "#f2c84b"]] as [number, number, string][]) { const cu = mesh(B, col(c), x, 0.11, z); cu.scale.setScalar(0.22); cu.rotation.y = r(); R.add(cu); }
      const alf = new THREE.Mesh(new THREE.CircleGeometry(1.9, 32), col("#5f6f84")); alf.rotation.x = -Math.PI / 2; alf.position.set(0, 0.015, -0.6); alf.scale.set(1.3, 1, 1); alf.receiveShadow = true; R.add(alf);
      techoLuz(0, -1.2, "#ffe2b0");
    } else if (lugar === "oficina") {
      // oficina de detectives: ventana con persianas, pared de pruebas, archivadores, dos escritorios, perchero,
      // estantería, reloj, mapa con chinches, cajas de expedientes
      ventana(R, -2.4, 1.85, Bk + 0.02, 1.6, 1.5, 0, "#6a4528");
      for (let k = 0; k < 7; k++) { const pe = mesh(B, col("#d8cdb4"), -2.4, 1.2 + k * 0.2, Bk + 0.08); pe.scale.set(1.6, 0.045, 0.02); R.add(pe); }
      const rad = mesh(B, col("#9a9c9e"), -2.4, 0.4, Bk + 0.15); rad.scale.set(1.3, 0.6, 0.15); R.add(rad);
      const piz = B30.pizarra(r); piz.scale.setScalar(0.85); pon(piz, 1.6, Bk + 0.15);
      for (const x of [Rr - 0.35, Rr - 0.95]) pon(B30.archivador(r), x, Bk + 0.4);
      pon(B30.escritorio(r), -1.5, -1.6, 0.15);
      pon(silla30(), -1.5, -2.5, 0.15);
      const e2 = B30.escritorio(r); pon(e2, 2.6, 0.2, -Math.PI / 2 + 0.2);
      pon(silla30(), 3.4, 0.25, -Math.PI / 2 + 0.2);
      pon(perchero(), L + 0.45, -3.3);
      pon(B30.estante(r), L + 0.25, -0.6, Math.PI / 2);
      reloj(R, 0.0, 2.75, Bk + 0.02, 0);
      const mapa = mesh(B, col("#e9e0c4"), Rr - 0.02, 1.9, -1.8); mapa.rotation.y = -Math.PI / 2; mapa.scale.set(1.8, 1.2, 0.03); R.add(mapa);
      for (let k = 0; k < 9; k++) { const pin = new THREE.Mesh(SP, col("#d8443a")); pin.position.set(Rr - 0.05, 1.45 + r() * 0.9, -2.6 + r() * 1.6); pin.scale.setScalar(0.06); R.add(pin); }
      for (let k = 0; k < 4; k++) { const ca = mesh(cajaGeo("expediente", 2, 2, 2, [0.02, 0.02, 0.02]), col("#b8a47a"), L + 0.5 + (k % 2) * 0.5, 0.18 + Math.floor(k / 2) * 0.36, 1.4); ca.scale.set(0.45, 0.34, 0.36); ca.rotation.y = r() * 0.3; R.add(ca); }
      techoLuz(-0.6, -1.2); techoLuz(2.4, 0.4);
    } else if (lugar === "tribunal") {
      // sala del tribunal: estrado del juez al fondo, bandera, estrado de testigos, jurado, baranda, mesas y bancas
      pon(B30.estrado(r), 0, Bk + 1.2);
      const ba = mesh(CY, col("#c9a03a"), -3.0, 1.5, Bk + 0.4); ba.scale.set(0.05, 3, 0.05); R.add(ba);
      const bd = mesh(B, mat("bandera30", () => ({ map: ctex("bandera30", 128, 96, (g) => { for (let k = 0; k < 13; k++) { g.fillStyle = k % 2 ? "#f4f1ea" : "#b0303a"; g.fillRect(0, k * 96 / 13, 128, 96 / 13 + 1); } g.fillStyle = "#2f3f7a"; g.fillRect(0, 0, 54, 52); }) })), -2.35, 2.5, Bk + 0.4); bd.scale.set(1.2, 0.9, 0.02); R.add(bd);
      reloj(R, 3.0, 3.6, Bk + 0.02, 0);
      const tes = mesh(B, mat("estrado30", () => ({ color: "#7a4a2a", map: rep(planksHD(), 1.5, 0.6) })), 3.0, 0.6, Bk + 1.6); tes.scale.set(1.3, 1.2, 1.1); R.add(tes);
      // jurado: dos filas de sillas tras una baranda, a la derecha
      for (let f = 0; f < 2; f++) for (let k = 0; k < 6; k++) pon(silla30(), Rr - 0.6 - f * 0.8, -3.2 + k * 0.62, -Math.PI / 2).position.y = f * 0.3;
      const pj = mesh(B, col("#6a3a20"), Rr - 2.2, 0.55, -1.6); pj.scale.set(0.08, 1.1, 4.0); R.add(pj);
      for (const x of [-2.6, 1.2]) { pon(B30.escritorio(r), x, -1.6, 0); pon(silla30(), x - 0.4, -0.8, Math.PI); pon(silla30(), x + 0.4, -0.8, Math.PI); }
      const bar = mesh(B, col("#6a3a20"), -1, 0.9, 0.4); bar.scale.set(W - 5, 0.08, 0.08); R.add(bar);
      for (let k = -7; k <= 5; k++) { const b2 = mesh(CY, col("#6a3a20"), k * 0.8, 0.45, 0.4); b2.scale.set(0.05, 0.9, 0.05); R.add(b2); }
      for (let f = 0; f < 2; f++) for (const x of [-4.4, 2.2]) pon(B30.banca(r), x, 2.8 + f * 1.5, Math.PI);
      for (const s of [-1, 1]) { const c = mesh(CY, col("#e9e2d2"), s * (W / 2 - 0.5), Hh / 2, Bk + 0.5); c.scale.set(0.4, Hh, 0.4); R.add(c); }
      ventana(R, L + 0.02, 2.6, -2.5, 1.4, 2.4, Math.PI / 2, "#6a3a20");
      for (const x of [-3, 2.5]) techoLuz(x, -2);
    } else if (lugar === "supermercado") {
      // almacén de comestibles de los años 30: estanterías llenas, góndolas en el centro, puesto de fruta,
      // mostrador con caja registradora, letrero y lámparas colgantes; pasillo libre en el medio para los actores
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat("pisoAjedrez", () => ({ map: rep(ajedrezTex(), W / 1.1, D / 1.1) })));
      piso.rotation.x = -Math.PI / 2; piso.position.set(0, 0.012, zc); piso.receiveShadow = true; R.add(piso);
      const prod = [0, 1, 2].map((k) => mat("prod30_" + k, () => ({ map: productosTex(k) })));
      const madera = col("#5a3a22");
      const estanteria = (x: number, z: number, ry: number, w = 2.4, h = 2.3, dos = false, niveles = 4) => {
        const g = new THREE.Group();
        const fo = mesh(B, madera, 0, h / 2, dos ? 0 : -0.25); fo.scale.set(w, h, 0.06); g.add(fo);
        for (const s of [-1, 1]) { const l = mesh(B, madera, s * w / 2, h / 2, 0); l.scale.set(0.07, h, dos ? 1.0 : 0.55); g.add(l); }
        for (let k = 0; k < niveles; k++) {
          const y = 0.12 + k * (h - 0.25) / niveles;
          const tb = mesh(B, madera, 0, y, 0); tb.scale.set(w, 0.05, dos ? 1.0 : 0.55); g.add(tb);
          for (const cara of dos ? [1, -1] : [1]) { const pr = mesh(B, prod[(k + Math.round(x * 3 + z)) % 3 < 0 ? 0 : (k + Math.round(Math.abs(x) * 3 + Math.abs(z))) % 3], 0, y + 0.21, dos ? cara * 0.24 : 0.02); pr.scale.set(w - 0.12, 0.38, dos ? 0.42 : 0.42); pr.castShadow = false; g.add(pr); }
        }
        g.position.set(x, 0, z); g.rotation.y = ry; R.add(g); return g;
      };
      // fondo: cuatro estanterías altas y el letrero encima; al centro, el puesto de fruta
      for (const x of [-4.6, -2.2, 2.2, 4.6]) estanteria(x, Bk + 0.3, 0);
      const le = mesh(B, mat("letreroAlm", () => ({ map: letreroTex("GROCERY  ·  MEATS  ·  PRODUCE") })), 0, Hh - 0.5, Bk + 0.05); le.scale.set(5.6, 0.8, 0.05); R.add(le);
      const fruta = new THREE.Group();
      const ca = mesh(B, madera, 0, 0.45, 0); ca.scale.set(1.9, 0.9, 1.0); fruta.add(ca);
      const tabla = mesh(B, col("#7a5030"), 0, 1.0, 0.05); tabla.scale.set(1.9, 0.08, 1.1); tabla.rotation.x = 0.35; fruta.add(tabla);
      const tonos = ["#e8892a", "#c8322a", "#e8d23a", "#7cb03a", "#a82a3a"];
      for (let c = 0; c < 5; c++) for (let k = 0; k < 14; k++) {
        const f = new THREE.Mesh(SP, col(tonos[c])); const u = (k % 7) / 6, v = Math.floor(k / 7);
        f.position.set(-0.85 + c * 0.42 + (u - 0.5) * 0.3, 1.1 + v * 0.13 - u * 0.0, 0.35 - v * 0.32 - (u - 0.5) * 0.1); f.scale.setScalar(0.17); fruta.add(f);
      }
      fruta.position.set(0, 0, Bk + 1.0); R.add(fruta);
      // paredes laterales con estanterías (frascos a la izquierda, latas a la derecha)
      for (const z of [-4.3, -1.9]) estanteria(L + 0.3, z, Math.PI / 2);
      estanteria(Rr - 0.3, -4.3, -Math.PI / 2);
      // góndolas dobles a lo largo del local (dejan el pasillo central libre)
      for (const x of [-2.9, 2.9]) estanteria(x, -2.6, Math.PI / 2, 2.6, 1.5, true, 3);
      // mostrador con caja registradora y balanza (adelante a la derecha)
      const mo = mesh(B, mat("mostrador30", () => ({ color: "#6a4428", map: rep(planksHD(), 1, 0.6) })), Rr - 0.7, 0.55, -0.6); mo.scale.set(0.9, 1.1, 2.6); R.add(mo);
      const cu = mesh(B, col("#e9e2d2"), Rr - 0.7, 1.12, -0.6); cu.scale.set(0.95, 0.05, 2.65); R.add(cu);
      const caja = new THREE.Group(), bronce = col("#b8913a");
      const cb = mesh(B, bronce, 0, 0.22, 0); cb.scale.set(0.5, 0.44, 0.45); caja.add(cb);
      const cs = mesh(B, bronce, 0, 0.55, -0.1); cs.scale.set(0.42, 0.24, 0.12); caja.add(cs);
      const ci = mesh(B, col("#f4efe2"), 0, 0.56, -0.03); ci.scale.set(0.3, 0.1, 0.02); caja.add(ci);
      for (let k = 0; k < 6; k++) { const t = new THREE.Mesh(SP, col("#1c1c20")); t.position.set(-0.16 + (k % 3) * 0.16, 0.42, 0.18 - Math.floor(k / 3) * 0.1); t.scale.setScalar(0.05); caja.add(t); }
      caja.position.set(Rr - 0.7, 1.15, -1.3); caja.rotation.y = -Math.PI / 2; R.add(caja);
      const ba = mesh(CY, col("#d8d4c8"), Rr - 0.7, 1.35, 0.2); ba.scale.set(0.35, 0.05, 0.35); R.add(ba);
      const bp = mesh(CY, col("#c9c4b8"), Rr - 0.7, 1.24, 0.2); bp.scale.set(0.06, 0.2, 0.06); R.add(bp);
      // cajones de manzanas y sacos a la izquierda, adelante
      for (let k = 0; k < 3; k++) {
        const cj = mesh(cajaGeo("cajon", 2, 2, 2, [0.02, 0.02, 0.02]), col("#9a7448"), L + 0.6, 0.22 + (k === 2 ? 0.44 : 0), 0.4 + (k % 2) * 0.62); cj.scale.set(0.6, 0.44, 0.58); R.add(cj);
        for (let j = 0; j < 6; j++) { const m = new THREE.Mesh(SP, col(k === 1 ? "#e8892a" : "#c8322a")); m.position.set(L + 0.45 + (j % 3) * 0.15, 0.47 + (k === 2 ? 0.44 : 0), 0.3 + (k % 2) * 0.62 + Math.floor(j / 3) * 0.2); m.scale.setScalar(0.14); R.add(m); }
      }
      for (const [x, z] of [[L + 0.5, 1.7], [L + 1.0, 2.1]] as [number, number][]) { const s = mesh(SP, col("#c9b48a"), x, 0.32, z); s.scale.set(0.5, 0.64, 0.42); R.add(s); }
      // ventanal de la vitrina en la pared derecha y lámparas
      ventana(R, Rr - 0.02, 1.9, -2.2, 1.6, 1.4, -Math.PI / 2, "#2f4a3a");
      for (const [x, z] of [[-1.4, -3.0], [1.4, -3.0], [0, -0.6]] as [number, number][]) techoLuz(x, z, "#fff0c8");
    } else if (lugar === "carcel") {
      // pasillo de celdas: rejas a los dos lados con un catre y un balde en cada celda, luz fría colgante
      const X = 2.6;
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        const zc2 = -4.6 + k * 3.4;
        pon(B30.rejas(r), s * X, zc2, Math.PI / 2);
        pon(catre(), s * (X + 1.1), zc2, Math.PI / 2);
        const bal = mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.3, 12), col("#6a6d72"), s * (W / 2 - 0.4), 0.15, zc2 + 1.0); R.add(bal);
      }
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const mu = mesh(B, pared, s * (X + (W / 2 - X) / 2), Hh / 2, -6.3 + k * 3.4); mu.scale.set(W / 2 - X, Hh, 0.2); R.add(mu); }
      const pu = mesh(B, col("#4a5450"), 0, 1.2, Bk + 0.05); pu.scale.set(1.3, 2.4, 0.1); R.add(pu);
      const vi = mesh(B, col("#141416"), 0, 1.75, Bk + 0.11); vi.scale.set(0.4, 0.3, 0.02); R.add(vi);
      for (const z of [-4, -0.5]) techoLuz(0, z, "#d8f0ff");
    }
    return { mx: W / 2 - 0.35, h: Hh - 0.25, z0: -Z };
  };
  const SUELO_INT: Record<string, () => THREE.Texture> = {
    carcel: () => rep(concretoTex(), 400 / 4, 400 / 4),
  };
  return { B30, sala, SUELO_INT };
};
