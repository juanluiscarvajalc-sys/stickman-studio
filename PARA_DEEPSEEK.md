# Guía para la IA que va a ayudar (DeepSeek)

Hola. Este repositorio es **Stickman Studio**: un generador de videos animados de monitos de palito en 3D, escrito
en JavaScript/TypeScript (Three.js + React + Remotion) con un equipo de agentes que usan **tu API** (DeepSeek) para
planificar las escenas. El dueño quiere que lo ayudes a **mejorar la calidad de los videos** y a seguir avanzando.
Habla con él en **español** y en lenguaje sencillo: no es programador profesional.

## 1. Cómo funciona (flujo de datos)
```
guion (texto)
  └─► agentes DeepSeek  (agentes/*.mjs, llamadas vía agentes/deepseek.mjs)
        Short:    Organizador → Diseñador → Editor → Validador          (agentes/orquestador.mjs, prompts.mjs)
        Episodio: Analista → Diseñador de personajes → Escenógrafo       (agentes/preproduccion.mjs)
                  → Director por bloque → Revisor → Continuidad         (agentes/episodio.mjs, revisor.mjs, coherencia.mjs)
  └─► validar.mjs  (SIN IA: corrige todo contra el catálogo para que siempre se pueda renderizar)
  └─► plan.json    (formato definido en src/motor/plan.ts — debe coincidir con agentes/catalogo.mjs)
  └─► voz.py + sonido.py  (pipeline/)  →  tiempos por palabra
  └─► src/motor/director.ts + camara.ts  (divide escenas en tomas de 0.9–2.2 s pegadas a las palabras)
  └─► Remotion render  (pipeline/render.mjs, src/Historia.tsx)  →  MP4
```

## 2. Archivos clave
| Archivo | Qué hace | Tamaño |
|---|---|---|
| `src/motor/plan.ts` | **Contrato** del plan (tipos de escena, acciones, cámaras…) | 19 KB |
| `agentes/catalogo.mjs` | Lo que el motor sabe dibujar, en texto para los prompts. Debe coincidir con `plan.ts` | 13 KB |
| `agentes/validar.mjs` | Validador/corrector automático del plan | 37 KB |
| `agentes/biblioteca.mjs` | Biblioteca de vestuario, rasgos, acciones; inyecta `lecciones.json` en los prompts | 22 KB |
| `agentes/lecciones.json` | Correcciones aprendidas de las revisiones del dueño (reglas de actuación/escenografía) | 2 KB |
| `src/motor/toon.ts` | Dibujante de personajes (cuerpo, cara, pelo, ropa, 16 expresiones, poses) | **137 KB** |
| `src/motor/mundo.ts` | Decorados, sets densos, objetos, paisaje | **99 KB** |
| `src/motor/epoca.ts` | Decorados de época (años 30: mansión, aeródromo, calle…) para el modo episodio | 56 KB |
| `src/motor/actores.ts` | Movimiento de personajes, caminatas, esquivar a otros | 35 KB |
| `src/motor/multitud.ts` | Multitudes por instancias (hasta 4000) y luces masivas | 19 KB |
| `src/motor/camara.ts`, `director.ts` | Sistema de tomas y movimientos de cámara | 20 KB |
| `src/motor/ink.ts`, `grade.ts`, `lensblur.ts`, `calida.ts` | Contorno de tinta, color, desenfoque, luz cálida | — |

## 3. Estado actual y problemas conocidos
Lee **`DIAGNOSTICO.md`**: tiene las mediciones contra los videos de referencia y lo que se hizo versión por versión
(v1 → v13). Resumen de lo que **sigue mal o a medias**:

1. **Actuación de personajes**: tienden a quedarse quietos o repetir el mismo gesto; las reglas de
   `agentes/lecciones.json` salen de las quejas del dueño (nadie dentro de la cuna, se ve a quien habla, cambiar de
   gesto cada 2–4 s, gesticular como humanos…). Mira `docs/imagenes/rev_*.jpg`.
2. **Escenografía incoherente**: utilería de exterior dentro de salas, objetos atravesados, cosas bloqueando puertas.
3. **Ritmo / cámara**: la cámara se mueve ~94 % del tiempo contra 65–80 % en la referencia (demasiado inquieta).
4. **Noche algo oscura** (brillo 0.39 vs 0.43–0.54 de referencia).
5. **Archivos enormes** (`toon.ts`, `mundo.ts`) difíciles de mantener; conviene dividirlos sin romper nada.
6. `esbuild` se usa en `agentes/episodio.mjs` pero no está declarado en `package.json` (llega como dependencia de Remotion).
7. Render lento en la GPU del dueño (NVIDIA MX130): un capítulo tarda ~10 min.

## 4. Ejemplos de salida real
- `docs/ejemplos/plan_v13.json` — un plan completo de short (guion en `docs/ejemplos/guion_benchmark.txt`).
- `docs/ejemplos/ep01-lindbergh-v3/` — salida de cada agente del modo episodio: biblia, reparto, personajes,
  escenarios, 2 bloques del director (`2_dir_*`), una revisión (`2_rev_*`) y continuidad.
- `docs/imagenes/` — hojas de cuadros renderizados y comparativas con la referencia.
- `docs/idea_agente4.txt` — idea pendiente del dueño: un "Agente 4 — Stickman: Expedientes Criminales" independiente
  de los agentes actuales (ver también `agentes/estudio.mjs`).

## 5. Reglas para trabajar en este proyecto
- **No rompas el contrato**: si agregas una acción, objeto o cámara, cámbialo en `src/motor/plan.ts`,
  `agentes/catalogo.mjs`, `agentes/validar.mjs` y el motor, todo junto.
- **Cambios pequeños y probables**: un problema a la vez, con el archivo y la función exacta que tocas.
  Entrega código completo de la función modificada (el dueño copia y pega).
- Para probar rápido sin gastar API: `node agentes/orquestador.mjs guion.txt --local`, o renderizar solo algunos
  cuadros: `node pipeline/render.mjs fotos <plan.json> out/fotos 30,90,150 0.5`.
- Verifica tipos con `npm run tsc` antes de dar algo por terminado.
- Nunca pongas la clave de API en el código: va en `.env` (`DEEPSEEK_API_KEY`).
- Todo el contenido visual es original (no copiar personajes ni tomas de los videos de referencia).

## 6. Por dónde empezar (sugerencia)
1. Lee `README.md`, `LEEME.md`, `DIAGNOSTICO.md` y `src/motor/plan.ts`.
2. Pregúntale al dueño cuál es **el problema que más le molesta hoy** en los videos y pídele una captura.
3. Propón un plan corto (qué archivo, qué cambio, cómo se prueba) antes de escribir código.
