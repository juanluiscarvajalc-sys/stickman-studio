// Personajes del plan como tarjetas 2D iluminadas dentro del mundo 3D (mismo sistema que la plantilla del puente:
// un lienzo por dibujo distinto, tarjetas que giran hacia la cámara, cardShade, mancha de contacto bajo los pies).
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxBurst, fxStars, fxPuff, fxNote, fxRing, fxContact, fxShadow, Outfit, Expr, FrontOpts, SideOpts, INK, Held } from "./toon";
import { NOINK } from "./ink";
import { MultitudGL, LuminariasGL } from "./multitud";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
import { FPS, Plan, Escena, ActorEnEscena, Personaje, EXPR, GESTO, COMPLEXION, HAT, hash, clamp01, smooth, Accion, Expresion, vestirPara } from "./plan";

// ---------------- lienzos compartidos ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
class Pool {
  private live = new Map<string, Entry>(); private free: Entry[] = []; private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) { const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw }; this.reqs.push(r); return r; }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g)); e.tex.needsUpdate = true; this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
const SU = 0.00216; // metros por unidad de diseño: 1000 = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);

class Card {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(BODY, this.mat); this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.receiveShadow = true; this.mesh.visible = false; this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
class FxCard {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat); this.mesh.visible = false; this.mesh.layers.set(NOINK); parent.add(this.mesh);
  }
  bind(soft: boolean) {
    const t = this.r?.tex; if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else { this.mat.map = t; this.soft.map = t; this.mesh.material = soft ? this.soft : this.mat; this.mesh.renderOrder = 2; }
  }
}

// ---------------- vestuario ----------------
export const outfitDe = (p: Personaje): Outfit => {
  const hat = HAT[p.sombrero] ?? null;
  return {
    jacket: p.camisa, pants: p.pantalon, boots: p.zapatos, skin: p.piel, hat, build: COMPLEXION[p.complexion] ?? "adult",
    cap: p.colorSombrero ?? "#c0353a", hair: p.colorPelo ?? (p.sombrero === "pelo" ? p.colorSombrero : null) ?? ["#4a3020", "#2a201a", "#7a4a2a", "#1c1814", "#8a6a3a"][Math.floor(hash(p.id.length * 3 + p.id.charCodeAt(0), 4) * 5)],
    dress: p.vestido ?? undefined, moustache: p.bigote ?? undefined, acc: p.accesorios ?? [], accCol: p.colorAccesorio ?? undefined, estampado: p.estampado ?? undefined,
    belt: p.cinturon ?? null, buttons: "#d9dde0",
    // correas cruzadas solo para soldados; policías y funcionarios llevan el cinturón a la cintura
    cintura: !(/casco|chaco/.test(String(p.sombrero ?? "")) || /soldad|milit|ejercit|guerra/.test(String((p as { papel?: string }).papel ?? ""))),
    // sin datos del Diseñador, cada personaje igual sale distinto (elegido por su id)
    pelo: p.peinado ?? ["liso", "rizado", "punta", "mono", "largo", "calvo", "coleta"][Math.floor(hash(p.id.length * 7 + p.id.charCodeAt(0), 3) * 7)],
    patron: p.ropa ?? ["liso", "acolchado", "rayas", "chaleco", "parches", "delantal", "cuadros"][Math.floor(hash(p.id.charCodeAt(p.id.length - 1) * 3 + p.id.length, 5) * 7)],
    patronCol: p.colorRopa2 ?? undefined,
    rasgos: (p.rasgos ?? [["mejillas"], ["barba"], ["pecas"], ["gafas", "perilla"], ["barba_corta"], ["cejas", "patillas"], ["arrugas", "barba"]][Math.floor(hash(p.id.charCodeAt(0) * 11 + p.id.length, 7) * 7)])
      .filter((x) => !(p.vestido && /barba|perilla|patillas/.test(x))),
    // color de barba y cejas: el del pelo si se ve el pelo; si lleva sombrero, uno natural
    barba: p.bigote ?? p.colorPelo ?? (p.sombrero === "pelo" ? p.colorSombrero : ["#4a3020", "#2a201a", "#7a4a2a", "#8a8a8a"][Math.floor(hash(p.id.length * 5, 9) * 4)]),
  };
};

// ---------------- estado de un actor en el tiempo ----------------
const VEL: Partial<Record<Accion, number>> = { caminar: 1.4, correr: 3.6, acercarse: 0.75, retroceder: 0.8 };
export type Pose = { x: number; z: number; dx: number; dz: number; moving: boolean; accion: Accion; expresion: Expresion; tAcc: number; mano: Held | null };
/** tramos de la secuencia de un actor: cada uno arranca donde terminó el anterior */
type Tramo = { t0: number; t1: number; accion: Accion; expresion: Expresion; mano: Held | null; x0: number; z0: number; hacia: [number, number] | null; dx: number; dz: number };
const TRAMOS = new WeakMap<ActorEnEscena, Tramo[]>();
const enTramo = (s: Tramo, t: number) => {
  const v = VEL[s.accion]; let x = s.x0, z = s.z0, moving = false;
  const u = Math.max(0, Math.min(t, s.t1) - s.t0);
  if (v && s.hacia) {
    const [tx, tz] = s.hacia, L = Math.hypot(tx - s.x0, tz - s.z0) || 1e-6, d = Math.min(u * v, L);
    x = s.x0 + (tx - s.x0) * (d / L); z = s.z0 + (tz - s.z0) * (d / L); moving = d < L - 1e-3 && t < s.t1;
  } else if (v) { x = s.x0 + s.dx * v * u; z = s.z0 + s.dz * v * u; moving = t < s.t1; }
  return { x, z, moving };
};
const tramosDe = (a: ActorEnEscena): Tramo[] => {
  const c = TRAMOS.get(a); if (c) return c;
  const lista: { t: number; accion: Accion; expresion?: Expresion | null; hacia?: [number, number] | null; mano?: Held | null }[] = [{ t: 0, accion: a.accion, expresion: a.expresion, hacia: a.hacia ?? null, mano: a.mano ?? null }];
  if (a.luego) lista.push({ t: a.luego.t, accion: a.luego.accion, expresion: a.luego.expresion });
  for (const p of a.pasos ?? []) if (p && Number.isFinite(p.t) && p.t > 0) lista.push(p);
  lista.sort((p, q) => p.t - q.t);
  const out: Tramo[] = []; let x = a.x, z = a.z, dx = 1, dz = 0, expr = a.expresion, mano: Held | null = a.mano ?? null;
  lista.forEach((p, i) => {
    const t1 = lista[i + 1]?.t ?? Infinity;
    if (p.expresion) expr = p.expresion;
    if (p.mano !== undefined) mano = p.mano;
    const h = p.hacia && Number.isFinite(p.hacia[0]) && Number.isFinite(p.hacia[1]) ? p.hacia : null;
    if (h) { const L = Math.hypot(h[0] - x, h[1] - z); if (L > 0.05) { dx = (h[0] - x) / L; dz = (h[1] - z) / L; } }
    const s: Tramo = { t0: p.t, t1, accion: p.accion, expresion: expr, mano, x0: x, z0: z, hacia: h, dx, dz };
    out.push(s);
    if (Number.isFinite(t1)) { const e = enTramo(s, t1); x = e.x; z = e.z; }
  });
  TRAMOS.set(a, out); return out;
};
export const poseEn = (a: ActorEnEscena, t: number): Pose => {
  if (a.pasos?.length) {
    const ts = tramosDe(a); let s = ts[0];
    for (const q2 of ts) if (t >= q2.t0) s = q2;
    const e = enTramo(s, t);
    let accion = s.accion;
    // terminó de caminar antes del siguiente paso: se queda quieto (mirando a cámara)
    if (VEL[accion] && !e.moving) accion = "parado";
    return { x: e.x, z: e.z, dx: s.dx, dz: s.dz, moving: e.moving, accion, expresion: s.expresion, tAcc: t - s.t0, mano: s.mano };
  }
  let accion = a.accion, expresion = a.expresion, tAcc = t;
  if (a.luego && t >= a.luego.t) { accion = a.luego.accion; expresion = a.luego.expresion; tAcc = t - a.luego.t; }
  let x = a.x, z = a.z, dx = 1, dz = 0, moving = false;
  // ir y venir (nervioso, esperando noticias): camina 2.2 m a un lado y al otro, con una pausa al girar
  if (accion === "ir_y_venir") {
    const per = 3.6, ph = (t / per) % 1, tri = ph < 0.5 ? ph * 2 : 2 - ph * 2, giro = (ph % 0.5) > 0.43;
    return { x: a.x - 1.1 + 2.2 * smooth(tri), z: a.z, dx: ph < 0.5 ? 1 : -1, dz: 0, moving: !giro, accion: giro ? "pensar" : "caminar", expresion, tAcc, mano: a.mano ?? null };
  }
  const v = VEL[a.accion];
  const H0 = a.hacia ?? (a.accion === "retroceder" ? ([a.x, a.z - 1.3] as [number, number]) : null);
  if (v && H0) {
    const [tx, tz] = H0, L = Math.hypot(tx - a.x, tz - a.z) || 1, tEnd = a.luego ? Math.min(a.luego.t, L / v) : L / v;
    const d = Math.min(t, tEnd) * v;
    // arranque y frenado suaves (0.25 s)
    const k = clamp01(d / L);
    x = a.x + (tx - a.x) * k; z = a.z + (tz - a.z) * k; dx = (tx - a.x) / L; dz = (tz - a.z) / L;
    moving = t < tEnd;
    if (!moving && !a.luego) { accion = "parado"; }
  } else if (v) { moving = true; x = a.x + v * t; dx = 1; }
  return { x, z, dx, dz, moving, accion, expresion, tAcc, mano: a.mano ?? null };
};

/** parpadeo: 4 cuadros cada 0.5–2.3 s */
const LID = [0.5, 1, 1, 0.5];
const lidAt = (f: number, i: number) => {
  let s = Math.round(-60 * hash(i, 9));
  for (let n = 0; s <= f && n < 600; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += Math.round(15 + 54 * hash(i * 31 + n, 13)); }
  return 0;
};
const q = (v: number, n = 60) => Math.round(v * n) / n;
const clamp = (a: number, b: number, v: number) => Math.min(b, Math.max(a, v));
/** pose a pose: sostiene una pose y pasa a la siguiente en 0.3 del tiempo con suavizado y un poco de rebote (animación clásica) */
const poseAPose = (ph: number, i: number) => {
  const b = Math.floor(ph), fr = ph - b, nivel = (n: number) => 0.12 + 0.76 * hash(n * 17 + i * 5, 3);
  const a0 = nivel(b - 1), a1 = nivel(b), k = Math.min(1, fr / 0.45), e = k * k * k * (k * (6 * k - 15) + 10);
  const over = fr > 0.45 && fr < 0.7 ? 0.07 * Math.sin(Math.PI * (fr - 0.45) / 0.25) * Math.sign(a1 - a0) : 0;
  return q(clamp01(a0 + (a1 - a0) * e + over + 0.025 * Math.sin(ph * 9.1 + i)), 240);
};
/** ruido suave (suma de senos desfasados) para que nada quede congelado */
const vivo = (t: number, s: number) => 0.55 * Math.sin(t * 0.93 + s * 1.7) + 0.3 * Math.sin(t * 1.71 + s * 2.9) + 0.15 * Math.sin(t * 3.1 + s * 0.6);
/** suspiro de 3.2 s: inhala (sube el pecho), exhala (baja la cabeza, cierra los ojos) y descansa */
const suspiro = (t: number) => { const u = (t % 3.2) / 3.2, s = (x: number) => x * x * (3 - 2 * x);
  return { inh: u < 0.35 ? s(u / 0.35) : u < 0.5 ? 1 - s((u - 0.35) / 0.15) : 0, exh: u >= 0.35 && u < 0.85 ? Math.sin(Math.PI * (u - 0.35) / 0.5) : 0 }; };
/** la cara que acompaña a cada gesto: [expresión por defecto, expresiones compatibles] */
const CARA_GESTO: Record<string, [string, string[]]> = {
  asentir: ["serio", ["serio", "sonrisa", "feliz", "alivio", "decidido", "pensativo", "triste"]], negar: ["preocupado", ["preocupado", "enojado", "triste", "asustado", "serio", "llorando"]],
  cruzar_brazos: ["sospechoso", ["sospechoso", "enojado", "serio", "decidido", "pensativo"]], dudar: ["confundido", ["confundido", "pensativo", "preocupado"]],
  pensar: ["pensativo", ["pensativo", "sospechoso", "preocupado", "serio", "confundido"]], suplicar: ["triste", ["triste", "llorando", "asustado", "preocupado"]],
  abrazar: ["triste", ["triste", "llorando", "alivio", "feliz"]], consolar: ["triste", ["triste", "preocupado", "serio", "alivio"]],
  esperar: ["cansado", ["cansado", "serio", "nervioso", "preocupado"]], temblar: ["asustado", ["asustado", "aterrado", "llorando"]],
  desesperarse: ["llorando", ["llorando", "aterrado", "gritando", "asustado"]], llamar: ["serio", ["serio", "preocupado", "nervioso", "decidido", "asustado"]],
  mirar_reloj: ["nervioso", ["nervioso", "serio", "preocupado", "cansado"]], tocar_puerta: ["serio", ["serio", "nervioso", "decidido", "preocupado"]],
  detener: ["decidido", ["decidido", "enojado", "serio"]], amenazar: ["enojado", ["enojado", "gritando"]], enumerar: ["decidido", ["decidido", "serio", "pensativo"]],
  suspirar: ["cansado", ["cansado", "triste", "alivio"]], reir: ["risa", ["risa", "feliz"]], retroceder: ["aterrado", ["aterrado", "asustado", "sorpresa"]],
  acercarse: ["sospechoso", ["sospechoso", "nervioso", "asustado", "serio", "decidido"]], ir_y_venir: ["nervioso", ["nervioso", "preocupado", "enojado"]],
  preocuparse: ["preocupado", ["preocupado", "asustado", "nervioso", "triste"]], cubrirse: ["llorando", ["llorando", "triste", "asustado", "enojado"]],
  sorpresa: ["sorpresa", ["sorpresa", "asustado", "aterrado"]], espiar: ["sospechoso", ["sospechoso", "nervioso"]],
};
const tier = (d: number): [number, number, number] => d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// burbuja de signo (! o ?) propia
const fxBubble = (p: Pen, ch: string) => {
  p.ell(150, 140, 120, 110, "#ffffff", 10);
  p.poly([[110, 235], [150, 240], [95, 290]], "#ffffff", 0);
  const g = p.g; g.fillStyle = INK; g.font = "bold 170px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ch, 150, 150);
};

export class Elenco {
  root = new THREE.Group();
  private pool = new Pool(); private cards: Card[] = []; private fxs: FxCard[] = [];
  private outfits = new Map<string, Outfit>();
  private sun = new THREE.Vector3();
  multitudes: MultitudGL[] = [];
  private antorchas: (LuminariasGL | null)[] = [];
  luminarias: LuminariasGL[] = [];
  constructor(private plan: Plan, private e: Escena, luz = "day") {
    // cada actor con el vestuario de esta escena (el pedido, el del lugar o el principal)
    for (const p of plan.personajes) { const a = e.actores.find((x) => x.id === p.id); this.outfits.set(p.id, outfitDe(vestirPara(p, e.ambiente?.lugar, a?.vestuario))); }
    const light = (-120 * Math.PI) / 180;
    (e.multitudes ?? []).forEach((m, i) => {
      const g = new MultitudGL(this.root, m, light, luz, i + 1);
      this.multitudes.push(g);
      // cada persona con antorcha lleva su propia luz (en la mano derecha, a ~1.7 m)
      if (m.mano === "antorcha") {
        const pts = g.pts.map((p) => new THREE.Vector3(p.x, 1.72, p.z));
        this.antorchas.push(new LuminariasGL(this.root, { tipo: "antorchas", cantidad: pts.length, x: m.x, z: m.z, ancho: m.ancho, fondo: m.fondo, movimiento: m.accion === "girar" ? "circulo" : "quietas" }, pts, 0.32));
      } else this.antorchas.push(null);
    });
    for (const l of e.luces ?? []) this.luminarias.push(new LuminariasGL(this.root, l));
  }
  /** fuentes de luz cálida de las antorchas de las multitudes y de las luces masivas (después de update) */
  fuentes() {
    return [...this.antorchas, ...this.luminarias].map((l) => l?.fuente() ?? null).filter((x): x is NonNullable<typeof x> => !!x);
  }
  /** centro y radio de una multitud en el segundo t (para la cámara) */
  multitud(i: number, t: number) {
    const g = this.multitudes[i]; if (!g) return null;
    const d = g.desplazamiento(t);
    return { c: new THREE.Vector3(g.m.x + d.x, 0, g.m.z + d.z), r: Math.max(g.m.ancho, g.m.fondo) / 2 };
  }
  private card(i: number) { while (this.cards.length <= i) this.cards.push(new Card(this.root)); return this.cards[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new FxCard(this.root)); return this.fxs[i]; }

  /** posición actual de un actor (para cámara y efectos) */
  donde(id: string, t: number): THREE.Vector3 | null {
    const a = this.e.actores.find((x) => x.id === id);
    if (!a) return null;
    const p = poseEn(a, t);
    return new THREE.Vector3(p.x, 0, p.z);
  }

  update(t: number, f: number, cam: THREE.PerspectiveCamera, sunDir: THREE.Vector3, hablando: boolean) {
    this.multitudes.forEach((g, i) => { g.update(t); this.antorchas[i]?.update(t, g.desplazamiento(t), g.escala(t)); });
    for (const l of this.luminarias) l.update(t);
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    this.sun.copy(sunDir);
    const light = Math.round(Math.atan2(-this.sun.y, this.sun.dot(right)) / (Math.PI / 4)) * (Math.PI / 4);
    const places: { key: string; draw: (p: Pen) => void; x: number; z: number; mirror: boolean; size: [number, number, number]; roll: number; sc: number; lift: number; sy?: number }[] = [];
    const fx: { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean }[] = [];
    this.e.actores.forEach((a, i) => {
      const o = this.outfits.get(a.id); if (!o) return;
      const P = poseEn(a, t), sc = a.escala ?? 1;
      const d = cam.position.distanceTo(new THREE.Vector3(P.x, 1.1, P.z)) / sc;
      const [w, h, k] = tier(d);
      const seed = (i % 7) + 1 + Math.floor(hash(a.id.length * 13 + a.id.charCodeAt(0)) * 3);
      let blink = lidAt(f, i + 1);
      let expr: Expr = EXPR[P.expresion] ?? "neutral";
      const cg = CARA_GESTO[P.accion]; if (cg && !cg[1].includes(String(P.expresion ?? ""))) expr = EXPR[cg[0] as keyof typeof EXPR] ?? expr;
      // la cara nunca salta de un estado a otro: el cambio de acción/expresión pasa por un parpadeo (skill HyperFrames, actuación)
      if (t > 0.2 && P.tAcc < 0.13) blink = Math.max(blink, P.tAcc < 0.04 || P.tAcc > 0.1 ? 0.5 : 1);
      // boca que se mueve al hablar (solo cuando la escena tiene voz y la acción es hablar)
      const conVoz = hablando && (this.e.habla ? this.e.habla === a.id : P.accion === "hablar") && !["trepar", "entrar", "cubrirse", "pilotar", "dormir"].includes(P.accion);
      if (conVoz && Math.floor(f / 4 + i) % 3 === 0) expr = expr.endsWith("~") ? expr : (`${expr}~` as Expr);
      const tx = cam.position.x - P.x, tz = cam.position.z - P.z, tl = Math.hypot(tx, tz) || 1;
      const c = (tx * P.dx + tz * P.dz) / tl;
      const side = P.moving && Math.abs(c) < 0.6 && P.accion !== "retroceder";
      const mirror = side && P.dx * right.x + P.dz * right.z < 0;
      const run = P.accion === "correr" || a.accion === "correr";
      let key: string, draw: (p: Pen) => void, roll = 0, lift = 0;
      if (side) {
        const ph = ((t * (run ? 1.8 : 1.0) + hash(i)) % 1);
        const so: SideOpts = { phase: q(ph, 30), expr, mode: "march", blink, stomp: run ? 1.4 : 1, stride: (run ? 1.5 : 0.9) * Math.sqrt(Math.max(0.2, 1 - c * c)), light: mirror ? Math.PI - light : light, seed };
        key = `S|${a.id}|${JSON.stringify(so)}`; draw = (p) => bodySide(p, o, so);
      } else {
        const ac = P.accion;
        let gesture = GESTO[ac] ?? null;
        if (conVoz && !P.moving && !P.mano && ["hablar", "parado", "explicar", "manos_cadera"].includes(ac)) {
          const TALK = ["talk", "explain", "talk", "point", "count", "shrug", "explain", "chin", "talk", "hips"] as const;
          const seg = Math.floor(t * 0.6 + hash(i + 11) * 5);
          gesture = TALK[Math.floor(hash(seg * 7 + i * 13, 5) * TALK.length) % TALK.length] as typeof gesture;
        }
        const vel: Partial<Record<Accion, number>> = { saludar: 9, hablar: 6, escribir: 11, trepar: 5, entrar: 5, preocuparse: 3, explicar: 4, pilotar: 1.5, cubrirse: 2.5, leer: 1, fotografiar: 2, entrevistar: 3, arropar: 1.6,
          asentir: 5, negar: 6, temblar: 30, suplicar: 2, abrazar: 1, dudar: 6, llamar: 1, enumerar: 5, consolar: 1.5, tocar_puerta: 8, amenazar: 7, reir: 9, cruzar_brazos: 0.8, esperar: 0.8, desesperarse: 2, detener: 1, entregar: 1.2 };
        const w0 = vel[ac] ?? 4;
        const POSE = ["talk", "explain", "point", "count", "shrug", "chin", "hips", "worry", "plead", "console", "offer", "stop", "cross", "watch", "scratch", "hug", "read"];
        let gk = gesture && POSE.includes(gesture) && ac !== "enumerar" ? poseAPose(P.tAcc * Math.min(w0, 4.8) / 6.28 + i * 0.37, i) : gesture ? q(clamp01(0.5 + 0.36 * Math.sin(P.tAcc * w0 + i) + 0.16 * Math.sin(P.tAcc * w0 * 2.71 + i * 2.3) + (ac === "pilotar" ? 0.3 * Math.sin(P.tAcc * 0.37 + i) : 0)), 240) : 0;
        if (ac === "lanzar") gk = q(clamp01((P.tAcc % 1.6) / 0.3), 60);          // brazo atrás -> adelante en 0.3 s
        if (ac === "empujar") gk = q(0.5 + 0.5 * Math.sin(P.tAcc * 5), 60);
        const prop: FrontOpts["prop"] = ac === "martillar" ? ["hammer", q(Math.max(0, Math.sin(P.tAcc * 7)), 10)] : null;
        const held = ac === "martillar" || (ac === "lanzar" && gk > 0.85) ? null : P.mano ?? (ac === "mirar_reloj" ? "reloj_bolsillo" : ac === "llamar" ? "telefono_antiguo" : null);
        let mode: FrontOpts["mode"] = P.moving ? "stroll" : "stand";
        if (ac === "sentado" || ac === "pilotar") mode = "sit";
        if (ac === "pilotar") lift = 0.38;
        // trepar: sube por la escalera apoyada (inclinada hacia la pared) de espaldas a la cámara; entrar: arriba, y se mete por la ventana
        const alto = a.alto ?? 3;
        if (ac === "trepar") lift = Math.min(alto, (a.subido ?? 0) + 0.5 * P.tAcc);
        if (ac === "entrar") lift = alto + 0.25 * clamp01(P.tAcc / 0.6);
        if (ac === "caer") { mode = "fall"; const u = smooth(P.tAcc / 0.5); roll = -1.35 * u * (i % 2 ? 1 : -1); lift = 0; }
        if (ac === "celebrar") lift = 0.18 * Math.abs(Math.sin(P.tAcc * 6));
        if (ac === "sorpresa" && P.tAcc < 0.3) lift = 0.15 * Math.sin((P.tAcc / 0.3) * Math.PI);
        let facing = (Math.abs(P.dx) > 0.3 ? (P.dx * right.x + P.dz * right.z > 0 ? 1 : -1) : 0) as -1 | 0 | 1;
        let mira = 0, nod = 0, cabeceo = 0;
        if (!P.moving && !["trepar", "entrar", "espiar", "pilotar", "leer", "escribir", "arropar", "caer"].includes(ac)) {
          const otro = this.e.habla && this.e.habla !== a.id ? this.e.actores.find((x) => x.id === this.e.habla) : this.e.actores.find((x) => x.id !== a.id);
          const ciclo = (t + hash(i + 3) * 7) % 4.2;
          if (this.e.habla && this.e.habla !== a.id && ciclo > 1.2 && ciclo < 1.9) nod = q(4 * Math.sin((ciclo - 1.2) * 13), 30);
          if (otro && ciclo < 3.1) { const po = poseEn(otro, t), lado = (po.x - P.x) * right.x + (po.z - P.z) * right.z;
            if (Math.abs(lado) > 0.5) { mira = lado > 0 ? 0.7 : -0.7; if (this.e.habla && this.e.habla !== a.id && ciclo > 0.4) facing = (lado > 0 ? 1 : -1); } }
          else if (ciclo > 3.6) mira = q(Math.sin(t * 0.9 + i), 60) * 0.5;
        }
        const fo: FrontOpts = { phase: q((t * 1.0 + hash(i)) % 1, 30), expr, mode, blink, light, seed, gesture, gk, held, prop, facing: P.moving ? facing : 0,
          tilt: ac === "empujar" ? 9 : ac === "lanzar" ? 6 - 10 * gk : 0,
          headTilt: ac === "pensar" ? 8 : ac === "encogerse" ? -6 : ac === "espiar" ? 7 : ac === "preocuparse" ? -4 : ac === "leer" || ac === "escribir" ? -5 : ac === "arropar" ? -9 : 0,
          look: ac === "pensar" ? 0.6 : ac === "espiar" ? 0.8 : ac === "pilotar" ? q(Math.sin(P.tAcc * 0.45 + i), 60) * 0.7 : mira, back: ac === "trepar" || ac === "entrar" };
        if (ac === "pilotar") fo.headTilt = q(3 * Math.sin(P.tAcc * 0.3 + i), 30);
        // cabeza y cuerpo de la gesticulación
        if (nod) fo.headTilt = (fo.headTilt ?? 0) + nod;
        if (conVoz && !P.moving) fo.headTilt = (fo.headTilt ?? 0) + q(3.2 * Math.sin(t * 2.3 + i) + 1.5 * Math.sin(t * 3.7 + i * 2), 30);
        // ---- principios de animación: cabeceo real, exageración, acentos y la cara que acompaña ----
        if (ac === "asentir") { cabeceo = q(0.25 + 0.65 * Math.max(0, Math.sin(P.tAcc * 6)), 40); fo.headTilt = 0; }
        if (ac === "mirar_reloj") { const mirar = (P.tAcc % 3.4) < 2.3; cabeceo = mirar ? 0.95 : -0.1; fo.look = mirar ? 0.35 : q(Math.sin(P.tAcc), 2) * 0.8; fo.gk = mirar ? 0 : 1;
          if (!mirar) expr = EXPR["nervioso" as keyof typeof EXPR] ?? expr; }
        if (ac === "enumerar") { const b = Math.floor(P.tAcc / 1.1) % 3, fr = (P.tAcc % 1.1) / 1.1; fo.gk = b / 2; cabeceo = fr < 0.25 ? q(0.5 * Math.sin(Math.PI * fr / 0.25), 40) : 0; }
        if (ac === "suspirar") { const s = suspiro(P.tAcc); cabeceo = q(-0.45 * s.inh + 0.95 * s.exh, 40); if (s.exh > 0.5) { blink = 1; expr = EXPR["cansado" as keyof typeof EXPR] ?? expr; } }
        if (ac === "leer" || ac === "escribir" || ac === "arropar") cabeceo = 0.6;
        if (ac === "amenazar" && gk > 0.6) expr = EXPR["gritando" as keyof typeof EXPR] ?? expr;
        if (ac === "detener" && P.tAcc < 0.8) expr = EXPR["gritando" as keyof typeof EXPR] ?? expr;
        if (ac === "desesperarse" && Math.floor(P.tAcc / 1.4) % 2) expr = EXPR["gritando" as keyof typeof EXPR] ?? expr;
        if (ac === "reir" && Math.floor(f / 4 + i) % 2) expr = (expr.endsWith("~") ? expr : `${expr}~`) as Expr;
        if (nod) cabeceo += Math.abs(nod) / 8;
        // acento al cambiar de gesto mientras habla: la cabeza marca el golpe
        if (conVoz && !P.moving) { const fr = (t * 0.6 + hash(i + 11) * 5) % 1; if (fr < 0.14) cabeceo += q(0.35 * Math.sin(Math.PI * fr / 0.14), 40); }
        fo.nod = cabeceo; fo.expr = expr; fo.blink = blink;
        if (ac === "negar") { fo.look = q(Math.sin(P.tAcc * 6), 30); fo.headTilt = -2; }
        if (ac === "dudar") fo.headTilt = 7;
        if (ac === "mirar_reloj") fo.headTilt = -9;
        if (ac === "consolar" || ac === "abrazar") fo.headTilt = 5;
        if (ac === "suplicar") fo.headTilt = -4;
        if (ac === "desesperarse") fo.tilt = q(4 * Math.sin(P.tAcc * 1.5), 30);
        if (ac === "suspirar") fo.headTilt = q(-6 * Math.max(0, Math.sin(P.tAcc * 1.2)), 30);
        if (ac === "reir") lift = 0.05 * Math.abs(Math.sin(P.tAcc * 9));
        if (ac === "espiar") fo.tilt = 11;
        if (ac === "preocuparse") fo.tilt = 2 * Math.sin(P.tAcc * 1.3);
        if (!P.moving && !["caer", "dormir", "trepar", "entrar"].includes(ac)) {
          const s0 = i * 3.7 + a.id.length;
          fo.headTilt = q((fo.headTilt ?? 0) + 3.6 * vivo(t * 0.9, s0), 30);
          fo.look = q(clamp(-1, 1, (fo.look ?? 0) + 0.14 * vivo(t * 0.7, s0 + 5)), 60);
          fo.nod = q((fo.nod ?? 0) + 0.09 * vivo(t * 1.1, s0 + 9), 60);
          fo.tilt = q((fo.tilt ?? 0) + (conVoz ? 5 : 3) * vivo(t * 0.8, s0 + 13), 30);
        }
        key = `F|${a.id}|${JSON.stringify(fo)}`; draw = (p) => bodyFront(p, o, fo);
      }
      // entrar por la ventana: a los 0.6 s ya está adentro (no se dibuja); al trepar se acerca a la pared con la escalera
      if (P.accion === "entrar" && P.tAcc > 0.6) return;
      const zEsc = P.accion === "trepar" || P.accion === "entrar" ? -0.33 * lift : 0;
      const quieto = !P.moving && lift < 0.05 && P.accion !== "caer";
      const sway = quieto ? 0.05 * vivo(t * 0.85, i * 1.7) + 0.014 * Math.sin(t * 2.3 + i) : 0;
      const pesoX = quieto ? 0.075 * vivo(t * 0.6, i * 2.3 + 1) : 0;
      const habla = quieto && this.e.habla === a.id && hablando;
      const su = suspiro(P.tAcc);
      let sy = P.accion === "suspirar" ? 1 + 0.06 * su.inh - 0.035 * su.exh : quieto ? 1 + 0.025 * Math.sin(t * 2.0 + i * 0.9) + (habla ? 0.02 * Math.abs(Math.sin(t * 4.6 + i)) : 0) : 1;
      // anticipación (se encoge) y rebote (se estira y asienta) en los primeros 0.45 s de cada acción nueva
      if (quieto && P.tAcc < 0.45 && t > 0.2) { const k = P.tAcc / 0.45; sy *= k < 0.35 ? 1 - 0.045 * Math.sin(Math.PI * k / 0.35) : 1 + 0.03 * Math.sin(Math.PI * (k - 0.35) / 0.65) * (1 - k); }
      if (P.accion === "suspirar" && su.exh > 0.15 && su.exh < 0.95) { const pu = q(su.exh, 12); fx.push({ key: `puff${pu}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, pu), x: P.x + 0.12, y: 1.55 * sc, z: P.z + 0.3, w: 0.32 * sc, h: 0.32 * sc, soft: true }); }
      const tiembla = P.accion === "temblar" ? 0.012 * Math.sin(t * 41 + i) : 0, peso = P.accion === "esperar" ? 0.02 * Math.sin(t * 0.6 + i) : 0;
      places.push({ key, draw, x: P.x + tiembla + pesoX, z: P.z + zEsc, mirror, size: [w, h, k], roll: roll + sway + peso, sc, lift, sy });
      // flash de la cámara de prensa cada ~1.8 s
      if (P.accion === "fotografiar" && P.mano === "camara_foto") { const u2 = ((P.tAcc + i * 0.7) % 1.8) / 0.35; if (u2 < 1) fx.push({ key: `burst${q(u2, 20)}flash`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u2, 20), "#fffbe8", 12), x: P.x + 0.15, y: 1.95, z: P.z + 0.25, w: 1.3, h: 1.3 }); }
      // mancha de contacto + sombra alargada lejos del sol
      const hl = Math.hypot(this.sun.x, this.sun.z) || 1, ox = -this.sun.x / hl, oz = -this.sun.z / hl, rot = Math.atan2(-ox, -oz);
      const el = Math.asin(Math.min(0.99, Math.max(0.1, this.sun.y))), len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc;
      if (ac(P) !== "caer" && lift < 0.3) {
        fx.push({ key: "blob|shadow", cw: 128, ch: 256, draw: (p) => fxShadow(p, "#9ea4c4"), x: P.x + ox * 0.3 * (len + 0.55), y: 0.018, z: P.z + oz * 0.3 * (len + 0.55), w: 0.72 * sc, h: len + 0.55 * sc, flat: true, rot });
      }
      if (lift < 0.3) fx.push({ key: "blob|contact", cw: 128, ch: 128, draw: (p) => fxContact(p, "#7a7f9e"), x: P.x, y: 0.022, z: P.z, w: (ac(P) === "caer" ? 1.4 : 0.52) * sc, h: 0.4 * sc, flat: true, rot });
      // polvo al correr
      if (run && P.moving) { const u = (t * 2.2 + i * 0.37) % 1; fx.push({ key: `puff${q(u, 20)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, q(u, 20)), x: P.x - P.dx * 0.6, y: 0.35, z: P.z - P.dz * 0.6, w: 1.0, h: 1.0, soft: true }); }
      if (P.accion === "caer" && P.tAcc > 0.4) { const u = ((P.tAcc - 0.4) * 1.3) % 1; fx.push({ key: `stars${q(u, 30)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(u, 30)), x: P.x, y: 0.9, z: P.z, w: 0.75, h: 0.375 }); }
    });
    // efectos del plan + polvo automático cuando algo se derrumba
    const implicitos = (this.e.objetos ?? []).filter((o) => o.estado === "derrumbe").map((o) => ({ tipo: "polvo" as const, t: (o.t ?? 0) + 0.55, actor: null, x: o.x, z: o.z + 1, grande: (o.escala ?? 1) * (o.tipo === "casa" || o.tipo === "torre" || o.tipo === "muro" ? 4 : 1.6) }));
    for (const ef of implicitos) {
      const u = (t - ef.t) / 0.9;
      if (u < 0 || u > 1) continue;
      for (let n = 0; n < 3; n++) { const uu = q(clamp01(u * (1 - n * 0.12)), 20); fx.push({ key: `puff${uu}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, uu), x: ef.x + (n - 1) * ef.grande * 0.45, y: 0.3 * ef.grande, z: ef.z, w: ef.grande * 1.3, h: ef.grande * 1.3, soft: true }); }
    }
    for (const ef of this.e.efectos ?? []) {
      const u = (t - ef.t) / 0.6;
      if (u < 0 || u > 1.6) continue;
      const at = ef.actor ? this.donde(ef.actor, t) : null;
      const x = at?.x ?? ef.x ?? 0, z = at?.z ?? ef.z ?? 0, uu = q(clamp01(u), 30);
      if (ef.tipo === "destello" || ef.tipo === "chispas") fx.push({ key: `burst${uu}${ef.tipo}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, uu, ef.tipo === "chispas" ? "#ffd27a" : "#fff3b0", ef.tipo === "chispas" ? 14 : 10), x, y: 1.4, z: z + 0.2, w: 1.6, h: 1.6 });
      else if (ef.tipo === "estrellas") fx.push({ key: `stars${uu}`, cw: 420, ch: 210, draw: (p) => fxStars(p, uu), x, y: 2.25, z, w: 0.75, h: 0.375 });
      else if (ef.tipo === "polvo") fx.push({ key: `puff${uu}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, uu), x, y: 0.4, z: z + 0.3, w: 1.8, h: 1.8, soft: true });
      else if (ef.tipo === "notas") for (let n = 0; n < 3; n++) { const age = (u + n * 0.33) % 1; fx.push({ key: `note${n % 3}`, cw: 220, ch: 260, draw: (p) => fxNote(p, n % 3), x: x + 0.4 * (n - 1), y: 1.9 + 0.8 * age, z, w: 0.34, h: 0.4 }); }
      else if (ef.tipo === "anillo") fx.push({ key: `ring${uu}`, cw: 600, ch: 600, draw: (p) => fxRing(p, uu), x, y: 0.03, z, w: 2.4, h: 2.4, flat: true });
      else if (ef.tipo === "signo") { const s = Math.min(1, u * 4); fx.push({ key: "bubble!", cw: 300, ch: 300, draw: (p) => fxBubble(p, "!"), x: x + 0.35, y: 2.45, z, w: 0.6 * s, h: 0.6 * s }); }
    }
    // a mallas
    const used: Card[] = [];
    places.forEach((p, i) => {
      const a = this.card(i);
      a.r = this.pool.req(p.key, p.size[0], p.size[1], p.size[2], p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.lift, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll);
      a.mesh.scale.set(p.mirror ? -p.sc : p.sc, p.sc * (p.sy ?? 1), p.sc);
      a.mesh.castShadow = false; used.push(a);
    });
    for (let i = places.length; i < this.cards.length; i++) this.cards[i].mesh.visible = false;
    const fused: [FxCard, boolean][] = [];
    fx.forEach((p, i) => {
      const e = this.fx(i);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.mesh.visible = true; e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0); else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(Math.max(1e-3, p.w), Math.max(1e-3, p.h), 1); fused.push([e, !!p.soft]);
    });
    for (let i = fx.length; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const [e, s] of fused) e.bind(s);
  }
}
const ac = (P: Pose) => P.accion;
export { FPS };
