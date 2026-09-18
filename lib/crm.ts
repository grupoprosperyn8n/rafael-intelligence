import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  ClientCompact,
  CrmAnalytics,
  CrmLead,
  CrmMatchRow,
  CrmSnapshot,
  PolicyCompact,
} from "./types";

import {
  normalizeName,
  normalizePhone,
  numberValue,
} from "./normalize";

/*
 * Analítica del CRM Vocero (3ª fuente del cockpit).
 *
 * El CRM vive en Postgres; este módulo consume un snapshot JSON de SOLO
 * LECTURA (scripts/sync-crm.mjs → data/crm-snapshot.json) y lo cruza EN
 * MEMORIA contra la cartera SGSA (clientes, pólizas activas e historial),
 * igual que la doctrina de las otras dos bases: nada se mezcla físicamente.
 */

const EMPTY_ANALYTICS: CrmAnalytics = {
  available: false,

  kpis: {
    contacts: 0,
    conversations: 0,
    messages: 0,
    inbound: 0,
    outbound: 0,
    ai: 0,
    openConversations: 0,
    closedConversations: 0,
    users: 0,
    leads: 0,
    converted: 0,
    conversionRate: 0,
    pipelineAmount: 0,
    leadsLinked: 0,
    linkedAmount: 0,
    matchedContacts: 0,
    matchRate: 0,
    matchedPremium: 0,
    matchedWithActive: 0,
    expiring30: 0,
    respondedRecently: 0,
    noReply: 0,
  },

  channels: [],
  pipeline: [],
  daily: [],
  rows: [],
};

export function loadCrmSnapshot(): CrmSnapshot | null {
  const path =
    process.env.CRM_SNAPSHOT_PATH ||
    join(process.cwd(), "data", "crm-snapshot.json");

  try {
    // turbopackIgnore: el snapshot vive fuera del bundle (data/),
    // no queremos que el tracing arrastre todo el proyecto al output.
    const raw = readFileSync(
      /*turbopackIgnore: true*/ path,
      "utf8"
    );
    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      !Array.isArray(parsed.contacts)
    ) {
      return null;
    }

    return parsed as CrmSnapshot;
  } catch {
    return null;
  }
}

/*
 * Snapshot VIVO: cuando CRM_SNAPSHOT_URL está configurada, el cockpit baja
 * el snapshot por HTTP desde el CRM (endpoint de solo lectura con API key),
 * con cache en memoria (TTL 10 min) y fallback al archivo local (offline).
 * El warm del tablero (?refresh=1) puede forzar la recarga.
 */

export type CrmLiveSnapshot = {
  snapshot: CrmSnapshot;
  via: "live" | "file";
  fetchedAt: string;
  ageMinutes: number;
};

let liveCache: { at: number; snapshot: CrmSnapshot } | null = null;

export async function loadCrmSnapshotLive(
  force = false
): Promise<CrmLiveSnapshot | null> {
  const url = process.env.CRM_SNAPSHOT_URL;
  const key = process.env.CRM_SNAPSHOT_KEY;
  const ttlMs = 10 * 60_000;

  if (
    url &&
    (!liveCache || force || Date.now() - liveCache.at > ttlMs)
  ) {
    try {
      const response = await fetch(url, {
        headers: key ? { "x-api-key": key } : {},
        cache: "no-store",
        signal: AbortSignal.timeout(9000),
      });

      if (response.ok) {
        const parsed = (await response.json()) as CrmSnapshot;

        if (parsed && Array.isArray(parsed.contacts)) {
          liveCache = { at: Date.now(), snapshot: parsed };
        }
      }
    } catch {
      /* Fallback: se sigue con el cache o el archivo local. */
    }
  }

  if (liveCache) {
    return {
      snapshot: liveCache.snapshot,
      via: "live",
      fetchedAt: new Date(liveCache.at).toISOString(),
      ageMinutes: Math.max(
        0,
        Math.round((Date.now() - liveCache.at) / 60000)
      ),
    };
  }

  const file = loadCrmSnapshot();

  if (!file) {
    return null;
  }

  const generated = file.generatedAt
    ? new Date(file.generatedAt).getTime()
    : NaN;

  return {
    snapshot: file,
    via: "file",
    fetchedAt: file.generatedAt || new Date().toISOString(),
    ageMinutes: Number.isFinite(generated)
      ? Math.max(
          0,
          Math.round((Date.now() - generated) / 60000)
        )
      : -1,
  };
}

function daysUntil(date?: string): number | null {
  if (!date) return null;

  const target = new Date(date);

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const now = new Date();

  const start = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const end = Date.UTC(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );

  return Math.round(
    (end - start) / 86400000
  );
}

function amountOf(lead: CrmLead): number {
  // El CRM guarda montos en centavos de ARS.
  return numberValue(lead.amountCents) / 100;
}

export function buildCrmAnalytics(
  snapshot: CrmSnapshot | null,
  context: {
    clients: ClientCompact[];
    phoneIndex: Map<string, string>;
    nameIndex: Map<string, string>;
    clientActivePolicies: Map<string, PolicyCompact[]>;
    clientHistory: Map<
      string,
      {
        operations: number;
        altas: number;
        anulaciones: number;
        siniestros: number;
        products: Set<string>;
      }
    >;
  }
): CrmAnalytics {
  if (!snapshot) {
    return EMPTY_ANALYTICS;
  }

  /* 1. Contactos y conversaciones reales (sin registros de prueba). */

  const realContacts =
    snapshot.contacts.filter(
      (contact) => !contact.isTest
    );

  const messagesByConversation =
    new Map<
      string,
      {
        total: number;
        inbound: number;
        outbound: number;
      }
    >();

  snapshot.messageStats.forEach((row) => {
    messagesByConversation.set(
      row.conversationId,
      {
        total: numberValue(row.total),
        inbound: numberValue(row.inbound),
        outbound: numberValue(row.outbound),
      }
    );
  });

  const realConversations =
    snapshot.conversations.filter(
      (conversation) => !conversation.isTest
    );

  const activityByContact = new Map<
    string,
    {
      conversations: number;
      messages: number;
      lastActivity?: string;
    }
  >();

  /* Último inbound REAL por contacto (para saber quién contesta). */
  const lastInboundByContact = new Map<string, string>();

  realConversations.forEach((conversation) => {
    const stats =
      messagesByConversation.get(
        conversation.id
      );

    const current =
      activityByContact.get(
        conversation.contactId
      ) || {
        conversations: 0,
        messages: 0,
      };

    current.conversations += 1;

    current.messages +=
      stats?.total || 0;

    if (conversation.lastInboundAt) {
      const previousInbound = lastInboundByContact.get(
        conversation.contactId
      );

      if (
        !previousInbound ||
        conversation.lastInboundAt > previousInbound
      ) {
        lastInboundByContact.set(
          conversation.contactId,
          conversation.lastInboundAt
        );
      }
    }

    const candidates = [
      conversation.lastMessageAt,
      conversation.lastInboundAt,
      conversation.createdAt,
    ]
      .filter(Boolean)
      .map(String)
      .sort();

    const last =
      candidates[candidates.length - 1];

    if (
      last &&
      (!current.lastActivity ||
        last > current.lastActivity)
    ) {
      current.lastActivity = last;
    }

    activityByContact.set(
      conversation.contactId,
      current
    );
  });

  /* 2. Mensajes por día (serie del gráfico). */

  const dailyMap = new Map<
    string,
    {
      day: string;
      total: number;
      inbound: number;
      outbound: number;
      ai: number;
    }
  >();

  snapshot.dailyMessages.forEach((row) => {
    if (row.isTest) return;

    const current =
      dailyMap.get(row.day) || {
        day: row.day,
        total: 0,
        inbound: 0,
        outbound: 0,
        ai: 0,
      };

    current.total += numberValue(row.total);
    current.inbound += numberValue(row.inbound);
    current.outbound += numberValue(
      row.outbound
    );
    current.ai += numberValue(row.ai);

    dailyMap.set(row.day, current);
  });

  const daily = [...dailyMap.values()]
    .sort((a, b) =>
      a.day.localeCompare(b.day)
    )
    .slice(-30);

  const totals = daily.reduce(
    (acc, day) => {
      acc.total += day.total;
      acc.inbound += day.inbound;
      acc.outbound += day.outbound;
      acc.ai += day.ai;

      return acc;
    },
    {
      total: 0,
      inbound: 0,
      outbound: 0,
      ai: 0,
    }
  );

  /* 3. Canales y estado de las conversaciones. */

  const channelCounts =
    new Map<string, number>();

  realConversations.forEach((conversation) => {
    const channel =
      conversation.channel || "otro";

    channelCounts.set(
      channel,
      (channelCounts.get(channel) || 0) + 1
    );
  });

  const openConversations =
    realConversations.filter(
      (conversation) => !conversation.closedAt
    ).length;

  const closedConversations =
    realConversations.length -
    openConversations;

  /* 4. Venta: pipeline de etapas y montos. */

  const realLeads = snapshot.leads.filter(
    (lead) => !lead.isTest
  );

  function isWon(lead: CrmLead): boolean {
    const kind = (
      lead.stageKind || ""
    ).toLowerCase();

    return (
      kind === "won" ||
      /cliente|ganad|cerrad/i.test(
        lead.stage || ""
      )
    );
  }

  const pipelineAmount =
    realLeads.reduce(
      (total, lead) => total + amountOf(lead),
      0
    );

  const converted =
    realLeads.filter(isWon).length;

  const pipeline = [...snapshot.stages]
    .sort(
      (a, b) =>
        numberValue(a.position) -
        numberValue(b.position)
    )
    .map((stage) => {
      const stageLeads =
        realLeads.filter(
          (lead) => lead.stage === stage.name
        );

      const amount = stageLeads.reduce(
        (total, lead) => total + amountOf(lead),
        0
      );

      return {
        name: stage.name,
        kind: stage.kind || "",

        leads: stageLeads.length,
        amount,

        avgAmount: stageLeads.length
          ? amount / stageLeads.length
          : 0,
      };
    });

  /* 5. Macheo CRM ↔ cartera SGSA (en memoria).
   *
   * Orden de confianza: vínculo persistente `sgsa:<id>` > teléfono >
   * nombre (el CRM no guarda DNI todavía). Los índices de teléfono y
   * nombre ya vienen saneados desde analytics (sin matches ambiguos).
   */

  const clientById = new Map(
    context.clients.map((client) => [
      client.id,
      client,
    ])
  );

  const rows: CrmMatchRow[] =
    realContacts.map((contact) => {
      let clientId: string | undefined;
      let link = "sin-match";

      const external = (
        contact.externalRef || ""
      ).match(/^sgsa:(.+)$/);

      if (
        external &&
        clientById.has(external[1])
      ) {
        clientId = external[1];
        link = "sgsa";
      }

      if (
        !clientId &&
        contact.phone &&
        !contact.phone.includes("*")
      ) {
        const hit = context.phoneIndex.get(
          normalizePhone(contact.phone || "")
        );

        if (hit) {
          clientId = hit;
          link = "telefono";
        }
      }

      if (!clientId) {
        const hit = context.nameIndex.get(
          normalizeName(contact.name || "")
        );

        if (hit) {
          clientId = hit;
          link = "nombre";
        }
      }

      const client = clientId
        ? clientById.get(clientId)
        : undefined;

      const active = clientId
        ? context.clientActivePolicies.get(
            clientId
          ) || []
        : [];

      const premium = active.reduce(
        (total, policy) =>
          total + policy.activePremium,
        0
      );

      const expiring30 = active.filter(
        (policy) => {
          const days = daysUntil(
            policy.expiryDate
          );

          return (
            days !== null &&
            days >= 0 &&
            days <= 30
          );
        }
      ).length;

      const history = clientId
        ? context.clientHistory.get(clientId)
        : undefined;

      const activity =
        activityByContact.get(contact.id);

      const lastInboundAt =
        lastInboundByContact.get(contact.id);

      const responded30 = Boolean(
        lastInboundAt &&
          Date.now() - new Date(lastInboundAt).getTime() <=
            30 * 86400000
      );

      return {
        contactId: contact.id,
        name: contact.name || "(sin nombre)",
        channel: contact.channel || "",

        messages: activity?.messages || 0,
        conversations:
          activity?.conversations || 0,
        lastActivity: activity?.lastActivity,

        link,
        clientId,
        clientName: client?.name,

        activePolicies: active.length,
        activePremium: premium,
        expiring30,

        historicalOperations:
          history?.operations || 0,

        lastInboundAt,
        responded30,
      };
    });

  const matchedRows = rows.filter(
    (row) => row.link !== "sin-match"
  );

  const matchedContacts = matchedRows.length;

  const matchRate = rows.length
    ? matchedContacts / rows.length
    : 0;

  const matchedWithActive = matchedRows.filter(
    (row) => row.activePolicies > 0
  ).length;

  const matchedPremium = matchedRows.reduce(
    (total, row) => total + row.activePremium,
    0
  );

  const expiring30 = matchedRows.reduce(
    (total, row) => total + row.expiring30,
    0
  );

  /* 6. Oportunidades del CRM ligadas a la cartera. */

  const linkByContactId = new Map(
    rows.map((row) => [
      row.contactId,
      row.link,
    ])
  );

  const linkedLeads = realLeads.filter(
    (lead) =>
      linkByContactId.get(lead.contactId) &&
      linkByContactId.get(lead.contactId) !==
        "sin-match"
  );

  const leadsLinked = linkedLeads.length;

  const linkedAmount = linkedLeads.reduce(
    (total, lead) => total + amountOf(lead),
    0
  );

  /* 7. Filas ordenadas por actividad (para la vista). */

  const sortedRows = [...rows].sort(
    (a, b) =>
      b.messages - a.messages ||
      b.activePremium - a.activePremium
  );

  /*
   * 8. Acciones disparadas desde el tablero (trazabilidad).
   *
   * El CRM registra cada vez que una sugerencia se convierte en acción
   * (abrir chat con borrador, mandar mensaje). Acá se agregan por jugada
   * para medir qué sugerencia mueve la aguja.
   */

  const ACTION_LABELS: Record<string, string> = {
    renovaciones7: "Vencen ≤7 días",
    renovaciones30: "Vencen ≤30 días",
    reactivar: "Reactivación",
    cross: "Sumar cobertura",
    observar: "Retención a observar",
    ficha: "Cliente 360°",
  };

  const actionRows = Array.isArray(snapshot.actions)
    ? snapshot.actions
    : [];

  const actionCutoff = Date.now() - 30 * 86400000;

  const recentActions = actionRows.filter(
    (action) =>
      action.createdAt &&
      new Date(action.createdAt).getTime() >=
        actionCutoff
  );

  const actionsByPlay = new Map<
    string,
    { sent: number; responded: number }
  >();

  recentActions.forEach((action) => {
    const key =
      action.playId || action.source || "otro";

    const current = actionsByPlay.get(key) || {
      sent: 0,
      responded: 0,
    };

    current.sent += 1;

    if (action.respondedAt) {
      current.responded += 1;
    }

    actionsByPlay.set(key, current);
  });

  const respondedActions = recentActions.filter(
    (action) => action.respondedAt
  ).length;

  const actions = {
    total: actionRows.length,
    windowDays: 30,
    sent: recentActions.length,
    responded: respondedActions,
    rate: recentActions.length
      ? respondedActions / recentActions.length
      : 0,
    byPlay: [...actionsByPlay.entries()]
      .map(([key, values]) => ({
        key,
        label:
          ACTION_LABELS[key] || "General",
        sent: values.sent,
        responded: values.responded,
      }))
      .sort((a, b) => b.sent - a.sent),
  };

  return {
    available: true,
    generatedAt: snapshot.generatedAt,

    kpis: {
      contacts: realContacts.length,
      conversations: realConversations.length,

      messages: totals.total,
      inbound: totals.inbound,
      outbound: totals.outbound,
      ai: totals.ai,

      openConversations,
      closedConversations,

      users: numberValue(snapshot.usersCount),

      leads: realLeads.length,
      converted,

      conversionRate: realLeads.length
        ? converted / realLeads.length
        : 0,

      pipelineAmount,
      leadsLinked,
      linkedAmount,

      matchedContacts,
      matchRate,
      matchedPremium,
      matchedWithActive,
      expiring30,

      respondedRecently: rows.filter(
        (row) => row.responded30
      ).length,

      noReply: rows.filter(
        (row) => row.messages > 0 && !row.lastInboundAt
      ).length,
    },

    channels: [...channelCounts.entries()]
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value),

    pipeline,
    daily,
    rows: sortedRows,

    actions,
  };
}
