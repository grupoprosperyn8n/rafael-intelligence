/*
 * POST /api/insight — "próxima mejor acción" con IA (Cliente 360°).
 *
 * Recibe { clientId, mode: "dual" | "ia", context } y devuelve un análisis
 * generado por DeepSeek (mismo proveedor que usa el CRM) usando SOLO los
 * datos reales que manda el dashboard. El token de IA queda server-side.
 *
 * Respuestas:
 *   200 { ok: true, insight }
 *   400 datos faltantes / inválidos
 *   502 la IA no respondió
 *   503 IA no configurada (falta AI_API_TOKEN)
 */

import { NextResponse } from "next/server";

import {
  aiConfigured,
  generateInsight,
} from "@/lib/ai";

import type {
  ClientInsightContext,
} from "@/lib/types";

function sanitizeContext(
  raw: unknown
): ClientInsightContext | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = raw as Record<string, unknown>;

  const name = String(data.name || "")
    .trim()
    .slice(0, 120);

  if (!name) {
    return null;
  }

  const num = (value: unknown) => {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  };

  const steps = Array.isArray(
    data.recommendationSteps
  )
    ? data.recommendationSteps
        .map((step) => String(step).trim().slice(0, 400))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  return {
    name,
    activePolicies: num(data.activePolicies),
    historicalOperations: num(
      data.historicalOperations
    ),
    historicalAltas: num(data.historicalAltas),
    historicalAnulaciones: num(
      data.historicalAnulaciones
    ),
    historicalSiniestros: num(
      data.historicalSiniestros
    ),
    activePremium: num(data.activePremium),
    score: num(data.score),
    recommendation: String(data.recommendation || "")
      .trim()
      .slice(0, 120),
    recommendationWhy: String(
      data.recommendationWhy || ""
    )
      .trim()
      .slice(0, 800),
    recommendationSteps: steps,
  };
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

  const mode = data.mode === "ia" ? "ia" : "dual";

  const clientId = String(data.clientId || "")
    .trim()
    .slice(0, 120);

  const context = sanitizeContext(data.context);

  if (!clientId || !context) {
    return NextResponse.json(
      { ok: false, error: "Faltan datos del cliente." },
      { status: 400 }
    );
  }

  try {
    const insight = await generateInsight(
      clientId,
      context,
      mode
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
