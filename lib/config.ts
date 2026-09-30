export const CONFIG = {
  historic: {
    baseId:
      process.env.AIRTABLE_BASE_HISTORICA ||
      "appIO1WFzawAfos4E",

    tables: {
      management: "📊 GESTIÓN GENERAL",
      employees: "👥 EMPLEADOS",
    },

    fields: {
      name: "NOMBRE Y APELLIDO",
      dni: "DNI",
      phone: "TELEFONO",
      email: "E-MAIL",
      date: "FECHA",
      office: "OFICINAS",
      reason: "MOTIVOS DE LA CONSULTA",
      product: "TIPO DE PRODUCTOS",
      payment: "FORMA DE PAGOS",
      amount: "IMPORTE",
      employee: "ATENDIDO X",
      channel: "TIPO DE ATENCIÓN",
      renewal: "RENOVACIÓN",
    },

    // Campo de nombre dentro de "👥 EMPLEADOS" (para traducir ATENDIDO X)
    employeeNameField: "NOMBRE Y APELLIDO",
  },

  agentic: {
    baseId:
      process.env.AIRTABLE_BASE_AGENTICA ||
      "appuhslj3GFf60Tea",

    tables: {
      clients: "CLIENTES",
      policies: "POLIZAS",
      products: "PRODUCTOS",
      companies: "COMPANIA",
      employees: "EMPLEADOS",
      offices: "OFICINAS",
      prospects: "PROSPECTOS",
      quoteProspects: "PROSPECTOS MULTICOTIZADOR",

      // 045-B1 — Calidad y experiencia: encuestas de satisfacción
      // (con urgencia calculada por IA) y denuncias de siniestros
      // (con informe IA por caso).
      ratings: "CALIFICACIONES",
      claimsAccident: "DENUNCIA DE ACCIDENTE",
      claimsTheft: "DENUNCIA ROBO OC",
      claimsFire: "DENUNCIA ROBO / INCENDIO",

      // 045b — catálogo: coberturas con análisis IA.
      coverage: "TIPO DE COBERTURA",
    },

    clientFields: {
      normalizedName: "NOMBRE NORMALIZADO",
      dni: "DNI",
      phone: "TELEFONO",
      // Teléfono en dígitos completos (el campo TELEFONO viene enmascarado +543****XXXX)
      phoneNormalized: "TELEFONO NORMALIZADO",
      email: "EMAIL",
      uniqueId: "ID_UNICO_CLIENTE",
      activePolicies: "🟢 POLIZAS_ACTIVAS",
      policyCount: "✅ CANTIDAD_POLIZAS",
      activePremium: "PRIMA ACTIVA CLIENTE",
      // 045-B2 — Perfil de riesgo IA del cliente (aiText de Airtable).
      riskProfile: "PERFIL_DE_RIESGO_IA",
    },

    policyFields: {
      number: "N° DE POLIZA",
      clients: "CLIENTES 2",
      status: "ESTADO DE LA POLIZA",
      startDate: "FECHA DE INICIO DE LA POLIZA",
      expiryDate: "FECHA VENCIMIENTO DE LA POLIZA",
      cancellationDate: "FECHA DE ANULACION",
      product: "PRODUCTO LINK",
      company: "COMPANIA LINK",
      premium: "IMPORTE",
      activePremium: "PRIMA ACTIVA CALCULADA",
      payment: "FORMA DE PAGOS",
      employee: "EMPLEADOS",
      office: "OFICINAS",
      // 045-B2 — Informe IA de la póliza (aiText: estado operativo).
      riskReport: "INFORME_POLIZA_IA",
    },

    productFields: {
      name: "NOMBRE PRODUCTO",
      // 045b — análisis IA del producto (aiText) + compañía (link).
      analysis: "ANÁLISIS IA GENERAL",
      recommendation: "RECOMENDACIÓN IA DE MEJORAS",
      company: "COMPANIA",
    },

    /* 045b — campos de TIPO DE COBERTURA (análisis y categorización IA). */
    coverageFields: {
      name: "NOMBRE DE COBERTURA",
      analysis: "ANALISIS IA COBERTURA",
      category: "CATEGORIZACION IA DE TIPO",
    },

    companyFields: {
      name: "NOMBRE",
    },

    /* 045-B3 — Campos de EMPLEADOS para el panel Equipo
     * (informe IA + comisiones + gestiones del sistema). */
    employeeFields: {
      name: "NOMBRE Y APELLIDO",
      // 045b — sucursal del empleado (para el filtro por sucursal).
      locality: "LOCALIDAD",
      report: "INFORME_PRODUCTIVIDAD",
      commissionYear:
        "💰✅ TOTAL COMISIÓN FINAL (de GESTION GENERAL) DEL AÑO",
      commissionMonth:
        "💰✅ TOTAL COMISIÓN FINAL (de GESTION GENERAL) MES EN CURSO",
      countYear:
        "Recuento (GESTION GENERAL) DEL AÑO",
      countMonth:
        "Recuento (GESTION GENERAL)  MES EN CUSRSO",
    },

    /* 045-B3 — Campos de OFICINAS para el panel Equipo. */
    officeTeamFields: {
      name: "OFICINAS",
      report: "INFORME_PRODUCTIVIDAD_OFICINA",
      countYear:
        "CANTIDAD DE GESTIONES GENERALES ANUAL",
      countMonth:
        "CANTIDAD DE GESTIONES GENERALES MENSUAL",
    },

    /* 045-B1 — Campos de CALIFICACIONES (encuesta post-atención). */
    ratingFields: {
      stars: "ESTRELLAS",
      service: "SERVICIO",
      comment: "COMENTARIO",
      urgency: "URGENCIA DE ATENCION (AI)",
      employee: "EMPLEADO",
      clientName: "NOMBRE",
      date: "FECHA DE CREACION",
      mode: "MODO",
    },

    /* 045-B1 — Campos de las denuncias (informe IA por caso). */
    claimFields: {
      date: "FECHA DE CREACION",
      office: "OFICINAS",
      client: "CLIENTE",
      report: "INFORME_DENUNCIA_ACCIDENTE",
      status: "Estado del trámite",
      culpability: "CULPABILIDAD IA",
    },

    theftClaimFields: {
      date: "FECHA DE CREACION",
      office: "OFICINAS",
      client: "CLIENTE",
      report: "INFORME_ROBO_OC",
      status: "Estado del trámite",
    },

    fireClaimFields: {
      date: "FECHA DE CREACION",
      office: "OFICINAS",
      client: "CLIENTE",
      report: "INFORME_ROBO/INCENDIO",
      status: "ESTADO DEL RECLAMO",
    },
  },

  /*
   * BACKOFFICE — interfaz nativa de Airtable (páginas "pag...").
   * El botón "Abrir ficha en el backoffice" del Cliente 360° abre:
   *   https://airtable.com/{baseId}/{clientsPage}/{recordId}
   * Patrón oficial de Airtable para linkear la ficha de un registro
   * dentro de la interfaz (compartible con usuarios que tengan acceso).
   */
  backoffice: {
    clientsPage:
      process.env.AIRTABLE_BACKOFFICE_CLIENTS_PAGE ||
      "pagloDiKehe3EMnT4",

    /*
     * Paginas de la interfaz nativa para polizas y gestiones:
     * las usan los links "Ver poliza" de las listas dinamicas.
     */
    policiesPage:
      process.env.AIRTABLE_BACKOFFICE_POLICIES_PAGE ||
      "paguNCUHZRnPblGti",

    managementPage:
      process.env.AIRTABLE_BACKOFFICE_MANAGEMENT_PAGE ||
      "pag3HZa7GNLZI8ijC",
  },
};
