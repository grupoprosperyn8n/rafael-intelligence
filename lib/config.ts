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
    },

    productFields: {
      name: "NOMBRE PRODUCTO",
    },

    companyFields: {
      name: "NOMBRE",
    },
  },
};
