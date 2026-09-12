import { NextRequest, NextResponse } from "next/server";

import { buildDashboard } from "@/lib/analytics";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest
) {
  try {
    const params =
      request.nextUrl.searchParams;

    const dashboard =
      await buildDashboard({
        from:
          params.get("from") ||
          undefined,

        to:
          params.get("to") ||
          undefined,

        office:
          params.get("office") ||
          undefined,

        product:
          params.get("product") ||
          undefined,

        employee:
          params.get("employee") ||
          undefined,

        channel:
          params.get("channel") ||
          undefined,

        company:
          params.get("company") ||
          undefined,

        search:
          params.get("search") ||
          undefined,
      });

    return NextResponse.json(
      dashboard
    );
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "No se pudo cargar el análisis.",
      },
      {
        status: 500,
      }
    );
  }
}
