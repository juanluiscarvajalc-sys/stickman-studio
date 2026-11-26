// REVISOR DE ESCENAS (DeepSeek): revisa por escrito lo que propuso el director, bloque por bloque, antes de animar.
// DeepSeek no ve imágenes: lee cada escena como texto (decorado, hora, clima, quién está, qué hace, qué lleva, dónde está)
// y la compara con el guion y la biblia, con la lista de chequeo de abajo. Devuelve correcciones acotadas que se aplican
// aquí; después pasan las reglas fijas de agentes/coherencia.mjs (que siempre ganan).
import { agente } from "./deepseek.mjs";
import { C } from "./catalogo.mjs";
import { ACCIONES_DESC, textoLecciones, textoBibliaVisual } from "./biblioteca.mjs";

const REVISOR = () => `Eres el REVISOR DE ESCENAS de una serie animada de casos reales (personajes de dibujo en decorados 3D fijos).
El director ya convirtió un bloque del guion en escenas. Tú lo revisas ANTES de animar, como un supervisor de continuidad de TV.
Recibes: la secuencia de la biblia (qué hace y qué siente cada personaje), el reparto con sus papeles y la lista de escenas
(narración + lo que se ve). Revisa CADA escena con esta lista de chequeo:
1. ACTÚAN LO NARRADO: si la narración cuenta una acción (anota, saca fotos, entrevista, espía, sube la escalera, carga al bebé,
   lee la nota, se preocupa, discute, pilota), el personaje que la hace está en la escena y tiene ESA acción. Nadie "parado" sin motivo.
2. OFICIOS: el detective/policía anota (escribir + libreta) o lee pruebas; el fotógrafo de prensa "fotografiar" + camara_foto;
   el reportero "entrevistar" + microfono; la niñera y la madre angustiadas "preocuparse"; quien llora "cubrirse".
3. EXPRESIONES coherentes con lo que siente (biblia "siente"): miedo, preocupación, seriedad; nada de sonrisas en momentos trágicos.
4. QUIÉN ESTÁ: no falta el personaje del que habla la narración (si se lo puede mostrar) y no sobran personajes que no tienen
   nada que ver. Un personaje que ya murió o se fue no reaparece. El bebé nunca está parado: va en brazos (cargar + mano bebe) o en la cuna.
5. LUGAR Y TIEMPO: el decorado, la hora y el clima corresponden a lo narrado (no es de noche si la narración dice "esa mañana").
   La prensa nunca está dentro de la casa. El secuestro ocurre de noche y a oscuras.
6. OBJETOS: los que la narración nombra y se pueden mostrar están (nota, escalera, cuna, auto…); nada absurdo (una escalera dentro de un cuarto).
7. LO QUE NO SE MUESTRA: violencia o un cadáver no se muestran; se muestra la reacción o el lugar.
8. GESTICULACIÓN: nadie sostiene la misma acción toda una escena larga. A quien escucha o reacciona dale "pasos" (2–3 cambios cada 2–4 s)
   con gestos humanos: asentir, negar, cruzar_brazos, dudar, suspirar, desesperarse, consolar, abrazar, retroceder, temblar, mirar_reloj, ir_y_venir…
Si una escena está bien, no la toques. Solo correcciones necesarias y concretas.
Acciones posibles: ${Object.keys(ACCIONES_DESC).join(", ")}. Expresiones: ${C.expresiones.join(", ")}.
Objetos en la mano: ${C.en_mano.join(", ")}. Objetos: ${C.objetos.join(", ")}.
Devuelve SOLO JSON: {"correcciones": [
 {"escena": 3, "op": "actor", "id": "investigador", "accion": "escribir", "mano": "libreta", "expresion": "serio", "motivo": "..."},
 {"escena": 4, "op": "agregar_actor", "id": "betty_gow", "x": -1, "z": -1.5, "accion": "preocuparse", "expresion": "preocupado", "motivo": "..."},
 {"escena": 5, "op": "quitar_actor", "id": "periodista1", "motivo": "..."},
 {"escena": 6, "op": "ambiente", "hora": "dia", "clima": "nublado", "motivo": "..."},
 {"escena": 7, "op": "agregar_objeto", "tipo": "auto", "x": 3, "z": -4, "motivo": "..."},
 {"escena": 8, "op": "quitar_objeto", "tipo": "escalera", "motivo": "..."},
 {"escena": 9, "op": "pasos", "id": "anne_morrow", "pasos": [{"t": 2.5, "accion": "desesperarse", "expresion": "asustado"}, {"t": 5, "accion": "suspirar", "expresion": "triste"}], "motivo": "..."}]}
"escena" = número de la escena en la lista (empieza en 1). Si todo está bien: {"correcciones": []}.${textoLecciones()}${textoBibliaVisual()}`;

const resumenEscena = (e, i, papel) => ({
  n: i + 1, narracion: e.narracion, habla: e.habla ?? null,
  decorado: `${e.ambiente?.escenario ?? e.ambiente?.lugar ?? "?"} · ${e.ambiente?.hora ?? "?"}${e.ambiente?.clima ? " · " + e.ambiente.clima : ""}`,
  actores: (e.actores ?? []).map((a) => `${a.id} (${papel(a.id)}) en (${a.x},${a.z}): ${[a.accion, ...(a.pasos ?? []).map((p) => p.accion)].join(" > ")}${a.mano ? " con " + a.mano : ""}, ${a.expresion ?? "neutral"}`),
  objetos: (e.objetos ?? []).map((o) => `${o.tipo}${o.estado && o.estado !== "normal" ? " (" + o.estado + ")" : ""}`),
  gente: (e.multitudes ?? []).map((m) => `${m.cantidad} ${m.tipo}`),
});

/** revisa las escenas de un bloque y aplica las correcciones; devuelve la lista de cambios (para el informe) */
export const revisarBloque = async (escenas, { secuencia, personajes, nombre, log, cache }) => {
  const filmables = escenas.filter((e) => e && !e.titulo);
  if (!filmables.length) return [];
  const papel = (id) => personajes.find((p) => p.id === id)?.papel ?? "?";
  let r = cache?.leer();
  if (!r) {
    r = await agente({ nombre: `Revisor ${nombre}`, system: REVISOR(), temperatura: 0.2, maxTokens: 4000, log,
      user: { secuencia: secuencia ? { resumen: secuencia.resumen, hora: secuencia.hora, clima: secuencia.clima, personajes: secuencia.personajes, momentos_clave: secuencia.momentos_clave } : null,
        reparto: personajes.map((p) => `${p.id}: ${p.papel ?? p.descripcion ?? ""}`), escenas: filmables.map((e, i) => resumenEscena(e, i, papel)) } });
    cache?.guardar(r);
  }
  const hechos = [], ids = new Set(personajes.map((p) => p.id));
  const accion = (v) => (Object.keys(ACCIONES_DESC).includes(v) ? v : null), expr = (v) => (C.expresiones.includes(v) ? v : null), mano = (v) => (C.en_mano.includes(v) ? v : undefined);
  for (const c of r?.correcciones ?? []) {
    const e = filmables[Number(c.escena) - 1]; if (!e || !c.op) continue;
    e.actores = e.actores ?? []; e.objetos = e.objetos ?? [];
    const a = e.actores.find((x) => x.id === c.id);
    if (c.op === "actor" && a) {
      const antes = JSON.stringify([a.accion, a.expresion, a.mano]);
      if (accion(c.accion)) { a.accion = c.accion; if (e.habla !== a.id && a.accion !== "caminar" && a.accion !== "correr") delete a.pasos; }
      if (expr(c.expresion)) a.expresion = c.expresion;
      if (mano(c.mano)) a.mano = c.mano;
      if (JSON.stringify([a.accion, a.expresion, a.mano]) === antes) continue;     // nada cambió (acción inexistente o igual)
    } else if (c.op === "agregar_actor" && !a && ids.has(c.id) && e.actores.length < 6) {
      e.actores.push({ id: c.id, x: Number.isFinite(+c.x) ? +c.x : 1.5, z: Number.isFinite(+c.z) ? +c.z : -1.2, accion: accion(c.accion) ?? "parado", expresion: expr(c.expresion) ?? "serio", ...(mano(c.mano) ? { mano: c.mano } : {}) });
    } else if (c.op === "pasos" && a && Array.isArray(c.pasos) && c.pasos.length && !["caminar", "correr", "trepar", "entrar"].includes(a.accion) && !(a.pasos ?? []).length) {
      const ps = c.pasos.filter((p) => accion(p.accion) && Number.isFinite(+p.t) && +p.t > 0.5).slice(0, 4)
        .map((p) => ({ cuando: null, t: +p.t, accion: p.accion, ...(expr(p.expresion) ? { expresion: p.expresion } : {}), ...(mano(p.mano) ? { mano: p.mano } : {}) }));
      if (!ps.length) continue; a.pasos = ps.sort((x, y) => x.t - y.t);
    } else if (c.op === "quitar_actor" && a && e.habla !== a.id) e.actores = e.actores.filter((x) => x !== a);
    else if (c.op === "ambiente") {
      e.ambiente = e.ambiente ?? {};
      if (C.horas.includes(c.hora)) e.ambiente.hora = c.hora;
      if (C.climas.includes(c.clima)) e.ambiente.clima = c.clima;
    } else if (c.op === "agregar_objeto" && C.objetos.includes(c.tipo)) e.objetos.push({ tipo: c.tipo, x: Number.isFinite(+c.x) ? +c.x : 3, z: Number.isFinite(+c.z) ? +c.z : -4 });
    else if (c.op === "quitar_objeto") e.objetos = e.objetos.filter((o) => o.tipo !== c.tipo);
    else continue;
    hechos.push(`escena ${c.escena}: ${c.op}${c.id ? " " + c.id : ""}${c.tipo ? " " + c.tipo : ""}${c.accion ? " → " + c.accion : ""} (${String(c.motivo ?? "").slice(0, 90)})`);
  }
  return hechos;
};
