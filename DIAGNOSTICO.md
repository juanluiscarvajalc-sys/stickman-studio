# Diagnóstico: nuestro video contra la referencia (2026-11-13)

Prueba: guion original equivalente ([out/guion_benchmark.txt](out/guion_benchmark.txt): fuerte, ejército, truco con
antorchas, misma fórmula) → generador con DeepSeek → [out/benchmark_fuerte.mp4](out/benchmark_fuerte.mp4) (71 s, 12 escenas).
Medido con `herramientas/medir_30fps.py` (la misma herramienta con la que se midieron los 20 shorts de referencia) y
revisado a 1 cuadro por segundo contra las hojas de referencia ([out/comparativa.jpg](out/comparativa.jpg)).

## Números
| Medida | Referencia | Nuestro | Lectura |
|---|---|---|---|
| Imágenes distintas por minuto | ~40–60 (cambia el encuadre cada 1–2 s) | ~10 (12 escenas, una toma de ~6 s cada una) | **5× menos ritmo** |
| Movimientos de cámara | ~1 cada 1–2 s, 18–24 cuadros | 23 en 71 s, mediana 34 cuadros | lentos y escasos |
| % de cuadros con cámara moviéndose | 65–80 % | 56 % | bajo |
| Cortes duros | 0–1 | 7 | demasiados |
| Brillo / saturación | 0.43–0.54 / 0.38–0.65 | 0.41 / 0.59 | color bien; noche un poco oscura |

## Lo que está mal (por orden de impacto)
1. **Ritmo de tomas (lo más grave).** La referencia ilustra cada frase y casi cada palabra importante con una imagen
   nueva: cara de reacción → objeto en primerísimo plano → vista aérea → ángulo desde abajo… Nosotros dejamos la misma
   toma 5–8 s con un acercamiento lento. El Organizador hace 12 escenas para 71 s; hacen falta 35–50 «tomas».
2. **Sets vacíos.** La referencia llena el cuadro: casas con ventanas, letreros, tribunas, muebles, decoración de
   cada lugar. Lo nuestro: un muro gris que ocupa media pantalla y un tercio inferior de pasto verde liso.
3. **No hay multitudes ni el elemento clave de la historia.** «Tres mil soldados», «cuarenta personas» y «mil luces en la
   colina» nunca se ven: salen 3–5 monitos y una fogata. En la referencia el «gancho visual» de cada historia es
   enorme y claro.
4. **Encuadres planos.** Siempre cámara a la altura del pecho, de frente. La referencia usa primerísimos planos de
   objetos, contrapicados extremos, vistas cenitales, planos sobre el hombro y personajes muy grandes en cuadro.
5. **Personajes quietos.** Casi todos de pie con los brazos colgando. En la referencia siempre hacen algo con un objeto
   y reaccionan en grupo.
6. **Noche sin luz cálida.** Nuestra noche es azul plana; la referencia tiene ventanas encendidas, charcos de luz de
   faroles, brillos y contraluces.
7. **Detalles:** objetos que tapan al sujeto (una torre en medio del cuadro), un rótulo cortado («400 → 800 → 10»),
   7 cortes duros en vez de fundidos o barridos.

## Plan de arreglo propuesto
| # | Arreglo | Dónde | Efecto esperado |
|---|---|---|---|
| A | **Sistema de tomas**: cada escena se divide en 3–5 tomas pegadas a las palabras (cara, objeto, general, detalle), con deslizamientos de 18–24 cuadros entre ellas | Editor + `camara.ts` + `plan.ts` | ritmo ×4, el cambio más visible |
| B | **Multitudes** (cientos de monitos con el sistema `troop/crowd` de la plantilla de Alejandro) y **luces masivas** (cientos de antorchas/ventanas) | `actores.ts`, `mundo.ts` | los ganchos visuales se ven |
| C | **Sets densos por lugar** (fuerte con puerta y torres, calle de pueblo con puestos, interiores amueblados), suelo con caminos y matas, sin pasto liso | `mundo.ts` | cuadro lleno como la referencia |
| D | **Encuadres expresivos**: primerísimo plano de objeto, cenital, contrapicado extremo, sobre el hombro; personajes más grandes | `camara.ts` + Editor | variedad visual |
| E | **Noche cálida**: ventanas y faroles que emiten luz, luna, contraluces | `luces.ts`, `mundo.ts` | noches con vida |
| F | Comprobación de oclusión (nada entre cámara y sujeto) y rótulos validados | `validar.mjs`, `Historia.tsx` | sin errores tontos |

## Avance A — sistema de tomas (2026-11-13)
- Cada escena se divide en tomas de 0.9–2.2 s pegadas a las palabras (`src/motor/director.ts`, `src/motor/camara.ts`).
  El Editor de DeepSeek las propone; si se queda corto, el director automático completa.
- 6 planos (detalle, rostro, primer plano, medio, general, panorámico) × 6 ángulos (frente, bajo, alto, cenital, lado,
  sobre el hombro) × 6 movimientos dentro de la toma (empuje, alejar, paneo, subir, bajar, órbita).
- La cámara rodea los objetos que taparían al sujeto (inventario de obstáculos del mundo).
- Regla de transición medida en la referencia: reencuadre grande = corte limpio; cambio moderado = deslizamiento de 20 cuadros.
- Resultado en el fuerte: 12 → 46 tomas (una cada ~1.5 s); cámara en movimiento 56 % → 70 % de los cuadros.
- Pendiente (B–E): multitudes y luces masivas, sets densos, noche cálida, personajes con más acción.

## Avance B — multitudes y luces masivas (2026-11-13)
- `src/motor/multitud.ts`: multitudes por instancias (hasta 4000 monitos: ejército, pueblo, público, guardias) en filas,
  grupo o círculo; paradas, marchando, corriendo, celebrando o peleando; con objeto en la mano (con antorcha, cada uno
  lleva su luz). Luces masivas (antorchas, ventanas, faroles, velas) que crecen en número, giran o parpadean, y cubren
  una loma cuando van en alto.
- Los agentes las piden solos: en el fuerte salieron el ejército de 300, el pueblo de 40 con antorchas y las luces
  400 → 800 → 1000. El director y la cámara les dan tomas propias (`multitud:N`, `luces:N`).
- Arreglos de la revisión cuadro por cuadro: detalle = objeto en la mano (no torso gigante), cámara nunca dentro de un
  objeto, luces pegadas a la lente se apagan, rótulos de hasta 26 caracteres.
- Medición (out/benchmark_fuerte_v4.mp4, 54 s): 45 tomas (1 cada 1.2 s), cámara en movimiento 94 % (referencia 65–80 %),
  brillo 0.34 (referencia 0.43–0.54: la noche está demasiado oscura → arreglo E).
- Pendiente: C (sets densos: el muro gris sigue llenando cuadros) y E (noche cálida y más clara).

## Avance C + E — sets densos y noche cálida (2026-11-13)
- **Sets densos** (`src/motor/mundo.ts`): cada lugar arma un anillo de decorado a 8–20 m del escenario (casas mirando
  al centro, puestos de mercado con toldo y fruta, letreros pintados, estandartes, antorchas, carpas, heno, leña,
  bancos, macetas, cestas). Suelo con ~2600 matas de pasto y florecitas por instancias (sin tinta, nunca pegadas a la
  lente). El muro tiene portón, estandartes, antorchas e hiedra; la torre, ventanas y bandera. El interior trae
  chimenea con fuego, estantes con frascos, cuadros, alfombra, mesa con sillas y macetas.
- **Luz cálida** (`src/motor/calida.ts`): el sombreado del mundo y de los personajes ignoraba las luces puntuales
  (por eso las fogatas no iluminaban nada). Ahora hasta 12 fuentes por cuadro (faroles, fogatas, hornos, ventanas,
  antorchas, multitudes con antorcha y luces masivas) suman su charco de luz al suelo, las paredes y los personajes.
- **Noche**: cielo más claro con luna y halo, niebla azul media, ventanas encendidas con farolito en cada puerta.
  Fuego dibujado como llama de caricatura (sin conos con contorno).
- Arreglos: «detalle» de un objeto lo encuadra entero (la fogata ya no llena la pantalla); el validador saca a las
  multitudes de detrás de muros y casas; el Diseñador sabe que el lugar ya viene decorado.
- Medición (out/benchmark_fuerte_v5.mp4, mismo plan del v4 con el motor nuevo): brillo 0.34 → 0.39 (referencia
  0.43–0.54, la noche sigue algo más oscura a propósito), saturación 0.58, 47 tomas, cámara en movimiento 94 %.
- Pendiente: el muro todavía llena algunos planos cercanos; la carpa vista desde arriba se ve como un plano liso;
  la cámara se mueve un poco más que en la referencia (94 % contra 65–80 %).

## Pulido (v6, 2026-11-13)
- Muro, torre y casa se mandan al fondo (11/9/8 m detrás de los actores) y las multitudes salen de detrás de ellos.
- Carpa con lona a rayas, cumbrera y estacas (ya no es un plano beige visto desde arriba).
- ~4 de cada 10 tomas cercanas casi quietas, como la referencia.
- Medición v6: cámara en movimiento 94 % → **78 %** (referencia 65–80 % ✅), 49 tomas, brillo 0.39, saturación 0.59.

## Detalle de escenarios y personajes (v7, 2026-11-13) — pedido del usuario tras revisar la referencia
Revisión de la referencia (solo estudio de estilo): pasto de hojas sueltas en primer plano, campos de cultivo en parches
a lo lejos, muros de bloques con musgo, patios de losas, montañas con crestas y bruma, nubes con volumen, pelo de trazo
rizado y ropa con textura (acolchada, cinturones), fuego de bandas con humo.
- **Suelos por lugar** (`src/motor/suelos.ts`): césped pintado por paleta de lugar + ~16 000 matas de hojas sueltas
  (se mecen con el viento, se encogen cerca de la lente), camino con huellas de carreta, lomo con matas y piedritas,
  plaza de adoquín de época (pueblo), patio de losas con musgo (castillo), arena con ondas (playa y desierto).
- **Paisaje**: relieve real en anillo (colinas con campos de cultivo en parches y setos, montañas con roca y nieve),
  arboledas y setos lejanos, nubes de cúmulos con volumen, bruma por distancia.
- **Árboles**: copas de bolas con textura de hojas, tronco con corteza y ramas; variantes redondo, álamo y frutal;
  pinos de faldas irregulares.
- **Casas**: 5 formas (cabaña, dos pisos, alta, en L, con torreón), 9 colores de fachada de la referencia, ventanas en
  todas las caras, techo de teja, teja oscura, pizarra o paja, chimeneas con humo, toldos, jardineras, balcones y 3
  estados (nueva, gastada, ruina con techo roto y ventanas tapiadas).
- **Fuego** (`src/motor/fuego.ts`): llama animada de forma irregular con bandas blanco → amarillo → naranja → rojo,
  lenguas sueltas, humo que sube y se disipa, chispas.
- **Personajes**: 7 peinados (liso, rizado, punta, moño, coleta, largo, calvo) con mechones; 9 ropas (acolchada,
  rayas, cuadros, parches, chaleco, delantal, capa, túnica); rasgos (gafas, barba, pecas, mejillas, cejas gruesas,
  arrugas); 4 expresiones nuevas (triste, asustado, pensativo, pícaro) y enojado de verdad. El validador elige por
  oficio si el Diseñador no lo dice (soldado → acolchado, panadero → delantal, noble → capa, abuela → moño y gafas).
- **Luz**: nueva hora «amanecer»; el sol de día más bajo y de lado (sombras más largas).
- **Mecánica**: multitud «girar» (ronda que da vueltas, con sus antorchas); luces en círculo + multitud = las antorchas
  de la multitud (ya no quedan fuera de las murallas); los actores que caminan rodean a los demás en vez de
  atravesarlos; una multitud que marcha se detiene antes de pisar a los actores.

## v8 (2026-11-13) — formas irregulares y paisaje, arreglos de la revisión del usuario
- Capa: dos paños que caen por detrás desde los hombros (antes un trapecio tapaba las piernas por delante).
- Aldeanos que se atravesaban: multitudes en grupo con separación mínima de 0.62 m; actores que caminan a la vez se
  comparan en el tiempo y uno se desvía; las rondas tienen vueltas separadas.
- «Caminaron en círculos alrededor de las murallas»: si la narración lo dice, la gente del pueblo hace la ronda con
  antorchas DENTRO de las murallas (entre el muro y los actores); ya no quedan luces sueltas girando afuera.
- Formas irregulares (`src/motor/formas.ts`): copas de árbol abolladas, troncos y ramas torcidos, pinos de falda
  dentada, rocas facetadas, mesa de tablas con patas torneadas, barril con panza y aros, cajones de tablas,
  muro de bloques grises con caras abolladas, almenas desparejas, contrafuertes, camino de ronda y musgo.
- Paisaje: anillo cercano con campos de cultivo y anillo lejano de montañas con manchas de bosque, roca en vetas y
  nieve; nubes pintadas suaves (cúmulos difusos con base plana); pasto más alto y oscuro en la base.

## v10 (2026-11-13) — paisaje más cercano a la referencia
- Bosques lejanos: hasta 9000 árboles (pinos y copas) sobre las laderas del relieve, en manchas, sin subir a la roca
  ni a la nieve. Bruma en tres capas (150, 240 y 340 m) del color del horizonte; niebla más lejana para que las montañas
  se vean verdes y con relieve, como en la referencia.

## v11 (2026-11-13) — texturas fotográficas CC0 (Poly Haven)
- `public/texturas/` (licencias en LICENCIAS.md): muro de castillo, roca, ladera vista de lejos, adoquín, camino con
  pasto y dos cielos (día con nubes y atardecer). `src/motor/texturas.ts` las carga antes del primer cuadro; si falta
  alguna, el motor usa la pintada. El césped de cerca sigue pintado (la foto de pasto quedaba marrón).

## v13 (2026-11-13) — fondos fotográficos con Pollinations (método combinado)
- El Diseñador escribe en cada escena "fondo" (inglés, sin personas): paisaje lejano, vegetación, cielo, época.
- `pipeline/fondos.mjs` pide la panorámica a Pollinations (gratis, sin cuenta; respeta su espera de ~18 s entre
  imágenes, nunca paga), recorta la marca de agua y la guarda en `public/fondos/<proyecto>/`. Paso nuevo «Fondos
  fotográficos» en la ventana.
- El motor la pone en un cilindro de 360° (en espejo) con el horizonte de la foto a la altura de los ojos; el suelo 3D
  termina en un disco de borde irregular para que se vea el primer plano de la foto. Reemplaza colinas, montañas,
  bosques lejanos, bruma, nubes y cielo pintado. Si una imagen falla, esa escena usa el paisaje 3D.
- Pelo con mechones (raya, brillo, flequillo, rulos) y barba con borde de mechones y rizos.
- Antorchas que se mueven (en círculo o marchando) las lleva siempre una multitud de aldeanos.
