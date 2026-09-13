import { AirtableRecord } from "./types";

const TOKEN = process.env.AIRTABLE_TOKEN;

if (!TOKEN) {
  console.warn(
    "AIRTABLE_TOKEN no está configurado. El dashboard no podrá consultar Airtable."
  );
}

type CacheEntry = {
  expires: number;
  records: AirtableRecord[];
};

const globalCache = globalThis as typeof globalThis & {
  __rafaelCache?: Map<string, CacheEntry>;
};

if (!globalCache.__rafaelCache) {
  globalCache.__rafaelCache = new Map();
}

const cache = globalCache.__rafaelCache;

function cacheMinutes() {
  return Number(process.env.DASHBOARD_CACHE_MINUTES || 15);
}

export async function airtableTable(
  baseId: string,
  tableName: string,
  fields?: string[]
): Promise<AirtableRecord[]> {
  const cacheKey = `${baseId}:${tableName}:${fields?.join(",") || "*"}`;

  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.records;
  }

  if (!TOKEN) {
    throw new Error("AIRTABLE_TOKEN no configurado.");
  }

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

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
      cache: "no-store",
    });

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

  cache.set(cacheKey, {
    records,
    expires:
      Date.now() +
      cacheMinutes() * 60 * 1000,
  });

  return records;
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
