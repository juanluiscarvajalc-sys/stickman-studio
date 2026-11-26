// Cámara por tomas (gramática medida en la referencia): un encuadre nuevo cada 1.2–2.2 s, unidos por deslizamientos
// simétricos de ~20 cuadros (smootherstep), nunca quieta dentro de la toma (empuje lento), primerísimos planos,
// contrapicados, cenitales y planos sobre el hombro; sacudida corta en los impactos.
import * as THREE from "three";
import { Escena, Toma, PlanoToma, glide, hash, smooth, clamp01 } from "./plan";

export type Cam = { pos: THREE.Vector3; look: THREE.Vector3; fov: number; roll: number; dof: number };

const P: Record<PlanoToma, { d: number; y: number; fov: number; dof: number }> = {
  detalle: { d: 1.3, y: 1.05, fov: 34, dof: 18 },
  rostro: { d: 2.15, y: 1.68, fov: 36, dof: 16 },
  primer_plano: { d: 2.4, y: 1.5, fov: 38, dof: 15 },
  medio: { d: 3.7, y: 1.25, fov: 40, dof: 12 },
  general: { d: 8.2, y: 1.0, fov: 42, dof: 5 },
  panoramico: { d: 21, y: 1.4, fov: 48, dof: 0 },
};
const GLIDE = 0.66; // s (20 cuadros) de deslizamiento entre tomas

/** lo que la cámara necesita saber del mundo en el segundo t */
export type CtxCam = {
  actor: (id: string, t: number) => THREE.Vector3 | null;
  bajo: (id: string, t: number) => number;                 // 0 de pie .. 1 en el suelo
  objeto: (i: number) => { pos: THREE.Vector3; alto: number; ancho: number } | null;
  grupo: (t: number) => { c: THREE.Vector3; r: number };
  multitud: (i: number, t: number) => { c: THREE.Vector3; r: number } | null;
  luces: (i: number) => { c: THREE.Vector3; r: number; y: number } | null;
  /** altura (m) de la mano con objeto de un actor, o null si no lleva nada */
  mano: (id: string, t: number) => number | null;
  interior: boolean;
  /** sala de época: medio ancho, alto útil y pared del fondo (la cámara se queda adentro) */
  sala?: { mx: number; h: number; z0: number } | null;
  obstaculos: { x: number; z: number; r: number; h: number }[];
};

const pose = (e: Escena, tm: Toma, idx: number, t: number, dur: number, ctx: CtxCam): Cam => {
  const pp = P[tm.plano] ?? P.medio;
  if (tm.pos && tm.mira) {
    // cámara fija del decorado: un acercamiento lento hacia donde mira
    const u0 = clamp01((t - tm.t) / Math.max(0.5, dur)), look = new THREE.Vector3(...tm.mira), pos = new THREE.Vector3(...tm.pos);
    pos.lerp(look, tm.mov === "alejar" ? 0.06 * (1 - u0) : 0.06 * u0);
    return { pos, look, fov: pp.fov, roll: 0, dof: 0 };
  }
  // ~1 de cada 3 tomas cercanas casi quieta (la referencia mueve la cámara en el 65–80 % de los cuadros, no en todos)
  const quieta = (tm.plano === "rostro" || tm.plano === "primer_plano" || tm.plano === "medio" || tm.plano === "detalle") && hash(e.id * 7 + idx, 9) < 0.1;
  // perfil medido en la referencia: ~60 % del movimiento en el primer medio segundo (golpe con frenado exponencial) y el resto deriva
  const u0 = clamp01((t - tm.t) / Math.max(0.5, dur)), g0 = clamp01((t - tm.t) / 0.5), golpe = 1 - Math.pow(2, -10 * g0);
  const u = (0.6 * golpe + 0.4 * u0) * (quieta ? 0.15 : 1);
  let T: THREE.Vector3, yL = pp.y, d = pp.d;
  if (tm.objetivo.startsWith("multitud:") || tm.objetivo.startsWith("luces:")) {
    const i = Number(tm.objetivo.split(":")[1]);
    const g = tm.objetivo.startsWith("multitud:") ? ctx.multitud(i, t) : ctx.luces(i);
    const gg = g ?? ctx.grupo(t);
    T = gg.c.clone();
    // una multitud se encuadra para que NO se le vea el final (se ve enorme): distancia ~ 0.8 de su tamaño
    yL = g && "y" in g ? (g as { y: number }).y : 1.1;
    if (tm.plano === "rostro" || tm.plano === "detalle") d = 2.4; else d = Math.max(d, gg.r * (tm.plano === "panoramico" ? 1.3 : 0.8));
  } else if (tm.objetivo.startsWith("objeto:")) {
    const o = ctx.objeto(Number(tm.objetivo.split(":")[1]));
    T = o ? o.pos.clone() : ctx.grupo(t).c;
    const k = o ? Math.max(1, o.ancho / 1.6) : 1;
    yL = o ? o.alto * (tm.plano === "detalle" ? 0.65 : 0.5) : 1; d *= k;
    // nunca pegada al objeto (una fogata o un horno en «detalle» llenaban el cuadro de fuego)
    // el objeto ocupa como mucho ~60 % del alto del cuadro
    if (o) d = Math.max(d, Math.max(o.alto, o.ancho) / (0.6 * 2 * Math.tan(THREE.MathUtils.degToRad(pp.fov / 2))) + 0.5);
  } else if (tm.objetivo === "grupo") {
    const g = ctx.grupo(t); T = g.c;
    if (tm.plano !== "detalle" && tm.plano !== "rostro") d = Math.max(d, (g.r + 0.75) / 0.205);
    if (d > pp.d) yL = Math.min(yL, 1.1);
  } else {
    T = ctx.actor(tm.objetivo, t) ?? ctx.grupo(t).c;
    if (tm.plano === "detalle") {
      // detalle = el objeto en la mano con la cara al borde del cuadro; sin objeto, se convierte en rostro
      const hm = ctx.mano(tm.objetivo, t);
      if (hm == null) { yL = P.rostro.y; d = P.rostro.d; }
      else { T = T.clone(); T.x += 0.3; yL = hm + 0.12; d = 1.7; }
    }
    const b = ctx.bajo(tm.objetivo, t);
    if (b > 0) { yL = yL * (1 - 0.75 * b) + 0.12; d *= 1 + 0.3 * b; }
  }
  if (ctx.sala) { T = T.clone(); T.x = THREE.MathUtils.clamp(T.x, -ctx.sala.mx + 0.8, ctx.sala.mx - 0.8); T.z = Math.max(T.z, ctx.sala.z0 + 1.2); }
  const s = hash(e.id * 13 + idx, 5);
  let yaw = (s - 0.5) * 0.7 + (quieta ? 0 : (s > 0.5 ? 1 : -1) * (u0 - 0.5) * 1.0), h = yL + 0.06 * d, dh = d, roll = 0, lookY = yL;
  // ángulo
  switch (tm.angulo) {
    case "bajo": h = Math.max(0.25, yL - 0.85 - 0.08 * d); lookY = yL + 0.18; roll = (s > 0.5 ? 1 : -1) * 0.05; break;
    case "alto": h = yL + Math.min(0.7 * d, 4.5); dh = 0.75 * d; break;
    case "cenital": h = yL + 1.35 * d; dh = 0.28 * d; break;
    case "lado": yaw += (s > 0.5 ? 1 : -1) * 1.1; break;
    case "hombro": {
      const from = tm.desde ? ctx.actor(tm.desde, t) : null;
      if (from && from.distanceTo(T) > 0.5) {
        const dir = new THREE.Vector3(T.x - from.x, 0, T.z - from.z).normalize(), perp = new THREE.Vector3(-dir.z, 0, dir.x);
        const side = s > 0.5 ? 1 : -1;
        const pos = from.clone().addScaledVector(dir, -0.75 - 0.15 * u).addScaledVector(perp, 0.42 * side).setY(1.72);
        const look = T.clone().setY(1.5);
        return { pos, look, fov: 38, roll: 0, dof: 14 };
      }
      break;
    }
  }
  // movimiento dentro de la toma (nunca quieta)
  switch (tm.mov ?? "empuje") {
    case "empuje": dh *= 1 - 0.42 * u; h = lookY + (h - lookY) * (1 - 0.42 * u); break;
    case "alejar": dh *= 0.62 + 0.5 * u; h = lookY + (h - lookY) * (0.62 + 0.5 * u); break;
    case "paneo": yaw += -0.4 + 0.8 * u; dh *= 1 - 0.12 * u; break;
    case "orbita": yaw += -0.7 + 1.4 * u; dh *= 1 - 0.1 * u; break;
    case "subir": h += Math.min(0.35 * d, 1.8) * u; break;
    case "bajar": h += Math.min(0.35 * d, 1.8) * (1 - u); break;
  }
  if (ctx.interior) { dh = Math.min(dh, ctx.sala ? 5.6 : 6.2); h = Math.min(h, ctx.sala ? ctx.sala.h : 4.8); }
  const look = new THREE.Vector3(T.x, lookY, T.z);
  // si algo se interpone entre la cámara y el sujeto, girar alrededor del sujeto hasta tener vista limpia
  const pos = new THREE.Vector3();
  const obs = ctx.obstaculos.filter((o) => Math.hypot(o.x - T.x, o.z - T.z) > o.r + 0.3);
  const tapa = (p: THREE.Vector3) => obs.some((o) => {
    const ax = p.x, az = p.z, bx = look.x, bz = look.z, vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz || 1;
    const s2 = Math.max(0, Math.min(1, ((o.x - ax) * vx + (o.z - az) * vz) / L2));
    if (s2 > 0.97) return false;
    const dx = ax + vx * s2 - o.x, dz = az + vz * s2 - o.z;
    const y = p.y + (look.y - p.y) * s2;
    return dx * dx + dz * dz < o.r * o.r && y < o.h;
  });
  for (const dy of [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.8, -1.8, 2.6, -2.6]) {
    pos.set(T.x + Math.sin(yaw + dy) * dh, Math.max(0.22, h), T.z + Math.cos(yaw + dy) * dh);
    if (!tapa(pos)) break;
  }
  // la cámara nunca dentro de un objeto (tiendas, árboles, casas): se aleja del sujeto hasta salir
  for (let n = 0; n < 6; n++) {
    const dentro = obs.find((o) => Math.hypot(pos.x - o.x, pos.z - o.z) < o.r + 0.25 && pos.y < o.h + 0.2);
    if (!dentro) break;
    const dx = pos.x - dentro.x, dz = pos.z - dentro.z, L = Math.hypot(dx, dz) || 1;
    pos.x = dentro.x + (dx / L) * (dentro.r + 0.4); pos.z = dentro.z + (dz / L) * (dentro.r + 0.4);
    if (Math.hypot(pos.x - dentro.x, pos.z - dentro.z) < dentro.r + 0.3) pos.y = dentro.h + 0.5;
  }
  if (tapa(pos)) { pos.set(T.x + Math.sin(yaw) * dh * 0.6, Math.max(h, lookY + 0.9 * dh), T.z + Math.cos(yaw) * dh * 0.6); }
  if (ctx.interior) { const mx = ctx.sala?.mx ?? 7.4; pos.x = THREE.MathUtils.clamp(pos.x, -mx, mx); pos.z = THREE.MathUtils.clamp(pos.z, (ctx.sala?.z0 ?? -99) + 0.6, ctx.sala ? 7.4 : 6.4); if (ctx.sala) pos.y = Math.min(pos.y, ctx.sala.h); }
  if (tm.plano === "rostro" || tm.plano === "primer_plano") roll += 0.02 * Math.sin(t * 0.8 + s * 6);
  return { pos, look, fov: pp.fov, roll, dof: pp.dof };
};

const mezcla = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.clone().lerp(b.pos, k), look: a.look.clone().lerp(b.look, k),
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k, dof: a.dof + (b.dof - a.dof) * k,
});

/** cámara de la escena en el segundo t (relativo a la escena) */
export const camaraEn = (e: Escena, tomas: Toma[], t: number, ctx: CtxCam): Cam => {
  const durDe = (i: number) => (i + 1 < tomas.length ? tomas[i + 1].t : e.duracion) - tomas[i].t;
  // toma actual (la siguiente ya empieza a entrar medio deslizamiento antes de su corte)
  let i = 0;
  for (let j = 0; j < tomas.length; j++) if (t >= tomas[j].t - GLIDE / 2) i = j;
  let c = pose(e, tomas[i], i, t, durDe(i), ctx);
  if (i > 0) {
    const k = glide((t - (tomas[i].t - GLIDE / 2)) / GLIDE);
    if (k < 1) {
      const prev = pose(e, tomas[i - 1], i - 1, t, durDe(i - 1), ctx);
      // regla medida en la referencia: un reencuadre grande (más de medio cuadro o >40 % de zoom) es un corte limpio
      // en el cuadro de la toma; solo los cambios moderados se deslizan
      const da = prev.pos.clone().sub(prev.look).normalize(), db = c.pos.clone().sub(c.look).normalize();
      const giro = Math.acos(THREE.MathUtils.clamp(da.dot(db), -1, 1));
      const zoom = Math.abs(Math.log(prev.pos.distanceTo(prev.look) / Math.max(0.1, c.pos.distanceTo(c.look))));
      const salto = prev.look.distanceTo(c.look) / Math.max(1, prev.pos.distanceTo(prev.look));
      const grande = giro > 0.45 || zoom > 0.35 || salto > 0.35;
      c = grande ? (t < tomas[i].t ? prev : c) : mezcla(prev, c, k);
    }
  }
  // sacudida en impactos: cambia de signo cada cuadro y se apaga en 7
  const golpes = [...(e.efectos ?? []).filter((ef) => ef.tipo === "destello" || ef.tipo === "chispas" || ef.tipo === "polvo").map((ef) => ef.t),
    ...(e.objetos ?? []).filter((o) => o.estado === "derrumbe").map((o) => (o.t ?? 0) + 0.6)];
  const dist = c.pos.distanceTo(c.look);
  for (const tg of golpes) {
    const k = Math.round((t - tg) * 30);
    if (k >= 0 && k < 7) { const a = 0.05 * (1 - k / 7) * (k % 2 ? -1 : 1) * Math.max(0.6, dist / 5); c.pos.x += a; c.look.x += a * 0.6; }
  }
  // cámara en mano: dos o tres ondas lentas desfasadas por escena (nunca un temblor periódico)
  {
    const sd = (String(e.id).split("").reduce((s, ch) => s + ch.charCodeAt(0), 0) % 17) * 0.61, amp = 0.011 * Math.min(4, Math.max(1.2, dist));
    const nx = Math.sin(t * 0.53 + sd) * 0.6 + Math.sin(t * 1.37 + sd * 2.1) * 0.3 + Math.sin(t * 2.9 + sd * 0.7) * 0.1;
    const ny = Math.sin(t * 0.41 + sd * 1.3) * 0.6 + Math.sin(t * 1.71 + sd * 0.4) * 0.4;
    c.pos.x += nx * amp; c.pos.y += ny * amp * 0.6; c.look.x += nx * amp * 0.35; c.look.y += ny * amp * 0.25;
    c.roll += 0.0035 * Math.sin(t * 0.47 + sd);
    // temblor de mano medido en la referencia: ~1.5 px por cuadro a ~2 Hz (amplitud ∝ distancia para que en pantalla mida lo mismo)
    const hf = 0.0082 * dist, w2 = 2 * Math.PI;
    let jx = 0.6 * Math.sin(w2 * 1.95 * t + sd) + 0.25 * Math.sin(w2 * 2.3 * t + sd * 1.9) + 0.15 * Math.sin(w2 * 1.3 * t + sd * 0.3);
    { const k = Math.floor(t * 1.15 + sd), fr = (t * 1.15 + sd) - k; if (hash(k * 7 + 3, 11) < 0.55 && fr < 0.09) jx += (hash(k, 4) > 0.5 ? 1 : -1) * 4 * Math.sin(Math.PI * fr / 0.09); }
    const jy = 0.55 * Math.sin(w2 * 2.2 * t + sd * 0.8) + 0.3 * Math.sin(w2 * 1.6 * t + sd * 2.6) + 0.15 * Math.sin(w2 * 3.1 * t + sd * 1.1);
    c.pos.x += jx * hf; c.look.x += jx * hf; c.pos.y += jy * hf * 0.7; c.look.y += jy * hf * 0.7;
    c.roll += 0.0019 * Math.sin(w2 * 1.45 * t + sd * 1.3);
  }
  // entrada de escena (si no es corte): frena suave desde un poco más lejos
  if (e.transicion !== "corte") {
    const ent = 1 - smooth(t / 0.35);
    c.pos.addScaledVector(new THREE.Vector3().subVectors(c.pos, c.look).normalize(), 0.12 * dist * ent);
  }
  return c;
};
