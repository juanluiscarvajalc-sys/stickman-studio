import React from "react";
import { Composition } from "remotion";
import { Historia } from "./Historia";
import { ANCHO, ALTO, FPS, Plan, cuadrosTotales, tamano } from "./motor/plan";
import ejemplo from "./ejemplo.json";
import { Hoja, tamHoja, PropsHoja } from "./Hoja";

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="Historia"
    component={Historia as unknown as React.FC<Record<string, unknown>>}
    width={ANCHO}
    height={ALTO}
    fps={FPS}
    durationInFrames={cuadrosTotales(ejemplo as unknown as Plan)}
    defaultProps={{ plan: ejemplo as unknown as Plan }}
    calculateMetadata={({ props }) => { const p = (props as { plan: Plan }).plan, [width, height] = tamano(p); return { durationInFrames: cuadrosTotales(p), width, height }; }}
  />
  <Composition
    id="Hoja"
    component={Hoja as unknown as React.FC<Record<string, unknown>>}
    width={3300}
    height={1000}
    fps={30}
    durationInFrames={1}
    defaultProps={{ personajes: [] }}
    calculateMetadata={({ props }) => { const [width, height] = tamHoja((props as unknown as PropsHoja).personajes.length); return { width, height }; }}
  />
  </>
);
