# Stickman Studio — creador de historias de monitos de palito

Escribes el guion en una ventana y un equipo de agentes de **DeepSeek** lo convierte en un short vertical
(1080×1920, 30 fps) con personajes de palito en mundos 3D de caricatura. Todo el video sale de **código**
(Three.js + Remotion), sin generadores de video con IA. El motor reutiliza las piezas de
`shorts-animados-claude-main` (dibujante de personajes `toon.ts`, texturas pintadas, tinta, desenfoque, color).

## Cómo se usa
1. Doble clic en **`INICIAR.bat`**. La primera vez instala lo que falte y crea `.env`.
2. Abre `.env` y pega tu clave: `DEEPSEEK_API_KEY=sk-...` (se consigue en platform.deepseek.com). Reinicia.
3. Se abre `http://127.0.0.1:4500`: escribe el guion, elige voz, ritmo y calidad, y pulsa **Crear video**.
4. El video queda en `proyectos/<fecha>-<titulo>/video_final.mp4`, junto con todo lo que hizo cada agente.

Sin clave puedes marcar **«sin DeepSeek (prueba)»**: unas reglas simples hacen el trabajo de los agentes
(el resultado es básico, sirve para probar que todo funciona).

## El equipo de agentes (`agentes/`)
| Agente | Recibe | Entrega |
|---|---|---|
| **Organizador** | el guion | título, personajes y escenas (una frase de voz = una imagen) |
| **Diseñador** | la historia organizada | vestuario y colores de cada personaje; lugar, hora, posiciones, acciones, expresiones y objetos de cada escena |
| **Editor** | escenas + tiempos reales de cada palabra | cámara (tipo, plano, a quién mira), transiciones, efectos 2D en su palabra, rótulos |
| **Validador** | el plan completo + lo que encontró el verificador automático | aprobación, problemas y correcciones puntuales |

Además, `validar.mjs` (sin IA) revisa todo contra el catálogo del motor y lo deja siempre renderizable.
Los prompts están en `agentes/prompts.mjs`; el catálogo de lo que el motor sabe dibujar, en `agentes/catalogo.mjs`
(debe coincidir con `src/motor/plan.ts`). Las funciones de cada agente se pueden ampliar ahí.

## Qué sabe dibujar el motor hoy
- **Lugares:** campo, pueblo, bosque, castillo, ciudad, playa, desierto, montaña, interior, granja · **Horas:** día, atardecer, noche
- **Acciones:** parado, caminar, correr, hablar, saludar, señalar, celebrar, sorpresa, sentado, caer, cargar, encogerse, manos en la cadera, pensar
- **Expresiones:** 12 (neutral, serio, sonrisa, feliz, risa, nervioso, sorpresa, alivio, mareado, dolor, silbar, enojado) + parpadeo y boca que habla
- **Cámaras:** acercamiento, alejamiento, paneos, órbita, grúa, seguimiento, plano general, contrapicado; 4 planos; sacudida en impactos
- **Efectos 2D:** destello, chispas, estrellas, polvo, notas, signo «!», anillo · **Transiciones:** corte, fundido, destello, barrido
- **Objetos 3D:** árbol, pino, arbusto, casa, torre, muro, roca, carreta, cajas, barril, valla, farol, fogata, mesa, palmera, cactus, pozo, tienda, estatua

## Voz y sonido (`pipeline/`)
- `voz.py`: narración con **edge-tts** (gratis; el texto se envía al servicio en línea de Microsoft), una pista por escena y tiempos por palabra.
- `sonido.py`: música de fondo y efectos **sintetizados** (originales), ducking bajo la voz, mezcla a −14 LUFS.
- `render.mjs`: render con la API de Remotion (abre el navegador una vez, con reintentos).

## Línea de comandos
```
node agentes/orquestador.mjs guion.txt            # con DeepSeek, calidad borrador
node agentes/orquestador.mjs guion.txt --final    # 1080x1920
node agentes/orquestador.mjs guion.txt --local    # sin DeepSeek
node pipeline/render.mjs fotos proyectos/<x>/plan.json out/fotos 30,90,150 0.5
npm run studio                                    # Remotion Studio para ver src/ejemplo.json
```

## Notas
- La historia, los personajes y la voz son siempre tuyos; el video de referencia se usó solo para estudiar el estilo
  (proporciones, cámara en movimiento, tinta, desenfoque, color), no se copian sus personajes ni sus tomas.
- El render usa la GPU (aquí una MX130): el modo borrador (540×960) es ~4 veces más rápido que el final.
