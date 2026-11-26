// Cliente mínimo de DeepSeek (API compatible con OpenAI). La clave se lee de .env (DEEPSEEK_API_KEY);
// nunca se escribe en los proyectos ni en los registros.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const cargarEnv = () => {
  const p = path.join(RAIZ, ".env");
  if (!fs.existsSync(p)) return;
  for (const linea of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
};
cargarEnv();

export const hayClave = () => !!process.env.DEEPSEEK_API_KEY;
const URL = () => (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com") + "/chat/completions";
const MODELO = () => process.env.DEEPSEEK_MODEL || "deepseek-flash";

/** repara corchetes/llaves mal cerrados (p. ej. una lista "pasos" que el modelo olvidó cerrar) y comas sobrantes */
export const repararJSON = (txt) => {
  let out = "", enStr = false, esc = false;
  const pila = [];
  for (const ch of txt) {
    if (enStr) { out += ch; if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') enStr = false; continue; }
    if (ch === '"') { enStr = true; out += ch; continue; }
    if (ch === "{" || ch === "[") { pila.push(ch); out += ch; continue; }
    if (ch === "}" || ch === "]") {
      const abre = ch === "}" ? "{" : "[";
      if (!pila.includes(abre)) continue; // cierre huérfano: se descarta
      while (pila.length && pila[pila.length - 1] !== abre) out += pila.pop() === "{" ? "}" : "]";
      pila.pop(); out = out.replace(/,\s*$/, ""); out += ch; continue;
    }
    out += ch;
  }
  if (enStr) out += '"';
  out = out.replace(/,\s*$/, "");
  while (pila.length) out += pila.pop() === "{" ? "}" : "]";
  return out;
};

/** extrae el primer objeto JSON de un texto (por si el modelo agrega texto alrededor) */
export const leerJSON = (txt) => {
  try { return JSON.parse(txt); } catch { /* sigue */ }
  const a = txt.indexOf("{"), b = txt.lastIndexOf("}");
  const cuerpo = a >= 0 && b > a ? txt.slice(a, b + 1) : txt;
  try { return JSON.parse(cuerpo); } catch { /* sigue */ }
  if (a >= 0) return JSON.parse(repararJSON(txt.slice(a)));
  throw new Error("La respuesta del agente no es JSON");
};

/** llama a un agente: system = su rol, user = la tarea; devuelve JSON. Reintenta 3 veces. */
export const agente = async ({ nombre, system, user, temperatura = 0.7, log = console.log, maxTokens = 8000 }) => {
  if (!hayClave()) throw new Error("Falta DEEPSEEK_API_KEY en el archivo .env");
  let ultimo;
  for (let i = 1; i <= 3; i++) {
    try {
      const t0 = Date.now();
      const r = await fetch(URL(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
        body: JSON.stringify({
          model: MODELO(), temperature: temperatura, max_tokens: maxTokens, response_format: { type: "json_object" },
          messages: [{ role: "system", content: system }, { role: "user", content: typeof user === "string" ? user : JSON.stringify(user) }],
        }),
      });
      if (!r.ok) throw new Error(`DeepSeek respondió ${r.status}: ${(await r.text()).slice(0, 300)}`);
      const j = await r.json();
      const out = leerJSON(j.choices[0].message.content);
      const u = j.usage ?? {};
      log(`${nombre}: listo en ${((Date.now() - t0) / 1000).toFixed(1)} s (${u.prompt_tokens ?? "?"} → ${u.completion_tokens ?? "?"} tokens)`);
      return out;
    } catch (e) {
      ultimo = e;
      log(`${nombre}: intento ${i} falló (${e.message}).`);
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  throw ultimo;
};
