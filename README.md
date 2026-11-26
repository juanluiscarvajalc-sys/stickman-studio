# Stickman Studio

Generador de videos animados de **monitos de palito en mundos 3D de caricatura**, hecho 100 % con código
(Three.js + React + Remotion). Un equipo de agentes de **DeepSeek** convierte un guion de texto en un plan de escenas
(personajes, decorados, acciones, cámara) y el motor lo renderiza a MP4 con voz (edge-tts) y sonido sintetizado.

> **¿Eres una IA ayudando con este proyecto?** Empieza por [`PARA_DEEPSEEK.md`](PARA_DEEPSEEK.md).

## Dos modos
| Modo | Formato | Entrada principal |
|---|---|---|
| **Short** | vertical 1080×1920, 30 fps, ~1 min | `agentes/orquestador.mjs` / la ventana web (`ui/index.html`) |
| **Episodio** (casos policiales, estilo cine negro) | horizontal, largo, por capítulos | `agentes/preproduccion.mjs` → `agentes/episodio.mjs` |

## Requisitos
- Node.js 20+, Python 3.10+, ffmpeg en el PATH
- `pip install edge-tts numpy soundfile`
- Una clave de DeepSeek (opcional: sin clave existe un modo de prueba con reglas simples)

## Instalar y correr
```bash
npm install
cp .env.example .env          # y pega tu DEEPSEEK_API_KEY
npm start                     # abre http://127.0.0.1:4500
```
En Windows basta con doble clic en `INICIAR.bat`.

Línea de comandos:
```bash
node agentes/orquestador.mjs guion.txt [--final] [--local]
node agentes/preproduccion.mjs guiones/ep01_lindbergh_v2.md proyectos/ep01 [--etapa 2|3]
node agentes/episodio.mjs ...                       # ver cabecera del archivo
npm run studio                                      # Remotion Studio con src/ejemplo.json
npm run tsc                                         # chequeo de tipos
```

## Estructura
```
agentes/     agentes DeepSeek (prompts, orquestador, preproducción, episodio, revisor) + validador sin IA
src/         composición Remotion (Historia.tsx, Hoja.tsx) y motor 3D en src/motor/
pipeline/    voz (edge-tts / ElevenLabs), sonido y música sintetizados, fondos (Pollinations), render
medir/       scripts para medir ritmo de cámara, brillo, etc. contra videos de referencia
guiones/     guiones de ejemplo (episodio 1: caso Lindbergh)
public/      texturas CC0 (Poly Haven) y fondos fotográficos ya generados
ui/          ventana web local
docs/        diagnóstico visual, imágenes de comparación y ejemplos de salida de los agentes
```

Documentación detallada: [`LEEME.md`](LEEME.md) (uso) y [`DIAGNOSTICO.md`](DIAGNOSTICO.md) (historial de mejoras y problemas medidos).

Los videos generados (`proyectos/`, `out/`) y `node_modules/` no se suben al repositorio.
