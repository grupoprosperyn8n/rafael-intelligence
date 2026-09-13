/*
 * Capa de IA del cockpit (Cliente 360° — "próxima mejor acción").
 *
 * Conecta con DeepSeek — el mismo proveedor que usa el CRM (agente Sira) —
 * vía API compatible con OpenAI. TODO es server-side: el token vive en
 * variables de entorno y nunca viaja al navegador (misma regla que Airtable).
 *
 * Env (server; solo el token es obligatorio):
 *   AI_API_TOKEN    key del proveedor de IA
 *   AI_BASE_URL     default https://api.deepseek.com
 *   AI_MODEL        default deepseek-chat
 *   AI_DAILY_LIMIT  tope diario de generaciones (default 300)
 *
 * Modos del motor (los elige el usuario en la interfaz):
 *   "dual"      el algoritmo del sistema prioriza y la IA enriquece
 *   "ia"        la IA analiza el contexto real y decide
 *   "algoritmo" sin IA — lo resuelve el dashboard como siempre (no llega acá)
 *
 * Reglas de oro: la IA NO inventa datos (contexto cerrado con los números
 * reales del sistema); los resultados se cachean por cliente+modo 24 h para
 * controlar el costo; y nunca devolvemos un error sin mensaje claro.
 */

import type {
  ClientInsight,
  ClientInsightContext,
  InsightMode,
} from "./types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const AI_TIMEOUT_MS = 45000;

const cache = new Map<
  string,
  { insight: ClientInsight; ts: number }
>();

let dailyStamp = "";
let dailyCount = 0;

function dailyLimit(): number {
  const raw = Number(process.env.AI_DAILY_LIMIT);

  return Number.isFinite(raw) && raw > 0 ? raw : 300;
}

function takeDailySlot(): boolean {
  const today = new Date().toISOString().slice(0, 10);

  if (dailyStamp !== today) {
    dailyStamp = today;
    dailyCount = 0;
  }

  if (dailyCount >= dailyLimit()) {
    return false;
  }

  dailyCount += 1;

  return true;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.AI_API_TOKEN?.trim());
}

export function aiModel(): string {
  return process.env.AI_MODEL?.trim() || "deepseek-chat";
}

function aiBaseUrl(): string {
  return (
    process.env.AI_BASE_URL?.trim() ||
    "https://api.deepseek.com"
  ).replace(/\/+$/, "");
}

function buildPrompt(
  context: ClientInsightContext,
  mode: "dual" | "ia"
): { system: string; user: string } {
  const system = [
    "Sos el asistente comercial de Rafael Allende, broker de seguros en Argentina.",
    "Escribís en español rioplatense, claro y directo, tratando de vos.",
    "Te paso el contexto REAL de un cliente tomado del sistema de gestión, con las reglas del negocio ya calculadas.",
    "REGLAS ESTRICTAS: usá SOLO los datos del contexto; no inventes cifras, productos ni situaciones; no prometas coberturas que no estén listadas; no uses emojis.",
    'Devolvé SOLO un JSON válido, sin texto extra, con esta forma exacta: {"accion": "...", "por_que": "...", "pasos": ["...", "...", "..."], "mensaje_whatsapp": "..."}',
    '"accion": la mejor acción comercial en 2 a 5 palabras.',
    '"por_que": 2 a 3 frases explicando por qué es la mejor acción para ESTE cliente.',
    '"pasos": 3 o 4 pasos concretos y accionables, en orden.',
    '"mensaje_whatsapp": mensaje breve (máximo 60 palabras), cordial, con la firma de Rafael Allende.',
  ].join("\n");

  const base = [
    "CONTEXTO REAL DEL CLIENTE:",
    `Nombre: ${context.name}`,
    `Pólizas activas: ${context.activePolicies}`,
    `Prima activa: $${context.activePremium}`,
    `Gestiones históricas: ${context.historicalOperations} (altas: ${context.historicalAltas}, anulaciones: ${context.historicalAnulaciones}, siniestros: ${context.historicalSiniestros})`,
    `Score de prioridad del sistema (0-100): ${context.score}`,
    `Acción que marcó el sistema por reglas: ${context.recommendation}`,
    `Explicación del sistema: ${context.recommendationWhy}`,
    `Pasos que propone el sistema: ${context.recommendationSteps.join(" | ") || "—"}`,
  ].join("\n");

  const instruction =
    mode === "dual"
      ? "TAREA (modo DUAL): el sistema ya priorizó con reglas. Confirmá ese análisis y enriquecelo con tu criterio comercial usando el mismo contexto: mismos números y misma acción, mejor explicación y mejores pasos."
      : "TAREA (modo SOLO IA): analizá vos el contexto completo y decidí la mejor acción comercial. Podés confirmar la sugerencia del sistema o proponer otra si los datos lo justifican.";

  return {
    system,
    user: `${base}\n\n${instruction}`,
  };
}

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function toInsight(
  raw: unknown,
  model: string
): ClientInsight | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = raw as Record<string, unknown>;

  const accion = String(data.accion || "")
    .trim()
    .slice(0, 90);

  const porQue = String(data.por_que || data.porQue || "")
    .trim()
    .slice(0, 800);

  const mensaje = String(
    data.mensaje_whatsapp ||
      data.mensajeWhatsapp ||
      ""
  )
    .trim()
    .slice(0, 900);

  const pasos = Array.isArray(data.pasos)
    ? data.pasos
        .map((step) => String(step).trim().slice(0, 400))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  if (
    !accion ||
    !porQue ||
    pasos.length === 0 ||
    !mensaje
  ) {
    return null;
  }

  return {
    accion,
    porQue,
    pasos,
    mensajeWhatsapp: mensaje,
    model,
    generatedAt: new Date().toISOString(),
    cached: false,
  };
}

async function callChatCompletions(
  system: string,
  user: string
): Promise<string> {
  const token = process.env.AI_API_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "La IA no está configurada en este dashboard."
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    AI_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `${aiBaseUrl()}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: aiModel(),
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.4,
          max_tokens: 600,
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const detail = await response
        .text()
        .catch(() => "");

      throw new Error(
        `El proveedor de IA respondió ${response.status}${detail ? `: ${detail.slice(0, 140)}` : ""}`
      );
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content =
      payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(
        "El proveedor de IA devolvió una respuesta vacía."
      );
    }

    return content;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "La IA tardó demasiado en responder. Probá de nuevo."
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateInsight(
  clientId: string,
  context: ClientInsightContext,
  mode: "dual" | "ia"
): Promise<ClientInsight> {
  const key = `${mode}:${clientId}`;
  const hit = cache.get(key);

  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return { ...hit.insight, cached: true };
  }

  if (!takeDailySlot()) {
    throw new Error(
      "Se alcanzó el límite diario de análisis con IA. Probá de nuevo mañana."
    );
  }

  const { system, user } = buildPrompt(context, mode);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const content = await callChatCompletions(
        system,
        user
      );

      const insight = toInsight(
        extractJson(content),
        aiModel()
      );

      if (!insight) {
        throw new Error(
          "La IA no devolvió un análisis en el formato esperado."
        );
      }

      cache.set(key, {
        insight,
        ts: Date.now(),
      });

      return insight;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(String(error));
    }
  }

  throw (
    lastError ||
    new Error("La IA no respondió. Probá de nuevo.")
  );
}
