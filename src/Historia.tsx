// Composición genérica: lee el Plan (inputProps.plan) y dibuja cada escena con su mundo, su elenco y su cámara.
// Cadena de post igual a la plantilla: tinta -> desenfoque de lente -> bloom -> tono NEUTRAL -> corrección de color.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, getInputProps, delayRender, continueRender } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, NOINK, noInkFallback } from "./motor/ink";
import { LensBlur } from "./motor/lensblur";
import { GradeEffect, GRADES, gradeFor } from "./motor/grade";
import { Mundo } from "./motor/mundo";
import { Elenco, poseEn } from "./motor/actores";
import { camaraEn, CtxCam } from "./motor/camara";
import { tomasDe } from "./motor/director";
import { cargarTexturas, cargarFondos } from "./motor/texturas";
import { FPS, Plan, capasEn, destelloEn, tamano } from "./motor/plan";

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass; const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3();

/** tamaño aproximado de cada objeto (alto, ancho en m) para encuadrarlo */
const TAM: Record<string, [number, number]> = { casa: [5, 6], torre: [13, 5], muro: [7, 14], horno: [2.4, 2.8], pan_gigante: [1.6, 4.4], carreta: [1.4, 3],
  bote: [4, 3.4], estatua: [3.3, 1.6], pozo: [2.6, 2], tienda: [2.6, 3], arbol: [4.5, 3], pino: [6, 3], palmera: [6, 3], fogata: [1.2, 1.4], cama: [1.2, 1.6], silla: [1.3, 0.7], mesa: [1, 2],
  auto: [1.9, 4.8], auto_policia: [2.2, 4.8], avion: [3.2, 9], escalera: [4, 0.8], cuna: [1.2, 1.4], lapida: [1.2, 0.8], surtidor: [3, 0.8], escritorio: [1.3, 2],
  archivador: [1.5, 0.6], pizarra: [2.5, 2.7], estrado: [2.4, 4.2], banca: [1.3, 3], rejas: [2.8, 3.3], mansion: [9, 15], edificio: [12, 9], barco: [5, 9], farola: [5, 0.8], lampara: [1.9, 0.8],
  hidrante: [0.8, 0.5], cubo: [1, 0.6], buzon: [1.3, 0.6], seto: [1.2, 2.4], kiosco: [2.6, 2.2], estante: [2, 1.4], sillon: [1.1, 1] };

const ctxCam = (e: Plan["escenas"][number], elenco: Elenco, interior: boolean): CtxCam => ({
  actor: (id, t) => elenco.donde(id, t),
  bajo: (id, t) => {
    const a = e.actores.find((x) => x.id === id); if (!a) return 0;
    const P = poseEn(a, t);
    return P.accion === "caer" ? Math.min(1, Math.max(0, (P.tAcc - 0.1) / 0.5)) : P.accion === "sentado" ? 0.5 : 0;
  },
  objeto: (i) => {
    const o = e.objetos?.[i]; if (!o) return null;
    const [al, an] = TAM[o.tipo] ?? [1, 1.2], k = o.escala ?? 1;
    return { pos: new THREE.Vector3(o.x, 0, o.z), alto: al * k, ancho: an * k };
  },
  grupo: (t) => {
    const ps = e.actores.map((a) => elenco.donde(a.id, t)).filter(Boolean) as THREE.Vector3[];
    if (!ps.length && e.multitudes?.length) { const m = e.multitudes[0]; return { c: new THREE.Vector3(m.x, 0, m.z), r: Math.max(m.ancho, m.fondo) / 2 }; }
    if (!ps.length) {
      const os = e.objetos.filter((o) => (o.estado && o.estado !== "normal") || (o.material && o.material !== "normal"));
      const lista = os.length ? os : e.objetos;
      if (!lista.length) return { c: new THREE.Vector3(), r: 2 };
      const c = lista.reduce((s, o) => s.add(new THREE.Vector3(o.x, 0, o.z)), new THREE.Vector3()).multiplyScalar(1 / lista.length);
      return { c, r: Math.max(2, ...lista.map((o) => Math.hypot(o.x - c.x, o.z - c.z) + 2.5 * (o.escala ?? 1))) };
    }
    const c = ps.reduce((s, v) => s.add(v), new THREE.Vector3()).multiplyScalar(1 / ps.length);
    return { c, r: Math.max(0.3, ...ps.map((p) => Math.hypot(p.x - c.x, p.z - c.z))) };
  },
  interior,
  obstaculos: [],
  multitud: (i, t) => elenco.multitud(i, t),
  mano: (id, t) => {
    const a = e.actores.find((x) => x.id === id); if (!a) return null;
    const P = poseEn(a, t); if (!P.mano) return null;
    return P.accion === "celebrar" || P.accion === "saludar" || P.accion === "lanzar" ? 1.7 : P.accion === "comer" ? 1.5 : P.accion === "cargar" ? 1.15 : 0.95;
  },
  luces: (i) => { const l = e.luces?.[i]; return l ? { c: new THREE.Vector3(l.x, 0, l.z), r: Math.max(l.ancho, l.fondo) / 2, y: l.altura ?? 1.8 } : null; },
});

const Inner: React.FC<{ plan: Plan; i: number }> = ({ plan, i }) => {
  const f = useCurrentFrame();
  const { camera, scene, advance } = useThree();
  // el EffectComposer se crea en un efecto, después del primer advance de Remotion: esperamos unos cuadros de
  // animación, volvemos a dibujar y recién entonces dejamos que Remotion capture
  const [h] = useState(() => delayRender("post listo"));
  useEffect(() => {
    const id = setTimeout(() => { advance(performance.now()); continueRender(h); }, 120);
    return () => clearTimeout(id);
  }, [advance, h]);
  const on = useMemo(() => ({ ink: true, lens: true, bloom: true, ...((getInputProps() as { post?: Record<string, boolean> }).post ?? {}) }), []);
  const sinPost = !!(getInputProps() as { sinPost?: boolean }).sinPost;
  const e = plan.escenas[i];
  const mundo = useMemo(() => new Mundo(e, plan.estilo), [e, plan.estilo]);
  const elenco = useMemo(() => new Elenco(plan, e, mundo.luz.nombre), [plan, e, mundo]);
  const tomas = useMemo(() => tomasDe(e, plan.audio?.palabras ?? [], plan.modo === "episodio"), [e, plan]);
  const ctx = useMemo(() => ({ ...ctxCam(e, elenco, mundo.interior), obstaculos: mundo.obstaculos, sala: mundo.sala }), [e, elenco, mundo]);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, 1),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      {on.ink ? <primitive object={fx.ink} dispose={null} /> : <></>}
      {on.lens ? <primitive object={fx.lens.pre} dispose={null} /> : <></>}
      {on.lens ? <primitive object={fx.lens.main} dispose={null} /> : <></>}
      {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : <></>}
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.grade} dispose={null} />
    </EffectComposer>
  ), [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  const t = Math.max(0, f / FPS - e.inicio);
  const c = camaraEn(e, tomas, t, ctx);
  cam.position.copy(c.pos); cam.up.set(0, 1, 0); cam.lookAt(c.look); cam.rotateZ(c.roll);
  cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  cam.layers.enable(NOINK);
  mundo.update(cam, scene, c.look, t);
  const sunDir = new THREE.Vector3().subVectors(mundo.sun.position, mundo.sun.target.position).normalize();
  const palabras = plan.audio?.palabras ?? [];
  const now = f / FPS, hablando = palabras.some((w) => now >= w.a && now <= w.b);
  elenco.update(t, f, cam, sunDir, hablando || !palabras.length);
  mundo.calidas(cam, c.look, t, elenco.fuentes());
  noInkFallback(mundo.root);
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, c.look.clone().sub(cam.position).dot(fwd));
  fx.lens.cInf = c.dof;
  gradeFor(fx.grade, mundo.luz.grade);
  return (
    <>
      <primitive object={mundo.root} dispose={null} />
      <primitive object={elenco.root} dispose={null} />
      {sinPost ? null : post}
    </>
  );
};

const dprOverride = () => (getInputProps() as { dpr?: number }).dpr;
const Vista: React.FC<{ plan: Plan; i: number; alpha: number }> = ({ plan, i, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={tamano(plan)[0]} height={tamano(plan)[1]} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows
      gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0, preserveDrawingBuffer: true }}
      camera={{ fov: 40, near: 0.2, far: 1500 }}>
      <Inner plan={plan} i={i} />
    </ThreeCanvas>
  </AbsoluteFill>
);

/** cartel de título o de capítulo: letras de máquina de escribir sobre negro, entran despacio */
const Cartel: React.FC<{ plan: Plan; i: number; alpha: number; f: number }> = ({ plan, i, alpha, f }) => {
  const e = plan.escenas[i], t = f / FPS - e.inicio, k = Math.min(1, Math.max(0, (t - 0.3) / 1.2)), sal = Math.min(1, Math.max(0, (e.inicio + e.duracion - f / FPS) / 0.6));
  const [w] = tamano(plan), grande = w > 1500 ? 96 : 76;
  return (
    <AbsoluteFill style={{ opacity: alpha, background: "#07070a", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 28 }}>
      {e.subtitulo ? <div style={{ fontFamily: "Courier New, monospace", fontSize: grande * 0.38, letterSpacing: 8, color: "#b8a888", opacity: k * sal }}>{e.subtitulo}</div> : null}
      <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: Math.min(grande, Math.round((w * 1.5) / Math.max(8, (e.titulo ?? "").length))), color: "#efe6d2", letterSpacing: 4, textAlign: "center", padding: "0 8%",
        opacity: k * sal, transform: `scale(${1.04 - 0.04 * k})`, textShadow: "0 0 30px rgba(255,220,160,0.25)" }}>{e.titulo}</div>
      <div style={{ width: 260 * k, height: 2, background: "#8a2a2a", opacity: sal }} />
    </AbsoluteFill>
  );
};
/** grano de película y leve parpadeo (cine negro) */
const Grano: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, mixBlendMode: "overlay", opacity: 0.22 }}>
      <filter id={`gr${f % 12}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 12} /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter={`url(#gr${f % 12})`} />
    </svg>
    <AbsoluteFill style={{ background: "#000", opacity: 0.03 + 0.03 * Math.abs(Math.sin(f * 12.9898) * 43758.5453 % 1) }} />
  </AbsoluteFill>
);

export const Historia: React.FC<{ plan: Plan }> = ({ plan }) => {
  const f = useCurrentFrame();
  // texturas fotográficas: se espera a que carguen antes de dibujar el primer cuadro
  const [listo, setListo] = useState(false);
  const [hT] = useState(() => delayRender("texturas"));
  useEffect(() => { Promise.all([cargarTexturas(), cargarFondos((plan?.escenas ?? []).map((e) => e.fondoImg ?? ""))]).then(() => setListo(true)); }, [plan]);
  useEffect(() => { if (listo) continueRender(hT); }, [listo, hT]);
  if (!listo) return <AbsoluteFill style={{ background: "#cfe3f2" }} />;
  if (!plan?.escenas?.length) return <AbsoluteFill style={{ background: "#222", color: "#fff", fontSize: 60, justifyContent: "center", alignItems: "center" }}>Sin plan</AbsoluteFill>;
  const flash = destelloEn(plan, f);
  const i = capasEn(plan, f)[0].i, e = plan.escenas[i];
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      {capasEn(plan, f).map((l) => plan.escenas[l.i].titulo ? <Cartel key={`t${l.i}`} plan={plan} i={l.i} alpha={l.alpha} f={f} /> : <Vista key={`esc${l.i}`} plan={plan} i={l.i} alpha={l.alpha} />)}
      {plan.estilo === "noir" ? <Grano f={f} /> : null}
      {e.rotulo && plan.estilo === "noir" ? (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: "0 0 7% 6%" }}>
          <div style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: 40, color: "#efe6d2", letterSpacing: 3, background: "rgba(8,8,10,0.55)", padding: "8px 18px", borderLeft: "4px solid #8a2a2a",
            opacity: Math.min(1, Math.max(0, (f / FPS - e.inicio) / 0.6)) }}>{e.rotulo}</div>
        </AbsoluteFill>
      ) : e.rotulo ? (
        <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: plan.formato === "horizontal" ? 70 : 170 }}>
          <div style={{ fontFamily: "Arial Black, Arial, sans-serif", fontSize: Math.min(92, Math.round(1500 / Math.max(1, e.rotulo.length))), color: "#fff", WebkitTextStroke: "6px #241726", paintOrder: "stroke", letterSpacing: 2 }}>{e.rotulo}</div>
        </AbsoluteFill>
      ) : null}
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
      {plan.audio?.mezcla ? <Audio src={staticFile(plan.audio.mezcla)} /> : plan.audio?.voz ? <Audio src={staticFile(plan.audio.voz)} /> : null}
    </AbsoluteFill>
  );
};
