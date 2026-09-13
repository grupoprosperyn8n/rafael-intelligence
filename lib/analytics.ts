import { CONFIG } from "./config";
import { airtableTable, airtableTableId } from "./airtable";

import {
  ClientCompact,
  DashboardFilters,
  DashboardResponse,
  HistoricCompact,
  PolicyCompact,
} from "./types";

import {
  buildCrmAnalytics,
  loadCrmSnapshot,
} from "./crm";

import {
  normalizeDni,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  numberValue,
} from "./normalize";

function firstLinked(value: any): string | undefined {
  return Array.isArray(value) ? value[0] : undefined;
}

function linked(value: any): string[] {
  return Array.isArray(value) ? value : [];
}

function text(value: any): string {
  if (value === null || value === undefined) return "";

  return String(value);
}

function statusArray(value: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(String);
  }

  return [String(value)];
}

function isActivePolicy(statuses: string[]) {
  return statuses.some((status) => {
    const value = status.toUpperCase().trim();

    // "NO_RENOVADA" contiene la palabra "RENOVADA" — no debe contar como activa.
    if (
      value.includes("NO_RENOVADA") ||
      value.includes("NO RENOVADA")
    ) {
      return false;
    }

    return (
      value.includes("POLIZA VIGENTE") ||
      value === "VIGENTE" ||
      value.includes("RENOVADA") ||
      value.includes("VENCE EN") ||
      value === "VENCE HOY" ||
      value.includes("PARA VENCER")
    );
  });
}

function isBetween(
  date: string | undefined,
  from?: string,
  to?: string
) {
  if (!date) return true;

  if (from && date < from) return false;
  if (to && date > to) return false;

  return true;
}

function daysUntil(date?: string) {
  if (!date) return null;

  const now = new Date();
  const target = new Date(`${date}T12:00:00`);

  return Math.ceil(
    (target.getTime() - now.getTime()) /
      86_400_000
  );
}

function topMap(
  map: Map<string, number>,
  limit = 12
) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({
      name,
      value,
    }));
}

function addMap(
  map: Map<string, number>,
  key?: string,
  amount = 1
) {
  if (!key) return;

  map.set(
    key,
    (map.get(key) || 0) + amount
  );
}

function recommendationForClient(args: {
  activePolicies: number;
  historicAltas: number;
  historicAnulaciones: number;
  historicSiniestros: number;
  activePremium: number;
}) {
  const {
    activePolicies,
    historicAltas,
    historicAnulaciones,
    historicSiniestros,
  } = args;

  if (!activePolicies && historicAltas > 0) {
    return "Prioridad alta de reactivación";
  }

  if (activePolicies === 1) {
    return "Oportunidad de venta cruzada";
  }

  if (
    activePolicies > 0 &&
    historicAnulaciones > 0
  ) {
    return "Revisar retención y experiencia";
  }

  if (
    activePolicies > 0 &&
    historicSiniestros > 0
  ) {
    return "Seguimiento post-siniestro";
  }

  if (activePolicies >= 2) {
    return "Cliente consolidado";
  }

  return "Seguimiento comercial";
}

/*
 * Plan de acción: para el dueño, cada recomendación viene con
 * el "por qué" (corto, en criollo) y "qué hacer" paso a paso.
 */
function recommendationPlan(args: {
  recommendation: string;
  activePolicies: number;
  historicAltas: number;
  historicAnulaciones: number;
  historicSiniestros: number;
  activeProducts: string[];
  historicProducts: string[];
}) {
  const activeList = args.activeProducts.join(", ");

  const historicList = args.historicProducts.join(", ");

  switch (args.recommendation) {
    case "Prioridad alta de reactivación":
      return {
        why: `Registra ${args.historicAltas} alta(s) en la historia y hoy no tiene pólizas activas cargadas${
          historicList
            ? ` (en su historia: ${historicList})`
            : ""
        }. Recuperar a alguien que ya confió es la venta más fácil.`,
        steps: [
          `Llamalo y ofrecele reactivar su cobertura${
            args.historicProducts[0]
              ? ` de ${args.historicProducts[0]}`
              : ""
          }.`,
          "Recordale que ya fue cliente y preguntá qué lo hizo cancelar.",
          "Si no contesta, dejale un mensaje con una promo de reactivación y agendá el seguimiento.",
        ],
      };

    case "Oportunidad de venta cruzada":
      return {
        why: `Tiene exactamente 1 póliza activa${
          activeList ? ` (${activeList})` : ""
        } y el resto de sus necesidades quedó sin cubrir.`,
        steps: [
          "Ofrecele sumar un producto complementario a lo que ya tiene.",
          `Revisá en Venta cruzada qué producto rinde más${
            activeList
              ? ` junto a ${activeList}`
              : ""
          }.`,
          "El mejor momento para ampliar la cobertura es antes de la renovación.",
        ],
      };

    case "Revisar retención y experiencia":
      return {
        why: `Tiene ${args.activePolicies} póliza(s) activa(s) y ${args.historicAnulaciones} anulación(es) en la historia: ya canceló productos antes.`,
        steps: [
          "Llamalo para saber cómo le fue con el servicio antes de la renovación.",
          "Revisá en Retención si le vence alguna póliza en los próximos 30 días.",
          "Si hubo un problema, resolvelo antes de ofrecerle algo nuevo.",
        ],
      };

    case "Seguimiento post-siniestro":
      return {
        why: `Tiene ${args.activePolicies} póliza(s) activa(s) y ${args.historicSiniestros} siniestro(s) en la historia: está pasando por un momento delicado.`,
        steps: [
          "Contactalo para chequear cómo salió del siniestro.",
          "Reforzale la tranquilidad de estar cubierto: es fidelización pura.",
          "Aprovechá la charla para completar coberturas que le falten.",
        ],
      };

    case "Cliente consolidado":
      return {
        why: `Es de los mejores clientes: ${args.activePolicies} pólizas activas.`,
        steps: [
          "Asegurá que todas sus renovaciones estén al día.",
          "Ofrecele una revisión anual de coberturas.",
          "Pedile un referido: los clientes fieles son la mejor puerta de entrada.",
        ],
      };

    default:
      return {
        why: `Todavía no muestra señales fuertes: ${args.activePolicies} activa(s) y ${args.historicAltas} alta(s) histórica(s).`,
        steps: [
          "Mantenelo en la ronda de contacto periódica.",
          "Verificá en Retención si hay algo por vencer.",
          "Si aparece una promo que le sirva, avisale.",
        ],
      };
  }
}

function scoreClient(args: {
  activePolicies: number;
  historicAltas: number;
  historicAnulaciones: number;
  historicSiniestros: number;
  activePremium: number;
}) {
  let score = 40;

  if (args.activePolicies === 0 && args.historicAltas) {
    score += 35;
  }

  if (args.activePolicies === 1) {
    score += 25;
  }

  if (args.historicAnulaciones) {
    score += 10;
  }

  if (args.historicSiniestros) {
    score += 5;
  }

  if (args.activePremium > 0) {
    score += 5;
  }

  return Math.min(100, score);
}

export async function buildDashboard(
  filters: DashboardFilters = {}
): Promise<DashboardResponse> {
  const historicConfig = CONFIG.historic;
  const agenticConfig = CONFIG.agentic;

  /*
   * 1. CARGAMOS TABLAS AUXILIARES DE LA BASE NUEVA
   */

  const [
    rawClients,
    rawPolicies,
    rawProducts,
    rawCompanies,
    rawEmployees,
    rawOffices,
    rawHistoricEmployees,
  ] = await Promise.all([
    airtableTable(
      agenticConfig.baseId,
      agenticConfig.tables.clients,
      Object.values(agenticConfig.clientFields)
    ),

    airtableTable(
      agenticConfig.baseId,
      agenticConfig.tables.policies,
      Object.values(agenticConfig.policyFields)
    ),

    airtableTable(
      agenticConfig.baseId,
      agenticConfig.tables.products,
      Object.values(agenticConfig.productFields)
    ),

    airtableTable(
      agenticConfig.baseId,
      agenticConfig.tables.companies,
      Object.values(agenticConfig.companyFields)
    ),

    airtableTable(
      agenticConfig.baseId,
      agenticConfig.tables.employees
    ),

    airtableTable(
      agenticConfig.baseId,
      agenticConfig.tables.offices
    ),

    // ATENDIDO X del histórico es un linked record a "👥 EMPLEADOS"
    // de la base histórica: cargamos esa tabla para traducir nombres.
    airtableTable(
      historicConfig.baseId,
      historicConfig.tables.employees,
      [historicConfig.employeeNameField]
    ),
  ]);

  /*
   * 2. DICCIONARIOS PARA LINKED RECORDS
   */

  const productNames = new Map<string, string>();

  rawProducts.forEach((record) => {
    productNames.set(
      record.id,
      text(
        record.fields[
          agenticConfig.productFields.name
        ]
      )
    );
  });

  const companyNames = new Map<string, string>();

  rawCompanies.forEach((record) => {
    companyNames.set(
      record.id,
      text(
        record.fields[
          agenticConfig.companyFields.name
        ]
      )
    );
  });

  const employeeNames = new Map<string, string>();

  rawEmployees.forEach((record) => {
    employeeNames.set(
      record.id,
      text(record.fields["NOMBRE Y APELLIDO"])
    );
  });

  const historicEmployeeNames = new Map<string, string>();

  rawHistoricEmployees.forEach((record) => {
    historicEmployeeNames.set(
      record.id,
      text(
        record.fields[
          historicConfig.employeeNameField
        ]
      )
    );
  });

  const officeNames = new Map<string, string>();

  rawOffices.forEach((record) => {
    officeNames.set(
      record.id,
      text(record.fields["OFICINAS"])
    );
  });

  /*
   * 3. CLIENTES MAESTROS
   */

  const clients: ClientCompact[] =
    rawClients.map((record) => ({
      id: record.id,

      uniqueId: text(
        record.fields[
          agenticConfig.clientFields.uniqueId
        ]
      ),

      name: text(
        record.fields[
          agenticConfig.clientFields.normalizedName
        ]
      ),

      dni: normalizeDni(
        record.fields[
          agenticConfig.clientFields.dni
        ]
      ),

      // El campo TELEFONO viene enmascarado (+543****XXXX);
      // preferimos TELEFONO NORMALIZADO que sí trae los dígitos completos.
      phone: normalizePhone(
        text(
          record.fields[
            agenticConfig.clientFields
              .phoneNormalized
          ]
        ) ||
          record.fields[
            agenticConfig.clientFields.phone
          ]
      ),

      email: normalizeEmail(
        record.fields[
          agenticConfig.clientFields.email
        ]
      ),
    }));

  /*
   * Índices para MATCHING.
   */

  const dniIndex = new Map<string, string>();
  const phoneIndex = new Map<string, string>();
  const emailIndex = new Map<string, string>();
  const nameIndex = new Map<string, string>();

  const duplicated = new Set<string>();

  function uniqueIndex(
    map: Map<string, string>,
    key: string,
    id: string
  ) {
    if (!key) return;

    if (map.has(key)) {
      duplicated.add(`${key}`);
      map.delete(key);
      return;
    }

    if (!duplicated.has(key)) {
      map.set(key, id);
    }
  }

  clients.forEach((client) => {
    uniqueIndex(
      dniIndex,
      client.dni || "",
      client.id
    );

    uniqueIndex(
      phoneIndex,
      client.phone || "",
      client.id
    );

    uniqueIndex(
      emailIndex,
      client.email || "",
      client.id
    );

    uniqueIndex(
      nameIndex,
      normalizeName(client.name),
      client.id
    );
  });

  /*
   * 4. PÓLIZAS ACTUALES / EN MIGRACIÓN
   */

  const policies: PolicyCompact[] =
    rawPolicies.map((record) => {
      const fields = record.fields;

      const productId = firstLinked(
        fields[
          agenticConfig.policyFields.product
        ]
      );

      const companyId = firstLinked(
        fields[
          agenticConfig.policyFields.company
        ]
      );

      const employeeId = firstLinked(
        fields[
          agenticConfig.policyFields.employee
        ]
      );

      const officeId = firstLinked(
        fields[
          agenticConfig.policyFields.office
        ]
      );

      return {
        id: record.id,

        clientIds: linked(
          fields[
            agenticConfig.policyFields.clients
          ]
        ),

        number: text(
          fields[
            agenticConfig.policyFields.number
          ]
        ),

        statuses: statusArray(
          fields[
            agenticConfig.policyFields.status
          ]
        ),

        product:
          productId
            ? productNames.get(productId)
            : undefined,

        company:
          companyId
            ? companyNames.get(companyId)
            : undefined,

        employee:
          employeeId
            ? employeeNames.get(employeeId)
            : undefined,

        office:
          officeId
            ? officeNames.get(officeId)
            : undefined,

        payment: text(
          fields[
            agenticConfig.policyFields.payment
          ]
        ),

        startDate: fields[
          agenticConfig.policyFields.startDate
        ],

        expiryDate: fields[
          agenticConfig.policyFields.expiryDate
        ],

        cancellationDate: fields[
          agenticConfig.policyFields
            .cancellationDate
        ],

        premium: numberValue(
          fields[
            agenticConfig.policyFields.premium
          ]
        ),

        activePremium: numberValue(
          fields[
            agenticConfig.policyFields
              .activePremium
          ]
        ),
      };
    });

  /*
   * 5. HISTORIAL RAFAEL
   */

  const historicRecords =
    await airtableTable(
      historicConfig.baseId,
      historicConfig.tables.management,
      Object.values(historicConfig.fields)
    );

  function matchHistoricClient(
    fields: Record<string, any>
  ) {
    const dni = normalizeDni(
      fields[historicConfig.fields.dni]
    );

    const phone = normalizePhone(
      fields[historicConfig.fields.phone]
    );

    const email = normalizeEmail(
      fields[historicConfig.fields.email]
    );

    const name = normalizeName(
      fields[historicConfig.fields.name]
    );

    return (
      dniIndex.get(dni) ||
      phoneIndex.get(phone) ||
      emailIndex.get(email) ||
      nameIndex.get(name)
    );
  }

  let historic: HistoricCompact[] =
    historicRecords.map((record) => {
      const fields = record.fields;

      return {
        id: record.id,

        clientId:
          matchHistoricClient(fields),

        name: text(
          fields[historicConfig.fields.name]
        ),

        dni: normalizeDni(
          fields[historicConfig.fields.dni]
        ),

        phone: normalizePhone(
          fields[historicConfig.fields.phone]
        ),

        email: normalizeEmail(
          fields[historicConfig.fields.email]
        ),

        date: fields[
          historicConfig.fields.date
        ],

        office: text(
          fields[historicConfig.fields.office]
        ),

        reason: text(
          fields[historicConfig.fields.reason]
        ),

        product: text(
          fields[historicConfig.fields.product]
        ),

        channel: text(
          fields[historicConfig.fields.channel]
        ),

        payment: text(
          fields[historicConfig.fields.payment]
        ),

        employee: firstLinked(
          fields[
            historicConfig.fields.employee
          ]
        ),

        amount: numberValue(
          fields[historicConfig.fields.amount]
        ),
      };
    });

  /*
   * Traducimos empleado histórico si es link.
   * Los IDs de "👥 EMPLEADOS" históricos se resuelven contra la tabla
   * histórica y, como respaldo, contra la agéntica (comparten IDs
   * en los empleados migrados).
   */

  historic = historic.map((record) => {
    if (!record.employee) return record;

    const resolved =
      historicEmployeeNames.get(
        record.employee
      ) ||
      employeeNames.get(record.employee);

    return {
      ...record,
      employee: resolved || record.employee,
    };
  });

  /*
   * 6. FILTROS
   */

  historic = historic.filter((record) => {
    if (
      !isBetween(
        record.date,
        filters.from,
        filters.to
      )
    ) {
      return false;
    }

    if (
      filters.office &&
      record.office !== filters.office
    ) {
      return false;
    }

    if (
      filters.product &&
      record.product !== filters.product
    ) {
      return false;
    }

    if (
      filters.employee &&
      record.employee !== filters.employee
    ) {
      return false;
    }

    if (
      filters.channel &&
      record.channel !== filters.channel
    ) {
      return false;
    }

    return true;
  });

  let filteredPolicies =
    policies.filter((policy) => {
      if (
        filters.company &&
        policy.company !== filters.company
      ) {
        return false;
      }

      if (
        filters.product &&
        policy.product !== filters.product
      ) {
        return false;
      }

      if (
        filters.office &&
        policy.office &&
        policy.office !== filters.office
      ) {
        return false;
      }

      return true;
    });

  /*
   * 7. HISTÓRICO
   */

  let altas = 0;
  let anulaciones = 0;
  let cotizaciones = 0;
  let siniestros = 0;

  const productHistory =
    new Map<string, number>();

  const channels =
    new Map<string, number>();

  const monthData = new Map<
    string,
    {
      altas: number;
      anulaciones: number;
      siniestros: number;
    }
  >();

  const officeData = new Map<
    string,
    {
      altas: number;
      anulaciones: number;
    }
  >();

  historic.forEach((record) => {
    addMap(
      productHistory,
      record.product
    );

    addMap(
      channels,
      record.channel
    );

    const reason =
      record.reason?.trim().toUpperCase();

    if (reason === "ALTAS") altas++;

    if (reason === "ANULACIÓN") {
      anulaciones++;
    }

    if (reason === "COTIZACIÓN") {
      cotizaciones++;
    }

    if (reason === "SINIESTRO") {
      siniestros++;
    }

    if (record.date) {
      const month =
        record.date.slice(0, 7);

      if (!monthData.has(month)) {
        monthData.set(month, {
          altas: 0,
          anulaciones: 0,
          siniestros: 0,
        });
      }

      const current =
        monthData.get(month)!;

      if (reason === "ALTAS") {
        current.altas++;
      }

      if (reason === "ANULACIÓN") {
        current.anulaciones++;
      }

      if (reason === "SINIESTRO") {
        current.siniestros++;
      }
    }

    if (record.office) {
      if (!officeData.has(record.office)) {
        officeData.set(record.office, {
          altas: 0,
          anulaciones: 0,
        });
      }

      const office =
        officeData.get(record.office)!;

      if (reason === "ALTAS") {
        office.altas++;
      }

      if (reason === "ANULACIÓN") {
        office.anulaciones++;
      }
    }
  });

  /*
   * 8. CARTERA ACTUAL CARGADA
   */

  const activePolicies =
    filteredPolicies.filter((policy) =>
      isActivePolicy(policy.statuses)
    );

  const activeClientSet =
    new Set<string>();

  const clientActivePolicies =
    new Map<string, PolicyCompact[]>();

  activePolicies.forEach((policy) => {
    policy.clientIds.forEach((clientId) => {
      activeClientSet.add(clientId);

      const existing =
        clientActivePolicies.get(clientId) ||
        [];

      existing.push(policy);

      clientActivePolicies.set(
        clientId,
        existing
      );
    });
  });

  const activePremium =
    activePolicies.reduce(
      (total, policy) =>
        total + policy.activePremium,
      0
    );

  let expires7 = 0;
  let expires30 = 0;

  activePolicies.forEach((policy) => {
    const days =
      daysUntil(policy.expiryDate);

    if (days === null) return;

    if (days >= 0 && days <= 7) {
      expires7++;
    }

    if (days >= 0 && days <= 30) {
      expires30++;
    }
  });

  let onePolicyClients = 0;
  let multiPolicyClients = 0;

  clientActivePolicies.forEach(
    (clientPolicies) => {
      if (clientPolicies.length === 1) {
        onePolicyClients++;
      }

      if (clientPolicies.length >= 2) {
        multiPolicyClients++;
      }
    }
  );

  /*
   * 9. HISTORIAL POR CLIENTE
   */

  const clientHistory = new Map<
    string,
    {
      operations: number;
      altas: number;
      anulaciones: number;
      siniestros: number;
      products: Set<string>;
    }
  >();

  let matchedOperations = 0;

  historicRecords.forEach((record) => {
    const clientId =
      matchHistoricClient(record.fields);

    if (!clientId) return;

    matchedOperations++;

    if (!clientHistory.has(clientId)) {
      clientHistory.set(clientId, {
        operations: 0,
        altas: 0,
        anulaciones: 0,
        siniestros: 0,
        products: new Set(),
      });
    }

    const entry =
      clientHistory.get(clientId)!;

    entry.operations++;

    const reason = text(
      record.fields[
        historicConfig.fields.reason
      ]
    )
      .trim()
      .toUpperCase();

    const product = text(
      record.fields[
        historicConfig.fields.product
      ]
    );

    if (product) {
      entry.products.add(product);
    }

    if (reason === "ALTAS") {
      entry.altas++;
    }

    if (reason === "ANULACIÓN") {
      entry.anulaciones++;
    }

    if (reason === "SINIESTRO") {
      entry.siniestros++;
    }
  });

  const matchedClients =
    clientHistory.size;

  /*
   * 10. REACTIVACIÓN / RETENCIÓN
   */

  let reactivationCandidates = 0;
  let retentionWatch = 0;
  let historicalWithoutCurrentPolicy = 0;

  clientHistory.forEach(
    (history, clientId) => {
      const activeCount =
        clientActivePolicies.get(clientId)
          ?.length || 0;

      if (
        history.altas > 0 &&
        activeCount === 0
      ) {
        reactivationCandidates++;
      }

      if (
        activeCount > 0 &&
        history.anulaciones > 0
      ) {
        retentionWatch++;
      }

      if (activeCount === 0) {
        historicalWithoutCurrentPolicy++;
      }
    }
  );

  /*
   * 11. PRODUCTOS ACTUALES
   */

  const currentProducts =
    new Map<string, number>();

  const companies =
    new Map<
      string,
      {
        policies: number;
        premium: number;
      }
    >();

  filteredPolicies.forEach((policy) => {
    addMap(
      currentProducts,
      policy.product
    );

    if (policy.company) {
      if (!companies.has(policy.company)) {
        companies.set(policy.company, {
          policies: 0,
          premium: 0,
        });
      }

      const company =
        companies.get(policy.company)!;

      company.policies++;

      if (isActivePolicy(policy.statuses)) {
        company.premium +=
          policy.activePremium;
      }
    }
  });

  /*
   * 12. CALIDAD / MIGRACIÓN
   */

  const policiesWithoutClient =
    policies.filter(
      (policy) =>
        !policy.clientIds.length
    ).length;

  const policiesWithoutProduct =
    policies.filter(
      (policy) => !policy.product
    ).length;

  const policiesWithoutCompany =
    policies.filter(
      (policy) => !policy.company
    ).length;

  const policiesWithoutExpiry =
    policies.filter(
      (policy) => !policy.expiryDate
    ).length;

  /*
   * 13. CROSS SELL
   */

  const crossSell = new Map<
    string,
    number
  >();

  clientActivePolicies.forEach(
    (clientPolicies) => {
      const products = new Set(
        clientPolicies
          .map((p) => p.product)
          .filter(Boolean)
      );

      if (products.has("AUTO")) {
        if (!products.has("VIDA")) {
          addMap(
            crossSell,
            "Auto → Vida"
          );
        }

        if (!products.has("HOGAR")) {
          addMap(
            crossSell,
            "Auto → Hogar"
          );
        }

        if (!products.has("AUXILIO")) {
          addMap(
            crossSell,
            "Auto → Auxilio"
          );
        }
      }

      if (products.has("MOTO")) {
        if (!products.has("VIDA")) {
          addMap(
            crossSell,
            "Moto → Vida"
          );
        }

        if (
          !products.has(
            "ACCIDENTES PERSONALES"
          )
        ) {
          addMap(
            crossSell,
            "Moto → Accidentes Personales"
          );
        }
      }
    }
  );

  /*
   * 14. CUSTOMER 360
   */

  let selectedClients = clients;

  if (filters.search) {
    const query =
      normalizeName(filters.search);

    const digits =
      normalizeDni(filters.search);

    selectedClients =
      clients.filter((client) => {
        if (
          normalizeName(client.name).includes(
            query
          )
        ) {
          return true;
        }

        if (
          digits &&
          client.dni?.includes(digits)
        ) {
          return true;
        }

        if (
          digits &&
          client.phone?.includes(digits)
        ) {
          return true;
        }

        return false;
      });
  }

  selectedClients =
    selectedClients.slice(0, 50);

  /*
   * Link directo a la ficha del cliente en el backend (Airtable):
   * base agéntica + tabla CLIENTES + id del registro.
   */
  const clientsTableId = await airtableTableId(
    CONFIG.agentic.baseId,
    CONFIG.agentic.tables.clients
  );

  const clientBackendUrl = (recordId: string) =>
    `https://airtable.com/${
      CONFIG.agentic.baseId
    }/${
      clientsTableId ||
      encodeURIComponent(CONFIG.agentic.tables.clients)
    }/${recordId}`;

  const customer360 =
    selectedClients.map((client) => {
      const history =
        clientHistory.get(client.id);

      const active =
        clientActivePolicies.get(client.id) ||
        [];

      const premium =
        active.reduce(
          (total, policy) =>
            total +
            policy.activePremium,
          0
        );

      const metrics = {
        activePolicies: active.length,
        historicAltas:
          history?.altas || 0,
        historicAnulaciones:
          history?.anulaciones || 0,
        historicSiniestros:
          history?.siniestros || 0,
        activePremium: premium,
      };

      const activeProducts = [
        ...new Set(
          active
            .map((policy) => policy.product)
            .filter(
              (value): value is string =>
                Boolean(value)
            )
        ),
      ].slice(0, 3);

      const historicProducts = [
        ...(history?.products || []),
      ].slice(0, 3);

      const recommendation =
        recommendationForClient(metrics);

      const plan = recommendationPlan({
        recommendation,
        activePolicies: metrics.activePolicies,
        historicAltas: metrics.historicAltas,
        historicAnulaciones:
          metrics.historicAnulaciones,
        historicSiniestros:
          metrics.historicSiniestros,
        activeProducts,
        historicProducts,
      });

      return {
        id: client.id,
        name: client.name,
        dni: client.dni,
        phone: client.phone,

        activePolicies:
          active.length,

        historicalOperations:
          history?.operations || 0,

        historicalAltas:
          history?.altas || 0,

        historicalAnulaciones:
          history?.anulaciones || 0,

        historicalSiniestros:
          history?.siniestros || 0,

        activePremium: premium,

        score:
          scoreClient(metrics),

        recommendation,

        recommendationWhy: plan.why,

        recommendationSteps: plan.steps,

        backendUrl:
          clientBackendUrl(client.id),
      };
    });

  /*
   * 14.b CRM VOCERO (snapshot de SOLO LECTURA)
   *
   * El CRM se cruza EN MEMORIA contra la cartera, igual que las otras
   * fuentes: no se mezclan bases, se superponen sobre los mismos ids.
   */

  const crmSnapshot = loadCrmSnapshot();

  const crm = buildCrmAnalytics(crmSnapshot, {
    clients,
    phoneIndex,
    nameIndex,
    clientActivePolicies,
    clientHistory,
  });

  /*
   * 15. FILTROS DISPONIBLES
   */

  const officeOptions = new Set<string>();
  const productOptions = new Set<string>();
  const employeeOptions = new Set<string>();
  const channelOptions = new Set<string>();
  const companyOptions = new Set<string>();

  historicRecords.forEach((record) => {
    const fields = record.fields;

    const office = text(
      fields[
        historicConfig.fields.office
      ]
    );

    const product = text(
      fields[
        historicConfig.fields.product
      ]
    );

    const channel = text(
      fields[
        historicConfig.fields.channel
      ]
    );

    if (office) officeOptions.add(office);
    if (product) productOptions.add(product);
    if (channel) channelOptions.add(channel);
  });

  policies.forEach((policy) => {
    if (policy.company) {
      companyOptions.add(policy.company);
    }

    if (policy.product) {
      productOptions.add(policy.product);
    }

    if (policy.employee) {
      employeeOptions.add(policy.employee);
    }

    if (policy.office) {
      officeOptions.add(policy.office);
    }
  });

  /*
   * RESPUESTA
   */

  return {
    generatedAt:
      new Date().toISOString(),

    migration: {
      clients: clients.length,

      historicOperations:
        historicRecords.length,

      matchedClients,

      matchedOperations,

      clientMatchRate:
        clients.length
          ? matchedClients /
            clients.length
          : 0,

      operationMatchRate:
        historicRecords.length
          ? matchedOperations /
            historicRecords.length
          : 0,

      unmatchedOperations:
        historicRecords.length -
        matchedOperations,

      loadedPolicies:
        policies.length,

      policiesWithoutClient,

      policiesWithoutProduct,

      policiesWithoutCompany,

      policiesWithoutExpiry,
    },

    historic: {
      altas,
      anulaciones,

      net:
        altas - anulaciones,

      ratio:
        altas
          ? anulaciones / altas
          : 0,

      cotizaciones,
      siniestros,
    },

    current: {
      loadedPolicies:
        filteredPolicies.length,

      activePolicies:
        activePolicies.length,

      activeClients:
        activeClientSet.size,

      activePremium,

      expires7,
      expires30,

      onePolicyClients,
      multiPolicyClients,
    },

    opportunity: {
      reactivationCandidates,

      activeWithOnePolicy:
        onePolicyClients,

      retentionWatch,

      historicalWithoutCurrentPolicy,
    },

    monthly: [
      ...monthData.entries(),
    ]
      .map(([month, values]) => ({
        month,

        altas:
          values.altas,

        anulaciones:
          values.anulaciones,

        net:
          values.altas -
          values.anulaciones,

        siniestros:
          values.siniestros,
      }))
      .sort(
        (a, b) =>
          a.month.localeCompare(b.month)
      ),

    historicProducts:
      topMap(productHistory, 12),

    currentProducts:
      topMap(currentProducts, 12),

    channels:
      topMap(channels, 10),

    offices: [
      ...officeData.entries(),
    ]
      .map(([name, values]) => ({
        name,

        altas:
          values.altas,

        anulaciones:
          values.anulaciones,

        net:
          values.altas -
          values.anulaciones,
      }))
      .sort(
        (a, b) =>
          b.net - a.net
      )
      .slice(0, 15),

    companies: [
      ...companies.entries(),
    ]
      .map(([name, values]) => ({
        name,

        policies:
          values.policies,

        activePremium:
          values.premium,
      }))
      .sort(
        (a, b) =>
          b.policies -
          a.policies
      ),

    crossSell: [
      ...crossSell.entries(),
    ]
      .map(
        ([opportunity, customers]) => ({
          opportunity,
          customers,
        })
      )
      .sort(
        (a, b) =>
          b.customers -
          a.customers
      ),

    filters: {
      offices: [
        ...officeOptions,
      ].sort(),

      products: [
        ...productOptions,
      ].sort(),

      employees: [
        ...employeeOptions,
      ].sort(),

      channels: [
        ...channelOptions,
      ].sort(),

      companies: [
        ...companyOptions,
      ].sort(),
    },

    customers: customer360,

    crm,
  };
}
