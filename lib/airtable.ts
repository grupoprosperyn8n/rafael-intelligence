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
