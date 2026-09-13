import { CONFIG } from "./config";
import { airtableTable } from "./airtable";

import {
  ClientCompact,
  DashboardFilters,
  DashboardResponse,
  DrillItem,
  DrillLink,
  DrillList,
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
   * Link directo a la ficha del cliente en el BACKOFFICE
   * (interfaz nativa de Airtable, NO la base de datos):
   * base agéntica + página de la interfaz + id del registro.
   */
  const clientBackendUrl = (recordId: string) =>
    `https://airtable.com/${CONFIG.agentic.baseId}/${CONFIG.backoffice.clientsPage}/${recordId}`;

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
   * 14.c LISTAS DINAMICAS POR MODULO
   *
   * El "por dentro" de cada numero del tablero: los clientes, polizas
   * y gestiones reales detras de cada metrica, con su link directo a
   * la ficha en el backoffice (interfaz nativa de Airtable).
   *
   * Todo se arma EN MEMORIA sobre los datos ya normalizados del pulso;
   * Airtable sigue siendo SOLO LECTURA (jamas se escribe nada).
   */

  const listClientById =
    new Map<string, ClientCompact>();

  clients.forEach((client) => {
    listClientById.set(client.id, client);
  });

  const policyBackendUrl = (recordId: string) =>
    `https://airtable.com/${CONFIG.agentic.baseId}/${CONFIG.backoffice.policiesPage}/${recordId}`;

  const backendLinksFor = (
    clientId?: string
  ) => {
    const links: DrillLink[] = [];

    if (clientId && listClientById.has(clientId)) {
      links.push({
        label: "Abrir ficha",
        url: clientBackendUrl(clientId),
      });
    }

    return links;
  };

  const policyLinksFor = (
    policyId: string,
    clientId?: string
  ) => {
    const links: DrillLink[] = [
      {
        label: "Ver póliza",
        url: policyBackendUrl(policyId),
      },
    ];

    links.push(...backendLinksFor(clientId));

    return links;
  };

  const moneyText = (value: number) =>
    "$" + Math.round(value).toLocaleString("es-AR");

  const dateText = (value?: string) =>
    value && typeof value === "string"
      ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`
      : "—";

  const daysText = (days: number | null) => {
    if (days === null) return "";

    if (days >= 0) {
      return `en ${days} ${
        days === 1 ? "día" : "días"
      }`;
    }

    if (days >= -400) {
      const ago = -days;

      return `vencida hace ${ago} ${
        ago === 1 ? "día" : "días"
      }`;
    }

    return "vencida";
  };

  const sortableExpiry = (value?: string) =>
    value && /^(19|20)\d\d-/.test(value)
      ? value
      : "9999-12-31";

  const drillItem = (
    name: string,
    detail: string,
    extra: string,
    links: DrillLink[] = [],
    dni?: string
  ): DrillItem => ({
    name: name || "—",
    detail,
    extra,
    links,
    ...(dni ? { dni } : {}),
  });

  const clientProductsText = (clientId: string) =>
    [
      ...(clientHistory.get(clientId)?.products ||
        new Set<string>()),
    ]
      .slice(0, 3)
      .join(", ") || "—";

  const clientActiveCount = (clientId: string) =>
    clientActivePolicies.get(clientId)?.length || 0;

  const clientPremiumText = (clientId: string) =>
    moneyText(
      (
        clientActivePolicies.get(clientId) || []
      ).reduce(
        (total, policy) =>
          total + policy.activePremium,
        0
      )
    );

  const LIST_CAP = 150;

  const lists: Record<string, DrillList[]> = {
    pulso: [],
    cartera: [],
    retencion: [],
    reactivacion: [],
    cross: [],
    migracion: [],
    crm: [],
  };

  /*
   * PULSO — ultimas altas / anulaciones / siniestros.
   */

  const pulseLists = [
    {
      id: "altas",
      title: "Últimas altas",
      reason: "ALTAS",
      total: altas,
    },
    {
      id: "anulaciones",
      title: "Últimas anulaciones",
      reason: "ANULACIÓN",
      total: anulaciones,
    },
    {
      id: "siniestros",
      title: "Últimos siniestros",
      reason: "SINIESTRO",
      total: siniestros,
    },
  ];

  const historicByReason = new Map<
    string,
    HistoricCompact[]
  >();

  historic.forEach((record) => {
    const reason =
      record.reason?.trim().toUpperCase() || "";

    const bucket =
      historicByReason.get(reason) || [];

    bucket.push(record);

    historicByReason.set(reason, bucket);
  });

  pulseLists.forEach((pulse) => {
    const records = (
      historicByReason.get(pulse.reason) || []
    )
      .slice()
      .sort((a, b) =>
        (b.date || "").localeCompare(a.date || "")
      )
      .slice(0, 80);

    lists.pulso.push({
      id: pulse.id,
      title: pulse.title,
      total: pulse.total,
      shown: records.length,
      items: records.map((record) =>
        drillItem(
          record.name || "—",
          `${record.product || "—"} · ${
            record.office || "—"
          }`,
          `${dateText(record.date)}${
            record.employee
              ? ` · ${record.employee}`
              : ""
          }`,
          backendLinksFor(record.clientId),
          record.dni
        )
      ),
    });
  });

  /*
   * CARTERA — polizas activas + clientes multi-poliza.
   */

  const activeSorted = activePolicies
    .slice()
    .sort((a, b) =>
      sortableExpiry(a.expiryDate).localeCompare(
        sortableExpiry(b.expiryDate)
      )
    );

  lists.cartera.push({
    id: "active",
    title: "Pólizas activas (por vencimiento)",
    total: activePolicies.length,
    shown: Math.min(
      activeSorted.length,
      LIST_CAP
    ),
    items: activeSorted
      .slice(0, LIST_CAP)
      .map((policy) => {
        const clientId = policy.clientIds[0];

        const days = daysUntil(
          policy.expiryDate
        );

        return drillItem(
          clientId
            ? listClientById.get(clientId)?.name ||
              "Cliente sin nombre"
            : "Sin cliente vinculado",
          `${policy.product || "—"} · Póliza ${
            policy.number || "s/n"
          }`,
          `${policy.company || "—"} · vence ${dateText(
            policy.expiryDate
          )}${
            days !== null
              ? ` (${daysText(days)})`
              : ""
          } · ${moneyText(policy.activePremium)}`,
          policyLinksFor(policy.id, clientId)
        );
      }),
  });

  const multiPolicies = [
    ...clientActivePolicies.entries(),
  ]
    .filter(([, clientPolicies]) =>
      clientPolicies.length >= 2
    )
    .sort((a, b) => {
      const premiumA = a[1].reduce(
        (sum, policy) =>
          sum + policy.activePremium,
        0
      );

      const premiumB = b[1].reduce(
        (sum, policy) =>
          sum + policy.activePremium,
        0
      );

      return premiumB - premiumA;
    });

  lists.cartera.push({
    id: "multi",
    title: "Clientes con 2 o más pólizas",
    total: multiPolicyClients,
    shown: Math.min(
      multiPolicies.length,
      LIST_CAP
    ),
    items: multiPolicies
      .slice(0, LIST_CAP)
      .map(([clientId, clientPolicies]) => {
        const client =
          listClientById.get(clientId);

        const products = [
          ...new Set(
            clientPolicies
              .map((policy) => policy.product)
              .filter(Boolean)
          ),
        ];

        return drillItem(
          client?.name || "Cliente sin nombre",
          `${clientPolicies.length} pólizas · ${
            products.slice(0, 3).join(", ") || "—"
          }`,
          `Prima activa ${clientPremiumText(
            clientId
          )}`,
          backendLinksFor(clientId),
          client?.dni
        );
      }),
  });

  /*
   * RETENCION — vencimientos + clientes a observar.
   */

  const expiryList = (
    id: string,
    title: string,
    maxDays: number,
    total: number
  ) => {
    const records = activePolicies
      .filter((policy) => {
        const days = daysUntil(
          policy.expiryDate
        );

        return (
          days !== null &&
          days >= 0 &&
          days <= maxDays
        );
      })
      .sort((a, b) =>
        (a.expiryDate || "").localeCompare(
          b.expiryDate || ""
        )
      );

    lists.retencion.push({
      id,
      title,
      total,
      shown: Math.min(records.length, LIST_CAP),
      items: records
        .slice(0, LIST_CAP)
        .map((policy) => {
          const clientId = policy.clientIds[0];

          const days = daysUntil(
            policy.expiryDate
          );

          return drillItem(
            clientId
              ? listClientById.get(clientId)?.name ||
                "Cliente sin nombre"
              : "Sin cliente vinculado",
            `${policy.product || "—"} · Póliza ${
              policy.number || "s/n"
            }`,
            `Vence ${dateText(
              policy.expiryDate
            )}${
              days !== null
                ? ` (${daysText(days)})`
                : ""
            } · ${policy.company || "—"} · ${moneyText(
              policy.activePremium
            )}`,
            policyLinksFor(policy.id, clientId)
          );
        }),
    });
  };

  expiryList(
    "expires7",
    "Vencen ≤7 días",
    7,
    expires7
  );

  expiryList(
    "expires30",
    "Vencen ≤30 días",
    30,
    expires30
  );

  const watchers = [...clientHistory.entries()]
    .filter(
      ([clientId, history]) =>
        clientActiveCount(clientId) > 0 &&
        history.anulaciones > 0
    )
    .sort(
      (a, b) =>
        b[1].anulaciones - a[1].anulaciones
    );

  lists.retencion.push({
    id: "watch",
    title: "Clientes a observar",
    total: retentionWatch,
    shown: Math.min(watchers.length, LIST_CAP),
    items: watchers
      .slice(0, LIST_CAP)
      .map(([clientId, history]) => {
        const client =
          listClientById.get(clientId);

        return drillItem(
          client?.name || "Cliente sin nombre",
          `${clientActiveCount(
            clientId
          )} póliza(s) activa(s) · ${
            history.anulaciones
          } anulación(es)`,
          `Productos: ${clientProductsText(
            clientId
          )} · Prima ${clientPremiumText(
            clientId
          )}`,
          backendLinksFor(clientId),
          client?.dni
        );
      }),
  });

  /*
   * REACTIVACION — candidatos.
   */

  const reactivationList = [
    ...clientHistory.entries(),
  ]
    .filter(
      ([clientId, history]) =>
        history.altas > 0 &&
        clientActiveCount(clientId) === 0
    )
    .sort(
      (a, b) =>
        b[1].operations - a[1].operations
    );

  lists.reactivacion.push({
    id: "candidates",
    title: "Candidatos a reactivar",
    total: reactivationCandidates,
    shown: Math.min(
      reactivationList.length,
      LIST_CAP
    ),
    items: reactivationList
      .slice(0, LIST_CAP)
      .map(([clientId, history]) => {
        const client =
          listClientById.get(clientId);

        return drillItem(
          client?.name || "Cliente sin nombre",
          `${history.operations} gestiones · ${
            history.altas
          } altas${
            history.anulaciones
              ? ` · ${history.anulaciones} anulaciones`
              : ""
          }`,
          `Productos: ${clientProductsText(
            clientId
          )}${
            client?.phone
              ? ` · Tel ${client.phone}`
              : ""
          }`,
          backendLinksFor(clientId),
          client?.dni
        );
      }),
  });

  /*
   * VENTA CRUZADA — clientes por oportunidad.
   */

  const crossRules = [
    {
      opportunity: "Auto → Vida",
      from: "AUTO",
      to: "VIDA",
    },
    {
      opportunity: "Auto → Hogar",
      from: "AUTO",
      to: "HOGAR",
    },
    {
      opportunity: "Auto → Auxilio",
      from: "AUTO",
      to: "AUXILIO",
    },
    {
      opportunity: "Moto → Vida",
      from: "MOTO",
      to: "VIDA",
    },
    {
      opportunity:
        "Moto → Accidentes Personales",
      from: "MOTO",
      to: "ACCIDENTES PERSONALES",
    },
  ];

  crossRules
    .filter(
      (rule) =>
        (crossSell.get(rule.opportunity) || 0) >
        0
    )
    .sort(
      (a, b) =>
        (crossSell.get(b.opportunity) || 0) -
        (crossSell.get(a.opportunity) || 0)
    )
    .slice(0, 5)
    .forEach((rule) => {
      const matches: {
        clientId: string;
        products: string[];
        premium: number;
      }[] = [];

      clientActivePolicies.forEach(
        (clientPolicies, clientId) => {
          const products = new Set<string>(
            clientPolicies
              .map((policy) => policy.product)
              .filter(
                (product): product is string =>
                  Boolean(product)
              )
          );

          if (
            products.has(rule.from) &&
            !products.has(rule.to)
          ) {
            matches.push({
              clientId,
              products: [...products],
              premium: clientPolicies.reduce(
                (sum, policy) =>
                  sum + policy.activePremium,
                0
              ),
            });
          }
        }
      );

      matches.sort(
        (a, b) => b.premium - a.premium
      );

      lists.cross.push({
        id: rule.opportunity
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-"),
        title: rule.opportunity,
        total:
          crossSell.get(rule.opportunity) || 0,
        shown: Math.min(
          matches.length,
          LIST_CAP
        ),
        items: matches
          .slice(0, LIST_CAP)
          .map((match) => {
            const client =
              listClientById.get(
                match.clientId
              );

            return drillItem(
              client?.name ||
                "Cliente sin nombre",
              `Tiene: ${match.products.join(
                ", "
              )} · Sumar: ${rule.to}`,
              `Prima activa ${moneyText(
                match.premium
              )}`,
              backendLinksFor(match.clientId),
              client?.dni
            );
          }),
      });
    });

  /*
   * MIGRACION — gestiones sin vincular + polizas incompletas.
   */

  const unmatchedRecords =
    historicRecords.filter(
      (record) =>
        !matchHistoricClient(record.fields)
    );

  const unmatchedSorted = unmatchedRecords
    .slice()
    .sort((a, b) =>
      text(
        b.fields[historicConfig.fields.date]
      ).localeCompare(
        text(
          a.fields[historicConfig.fields.date]
        )
      )
    );

  lists.migracion.push({
    id: "unmatched",
    title: "Gestiones sin vincular a un cliente",
    total:
      historicRecords.length -
      matchedOperations,
    shown: Math.min(
      unmatchedSorted.length,
      LIST_CAP
    ),
    items: unmatchedSorted
      .slice(0, LIST_CAP)
      .map((record) =>
        drillItem(
          text(
            record.fields[
              historicConfig.fields.name
            ]
          ) || "Sin nombre",
          `${
            text(
              record.fields[
                historicConfig.fields.reason
              ]
            ) || "—"
          } · ${
            text(
              record.fields[
                historicConfig.fields.product
              ]
            ) || "—"
          }`,
          `${dateText(
            text(
              record.fields[
                historicConfig.fields.date
              ]
            )
          )} · ${
            text(
              record.fields[
                historicConfig.fields.office
              ]
            ) || "—"
          }`,
          []
        )
      ),
  });

  const incompletePolicies = policies.filter(
    (policy) =>
      !policy.product ||
      !policy.company ||
      !policy.expiryDate
  );

  lists.migracion.push({
    id: "incomplete",
    title: "Pólizas con datos incompletos",
    total: incompletePolicies.length,
    shown: Math.min(
      incompletePolicies.length,
      LIST_CAP
    ),
    items: incompletePolicies
      .slice(0, LIST_CAP)
      .map((policy) => {
        const missing = [
          !policy.product ? "producto" : null,
          !policy.company ? "compañía" : null,
          !policy.expiryDate
            ? "vencimiento"
            : null,
        ].filter(Boolean) as string[];

        const clientId = policy.clientIds[0];

        return drillItem(
          clientId
            ? listClientById.get(clientId)?.name ||
              "Cliente sin nombre"
            : "Sin cliente vinculado",
          `Póliza ${
            policy.number || "s/n"
          } · Falta: ${missing.join(", ")}`,
          isActivePolicy(policy.statuses)
            ? "Activa"
            : "Inactiva",
          policyLinksFor(policy.id, clientId)
        );
      }),
  });

  /*
   * CRM — contactos vinculados a la cartera.
   */

  if (crm.available && crm.rows) {
    const crmRows = crm.rows.slice();

    lists.crm.push({
      id: "matched",
      title: "Contactos del CRM vinculados",
      total: crmRows.length,
      shown: Math.min(crmRows.length, LIST_CAP),
      items: crmRows
        .slice(0, LIST_CAP)
        .map((row) =>
          drillItem(
            row.clientName || row.name || "—",
            `${row.channel || "—"} · ${
              row.messages
            } mensajes`,
            `${
              row.activePolicies
            } póliza(s) · Prima ${
              row.activePremium
                ? moneyText(row.activePremium)
                : "—"
            }${
              row.expiring30
                ? ` · vence ≤30d: ${row.expiring30}`
                : ""
            }`,
            backendLinksFor(row.clientId)
          )
        ),
    });
  }

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

    lists,
  };
}
