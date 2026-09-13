/*
 * POST /api/module-insight — análisis IA de un módulo del tablero
 * (Pulso, Cartera, Retención, Reactivación, Venta cruzada, Migración, CRM).
 *
 * Recibe { module, mode: "dual" | "ia", context, force? } y devuelve
 * { ok: true, insight: { resumen, focos, acciones, mensaje, model, ... } }
 * generado server-side con DeepSeek sobre los datos reales del módulo.
 * El token de IA queda server-side (misma regla que Airtable).
 *
 * Respuestas:
 *   200 { ok: true, insight }
 *   400 pedido inválido / datos faltantes
 *   502 la IA no respondió
 *   503 IA no configurada (falta AI_API_TOKEN)
 */

import { NextResponse } from "next/server";

import {
  aiConfigured,
  generateModuleInsight,
  isModuleAiId,
} from "@/lib/ai";

function sanitizeValue(
  value: unknown,
  depth: number
): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? Math.round(value * 100) / 100
      : undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const text = value.trim().slice(0, 300);

    return text || undefined;
  }

  if (Array.isArray(value)) {
    if (depth >= 2) {
      return undefined;
    }

    const items = value
      .slice(0, 12)
      .map((item) => sanitizeValue(item, depth + 1))
      .filter(
        (item) =>
          item !== undefined &&
          item !== "" &&
          !(Array.isArray(item) && item.length === 0)
      );

    return items.length > 0 ? items : undefined;
  }

  if (typeof value === "object") {
    if (depth >= 2) {
      return undefined;
    }

    const out: Record<string, unknown> = {};

    let count = 0;

    for (const [key, item] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (count >= 40) {
        break;
      }

      const clean = sanitizeValue(item, depth + 1);

      if (
        clean !== undefined &&
        clean !== "" &&
        !(Array.isArray(clean) && clean.length === 0)
      ) {
        out[String(key).slice(0, 80)] = clean;
        count += 1;
      }
    }

    return Object.keys(out).length > 0 ? out : undefined;
  }

  return undefined;
}

export async function POST(request: Request) {
  if (!aiConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "La IA no está configurada en este dashboard.",
      },
      { status: 503 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Pedido inválido." },
      { status: 400 }
    );
  }

  const data = (body || {}) as Record<
    string,
    unknown
  >;

  const module = String(data.module || "")
    .trim()
    .toLowerCase();

  if (!isModuleAiId(module)) {
    return NextResponse.json(
      { ok: false, error: "Módulo desconocido." },
      { status: 400 }
    );
  }

  const mode = data.mode === "ia" ? "ia" : "dual";

  const cleanContext = sanitizeValue(
    data.context,
    0
  );

  if (
    !cleanContext ||
    typeof cleanContext !== "object" ||
    Array.isArray(cleanContext)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Faltan los datos del módulo para analizar.",
      },
      { status: 400 }
    );
  }

  try {
    const insight = await generateModuleInsight(
      module,
      mode,
      cleanContext as Record<string, unknown>,
      Boolean(data.force)
    );

    return NextResponse.json({ ok: true, insight });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "La IA no respondió.",
      },
      { status: 502 }
    );
  }
}
