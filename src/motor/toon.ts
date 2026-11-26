// Our own flat 2D cartoon cast (riflemen, officer, townsfolk, kid, parent) + 2D effects, drawn on a canvas.
// Construction v2 (characters.md, our own cast): superellipse heads (pointed crown 1.75 / full jaw 2.3, chin taper,
// seeded side bulge + tilt), bean torsos, single-stroke limbs with ink-dot hands, a thick-thin plum outline weighted
// away from the light, soft painted crescents, deadpan lidded eyes, no blush, no catchlights.
// Design space 600 x 1000 units (soles at y = 975); the canvas transform scales it.
export const INK = "#241726";
export const SKIN = "#ffe2c2";
const WHITE = "#ffffff";
const MOUTH = "#5a1e28";
const TONGUE = "#e86e78";
type C3 = [number, number, number];
const SH_SKIN: C3 = [0.96, 0.86, 0.84]; // measured shadow/lit ratio on skin heads
const SH_CLOTH: C3 = [0.64, 0.66, 0.74]; // torsos: lit side -> far side ~0.65
const SH_FELT: C3 = [0.62, 0.62, 0.7];

export type Build = "adult" | "stout" | "kid" | "baby" | "elder" | "thin" | "tall" | "teen" | "short";
export type Outfit = {
  jacket: string; pants: string; boots: string; hat?: string | null; belt?: string | null; buttons?: string; rifle?: boolean;
  sash?: string; cintura?: boolean; sword?: boolean; moustache?: string; skin?: string; head?: number; cap?: string; hair?: string; dress?: string;
  build?: Build;
  /** peinado (con hat "hair" o sin sombrero): liso, rizado, punta, mono, coleta, largo, calvo */
  pelo?: string;
  /** estampado de la ropa: liso, acolchado, rayas, cuadros, parches, chaleco, delantal, capa, tunica */
  patron?: string; patronCol?: string; barba?: string;
  /** rasgos de la cara: gafas, barba, pecas, mejillas, cejas, arrugas */
  rasgos?: string[];
  /** accesorios: corbata, pajarita, tirantes, bufanda, collar_perlas, aretes, guantes, reloj_bolsillo, placa, credencial_prensa,
   *  flor_solapa, cuello_blanco, brazalete, monoculo, ojeras, cicatriz, lunar, cigarrillo, pipa, bigote_fino, bigote_grueso, bigote_manubrio */
  acc?: string[];
  /** color de corbata, bufanda, lazo... */
  accCol?: string;
  /** estampado del vestido: liso, floreado, lunares, cuadros, rayas */
  estampado?: string;
  /** (interno) pelo dibujado debajo de un sombrero: sin flequillo */
  bajoSombrero?: boolean;
};
type P2 = [number, number];

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const mul = (c: string, m: C3) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v: number, k: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`;
};
export const shade = (c: string, k: number) => mul(c, [k, k, k]);
export const mix = (a: string, b: string, t: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** deterministic per-character random in [0, 1) */
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const rotPts = (pts: P2[], a: number, cx: number, cy: number): P2[] =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const rotAbout = (q: P2, a: number, c: P2): P2 => rotPts([q], a, c[0], c[1])[0];
const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** smooth curve from a through (near) k to b, as a polyline */
const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};

export const RIFLEMAN: Outfit = { jacket: "#357650", pants: "#3d4440", boots: INK, hat: "shako", belt: "#f1efe6", buttons: "#d9dde0", rifle: true };
export const OFFICER: Outfit = { ...RIFLEMAN, hat: "shako_tall", buttons: "#e8c45a", sash: "#c0353a", sword: true, moustache: "#4a3020", rifle: false, belt: null, build: "stout" };
export const KID: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid" };
export const PARENT: Outfit = { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a" };
export const SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];

export const soldier = (v = 0, extra: Partial<Outfit> = {}): Outfit => {
  const o: Outfit = { ...RIFLEMAN, skin: SKINS[v % 4] };
  if (v % 4 === 1) o.moustache = "#4a3426";
  if (v % 4 === 3) o.moustache = "#2a201a";
  return { ...o, ...extra };
};

export const townsfolk = (v = 0): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"];
  const o: Outfit = { jacket: coats[v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "tophat" };
};

export class Pen {
  g: CanvasRenderingContext2D;
  ol = 12;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot: number[] | null = null;
  constructor(g: CanvasRenderingContext2D) { this.g = g; }
  P(x: number, y: number): P2 {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts: P2[], close: boolean) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = this.P(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts: P2[], fill: string | null, ol?: number) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (w) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx: number, cy: number, rx: number, ry: number, fill: string | null, ol?: number, a0 = 0, a1 = 360, rot = 0) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol);
  }
  /** thick round-capped limb with an ink rim (effects, rope) */
  line(pts: P2[], fill: string, w: number, ink = true) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    if (ink) { this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * this.ol * 0.9; g.stroke(); }
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  stroke(pts: P2[], w: number, fill = INK) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, w: number, fill = INK) {
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + ((a1 - a0) * i) / 24)), cy + ry * Math.sin(rad(a0 + ((a1 - a0) * i) / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx: number, cy: number, r: number, fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath(); this.g.arc(x, y, r, 0, Math.PI * 2); this.g.fillStyle = fill; this.g.fill();
  }
  /** draw with a closed shape as clip */
  clip(pts: P2[], fn: () => void) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  Radial ramp centred `shift` R toward the light: flat out to ~0.6 R on the far side, full shadow by ~0.8 R. */
  shadedFill(pts: P2[], base: string, shadow: string, light: number, R: number, shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base); gr.addColorStop(r0 / r1, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts: P2[], base: string, shadow: string, light: number, flat = 0.22) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts: P2[], w0: number, thick: number, k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const out: P2[] = [], inn: P2[] = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0]; // outward normal for clockwise-on-screen contours
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r: P2[]) => { r.forEach(([x0, y0], i) => { const [x, y] = this.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.beginPath(); trace(out); trace(inn.reverse());
    g.fillStyle = col; g.fill("evenodd");
  }
  /** flat strap with a thin ink rim (cross belts, sash, rifle, handles) */
  band(pts: P2[], fill: string, w: number, rim: number, cap: CanvasLineCap = "butt") {
    const g = this.g; g.lineCap = cap; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * rim; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
    g.lineCap = "round";
  }
}

const ellPts = (cx: number, cy: number, rx: number, ry: number, a0 = 0, a1 = 360, rot = 0, n = 48): P2[] => {
  const r = rad(rot), pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};

const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 8): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};

/** tapered stroke, thick end at a: brows, moustache halves */
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};

// ---------------- contours ----------------
export type Blob = { a: number; b: number; nTop: number; nBot: number; egg: number; asym: number; rot: number; noise: number; seed: number };

/** superellipse "bean": separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 *  Points run right -> down -> left -> up (clockwise on screen). */
export const blobPts = (cx: number, cy: number, B: Blob, n = 72): P2[] => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/** measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 8 % bulge to the facing side */
export const headBlob = (seed: number, a = 118, facing = 0): Blob => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed,
});

/** thickest outline direction: away from the light, pulled toward the ground (64 deg measured for upper-left light) */
export const thickAngle = (light: number) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
const DEF_LIGHT = rad(-120);

// ---------------- faces ----------------
type ExprBase = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed"
  | "pained" | "smile" | "smile_closed" | "lick" | "angry" | "sad" | "scared" | "think" | "smug"
  | "tired" | "worried" | "suspicious" | "crying" | "shout" | "terrified" | "determined" | "asleep" | "confused" | "disgust" | "shy";
/** "<expresión>~" = la misma cara con la boca abierta (hablando) */
export type Expr = ExprBase | `${ExprBase}~`;
type EyeK = "dot" | "small" | "lid" | "slit" | "happy" | "dash" | "squeeze" | "shock" | "shockHalf" | "spiral" | "sleep";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "laugh" | "o" | "O" | "wave" | "teeth" | "lick" | "shout";
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), mouth kind; brow2 = cejas del otro lado (asimétricas) */
type Cara = { eye: [EyeK, EyeK]; brow: [number, number]; mouth: MouthK; brow2?: [number, number]; look?: number };
const BOCA_ABIERTA: Partial<Record<MouthK, MouthK>> = { smile: "grin", smirk: "grin", smileWide: "grin", grin: "grin", laugh: "laugh", O: "O", teeth: "teeth", shout: "shout" };
const cara = (e: Expr): Cara => {
  if (!e.endsWith("~")) return FACE[e as ExprBase];
  const F = FACE[e.slice(0, -1) as ExprBase] ?? FACE.neutral;
  return { ...F, mouth: BOCA_ABIERTA[F.mouth] ?? "o" };
};
const FACE: Record<ExprBase, Cara> = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  dazed: { eye: ["spiral", "spiral"], brow: [-3, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" },
  angry: { eye: ["lid", "lid"], brow: [7, -4], mouth: "teeth" },
  sad: { eye: ["dot", "dot"], brow: [-6, 4], mouth: "frown" },
  scared: { eye: ["shock", "shock"], brow: [-5, 1], mouth: "wave" },
  think: { eye: ["dot", "lid"], brow: [-4, 1], mouth: "dash" },
  smug: { eye: ["slit", "lid"], brow: [1, -5], mouth: "smirk" },
  tired: { eye: ["slit", "slit"], brow: [-1, 4], mouth: "dash" },
  worried: { eye: ["dot", "dot"], brow: [-7, 3], mouth: "wave" },
  suspicious: { eye: ["slit", "slit"], brow: [5, -1], mouth: "smirk", brow2: [-2, -4], look: 1 },
  crying: { eye: ["squeeze", "squeeze"], brow: [-7, 4], mouth: "frown" },
  shout: { eye: ["lid", "lid"], brow: [8, -4], mouth: "shout" },
  terrified: { eye: ["shock", "shock"], brow: [-8, -1], mouth: "teeth" },
  determined: { eye: ["lid", "lid"], brow: [5, -2], mouth: "dash" },
  asleep: { eye: ["sleep", "sleep"], brow: [0, 0], mouth: "o" },
  confused: { eye: ["dot", "small"], brow: [1, 1], mouth: "wave", brow2: [-6, -7] },
  disgust: { eye: ["slit", "lid"], brow: [6, -2], mouth: "frown", brow2: [2, -1] },
  shy: { eye: ["dot", "dot"], brow: [-4, 1], mouth: "smile", look: -1 },
};
const halfLid = (k: EyeK): EyeK => (k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k);
const eyeKind = (k: EyeK, lid: number): EyeK =>
  lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" && k !== "sleep" ? "dash" : lid > 0 ? halfLid(k) : k;
const lidOf = (b: boolean | number | undefined) => (b === true ? 1 : Number(b) || 0);

const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: number, skin: string) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  // ojo abierto: cuenca blanca con contorno, pupila que mira y párpado superior de piel (lid/slit = más cerrado)
  const abierto = (rx: number, ry: number, pr: number, tapa: number) => {
    const px = x + Math.max(-1, Math.min(1, look)) * (rx - pr - 0.8 * u);
    p.ell(x, ey, rx, ry, WHITE, 0);
    p.clip(Array.from({ length: 24 }, (_, k): P2 => [x + rx * Math.cos((k / 24) * Math.PI * 2), ey + ry * Math.sin((k / 24) * Math.PI * 2)]), () => {
      p.ell(px, ey + 0.6 * u, pr, pr * 1.08, INK, 0);
      if (tapa > 0) p.poly([[x - rx - u, ey - ry - u], [x + rx + u, ey - ry - u], [x + rx + u, ey - ry + tapa * 2 * ry], [x - rx - u, ey - ry + tapa * 2 * ry]], skin, 0);
    });
    p.ell(x, ey, rx, ry, null, 2.2 * u);
    if (tapa > 0) p.stroke([[x - rx - 0.8 * u, ey - ry + tapa * 2 * ry], [x + rx + 0.8 * u, ey - ry + tapa * 2 * ry]], 3.2 * u);
  };
  switch (kind) {
    case "dot": abierto(7.6 * u, 8.6 * u, 3.7 * u, 0); break;
    case "small": abierto(6.6 * u, 7.6 * u, 2.5 * u, 0); break;
    case "lid": abierto(8 * u, 7.6 * u, 3.6 * u, 0.32); break;
    case "slit": abierto(8 * u, 6.4 * u, 3.4 * u, 0.6); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw); break;
    case "sleep": p.arc(x, ey - 2 * u, 8 * u, 5 * u, 20, 160, lw); break;
    case "shock": case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      if (kind === "shockHalf") { p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360); p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u); }
      break;
    default: {
      const s: P2[] = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};

/** open "D" mouth with a white teeth band (+ tongue) */
const dmouth = (p: Pen, mx: number, y: number, rx: number, ry: number, u: number, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};

const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 12 * u * k, 8 * u, u); break;
    case "laugh": dmouth(p, mx, my, 16 * u * k, 11 * u, u, true); break;
    case "o": p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u); break;
    case "shout": dmouth(p, mx, my - 3 * u, 13 * u * k, 15 * u, u, true); break;
  }
};

/** bigote según el estilo (accesorio bigote_fino / bigote_grueso / bigote_manubrio; sin estilo = el clásico) */
const bigote = (p: Pen, mx: number, y: number, u: number, col: string, est: string, stout: boolean) => {
  for (const s of [-1, 1]) {
    if (est === "fino") taper(p, [mx + s * 1.5 * u, y + 0.5 * u], [mx + s * 13 * u, y], 2.6 * u, 1.2 * u, col);
    else if (est === "grueso") { taper(p, [mx + s * 1 * u, y - 0.5 * u], [mx + s * 17 * u, y + 4 * u], 8 * u, 3.5 * u, col); }
    else if (est === "manubrio") { p.stroke([[mx + s * 1.5 * u, y], [mx + s * 12 * u, y + 2 * u], [mx + s * 19 * u, y - 3 * u], [mx + s * 18 * u, y - 8 * u]], 3.6 * u, col); }
    else taper(p, [mx + s * 1.5 * u, y], [mx + s * (stout ? 19 : 15) * u, y + (stout ? -2 : 2.5) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, col);
  }
};

/** face v2 (front / 3-4). u = 1 % of the head path width W. Eyes 26u apart on the centre line, brows 20u up, mouth 20u
 *  down, everything slid toward the facing side. No blush, no catchlights. */
const faceFront = (p: Pen, cx: number, cy: number, W: number, expr: Expr, facing: number, look: number, lid: number, brim: boolean,
  skin: string, moustache?: string, stout = false, rasgos: string[] = [], pelo = "#4a3020") => {
  const u = W / 100, F = cara(expr), fx = cx + 7 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  const R = new Set(rasgos);
  if (F.look) look = F.look;
  const base = expr.replace("~", "");
  if (R.has("ojeras") || base === "tired") for (const s of [-1, 1]) p.arc(fx + s * ex, ey + 7 * u, 8 * u, 3 * u, 20, 160, 1.8 * u, "rgba(90,60,90,0.55)");
  if (base === "shy") for (const s of [-1, 1]) p.ell(fx + s * 22 * u, cy + 12 * u, 8 * u, 5 * u, "rgba(235,110,110,0.55)", 0);
  if (R.has("lunar")) p.dot(fx + 16 * u, cy + 15 * u, 1.6 * u, "#3a2418");
  if (R.has("cicatriz")) { p.stroke([[fx - 24 * u, cy - 6 * u], [fx - 16 * u, cy + 10 * u]], 1.6 * u, "#9a5a50"); for (let k = 0; k < 3; k++) p.stroke([[fx - 23 * u + k * 3 * u, cy - 1 * u + k * 4 * u], [fx - 18 * u + k * 3 * u, cy - 3 * u + k * 4 * u]], 1 * u, "#9a5a50"); }
  if (R.has("mejillas")) for (const s of [-1, 1]) p.ell(fx + s * 22 * u, cy + 12 * u, 7 * u, 4.5 * u, "rgba(240,120,120,0.45)", 0);
  if (R.has("pecas")) for (const s of [-1, 1]) for (let k = 0; k < 4; k++) p.dot(fx + s * (17 + (k % 2) * 6) * u, cy + (8 + Math.floor(k / 2) * 4 + (k % 2) * 2) * u, 1.3 * u, "#b8763e");
  const BARBA = R.has("barba") ? "larga" : R.has("barba_corta") ? "corta" : R.has("perilla") ? "perilla" : R.has("patillas") ? "patillas" : "";
  if (BARBA === "corta") { // barba de pocos días: puntitos que cubren mejillas y mentón y asoman por el borde
    // sombra azulada/parda de barba (dentro de la cara) + puntitos
    p.arc(fx, cy + 8 * u, 31 * u, 30 * u, 15, 165, 15 * u, mix(skin, pelo, 0.14));
    for (let i = 0; i < 70; i++) { const a = Math.PI * (0.08 + 0.84 * rnd(i, 61)), rr = (25 + rnd(i, 62) * 17) * u; p.dot(fx + Math.cos(a) * rr, cy + 8 * u + Math.sin(a) * rr * 0.9, (0.5 + rnd(i, 63) * 0.35) * u, mix(pelo, skin, 0.4)); }
  }
  if (BARBA === "larga" || BARBA === "perilla" || BARBA === "patillas") {
    const larga = BARBA === "larga", per = BARBA === "perilla", pat = BARBA === "patillas";
    const a0 = per ? 0.22 : -0.08, a1 = per ? 0.78 : 1.08, out: P2[] = [], inn: P2[] = [];
    for (let i = 0; i <= 36; i++) {
      const t = i / 36, a = Math.PI * (a0 + (a1 - a0) * t), sb = Math.sin(Math.max(0, a));
      if (pat && sb > 0.55) continue;
      const pico = i % 2 ? -3 : 3 + (i % 4 === 0 ? 3 : 0);
      const ro = (per ? 38 + 16 * sb : 52 + (larga ? 20 : 8) * sb * sb) + pico;             // sale del borde de la cara
      out.push([fx + Math.cos(a) * ro * u, cy + 4 * u + Math.sin(a) * ro * u]);
      const ri = per ? 24 : pat ? 44 : 42 - 17 * sb;
      inn.push([fx + Math.cos(a) * ri * u, cy + 4 * u + Math.sin(a) * ri * u * (per ? 0.8 : 1)]);
    }
    const bb = [...out, ...inn.reverse()];
    p.shadedFill(bb, pelo, shade(pelo, 0.7), DEF_LIGHT, 45 * u, 0.3);
    p.clip(bb, () => {
      for (let i = 0; i < 70; i++) {
        const a = Math.PI * (a0 + (a1 - a0) * rnd(i, 51)), rr = (26 + rnd(i, 52) * 40) * u, x = fx + Math.cos(a) * rr, y = cy + 4 * u + Math.sin(a) * rr;
        p.stroke([[x, y], [x + (rnd(i, 54) - 0.5) * 6 * u, y + (4 + rnd(i, 55) * 5) * u]], 1.3 * u, i % 3 ? shade(pelo, 0.55) : mix(pelo, "#ffffff", 0.3));
      }
    });
    p.poly(bb, null, 2.4 * u);
  }
  if (false) {
    const bb: P2[] = [];
    // barba con borde de mechones (picos) y textura de pelos rizados; nada de una mancha lisa
    for (let i = 0; i <= 30; i++) { const a = Math.PI * (0.06 + 0.88 * (i / 30)), k = i % 2 ? 27 : 32 + (i % 4 === 0 ? 3 : 0); bb.push([fx + Math.cos(a) * k * u, cy + 14 * u + Math.sin(a) * k * u]); }
    for (let i = 16; i >= 0; i--) { const a = Math.PI * (0.08 + 0.84 * (i / 16)); bb.push([fx + Math.cos(a) * 16 * u, cy + 16 * u + Math.sin(a) * 11 * u]); }
    p.poly(bb, pelo, 0);
    p.clip(bb, () => {
      for (let i = 0; i < 38; i++) {
        const a = Math.PI * (0.1 + 0.8 * rnd(i, 51)), rr = (17 + rnd(i, 52) * 13) * u, x = fx + Math.cos(a) * rr, y = cy + 15 * u + Math.sin(a) * rr;
        p.arc(x, y, 3.2 * u, 3 * u, rnd(i, 53) * 360, rnd(i, 53) * 360 + 240, 1.3 * u, i % 3 ? shade(pelo, 0.6) : mix(pelo, "#ffffff", 0.3));
      }
    });
    p.poly(bb, null, 2.2 * u);
  }
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey, u, side, look, skin);
    const [dI, dO] = F.brow2 && side > 0 ? F.brow2 : F.brow, by = ey - (brim ? 17 : 20) * u;
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], R.has("cejas") ? 8 * u : 5 * u, R.has("cejas") ? 4 * u : 2.5 * u, R.has("cejas") ? pelo : undefined);
    if (R.has("arrugas")) { p.stroke([[x + side * 13 * u, ey - 2 * u], [x + side * 17 * u, ey - 4 * u]], 1.4 * u); p.stroke([[x + side * 13 * u, ey + 2 * u], [x + side * 17 * u, ey + 4 * u]], 1.4 * u); }
    if (R.has("gafas")) p.ell(x, ey, 10.5 * u, 9.5 * u, null, 2.6 * u);
    if (R.has("monoculo") && side > 0) { p.ell(x, ey, 11 * u, 11 * u, null, 2.4 * u); p.stroke([[x + 10 * u, ey + 5 * u], [x + 16 * u, ey + 34 * u]], 0.9 * u, "#c9a03a"); }
    if (base === "crying") { p.stroke([[x - side * 2 * u, ey + 6 * u], [x - side * 3 * u, ey + 22 * u]], 3.4 * u, "#8fc8f0"); p.ell(x - side * 3 * u, ey + 26 * u, 2.6 * u, 3.6 * u, "#8fc8f0", 0); }
  }
  if (R.has("gafas")) p.stroke([[fx - ex + 10.5 * u, ey - u], [fx + ex - 10.5 * u, ey - u]], 2.4 * u);
  const mx = cx + 8 * u * facing, my = cy + 20 * u;
  mouth(p, F.mouth, mx, my, u);
  const estB = R.has("bigote_fino") ? "fino" : R.has("bigote_grueso") ? "grueso" : R.has("bigote_manubrio") ? "manubrio" : "";
  if (moustache) bigote(p, mx, cy + 13 * u, u, moustache, estB, stout);
  if (R.has("cigarrillo")) { const s = facing || 1; p.band([[mx + s * 6 * u, my + u], [mx + s * 22 * u, my + 4 * u]], "#f4f1ea", 2.6 * u, 0.8 * u); p.dot(mx + s * 22 * u, my + 4 * u, 1.8 * u, "#e2603a");
    for (let k = 0; k < 3; k++) p.arc(mx + s * (24 + k * 2) * u, my - (4 + k * 8) * u, 3 * u, 4 * u, 90 + k * 60, 260 + k * 60, 1.2 * u, "rgba(200,200,205,0.7)"); }
  if (R.has("pipa")) { const s = facing || 1; p.band([[mx + s * 4 * u, my + 1 * u], [mx + s * 18 * u, my + 6 * u]], "#3a2418", 2.4 * u, 0.8 * u); p.poly([[mx + s * 16 * u, my + 2 * u], [mx + s * 24 * u, my + 2 * u], [mx + s * 23 * u, my + 13 * u], [mx + s * 17 * u, my + 13 * u]], "#6a3e22", 1.4 * u); }
  if (expr === "nervous" || base === "worried" || base === "terrified") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

/** profile face (facing screen-right): one eye, brow, nose tick, mouth near the front edge; no skin bump nose, no ear */
const faceSide = (p: Pen, hx: number, hy: number, W: number, expr: Expr, lid: number, brim: boolean, skin: string, moustache?: string, stout = false) => {
  const u = W / 100, F = cara(expr), ex = hx + 27 * u, ey = hy;
  const kind = eyeKind(F.eye[1], lid);
  eye(p, kind, ex, ey, u, 1, 0.6, skin);
  const by = ey - (brim ? 17 : 20) * u, [dI, dO] = F.brow;
  if (kind === "shock" || kind === "shockHalf") p.arc(ex, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else taper(p, [ex + 8 * u, by + dI * u], [ex - 7 * u, by - u + dO * u], 5 * u, 2.5 * u);
  p.stroke([[hx + 44 * u, hy + 4 * u], [hx + 47.5 * u, hy + 9 * u], [hx + 43 * u, hy + 10 * u]], 3 * u);
  mouth(p, F.mouth, hx + 33 * u, hy + 21 * u, u, 0.62);
  if (expr.startsWith("crying")) p.stroke([[ex - 2 * u, ey + 6 * u], [ex - 3 * u, ey + 22 * u]], 3.4 * u, "#8fc8f0");
  if (moustache) taper(p, [hx + 41 * u, hy + 13.5 * u], [hx + 25 * u, hy + (stout ? 11.5 : 16) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(hx - 30 * u, hy - 24 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

// ---------------- hats ----------------
const BONNET = "#e9cf8f", BONNET_BRIM = "#d6b46a";
/** parts of a hat that sit behind the head (bonnet) */
/** sombreros que dejan ver el pelo por debajo del ala (fracción de HH bajo la coronilla donde termina el sombrero) */
const ALA: Record<string, number> = { fedora: 0.2, gorra_policia: 0.27, cap: 0.3, bombin: 0.22, gorra_plana: 0.28, boina: 0.16, paja: 0.24, pamela: 0.24,
  tophat: 0.22, sombrero_vaquero: 0.2, gorro_marinero: 0.28, cloche: 0.38, gorro_lana: 0.36, gorro_chef: 0.22, cofia: 0, cinta: 0, lazo: 0, diadema: 0, velo: 0, corona: 0 };
/** peinados que caen por detrás de la cabeza (se ven aunque lleve sombrero) */
const ATRAS = new Set(["largo", "coleta", "melena", "trenzas", "moño_bajo", "cola_alta", "ondulado_largo"]);
const hatBehind = (p: Pen, o: Outfit, H: Blob, cx: number, hc: number, light: number, thick: number, ow: number, side: boolean) => {
  const pelo = o.pelo ?? "liso", hcol = o.hair ?? "#4a3020";
  // pelo que cae por detrás: largo, melena, coleta, trenzas, moño bajo, cola alta (con o sin sombrero, salvo los que tapan todo)
  if (ATRAS.has(pelo) && o.hat !== "hair" && o.hat !== "casco" && o.hat !== "casco_pluma" && o.hat !== "capucha" && o.hat !== "casco_aviador" && o.hat !== "gorro_bebe") {
    hatBehind(p, { ...o, hat: "hair" }, H, cx, hc, light, thick, ow, side);
  }
  if (o.hat === "hair" && (pelo === "melena" || pelo === "trenzas" || pelo === "moño_bajo" || pelo === "cola_alta" || pelo === "ondulado_largo")) {
    const k = side ? -1 : 1;
    if (pelo === "ondulado_largo") { // dos mechones ondulados que caen a los costados del cuello hasta los hombros (no una masa bajo el mentón)
      const top = blobPts(cx - (side ? 10 : 0) * (H.a / 50), hc - 0.05 * H.b, { ...H, a: H.a * 1.14, b: H.b * 1.05, asym: 0, seed: H.seed + 5 });
      p.shadedFill(top, hcol, mul(hcol, SH_FELT), light, H.a); p.inkRing(top, ow * 0.9, thick);
      for (const s of side ? [-1] : [-1, 1]) {
        const pts: P2[] = [[cx + s * 0.62 * H.a, hc - 0.2 * H.b]];
        for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([cx + s * (1.08 + 0.1 * Math.sin(t * 9)) * H.a, hc + (-0.2 + 1.55 * t) * H.b]); }
        pts.push([cx + s * 0.78 * H.a, hc + 1.4 * H.b], [cx + s * 0.7 * H.a, hc + 0.6 * H.b]);
        p.shadedFill(pts, hcol, mul(hcol, SH_FELT), light, H.a * 0.6); p.poly(pts, null, ow * 0.85);
        for (let j = 0; j < 3; j++) p.arc(cx + s * 0.9 * H.a, hc + (0.3 + j * 0.35) * H.b, 0.12 * H.a, 0.1 * H.b, s > 0 ? 90 : -90, s > 0 ? 270 : 90, 1.6, shade(hcol, 0.6));
      }
    } else if (pelo === "melena") {
      const lb = blobPts(cx - (side ? 10 : 0) * (H.a / 50), hc + (pelo === "melena" ? 0.12 : 0.3) * H.b, { ...H, a: H.a * 1.16, b: H.b * (pelo === "melena" ? 1.02 : 1.24), asym: 0, egg: 0.05, seed: H.seed + 5 });
      p.shadedFill(lb, hcol, mul(hcol, SH_FELT), light, H.a); p.inkRing(lb, ow * 0.9, thick);
    } else if (pelo === "trenzas") {
      for (const s of side ? [-1] : [-1, 1]) { let y = hc + 0.1 * H.b; const x0 = cx + s * 0.86 * H.a;
        for (let i = 0; i < 7; i++) { p.ell(x0 + s * i * 0.02 * H.a, y, 0.13 * H.a, 0.12 * H.b, hcol, ow * 0.7); y += 0.2 * H.b; }
        p.ell(x0 + s * 0.15 * H.a, y - 0.05 * H.b, 0.09 * H.a, 0.06 * H.b, o.accCol ?? "#c0353a", ow * 0.6); }
    } else if (pelo === "moño_bajo") {
      p.ell(cx + k * 0.82 * H.a, hc + 0.42 * H.b, 0.26 * H.a, 0.22 * H.a, hcol, ow * 0.9);
    } else if (pelo === "cola_alta") {
      const pts: P2[] = [[cx + k * 0.2 * H.a, hc - 0.95 * H.b], [cx + k * 0.75 * H.a, hc - 1.05 * H.b], [cx + k * 1.18 * H.a, hc - 0.3 * H.b], [cx + k * 1.12 * H.a, hc + 0.5 * H.b], [cx + k * 0.95 * H.a, hc + 0.1 * H.b], [cx + k * 0.6 * H.a, hc - 0.6 * H.b]];
      p.shadedFill(pts, hcol, mul(hcol, SH_FELT), light, H.a * 0.6); p.poly(pts, null, ow * 0.9);
      p.ell(cx + k * 0.42 * H.a, hc - 0.92 * H.b, 0.08 * H.a, 0.07 * H.a, o.accCol ?? "#c0353a", ow * 0.6);
    }
    return;
  }
  if (o.hat === "capucha") {
    const col = o.cap ?? "#6b5a48", pts: P2[] = [];
    for (let i = 0; i <= 40; i++) { const a = Math.PI * 0.85 + (i / 40) * Math.PI * 1.3, r = 1.3 + (Math.abs(i - 20) < 3 ? 0.18 * (1 - Math.abs(i - 20) / 3) : 0);
      pts.push([cx - (side ? 8 : 0) * (H.a / 50) + Math.cos(a) * H.a * r, hc - 0.05 * H.b + Math.sin(a) * H.b * (a > Math.PI * 1.2 && a < Math.PI * 1.8 ? r * 1.05 : 1.15)]); }
    pts.push([cx + H.a * 1.05, hc + H.b * 1.25], [cx - H.a * 1.05, hc + H.b * 1.25]);
    p.shadedFill(pts, col, mul(col, SH_FELT), light, H.a * 1.3); p.inkRing(pts, ow * 0.9, thick);
    return;
  }
  if (o.hat === "gorro_bebe") { // gorrito de bebé: tejido que cubre la nuca, con cintas
    const col = o.cap ?? "#f2e6d0", bb = blobPts(cx - (side ? 8 : 0) * (H.a / 50), hc + 0.05 * H.b, { ...H, a: H.a * 1.12, b: H.b * 1.08, asym: 0, seed: H.seed + 4 });
    p.shadedFill(bb, col, mul(col, SH_CLOTH), light, H.a * 1.12); p.inkRing(bb, ow * 0.85, thick); return;
  }
  if (o.hat === "casco_aviador") {
    const col = o.cap ?? "#6a4428", bb = blobPts(cx - (side ? 8 : 0) * (H.a / 50), hc + 0.08 * H.b, { ...H, a: H.a * 1.1, b: H.b * 1.1, asym: 0, seed: H.seed + 4 });
    p.shadedFill(bb, col, mul(col, SH_FELT), light, H.a * 1.1); p.inkRing(bb, ow * 0.85, thick); return;
  }
  if (o.hat === "hair" && (o.pelo === "largo" || o.pelo === "coleta")) {
    const col = o.hair ?? "#4a3020";
    if (o.pelo === "largo") {
      const lb = blobPts(cx - (side ? 10 : 0) * (H.a / 50), hc + 0.28 * H.b, { ...H, a: H.a * 1.12, b: H.b * 1.22, asym: 0, egg: -0.1, seed: H.seed + 5 });
      p.shadedFill(lb, col, mul(col, SH_FELT), light, H.a); p.inkRing(lb, ow * 0.9, thick);
    } else {
      const k = side ? -1 : 1, px = cx + k * H.a * 0.92, py = hc - 0.1 * H.b;
      p.ell(px, py, H.a * 0.28, H.b * 0.42, col, ow * 0.9, 0, 360, k * 25);
      p.ell(px + k * H.a * 0.18, py + H.b * 0.42, H.a * 0.2, H.b * 0.34, col, ow * 0.9, 0, 360, k * 10);
    }
    return;
  }
  if (o.hat !== "bonnet") return;
  const bb = blobPts(cx - (side ? 12 : 0) * (H.a / 50), hc - 0.07 * 2 * H.b, { ...H, a: H.a * 1.17, b: H.b * 1.13, asym: 0, egg: 0.04, seed: H.seed + 3 });
  p.shadedFill(bb, BONNET, mul(BONNET, SH_CLOTH), light, H.a * 1.17);
  p.inkRing(bb, ow * 0.85, thick);
};

const hatOn = (p: Pen, o: Outfit, hp: P2[], H: Blob, cx: number, hc: number, light: number, seed: number, facing: number, side: boolean) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5)); // tilt with the head, +-2 deg extra
  const R = (pts: P2[]) => rotPts(pts, a, cx, hc);
  const sag = (yb: number, wb: number): P2[] => {
    const base: P2[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; base.push([cx + wb * (2 * t - 1), yb + 3 * u * (1 - (2 * t - 1) ** 2)]); }
    return base;
  };
  // el pelo se ve debajo del sombrero (frente y sienes) o entero bajo cofias, cintas y lazos
  const pelo0 = o.pelo ?? "liso";
  if (o.hat && o.hat in ALA && pelo0 !== "calvo") {
    const yb = crown + ALA[o.hat] * HH;
    if (ALA[o.hat] === 0) hatOn(p, { ...o, hat: "hair" }, hp, H, cx, hc, light, seed, facing, side);
    else if (pelo0 !== "rapado") p.clip(R([[cx - 2 * W, yb], [cx + 2 * W, yb], [cx + 2 * W, hc + H.b], [cx - 2 * W, hc + H.b]]), () => hatOn(p, { ...o, hat: "hair", bajoSombrero: true }, hp, H, cx, hc, light, seed, facing, side));
  }
  if (o.hat === "shako" || o.hat === "shako_tall") {
    const tall = o.hat === "shako_tall", yb = crown + 0.25 * HH, ht = (tall ? 0.66 : 0.56) * HH, wb = 46 * u, wt = 52 * u;
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, "#3a3d47", "#24262d", light, wt, 0.4);
    if (tall) p.clip(body, () => p.band(R([[cx - wt - 5 * u, yb - ht + 0.07 * HH], [cx + wt + 5 * u, yb - ht + 0.07 * HH]]), "#e8c45a", 0.06 * HH, 1.5 * u));
    p.poly(body, null, ow);
    const deg = (a * 180) / Math.PI;
    if (side) {
      p.poly(R([[cx + 36 * u, yb - 1 * u], [cx + 60 * u, yb + 8 * u], [cx + 34 * u, yb + 6 * u]]), "#16171b", 2.5 * u);
      const [tx, ty] = R([[cx + 24 * u, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    } else {
      const [px, py] = R([[cx + 3 * u * facing, yb + 3 * u]])[0];
      p.ell(px, py, 34 * u, 0.045 * HH, "#16171b", 2.5 * u, 0, 180, deg); // peak
      const [bx, by] = R([[cx, yb - 0.45 * ht]])[0];
      p.ell(bx, by, 7 * u, 6 * u, tall ? "#e8c45a" : "#c9ccd2", 2 * u, 0, 360, deg); // badge plate
      p.arc(bx, by, 3.5 * u, 2.8 * u, 200, 500, 1.6 * u);
      const [tx, ty] = R([[cx, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u); // green tuft
    }
  } else if (o.hat === "cap" || o.hat === "hair") {
    const est0 = o.hat === "hair" ? o.pelo ?? "liso" : "";
    const CUT: Record<string, number> = { engominado: 0.36, rapado: 0.33, flequillo: 0.52, recogido: 0.38, mono: 0.38, coleta: 0.4, trenzas: 0.4, moño_bajo: 0.38, cola_alta: 0.38, afro: 0.46, ondulado: 0.44, ondulado_largo: 0.44, melena: 0.46, pelusa: 0.2 };
    const cut = crown + (o.hat === "cap" ? 0.3 : CUT[est0] ?? 0.42) * HH;
    const keep = (x: number, y: number) => y < cut || (side && o.hat === "hair" && x < cx - 6 * u && y < hc + 0.42 * H.b);
    // start the arc at the first kept point after a dropped one, so the kept run is contiguous and the cut closes it
    const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y))
      .map(([x, y]) => { const k = o.hat !== "hair" ? 1.03 : o.pelo === "afro" ? 1.34 : o.pelo === "rizado" ? 1.17 : o.pelo === "calvo" || o.pelo === "rapado" || o.pelo === "pelusa" ? 1.0 : o.pelo === "engominado" ? 1.05 : 1.1; return [cx + (x - cx) * k, hc + (y - hc) * k] as P2; });
    if (arc.length < 3) return;
    if (o.hat === "hair") { // scalloped lower edge
      const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
      for (let i = 1; i < 6; i++) arc.push([x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6 + (i % 2 ? 4 * u : 0)]);
    }
    const col = o.hat === "cap" ? o.cap! : o.hair!;
    const est = o.hat === "hair" ? o.pelo ?? "liso" : "";
    if (est === "pelusa") { // bebé: unos rulitos sueltos en la coronilla
      for (let i = 0; i < 4; i++) p.arc(cx - 12 * u + i * 8 * u, crown + 4 * u, 4 * u, 4 * u, 180 + i * 20, 420 + i * 20, 1.8 * u, shade(col, 0.8));
      return;
    }
    if (est === "rapado") { // rapado: sombra de pelo cortísimo, sin mechones
      p.poly(arc, mix(col, o.skin ?? SKIN, 0.45), 0);
      p.clip(arc, () => { for (let i = 0; i < 120; i++) p.dot(cx + (rnd(seed + i, 70) - 0.5) * 2 * H.a, crown + rnd(seed + i, 71) * (cut - crown), 0.9 * u, shade(col, 0.8)); });
      return;
    }
    if (est === "calvo") { // calvo: solo mechones a los lados y un brillo
      for (const s of [-1, 1]) p.ell(cx + s * H.a * 0.9, hc - 0.05 * H.b, 7 * u, 13 * u, col, 2 * u);
      p.ell(cx - 0.3 * H.a, crown + 0.22 * HH, 9 * u, 4 * u, "rgba(255,255,255,0.35)", 0, 0, 360, -20);
      return;
    }
    if (est === "mono") { const [bx, by] = [cx, crown - 6 * u]; p.ell(bx, by, 17 * u, 14 * u, col, ow); p.stroke([[bx - 8 * u, by - 2 * u], [bx + 6 * u, by + 4 * u]], 1.3 * u, shade(col, 0.7)); }
    p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
    // textura de mechones
    // textura de pelo: muchos mechones curvos que nacen de la raya y caen hacia los lados, oscuros y claros,
    // más un brillo ancho (como el pelo de trazo de la referencia)
    if (o.hat === "hair") p.clip(arc, () => {
      const raya = cx + (rnd(seed, 40) - 0.5) * 30 * u, rizo = est === "rizado";
      p.arc(cx - 0.15 * H.a, crown + 0.16 * HH, 0.55 * H.a, 0.1 * HH, 200, 330, 7 * u, mix(col, "#ffffff", 0.22));
      for (let i = 0; i < 46; i++) {
        const t = rnd(seed + i, 41), x0 = raya + (t - 0.5) * 2.1 * H.a, y0 = crown - 2 * u + rnd(seed + i, 42) * (cut - crown) * 0.75;
        const dir = x0 >= raya ? 1 : -1, L = (10 + rnd(seed + i, 43) * 12) * u, osc = rnd(seed + i, 44) < 0.62;
        const c2 = osc ? shade(col, 0.62 + rnd(seed + i, 45) * 0.12) : mix(col, "#ffffff", 0.18 + rnd(seed + i, 46) * 0.12);
        if (rizo) p.arc(x0, y0, 5 * u, 4.5 * u, rnd(seed + i, 47) * 360, rnd(seed + i, 47) * 360 + 260, 1.6 * u, c2);
        else p.stroke([[x0, y0], [x0 + dir * L * 0.35, y0 + L * 0.45], [x0 + dir * L * 0.55, y0 + L]], (1.2 + rnd(seed + i, 48) * 0.8) * u, c2);
      }
    });
    if (o.hat === "hair") p.clip(arc, () => {
      if (est === "engominado") { // peinado hacia atrás con gomina: líneas de peine y brillo fuerte
        for (let k = 0; k < 9; k++) p.arc(cx, cut + 6 * u, (0.25 + k * 0.1) * H.a, (cut - crown) * (0.4 + k * 0.07), 200, 340, 1.4 * u, shade(col, 0.55));
        p.arc(cx - 0.1 * H.a, crown + 0.12 * HH, 0.5 * H.a, 0.08 * HH, 200, 320, 9 * u, mix(col, "#ffffff", 0.45));
      } else if (est === "ondulado" || est === "ondulado_largo") { // ondas al agua de los años 30
        for (let j = 0; j < 4; j++) { const y = crown + (0.08 + j * 0.08) * HH, s: P2[] = []; for (let i = 0; i <= 18; i++) s.push([cx - 1.1 * H.a + i * 0.125 * H.a, y + 5 * u * Math.sin(i * 1.1 + j * 1.6)]); p.stroke(s, 2.2 * u, shade(col, 0.58)); }
      } else if (est === "raya_lado") { const rx = cx - 0.38 * H.a * (facing || 1); p.stroke([[rx, crown + 2 * u], [rx + 4 * u, cut - 14 * u]], 1.8 * u, shade(col, 0.5)); }
    });
    if (o.hat === "hair" && est === "entradas" && !side) for (const s of [-1, 1]) p.poly([[cx + s * 0.18 * H.a, cut + 2 * u], [cx + s * 0.62 * H.a, cut + 2 * u], [cx + s * 0.4 * H.a, cut - 0.14 * HH]], o.skin ?? SKIN, 0);
    if (o.hat === "hair" && est === "raya_lado" && !side) { const s = -(facing || 1); p.poly([[cx + s * 0.4 * H.a, cut - 0.2 * HH], [cx - s * 0.55 * H.a, cut - 0.06 * HH], [cx - s * 0.62 * H.a, cut + 6 * u], [cx - s * 0.1 * H.a, cut - 0.03 * HH]], col, 1.6 * u); }
    if (o.hat === "hair" && est === "flequillo" && !side) { const fl: P2[] = []; for (let i = 0; i <= 10; i++) fl.push([cx - 0.62 * H.a + i * 0.124 * H.a, cut + (i % 2 ? 2 : -1) * u]); fl.push([cx + 0.6 * H.a, cut - 0.16 * HH], [cx - 0.6 * H.a, cut - 0.16 * HH]); p.poly(fl, col, 1.6 * u); }
    const sinFleq = o.bajoSombrero || ["engominado", "raya_lado", "flequillo", "recogido", "mono", "coleta", "trenzas", "moño_bajo", "cola_alta", "ondulado", "ondulado_largo", "entradas", "afro"].includes(est);
    // flequillo: puntas sueltas que bajan del borde del pelo (rompe el borde liso de casco)
    if (o.hat === "hair" && est !== "rizado" && !side && !sinFleq) for (let i = 0; i < 7; i++) {
      const x = cx - 0.55 * H.a + (i / 6) * 1.1 * H.a, y = cut - 1 * u, l = (5 + rnd(seed + i, 49) * 6) * u, dx = (rnd(seed + i, 50) - 0.5) * 6 * u;
      p.poly([[x - 4 * u, y - 2 * u], [x + 4 * u, y - 2 * u], [x + dx, y + l]], col, 1.6 * u);
    }
    p.poly(arc, null, ow);
    if (est === "rizado" || est === "afro") { // rulos: bolitas con ink en todo el borde superior (el pelo de trazo rizado de la referencia)
      for (let i = 0; i < arc.length; i += 3) { const [x, y] = arc[i]; if (y > cut - 2 * u) continue; p.ell(x, y, 8 * u, 7.5 * u, col, 2.2 * u); p.arc(x, y + u, 3.5 * u, 3 * u, 30, 300, 1.2 * u, shade(col, 0.6)); }
    } else if (est === "punta") {
      for (let i = 2; i < arc.length - 2; i += 4) { const [x, y] = arc[i]; if (y > cut - 6 * u) continue; const nx = (x - cx) / H.a, ny = (y - hc) / H.b, L = Math.hypot(nx, ny) || 1;
        p.poly([[x - 6 * u * ny / L, y + 6 * u * nx / L], [x + 14 * u * nx / L, y + 14 * u * ny / L], [x + 6 * u * ny / L, y - 6 * u * nx / L]], col, 2 * u); }
    }
    if (o.hat === "hair" && est !== "engominado" && est !== "ondulado" && est !== "ondulado_largo") {
      const s = side ? -1 : facing || 1;
      p.stroke([[cx + s * 10 * u, cut - 30 * u], [cx + s * 2 * u, cut - 12 * u]], 1.2 * u);
    }
    if (o.hat === "cap") {
      const deg = (a * 180) / Math.PI;
      if (side) p.poly(R([[cx + 40 * u, cut - 2 * u], [cx + 74 * u, cut + 4 * u], [cx + 40 * u, cut + 6 * u]]), shade(col, 0.8), ow);
      else {
        const s = facing || (rnd(seed, 21) < 0.5 ? -1 : 1), [px, py] = R([[cx + s * 4 * u, cut + 1.5 * u]])[0];
        p.ell(px, py, 32 * u, 0.06 * HH, shade(col, 0.8), ow, 0, 180, deg);
      }
    }
  } else if (o.hat === "tophat") {
    const yb = crown + 0.22 * HH, ht = 0.8 * HH, wb = 0.31 * W, wt = 0.33 * W, col = "#2e2a36";
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.13 * HH], [cx + wt + 4 * u, yb - 0.13 * HH]]), shade(o.jacket, 0.9), 0.14 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.45 * W, 0.05 * HH, "#1d1b22", ow, 0, 360, (a * 180) / Math.PI);
  } else if (o.hat === "casco" || o.hat === "casco_pluma") {
    // casco de hierro (como los soldados de la referencia): cúpula con brillo, aro con remaches, nasal y punta o penacho
    const cyD = crown + 0.36 * HH, rx = 0.57 * W, ry = 0.46 * HH, dome: P2[] = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; dome.push([cx + Math.cos(a) * rx, cyD + Math.sin(a) * ry]); }
    const D = R(dome); p.shadedFill(D, "#a9b0ba", "#5c6470", light, rx, 0.35); p.poly(D, null, ow);
    p.arc(...R([[cx - 0.18 * W, cyD - 0.25 * HH]])[0], 0.12 * W, 0.08 * HH, 200, 300, 3.2 * u, "#eef2f6");
    const aro = R([[cx - rx - 2 * u, cyD - 3 * u], [cx + rx + 2 * u, cyD - 3 * u], [cx + rx + 2 * u, cyD + 6 * u], [cx - rx - 2 * u, cyD + 6 * u]]);
    p.poly(aro, "#7d848f", 2.4 * u);
    for (let k = -4; k <= 4; k++) p.dot(...R([[cx + k * 0.12 * W, cyD + 1.5 * u]])[0], 1.6 * u, "#d9dde2");
    if (!side) { const nas = R([[cx + facing * 6 * u - 3 * u, cyD + 6 * u], [cx + facing * 6 * u + 3 * u, cyD + 6 * u], [cx + facing * 6 * u + 2.5 * u, cyD + 0.32 * HH], [cx + facing * 6 * u - 2.5 * u, cyD + 0.32 * HH]]); p.poly(nas, "#8d949e", 2 * u); }
    if (o.hat === "casco_pluma") { // penacho de crin
      const pl: P2[] = []; for (let i = 0; i <= 14; i++) { const t = i / 14, a = Math.PI * (1.05 + 0.9 * t); pl.push([cx + Math.cos(a) * 0.32 * W, crown - 0.02 * HH + Math.sin(a) * 0.42 * HH + (i % 2) * 3 * u]); }
      pl.push([cx + 0.1 * W, crown + 0.02 * HH], [cx - 0.1 * W, crown + 0.02 * HH]);
      const Pl = R(pl); p.shadedFill(Pl, o.cap ?? "#c0353a", mul(o.cap ?? "#c0353a", SH_FELT), light, 0.3 * W); p.poly(Pl, null, ow * 0.8);
    } else { const [tx, ty] = R([[cx, cyD - ry - 6 * u]])[0]; p.poly([[tx - 4 * u, ty + 7 * u], [tx + 4 * u, ty + 7 * u], [tx, ty - 7 * u]], "#9aa1aa", 2 * u); }
  } else if (o.hat === "corona") {
    const yb = crown + 0.2 * HH, w = 0.36 * W, h = 0.3 * HH, pts: P2[] = [[cx - w, yb]];
    for (let k = 0; k <= 4; k++) { const x = cx - w + (k / 4) * 2 * w; pts.push([x, yb - h - (k % 2 ? -0.1 * HH : 0)]); if (k < 4) pts.push([x + w / 4, yb - 0.45 * h]); }
    pts.push([cx + w, yb]);
    const Cr = R(pts); p.shadedFill(Cr, "#f2c84b", "#c08a1e", light, w); p.poly(Cr, null, ow);
    for (let k = 0; k < 3; k++) p.ell(...R([[cx - w * 0.55 + k * w * 0.55, yb - 0.25 * h]])[0], 3.6 * u, 3.6 * u, ["#d8443a", "#3f6fb5", "#2f7a5a"][k], 1.4 * u);
  } else if (o.hat === "capucha") {
    const col = o.cap ?? "#6b5a48", ox = cx + (side ? 6 * u : 0);
    p.arc(ox, hc + 0.04 * HH, 0.5 * W, 0.5 * HH, 165, 375, 16 * u, col);                       // borde grueso que enmarca la cara
    p.arc(ox, hc + 0.04 * HH, 0.5 * W + 8 * u, 0.5 * HH + 8 * u, 165, 375, 1.6 * u);
    p.arc(ox, hc + 0.04 * HH, 0.5 * W - 8 * u, 0.5 * HH - 8 * u, 170, 370, 1.6 * u, shade(col, 0.55));
    for (let k = 0; k < 5; k++) { const a = Math.PI * (1.15 + k * 0.17); p.stroke([[ox + Math.cos(a) * 0.5 * W, hc + 0.04 * HH + Math.sin(a) * 0.5 * HH], [ox + Math.cos(a) * 0.58 * W, hc + 0.04 * HH + Math.sin(a) * 0.58 * HH]], 1.2 * u, shade(col, 0.6)); }
  } else if (o.hat === "cinta") {
    const yb = crown + 0.3 * HH, col = o.cap ?? "#f4ecd8";
    p.clip(hp, () => p.band(R([[cx - W, yb], [cx + W, yb - 3 * u]]), col, 9 * u, 1.6 * u));
    const s2 = side ? -1 : -(facing || 1), [kx, ky] = R([[cx + s2 * 0.5 * W, yb]])[0];
    p.poly([[kx, ky], [kx + s2 * 16 * u, ky + 10 * u], [kx + s2 * 12 * u, ky + 14 * u]], col, 1.6 * u);
    p.poly([[kx, ky], [kx + s2 * 18 * u, ky - 2 * u], [kx + s2 * 17 * u, ky + 5 * u]], col, 1.6 * u);
  } else if (o.hat === "paja") {
    const yb = crown + 0.24 * HH, col = "#e2c068", deg = (a * 180) / Math.PI;
    const [bx, by] = R([[cx, yb]])[0];
    p.ell(bx, by, 0.78 * W, 0.08 * HH, col, ow, 0, 360, deg);
    const cr = R([[cx - 0.36 * W, yb], [cx - 0.3 * W, yb - 0.24 * HH], [cx + 0.3 * W, yb - 0.24 * HH], [cx + 0.36 * W, yb]]);
    p.shadedFill(cr, col, "#b08a3a", light, 0.36 * W); p.poly(cr, null, ow);
    p.clip(cr, () => p.band(R([[cx - W, yb - 0.06 * HH], [cx + W, yb - 0.06 * HH]]), o.cap ?? "#a8433a", 0.06 * HH, 0));
    for (let k = -5; k <= 5; k++) p.stroke(R([[cx + k * 0.06 * W, yb - 0.2 * HH], [cx + k * 0.062 * W, yb - 0.02 * HH]]), 1 * u, "#b08a3a");
  } else if (o.hat === "boina") {
    const col = o.cap ?? "#3a3d47", deg = (a * 180) / Math.PI + (side ? 0 : -8);
    const [bx, by] = R([[cx + (side ? 4 : -6) * u, crown + 0.1 * HH]])[0];
    p.ell(bx, by, 0.6 * W, 0.17 * HH, col, ow, 0, 360, deg);
    p.ell(bx + 4 * u, by - 0.15 * HH, 3 * u, 4 * u, col, 1.6 * u);
  } else if (o.hat === "panuelo") {
    const col = o.cap ?? "#c25a5a", cut = crown + 0.36 * HH;
    const n = hp.length, arc2 = hp.filter(([, y]) => y < cut).map(([x, y]) => [cx + (x - cx) * 1.06, hc + (y - hc) * 1.06] as P2);
    if (arc2.length > 3) { p.shadedFill(arc2, col, mul(col, SH_FELT), light, H.a); p.clip(arc2, () => { for (let k = 0; k < 14; k++) p.dot(cx - H.a + (k % 7) * 0.3 * H.a, crown + 0.1 * HH + Math.floor(k / 7) * 0.12 * HH, 2.2 * u, "#f4ecd8"); }); p.poly(arc2, null, ow); }
    const s2 = side ? -1 : -(facing || 1), [kx, ky] = R([[cx + s2 * 0.48 * W, cut - 4 * u]])[0];
    p.poly([[kx, ky], [kx + s2 * 14 * u, ky + 14 * u], [kx + s2 * 6 * u, ky + 18 * u]], col, 1.6 * u); void n;
  } else if (o.hat === "fedora") {
    // sombrero de fieltro de los años 30: copa con hendidura y pellizcos, cinta oscura y ala
    const col = o.cap ?? "#3b3530", yb = crown + 0.2 * HH, ht = 0.34 * HH, wb = 0.36 * W, wt = 0.3 * W, deg = (a * 180) / Math.PI;
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.66 * W, 0.075 * HH, shade(col, 0.82), ow, 0, 360, deg);
    const cr = R([[cx - wb, yb], [cx - wt, yb - ht * 0.92], [cx - 0.12 * W, yb - ht], [cx, yb - ht * 0.8], [cx + 0.12 * W, yb - ht], [cx + wt, yb - ht * 0.92], [cx + wb, yb]]);
    p.shadedFill(cr, col, mul(col, SH_FELT), light, wb, 0.4);
    p.clip(cr, () => { p.band(R([[cx - W, yb - 0.07 * HH], [cx + W, yb - 0.07 * HH]]), "#1d1a1c", 0.09 * HH, 0);
      p.stroke(R([[cx - 0.04 * W, yb - ht * 0.82], [cx + 0.02 * W, yb - ht * 0.35]]), 1.4 * u, shade(col, 0.6)); });
    p.poly(cr, null, ow);
    p.arc(bx, by, 0.62 * W, 0.05 * HH, 200, 340, 1.4 * u, shade(col, 1.25));
    if (o.acc?.includes("credencial_prensa")) { const pc = R([[cx + 0.08 * W, yb - 0.17 * HH], [cx + 0.26 * W, yb - 0.17 * HH], [cx + 0.25 * W, yb - 0.01 * HH], [cx + 0.09 * W, yb - 0.01 * HH]]);
      p.poly(pc, "#f4f1ea", 1.2 * u); p.stroke(R([[cx + 0.11 * W, yb - 0.11 * HH], [cx + 0.23 * W, yb - 0.11 * HH]]), 1.6 * u, "#222"); p.stroke(R([[cx + 0.11 * W, yb - 0.06 * HH], [cx + 0.2 * W, yb - 0.06 * HH]]), 1.2 * u, "#666"); }
  } else if (o.hat === "gorra_policia") {
    // gorra de plato de policía: plato ancho y plano, banda, visera negra y placa dorada
    const col = o.cap ?? "#1f2a44", yb = crown + 0.26 * HH, deg = (a * 180) / Math.PI;
    const band = R([[cx - 0.4 * W, yb], [cx - 0.42 * W, yb - 0.13 * HH], [cx + 0.42 * W, yb - 0.13 * HH], [cx + 0.4 * W, yb]]);
    p.shadedFill(band, col, mul(col, SH_FELT), light, 0.4 * W); p.poly(band, null, ow);
    const [tx, ty] = R([[cx, yb - 0.17 * HH]])[0];
    p.ell(tx, ty, 0.56 * W, 0.11 * HH, shade(col, 1.12), ow, 0, 360, deg);
    p.clip(band, () => p.band(R([[cx - W, yb - 0.03 * HH], [cx + W, yb - 0.03 * HH]]), "#111318", 0.05 * HH, 0));
    const vs = side ? -1 : (facing || 0);
    const vis = R([[cx - 0.4 * W + vs * 10 * u, yb - 2 * u], [cx + 0.4 * W + vs * 10 * u, yb - 2 * u], [cx + 0.3 * W + vs * 18 * u, yb + 0.07 * HH], [cx - 0.3 * W + vs * 18 * u, yb + 0.07 * HH]]);
    p.poly(vis, "#15161b", ow * 0.8);
    p.ell(...R([[cx + vs * 6 * u, yb - 0.08 * HH]])[0], 5 * u, 6 * u, "#e8c45a", 1.4 * u);
  } else if (o.hat === "cloche") {
    // sombrero campana de mujer (años 20–30): copa redonda pegada a la cabeza, ala corta caída y lazo
    const col = o.cap ?? "#7a3b4a", cut = crown + 0.4 * HH;
    const arc2 = hp.filter(([, y]) => y < cut).map(([x, y]) => [cx + (x - cx) * 1.1, hc + (y - hc) * 1.12 - 2 * u] as P2);
    if (arc2.length > 3) {
      p.shadedFill(arc2, col, mul(col, SH_FELT), light, H.a * 1.1); p.poly(arc2, null, ow);
      p.arc(cx, cut - 2 * u, 0.58 * W, 0.07 * HH, 0, 180, 7 * u, shade(col, 0.85));
      p.clip(arc2, () => p.band(R([[cx - W, cut - 0.08 * HH], [cx + W, cut - 0.08 * HH]]), shade(col, 0.6), 0.05 * HH, 0));
      const s2 = side ? -1 : -(facing || 1); p.ell(...R([[cx + s2 * 0.42 * W, cut - 0.1 * HH]])[0], 6 * u, 5 * u, shade(col, 0.6), 1.4 * u);
    }
  } else if (o.hat === "bombin") {
    // bombín: copa redonda dura y ala corta curvada
    const col = o.cap ?? "#24211f", yb = crown + 0.22 * HH, deg = (a * 180) / Math.PI, dome: P2[] = [];
    for (let i = 0; i <= 20; i++) { const t = Math.PI + (i / 20) * Math.PI; dome.push([cx + Math.cos(t) * 0.34 * W, yb + Math.sin(t) * 0.36 * HH]); }
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.56 * W, 0.07 * HH, shade(col, 0.85), ow, 0, 360, deg);
    const D = R(dome); p.shadedFill(D, col, mul(col, SH_FELT), light, 0.34 * W, 0.4);
    p.clip(D, () => p.band(R([[cx - W, yb - 0.05 * HH], [cx + W, yb - 0.05 * HH]]), "#111", 0.07 * HH, 0)); p.poly(D, null, ow);
    p.arc(...R([[cx - 0.12 * W, yb - 0.25 * HH]])[0], 0.1 * W, 0.06 * HH, 200, 300, 3 * u, mix(col, "#ffffff", 0.35));
  } else if (o.hat === "gorra_plana") {
    // gorra de repartidor de periódicos: copa abullonada, botón arriba y visera corta
    const col = o.cap ?? "#6a6258", yb = crown + 0.28 * HH, deg = (a * 180) / Math.PI;
    const cr = R([[cx - 0.5 * W, yb], [cx - 0.56 * W, yb - 0.14 * HH], [cx - 0.3 * W, yb - 0.3 * HH], [cx + 0.25 * W, yb - 0.32 * HH], [cx + 0.6 * W, yb - 0.16 * HH], [cx + 0.52 * W, yb]]);
    p.shadedFill(cr, col, mul(col, SH_FELT), light, 0.5 * W); p.clip(cr, () => { for (let k = -3; k <= 3; k++) p.stroke(R([[cx + k * 0.08 * W, yb - 0.3 * HH], [cx + k * 0.14 * W, yb]]), 1.2 * u, shade(col, 0.7)); }); p.poly(cr, null, ow);
    p.dot(...R([[cx - 0.02 * W, yb - 0.31 * HH]])[0], 4 * u, shade(col, 0.6));
    const s2 = side ? 1 : facing; p.ell(...R([[cx + s2 * 8 * u, yb + 2 * u]])[0], 0.36 * W, 0.05 * HH, shade(col, 0.75), ow, 0, 180, deg);
  } else if (o.hat === "pamela") {
    // sombrero de ala ancha de mujer, con cinta y flor
    const col = o.cap ?? "#3a2f3a", yb = crown + 0.24 * HH, deg = (a * 180) / Math.PI - 6;
    const [bx, by] = R([[cx, yb]])[0];
    p.ell(bx, by, 0.95 * W, 0.11 * HH, shade(col, 0.88), ow, 0, 360, deg);
    const cr = R([[cx - 0.36 * W, yb], [cx - 0.3 * W, yb - 0.2 * HH], [cx + 0.3 * W, yb - 0.2 * HH], [cx + 0.36 * W, yb]]);
    p.shadedFill(cr, col, mul(col, SH_FELT), light, 0.36 * W); p.clip(cr, () => p.band(R([[cx - W, yb - 0.05 * HH], [cx + W, yb - 0.05 * HH]]), o.accCol ?? "#c9b7a0", 0.07 * HH, 0)); p.poly(cr, null, ow);
    p.ell(...R([[cx + 0.3 * W, yb - 0.06 * HH]])[0], 7 * u, 6 * u, o.accCol ?? "#e8dccb", 1.4 * u);
  } else if (o.hat === "sombrero_vaquero") {
    const col = o.cap ?? "#8a6a48", yb = crown + 0.2 * HH, deg = (a * 180) / Math.PI;
    const [bx, by] = R([[cx, yb + 2 * u]])[0];
    p.arc(bx, by - 0.06 * HH, 0.85 * W, 0.14 * HH, 0, 180, 9 * u, shade(col, 0.8)); p.ell(bx, by, 0.8 * W, 0.07 * HH, shade(col, 0.85), ow, 0, 360, deg);
    const cr = R([[cx - 0.34 * W, yb], [cx - 0.3 * W, yb - 0.36 * HH], [cx, yb - 0.28 * HH], [cx + 0.3 * W, yb - 0.36 * HH], [cx + 0.34 * W, yb]]);
    p.shadedFill(cr, col, mul(col, SH_FELT), light, 0.34 * W); p.clip(cr, () => p.band(R([[cx - W, yb - 0.06 * HH], [cx + W, yb - 0.06 * HH]]), "#3a2418", 0.06 * HH, 0)); p.poly(cr, null, ow);
  } else if (o.hat === "gorro_marinero") {
    const col = o.cap ?? "#f4f1ea", yb = crown + 0.28 * HH;
    const cr = R([[cx - 0.4 * W, yb], [cx - 0.44 * W, yb - 0.18 * HH], [cx + 0.44 * W, yb - 0.18 * HH], [cx + 0.4 * W, yb]]);
    p.shadedFill(cr, col, mul(col, SH_CLOTH), light, 0.4 * W); p.clip(cr, () => p.band(R([[cx - W, yb - 0.03 * HH], [cx + W, yb - 0.03 * HH]]), "#1f2a44", 0.06 * HH, 0)); p.poly(cr, null, ow);
    p.ell(...R([[cx, yb - 0.2 * HH]])[0], 0.48 * W, 0.07 * HH, col, ow, 0, 360, (a * 180) / Math.PI);
  } else if (o.hat === "gorro_chef") {
    const col = "#f8f6f0", yb = crown + 0.22 * HH;
    const band = R([[cx - 0.4 * W, yb], [cx - 0.4 * W, yb - 0.14 * HH], [cx + 0.4 * W, yb - 0.14 * HH], [cx + 0.4 * W, yb]]);
    for (let k = -1; k <= 1; k++) p.ell(...R([[cx + k * 0.26 * W, yb - 0.42 * HH - (k ? 0 : 0.06 * HH)]])[0], 0.24 * W, 0.24 * HH, col, ow);
    p.poly(band, col, ow);
  } else if (o.hat === "gorro_lana") {
    const col = o.cap ?? "#7a2f30", cut = crown + 0.36 * HH;
    const arc2 = hp.filter(([, y]) => y < cut).map(([x, y]) => [cx + (x - cx) * 1.08, hc + (y - hc) * 1.08] as P2);
    if (arc2.length > 3) { p.shadedFill(arc2, col, mul(col, SH_FELT), light, H.a); p.clip(arc2, () => { for (let k = -8; k <= 8; k++) p.stroke([[cx + k * 0.07 * W, crown - 6 * u], [cx + k * 0.07 * W, cut]], 1.2 * u, shade(col, 0.7)); }); p.poly(arc2, null, ow);
      p.band(R([[cx - 0.54 * W, cut - 0.05 * HH], [cx + 0.54 * W, cut - 0.05 * HH]]), shade(col, 0.85), 0.1 * HH, 1.4 * u); p.ell(cx, crown - 8 * u, 9 * u, 8 * u, shade(col, 1.15), 1.6 * u); }
  } else if (o.hat === "cofia") {
    // cofia de niñera o enfermera: pieza blanca plisada sobre el pelo
    const yb = crown + 0.14 * HH, col = o.cap ?? "#ffffff";
    const pts = R([[cx - 0.42 * W, yb], [cx - 0.34 * W, yb - 0.2 * HH], [cx, yb - 0.24 * HH], [cx + 0.34 * W, yb - 0.2 * HH], [cx + 0.42 * W, yb]]);
    p.shadedFill(pts, col, "#d8d8d4", light, 0.4 * W); p.poly(pts, null, ow * 0.8);
    const ond: P2[] = []; for (let i = 0; i <= 14; i++) ond.push([cx - 0.42 * W + i * 0.06 * W, yb + (i % 2 ? 4 : 0) * u]); p.stroke(R(ond), 2.2 * u, "#c8c8c4");
  } else if (o.hat === "lazo") {
    const col = o.accCol ?? o.cap ?? "#c0353a", s2 = side ? -1 : -(facing || 1), [kx, ky] = R([[cx + s2 * 0.32 * W, crown + 0.1 * HH]])[0];
    p.poly([[kx, ky], [kx - 18 * u, ky - 12 * u], [kx - 18 * u, ky + 10 * u]], col, 1.6 * u); p.poly([[kx, ky], [kx + 18 * u, ky - 12 * u], [kx + 18 * u, ky + 10 * u]], col, 1.6 * u); p.ell(kx, ky, 5 * u, 5 * u, shade(col, 0.8), 1.4 * u);
  } else if (o.hat === "diadema") {
    p.arc(cx, hc, H.a * 1.04, H.b * 1.02, 205, 335, 6 * u, o.accCol ?? o.cap ?? "#2a2a33");
  } else if (o.hat === "velo") {
    // velo negro de luto: tul semitransparente sobre la frente y los ojos, con un sombrerito
    const col = o.cap ?? "#151518";
    p.ell(cx, hc - 0.1 * H.b, H.a * 1.1, H.b * 0.62, "rgba(20,20,26,0.38)", 0, 180, 360);
    for (let k = -6; k <= 6; k++) p.stroke([[cx + k * 0.15 * H.a, hc - 0.7 * H.b], [cx + k * 0.17 * H.a, hc + 0.1 * H.b]], 0.6 * u, "rgba(0,0,0,0.35)");
    p.ell(cx + 0.1 * W, crown + 0.08 * HH, 0.25 * W, 0.08 * HH, col, ow);
  } else if (o.hat === "gorro_bebe") {
    const col = o.cap ?? "#f2e6d0", cut = crown + 0.3 * HH;
    const arc2 = hp.filter(([, y]) => y < cut).map(([x, y]) => [cx + (x - cx) * 1.1, hc + (y - hc) * 1.1] as P2);
    if (arc2.length > 3) { p.shadedFill(arc2, col, mul(col, SH_CLOTH), light, H.a); p.poly(arc2, null, ow); p.band([[cx - 0.5 * W, cut - 2 * u], [cx + 0.5 * W, cut - 2 * u]], shade(col, 0.9), 7 * u, 1.2 * u); }
    p.stroke([[cx - 0.4 * W, hc + 0.3 * H.b], [cx - 6 * u, hc + 1.05 * H.b], [cx + 6 * u, hc + 1.05 * H.b], [cx + 0.4 * W, hc + 0.3 * H.b]], 2.4 * u, shade(col, 0.8));
    p.ell(cx, hc + 1.08 * H.b, 6 * u, 4 * u, shade(col, 0.8), 1.2 * u);
  } else if (o.hat === "casco_aviador") {
    // casco de cuero de piloto con orejeras y antiparras en la frente
    const col = o.cap ?? "#6a4428", cut = crown + 0.34 * HH;
    for (const s of side ? [-1] : [-1, 1]) p.ell(cx + s * 0.9 * H.a, hc + 0.12 * H.b, 0.2 * H.a, 0.34 * H.b, col, ow * 0.8);
    p.stroke([[cx - 0.85 * H.a, hc + 0.4 * H.b], [cx, hc + 1.02 * H.b], [cx + 0.85 * H.a, hc + 0.4 * H.b]], 2.4 * u, shade(col, 0.7));
    const arc2 = hp.filter(([, y]) => y < cut).map(([x, y]) => [cx + (x - cx) * 1.08, hc + (y - hc) * 1.06] as P2);
    if (arc2.length > 3) { p.shadedFill(arc2, col, mul(col, SH_FELT), light, H.a); p.clip(arc2, () => { p.stroke([[cx, crown - 4 * u], [cx, cut]], 1.4 * u, shade(col, 0.6)); }); p.poly(arc2, null, ow); }
    const gy = crown + 0.22 * HH;
    p.band(R([[cx - 0.55 * W, gy], [cx + 0.55 * W, gy]]), "#2a2420", 6 * u, 1.2 * u);
    for (const s of side ? [1] : [-1, 1]) { const [gx, gy2] = R([[cx + s * 0.18 * W + (side ? 0.2 * W : 0), gy]])[0]; p.ell(gx, gy2, 11 * u, 9 * u, "#b8c8d0", 2.4 * u); p.arc(gx - 3 * u, gy2 - 3 * u, 5 * u, 3 * u, 200, 300, 1.6 * u, "#ffffff"); }
  } else if (o.hat === "bonnet") {
    const [bx, by] = R([[cx + (side ? 6 * u : 0), crown + 0.16 * HH]])[0];
    p.arc(bx, by, 0.5 * W, 0.2 * HH, 200, 340, 7 * u, BONNET_BRIM);
    p.arc(bx, by, 0.5 * W + 3.5 * u, 0.2 * HH + 3.5 * u, 200, 340, 1.2 * u);
    const cy = hc + H.b * 0.98;
    p.stroke([[cx - 14 * u, cy - 4 * u], [cx, cy + 2 * u], [cx + 14 * u, cy - 4 * u]], 2 * u, BONNET_BRIM);
  }
};

// ---------------- bodies ----------------
export type Arms = [P2[], P2[]];
/** held prop; for the hammer the number is the strike 0 (raised) .. 1 (struck) */
export type Prop = null | "icecream" | "shako" | ["hammer", number];

const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
  baby: { a: 100, torso: 0.66, legs: 0.5, tw: 0.8 },
  elder: { a: 116, torso: 1.04, legs: 1.3, tw: 0.82 },
  thin: { a: 110, torso: 1.12, legs: 1.48, tw: 0.64 },
  tall: { a: 114, torso: 1.2, legs: 1.62, tw: 0.8 },
  teen: { a: 113, torso: 1.0, legs: 1.26, tw: 0.72 },
  short: { a: 118, torso: 0.98, legs: 1.12, tw: 0.88 },
};

/** generic arm gestures added for the story engine (stand / stroll / march) */
export type Gesture = "up" | "point" | "head" | "talk" | "hips" | "carry" | "shrug" | "wave" | "push" | "eat" | "throw"
  | "write" | "photo" | "mic" | "worry" | "peek" | "climb" | "steer" | "explain" | "cover" | "read" | "tuck"
  | "chin" | "cross" | "scratch" | "plead" | "hug" | "console" | "pockets" | "tremble" | "phone" | "watch" | "offer" | "knock" | "stop" | "fist" | "count";
/** objetos que el personaje lleva en la mano (dibujados en 2D sobre la tarjeta) */
export type Held = "pan" | "martillo" | "paraguas" | "libro" | "espada" | "taza" | "carta" | "saco" | "flor" | "antorcha" | "escoba"
  | "pala" | "moneda" | "llave" | "canasta" | "telefono" | "bandera" | "pastel" | "periodico" | "maletin" | "lupa" | "linterna" | "billetes" | "bebe"
  | "libreta" | "camara_foto" | "microfono" | "revolver" | "esposas" | "placa" | "carpeta" | "maleta" | "bolsa_compras" | "biberon" | "osito"
  | "sombrero" | "baston" | "vaso" | "botella" | "telefono_antiguo" | "mazo" | "fotografia" | "mapa" | "reloj_bolsillo" | "cigarrillo" | "pipa" | "nota"
  | "ramo" | "rifle" | "cuchillo" | "jeringa" | "radio" | "dinero_fajo" | "pasaporte" | "lampara_aceite" | "vela";
export type FrontOpts = {
  gesture?: Gesture | null; gk?: number; held?: Held | null;
  phase?: number; expr?: Expr; mode?: "march" | "stroll" | "stand" | "sit" | "fall"; look?: number; blink?: boolean | number; lift?: number;
  prop?: Prop; tilt?: number; headTilt?: number; wave?: number;
  /** cabeceo: -1 mira arriba, +1 mira abajo (los rasgos se desplazan dentro de la cara y la cabeza baja un poco) */
  nod?: number;
  /** canvas angle the key light comes FROM (painted crescent + thick outline side) */
  light?: number; facing?: -1 | 0 | 1; seed?: number;
  /** de espaldas (trepando, entrando por la ventana): la nuca en vez de la cara */
  back?: boolean;
};

/** objeto en la mano en (hx, hy); u = unidad de la cabeza; two = sostenido con las dos manos (más grande, centrado) */
export const drawHeld = (p: Pen, k: Held, hx: number, hy: number, u: number, two = false) => {
  const s = two ? 1.5 : 1, P = (x: number, y: number): P2 => [hx + x * u * s, hy + y * u * s];
  const box = (x0: number, y0: number, x1: number, y1: number, c: string, w = 2) => p.poly([P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], c, w * u);
  switch (k) {
    case "pan": {
      const pts: P2[] = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; pts.push(P(Math.cos(a) * 26, -6 + Math.sin(a) * (Math.sin(a) < 0 ? 15 : 9))); }
      p.poly(pts, "#d9963f", 2.2 * u); for (const x of [-12, 0, 12]) p.stroke([P(x - 5, -14), P(x + 5, -4)], 2.4 * u * s, "#a8642a"); break;
    }
    case "pastel": box(-22, -26, 22, 0, "#f3d2a6"); box(-22, -32, 22, -24, "#f28fb0"); p.ell(...P(0, -40), 4 * u * s, 4 * u * s, "#e2453c", 1.5 * u); break;
    case "martillo": p.band([P(0, 10), P(0, -40)], "#8a5a34", 5 * u, 1.5 * u, "round"); box(-12, -54, 20, -40, "#7d848c", 2.2); break;
    case "espada": p.band([P(0, 8), P(4, -70)], "#d6dbe2", 4.5 * u, 1.4 * u, "round"); p.band([P(-10, -2), P(12, -4)], "#c9a03a", 4 * u, 1.4 * u, "round"); break;
    case "paraguas": {
      p.band([P(0, 10), P(0, -70)], "#3a3d47", 3 * u, 1.2 * u, "round");
      const c: P2[] = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; c.push(P(Math.cos(a) * 46, -70 + Math.sin(a) * 30)); }
      p.poly(c, "#e2453c", 2.4 * u); break;
    }
    case "antorcha": p.band([P(0, 10), P(0, -34)], "#8a5a34", 5 * u, 1.5 * u, "round"); p.poly([P(-9, -34), P(9, -34), P(0, -62)], "#ff9a3a", 1.8 * u); p.poly([P(-4, -36), P(4, -36), P(0, -50)], "#ffe07a", 0); break;
    case "escoba": p.band([P(0, 30), P(0, -60)], "#b9895a", 3.5 * u, 1.2 * u, "round"); p.poly([P(-10, 30), P(10, 30), P(16, 52), P(-16, 52)], "#d9b45a", 2 * u); break;
    case "pala": p.band([P(0, 20), P(0, -55)], "#8a5a34", 3.5 * u, 1.2 * u, "round"); p.poly([P(-10, 20), P(10, 20), P(8, 44), P(0, 50), P(-8, 44)], "#9aa1aa", 2 * u); break;
    case "bandera": p.band([P(0, 10), P(0, -80)], "#6a4528", 3 * u, 1.2 * u, "round"); p.poly([P(0, -80), P(40, -72), P(0, -58)], "#e2453c", 2 * u); break;
    case "periodico": box(-20, -30, 20, 2, "#efe9da"); box(-17, -27, 17, -19, "#3a3a40", 0); for (let k = 0; k < 4; k++) p.stroke([P(-17, -14 + k * 4), P(k % 2 ? 2 : 17, -14 + k * 4)], 1.1 * u, "#8a8680"); box(4, -16, 17, -3, "#b8b2a4", 0); break;
    case "maletin": box(-18, -4, 18, 22, "#5a3a24"); p.stroke([P(-7, -4), P(-7, -12), P(7, -12), P(7, -4)], 2.6 * u, "#3a2414"); p.stroke([P(-18, 6), P(18, 6)], 1.4 * u, "#3a2414"); p.dot(...P(0, 6), 2.2 * u * s, "#e8c45a"); break;
    case "lupa": p.band([P(0, 12), P(0, -14)], "#3a2a20", 4 * u, 1.2 * u, "round"); p.ell(...P(0, -26), 12 * u * s, 12 * u * s, "#cfe8f4", 2.6 * u); p.arc(...P(-3, -29), 6 * u * s, 6 * u * s, 200, 290, 1.6 * u, "#ffffff"); break;
    case "linterna": p.band([P(-10, 0), P(14, -8)], "#3a3d47", 7 * u, 1.4 * u, "round"); p.ell(...P(17, -9), 5 * u * s, 6 * u * s, "#fff2b0", 1.4 * u); break;
    case "billetes": for (let k = 0; k < 3; k++) { const d = k * 3; box(-18 + d, -12 - d, 14 + d, 4 - d, "#d9c88a"); } p.ell(...P(2, -10), 5 * u * s, 5 * u * s, null, 1.2 * u); break;
    case "bebe": { // bebé envuelto en una manta, del tamaño de un bebé de verdad junto a un adulto
      const c: P2[] = []; for (let i = 0; i <= 28; i++) { const an = (i / 28) * Math.PI * 2; c.push(P(4 + Math.cos(an) * 40, -6 + Math.sin(an) * 22)); }
      p.poly(c, "#eef0f4", 2.2 * u); p.clip(c, () => { for (let k = 0; k < 5; k++) p.stroke([P(-30 + k * 14, -24), P(-20 + k * 14, 14)], 1.6 * u, "#c9d4e2"); });
      p.ell(...P(-26, -16), 17 * u * s, 16 * u * s, "#f5d0b0", 2.2 * u);
      p.arc(...P(-26, -26), 9 * u * s, 6 * u * s, 200, 340, 1.8 * u, "#c9a070");
      p.arc(...P(-31, -16), 3 * u * s, 2 * u * s, 20, 160, 1.4 * u); p.arc(...P(-21, -16), 3 * u * s, 2 * u * s, 20, 160, 1.4 * u);
      p.ell(...P(-26, -9), 2.2 * u * s, 1.6 * u * s, "#d77a7a", 0); p.ell(...P(-34, -11), 3.5 * u * s, 2.2 * u * s, "rgba(240,120,120,0.45)", 0); p.ell(...P(-18, -11), 3.5 * u * s, 2.2 * u * s, "rgba(240,120,120,0.45)", 0);
      break; }
    case "libreta": box(-10, -30, 10, 0, "#e9e2cc"); for (let k = 0; k < 5; k++) p.stroke([P(-7, -24 + k * 5), P(7, -24 + k * 5)], 0.9 * u, "#8a96b0"); for (let k = 0; k < 4; k++) p.ell(...P(-8 + k * 5.4, -31), 1.6 * u * s, 2.2 * u * s, null, 1 * u);
      p.band([P(14, -2), P(24, -30)], "#e8c45a", 2.6 * u, 0.8 * u); p.poly([P(13, 0), P(15.5, -3), P(12, -4)], "#3a2a20", 0.6 * u); break;
    case "camara_foto": { // cámara de prensa de los años 30 con fuelle y flash de bombilla
      box(-18, -26, 8, -4, "#222226"); box(8, -22, 20, -8, "#3a3a40"); p.ell(...P(22, -15), 6 * u * s, 6 * u * s, "#1a1a1e", 1.6 * u); p.ell(...P(22, -15), 3 * u * s, 3 * u * s, "#6a7a8a", 0);
      p.stroke([P(-14, -26), P(-14, -40)], 2 * u * s, "#9aa0a8"); p.ell(...P(-14, -46), 13 * u * s, 9 * u * s, "#d9dde2", 1.6 * u); p.ell(...P(-14, -46), 4 * u * s, 4 * u * s, "#fff6c8", 1 * u); break; }
    case "microfono": p.band([P(0, 10), P(0, -30)], "#2a2a2e", 3 * u, 1 * u, "round"); box(-9, -52, 9, -30, "#9aa0a8"); for (let k = 0; k < 4; k++) p.stroke([P(-7, -48 + k * 5), P(7, -48 + k * 5)], 1 * u, "#5a6068");
      box(-11, -30, 11, -24, "#c0353a", 1.2); break;
    case "revolver": p.poly([P(-6, 0), P(2, 0), P(4, -10), P(30, -12), P(30, -18), P(0, -18), P(-8, -12)], "#2a2b30", 1.8 * u); p.ell(...P(4, -14), 5 * u * s, 4 * u * s, "#3a3b40", 1.2 * u); break;
    case "esposas": p.ell(...P(-8, -10), 8 * u * s, 8 * u * s, null, 2.6 * u); p.ell(...P(12, -10), 8 * u * s, 8 * u * s, null, 2.6 * u); p.stroke([P(0, -10), P(4, -10)], 2.4 * u, "#9aa0a8"); break;
    case "placa": p.poly([P(-10, -24), P(10, -24), P(12, -12), P(0, 2), P(-12, -12)], "#e8c45a", 1.6 * u); p.ell(...P(0, -12), 4 * u * s, 4 * u * s, "#c9a03a", 1 * u); break;
    case "carpeta": box(-16, -30, 16, 4, "#d9c08a"); box(-13, -34, 13, -28, "#f4ecd8", 1.2); p.stroke([P(-10, -18), P(10, -18)], 1 * u, "#7a6a4a"); break;
    case "maleta": box(-26, -6, 26, 30, "#6a4428"); p.stroke([P(-8, -6), P(-8, -14), P(8, -14), P(8, -6)], 3 * u, "#3a2414"); for (const x of [-16, 16]) p.stroke([P(x, -6), P(x, 30)], 2 * u, "#3a2414"); break;
    case "bolsa_compras": box(-16, -6, 16, 30, "#c9a46a"); p.ell(...P(-6, -10), 6 * u * s, 8 * u * s, "#e8c88a", 1.4 * u); p.stroke([P(6, -6), P(10, -26)], 3 * u * s, "#3f8a3a"); p.ell(...P(10, -28), 5 * u * s, 4 * u * s, "#3f8a3a", 1.2 * u); break;
    case "biberon": box(-5, -24, 5, 2, "#eef4f8"); box(-5, -12, 5, 2, "#f2f2e0", 0); p.poly([P(-4, -24), P(4, -24), P(1, -32), P(-1, -32)], "#e8b878", 1.2 * u); break;
    case "osito": p.ell(...P(0, -6), 11 * u * s, 13 * u * s, "#b07a4a", 1.8 * u); p.ell(...P(0, -24), 9 * u * s, 8 * u * s, "#b07a4a", 1.8 * u); for (const x of [-7, 7]) p.ell(...P(x, -31), 3.5 * u * s, 3.5 * u * s, "#b07a4a", 1.4 * u); p.dot(...P(-3, -25), 1.4 * u * s); p.dot(...P(3, -25), 1.4 * u * s); break;
    case "sombrero": p.ell(...P(0, 0), 24 * u * s, 6 * u * s, "#3b3530", 1.8 * u); p.poly([P(-15, 0), P(-12, -18), P(12, -18), P(15, 0)], "#3b3530", 1.8 * u); p.band([P(-14, -5), P(14, -5)], "#1d1a1c", 4 * u, 0); break;
    case "baston": p.stroke([P(0, -10), P(0, 70)], 4 * u * s, "#4a2e1a"); p.arc(...P(-8, -10), 8 * u * s, 8 * u * s, 180, 360, 4 * u * s, "#4a2e1a"); break;
    case "vaso": p.poly([P(-8, -20), P(8, -20), P(6, 2), P(-6, 2)], "rgba(220,235,245,0.8)", 1.4 * u); p.poly([P(-7, -8), P(7, -8), P(6, 1), P(-6, 1)], "#c8862a", 0); break;
    case "botella": p.poly([P(-7, 2), P(7, 2), P(7, -24), P(3, -30), P(3, -40), P(-3, -40), P(-3, -30), P(-7, -24)], "#3a5a3a", 1.6 * u); box(-6, -18, 6, -8, "#e9e2cc", 0.8); break;
    case "telefono_antiguo": box(-10, 0, 10, 4, "#1c1c20"); p.stroke([P(0, 0), P(0, -36)], 4 * u * s, "#1c1c20"); p.ell(...P(0, -38), 6 * u * s, 4 * u * s, "#1c1c20", 1.2 * u); p.stroke([P(12, -6), P(16, -26)], 3.4 * u * s, "#1c1c20"); p.ell(...P(16, -28), 4 * u * s, 5 * u * s, "#1c1c20", 1 * u); break;
    case "mazo": p.band([P(0, 10), P(-4, -22)], "#6a3e22", 4 * u, 1.2 * u, "round"); box(-18, -32, 8, -20, "#5a3418"); break;
    case "fotografia": box(-14, -26, 14, 0, "#f4f1ea"); box(-11, -23, 11, -6, "#6a6a70", 0); p.ell(...P(0, -16), 4 * u * s, 4 * u * s, "#a8a8ae", 0); break;
    case "mapa": p.poly([P(-22, -26), P(-8, -22), P(8, -26), P(22, -22), P(22, 2), P(8, -2), P(-8, 2), P(-22, -2)], "#e8dcb8", 1.6 * u); p.stroke([P(-16, -16), P(-2, -8), P(12, -14)], 1.4 * u, "#c0353a"); break;
    case "reloj_bolsillo": p.ell(...P(0, -10), 10 * u * s, 10 * u * s, "#e8c45a", 1.8 * u); p.ell(...P(0, -10), 7 * u * s, 7 * u * s, "#f8f4e8", 0); p.stroke([P(0, -10), P(0, -15)], 1.2 * u); p.stroke([P(0, -10), P(3, -10)], 1.2 * u); p.stroke([P(0, -20), P(6, -30), P(14, -26)], 1.2 * u, "#c9a03a"); break;
    case "cigarrillo": p.band([P(-2, -2), P(12, -6)], "#f4f1ea", 2.6 * u, 0.8 * u); p.dot(...P(12, -6), 1.8 * u, "#e2603a"); p.arc(...P(14, -16), 3 * u, 5 * u, 90, 270, 1.2 * u, "rgba(200,200,205,0.7)"); break;
    case "pipa": p.band([P(-4, -4), P(12, -8)], "#3a2418", 2.6 * u, 0.8 * u); p.poly([P(10, -6), P(20, -6), P(19, 6), P(11, 6)], "#6a3e22", 1.4 * u); break;
    case "nota": p.poly([P(-14, -22), P(14, -24), P(13, 2), P(-13, 4)], "#f4ecd8", 1.6 * u); for (let k = 0; k < 4; k++) { const sc: P2[] = []; for (let i = 0; i <= 8; i++) sc.push(P(-10 + i * 2.6, -16 + k * 5 + Math.sin(i * 2 + k) * 1.4)); p.stroke(sc, 0.9 * u, "#3a3050"); } break;
    case "ramo": for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; p.ell(...P(Math.cos(a) * 9, -30 + Math.sin(a) * 7), 6 * u * s, 6 * u * s, ["#f28fb0", "#e2453c", "#f4f1ea"][i % 3], 1.2 * u); } p.poly([P(-8, -20), P(8, -20), P(2, 8), P(-2, 8)], "#3f8a3a", 1.4 * u); break;
    case "rifle": p.band([P(-10, 20), P(10, -70)], "#7a4b2a", 5 * u, 1.5 * u, "round"); p.band([P(4, -40), P(10, -70)], "#8d949c", 2.4 * u, 1.2 * u, "round"); break;
    case "cuchillo": p.band([P(0, 6), P(0, -6)], "#3a2418", 4 * u, 1.2 * u, "round"); p.poly([P(-3, -6), P(3, -6), P(1, -30), P(-3, -24)], "#d6dbe2", 1.2 * u); break;
    case "jeringa": box(-3, -26, 3, 0, "#e8f0f4", 1.2); p.stroke([P(0, -26), P(0, -36)], 1 * u, "#9aa0a8"); p.stroke([P(-6, 2), P(6, 2)], 2 * u, "#9aa0a8"); break;
    case "radio": box(-20, -30, 20, 4, "#6a4428"); p.ell(...P(-6, -14), 9 * u * s, 9 * u * s, "#c9b48a", 1.2 * u); p.ell(...P(12, -8), 3 * u * s, 3 * u * s, "#2a2a2e", 1 * u); break;
    case "dinero_fajo": box(-16, -14, 16, 2, "#9ab87a"); p.band([P(-4, -14), P(-4, 2)], "#e8dcb8", 4 * u, 0.6 * u); break;
    case "pasaporte": box(-11, -28, 11, 0, "#2a3a6a"); p.ell(...P(0, -14), 5 * u * s, 5 * u * s, null, 1 * u, 0, 360); break;
    case "lampara_aceite": p.stroke([P(0, -10), P(0, -44)], 1.4 * u); p.ell(...P(0, -6), 12 * u * s, 8 * u * s, "#8a6a3a", 1.6 * u); p.poly([P(-7, -12), P(7, -12), P(5, -30), P(-5, -30)], "rgba(255,240,190,0.85)", 1.4 * u); p.ell(...P(0, -20), 2.5 * u * s, 4 * u * s, "#ffb040", 0); break;
    case "vela": box(-4, -20, 4, 4, "#f4ecd8"); p.ell(...P(0, -26), 3 * u * s, 6 * u * s, "#ffb040", 0.8 * u); break;
    case "libro": box(-14, -24, 14, 6, "#2f5fa8"); box(-11, -22, 11, 3, "#f4ecd8", 0); break;
    case "carta": box(-14, -14, 14, 6, "#f4ecd8"); p.stroke([P(-14, -14), P(0, -3), P(14, -14)], 1.6 * u, INK); break;
    case "telefono": box(-8, -26, 8, 2, "#2a2a33"); box(-6, -23, 6, -2, "#7fc6ff", 0); break;
    case "taza": box(-9, -18, 9, 2, "#f4f1ea"); p.arc(hx + 11 * u * s, hy - 8 * u * s, 5 * u * s, 5 * u * s, -90, 90, 2.5 * u); break;
    case "moneda": p.ell(...P(0, -8), 9 * u * s, 9 * u * s, "#f2c12e", 2 * u); p.ell(...P(0, -8), 5 * u * s, 5 * u * s, "#e0a91c", 0); break;
    case "llave": p.ell(...P(0, -14), 6 * u * s, 6 * u * s, null, 3 * u); p.stroke([P(0, -8), P(0, 14)], 3 * u * s, "#c9a03a"); p.stroke([P(0, 10), P(6, 10)], 3 * u * s, "#c9a03a"); break;
    case "flor": p.stroke([P(0, 6), P(0, -30)], 2.4 * u * s, "#3f8a3a"); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; p.ell(...P(Math.cos(a) * 6, -34 + Math.sin(a) * 6), 5 * u * s, 5 * u * s, "#f28fb0", 1.4 * u); } p.ell(...P(0, -34), 3.5 * u * s, 3.5 * u * s, "#f2c12e", 1.2 * u); break;
    case "saco": { const c: P2[] = []; for (let i = 0; i <= 30; i++) { const a = (i / 30) * Math.PI * 2; c.push(P(Math.cos(a) * 20, 22 + Math.sin(a) * 22)); } p.poly(c, "#c9a46a", 2.2 * u); p.stroke([P(-6, 0), P(6, 0)], 2.4 * u * s, "#7a5a34"); break; }
    case "canasta": p.arc(hx, hy + 6 * u * s, 16 * u * s, 16 * u * s, 180, 360, 3 * u); p.poly([P(-20, 6), P(20, 6), P(15, 26), P(-15, 26)], "#c08a4e", 2 * u); p.ell(...P(-6, 4), 6 * u * s, 5 * u * s, "#e2453c", 1.4 * u); p.ell(...P(6, 3), 6 * u * s, 5 * u * s, "#f2c12e", 1.4 * u); break;
  }
};

const footStroke = (p: Pen, a: P2, b: P2, w: number, col: string) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};

export const bodyFront = (p: Pen, o: Outfit, opts: FrontOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", look = 0, blink = false, lift = 60, prop = null, tilt = 0, headTilt = 0, wave, nod = 0,
    light = DEF_LIGHT, facing = 0, seed = 1, gesture = null, gk = 0, held = null, back = false } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  // body bob 5 % (march) / 3 % (stroll) of the height, lowest at contact (phase 0 and 0.5)
  const bob = mode === "march" ? 0.025 * tall * Math.cos(2 * two * phase) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - 0.2 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = mix(o.pants, INK, 0.55), armCol = mix(o.jacket, INK, 0.5), footCol = o.boots;
  const legW = 5.8 * u, footW = 7.5 * u;
  // ---- legs + feet (not rotated) ----
  p.rot = null;
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h: P2 = [300 + side * 15 * u, hipY], k: P2 = [300 + side * 36 * u, hipY + 0.2 * HH], f: P2 = [300 + side * 44 * u, sole - 8 * u];
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, [f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 5 * u], footW, footCol);
    }
  } else if (mode === "fall") {
    const legs: [P2, P2, P2][] = [
      [[300 - 15 * u, hipY], [300 - 46 * u, hipY + 0.5 * HH], [300 - 70 * u, hipY + 0.72 * HH]],
      [[300 + 15 * u, hipY], [300 + 50 * u, hipY + 0.45 * HH], [300 + 76 * u, hipY + 0.22 * HH]],
    ];
    legs.forEach(([h, k, f], i) => {
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, f, [f[0] + (i ? 14 : -14) * u, f[1] + (i ? -6 : 4) * u], footW, footCol);
    });
  } else if (o.dress) {
    for (const side of [-1, 1]) {
      const fx = 300 + side * 12 * u, fy = sole - 4 * u;
      p.stroke([[fx, sole - 0.4 * HH], [fx + side * u, fy]], legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 12 * u, fy + u], footW, footCol);
    }
  } else {
    const L = mode === "march" ? lift * 1.25 : mode === "stroll" ? lift * 0.55 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]] as const) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
      const k: P2 = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      p.stroke(curve([hx, hipY], k, [fx, fy]), legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u], footW, footCol);
    }
  }
  // ---- upper body: rotates about the hips (tilt + a small weight-shift sway on every step) ----
  const sway = mode === "march" ? 1.6 * Math.sin(two * phase) : mode === "stroll" ? 1.0 * Math.sin(two * phase) : 0;
  const A = tilt + sway;
  p.rot = A ? [rad(A), 300, hipY] : null;
  const dress = !!o.dress && mode !== "sit" && mode !== "fall";
  const T: Blob = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: o.build === "stout" ? 0.17 : 0.12,
    asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side: number): P2 => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const hang = (side: number, fwd: number): [P2, P2, P2] => {
    const S = sh(side), ex = tcx + side * (1.12 * T.a + 4 * u);
    const hx = ex + side * 3 * u - side * 6 * u * Math.max(0, fwd) + side * 4 * u * Math.max(0, -fwd);
    return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
  };
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  // rifle at the order: butt by the right hip, held by the hanging right hand, muzzle past the crown
  const R0: P2 = [300 + 47 * u, torsoBot + 0.12 * HH], R1: P2 = [300 + 64 * u, crown - 0.32 * HH];
  const rifle = !!o.rifle && (mode === "march" || mode === "stand" || mode === "stroll");
  type Arm = { pts: [P2, P2, P2]; front: boolean };
  const arms: Arm[] = [];
  if (mode === "sit" && gesture !== "steer" && gesture !== "write" && gesture !== "read") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.1 * T.a + 6 * u), sh(side)[1] + 0.4 * HH], [tcx + side * (1.2 * T.a + 10 * u), torsoBot + 0.04 * HH]], front: false });
  else if (mode === "fall") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.15 * T.a + 12 * u), sh(side)[1] - 0.25 * HH], [tcx + side * (1.3 * T.a + 24 * u), sh(side)[1] - 0.68 * HH]], front: false });
  else if (gesture) {
    const S0 = sh(-1), S1 = sh(1), Y = S1[1];
    const both = (f: (side: number, S: P2) => [P2, P2, P2], front = false) => { for (const side of [-1, 1]) arms.push({ pts: f(side, sh(side)), front }); };
    if (gesture === "up") both((sd, S) => [S, [tcx + sd * (1.15 * T.a + 10 * u), Y - 0.3 * HH - 6 * u * gk], [tcx + sd * (1.3 * T.a + 22 * u), Y - 0.85 * HH - 10 * u * gk]]);
    else if (gesture === "head") both((sd, S) => [S, [tcx + sd * (1.45 * T.a + 22 * u), Y - 0.15 * HH], [300 + sd * (H.a + 2 * u), hc + 0.1 * H.b]]);
    else if (gesture === "hips") both((sd, S) => [S, [tcx + sd * (1.5 * T.a + 14 * u), Y + 0.35 * HH], [tcx + sd * 0.98 * T.a, torsoBot - 0.28 * HH]]);
    else if (gesture === "carry") both((sd, S) => [S, [tcx + sd * (1.05 * T.a + 6 * u), Y + 0.4 * HH], [tcx + sd * 0.45 * T.a, Y + 0.55 * HH]], true);
    else if (gesture === "shrug") both((sd, S) => [S, [tcx + sd * (1.2 * T.a + 6 * u), Y + 0.35 * HH], [tcx + sd * (1.5 * T.a + 26 * u), Y + 0.02 * HH - 4 * u * gk]]);
    // ---- actuación ----
    else if (gesture === "write") { // libreta en la izquierda, lápiz en la derecha que se mueve al escribir
      arms.push({ pts: [S0, [tcx - 1.05 * T.a - 4 * u, Y + 0.42 * HH], [tcx - 0.28 * T.a, Y + 0.52 * HH]], front: true });
      arms.push({ pts: [S1, [tcx + 1.05 * T.a + 4 * u, Y + 0.42 * HH], [tcx + 0.05 * T.a + 7 * u * gk, Y + 0.44 * HH - 2 * u * Math.sin(gk * 9)]], front: true });
    }
    else if (gesture === "photo" || gesture === "cover") both((sd, S) => [S, [tcx + sd * (1.22 * T.a + 10 * u), Y + (gesture === "photo" ? 0.28 : 0.12) * HH],
      [300 + sd * (gesture === "photo" ? 0.55 : 0.32) * H.a, hc + (gesture === "photo" ? 0.5 : 0.22) * H.b + (gesture === "cover" ? 2 * u * gk : 0)]], true);
    else if (gesture === "worry") both((sd, S) => [S, [tcx + sd * (1.15 * T.a + 6 * u), Y + 0.4 * HH], [300 + sd * (5 * u + 5 * u * (sd > 0 ? gk : 1 - gk)), Y + 0.12 * HH + 3 * u * gk]], true);
    else if (gesture === "climb") both((sd, S) => { const k = sd > 0 ? gk : 1 - gk; return [S, [tcx + sd * (1.05 * T.a + 10 * u), Y - (0.2 + 0.2 * k) * HH], [tcx + sd * (0.75 * T.a + 8 * u), Y - (0.62 + 0.35 * k) * HH]]; });
    else if (gesture === "steer") both((sd, S) => [S, [tcx + sd * (1.1 * T.a + 6 * u), Y + 0.4 * HH], [tcx + sd * 0.22 * T.a, Y + 0.5 * HH - 4 * u * gk]], true);
    else if (gesture === "explain") both((sd, S) => { const k = sd > 0 ? gk : 1 - gk; return [S, [tcx + sd * (1.3 * T.a + 14 * u), Y + 0.32 * HH], [tcx + sd * (1.45 * T.a + 30 * u + 6 * u * k), Y + 0.18 * HH - 10 * u * k]]; });
    else if (gesture === "tuck") both((sd, S) => { const k = sd > 0 ? gk : 1 - gk; return [S, [tcx + sd * (1.1 * T.a + 8 * u), Y + 0.42 * HH], [tcx + sd * (0.55 * T.a + 6 * u * k), torsoBot - 0.02 * HH + 4 * u * k]]; }, true);
    else if (gesture === "read") both((sd, S) => [S, [tcx + sd * (1.1 * T.a + 6 * u), Y + 0.36 * HH], [tcx + sd * 0.38 * T.a, Y + 0.3 * HH + 2 * u * gk]], true);
    // ---- gesticulación humana (dos brazos) ----
    else if (gesture === "cross") both((sd, S) => [S, [tcx + sd * (1.12 * T.a + 6 * u), Y + 0.46 * HH], [tcx - sd * 0.55 * T.a, Y + 0.36 * HH + sd * 2 * u]], true);
    else if (gesture === "plead") both((sd, S) => [S, [tcx + sd * (1.05 * T.a + 6 * u), Y + 0.38 * HH], [tcx + sd * 0.12 * T.a, Y + 0.12 * HH - 3 * u * gk]], true);
    else if (gesture === "hug") both((sd, S) => [S, [tcx + sd * (1.35 * T.a + 22 * u), Y + 0.18 * HH], [tcx + sd * (0.9 * T.a + 18 * u * (1 - gk)), Y + 0.26 * HH]], true);
    else if (gesture === "pockets") both((sd, S) => [S, [tcx + sd * (1.18 * T.a + 6 * u), Y + 0.5 * HH], [tcx + sd * 0.82 * T.a, torsoBot - 0.06 * HH]]);
    else if (gesture === "tremble") both((sd, S) => [S, [tcx + sd * (1.0 * T.a + 4 * u), Y + 0.42 * HH], [tcx - sd * 0.35 * T.a, Y + 0.3 * HH + 2 * u * gk]], true);
    else if (gesture === "watch") { arms.push({ pts: hang(-1, 0), front: false });
      arms.push({ pts: [S1, [tcx + 1.15 * T.a + 8 * u, Y + 0.38 * HH], [tcx + 0.35 * T.a, Y + 0.1 * HH + 6 * u * gk]], front: true }); }
    else if (gesture === "count") { const nd = Math.round(clamp(gk, 0, 1) * 2);
      arms.push({ pts: [S0, [tcx - 1.25 * T.a - 10 * u, Y + 0.32 * HH], [tcx - 1.05 * T.a - 16 * u, Y - 0.04 * HH]], front: true });
      arms.push({ pts: [S1, [tcx + 0.9 * T.a + 4 * u, Y + 0.42 * HH], [tcx - 0.9 * T.a - 8 * u, Y + 0.02 * HH - nd * 4 * u]], front: true }); }
    else if (gesture === "peek") { arms.push({ pts: hang(-1, 0), front: false });
      arms.push({ pts: [S1, [tcx + 1.25 * T.a + 18 * u, Y - 0.02 * HH], [tcx + 1.42 * T.a + 30 * u, Y - 0.32 * HH]], front: false }); }
    else if (gesture === "mic") { arms.push({ pts: hang(-1, 0), front: false });
      arms.push({ pts: [S1, [tcx + 1.3 * T.a + 20 * u, Y + 0.12 * HH], [tcx + 1.55 * T.a + 48 * u, Y - 0.02 * HH + 3 * u * gk]], front: false }); }
    else if (gesture === "push") for (const sd of [-1, 1]) arms.push({ pts: [sh(sd), [tcx + 1.2 * T.a + (sd > 0 ? 30 : 12) * u, Y + 0.22 * HH], [tcx + 1.55 * T.a + (sd > 0 ? 62 : 48) * u - 6 * u * gk, Y + (sd > 0 ? 0.12 : 0.3) * HH]], front: sd > 0 });
    else {
      arms.push({ pts: hang(-1, -sw), front: false });
      if (gesture === "point") arms.push({ pts: [S1, [tcx + 1.3 * T.a + 25 * u, Y + 0.02 * HH], [tcx + 1.62 * T.a + 58 * u, Y - 0.06 * HH + 4 * u * gk]], front: false });
      else if (gesture === "eat") arms.push({ pts: [S1, [tcx + 1.15 * T.a + 12 * u, Y + 0.3 * HH], [300 + 0.35 * H.a, hc + 0.55 * H.b + 4 * u * gk]], front: true });
      else if (gesture === "throw") {
        const k = clamp(gk, 0, 1);
        const hand = lerp2([tcx + 0.9 * T.a, Y - 0.9 * HH], [tcx + 1.7 * T.a + 60 * u, Y - 0.15 * HH], k);
        arms.push({ pts: [S1, lerp2([tcx + 1.1 * T.a + 6 * u, Y - 0.45 * HH], [tcx + 1.3 * T.a + 28 * u, Y - 0.1 * HH], k), hand], front: false });
      }
      // ---- gesticulación humana (una mano; la otra cuelga) ----
      else if (gesture === "chin") arms.push({ pts: [S1, [tcx + 1.1 * T.a + 6 * u, Y + 0.36 * HH], [300 + 0.25 * H.a, hc + 0.95 * H.b]], front: true });
      else if (gesture === "scratch") arms.push({ pts: [S1, [tcx + 1.35 * T.a + 18 * u, Y - 0.05 * HH], [300 + 0.95 * H.a, hc - 0.35 * H.b + 3 * u * gk]], front: false });
      else if (gesture === "phone") arms.push({ pts: [S1, [tcx + 1.2 * T.a + 10 * u, Y + 0.3 * HH], [300 + 0.95 * H.a, hc + 0.25 * H.b]], front: true });
      else if (gesture === "offer") arms.push({ pts: [S1, [tcx + 1.2 * T.a + 14 * u, Y + 0.42 * HH], [tcx + 1.5 * T.a + 40 * u, Y + 0.4 * HH - 3 * u * gk]], front: true });
      else if (gesture === "console") arms.push({ pts: [S1, [tcx + 1.3 * T.a + 20 * u, Y + 0.2 * HH], [tcx + 1.6 * T.a + 46 * u, Y + 0.02 * HH + 2 * u * gk]], front: false });
      else if (gesture === "knock") arms.push({ pts: [S1, [tcx + 1.25 * T.a + 16 * u, Y + 0.25 * HH], [tcx + 1.45 * T.a + 34 * u - 8 * u * gk, Y - 0.05 * HH]], front: true });
      else if (gesture === "stop") arms.push({ pts: [S1, [tcx + 1.3 * T.a + 22 * u, Y + 0.05 * HH], [tcx + 1.55 * T.a + 50 * u, Y - 0.22 * HH]], front: true });
      else if (gesture === "fist") arms.push({ pts: [S1, [tcx + 1.3 * T.a + 18 * u, Y - 0.1 * HH], [tcx + 1.25 * T.a + 22 * u, Y - 0.55 * HH + 8 * u * gk]], front: false });
      else if (gesture === "wave") arms.push({ pts: [S1, [tcx + 1.1 * T.a + 10 * u + 3 * u * gk, Y - 0.22 * HH], [tcx + 1.18 * T.a + 16 * u + 14 * u * gk, Y - 0.6 * HH]], front: false });
      else arms.push({ pts: [S1, [tcx + 1.1 * T.a + 8 * u, Y + 0.42 * HH], [tcx + 1.28 * T.a + 20 * u + 6 * u * gk, Y + 0.08 * HH - 10 * u * gk]], front: false });
      void S0;
    }
  } else {
    arms.push({ pts: prop === "shako" ? hang(-1, 0) : hang(-1, -sw), front: false });
    if (rifle) {
      const G = lerp2(R0, R1, 0.1);
      arms.push({ pts: [sh(1), [tcx + 1.12 * T.a + 5 * u, sh(1)[1] + 0.45 * HH], G], front: false });
    } else if (wave !== undefined) {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.1 * T.a + 10 * u + 3 * u * wave, S[1] - 0.22 * HH], [tcx + 1.18 * T.a + 16 * u + 12 * u * wave, S[1] - 0.6 * HH]], front: false });
    } else if (prop === "icecream") {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.05 * T.a + 4 * u, S[1] + 0.45 * HH], [tcx + 0.5 * T.a, S[1] + 0.4 * HH]], front: true });
    } else if (Array.isArray(prop)) {
      const S = sh(1), k = clamp(prop[1], 0, 1);
      const E = lerp2([tcx + 1.1 * T.a + 10 * u, S[1] - 0.15 * HH], [tcx + 1.2 * T.a + 10 * u, S[1] + 0.3 * HH], k);
      const Hd = lerp2([tcx + 1.15 * T.a + 14 * u, S[1] - 0.55 * HH], [tcx + 1.45 * T.a + 22 * u, S[1] + 0.35 * HH], k);
      arms.push({ pts: [S, E, Hd], front: true });
    } else arms.push({ pts: hang(1, sw), front: false });
  }
  const ACC = new Set(o.acc ?? []);
  const mano = (x: number, y: number) => { p.dot(x, y, 5.5 * u); if (ACC.has("guantes")) p.dot(x, y, 4 * u, "#f4f1ea"); };
  const drawArm = (a: Arm) => { p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol); mano(a.pts[2][0], a.pts[2][1]);
    if (ACC.has("brazalete")) { const m = lerp2(a.pts[0], a.pts[1], 0.75); p.dot(m[0], m[1], 4 * u, o.accCol ?? "#f4f1ea"); } };
  // behind the body: rifle, sword, arms
  if (rifle) {
    p.band([R0, R1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(R0, R1, 0.6), R1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  if (o.sword && mode !== "sit") {
    const s0: P2 = [tcx - 0.75 * T.a, torsoBot - 0.2 * HH];
    p.band([s0, [s0[0] - Math.sin(rad(25)) * 0.8 * HH, s0[1] + Math.cos(rad(25)) * 0.8 * HH]], "#c9ccd2", 3 * u, 1.2 * u, "round");
  }
  if (o.patron === "capa" && mode !== "sit") {
    const cc = o.patronCol ?? "#8c3b4a";
    // capa: dos paños anchos que caen desde los hombros por detrás y se abren abajo (con pliegues)
    for (const s of [-1, 1]) {
      const pts: P2[] = [[tcx + s * 0.35 * T.a, chin + 0.0 * HH], [tcx + s * 1.15 * T.a, chin + 0.08 * HH], [tcx + s * 1.55 * T.a, torsoBot + 0.2 * HH],
        [tcx + s * 1.9 * T.a, sole - 0.26 * HH], [tcx + s * 1.55 * T.a, sole - 0.2 * HH], [tcx + s * 1.25 * T.a, sole - 0.27 * HH], [tcx + s * 0.95 * T.a, sole - 0.22 * HH], [tcx + s * 0.8 * T.a, torsoBot]];
      p.gradFill(pts, cc, mul(cc, SH_CLOTH), light); p.poly(pts, null, ow);
      p.stroke([[tcx + s * 1.3 * T.a, torsoBot + 0.1 * HH], [tcx + s * 1.45 * T.a, sole - 0.24 * HH]], 1.6 * u, shade(cc, 0.6));
    }
  }
  if ((o.patron === "gabardina" || o.patron === "bata" || o.patron === "abrigo" || o.patron === "abrigo_piel" || o.patron === "toga") && mode !== "sit" && !dress) {
    // faldón del abrigo largo: tapa la parte de arriba de las piernas, abierto al medio (la toga llega a los tobillos)
    const cc = o.jacket, y1 = sole - (o.patron === "bata" ? 0.42 : o.patron === "toga" ? 0.12 : o.patron === "abrigo_piel" ? 0.3 : 0.36) * HH;
    for (const s of [-1, 1]) {
      const pts: P2[] = [[tcx + s * 2 * u, torsoBot - 0.2 * HH], [tcx + s * 0.98 * T.a, torsoBot - 0.25 * HH], [tcx + s * 1.12 * T.a + s * 8 * u * sw, y1], [tcx + s * 3 * u, y1 + 3 * u]];
      p.gradFill(pts, cc, mul(cc, SH_CLOTH), light); p.poly(pts, null, ow);
    }
  }
  for (const a of arms) if (!a.front) drawArm(a);
  // torso / dress: shaded fill -> clothing clipped to it -> thick-thin ink ring
  if (dress) {
    const D: Blob = { a: 0.5 * W * 0.98, b: 0.5 * ((sole - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(300, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, o.dress!, mul(o.dress!, SH_CLOTH), light);
    const est = o.estampado ?? "liso", ec = o.patronCol ?? mix(o.dress!, "#ffffff", 0.45);
    if (est !== "liso") p.clip(dp, () => {
      const x0 = 300 - D.a, x1 = 300 + D.a, y0 = chin, y1 = sole;
      if (est === "lunares") for (let y = y0, j = 0; y < y1; y += 16 * u, j++) for (let x = x0 + (j % 2) * 8 * u; x < x1; x += 16 * u) p.dot(x, y, 2.6 * u, ec);
      else if (est === "floreado") for (let i = 0; i < 40; i++) { const x = x0 + rnd(seed + i, 80) * 2 * D.a, y = y0 + rnd(seed + i, 81) * (y1 - y0); for (let k = 0; k < 5; k++) p.dot(x + Math.cos(k * 1.26) * 3.2 * u, y + Math.sin(k * 1.26) * 3.2 * u, 2.2 * u, ec); p.dot(x, y, 1.6 * u, "#f2c84b"); }
      else if (est === "cuadros") { for (let x = x0; x < x1; x += 16 * u) p.band([[x, y0], [x, y1]], "rgba(0,0,0,0.15)", 6 * u, 0); for (let y = y0; y < y1; y += 16 * u) p.band([[x0, y], [x1, y]], "rgba(0,0,0,0.15)", 6 * u, 0); }
      else if (est === "rayas") for (let x = x0; x < x1; x += 13 * u) p.band([[x, y0], [x, y1]], ec, 4 * u, 0);
    });
    p.inkRing(dp, ow, thick);
    const Sw: Blob = { a: 0.37 * W, b: 0.3 * HH, nTop: 2.2, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 0.006, seed: seed + 8 };
    const sp = blobPts(300, chin + 0.12 * HH, Sw);
    p.gradFill(sp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.inkRing(sp, ow * 0.9, thick);
    // sobre el vestido: delantal (niñera, enfermera, cocinera) y cuello blanco
    const AC = new Set(o.acc ?? []), ap = o.patron === "delantal" || o.patron === "uniforme_ninera" || o.patron === "uniforme_enfermera";
    if (ap) { const ac2 = o.patronCol ?? "#f8f6f0", y0 = chin + 0.3 * HH, y1 = sole - 0.42 * HH, apr: P2[] = [[300 - 0.32 * W, y0], [300 + 0.32 * W, y0], [300 + 0.4 * W, y1], [300 - 0.4 * W, y1]];
      p.poly(apr, ac2, 1.8 * u); p.band([[300 - 0.48 * W, y0 + 0.08 * HH], [300 + 0.48 * W, y0 + 0.08 * HH]], ac2, 3.4 * u, 1 * u);
      if (o.patron === "uniforme_enfermera") { p.poly([[300 - 4 * u, y0 + 0.16 * HH], [300 + 4 * u, y0 + 0.16 * HH], [300 + 4 * u, y0 + 0.3 * HH], [300 - 4 * u, y0 + 0.3 * HH]], "#d8443a", 0); p.poly([[300 - 11 * u, y0 + 0.2 * HH], [300 + 11 * u, y0 + 0.2 * HH], [300 + 11 * u, y0 + 0.25 * HH], [300 - 11 * u, y0 + 0.25 * HH]], "#d8443a", 0); } }
    if (AC.has("cuello_blanco") || o.patron === "uniforme_ninera" || o.patron === "uniforme_enfermera") for (const s of [-1, 1]) p.ell(300 + s * 9 * u, chin + 3 * u, 11 * u, 7 * u, "#ffffff", 1.2 * u);
    if (AC.has("collar_perlas")) for (let k = 0; k <= 10; k++) { const a2 = Math.PI * (0.15 + 0.7 * (k / 10)); p.ell(300 + Math.cos(a2) * 15 * u, chin + Math.sin(a2) * 10 * u, 2.2 * u, 2.2 * u, "#f8f4ec", 0.8 * u); }
  } else {
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.clip(tp, () => {
      const pc = o.patronCol ?? shade(o.jacket, 0.72), top = chin - 0.1 * HH, bot = torsoBot + 0.05 * HH, L0 = tcx - 1.2 * T.a, R0x = tcx + 1.2 * T.a;
      switch (o.patron) {
        case "acolchado": // rombos cosidos como un gambesón
          for (let k = -6; k <= 6; k++) { const x = tcx + k * 13 * u; p.stroke([[x - 60 * u, top], [x + 60 * u, bot]], 1.6 * u, shade(o.jacket, 0.68)); p.stroke([[x + 60 * u, top], [x - 60 * u, bot]], 1.6 * u, shade(o.jacket, 0.68)); }
          for (let k = -6; k <= 6; k++) for (let j = 0; j < 8; j++) p.dot(tcx + k * 13 * u, top + j * 13 * u, 1.3 * u, shade(o.jacket, 1.25));
          break;
        case "rayas": for (let y = top; y < bot; y += 11 * u) p.band([[L0, y], [R0x, y]], pc, 5 * u, 0); break;
        case "cuadros":
          for (let x = L0; x < R0x; x += 14 * u) p.band([[x, top], [x, bot]], "rgba(0,0,0,0.16)", 6 * u, 0);
          for (let y = top; y < bot; y += 14 * u) p.band([[L0, y], [R0x, y]], "rgba(0,0,0,0.16)", 6 * u, 0);
          break;
        case "parches": for (const [dx, dy, w2] of [[-0.45, 0.35, 14], [0.4, 0.62, 11]]) { const x = tcx + dx * T.a, y = top + dy * (bot - top);
          p.poly([[x - w2 * u, y - w2 * u], [x + w2 * u, y - w2 * 0.8 * u], [x + w2 * u, y + w2 * u], [x - w2 * 0.9 * u, y + w2 * u]], pc, 1.4 * u);
          for (let k = -2; k <= 2; k++) p.stroke([[x + k * 5 * u, y - w2 * u - 2 * u], [x + k * 5 * u, y - w2 * u + 2 * u]], 1 * u); } break;
        case "chaleco": for (const s of [-1, 1]) p.poly([[tcx + s * 6 * u, top], [tcx + s * 1.3 * T.a, top], [tcx + s * 1.3 * T.a, bot], [tcx + s * 10 * u, bot - 0.05 * HH]], pc, 1.8 * u); break;
        case "delantal": p.poly([[tcx - 0.55 * T.a, chin + 0.25 * HH], [tcx + 0.55 * T.a, chin + 0.25 * HH], [tcx + 0.75 * T.a, bot], [tcx - 0.75 * T.a, bot]], o.patronCol ?? "#f4ecd8", 1.8 * u);
          p.band([[L0, chin + 0.48 * HH], [R0x, chin + 0.48 * HH]], o.patronCol ?? "#f4ecd8", 3 * u, 1 * u); break;
        case "tunica": p.band([[L0, torsoBot - 0.28 * HH], [R0x, torsoBot - 0.28 * HH]], "#8a6a3a", 4 * u, 1.2 * u); p.stroke([[tcx + 4 * u, torsoBot - 0.28 * HH], [tcx + 8 * u, torsoBot + 0.02 * HH]], 2.2 * u, "#8a6a3a"); break;
        case "traje": case "gabardina": case "uniforme": case "bata": {
          // solapas en V con camisa (y corbata en traje/uniforme); gabardina cruzada con cinturón; uniforme con placa
          const cuello = chin - 0.02 * HH, vy = chin + (o.patron === "gabardina" ? 0.42 : 0.5) * HH;
          p.poly([[tcx - 13 * u, cuello], [tcx + 13 * u, cuello], [tcx, vy]], o.patron === "uniforme" ? shade(o.jacket, 1.25) : "#f2efe6", 1.2 * u);
          if (o.patron === "traje" || o.patron === "uniforme") { const cc = o.patron === "uniforme" ? "#1a1c24" : o.patronCol ?? "#8c2f3a";
            p.poly([[tcx - 3.5 * u, cuello + 3 * u], [tcx + 3.5 * u, cuello + 3 * u], [tcx + 5 * u, vy - 8 * u], [tcx, vy], [tcx - 5 * u, vy - 8 * u]], cc, 1.1 * u); }
          const sol = o.patron === "bata" ? "#ffffff" : shade(o.jacket, 0.82);
          for (const s of [-1, 1]) p.poly([[tcx + s * 13 * u, cuello], [tcx + s * 30 * u, cuello + 2 * u], [tcx + s * 17 * u, chin + 0.24 * HH], [tcx + s * 4 * u, vy]], sol, 1.4 * u);
          if (o.patron === "gabardina") { for (const s of [-1, 1]) for (let k = 0; k < 3; k++) p.dot(tcx + s * 12 * u, vy + 4 * u + k * 0.15 * HH, 2.6 * u, shade(o.jacket, 0.55));
            p.band([[L0, torsoBot - 0.22 * HH], [R0x, torsoBot - 0.22 * HH]], shade(o.jacket, 0.78), 6 * u, 1.2 * u); }
          if (o.patron === "uniforme") { const sx = tcx - 0.42 * T.a, sy = chin + 0.32 * HH, st: P2[] = [];
            for (let k = 0; k < 10; k++) { const an = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? 3.2 * u : 7.5 * u; st.push([sx + Math.cos(an) * rr, sy + Math.sin(an) * rr]); }
            p.poly(st, "#e8c45a", 1.2 * u);
            p.band([[L0, torsoBot - 0.24 * HH], [R0x, torsoBot - 0.24 * HH]], "#2a2420", 6 * u, 1.2 * u); p.band([[tcx - 0.9 * T.a, chin], [tcx + 0.7 * T.a, torsoBot - 0.24 * HH]], "#2a2420", 3 * u, 0.8 * u); }
          if (o.patron === "traje") p.poly([[tcx + 0.45 * T.a, chin + 0.3 * HH], [tcx + 0.7 * T.a, chin + 0.3 * HH], [tcx + 0.66 * T.a, chin + 0.36 * HH]], "#f2efe6", 0.8 * u);
          if (o.patron === "bata") for (const s of [-1, 1]) p.poly([[tcx + s * 0.35 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot - 0.12 * HH], [tcx + s * 0.35 * T.a, torsoBot - 0.12 * HH]], null, 1.2 * u);
          break;
        }
        case "capa": p.ell(tcx, chin + 0.08 * HH, 5 * u, 5 * u, "#e8c45a", 1.5 * u); break;
        case "terno": case "smoking": case "abrigo": case "abrigo_piel": case "toga": case "uniforme_militar": case "chaqueta_cuero": {
          const cuello = chin - 0.02 * HH, vy = chin + 0.46 * HH, negro = o.patron === "smoking";
          if (o.patron !== "chaqueta_cuero" && o.patron !== "uniforme_militar") p.poly([[tcx - 13 * u, cuello], [tcx + 13 * u, cuello], [tcx, vy]], o.patron === "toga" ? "#f4f1ea" : "#f2efe6", 1.2 * u);
          if (o.patron === "terno") { p.poly([[tcx - 10 * u, cuello + 6 * u], [tcx + 10 * u, cuello + 6 * u], [tcx, vy + 8 * u]], o.patronCol ?? shade(o.jacket, 0.75), 1 * u); for (let k = 0; k < 3; k++) p.dot(tcx, cuello + 14 * u + k * 9 * u, 1.8 * u, "#d9dde0"); }
          if (o.patron === "smoking") { p.poly([[tcx - 9 * u, cuello + 4 * u], [tcx, cuello + 8 * u], [tcx - 9 * u, cuello + 12 * u]], "#111", 0.8 * u); p.poly([[tcx + 9 * u, cuello + 4 * u], [tcx, cuello + 8 * u], [tcx + 9 * u, cuello + 12 * u]], "#111", 0.8 * u); }
          if (o.patron === "toga") { for (const s of [-1, 1]) p.poly([[tcx + s * 2 * u, cuello + 2 * u], [tcx + s * 6 * u, cuello + 2 * u], [tcx + s * 6 * u, cuello + 22 * u], [tcx + s * 2 * u, cuello + 22 * u]], "#f4f1ea", 0.8 * u);
            for (let k = -2; k <= 2; k++) p.stroke([[tcx + k * 0.38 * T.a, chin + 0.2 * HH], [tcx + k * 0.42 * T.a, bot]], 1.4 * u, shade(o.jacket, 0.6)); }
          if (o.patron === "abrigo" || o.patron === "abrigo_piel") for (const s of [-1, 1]) for (let k = 0; k < 3; k++) p.dot(tcx + s * 11 * u, vy + 6 * u + k * 0.15 * HH, 2.8 * u, shade(o.jacket, 0.55));
          if (o.patron === "uniforme_militar") { for (const s of [-1, 1]) { p.poly([[tcx + s * 0.25 * T.a, chin + 0.22 * HH], [tcx + s * 0.7 * T.a, chin + 0.22 * HH], [tcx + s * 0.7 * T.a, chin + 0.42 * HH], [tcx + s * 0.25 * T.a, chin + 0.42 * HH]], shade(o.jacket, 0.88), 1.2 * u); p.dot(tcx + s * 0.47 * T.a, chin + 0.25 * HH, 2 * u, "#c9a03a"); }
            p.band([[L0, torsoBot - 0.24 * HH], [R0x, torsoBot - 0.24 * HH]], "#4a3a24", 6 * u, 1.2 * u); }
          if (o.patron === "chaqueta_cuero") { p.stroke([[tcx, chin + 0.1 * HH], [tcx, bot]], 1.6 * u, "#c9a03a"); }
          const sol = negro ? "#111114" : o.patron === "toga" ? shade(o.jacket, 0.85) : shade(o.jacket, 0.82);
          if (o.patron !== "uniforme_militar") for (const s of [-1, 1]) p.poly([[tcx + s * 13 * u, cuello], [tcx + s * 30 * u, cuello + 2 * u], [tcx + s * 17 * u, chin + 0.24 * HH], [tcx + s * 4 * u, vy]], sol, 1.4 * u);
          break;
        }
        case "sueter": for (let x = L0; x < R0x; x += 7 * u) p.stroke([[x, top], [x, bot]], 1.2 * u, shade(o.jacket, 0.78));
          p.band([[L0, bot - 0.06 * HH], [R0x, bot - 0.06 * HH]], shade(o.jacket, 0.85), 0.1 * HH, 1 * u);
          for (const s of [-1, 1]) p.poly([[tcx, chin], [tcx + s * 12 * u, chin - 2 * u], [tcx + s * 9 * u, chin + 9 * u]], "#f2efe6", 1 * u); break;
        case "overol": { const bc = o.patronCol ?? o.pants; p.poly([[tcx - 0.55 * T.a, chin + 0.3 * HH], [tcx + 0.55 * T.a, chin + 0.3 * HH], [tcx + 0.6 * T.a, bot], [tcx - 0.6 * T.a, bot]], bc, 1.4 * u);
          for (const s of [-1, 1]) { p.band([[tcx + s * 0.5 * T.a, chin + 0.3 * HH], [tcx + s * 0.75 * T.a, top]], bc, 6 * u, 1 * u); p.dot(tcx + s * 0.45 * T.a, chin + 0.34 * HH, 2.4 * u, "#c9a03a"); }
          p.poly([[tcx - 0.2 * T.a, chin + 0.42 * HH], [tcx + 0.2 * T.a, chin + 0.42 * HH], [tcx + 0.2 * T.a, chin + 0.58 * HH], [tcx - 0.2 * T.a, chin + 0.58 * HH]], shade(bc, 0.9), 1 * u); break; }
        case "pijama": for (let x = L0; x < R0x; x += 12 * u) p.band([[x, top], [x, bot]], o.patronCol ?? mix(o.jacket, "#ffffff", 0.5), 3.5 * u, 0);
          p.poly([[tcx - 13 * u, chin - 0.02 * HH], [tcx + 13 * u, chin - 0.02 * HH], [tcx, chin + 0.3 * HH]], shade(o.jacket, 0.8), 1.2 * u); break;
        case "mameluco": for (let k = 0; k < 4; k++) p.dot(tcx, chin + 0.12 * HH + k * 0.16 * HH, 2.2 * u, "#f4f1ea");
          p.arc(tcx, chin + 2 * u, 14 * u, 8 * u, 0, 180, 4 * u, mix(o.jacket, "#ffffff", 0.5)); break;
        case "rayas_preso": for (let y = top; y < bot; y += 16 * u) p.band([[L0, y], [R0x, y]], "#1c1c20", 8 * u, 0); break;
        case "camisa": for (const s of [-1, 1]) p.poly([[tcx, chin], [tcx + s * 13 * u, chin - 2 * u], [tcx + s * 10 * u, chin + 10 * u]], shade(o.jacket, 1.1), 1.2 * u);
          p.poly([[tcx + 0.35 * T.a, chin + 0.3 * HH], [tcx + 0.7 * T.a, chin + 0.3 * HH], [tcx + 0.7 * T.a, chin + 0.46 * HH], [tcx + 0.35 * T.a, chin + 0.46 * HH]], null, 1 * u); break;
        case "uniforme_enfermera": p.poly([[tcx - 4 * u, chin + 0.22 * HH], [tcx + 4 * u, chin + 0.22 * HH], [tcx + 4 * u, chin + 0.3 * HH], [tcx - 4 * u, chin + 0.3 * HH]], "#d8443a", 0); p.poly([[tcx - 10 * u, chin + 0.24 * HH], [tcx + 10 * u, chin + 0.24 * HH], [tcx + 10 * u, chin + 0.28 * HH], [tcx - 10 * u, chin + 0.28 * HH]], "#d8443a", 0);
          for (const s of [-1, 1]) p.poly([[tcx, chin], [tcx + s * 15 * u, chin - 2 * u], [tcx + s * 12 * u, chin + 9 * u]], "#ffffff", 1.2 * u); break;
        case "uniforme_ninera": // cuello blanco redondo y delantal blanco: la ropa de una niñera de casa grande
          p.poly([[tcx - 0.55 * T.a, chin + 0.25 * HH], [tcx + 0.55 * T.a, chin + 0.25 * HH], [tcx + 0.75 * T.a, bot], [tcx - 0.75 * T.a, bot]], o.patronCol ?? "#f8f6f0", 1.8 * u);
          p.band([[L0, chin + 0.48 * HH], [R0x, chin + 0.48 * HH]], o.patronCol ?? "#f8f6f0", 3 * u, 1 * u);
          for (const s of [-1, 1]) p.ell(tcx + s * 9 * u, chin + 3 * u, 11 * u, 7 * u, "#ffffff", 1.2 * u); break;
      }
      // accesorios sobre la ropa
      if (ACC.has("tirantes")) for (const s of [-1, 1]) p.band([[tcx + s * 0.45 * T.a, top], [tcx + s * 0.4 * T.a, bot]], o.accCol ?? "#5a3a24", 4 * u, 0.8 * u);
      if (ACC.has("cuello_blanco")) for (const s of [-1, 1]) p.ell(tcx + s * 9 * u, chin + 3 * u, 11 * u, 7 * u, "#ffffff", 1.2 * u);
      if (ACC.has("corbata")) p.poly([[tcx - 3.5 * u, chin + 1 * u], [tcx + 3.5 * u, chin + 1 * u], [tcx + 5 * u, chin + 0.42 * HH], [tcx, chin + 0.48 * HH], [tcx - 5 * u, chin + 0.42 * HH]], o.accCol ?? "#8c2f3a", 1.1 * u);
      if (ACC.has("reloj_bolsillo")) p.arc(tcx + 0.3 * T.a, chin + 0.44 * HH, 0.3 * T.a, 0.06 * HH, 0, 180, 1.2 * u, "#e8c45a");
      if (ACC.has("placa")) p.poly([[tcx - 0.5 * T.a - 6 * u, chin + 0.26 * HH], [tcx - 0.5 * T.a + 6 * u, chin + 0.26 * HH], [tcx - 0.5 * T.a + 7 * u, chin + 0.34 * HH], [tcx - 0.5 * T.a, chin + 0.42 * HH], [tcx - 0.5 * T.a - 7 * u, chin + 0.34 * HH]], "#e8c45a", 1.2 * u);
      if (ACC.has("flor_solapa")) { p.ell(tcx - 0.5 * T.a, chin + 0.2 * HH, 4 * u, 4 * u, o.accCol ?? "#e2453c", 1 * u); }
      if (ACC.has("credencial_prensa") && o.hat !== "fedora") { p.poly([[tcx + 0.3 * T.a, chin + 0.2 * HH], [tcx + 0.7 * T.a, chin + 0.2 * HH], [tcx + 0.7 * T.a, chin + 0.34 * HH], [tcx + 0.3 * T.a, chin + 0.34 * HH]], "#f4f1ea", 1 * u); p.stroke([[tcx + 0.35 * T.a, chin + 0.25 * HH], [tcx + 0.65 * T.a, chin + 0.25 * HH]], 1.6 * u, "#222"); }
      if (o.belt && o.cintura) {
        p.band([[tcx - 1.0 * T.a, torsoBot - 0.14 * HH], [tcx + 1.0 * T.a, torsoBot - 0.14 * HH]], o.belt!, 4.5 * u, 1.4 * u);
        p.poly([[tcx - 4 * u, torsoBot - 0.14 * HH - 3.5 * u], [tcx + 4 * u, torsoBot - 0.14 * HH - 3.5 * u], [tcx + 4 * u, torsoBot - 0.14 * HH + 3.5 * u], [tcx - 4 * u, torsoBot - 0.14 * HH + 3.5 * u]], "#c9a03a", 1.2 * u);
      } else if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T.a, chin - 0.05 * HH], [tcx + s * 0.8 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * T.a, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly([[xc - 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc + 3.5 * u], [xc - 3.5 * u, yc + 3.5 * u]], "#d9dde0", 1.5 * u);
      }
      if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      for (let i = 0; i < 4; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        p.dot(tcx + 2 * u * facing, y, 2.2 * u + 0.8 * u, INK); p.dot(tcx + 2 * u * facing, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
    });
    if (o.sash) { const s = facing || 1; p.poly([[tcx + s * 0.55 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.45 * T.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u); }
    p.inkRing(tp, ow, thick);
  }
  {
    const ACC2 = new Set(o.acc ?? []);
    if (o.patron === "abrigo_piel" || o.patron === "chaqueta_cuero") for (let k = 0; k < 9; k++) { const t2 = k / 8, x = tcx + (t2 - 0.5) * 0.9 * W * 0.5; p.ell(x, chin + 0.04 * HH + Math.sin(t2 * Math.PI) * 4 * u, 8 * u, 6 * u, o.patron === "abrigo_piel" ? "#d8ccb8" : "#efe6d4", 1.2 * u); }
    if (ACC2.has("pajarita") || o.patron === "smoking") { const c = o.patron === "smoking" ? "#111" : o.accCol ?? "#8c2f3a"; p.poly([[tcx, chin + 3 * u], [tcx - 9 * u, chin - 3 * u], [tcx - 9 * u, chin + 9 * u]], c, 1 * u); p.poly([[tcx, chin + 3 * u], [tcx + 9 * u, chin - 3 * u], [tcx + 9 * u, chin + 9 * u]], c, 1 * u); }
    if (ACC2.has("bufanda")) { const c = o.accCol ?? "#a8433a"; p.band([[tcx - 0.5 * T.a, chin + 2 * u], [tcx + 0.5 * T.a, chin + 2 * u]], c, 9 * u, 1.2 * u); p.poly([[tcx + 0.15 * T.a, chin + 4 * u], [tcx + 0.4 * T.a, chin + 4 * u], [tcx + 0.42 * T.a, chin + 0.5 * HH], [tcx + 0.18 * T.a, chin + 0.5 * HH]], c, 1.2 * u); }
    if (ACC2.has("collar_perlas")) for (let k = 0; k <= 10; k++) { const a2 = Math.PI * (0.15 + 0.7 * (k / 10)); p.ell(tcx + Math.cos(a2) * 15 * u, chin + Math.sin(a2) * 10 * u, 2.2 * u, 2.2 * u, "#f8f4ec", 0.8 * u); }
  }
  // in front of the body: hands holding props
  for (const a of arms) if (a.front) {
    drawArm(a);
    const [hx, hy] = a.pts[2];
    if (prop === "icecream") {
      p.poly([[hx - 8 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u], [hx, hy + 7 * u]], "#e0a35a", 1.8 * u);
      p.ell(hx, hy - 19 * u, 11 * u, 10 * u, "#f7c6d9", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop)) {
      const ang = rad(-70 + 105 * clamp(prop[1], 0, 1));
      const Rh = (pts: P2[]) => rotPts(pts, ang, hx, hy);
      p.band(Rh([[hx, hy + 12 * u], [hx, hy - 44 * u]]), "#8a5a34", 5 * u, 1.5 * u, "round");
      p.poly(Rh([[hx - 12 * u, hy - 58 * u], [hx + 20 * u, hy - 58 * u], [hx + 20 * u, hy - 42 * u], [hx - 12 * u, hy - 42 * u]]), "#7d848c", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    }
  }
  if (prop === "shako") { // carried by the left hand
    const [hx, hy] = arms[0].pts[2];
    p.poly([[hx - 14 * u, hy + 3 * u], [hx + 14 * u, hy + 3 * u], [hx + 16 * u, hy + 30 * u], [hx - 16 * u, hy + 30 * u]], "#3a3d47", 2.2 * u);
    p.ell(hx, hy + 31 * u, 3.5 * u, 3.5 * u, "#2b7a4b", 1.5 * u);
    p.dot(hx, hy, 5.5 * u);
  }
  const tarde = gesture === "photo" || gesture === "cover";   // manos (y cámara) delante de la cara: se dibujan después de la cabeza
  if (held && gesture !== "eat" && !tarde) {
    // la mano que sostiene: entre las dos si carga con ambas, si no la más a la derecha
    let hp2: P2;
    if (gesture === "carry" || gesture === "push" || gesture === "read" || gesture === "steer") { const a0 = arms[0].pts[2], a1 = arms[1].pts[2]; hp2 = gesture === "push" ? a1 : lerp2(a0, a1, 0.5); }
    else if (gesture === "write") hp2 = arms[0].pts[2];
    else hp2 = arms.reduce((b, a) => (a.pts[2][0] > b[0] ? a.pts[2] : b), arms[0].pts[2]);
    drawHeld(p, held, hp2[0], hp2[1], u, gesture === "carry" || gesture === "read");
    p.dot(hp2[0], hp2[1], 5.5 * u);
    if (gesture === "write") { const [px, py] = arms[1].pts[2]; p.stroke([[px - 2 * u, py + 6 * u], [px + 8 * u, py - 12 * u]], 2.2 * u, "#c9a03a"); p.dot(px, py, 5.5 * u); }
  }
  // enumerar: dedos levantados en la mano izquierda (1, 2, 3 según el tiempo)
  if (gesture === "count" && arms[0] && mode !== "sit") { const [hx, hy] = arms[0].pts[2], nd = 1 + Math.round(clamp(gk, 0, 1) * 2);
    for (let k = 0; k < nd; k++) { const an = rad(-112 + k * 22); p.stroke([[hx, hy], [hx + Math.cos(an) * 13 * u, hy + Math.sin(an) * 13 * u]], 3.4 * u, INK); }
    p.dot(hx, hy, 5.5 * u); }
  // ---- head: rotates with the body, plus its own tilt about the chin ----
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  hatBehind(p, o, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, 300, hc, light, seed, facing, false);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap";
  if (back) { // nuca: el pelo tapa la cabeza (si no es calvo); sin cara
    if (o.pelo !== "calvo" || (o.hat && o.hat !== "hair")) p.shadedFill(blobPts(300, hc + 0.04 * H.b, { ...H, a: H.a * 0.98, b: H.b * 0.96 }), o.hair ?? "#4a3020", mul(o.hair ?? "#4a3020", SH_SKIN), light, H.a);
    hatOn(p, o, hp, H, 300, hc, light, seed, 0, false);
  } else
  faceFront(p, 300, hc + Math.max(-0.7, Math.min(1, nod)) * 0.24 * H.b, W, expr, facing, look, lid, brim, skin, o.moustache, o.build === "stout", [...(o.rasgos ?? []), ...(o.acc ?? [])], o.barba ?? o.hair ?? "#4a3020");
  if (o.acc?.includes("aretes")) for (const s of [-1, 1]) p.ell(300 + s * 0.96 * H.a, hc + 0.3 * H.b, 3.4 * u, 3.4 * u, o.accCol ?? "#e8c45a", 1 * u);
  if (tarde) { // antebrazos y manos encima de la cara; la cámara de prensa tapa la cara del fotógrafo
    for (const a of arms) { p.stroke(curve(lerp2(a.pts[0], a.pts[1], 0.6), a.pts[1], a.pts[2]), 5.2 * u, armCol); }
    if (held && gesture === "photo") drawHeld(p, held, 300, hc + 0.62 * H.b, u, true);
    for (const a of arms) p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u);
  }
  p.rot = null;
  if (held && gesture === "eat") { // al comer, el objeto va delante de la boca (encima de la cabeza)
    const a = arms[arms.length - 1], [hx, hy] = a.pts[2];
    drawHeld(p, held, hx - 6 * u, hy + 6 * u, u * 0.8, false);
    p.dot(hx, hy + 8 * u, 5.5 * u);
  }
};

export type SideOpts = {
  phase?: number; expr?: Expr; mode?: "march" | "stand" | "swing" | "push"; blink?: boolean | number; stomp?: number; pose?: number;
  /** step length as a multiple of 0.8 m (370 units): matches 1.6 m/s at 2 steps/s; scale by the view's foreshortening */
  stride?: number; light?: number; seed?: number;
  /** push mode: where the hands land at pose 1, in final canvas units (e.g. the swing kid's back) */
  hand?: [number, number];
};

/** two-bone leg, knee bending forward (+x) */
const ik = (hip: P2, ank: P2, l1: number, l2: number): P2 => {
  const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 0.01);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) - A;
  return [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)];
};

/** hip height of the seated kid in `swing` mode (design units); swingKid seats the torso bottom on the plank */
const SWING_HIP = 733;

/** side view facing screen-right; march footfalls land at phase 0 (near foot) and 0.5 (far foot), like the front view.
 *  The stance foot is planted: it slides back at exactly the walking speed while the hip rises and falls over it. */
export const bodySide = (p: Pen, o: Outfit, opts: SideOpts) => {
  const { phase = 0, expr = "neutral", mode = "march", blink = false, stomp = 1, pose = 0, stride = 1, light = DEF_LIGHT, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H: Blob = { ...headBlob(seed, Bd.a, 1), asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, ankY = sole - 4 * u;
  const thick = thickAngle(light), ow = 5 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const nearCol = mix(o.pants, INK, 0.55), farCol = mix(o.pants, INK, 0.75), footCol = o.boots;
  type LegS = { ank: P2; pitch: number; near: boolean };
  const legs: LegS[] = [];
  let hipY = ankY - legLen * 0.995, lean = 0, nearFwd = 0;
  if (mode === "march") {
    const S = 370 * stride, liftH = Math.max(22, 40 + 70 * (stomp - 1));
    const st = (ph: number) => {
      const c = (((phase + ph) % 1) + 1) % 1;
      if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - 0.5) / 0.5; // swing: cycloid in world space, so the foot leaves and lands at zero ground speed
      return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    for (const [L, near] of [[fL, false], [nL, true]] as const)
      legs.push({ ank: [300 + L.x, ankY - L.h], pitch: L.stance ? 0 : rad(35 * Math.sin(Math.PI * L.s) * (1 - 1.6 * L.s)), near });
    lean = 4 + 3 * Math.cos(2 * two * phase); // 7 deg at contact, 1 deg at passing
    nearFwd = nL.x / (S / 2);
  } else if (mode === "push") {
    hipY = ankY - 0.87 * legLen;
    legs.push({ ank: [300 - 0.5 * legLen, ankY], pitch: rad(-8), near: false }, { ank: [300 + 0.32 * legLen, ankY], pitch: 0, near: true });
    lean = 14 * pose;
  } else if (mode === "swing") {
    hipY = SWING_HIP;
    const a = rad(60 * pose);
    for (const [dx, near] of [[-6, false], [0, true]] as const) {
      const knee: P2 = [300 + l1 * 0.98 + dx * u, hipY + 6 * u];
      legs.push({ ank: [knee[0] + l2 * Math.sin(a), knee[1] + l2 * Math.cos(a)], pitch: -a * 0.5, near });
    }
  } else {
    legs.push({ ank: [300 - 4 * u, ankY], pitch: 0, near: false }, { ank: [300 + 4 * u, ankY], pitch: 0, near: true });
  }
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hip: P2 = [300, hipY];
  p.rot = null;
  for (const L of legs) {
    const knee = mode === "swing" ? ([300 + l1 * 0.98 + (L.near ? 0 : -6 * u), hipY + 6 * u] as P2) : ik(hip, L.ank, l1, l2);
    const hp0: P2 = [300 + (L.near ? 0 : -5 * u), hipY];
    p.stroke([hp0, knee, L.ank], 5.8 * u, L.near ? nearCol : farCol);
    const c = Math.cos(L.pitch), s = Math.sin(L.pitch);
    footStroke(p, [L.ank[0] - 3 * u * c, L.ank[1] - 3 * u * s], [L.ank[0] + 13 * u * c, L.ank[1] + 13 * u * s + 0.5 * u],
      7.5 * u, L.near ? footCol : footCol === INK ? INK : shade(footCol, 0.82));
  }
  // ---- upper body leans about the hip ----
  p.rot = lean ? [rad(lean), 300, hipY] : null;
  const T: Blob = { a: (o.build === "stout" ? 0.36 : 0.31) * W, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.5, egg: 0.1, asym: 0.06,
    rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 2 * u, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const armCol = mix(o.jacket, INK, 0.5), farArm = mix(o.jacket, INK, 0.68);
  const S: P2 = [tcx + 0.05 * T.a, chin + 0.14 * HH], aLen = 0.95 * HH;
  const swingArm = (ang: number): [P2, P2, P2] => {
    const e: P2 = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(16) * Math.sign(ang || 1);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const rifle = !!o.rifle && (mode === "march" || mode === "stand");
  const B0: P2 = [tcx + 0.72 * T.a, chin + 0.58 * HH], B1: P2 = [tcx - 0.95 * T.a - 22 * u, crown - 0.4 * HH];
  let near: [P2, P2, P2], far: [P2, P2, P2] | null;
  if (mode === "swing") { near = [S, [S[0] + 12 * u, S[1] - 0.16 * HH], [300 + 6 * u, chin - 0.3 * HH]]; far = [S, [S[0] + 8 * u, S[1] - 0.18 * HH], [300 + 2 * u, chin - 0.36 * HH]]; }
  else if (mode === "push") {
    const reach = 0.55 * HH + 0.45 * HH * pose;
    let hN: P2 = [S[0] + reach, S[1] + 0.06 * HH];
    if (opts.hand) {
      // target is in final canvas units; the arm is drawn inside the lean rotation, so undo it
      const th = -rad(lean), dx = opts.hand[0] - 300, dy = opts.hand[1] - hipY;
      const tg: P2 = [300 + dx * Math.cos(th) - dy * Math.sin(th), hipY + dx * Math.sin(th) + dy * Math.cos(th)];
      hN = [hN[0] + (tg[0] - hN[0]) * pose, hN[1] + (tg[1] - hN[1]) * pose];
    }
    near = [S, [(S[0] + hN[0]) / 2, (S[1] + hN[1]) / 2 + 0.06 * HH], hN];
    far = [S, [(S[0] + hN[0]) / 2 - 4 * u, (S[1] + hN[1]) / 2 - 0.02 * HH], [hN[0] - 6 * u, hN[1] - 0.08 * HH]];
  } else if (rifle) { near = [S, [S[0] - 4 * u, S[1] + 0.42 * HH], B0]; far = mode === "march" ? swingArm(rad(30) * nearFwd) : swingArm(0); }
  else { near = swingArm(rad(-30) * nearFwd); far = mode === "march" ? swingArm(rad(30) * nearFwd) : null; }
  if (far) { p.stroke(curve(far[0], far[1], far[2]), 5.2 * u, farArm); p.dot(far[2][0], far[2][1], 5.5 * u); }
  if (o.dress) { // falda del vestido al caminar de perfil
    const sk: P2[] = [[tcx - 0.8 * T.a, torsoBot - 0.3 * HH], [tcx + 0.9 * T.a, torsoBot - 0.3 * HH], [tcx + 1.25 * T.a + 6 * u * Math.sin(two * phase), sole - 0.36 * HH], [tcx - 1.15 * T.a - 6 * u * Math.sin(two * phase), sole - 0.36 * HH]];
    p.gradFill(sk, o.dress, mul(o.dress, SH_CLOTH), light); p.poly(sk, null, ow * 0.9);
  }
  if (o.patron === "gabardina" || o.patron === "abrigo" || o.patron === "abrigo_piel" || o.patron === "toga" || o.patron === "bata") {
    const y1 = sole - (o.patron === "toga" ? 0.12 : 0.36) * HH, sk: P2[] = [[tcx - 0.9 * T.a, torsoBot - 0.25 * HH], [tcx + 0.95 * T.a, torsoBot - 0.25 * HH], [tcx + 1.1 * T.a, y1], [tcx - 1.05 * T.a, y1]];
    p.gradFill(sk, o.jacket, mul(o.jacket, SH_CLOTH), light); p.poly(sk, null, ow * 0.9);
  }
  p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
  p.clip(tp, () => {
    if (o.belt && !o.cintura) p.band([[tcx - 0.65 * T.a, chin - 0.05 * HH], [tcx + 0.75 * T.a, torsoBot - 0.1 * HH]], o.belt!, 5.5 * u, 1.8 * u);
    else if (o.belt) p.band([[tcx - 0.9 * T.a, torsoBot - 0.14 * HH], [tcx + 0.9 * T.a, torsoBot - 0.14 * HH]], o.belt!, 4.5 * u, 1.4 * u);
    if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
    if (!o.dress) for (let i = 0; i < 3; i++) { const y = chin + 0.16 * HH + i * 0.24 * HH; p.dot(tcx + 0.8 * T.a, y, 3 * u, INK); p.dot(tcx + 0.8 * T.a, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7)); }
  });
  p.inkRing(tp, ow, thick);
  if (rifle) {
    p.band([B0, B1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(B0, B1, 0.6), B1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  p.stroke(curve(near[0], near[1], near[2]), 5.2 * u, armCol); p.dot(near[2][0], near[2][1], 5.5 * u);
  // ---- head ----
  const hx = 300 + 4 * u;
  hatBehind(p, o, H, hx, hc, light, thick, ow, true);
  const hp = blobPts(hx, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, hx, hc, light, seed, 1, true);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap";
  faceSide(p, hx, hc, W, expr, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};

/** rope + seat + seated kid on a 700 x 2300 canvas; the pivot is design (350, 20); kid drawn at 0.92 scale */
export const swingKid = (p: Pen, o: Outfit, kick: number, expr: Expr, light = DEF_LIGHT, blink: number = 0) => {
  const rope = 1830, k = 1.1, HH = 2 * headBlob(5, BUILD[o.build ?? "adult"].a, 1).b;
  // two ropes from the pivot to the ends of a wide plank, the kid framed between them: a single rope behind the kid
  // ended at the cap and read as a hanging. Far rope behind the kid, near rope drawn over (clear of the face).
  const seat = rope + 18, x0 = 150, x1 = 550;
  p.line([[350, 20], [x0 + 16, seat + 4]], "#a07a4c", 10);
  p.poly(rrect(x0, seat, x1, seat + 36, 10), "#b5653f", 9);
  const g = p.g;
  g.save();
  g.translate(350 - 300 * k, rope + 18 - (SWING_HIP + 0.12 * HH) * k);
  g.scale(k, k);
  bodySide(new Pen(g), o, { expr, mode: "swing", pose: kick, light, seed: 5, blink });
  g.restore();
  p.line([[350, 20], [x1 - 16, seat + 4]], "#a07a4c", 10);
};

// ---------------- effects ----------------
export const fxNote = (p: Pen, kind: number, col = "#1f2a44") => {
  p.ell(70, 200, 46, 34, col, 8, 0, 360, -20);
  p.stroke([[110, 190], [110, 40]], 14);
  if (kind === 0) p.poly([[110, 40], [170, 70], [170, 110], [110, 82]], col, 8);
  else {
    p.ell(150, 170, 40, 30, col, 8, 0, 360, -20);
    p.stroke([[186, 160], [186, 20]], 14);
    p.poly([[110, 40], [186, 20], [186, 50], [110, 70]], col, 8);
  }
};

/** spark / impact star on a 500 x 500 canvas; t in 0..1 */
export const fxBurst = (p: Pen, t: number, col = "#fff3b0", rays = 10, r0 = 40, r1 = 230) => {
  const c = 250, e = 1 - (1 - t) ** 3;
  for (let i = 0; i < rays; i++) {
    const a = rad((i * 360) / rays + 7 * (i % 2)), ra = r0 + (r1 - r0) * e * (0.75 + 0.25 * (i % 2));
    p.poly([[c + r0 * 0.5 * Math.cos(a + 0.18), c + r0 * 0.5 * Math.sin(a + 0.18)], [c + ra * Math.cos(a), c + ra * Math.sin(a)],
      [c + r0 * 0.5 * Math.cos(a - 0.18), c + r0 * 0.5 * Math.sin(a - 0.18)]], col, Math.max(3, 8 * (1 - t)));
  }
  if (t < 0.5) p.ell(c, c, r0 * (1.4 - t), r0 * (1.4 - t), WHITE, 8);
};

/** water splash crown on an 800 x 800 canvas; t in 0..1 */
export const fxSplash = (p: Pen, t: number) => {
  const c = 400, size = 800, rise = Math.sin(Math.min(1, t * 1.3) * Math.PI);
  const blue = "#bfe8ff", deep = "#6cc0f0";
  if (rise > 0.02) {
    const pts: P2[] = [];
    for (let i = 0; i < 19; i++) {
      const h = (i % 2 ? 260 : 130) * rise * (0.7 + 0.3 * Math.sin(i * 1.7));
      pts.push([c - 330 + (660 * i) / 18, size - 120 - h]);
    }
    p.poly([...pts, [c + 330, size - 90], [c - 330, size - 90]], blue, 10);
    p.ell(c, size - 100, 360, 46, deep, 10);
  }
  for (let i = 0; i < 8; i++) {
    const a = rad(200 + i * 18), d = 120 + 380 * t, y = size - 160 + d * Math.sin(a) + 520 * t * t, r = 26 * (1 - t) + 6;
    if (t > 0.08 && y < size - 40) p.ell(c + d * Math.cos(a), y, r, r * 1.25, blue, 7);
  }
};

/** dust puff on a 300 x 300 canvas; t in 0..1 */
export const fxPuff = (p: Pen, t: number) => {
  for (let i = 0; i < 5; i++) {
    const a = rad(160 + i * 55), d = 40 + 70 * t, r = (34 + 20 * (i % 2)) * (1 - 0.6 * t);
    p.ell(150 + d * Math.cos(a), 180 + d * 0.45 * Math.sin(a), r, r * 0.8, `rgba(238,225,205,${(1 - t).toFixed(3)})`, 0);
  }
};

/** circling stars on a 420 x 210 canvas */
export const fxStars = (p: Pen, t: number) => {
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 2 + (i * Math.PI) / 2, x = 210 + 150 * Math.cos(a), y = 110 + 40 * Math.sin(a), pts: P2[] = [];
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 14 : 34, b = rad(k * 36 - 90); pts.push([x + r * Math.cos(b), y + r * Math.sin(b)]); }
    p.poly(pts, "#ffd84a", 6);
  }
};

/** three jittering strain ticks on a 300 x 300 canvas */
export const fxCreak = (p: Pen, t: number) => {
  const j = 6 * Math.sin(t * 40);
  for (const a of [-30, 0, 30]) {
    const b = rad(a - 90);
    p.stroke([[150 + 70 * Math.cos(b) + j, 230 + 70 * Math.sin(b)], [150 + 100 * Math.cos(b) + 10 + j, 230 + 100 * Math.sin(b)],
      [150 + 130 * Math.cos(b) + j, 230 + 130 * Math.sin(b)]], 10);
  }
};

/** flat water ring (drawn top-down) on a 600 x 600 canvas; t in 0..1 */
export const fxRing = (p: Pen, t: number) => {
  // thin light water rings (white crest, pale blue trailing rings), thinning as they spread
  const g = p.g;
  for (let k = 0; k < 3; k++) {
    const u = t - k * 0.22;
    if (u <= 0 || u >= 1) continue;
    g.beginPath(); g.ellipse(300, 300, 60 + 230 * u, 60 + 230 * u, 0, 0, Math.PI * 2);
    g.strokeStyle = k === 0 ? "#f6fcff" : "#cfe8fa"; g.lineWidth = 9 * (1 - u) + 3; g.stroke();
  }
};

/** text-free sign on a 700 x 520 canvas: "no marching in step on the bridge". A bridge (deck + arch + piers), four
 *  identical pairs of marching legs in the same stride (in step), a bold red X over all of it. */
export const fxSign = (p: Pen) => {
  const g = p.g, RED = "#d42f2f";
  p.poly(rrect(14, 14, 686, 506, 40), "#f6ecd2", 0);
  p.poly(rrect(14, 14, 686, 506, 40), null, 14);
  // bridge: deck, stone arch underneath, two piers
  p.poly(rrect(70, 352, 630, 384, 8), "#8a5a3a", 9);
  g.beginPath(); g.moveTo(112, 470); g.quadraticCurveTo(350, 300, 588, 470);
  g.strokeStyle = INK; g.lineWidth = 16; g.lineCap = "round"; g.stroke();
  for (const x of [88, 612]) p.poly(rrect(x - 16, 384, x + 16, 470, 4), "#8a5a3a", 9);
  // four identical soldiers' legs mid-stride: same leg forward on every one = in step
  for (const x of [150, 278, 406, 534]) {
    p.poly(rrect(x - 30, 150, x + 30, 214, 14), "#357650", 9);                  // coat hem
    p.stroke([[x - 8, 210], [x + 34, 262], [x + 46, 338]], 15, INK);           // front leg
    p.stroke([[x + 6, 210], [x - 12, 274], [x - 36, 336]], 15, INK);           // back leg
    p.poly(rrect(x + 30, 330, x + 74, 350, 9), INK, 0);                          // boots point forward
    p.poly(rrect(x - 52, 328, x - 8, 348, 9), INK, 0);
  }
  // big red X
  for (const [a, b] of [[[96, 70], [604, 452]], [[604, 70], [96, 452]]] as [[number, number], [number, number]][]) {
    p.stroke([a, b], 58, "#ffffff");
    p.stroke([a, b], 42, RED);
  }
};

/** soft cartoon cloud on a 600 x 300 canvas */
export const fxCloud = (p: Pen, seed: number) => {
  const blobs: [number, number, number][] = [[150, 190, 80], [250, 150, 105], [360, 160, 95], [450, 195, 70], [300, 210, 90]];
  for (const [x, y, r] of blobs) p.ell(x + ((seed * 37) % 20) - 10, y, r, r * 0.8, "#ffffff", 0);
  p.ell(300, 235, 230, 40, "#ffffff", 0);
};

/** cast shadow on a 128 x 256 canvas: dark soft contact pool at the feet (y 205) and a softer tail that runs up the
 *  canvas = away from the sun, fading with distance; multiply colour (sRGB-encoded linear ratio), white = no change */
export const fxShadow = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 256);
  g.save(); g.filter = "blur(9px)";
  const lg = g.createLinearGradient(0, 205, 0, 22);
  lg.addColorStop(0, mix(col, WHITE, 0.08)); lg.addColorStop(0.55, mix(col, WHITE, 0.3)); lg.addColorStop(1, mix(col, WHITE, 0.85));
  g.fillStyle = lg;
  g.beginPath(); g.moveTo(40, 205); g.bezierCurveTo(36, 120, 46, 50, 64, 30); g.bezierCurveTo(82, 50, 92, 120, 88, 205); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(64, 205, 30, 17, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};

/** tight contact shadow right under the feet on a 128 x 128 canvas: dark core, short fall-off (multiply colour) */
export const fxContact = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.32, 0.02], [0.5, 0.22], [0.66, 0.58], [0.82, 0.88], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

/** floating wooden plank, side-on, on a 320 x 110 canvas */
export const fxPlank = (p: Pen) => {
  p.poly(rrect(14, 30, 306, 78, 10), "#a8744a", 9);
  p.line([[40, 46], [150, 44], [270, 50]], "#7d5234", 4);
  p.line([[60, 62], [200, 64], [284, 60]], "#7d5234", 4);
  p.dot(36, 54, 5, INK); p.dot(284, 54, 5, INK);
};

/** floating marching drum (no text) on a 260 x 240 canvas: white shell, red hoops, ink zig-zag cord */
export const fxDrum = (p: Pen) => {
  p.poly(rrect(40, 70, 220, 190, 16), "#f1ece0", 9);
  p.poly(rrect(32, 58, 228, 86, 12), "#c9373a", 8);
  p.poly(rrect(32, 176, 228, 204, 12), "#c9373a", 8);
  p.line([[52, 88], [82, 172], [112, 88], [142, 172], [172, 88], [202, 172]], INK, 6);
  p.ell(130, 58, 98, 18, "#f7f3ea", 8);
};

/** soft ground contact blob on a 128 x 128 canvas, multiply colour (sRGB-encoded linear ratio) in the centre */
export const fxBlob = (p: Pen, col: string) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  // soft contact shadow: flat core, then a long smooth (roughly gaussian) fall-off to white = no change
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.5, 0.04], [0.64, 0.18], [0.76, 0.42], [0.87, 0.72], [0.95, 0.92], [1, 1]] as const) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};
