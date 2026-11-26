// Hoja de personajes (preproducción): cada personaje de frente, de 3/4 con su objeto típico, de perfil caminando
// y primeros planos de sus expresiones típicas, con nombre, papel y edad. Se dibuja con el mismo motor 2D de los videos.
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { Pen, bodyFront, bodySide, Held } from "./motor/toon";
import { outfitDe } from "./motor/actores";
import { EXPR, Personaje, Expresion, vestirPara } from "./motor/plan";

export type FichaHoja = Personaje & { objetoTipico?: string | null; expresionesTipicas?: string[] };
export type PropsHoja = { titulo?: string; personajes: FichaHoja[]; notas?: Record<string, string[]> };

export const COLS = 3, PW = 1100, PH = 860, CAB = 170;
export const tamHoja = (n: number): [number, number] => [COLS * PW, CAB + Math.ceil(Math.max(1, n) / COLS) * PH];

/** dibuja una figura en un lienzo de 600 x 1000 (el de las tarjetas de los videos) */
const figura = (draw: (p: Pen) => void) => {
  const c = document.createElement("canvas"); c.width = 600; c.height = 1000;
  const g = c.getContext("2d")!; draw(new Pen(g)); return c;
};
/** fila más alta con pintura (la coronilla o el sombrero) para recortar la cabeza */
const arriba = (c: HTMLCanvasElement) => {
  const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
  for (let y = 0; y < c.height; y++) for (let x = 150; x < 450; x += 2) if (d[(y * c.width + x) * 4 + 3] > 40) return y;
  return 0;
};

const dibujarHoja = (cv: HTMLCanvasElement, props: PropsHoja) => {
  const g = cv.getContext("2d")!;
  g.fillStyle = "#e9e6de"; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = "#1e1a22"; g.font = "bold 76px Georgia, serif"; g.textBaseline = "middle";
  g.fillText(props.titulo ?? "Personajes", 60, CAB / 2);
  const ancho = g.measureText(props.titulo ?? "Personajes").width;
  g.font = "34px Georgia, serif"; g.fillStyle = "#5a5560";
  g.fillText(`${props.personajes.length} personajes · frente · 3/4 con su objeto · otro vestuario o perfil · expresiones`, 60 + ancho + 50, CAB / 2 + 6);
  props.personajes.forEach((p, i) => {
    const x0 = (i % COLS) * PW, y0 = CAB + Math.floor(i / COLS) * PH, o = outfitDe(p);
    g.fillStyle = "#fbfaf6"; g.fillRect(x0 + 20, y0 + 10, PW - 40, PH - 30);
    g.strokeStyle = "#c9c4b8"; g.lineWidth = 3; g.strokeRect(x0 + 20, y0 + 10, PW - 40, PH - 30);
    const exprs = (p.expresionesTipicas ?? []).filter((e) => e in EXPR).slice(0, 4) as Expresion[];
    const e0 = EXPR[exprs[0] ?? "neutral"];
    const held = (p.objetoTipico ?? null) as Held | null;
    const k = 0.6;
    // frente, 3/4 con objeto, perfil caminando
    const f1 = figura((pen) => bodyFront(pen, o, { mode: "stand", expr: "neutral", seed: 3 }));
    const f2 = figura((pen) => bodyFront(pen, o, { mode: "stand", expr: e0, seed: 3, facing: 1, held, gesture: held === "bebe" ? "carry" : held ? "talk" : null, gk: 0.4 }));
    // tercer dibujo: el vestuario alternativo (si tiene) o el perfil caminando
    const alt = p.vestuarios?.[0];
    const f3 = alt ? figura((pen) => bodyFront(pen, outfitDe(vestirPara(p, undefined, alt.id)), { mode: "stand", expr: "neutral", seed: 3, facing: -1 }))
      : figura((pen) => bodySide(pen, o, { mode: "march", phase: 0.15, expr: "neutral", seed: 3 }));
    g.drawImage(f1, x0 + 30, y0 + 20, 600 * k, 1000 * k);
    g.drawImage(f2, x0 + 360, y0 + 20, 600 * k, 1000 * k);
    g.drawImage(f3, x0 + 690, y0 + 20, 600 * k, 1000 * k);
    if (alt) {
      g.fillStyle = "#7a3a2a"; g.font = "bold 26px sans-serif"; g.textBaseline = "top"; g.fillText(`vestuario: ${alt.id}`, x0 + 740, y0 + 30);
      g.font = "18px sans-serif"; g.fillText(`(${(alt.lugares ?? []).join(", ")})`.slice(0, 42), x0 + 720, y0 + 62);
    }
    // primeros planos de expresiones
    const lista: Expresion[] = exprs.length ? exprs : ["neutral", "serio", "preocupado", "sorpresa"];
    lista.slice(0, 4).forEach((ex, j) => {
      const c = figura((pen) => bodyFront(pen, o, { mode: "stand", expr: EXPR[ex], seed: 3 }));
      const top = Math.max(0, arriba(c) - 10), alto = 300;
      const bx = x0 + 40 + j * 150, by = y0 + 640;
      g.save(); g.beginPath(); g.rect(bx, by, 140, 140); g.clip();
      g.fillStyle = "#efece4"; g.fillRect(bx, by, 140, 140);
      g.drawImage(c, 150, top, 300, alto, bx, by, 140, 140);
      g.restore(); g.strokeStyle = "#c9c4b8"; g.lineWidth = 2; g.strokeRect(bx, by, 140, 140);
      g.fillStyle = "#5a5560"; g.font = "20px sans-serif"; g.textBaseline = "top"; g.fillText(ex, bx + 4, by + 144);
    });
    // ficha
    const tx = x0 + 660, ty = y0 + 650;
    g.fillStyle = "#1e1a22"; g.font = "bold 34px Georgia, serif"; g.textBaseline = "top"; g.fillText(p.nombre.slice(0, 26), tx, ty);
    g.font = "24px sans-serif"; g.fillStyle = "#3a3540";
    g.fillText(`${p.papel ?? ""}`.slice(0, 34), tx, ty + 46);
    g.fillText(`${p.edad != null ? p.edad + " años · " : ""}${p.complexion}`, tx, ty + 80);
    g.fillStyle = "#7a7480"; g.font = "20px sans-serif";
    g.fillText(`${p.sombrero} · ${p.peinado ?? ""} · ${p.ropa ?? ""}`.slice(0, 44), tx, ty + 116);
    const notas = props.notas?.[p.id] ?? [];
    if (notas.length) { g.fillStyle = "#a8433a"; g.fillText(("⚠ " + notas[0]).slice(0, 44), tx, ty + 146); }
  });
};

export const Hoja: React.FC<PropsHoja> = (props) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [h] = useState(() => delayRender("hoja"));
  const [w, hh] = tamHoja(props.personajes.length);
  useEffect(() => { if (ref.current) dibujarHoja(ref.current, props); continueRender(h); }, [props, h]);
  return <AbsoluteFill><canvas ref={ref} width={w} height={hh} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>;
};
