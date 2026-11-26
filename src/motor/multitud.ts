// Multitudes y luces masivas por instancias (basado en crowd.ts de la plantilla de Alejandro):
// - Multitud: un quad por persona, billboard en el vertex shader, cada instancia elige su casilla de un atlas pintado
//   con el mismo dibujante de personajes (variantes de vestuario × cuadros de animación).
// - Luminarias: cientos de brillos aditivos (antorchas, ventanas, faroles, velas) que pueden crecer en número,
//   girar en círculo o parpadear; el bloom los hace brillar.
import * as THREE from "three";
import { Pen, bodyFront, Outfit, FrontOpts, SKINS, Held } from "./toon";
import { NOINK } from "./ink";
import { HAT, Multitud, Luces, hash, clamp01 } from "./plan";

const TW = 160, TH = 267, K = TW / 600;

// ---------------- vestuario por tipo de multitud ----------------
const PALETA = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9", "#d9a441", "#c25a7a"];
const variantes = (m: Multitud): Outfit[] => {
  const out: Outfit[] = [];
  for (let i = 0; i < 6; i++) {
    const skin = SKINS[i % 4];
    if (m.tipo === "ejercito" || m.tipo === "guardias") {
      const u = m.uniforme;
      out.push({ jacket: u?.camisa ?? (m.tipo === "guardias" ? "#c0353a" : "#357650"), pants: u?.pantalon ?? "#3d4440", boots: "#241726", skin,
        hat: u ? HAT[u.sombrero] ?? "shako" : m.tipo === "ejercito" ? ["casco", "casco", "casco_pluma", "casco", "casco", "casco"][i] : "shako", cap: u?.colorSombrero ?? "#3a3d47", hair: u?.colorSombrero ?? "#3a3d47",
        belt: u?.sombrero === "gorra_policia" ? "#1c1c20" : "#f1efe6", cintura: u?.sombrero === "gorra_policia" || m.tipo === "guardias", buttons: "#d9dde0", moustache: i % 3 === 1 ? "#4a3426" : undefined, build: i === 5 ? "stout" : "adult",
        patron: m.tipo === "ejercito" && !u ? ["acolchado", "liso", "acolchado"][i % 3] : undefined, rasgos: [["barba_corta"], ["cejas"], ["barba"], ["perilla"], ["arrugas", "patillas"], ["mejillas"]][i] });
    } else if (m.tipo === "transeuntes" || m.tipo === "prensa") {
      // gente de los años 30: ellos con sombrero y abrigo o traje; ellas con cloche o pamela y vestido
      const prensa = m.tipo === "prensa", mujer = prensa ? i === 4 : i % 2 === 1;
      const sobrio = ["#3a3f4a", "#5a4a3a", "#2f3a46", "#6a5a48", "#4a3a44", "#7a6a5a"][(i * 2 + (prensa ? 1 : 0)) % 6];
      out.push({ jacket: sobrio, pants: "#2c2e36", boots: "#2a201c", skin,
        hat: mujer ? ["cloche", "pamela", "cloche"][i % 3] : prensa ? "fedora" : ["fedora", "bombin", "gorra_plana", "fedora", "fedora", "bombin"][i],
        cap: mujer ? ["#8c3b4a", "#3f6fb5", "#5d7a3a"][i % 3] : ["#2a2a30", "#4a3a2a", "#3a3f4a", "#5a4a3a"][i % 4], hair: ["#4a3020", "#2a201a", "#7a4a2a", "#1c1814"][i % 4],
        pelo: mujer ? "melena" : "raya_lado", patron: mujer ? "liso" : prensa ? ["terno", "gabardina", "chaleco"][i % 3] : ["abrigo", "terno", "gabardina", "sueter", "abrigo", "terno"][i],
        dress: mujer ? ["#8c3b4a", "#2f5f6a", "#7b5a3a"][i % 3] : undefined, estampado: mujer && i === 3 ? "lunares" : undefined,
        acc: prensa ? ["credencial_prensa", "corbata"] : mujer ? ["collar_perlas"] : i % 3 ? ["corbata"] : ["bufanda"], accCol: ["#7a2a2a", "#2a3a6a", "#5a4a2a"][i % 3],
        rasgos: mujer ? [] : [["barba_corta"], ["gafas"], ["cejas"], ["patillas"], ["arrugas"], ["gafas", "cejas"]][i], moustache: !mujer && i % 3 === 2 ? "#3a2a20" : undefined,
        build: i === 5 ? "stout" : "adult" });
    } else {
      const sombreros = ["hair", "paja", "cap", "panuelo", "hair", "boina"];
      out.push({ pelo: ["rizado", "liso", "punta", "largo", "mono", "calvo"][(i * 5 + 1) % 6], patron: ["acolchado", "liso", "rayas", "chaleco", "delantal", "parches"][i],
        patronCol: PALETA[(i * 5 + 3) % PALETA.length], rasgos: [["barba"], ["barba_corta"], ["mejillas"], ["gafas", "perilla"], ["pecas"], ["cejas", "patillas"]][i],
        jacket: PALETA[(i * 3) % PALETA.length], pants: "#3b3f52", boots: "#4a3426", skin, hat: sombreros[i],
        hair: ["#4a3020", "#2a201a", "#7a4a2a", "#c9a03a"][i % 4], cap: PALETA[(i + 2) % PALETA.length],
        dress: i % 2 ? PALETA[(i + 5) % PALETA.length] : undefined, build: i === 4 && m.tipo === "pueblo" ? "kid" : "adult" });
    }
  }
  return out;
};
/** cuadros de animación por acción */
const poses = (m: Multitud): Partial<FrontOpts>[] => {
  const held: Held | null = m.mano ?? null;
  const conAntorcha = held === "antorcha" || held === "bandera" || held === "espada";
  switch (m.accion) {
    case "marchar": case "correr": case "girar": return [0, 0.25, 0.5, 0.75].map((ph) => ({ mode: "stroll" as const, phase: ph, held, gesture: conAntorcha ? "wave" as const : null, gk: 0.5 }));
    case "celebrar": return [0, 1, 0.5, 1].map((gk, i) => ({ mode: "stand" as const, gesture: "up" as const, gk, expr: i % 2 ? "laugh" as const : "grin" as const, held }));
    case "pelear": return [0, 0.5, 1, 0.5].map((gk) => ({ mode: "stand" as const, gesture: "throw" as const, gk, expr: "stern" as const, held }));
    default: return [0, 0, 0, 1].map((b) => ({ mode: "stand" as const, blink: b, gesture: conAntorcha ? "wave" as const : null, gk: 0.5, held }));
  }
};

const atlasDe = (m: Multitud, light: number) => {
  const vs = variantes(m), ps = poses(m), cols = ps.length, rows = vs.length;
  const cv = document.createElement("canvas"); cv.width = cols * TW; cv.height = rows * TH;
  const g = cv.getContext("2d")!;
  vs.forEach((o, r) => ps.forEach((po, c) => {
    g.setTransform(K, 0, 0, K, c * TW, r * TH);
    // la prensa lleva cámara, libreta o micrófono y habla (pregunta) aunque esté quieta
    const pr: Partial<FrontOpts> = m.tipo === "prensa" ? { held: (["camara_foto", "libreta", "microfono"] as Held[])[r % 3], gesture: po.mode === "stand" ? "talk" : po.gesture ?? null, gk: 0.3 + 0.4 * (c % 2) } : {};
    bodyFront(new Pen(g), o, { mode: "stand", expr: r % 3 ? "neutral" : "stern", light, seed: (r % 7) + 1, ...po, ...pr });
  }));
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { tex: t, cols, rows };
};

/** puntos de la formación alrededor de (x, z) */
export const formacion = (m: Multitud) => {
  const n = Math.max(1, Math.min(4000, Math.round(m.cantidad))), pts: { x: number; z: number }[] = [];
  const A = Math.max(1, m.ancho), F = Math.max(1, m.fondo);
  if (m.formacion === "filas") {
    const paso = Math.max(0.75, Math.sqrt((A * F) / n)), cols = Math.max(1, Math.floor(A / paso)), filas = Math.ceil(n / cols);
    for (let i = 0; i < n; i++) { const c = i % cols, f = Math.floor(i / cols);
      pts.push({ x: m.x - A / 2 + (c + 0.5) * (A / cols) + (hash(i, 1) - 0.5) * 0.12, z: m.z - F / 2 + (f + 0.5) * (F / Math.max(1, filas)) + (hash(i, 2) - 0.5) * 0.12 }); }
  } else if (m.formacion === "circulo") {
    const R = Math.max(A / 2, Math.sqrt(n) * 0.45), vueltas = Math.max(1, Math.ceil(n / Math.max(6, (2 * Math.PI * R) / 0.78)));
    for (let i = 0; i < n; i++) { const v = i % vueltas, a = (i / n) * Math.PI * 2 * vueltas + v * 0.3, r = R - v * 0.9;
      pts.push({ x: m.x + Math.cos(a) * r, z: m.z + Math.sin(a) * r * (F / A) }); }
  } else {
    // grupo: posiciones al azar pero con separación mínima (nadie dentro de otro); si no caben, se agranda el área
    const min = 0.62, cel = min / Math.SQRT2, grid = new Map<string, { x: number; z: number }>();
    let k = 0, esc = Math.max(1, Math.sqrt((n * min * min * 1.6) / ((Math.PI / 4) * A * F)));
    for (let tries = 0; pts.length < n && tries < n * 60; tries++) {
      if (tries > 0 && tries % (n * 12) === 0) esc *= 1.15;
      const a = hash(k, 3) * Math.PI * 2, r = Math.sqrt(hash(k, 4)); k++;
      const x = m.x + Math.cos(a) * r * A * esc / 2, z = m.z + Math.sin(a) * r * F * esc / 2;
      const gx = Math.floor(x / cel), gz = Math.floor(z / cel);
      let ok = true;
      for (let dx = -2; dx <= 2 && ok; dx++) for (let dz = -2; dz <= 2 && ok; dz++) { const q = grid.get(`${gx + dx},${gz + dz}`); if (q && Math.hypot(q.x - x, q.z - z) < min) ok = false; }
      if (!ok) continue;
      const p = { x, z }; grid.set(`${gx},${gz}`, p); pts.push(p);
    }
  }
  // de atrás hacia adelante (orden de dibujo estable)
  return pts.sort((a, b) => a.z - b.z);
};

const TINTE: Record<string, [number, number, number]> = { day: [0.9, 0.88, 0.88], golden: [1.0, 0.8, 0.62], night: [0.42, 0.47, 0.72] };

export class MultitudGL {
  mesh: THREE.InstancedMesh;
  private u = { uTime: { value: 0 }, uShift: { value: new THREE.Vector3() }, uScale: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) }, uSpin: { value: 0 }, uCenter: { value: new THREE.Vector3() } };
  pts: { x: number; z: number }[];
  constructor(parent: THREE.Object3D, public m: Multitud, light: number, luz: string, seed = 1) {
    const at = atlasDe(m, light);
    this.pts = formacion(m);
    const h = 2.16, w = h * 0.6;
    const geo = new THREE.PlaneGeometry(w, h).translate(0, h * 0.475, 0);
    const n = this.pts.length, aVar = new Float32Array(n), aPh = new Float32Array(n);
    for (let i = 0; i < n; i++) { aVar[i] = Math.floor(hash(i + 1, seed) * at.rows) % at.rows; aPh[i] = hash(i + 7, seed + 1); }
    geo.setAttribute("aVar", new THREE.InstancedBufferAttribute(aVar, 1));
    geo.setAttribute("aPh", new THREE.InstancedBufferAttribute(aPh, 1));
    const t = TINTE[luz] ?? TINTE.day; this.u.uTint.value.setRGB(t[0], t[1], t[2]);
    const mat = new THREE.MeshBasicMaterial({ map: at.tex, alphaTest: 0.45, side: THREE.DoubleSide, fog: true });
    this.u.uCenter.value.set(m.x, 0, m.z);
    const rate = m.accion === "correr" ? 2.0 : m.accion === "marchar" || m.accion === "girar" ? 1.0 : m.accion === "celebrar" ? 2.4 : m.accion === "pelear" ? 1.6 : 0.4;
    const U = this.u, cols = at.cols, rows = at.rows;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", `#include <common>
attribute float aVar; attribute float aPh; uniform float uTime; uniform vec3 uShift; uniform float uScale; uniform float uSpin; uniform vec3 uCenter;`)
        .replace("#include <uv_vertex>", `#include <uv_vertex>
#ifdef USE_MAP
float pose = floor(mod(uTime * ${rate.toFixed(3)} + aPh * ${cols}.0, ${cols}.0));
vMapUv = uv * vec2(1.0 / ${cols}.0, 1.0 / ${rows}.0) + vec2(pose / ${cols}.0, 1.0 - (aVar + 1.0) / ${rows}.0);
#endif`)
        .replace("#include <project_vertex>", `vec4 wq = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
vec2 rq = wq.xz - uCenter.xz; wq.xz = uCenter.xz + vec2(rq.x * cos(uSpin) - rq.y * sin(uSpin), rq.x * sin(uSpin) + rq.y * cos(uSpin));
vec4 mvPosition = modelViewMatrix * (wq + vec4(uShift, 0.0));
mvPosition.xy += position.xy * uScale;
gl_Position = projectionMatrix * mvPosition;`);
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uTint;")
        .replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb *= uTint;");
    };
    mat.customProgramCacheKey = () => `multitud2_${cols}_${rows}_${rate}`;
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    const M = new THREE.Matrix4();
    this.pts.forEach((p, i) => this.mesh.setMatrixAt(i, M.makeTranslation(p.x, 0, p.z)));
    this.mesh.frustumCulled = false; this.mesh.layers.set(NOINK); this.mesh.renderOrder = 1;
    parent.add(this.mesh);
  }
  /** desplazamiento de la formación en el segundo t (marcha / carrera hacia "hacia") */
  desplazamiento(t: number, out = new THREE.Vector3()) {
    const m = this.m;
    if ((m.accion === "marchar" || m.accion === "correr") && m.hacia) {
      const dx = m.hacia[0] - m.x, dz = m.hacia[1] - m.z, L = Math.hypot(dx, dz) || 1, v = m.accion === "correr" ? 3.2 : 1.3;
      const d = Math.min(L, v * Math.max(0, t));
      return out.set((dx / L) * d, 0, (dz / L) * d);
    }
    return out.set(0, 0, 0);
  }
  escala(t: number) {
    if (this.m.t == null || this.m.t <= 0) return 1;
    const k = clamp01((t - this.m.t) / 0.4);
    return k <= 0 ? 0 : k < 1 ? 1.12 * Math.sin(k * Math.PI * 0.62) / Math.sin(Math.PI * 0.62) : 1;
  }
  update(t: number) {
    this.u.uTime.value = t; this.desplazamiento(t, this.u.uShift.value); this.u.uSpin.value = this.m.accion === "girar" ? t * 0.35 : 0; this.u.uScale.value = Math.max(0.0001, Math.min(1.12, this.escala(t)));
    this.mesh.visible = this.u.uScale.value > 0.001;
  }
}

// ---------------- luminarias ----------------
const glowTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.18, "rgba(255,240,200,0.95)"); gr.addColorStop(0.45, "rgba(255,170,80,0.35)"); gr.addColorStop(1, "rgba(255,120,40,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
})();
const COLOR_LUZ: Record<string, [string, number, number]> = { antorchas: ["#ffa040", 3.2, 0.55], ventanas: ["#ffd27a", 2.2, 0.6], faroles: ["#ffe2a0", 2.6, 0.5], velas: ["#ffcf70", 2.4, 0.22] };

export class LuminariasGL {
  mesh: THREE.InstancedMesh;
  private u = { uTime: { value: 0 }, uCount: { value: 0 }, uSize: { value: 0.5 }, uCenter: { value: new THREE.Vector3() }, uSpin: { value: 0 }, uShift: { value: new THREE.Vector3() }, uFlick: { value: 0 }, uSide: { value: 0 } };
  total: number; luz: THREE.PointLight;
  /** pts: posiciones base (x, y, z); side: desplazamiento a la derecha de la pantalla (mano que sostiene la antorcha) */
  constructor(parent: THREE.Object3D, public l: Luces, pts?: THREE.Vector3[], side = 0) {
    const [hex, gain, size] = COLOR_LUZ[l.tipo] ?? COLOR_LUZ.antorchas;
    const base = pts ?? this.puntos(l);
    this.total = base.length;
    const geo = new THREE.PlaneGeometry(1, 1);
    const aIdx = new Float32Array(this.total), aPh = new Float32Array(this.total);
    for (let i = 0; i < this.total; i++) { aIdx[i] = i; aPh[i] = hash(i + 3, 9); }
    geo.setAttribute("aIdx", new THREE.InstancedBufferAttribute(aIdx, 1));
    geo.setAttribute("aPh", new THREE.InstancedBufferAttribute(aPh, 1));
    const mat = new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(hex).multiplyScalar(gain), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const U = this.u; U.uSize.value = size; U.uSide.value = side; U.uFlick.value = l.movimiento === "parpadeo" || l.tipo === "antorchas" || l.tipo === "velas" ? 1 : 0;
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", `#include <common>
attribute float aIdx; attribute float aPh; uniform float uTime; uniform float uCount; uniform float uSize; uniform vec3 uCenter; uniform float uSpin; uniform vec3 uShift; uniform float uFlick; uniform float uSide;`)
        .replace("#include <project_vertex>", `vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
vec2 rel = wp.xz - uCenter.xz; float a = uSpin; wp.xz = uCenter.xz + vec2(rel.x * cos(a) - rel.y * sin(a), rel.x * sin(a) + rel.y * cos(a));
wp.xyz += uShift;
vec4 mvPosition = modelViewMatrix * wp;
mvPosition.x += uSide;
float on = step(aIdx, uCount - 0.5) * smoothstep(2.5, 6.0, -mvPosition.z); // las muy cercanas a la lente se apagan
float fl = 1.0 + uFlick * 0.22 * sin(uTime * (9.0 + aPh * 7.0) + aPh * 40.0);
mvPosition.xy += position.xy * uSize * fl * on;
gl_Position = on > 0.5 ? projectionMatrix * mvPosition : vec4(2.0, 2.0, 2.0, 1.0);`);
    };
    mat.customProgramCacheKey = () => "luminarias1";
    this.mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, this.total));
    const M = new THREE.Matrix4();
    base.forEach((p, i) => this.mesh.setMatrixAt(i, M.makeTranslation(p.x, p.y, p.z)));
    this.mesh.frustumCulled = false; this.mesh.layers.set(NOINK); this.mesh.renderOrder = 3;
    U.uCenter.value.set(l.x, 0, l.z);
    parent.add(this.mesh);
    // una luz real tibia en el centro para que el suelo y los personajes reciban el resplandor
    this.luz = new THREE.PointLight(new THREE.Color(hex), 0, Math.max(10, l.ancho * 1.2), 1.4);
    this.luz.position.set(l.x, 2.5, l.z); parent.add(this.luz);
  }
  private puntos(l: Luces) {
    const n = Math.max(1, Math.min(5000, Math.round(l.cantidad))), out: THREE.Vector3[] = [], y0 = l.altura ?? (l.tipo === "ventanas" ? 2 : l.tipo === "velas" ? 0.9 : 1.9);
    for (let i = 0; i < n; i++) {
      const a = hash(i, 21) * Math.PI * 2, r = l.movimiento === "circulo" && (l.altura ?? 0) <= 3 ? 0.75 + 0.25 * hash(i, 22) : Math.sqrt(hash(i, 23));
      // altura > 3: las luces cubren una loma (más altas en el centro), así se leen como «la colina llena de luces»
      const loma = y0 > 3 ? y0 * (1 - r * r) + 1.6 : y0;
      const y = l.tipo === "ventanas" ? y0 + Math.floor(hash(i, 24) * 4) * 1.4 : loma + (hash(i, 25) - 0.5) * 0.3;
      out.push(new THREE.Vector3(l.x + Math.cos(a) * r * l.ancho / 2, y, l.z + Math.sin(a) * r * l.fondo / 2));
    }
    return out;
  }
  /** cuántas encendidas en el segundo t */
  cuantas(t: number) {
    const c = this.l.crecer;
    if (!c || !c.length) return this.total;
    const s = [...c].sort((a, b) => a[0] - b[0]);
    if (t <= s[0][0]) return Math.min(this.total, s[0][1]);
    for (let i = 1; i < s.length; i++) if (t <= s[i][0]) { const k = (t - s[i - 1][0]) / Math.max(0.01, s[i][0] - s[i - 1][0]); return Math.min(this.total, s[i - 1][1] + (s[i][1] - s[i - 1][1]) * k); }
    return Math.min(this.total, s[s.length - 1][1]);
  }
  /** fuente cálida equivalente (calida.ts): el centro del grupo, más fuerte cuantas más luces haya */
  fuente(): { p: THREE.Vector3; col: THREE.Color; r: number; i: number; flick: number } | null {
    const n = this.u.uCount.value; if (n < 0.5) return null;
    const [hex] = COLOR_LUZ[this.l.tipo] ?? COLOR_LUZ.antorchas, s = this.u.uShift.value;
    return { p: new THREE.Vector3(this.l.x + s.x, Math.min(3, (this.l.altura ?? 1.8) + 0.6), this.l.z + s.z), col: new THREE.Color(hex),
      r: Math.max(6, Math.max(this.l.ancho, this.l.fondo) * 0.6 + 4), i: Math.min(1.8, 0.35 + Math.sqrt(n) * 0.06) * (this.l.tipo === "velas" ? 0.6 : 1), flick: this.l.tipo === "antorchas" ? 0.5 : 0 };
  }
  update(t: number, shift?: THREE.Vector3, escala = 1) {
    this.u.uTime.value = t;
    this.u.uCount.value = escala > 0.001 ? this.cuantas(t) : 0;
    this.u.uSpin.value = this.l.movimiento === "circulo" ? t * 0.35 : 0;
    if (shift) this.u.uShift.value.copy(shift);
    this.luz.intensity = Math.min(60, 4 + Math.sqrt(this.u.uCount.value) * 1.6) * (this.l.tipo === "velas" ? 0.4 : 1);
  }
}
