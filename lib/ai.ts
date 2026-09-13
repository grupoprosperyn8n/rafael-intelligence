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

import { MODULE_AI_IDS } from "./types";

import type {
  ClientInsight,
  ClientInsightContext,
  InsightMode,
  ModuleAiId,
  ModuleInsight,
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
  user: string,
  maxTokens = 600
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
          max_tokens: maxTokens,
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

/* ------------------------------------------------------------------------ *
 * Capa IA de MÓDULOS del tablero: Pulso, Cartera, Retención, Reactivación,
 * Venta cruzada, Calidad de migración y CRM.
 *
 * Misma filosofía que el Cliente 360°: contexto cerrado con los números
 * reales del módulo (los arma el dashboard), JSON estricto, cache por
 * módulo+modo 6 h y el token SIEMPRE server-side.
 * ------------------------------------------------------------------------ */

const MODULE_BRIEFS: Record<
  ModuleAiId,
  { title: string; brief: string; expectsMessage: boolean }
> = {
  pulso: {
    title: "Pulso del negocio",
    brief:
      "la foto general del negocio: altas, anulaciones, crecimiento neto, siniestros, cotizaciones y evolución mensual",
    expectsMessage: false,
  },
  cartera: {
    title: "Cartera",
    brief:
      "las pólizas cargadas y activas, la prima que representan y el reparto por producto, compañía y oficina",
    expectsMessage: false,
  },
  retencion: {
    title: "Retención",
    brief:
      "las renovaciones que se vienen (vencimientos en ≤7 y ≤30 días), los clientes a observar por anulaciones históricas y los siniestros",
    expectsMessage: true,
  },
  reactivacion: {
    title: "Reactivación",
    brief:
      "los clientes históricos que hoy no tienen póliza activa cargada y el universo potencial para recontactarlos",
    expectsMessage: true,
  },
  cross: {
    title: "Venta cruzada",
    brief:
      "los clientes con una sola póliza activa y las oportunidades de sumar productos (por ejemplo Auto → Auxilio/Hogar/Vida)",
    expectsMessage: true,
  },
  migracion: {
    title: "Calidad y avance de la migración",
    brief:
      "el avance de la migración de datos: cuánto quedó vinculado entre clientes y gestiones y qué campos faltan completar",
    expectsMessage: false,
  },
  crm: {
    title: "CRM · Venta y gestión",
    brief:
      "el pulso comercial del CRM: contactos, conversaciones, mensajes (incluida la IA del agente), leads, conversión, pipeline y el vínculo con la cartera",
    expectsMessage: false,
  },
};

const MODULE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const moduleCache = new Map<
  string,
  { insight: ModuleInsight; ts: number }
>();

export function isModuleAiId(
  value: string
): value is ModuleAiId {
  return (MODULE_AI_IDS as readonly string[]).includes(
    value
  );
}

function contextLines(
  context: Record<string, unknown>
): string[] {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(
    context
  )) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }

    const text = Array.isArray(value)
      ? value
          .filter(
            (item) =>
              item !== null &&
              item !== undefined &&
              item !== ""
          )
          .slice(0, 12)
          .map((item) => String(item).slice(0, 220))
          .join(" · ")
      : String(value).slice(0, 400);

    if (!text) {
      continue;
    }

    lines.push(`- ${key}: ${text}`);

    if (lines.length >= 60) {
      break;
    }
  }

  return lines;
}

function buildModulePrompt(
  module: ModuleAiId,
  context: Record<string, unknown>
): { system: string; user: string } {
  const brief = MODULE_BRIEFS[module];

  const system = [
    "Sos el analista de negocio de Rafael Allende, broker de seguros en Argentina.",
    "Escribís en español rioplatense, claro y directo, tratando de vos; te lee el dueño o gerente del negocio, no un técnico.",
    `Estás analizando el módulo "${brief.title}" del tablero de gestión, que muestra ${brief.brief}.`,
    "REGLAS ESTRICTAS: usá SOLO los datos del contexto; no inventes cifras, clientes ni situaciones; si un dato no está, no lo supongas; no uses emojis.",
    'Devolvé SOLO un JSON válido, sin texto extra, con esta forma exacta: {"resumen": "...", "focos": ["...", "..."], "acciones": ["...", "..."], "mensaje": "..."}',
    '"resumen": 2 o 3 frases con lo más importante que dicen los datos (incluí los números clave).',
    '"focos": 3 o 4 puntos cortos de qué mirar y por qué, mirando los números del módulo.',
    '"acciones": 3 a 5 acciones concretas y priorizadas para esta semana.',
    brief.expectsMessage
      ? '"mensaje": un mensaje breve de WhatsApp (máximo 60 palabras, cordial, con la firma de Rafael Allende) listo para enviar a un cliente tipo de este módulo.'
      : '"mensaje": cadena vacía, este módulo no requiere mensaje al cliente.',
  ].join("\n");

  const user = [
    "DATOS REALES DEL MÓDULO:",
    ...contextLines(context),
    "",
    "TAREA: leé estos números como analista de negocio del dueño y devolvé el JSON pedido.",
  ].join("\n");

  return { system, user };
}

function toModuleInsight(
  raw: unknown,
  model: string
): ModuleInsight | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = raw as Record<string, unknown>;

  const resumen = String(data.resumen || "")
    .trim()
    .slice(0, 900);

  const mensaje = String(data.mensaje || "")
    .trim()
    .slice(0, 900);

  const toList = (value: unknown, max: number) =>
    Array.isArray(value)
      ? value
          .map((item) =>
            String(item).trim().slice(0, 400)
          )
          .filter(Boolean)
          .slice(0, max)
      : [];

  const focos = toList(data.focos, 6);
  const acciones = toList(data.acciones, 6);

  if (!resumen || acciones.length === 0) {
    return null;
  }

  return {
    resumen,
    focos,
    acciones,
    mensaje,
    model,
    generatedAt: new Date().toISOString(),
    cached: false,
  };
}

export async function generateModuleInsight(
  module: ModuleAiId,
  mode: "dual" | "ia",
  context: Record<string, unknown>,
  force = false
): Promise<ModuleInsight> {
  const key = `module:${module}:${mode}`;
  const hit = moduleCache.get(key);

  if (
    !force &&
    hit &&
    Date.now() - hit.ts < MODULE_CACHE_TTL_MS
  ) {
    return { ...hit.insight, cached: true };
  }

  if (!takeDailySlot()) {
    throw new Error(
      "Se alcanzó el límite diario de análisis con IA. Probá de nuevo mañana."
    );
  }

  const { system, user } = buildModulePrompt(
    module,
    context
  );

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const content = await callChatCompletions(
        system,
        user,
        900
      );

      const insight = toModuleInsight(
        extractJson(content),
        aiModel()
      );

      if (!insight) {
        throw new Error(
          "La IA no devolvió un análisis en el formato esperado."
        );
      }

      moduleCache.set(key, {
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

