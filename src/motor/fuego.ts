// Fuego de caricatura animado (forma irregular que se mueve, bandas rojo → naranja → amarillo → blanco), humo que
// sube, crece y se disipa, y chispas. Todo en shaders con un único reloj compartido (FUEGO_U.uTime).
import * as THREE from "three";
import { ctex } from "./paint";
import { NOINK } from "./ink";

export const FUEGO_U = { uTime: { value: 0 }, uNoche: { value: 0 } };

const NOISE = /* glsl */ `
float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }
float fb(vec2 p){ return vn(p) * 0.55 + vn(p * 2.1) * 0.3 + vn(p * 4.3) * 0.15; }`;

// billboard en espacio de vista: el centro del objeto + la esquina del plano, siempre de frente a la cámara
const BILL = /* glsl */ `
vec4 mvC = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
vec2 escala2 = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));`;

let LLAMA: THREE.ShaderMaterial | null = null;
const llamaMat = () => LLAMA ??= new THREE.ShaderMaterial({
  uniforms: FUEGO_U, transparent: false, depthWrite: true, side: THREE.DoubleSide, toneMapped: false, fog: false,
  vertexShader: `varying vec2 vUv; uniform float uTime;
    void main(){ vUv = uv; ${BILL}
      vec4 mv = mvC; mv.xy += position.xy * escala2; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying vec2 vUv; uniform float uTime; ${NOISE}
    void main(){
      float y = vUv.y, t = uTime;
      // la llama se dobla y se agita: desplazamiento horizontal con ruido que sube
      float x = vUv.x - 0.5 + (fb(vec2(y * 3.0 - t * 2.2, t * 0.7)) - 0.5) * 0.5 * y + (fb(vec2(y * 7.0 - t * 5.0, 3.0)) - 0.5) * 0.12 * y;
      float ancho = 0.5 * pow(max(0.0, 1.0 - y), 0.95) * (0.4 + 1.0 * fb(vec2(vUv.x * 6.0 + t * 0.8, y * 4.0 - t * 4.2)));
      ancho *= smoothstep(0.0, 0.08, y);
      float d = abs(x) / max(ancho, 1e-3);
      // lenguas sueltas arriba
      float lengua = step(0.62, fb(vec2(vUv.x * 7.0, y * 5.0 - t * 4.5))) * step(0.55, y) * step(abs(x), 0.18);
      if (d > 1.0 && lengua < 0.5) discard;
      float k = clamp(d + y * 0.45, 0.0, 1.6);
      vec3 c = vec3(1.0, 0.95, 0.7);
      c = mix(c, vec3(1.0, 0.78, 0.2), step(0.38, k));
      c = mix(c, vec3(0.98, 0.5, 0.1), step(0.72, k));
      c = mix(c, vec3(0.85, 0.24, 0.08), step(1.0, k));
      if (lengua > 0.5 && d > 1.0) c = vec3(1.0, 0.55, 0.12);
      gl_FragColor = vec4(c, 1.0);
    }`,
});

const humoTex = () => ctex("humoBola", 256, 256, (g, r) => {
  for (let i = 0; i < 7; i++) {
    const x = 128 + (r() - 0.5) * 90, y = 128 + (r() - 0.5) * 70, rad = 50 + r() * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.6, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
});

/** n bocanadas de humo que salen de (0,0,0) del padre: suben H metros en `vida` segundos, crecen y se disipan */
const humoMesh = (n: number, H: number, vida: number, tam: number, gris: number, seed: number) => {
  const geo = new THREE.PlaneGeometry(1, 1), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) ph[i] = (i + ((seed * 0.618) % 1)) / n;
  geo.setAttribute("aPh", new THREE.InstancedBufferAttribute(ph, 1));
  const u = { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...FUEGO_U, uH: { value: H }, uVida: { value: vida }, uTam: { value: tam }, uGris: { value: gris }, uSeed: { value: seed }, map: { value: humoTex() } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, fog: true,
    vertexShader: `attribute float aPh; uniform float uTime, uH, uVida, uTam, uSeed; varying vec2 vUv; varying float vA;
      #include <fog_pars_vertex>
      void main(){ vUv = uv;
        float p = fract(uTime / uVida + aPh);
        vec3 c = vec3(sin(aPh * 37.0 + uSeed) * 0.15 + p * p * 0.9 * sin(uSeed), p * uH, cos(aPh * 23.0) * 0.12);
        vec4 mvPosition = modelViewMatrix * vec4(c, 1.0);
        float s = uTam * (0.35 + 1.6 * p) * length(modelMatrix[0].xyz);
        float a = aPh * 6.28 + uTime * 0.4 * (aPh - 0.5);
        mvPosition.xy += mat2(cos(a), -sin(a), sin(a), cos(a)) * position.xy * s;
        vA = smoothstep(0.0, 0.12, p) * (1.0 - smoothstep(0.45, 1.0, p));
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform sampler2D map; uniform float uGris, uNoche; varying vec2 vUv; varying float vA;
      #include <fog_pars_fragment>
      void main(){ float a = texture2D(map, vUv).a * vA * 0.75; if (a < 0.01) discard;
        vec3 c = mix(vec3(uGris), vec3(uGris) * vec3(0.55, 0.6, 0.85), uNoche);
        gl_FragColor = vec4(c, a);
        #include <fog_fragment>
      }`,
  });
  const im = new THREE.InstancedMesh(geo, m, n);
  for (let i = 0; i < n; i++) im.setMatrixAt(i, new THREE.Matrix4());
  im.frustumCulled = false; im.layers.set(NOINK); im.renderOrder = 4;
  return im;
};

/** chispas que suben y titilan */
const chispas = (n: number, H: number, seed: number) => {
  const geo = new THREE.PlaneGeometry(1, 1), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) ph[i] = (i * 0.6180339 + seed) % 1;
  geo.setAttribute("aPh", new THREE.InstancedBufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { ...FUEGO_U, uH: { value: H } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `attribute float aPh; uniform float uTime, uH; varying float vA; varying vec2 vUv;
      void main(){ vUv = uv; float p = fract(uTime * 0.7 + aPh);
        vec3 c = vec3(sin(aPh * 91.0 + uTime * 3.0) * 0.25 * p, p * uH, cos(aPh * 53.0) * 0.2 * p);
        vec4 mv = modelViewMatrix * vec4(c, 1.0); mv.xy += position.xy * 0.05 * length(modelMatrix[0].xyz);
        vA = (1.0 - p) * step(0.5, fract(aPh * 13.0 + uTime * 6.0) + 0.3); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; varying vec2 vUv; void main(){ float d = length(vUv - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vec3(1.0, 0.75, 0.3) * 2.0 * vA, 1.0); }`,
  });
  const im = new THREE.InstancedMesh(geo, m, n);
  for (let i = 0; i < n; i++) im.setMatrixAt(i, new THREE.Matrix4());
  im.frustumCulled = false; im.layers.set(NOINK); im.renderOrder = 5;
  return im;
};

let SEMILLA = 1;
/** fuego de alto ~1.45 × escala apoyado en (x, y, z) del padre, con humo y chispas */
export const fuego = (padre: THREE.Object3D, x: number, y: number, z: number, escala = 1, conHumo = true) => {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(escala);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.45), llamaMat());
  fl.position.y = 0.0; fl.layers.set(NOINK); fl.renderOrder = 2.5; fl.frustumCulled = false;
  const pivote = new THREE.Group(); pivote.position.y = 0.725; pivote.scale.set(1, 1, 1); pivote.add(fl); g.add(pivote);
  // segunda llama más chica y desfasada (la forma nunca se repite igual)
  const fl2 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.0), llamaMat()); fl2.layers.set(NOINK); fl2.renderOrder = 2.6; fl2.frustumCulled = false;
  const p2 = new THREE.Group(); p2.position.set(0.18, 0.5, 0.05); p2.add(fl2); g.add(p2);
  if (conHumo) { const h = humoMesh(14, 4.5, 3.2, 0.9, 0.62, SEMILLA++ * 1.7); h.position.y = 1.2; g.add(h); }
  g.add(chispas(10, 2.2, (SEMILLA++ * 0.37) % 1));
  padre.add(g);
  return g;
};

/** columna de humo sola (chimeneas) */
export const humo = (padre: THREE.Object3D, x: number, y: number, z: number, escala = 1) => {
  const h = humoMesh(10, 6, 5, 1.1, 0.85, SEMILLA++ * 2.3); h.position.set(x, y, z); h.scale.setScalar(escala); padre.add(h); return h;
};
