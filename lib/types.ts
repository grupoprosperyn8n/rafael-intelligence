export type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, any>;
};

export type DashboardFilters = {
  from?: string;
  to?: string;
  office?: string;
  product?: string;
  employee?: string;
  channel?: string;
  company?: string;
  search?: string;
};

export type HistoricCompact = {
  id: string;
  clientId?: string;

  name?: string;
  dni?: string;
  phone?: string;
  email?: string;

  date?: string;
  office?: string;
  reason?: string;
  product?: string;
  employee?: string;
  channel?: string;
  payment?: string;
  amount: number;
};

export type PolicyCompact = {
  id: string;
  clientIds: string[];

  number?: string;

  statuses: string[];

  product?: string;
  company?: string;
  employee?: string;
  office?: string;
  payment?: string;

  startDate?: string;
  expiryDate?: string;
  cancellationDate?: string;

  premium: number;
  activePremium: number;
};

export type ClientCompact = {
  id: string;

  uniqueId?: string;

  name: string;
  dni?: string;
  phone?: string;
  email?: string;
};

export type DashboardResponse = {
  generatedAt: string;

  migration: {
    clients: number;
    historicOperations: number;
    matchedClients: number;
    matchedOperations: number;
    clientMatchRate: number;
    operationMatchRate: number;
    unmatchedOperations: number;

    loadedPolicies: number;
    policiesWithoutClient: number;
    policiesWithoutProduct: number;
    policiesWithoutCompany: number;
    policiesWithoutExpiry: number;
  };

  historic: {
    altas: number;
    anulaciones: number;
    net: number;
    ratio: number;
    cotizaciones: number;
    siniestros: number;
  };

  current: {
    loadedPolicies: number;
    activePolicies: number;
    activeClients: number;
    activePremium: number;
    expires7: number;
    expires30: number;
    onePolicyClients: number;
    multiPolicyClients: number;
  };

  opportunity: {
    reactivationCandidates: number;
    activeWithOnePolicy: number;
    retentionWatch: number;
    historicalWithoutCurrentPolicy: number;
  };

  monthly: {
    month: string;
    altas: number;
    anulaciones: number;
    net: number;
    siniestros: number;
  }[];

  historicProducts: {
    name: string;
    value: number;
  }[];

  currentProducts: {
    name: string;
    value: number;
  }[];

  channels: {
    name: string;
    value: number;
  }[];

  offices: {
    name: string;
    altas: number;
    anulaciones: number;
    net: number;
  }[];

  companies: {
    name: string;
    policies: number;
    activePremium: number;
  }[];

  crossSell: {
    opportunity: string;
    customers: number;
  }[];

  filters: {
    offices: string[];
    products: string[];
    employees: string[];
    channels: string[];
    companies: string[];
  };

  customers: {
    id: string;
    name: string;
    dni?: string;
    phone?: string;

    activePolicies: number;
    historicalOperations: number;
    historicalAltas: number;
    historicalAnulaciones: number;
    historicalSiniestros: number;

    activePremium: number;

    score: number;
    recommendation: string;
  }[];
};
