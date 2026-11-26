// Luz cálida local (faroles, fogatas, ventanas, antorchas). El sombreado twoTone del mundo y el de las tarjetas de
// personaje ignoran las PointLight de three (solo usan el sol), así que las fuentes cálidas se suman a mano en los
// dos shaders: hasta MAX fuentes por cuadro, las más cercanas a lo que mira la cámara.
import * as THREE from "three";

export const MAX_CALIDAS = 12;
export type Fuente = { p: THREE.Vector3; col: THREE.Color; r: number; i: number; flick?: number };

export const CALIDA = {
  uWarmN: { value: 0 },
  uWarmPos: { value: Array.from({ length: MAX_CALIDAS }, () => new THREE.Vector3()) },
  uWarmCol: { value: Array.from({ length: MAX_CALIDAS }, () => new THREE.Vector3()) },
  uWarmR: { value: new Array(MAX_CALIDAS).fill(1) as number[] },
};
export const CALIDA_DECL = `uniform int uWarmN; uniform vec3 uWarmPos[${MAX_CALIDAS}]; uniform vec3 uWarmCol[${MAX_CALIDAS}]; uniform float uWarmR[${MAX_CALIDAS}];`;

/** suma de luz cálida en el punto geometryPosition (espacio de vista) con normal geometryNormal; flat = tarjeta */
export const calidaGLSL = (flat: boolean) => /* glsl */ `
vec3 warmSum = vec3( 0.0 );
for ( int wi = 0; wi < ${MAX_CALIDAS}; wi++ ) {
  if ( wi >= uWarmN ) break;
  vec3 dv = uWarmPos[ wi ] - geometryPosition; float dl = length( dv );
  float fa = clamp( 1.0 - dl / uWarmR[ wi ], 0.0, 1.0 ); fa *= fa;
  ${flat ? "float nl = 0.85;" : "float nl = 0.3 + 0.7 * max( dot( geometryNormal, dv / max( dl, 1e-3 ) ), 0.0 );"}
  warmSum += uWarmCol[ wi ] * fa * nl;
}
`;

const tmp = new THREE.Vector3();
/** elige las fuentes que más importan para este encuadre y las pasa a los uniformes (en espacio de vista) */
export function fijarCalidas(fuentes: Fuente[], cam: THREE.Camera, foco: THREE.Vector3, t: number, k: number) {
  const fw = new THREE.Vector3(); cam.getWorldDirection(fw);
  const cand = fuentes
    .map((f) => {
      tmp.copy(f.p).sub(cam.position);
      const delante = tmp.dot(fw) > -f.r;                    // detrás de la cámara no ilumina nada visible
      const d = Math.min(f.p.distanceTo(foco), tmp.length());
      return { f, s: delante ? (f.i * f.r) / (1 + Math.max(0, d - f.r * 0.5) ** 2) : -1 };
    })
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, MAX_CALIDAS);
  CALIDA.uWarmN.value = k > 0.001 ? cand.length : 0;
  cand.forEach(({ f }, j) => {
    const fl = f.flick ? 1 + f.flick * (0.12 * Math.sin(t * 11 + j * 7.3) + 0.08 * Math.sin(t * 23.7 + j * 3.1)) : 1;
    CALIDA.uWarmPos.value[j].copy(f.p).applyMatrix4(cam.matrixWorldInverse);
    CALIDA.uWarmCol.value[j].set(f.col.r, f.col.g, f.col.b).multiplyScalar(f.i * k * fl);
    CALIDA.uWarmR.value[j] = f.r;
  });
}
