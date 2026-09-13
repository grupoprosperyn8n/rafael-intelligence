import { AirtableRecord } from "./types";

const TOKEN = process.env.AIRTABLE_TOKEN;

if (!TOKEN) {
  console.warn(
    "AIRTABLE_TOKEN no está configurado. El dashboard no podrá consultar Airtable."
  );
}

type CacheEntry = {
  expires: number;
  fetchedAt: number;
  records: AirtableRecord[];
};

const globalCache = globalThis as typeof globalThis & {
  __rafaelCache?: Map<string, CacheEntry>;
  __rafaelPending?: Map<
    string,
    Promise<AirtableRecord[]>
  >;
  __rafaelGates?: Map<string, number>;
};

if (!globalCache.__rafaelCache) {
  globalCache.__rafaelCache = new Map();
}

const cache = globalCache.__rafaelCache;

function cacheMinutes() {
  return Number(
    process.env.DASHBOARD_CACHE_MINUTES || 15
  );
}

/*
 * Airtable limita a ~5 requests/segundo POR BASE (y devuelve 429 cuando
 * te pasás). El cockpit lee tablas grandes paginadas (GESTIÓN GENERAL
 * ≈ 35k filas = cientos de páginas) y además varias tablas en paralelo,
 * así que un rebuild podía pasarse del límite y romper el dashboard.
 *
 * Medidas:
 *
 *  - paceBase(): asegura un intervalo mínimo entre requests por base
 *    (AIRTABLE_MIN_INTERVAL_MS, por defecto 250 ms ⇒ ~4 req/s).
 *  - Reintentos con backoff exponencial + jitter ante 429/5xx y errores
 *    de red, respetando el header Retry-After.
 *  - Dedupe de lecturas en vuelo: si dos rebuilds piden la misma tabla
 *    a la vez, comparten la MISMA descarga (jamás dos scans paralelos).
 *  - Stale-while-revalidate: si la copia venció (pero no es demasiado
 *    vieja) se sirve AL INSTANTE y se refresca en segundo plano: los
 *    usuarios nunca esperan un rebuild. El warm cron (cada 5 min,
 *    ?refresh=1) mantiene los datos al día.
 */

const MIN_INTERVAL_MS = Number(
  process.env.AIRTABLE_MIN_INTERVAL_MS || 250
);

/*
 * Anti-amplificación del refresco forzado: si una tabla se descargó
 * hace menos que esto, un ?refresh=1 no la vuelve a bajar.
 */
const FORCE_MIN_INTERVAL_MS = Number(
  process.env.AIRTABLE_FORCE_MIN_INTERVAL_MS ||
    120000
);

/*
 * Tope de la copia "vieja": pasado esto desde el vencimiento, ya no
 * se sirve stale (se intenta la descarga y, si falla, el error sube).
 */
const STALE_MAX_MS = Number(
  process.env.AIRTABLE_STALE_MAX_MS ||
    2 * 60 * 60 * 1000
);

const MAX_ATTEMPTS = 6;

function sleep(ms: number) {
  return new Promise<void>((resolve) =>
    setTimeout(resolve, ms)
  );
}

async function paceBase(baseId: string) {
  if (!globalCache.__rafaelGates) {
    globalCache.__rafaelGates = new Map();
  }

  const gates = globalCache.__rafaelGates;

  const now = Date.now();
  const last = gates.get(baseId) || 0;
  const readyAt = Math.max(
    now,
    last + MIN_INTERVAL_MS
  );

  gates.set(baseId, readyAt);

  const wait = readyAt - now;

  if (wait > 0) {
    await sleep(wait);
  }
}

async function fetchPage(
  baseId: string,
  url: string,
  tableName: string
): Promise<Response> {
  let response: Response | null = null;

  for (
    let attempt = 0;
    attempt < MAX_ATTEMPTS;
    attempt++
  ) {
    await paceBase(baseId);

    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
        },
        cache: "no-store",
      });
    } catch (error: any) {
      const delay =
        Math.min(8000, 1000 * 2 ** attempt) *
        (0.7 + Math.random() * 0.6);

      console.warn(
        `Airtable red en ${tableName} (intento ${
          attempt + 1
        }/${MAX_ATTEMPTS}): reintento en ${Math.round(
          delay / 1000
        )}s — ${error?.message || error}`
      );

      await sleep(delay);
      continue;
    }

    if (response.ok) {
      return response;
    }

    const retryable =
      response.status === 429 ||
      response.status >= 500;

    if (!retryable) {
      return response;
    }

    const retryAfter = Number(
      response.headers.get("retry-after") || 0
    );

    const delay = retryAfter
      ? retryAfter * 1000
      : Math.min(16000, 1000 * 2 ** attempt) *
        (0.7 + Math.random() * 0.6);

    console.warn(
      `Airtable ${response.status} en ${tableName} (intento ${
        attempt + 1
      }/${MAX_ATTEMPTS}): reintento en ${Math.round(
        delay / 1000
      )}s`
    );

    await sleep(delay);
  }

  return response!;
}

export async function airtableTable(
  baseId: string,
  tableName: string,
  fields?: string[],
  options?: { force?: boolean }
): Promise<AirtableRecord[]> {
  const cacheKey = `${baseId}:${tableName}:${fields?.join(",") || "*"}`;

  const now = Date.now();
  const force = options?.force === true;

  const cached = cache.get(cacheKey);

  const fresh = !!(
    cached && cached.expires > now
  );

  if (cached && fresh && !force) {
    return cached.records;
  }

  if (
    cached &&
    fresh &&
    force &&
    now - cached.fetchedAt <
      FORCE_MIN_INTERVAL_MS
  ) {
    return cached.records;
  }

  if (!TOKEN) {
    throw new Error("AIRTABLE_TOKEN no configurado.");
  }

  if (!globalCache.__rafaelPending) {
    globalCache.__rafaelPending = new Map();
  }

  const pending = globalCache.__rafaelPending;

  const inFlight = pending.get(cacheKey);

  const canServeStale = !!(
    cached &&
    !force &&
    now - cached.expires < STALE_MAX_MS
  );

  if (inFlight) {
    /*
     * Si hay una descarga en curso pero podemos servir la copia
     * vieja, no hacemos esperar a nadie: al toque, y el refresh
     * sigue de fondo.
     */
    if (canServeStale) {
      return cached!.records;
    }

    return inFlight;
  }

  const load = (async () => {
    let offset: string | undefined;
    const records: AirtableRecord[] = [];

    do {
      const params = new URLSearchParams();

      params.set("pageSize", "100");

      if (offset) {
        params.set("offset", offset);
      }

      fields?.forEach((field) => {
        params.append("fields[]", field);
      });

      const url =
        `https://api.airtable.com/v0/${baseId}/` +
        `${encodeURIComponent(tableName)}?${params.toString()}`;

      const response = await fetchPage(
        baseId,
        url,
        tableName
      );

      if (!response.ok) {
        const body = await response.text();

        throw new Error(
          `Error Airtable ${response.status} en ${tableName}: ${body}`
        );
      }

      const data = await response.json();

      records.push(...(data.records || []));

      offset = data.offset;
    } while (offset);

    const fetchedAt = Date.now();

    cache.set(cacheKey, {
      records,
      fetchedAt,
      expires:
        fetchedAt +
        cacheMinutes() * 60 * 1000,
    });

    return records;
  })();

  pending.set(cacheKey, load);

  const clearPending = () => {
    if (pending.get(cacheKey) === load) {
      pending.delete(cacheKey);
    }
  };

  /*
   * Stale-while-revalidate: hay copia vencida (no demasiado vieja)
   * ⇒ se sirve ya mismo y el refresco sigue en segundo plano.
   */
  if (canServeStale) {
    load
      .catch((error: any) => {
        console.warn(
          `Refresco de ${tableName} en segundo plano falló: ${
            error?.message || error
          }`
        );
      })
      .finally(clearPending);

    return cached!.records;
  }

  try {
    return await load;
  } finally {
    clearPending();
  }
}

export function clearDashboardCache() {
  cache.clear();
}

const metaCache = new Map<string, string>();

/*
 * Resuelve el ID real de una tabla (tblXXXX) para armar links directos
 * al backend (Airtable). Se cachea por proceso: los IDs no cambian.
 */
export async function airtableTableId(
  baseId: string,
  tableName: string
): Promise<string | null> {
  const cacheKey = `${baseId}:${tableName}`;

  const cached = metaCache.get(cacheKey);

  if (cached) return cached;
  if (!TOKEN) return null;

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`meta ${response.status}`);
    }

    const data = await response.json();

    const table = (data.tables || []).find(
      (item: { name?: string }) =>
        item.name === tableName
    );

    if (!table?.id) return null;

    metaCache.set(cacheKey, table.id);

    return table.id;
  } catch (error) {
    console.warn(
      `No se pudo resolver la tabla ${tableName} para links al backend.`,
      error
    );

    return null;
  }
}
