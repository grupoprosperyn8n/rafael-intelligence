"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Database,
  HeartHandshake,
  HelpCircle,
  Lightbulb,
  MessageSquareText,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";

import type {
  ClientInsight,
  DashboardResponse,
  InsightMode,
} from "@/lib/types";

import {
  MODULE_HELP,
  type HelpAction,
  type ModuleHelp,
} from "@/lib/help";

type Tab =
  | "pulso"
  | "cartera"
  | "retencion"
  | "reactivacion"
  | "cross"
  | "clientes"
  | "crm"
  | "migracion";

function money(value: number) {
  return new Intl.NumberFormat(
    "es-AR",
    {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }
  ).format(value);
}

function number(value: number) {
  return new Intl.NumberFormat(
    "es-AR"
  ).format(value);
}

function percent(value: number) {
  return `${(
    value * 100
  ).toFixed(1)}%`;
}

function Kpi({
  title,
  value,
  subtitle,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <article
      className={`kpi-card ${tone}`}
    >
      <div className="kpi-top">
        <span className="kpi-title">
          {title}
        </span>

        <span className="kpi-icon">
          {icon}
        </span>
      </div>

      <strong className="kpi-value">
        {value}
      </strong>

      <span className="kpi-subtitle">
        {subtitle}
      </span>
    </article>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section-card">
      <header className="section-header">
        <div>
          <h2>{title}</h2>

          {subtitle && (
            <p>{subtitle}</p>
          )}
        </div>
      </header>

      {children}
    </section>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`badge ${tone}`}
    >
      {children}
    </span>
  );
}

function presetRange(
  preset: "month" | "lastMonth" | "year" | "all"
) {
  const now = new Date();

  const pad = (n: number) =>
    String(n).padStart(2, "0");

  const iso = (d: Date) =>
    `${d.getFullYear()}-${pad(
      d.getMonth() + 1
    )}-${pad(d.getDate())}`;

  if (preset === "all") {
    return { from: "", to: "" };
  }

  if (preset === "year") {
    return {
      from: `${now.getFullYear()}-01-01`,
      to: iso(now),
    };
  }

  if (preset === "month") {
    return {
      from: `${now.getFullYear()}-${pad(
        now.getMonth() + 1
      )}-01`,
      to: iso(now),
    };
  }

  const first = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );

  const last = new Date(
    now.getFullYear(),
    now.getMonth(),
    0
  );

  return { from: iso(first), to: iso(last) };
}

function HelpZone({
  help,
  id,
  onAction,
}: {
  help: ModuleHelp;
  id: string;
  onAction: (action: HelpAction) => void;
}) {
  const [open, setOpen] =
    useState(false);

  useEffect(() => {
    let seen = true;

    try {
      seen = Boolean(
        localStorage.getItem(
          `r360-help-${id}`
        )
      );
    } catch {}

    if (!seen) {
      setOpen(true);

      try {
        localStorage.setItem(
          `r360-help-${id}`,
          "1"
        );
      } catch {}
    }
  }, [id]);

  return (
    <section
      className={`help-zone${
        open ? " open" : ""
      }`}
    >
      <button
        className="help-head"
        onClick={() => setOpen(!open)}
      >
        <span className="help-badge">
          <HelpCircle size={16} />
        </span>

        <span className="help-copy">
          <strong>
            ¿Cómo funciona {help.title}?
          </strong>

          <em>{help.tagline}</em>
        </span>

        <span className="help-toggle">
          {open ? "Cerrar guía" : "Abrir guía"}

          <ChevronDown
            size={16}
            className={
              open ? "rot" : undefined
            }
          />
        </span>
      </button>

      {open && (
        <div className="help-body">
          <div className="help-grid">
            <div>
              <h4>¿Qué es?</h4>

              <ul>
                {help.what.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4>¿Qué mide?</h4>

              <ul>
                {help.measures.map(
                  (item) => (
                    <li key={item}>
                      {item}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <h4>
                ¿Para qué te sirve?
              </h4>

              <ul>
                {help.usage.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {help.suggestions.length >
            0 && (
            <div className="help-suggestions">
              <h4>
                <Lightbulb size={13} />
                Sugerencias
              </h4>

              <div className="help-chips">
                {help.suggestions.map(
                  (suggestion) => (
                    <button
                      key={suggestion.text}
                      className="help-chip"
                      onClick={() => {
                        if (
                          suggestion.action
                        ) {
                          onAction(
                            suggestion.action
                          );
                        }
                      }}
                    >
                      {suggestion.text}

                      {suggestion.action && (
                        <ArrowUpRight
                          size={13}
                        />
                      )}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function SuggestionsStrip({
  data,
  onGoto,
}: {
  data: DashboardResponse;
  onGoto: (tab: Tab) => void;
}) {
  const items: {
    text: string;
    tab: Tab;
  }[] = [];

  if (data.current.expires7 > 0) {
    items.push({
      text: `${number(
        data.current.expires7
      )} pólizas vencen en ≤7 días — hablá hoy`,
      tab: "retencion",
    });
  } else if (data.current.expires30 > 0) {
    items.push({
      text: `${number(
        data.current.expires30
      )} pólizas vencen este mes — prepará la ronda`,
      tab: "retencion",
    });
  }

  if (
    data.opportunity
      .reactivationCandidates > 0
  ) {
    items.push({
      text: `${number(
        data.opportunity
          .reactivationCandidates
      )} clientes para reactivar`,
      tab: "reactivacion",
    });
  }

  const topCross = data.crossSell?.[0];

  if (
    topCross &&
    topCross.customers > 0
  ) {
    items.push({
      text: `${topCross.opportunity}: ${number(
        topCross.customers
      )} clientes para ampliar`,
      tab: "cross",
    });
  }

  if (
    data.crm?.available &&
    data.crm.kpis?.leads > 0
  ) {
    const leads = data.crm.kpis.leads;

    items.push({
      text: `CRM: ${number(leads)} ${
        leads === 1
          ? "oportunidad abierta"
          : "oportunidades abiertas"
      }`,
      tab: "crm",
    });
  }

  items.push({
    text: `Migración: ${percent(
      data.migration.operationMatchRate
    )} de gestiones vinculadas`,
    tab: "migracion",
  });

  if (!items.length) return null;

  return (
    <section className="sug-strip">
      <span className="sug-label">
        <Sparkles size={14} />
        Sugerencias de hoy
      </span>

      <div className="sug-chips">
        {items.slice(0, 5).map((item) => (
          <button
            key={item.text}
            className="sug-chip"
            onClick={() => onGoto(item.tab)}
          >
            {item.text}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function ExecutiveDashboard() {
  const [data, setData] =
    useState<DashboardResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [tab, setTab] =
    useState<Tab>("pulso");

  const [filters, setFilters] =
    useState({
      from: "",
      to: "",
      office: "",
      product: "",
      employee: "",
      channel: "",
      company: "",
      search: "",
    });

  /*
   * Motor de sugerencias del Cliente 360°: "algoritmo" | "dual" | "ia".
   * Se recuerda por navegador; el default es "dual".
   */
  const [engine, setEngine] =
    useState<InsightMode>("dual");

  const [insights, setInsights] = useState<
    Record<
      string,
      {
        status: "loading" | "error" | "done";
        data?: ClientInsight;
        error?: string;
      }
    >
  >({});

  const [copiedInsight, setCopiedInsight] =
    useState<string | null>(null);

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem("r360-engine");

      if (
        saved === "algoritmo" ||
        saved === "dual" ||
        saved === "ia"
      ) {
        setEngine(saved);
      }
    } catch {}
  }, []);

  function chooseEngine(mode: InsightMode) {
    setEngine(mode);

    try {
      localStorage.setItem("r360-engine", mode);
    } catch {}
  }

  async function requestInsight(
    customer: DashboardResponse["customers"][number],
    mode: "dual" | "ia"
  ) {
    const key = `${mode}:${customer.id}`;

    setInsights((prev) => ({
      ...prev,
      [key]: { status: "loading" },
    }));

    try {
      const response = await fetch("/api/insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: customer.id,
          mode,
          context: {
            name: customer.name,
            activePolicies: customer.activePolicies,
            historicalOperations:
              customer.historicalOperations,
            historicalAltas: customer.historicalAltas,
            historicalAnulaciones:
              customer.historicalAnulaciones,
            historicalSiniestros:
              customer.historicalSiniestros,
            activePremium: customer.activePremium,
            score: customer.score,
            recommendation: customer.recommendation,
            recommendationWhy: customer.recommendationWhy,
            recommendationSteps:
              customer.recommendationSteps,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "La IA no respondió."
        );
      }

      setInsights((prev) => ({
        ...prev,
        [key]: { status: "done", data: result.insight },
      }));
    } catch (err: any) {
      setInsights((prev) => ({
        ...prev,
        [key]: {
          status: "error",
          error: err?.message || "La IA no respondió.",
        },
      }));
    }
  }

  async function copyInsightMessage(
    key: string,
    text: string
  ) {
    try {
      await navigator.clipboard.writeText(text);

      setCopiedInsight(key);

      setTimeout(() => setCopiedInsight(null), 1800);
    } catch {}
  }

  async function load(
    override?: typeof filters
  ) {
    const active = override || filters;

    setLoading(true);
    setError("");

    try {
      const query =
        new URLSearchParams();

      Object.entries(active).forEach(
        ([key, value]) => {
          if (value) {
            query.set(key, value);
          }
        }
      );

      const response = await fetch(
        `/api/dashboard?${query}`,
        {
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "No se pudo cargar el dashboard."
        );
      }

      setData(result);
    } catch (err: any) {
      setError(
        err.message ||
          "Error al cargar datos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function applyHelpAction(
    action: HelpAction
  ) {
    if (action.kind === "goto") {
      setTab(action.tab);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    if (action.kind === "dates") {
      const range = presetRange(
        action.preset
      );

      const next = {
        ...filters,
        from: range.from,
        to: range.to,
      };

      setFilters(next);

      load(next);
    }
  }

  function removeFilter(
    key: keyof typeof filters
  ) {
    const next = {
      ...filters,
      [key]: "",
    };

    setFilters(next);

    load(next);
  }

  function clearFilters() {
    const next = {
      from: "",
      to: "",
      office: "",
      product: "",
      employee: "",
      channel: "",
      company: "",
      search: "",
    };

    setFilters(next);

    load(next);
  }

  const totalOpportunity =
    useMemo(() => {
      if (!data) return 0;

      return (
        data.opportunity
          .reactivationCandidates +
        data.current.onePolicyClients
      );
    }, [data]);

  if (loading && !data) {
    return (
      <main className="loading-screen">
        <RefreshCcw
          className="spin"
          size={34}
        />

        <h1>
          Preparando inteligencia
          de cartera
        </h1>

        <p>
          Cruzando clientes,
          historial y pólizas...
        </p>

        <span className="loading-hint">
          La primera carga puede tardar
          hasta 2 minutos.
          Después abre al instante.
        </span>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="loading-screen">
        <AlertTriangle size={36} />

        <h1>
          No pudimos cargar los datos
        </h1>

        <p>{error}</p>

        <button onClick={() => load()}>
          Reintentar
        </button>
      </main>
    );
  }

  if (!data) return null;

  const filterLabels: Record<
    keyof typeof filters,
    (value: string) => string
  > = {
    from: (value) => `Desde ${value}`,
    to: (value) => `Hasta ${value}`,
    office: (value) => `Oficina: ${value}`,
    product: (value) => `Producto: ${value}`,
    employee: (value) => `Empleado: ${value}`,
    channel: (value) => `Canal: ${value}`,
    company: (value) => `Compañía: ${value}`,
    search: (value) => `Búsqueda: “${value}”`,
  };

  const activeFilterChips = (
    Object.entries(filters) as [
      keyof typeof filters,
      string,
    ][]
  ).filter(([, value]) => value);

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            RA
          </div>

          <div>
            <strong>
              Rafael Allende
            </strong>

            <span>
              Inteligencia de Cartera
            </span>
          </div>
        </div>

        <nav>
          {[
            [
              "pulso",
              "Pulso del negocio",
              TrendingUp,
            ],
            [
              "cartera",
              "Cartera",
              BriefcaseBusiness,
            ],
            [
              "retencion",
              "Retención",
              HeartHandshake,
            ],
            [
              "reactivacion",
              "Reactivación",
              Target,
            ],
            [
              "cross",
              "Venta cruzada",
              ArrowUpRight,
            ],
            [
              "clientes",
              "Cliente 360°",
              Users,
            ],
            [
              "crm",
              "CRM · Venta y gestión",
              MessageSquareText,
            ],
            [
              "migracion",
              "Calidad de datos",
              Database,
            ],
          ].map(
            ([id, label, Icon]: any) => (
              <button
                key={id}
                className={
                  tab === id
                    ? "nav-item active"
                    : "nav-item"
                }
                onClick={() =>
                  setTab(id)
                }
              >
                <Icon size={18} />

                {label}
              </button>
            )
          )}
        </nav>

        <div className="migration-mini">
          <span>
            Integración histórica
          </span>

          <strong>
            {percent(
              data.migration
                .operationMatchRate
            )}
          </strong>

          <div className="progress">
            <div
              style={{
                width: `${Math.min(
                  100,
                  data.migration
                    .operationMatchRate *
                    100
                )}%`,
              }}
            />
          </div>

          <small>
            Gestiones relacionadas
            con clientes
          </small>
        </div>
      </aside>

      <div className="dashboard-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              COCKPIT EJECUTIVO
            </p>

            <h1>
              Decisiones claras sobre
              clientes, cartera y
              crecimiento
            </h1>

            <p className="top-description">
              La historia de Rafael y
              la nueva plataforma,
              analizadas como una única
              cartera.
            </p>
          </div>

          <div className="status-area">
            <Badge tone="warning">
              Pólizas en proceso de carga
            </Badge>

            <button
              className="refresh-button"
              onClick={() => load()}
            >
              <RefreshCcw size={16} />

              Actualizar
            </button>
          </div>
        </header>

        <SuggestionsStrip
          data={data}
          onGoto={(nextTab) => {
            setTab(nextTab);

            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
        />

        <section className="filter-panel">
          <div className="filter-presets">
            {(
              [
                ["Este mes", "month"],
                ["Mes pasado", "lastMonth"],
                ["Este año", "year"],
                ["Todo el tiempo", "all"],
              ] as const
            ).map(([label, preset]) => (
              <button
                key={label}
                className="preset-button"
                onClick={() => {
                  const range =
                    presetRange(preset);

                  const next = {
                    ...filters,
                    from: range.from,
                    to: range.to,
                  };

                  setFilters(next);

                  load(next);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            type="date"
            value={filters.from}
            onChange={(e) =>
              setFilters({
                ...filters,
                from: e.target.value,
              })
            }
          />

          <input
            type="date"
            value={filters.to}
            onChange={(e) =>
              setFilters({
                ...filters,
                to: e.target.value,
              })
            }
          />

          <select
            value={filters.office}
            onChange={(e) =>
              setFilters({
                ...filters,
                office:
                  e.target.value,
              })
            }
          >
            <option value="">
              Todas las oficinas
            </option>

            {data.filters.offices.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              )
            )}
          </select>

          <select
            value={filters.product}
            onChange={(e) =>
              setFilters({
                ...filters,
                product:
                  e.target.value,
              })
            }
          >
            <option value="">
              Todos los productos
            </option>

            {data.filters.products.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              )
            )}
          </select>

          <select
            value={filters.channel}
            onChange={(e) =>
              setFilters({
                ...filters,
                channel:
                  e.target.value,
              })
            }
          >
            <option value="">
              Todos los canales
            </option>

            {data.filters.channels.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              )
            )}
          </select>

          <select
            value={filters.employee}
            onChange={(e) =>
              setFilters({
                ...filters,
                employee:
                  e.target.value,
              })
            }
          >
            <option value="">
              Todos los empleados
            </option>

            {data.filters.employees.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              )
            )}
          </select>

          <select
            value={filters.company}
            onChange={(e) =>
              setFilters({
                ...filters,
                company:
                  e.target.value,
              })
            }
          >
            <option value="">
              Todas las compañías
            </option>

            {data.filters.companies.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              )
            )}
          </select>

          <button
            className="primary-button"
            onClick={() => load()}
          >
            Aplicar filtros
          </button>

          {activeFilterChips.length > 0 && (
            <div className="filter-active">
              {activeFilterChips.map(
                ([key, value]) => (
                  <button
                    key={key}
                    className="filter-chip"
                    onClick={() =>
                      removeFilter(key)
                    }
                  >
                    {filterLabels[key](value)}

                    <X size={12} />
                  </button>
                )
              )}

              <button
                className="filter-chip clear"
                onClick={clearFilters}
              >
                Limpiar todo
              </button>
            </div>
          )}

          <p className="filter-hint">
            <SlidersHorizontal size={12} />
            Estos filtros afectan a todos los
            módulos del tablero.
          </p>
        </section>

        {tab === "pulso" && (
          <>
            <HelpZone
              help={MODULE_HELP.pulso}
              id="pulso"
              onAction={applyHelpAction}
            />
            <section className="kpi-grid">
              <Kpi
                title="Clientes históricos"
                value={number(
                  data.migration.clients
                )}
                subtitle="Base maestra actual"
                icon={
                  <Users size={20} />
                }
              />

              <Kpi
                title="Altas históricas"
                value={number(
                  data.historic.altas
                )}
                subtitle="Historia comercial"
                icon={
                  <UserRoundCheck
                    size={20}
                  />
                }
              />

              <Kpi
                title="Crecimiento histórico"
                value={`+${number(
                  data.historic.net
                )}`}
                subtitle="Altas menos anulaciones"
                icon={
                  <TrendingUp
                    size={20}
                  />
                }
                tone="success"
              />

              <Kpi
                title="Pólizas cargadas"
                value={number(
                  data.current
                    .loadedPolicies
                )}
                subtitle="Dato parcial de migración"
                icon={
                  <ShieldCheck
                    size={20}
                  />
                }
                tone="warning"
              />

              <Kpi
                title="Prima activa cargada"
                value={money(
                  data.current
                    .activePremium
                )}
                subtitle="No representa aún la cartera total"
                icon={
                  <CircleDollarSign
                    size={20}
                  />
                }
              />

              <Kpi
                title="Oportunidades detectadas"
                value={number(
                  totalOpportunity
                )}
                subtitle="Reactivación + venta cruzada"
                icon={
                  <Target size={20} />
                }
                tone="accent"
              />
            </section>

            <div className="two-columns">
              <Section
                title="¿Estamos creciendo?"
                subtitle="Altas, anulaciones y crecimiento neto histórico"
              >
                <div className="chart-large">
                  <ResponsiveContainer>
                    <ComposedChart
                      data={
                        data.monthly
                      }
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="month"
                        fontSize={11}
                      />

                      <YAxis
                        fontSize={11}
                      />

                      <Tooltip />

                      <Legend />

                      <Bar
                        dataKey="altas"
                        name="Altas"
                        fill="#20B486"
                        radius={[
                          6,
                          6,
                          0,
                          0,
                        ]}
                      />

                      <Bar
                        dataKey="anulaciones"
                        name="Anulaciones"
                        fill="#F06464"
                        radius={[
                          6,
                          6,
                          0,
                          0,
                        ]}
                      />

                      <Line
                        type="monotone"
                        dataKey="net"
                        name="Crecimiento neto"
                        stroke="#4169E1"
                        strokeWidth={3}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Section>

              <Section
                title="Cómo llegan y se atienden"
                subtitle="Distribución histórica por canal"
              >
                <div className="chart-large">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={
                          data.channels
                        }
                        dataKey="value"
                        nameKey="name"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                      >
                        {data.channels.map(
                          (
                            _,
                            index
                          ) => (
                            <Cell
                              key={
                                index
                              }
                              fill={[
                                "#4169E1",
                                "#20B486",
                                "#F5A524",
                                "#8257E5",
                                "#EF476F",
                                "#66C7F5",
                              ][
                                index %
                                  6
                              ]}
                            />
                          )
                        )}
                      </Pie>

                      <Tooltip />

                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            </div>

            <Section
              title="Lectura ejecutiva"
              subtitle="Las señales que requieren decisión"
            >
              <div className="action-grid">
                <div className="action-card danger">
                  <AlertTriangle />

                  <div>
                    <strong>
                      {number(
                        data.historic
                          .anulaciones
                      )}{" "}
                      anulaciones
                      históricas
                    </strong>

                    <span>
                      Equivalen al{" "}
                      {percent(
                        data.historic
                          .ratio
                      )}{" "}
                      de las altas. No
                      es churn todavía,
                      pero sí una señal
                      prioritaria.
                    </span>
                  </div>
                </div>

                <div className="action-card warning">
                  <Clock3 />

                  <div>
                    <strong>
                      {number(
                        data.current
                          .expires30
                      )}{" "}
                      pólizas cargadas
                      vencen pronto
                    </strong>

                    <span>
                      {number(
                        data.current
                          .expires7
                      )}{" "}
                      están dentro de
                      los próximos 7
                      días.
                    </span>
                  </div>
                </div>

                <div className="action-card success">
                  <Target />

                  <div>
                    <strong>
                      {number(
                        data.opportunity
                          .reactivationCandidates
                      )}{" "}
                      candidatos de
                      reactivación
                    </strong>

                    <span>
                      Clientes con
                      historia comercial
                      que todavía no
                      muestran póliza
                      activa cargada.
                    </span>
                  </div>
                </div>
              </div>
            </Section>
          </>
        )}

        {tab === "cartera" && (
          <>
            <HelpZone
              help={MODULE_HELP.cartera}
              id="cartera"
              onAction={applyHelpAction}
            />
            <div className="notice warning-notice">
              <AlertTriangle
                size={20}
              />

              <div>
                <strong>
                  Cartera todavía en
                  proceso de carga
                </strong>

                <p>
                  Estos indicadores
                  reflejan únicamente
                  las pólizas ya
                  migradas. No deben
                  interpretarse como la
                  cartera final de
                  Rafael Allende.
                </p>
              </div>
            </div>

            <section className="kpi-grid">
              <Kpi
                title="Pólizas cargadas"
                value={number(
                  data.current
                    .loadedPolicies
                )}
                subtitle="Avance actual"
                icon={
                  <BriefcaseBusiness />
                }
              />

              <Kpi
                title="Activas cargadas"
                value={number(
                  data.current
                    .activePolicies
                )}
                subtitle="Según estado actual"
                icon={
                  <ShieldCheck />
                }
              />

              <Kpi
                title="Clientes activos cargados"
                value={number(
                  data.current
                    .activeClients
                )}
                subtitle="Con al menos una póliza activa"
                icon={<Users />}
              />

              <Kpi
                title="Prima activa cargada"
                value={money(
                  data.current
                    .activePremium
                )}
                subtitle="Valor parcial"
                icon={
                  <CircleDollarSign />
                }
              />
            </section>

            <div className="two-columns">
              <Section
                title="Productos históricos"
                subtitle="Todo lo que realmente se gestionó en Rafael"
              >
                <div className="chart-large">
                  <ResponsiveContainer>
                    <BarChart
                      data={
                        data.historicProducts
                      }
                      layout="vertical"
                      margin={{
                        left: 50,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        horizontal={false}
                      />

                      <XAxis
                        type="number"
                      />

                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                      />

                      <Tooltip />

                      <Bar
                        dataKey="value"
                        fill="#4169E1"
                        radius={[
                          0,
                          7,
                          7,
                          0,
                        ]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Section>

              <Section
                title="Productos cargados actualmente"
                subtitle="Foto parcial de la nueva base"
              >
                <div className="chart-large">
                  <ResponsiveContainer>
                    <BarChart
                      data={
                        data.currentProducts
                      }
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="name"
                        fontSize={10}
                      />

                      <YAxis />

                      <Tooltip />

                      <Bar
                        dataKey="value"
                        fill="#20B486"
                        radius={[
                          7,
                          7,
                          0,
                          0,
                        ]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Section>
            </div>

            <Section
              title="Compañías"
              subtitle="Distribución de las pólizas ya cargadas"
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Compañía
                      </th>

                      <th>
                        Pólizas
                      </th>

                      <th>
                        Prima activa
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.companies.map(
                      (company) => (
                        <tr
                          key={
                            company.name
                          }
                        >
                          <td>
                            {
                              company.name
                            }
                          </td>

                          <td>
                            {number(
                              company.policies
                            )}
                          </td>

                          <td>
                            {money(
                              company.activePremium
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          </>
        )}

        {tab === "retencion" && (
          <>
            <HelpZone
              help={MODULE_HELP.retencion}
              id="retencion"
              onAction={applyHelpAction}
            />
            <section className="kpi-grid">
              <Kpi
                title="Vencen ≤7 días"
                value={number(
                  data.current.expires7
                )}
                subtitle="Acción inmediata"
                icon={<Clock3 />}
                tone="danger"
              />

              <Kpi
                title="Vencen ≤30 días"
                value={number(
                  data.current.expires30
                )}
                subtitle="Secuencia de renovación"
                icon={<Clock3 />}
                tone="warning"
              />

              <Kpi
                title="Clientes a observar"
                value={number(
                  data.opportunity
                    .retentionWatch
                )}
                subtitle="Activos con anulaciones históricas"
                icon={
                  <AlertTriangle />
                }
              />

              <Kpi
                title="Siniestros históricos"
                value={number(
                  data.historic
                    .siniestros
                )}
                subtitle="Clave para medir experiencia"
                icon={<Activity />}
              />
            </section>

            <Section
              title="Retención: de contar bajas a anticiparlas"
              subtitle="El sistema ya puede combinar historia y situación contractual actual"
            >
              <div className="strategy-box">
                <h3>
                  Próxima evolución
                </h3>

                <p>
                  Construir un score
                  de riesgo 0–100
                  combinando
                  antigüedad,
                  anulaciones,
                  siniestros,
                  cantidad de pólizas,
                  forma de pago,
                  cercanía al
                  vencimiento y
                  comportamiento de
                  atención.
                </p>
              </div>
            </Section>
          </>
        )}

        {tab === "reactivacion" && (
          <>
            <HelpZone
              help={MODULE_HELP.reactivacion}
              id="reactivacion"
              onAction={applyHelpAction}
            />
            <section className="kpi-grid">
              <Kpi
                title="Candidatos detectados"
                value={number(
                  data.opportunity
                    .reactivationCandidates
                )}
                subtitle="Historia de alta sin póliza activa cargada"
                icon={<Target />}
                tone="accent"
              />

              <Kpi
                title="Históricos sin activa cargada"
                value={number(
                  data.opportunity
                    .historicalWithoutCurrentPolicy
                )}
                subtitle="Universo potencial"
                icon={<Users />}
              />
            </section>

            <Section
              title="Motor de recuperación"
              subtitle="Priorizar clientes conocidos antes de comprar nuevos leads"
            >
              <div className="action-grid">
                <div className="action-card success">
                  <Target />

                  <div>
                    <strong>
                      Reactivación
                      prioritaria
                    </strong>

                    <span>
                      Exclientes
                      recientes, con
                      altas históricas
                      y productos
                      rentables.
                    </span>
                  </div>
                </div>

                <div className="action-card">
                  <Activity />

                  <div>
                    <strong>
                      Win-back por
                      producto
                    </strong>

                    <span>
                      Ejemplo: tuvo
                      Moto o Auto y hoy
                      no aparece con
                      ese producto
                      activo.
                    </span>
                  </div>
                </div>

                <div className="action-card">
                  <Users />

                  <div>
                    <strong>
                      Campañas
                      segmentadas
                    </strong>

                    <span>
                      No contactar a
                      toda la base:
                      trabajar por
                      score y
                      probabilidad.
                    </span>
                  </div>
                </div>
              </div>
            </Section>
          </>
        )}

        {tab === "cross" && (
          <>
            <HelpZone
              help={MODULE_HELP.cross}
              id="cross"
              onAction={applyHelpAction}
            />
            <section className="kpi-grid">
              <Kpi
                title="Una sola póliza"
                value={number(
                  data.current
                    .onePolicyClients
                )}
                subtitle="Oportunidad directa de cross-selling"
                icon={
                  <ArrowUpRight />
                }
              />

              <Kpi
                title="Dos o más pólizas"
                value={number(
                  data.current
                    .multiPolicyClients
                )}
                subtitle="Clientes más vinculados"
                icon={
                  <HeartHandshake />
                }
                tone="success"
              />
            </section>

            <Section
              title="Próximo mejor producto"
              subtitle="Oportunidades calculadas sobre lo actualmente cargado"
            >
              <div className="opportunity-list">
                {data.crossSell.map(
                  (item) => (
                    <div
                      className="opportunity-row"
                      key={
                        item.opportunity
                      }
                    >
                      <strong>
                        {
                          item.opportunity
                        }
                      </strong>

                      <div className="opportunity-value">
                        {number(
                          item.customers
                        )}{" "}
                        clientes
                      </div>
                    </div>
                  )
                )}
              </div>
            </Section>
          </>
        )}

        {tab === "clientes" && (
          <>
            <HelpZone
              help={MODULE_HELP.clientes}
              id="clientes"
              onAction={applyHelpAction}
            />
            <Section
              title="Cliente 360°"
              subtitle="Buscar por nombre, DNI o teléfono"
            >
              <div className="customer-search">
                <Search size={20} />

                <input
                  value={
                    filters.search
                  }
                  placeholder="Ej. Juan Pérez, DNI o teléfono"
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      search:
                        e.target.value,
                    })
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter"
                    ) {
                      load();
                    }
                  }}
                />

                <button
                  className="primary-button"
                  onClick={() => load()}
                >
                  Buscar cliente
                </button>
              </div>
            </Section>

            <div
              className="engine-switch"
              role="group"
              aria-label="Motor de sugerencias"
            >
              <span className="engine-switch-label">
                Motor de sugerencias
              </span>

              <button
                className={`engine-option${
                  engine === "algoritmo" ? " active" : ""
                }`}
                onClick={() => chooseEngine("algoritmo")}
                title="Solo reglas del sistema: instantáneo y auditable"
              >
                Algoritmo solo
              </button>

              <button
                className={`engine-option${
                  engine === "dual" ? " active" : ""
                }`}
                onClick={() => chooseEngine("dual")}
                title="El sistema prioriza con reglas y la IA enriquece el análisis"
              >
                Dual (IA + algoritmo)
              </button>

              <button
                className={`engine-option${
                  engine === "ia" ? " active" : ""
                }`}
                onClick={() => chooseEngine("ia")}
                title="La IA analiza el contexto real y decide la mejor acción"
              >
                Solo IA
              </button>

              <span className="engine-hint">
                {engine === "algoritmo" &&
                  "Reglas del sistema: instantáneo, gratis y auditable."}
                {engine === "dual" &&
                  "El sistema prioriza con reglas y la IA enriquece el por qué y los pasos con el mismo contexto."}
                {engine === "ia" &&
                  "La IA analiza el contexto real del cliente y propone la mejor acción."}
              </span>
            </div>

            <div className="customer-grid">
              {data.customers.map(
                (customer) => (
                  <article
                    className="customer-card"
                    key={customer.id}
                  >
                    <div className="customer-head">
                      <div>
                        <h3>
                          {
                            customer.name
                          }
                        </h3>

                        <span>
                          DNI{" "}
                          {customer.dni ||
                            "—"}
                        </span>
                      </div>

                      <div className="score">
                        {
                          customer.score
                        }
                      </div>
                    </div>

                    <div className="customer-metrics">
                      <div>
                        <span>
                          Pólizas
                          activas
                        </span>

                        <strong>
                          {
                            customer.activePolicies
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Gestiones
                          históricas
                        </span>

                        <strong>
                          {
                            customer.historicalOperations
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Altas
                        </span>

                        <strong>
                          {
                            customer.historicalAltas
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Anulaciones
                        </span>

                        <strong>
                          {
                            customer.historicalAnulaciones
                          }
                        </strong>
                      </div>
                    </div>

                    <div className="customer-recommendation">
                      {engine !== "ia" && (
                        <>
                          <span>
                            Próxima mejor
                            acción
                          </span>

                          <strong>
                            {
                              customer.recommendation
                            }
                          </strong>

                          {customer.recommendationWhy && (
                            <p className="reco-why">
                              {
                                customer.recommendationWhy
                              }
                            </p>
                          )}

                          {customer
                            .recommendationSteps
                            ?.length > 0 && (
                            <ul className="reco-steps">
                              {customer.recommendationSteps.map(
                                (step) => (
                                  <li key={step}>
                                    {step}
                                  </li>
                                )
                              )}
                            </ul>
                          )}
                        </>
                      )}

                      {engine !== "algoritmo" &&
                        (() => {
                          const withAi =
                            engine === "ia"
                              ? ("ia" as const)
                              : ("dual" as const);

                          const insightKey = `${withAi}:${customer.id}`;

                          const insightState =
                            insights[insightKey];

                          const insight =
                            insightState?.status === "done"
                              ? insightState.data
                              : undefined;

                          return (
                            <div
                              className={`ia-block${
                                engine === "ia"
                                  ? " primary"
                                  : ""
                              }`}
                            >
                              <span className="ia-badge">
                                <Sparkles size={12} />
                                {engine === "ia"
                                  ? "Análisis con IA"
                                  : "Análisis IA (extra)"}
                              </span>

                              {insightState?.status ===
                                "loading" && (
                                <div className="ia-loading">
                                  Generando análisis
                                  con la IA…
                                </div>
                              )}

                              {!insightState && (
                                <button
                                  className="ia-button"
                                  onClick={() =>
                                    requestInsight(
                                      customer,
                                      withAi
                                    )
                                  }
                                >
                                  <Sparkles size={13} />
                                  Generar análisis
                                  con IA
                                </button>
                              )}

                              {insightState?.status ===
                                "error" && (
                                <div className="ia-error">
                                  <span>
                                    {
                                      insightState.error
                                    }
                                  </span>

                                  <button
                                    className="ia-button"
                                    onClick={() =>
                                      requestInsight(
                                        customer,
                                        withAi
                                      )
                                    }
                                  >
                                    Reintentar
                                  </button>
                                </div>
                              )}

                              {insight && (
                                <>
                                  <strong className="ia-accion">
                                    {insight.accion}
                                  </strong>

                                  <p className="ia-why">
                                    {insight.porQue}
                                  </p>

                                  <ul className="reco-steps">
                                    {insight.pasos.map(
                                      (paso) => (
                                        <li key={paso}>
                                          {paso}
                                        </li>
                                      )
                                    )}
                                  </ul>

                                  <div className="ia-message">
                                    <p>
                                      {
                                        insight.mensajeWhatsapp
                                      }
                                    </p>

                                    <button
                                      className="ia-copy"
                                      onClick={() => {
                                        if (insight) {
                                          copyInsightMessage(
                                            insightKey,
                                            insight.mensajeWhatsapp
                                          );
                                        }
                                      }}
                                    >
                                      {copiedInsight ===
                                      insightKey
                                        ? "Copiado ✓"
                                        : "Copiar mensaje"}
                                    </button>
                                  </div>

                                  <span className="ia-meta">
                                    Generado con{" "}
                                    {insight.model} · solo
                                    sobre los datos del
                                    sistema
                                  </span>
                                </>
                              )}
                            </div>
                          );
                        })()}
                    </div>

                    {customer.backendUrl && (
                      <a
                        className="reco-link"
                        href={customer.backendUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir la ficha de este cliente en el backoffice"
                      >
                        Abrir ficha en el
                        backoffice
                        <ArrowUpRight size={13} />
                      </a>
                    )}
                  </article>
                )
              )}
            </div>

            {data.customers.length === 0 && (
              <div className="empty-state">
                Sin resultados. Probá con
                otro nombre, DNI o teléfono.
              </div>
            )}
          </>
        )}

        {tab === "migracion" && (
          <>
            <HelpZone
              help={MODULE_HELP.migracion}
              id="migracion"
              onAction={applyHelpAction}
            />
            <section className="kpi-grid">
              <Kpi
                title="Clientes"
                value={number(
                  data.migration.clients
                )}
                subtitle="Maestro Agentico"
                icon={<Users />}
              />

              <Kpi
                title="Gestiones históricas"
                value={number(
                  data.migration
                    .historicOperations
                )}
                subtitle="Base Rafael"
                icon={<Database />}
              />

              <Kpi
                title="Clientes macheados"
                value={number(
                  data.migration
                    .matchedClients
                )}
                subtitle={percent(
                  data.migration
                    .clientMatchRate
                )}
                icon={
                  <UserRoundCheck />
                }
                tone="success"
              />

              <Kpi
                title="Gestiones macheadas"
                value={number(
                  data.migration
                    .matchedOperations
                )}
                subtitle={percent(
                  data.migration
                    .operationMatchRate
                )}
                icon={
                  <ShieldCheck />
                }
                tone="success"
              />
            </section>

            <Section
              title="Salud de la migración"
              subtitle="Lo que todavía debemos completar antes de considerar la cartera definitiva"
            >
              <div className="quality-grid">
                <div>
                  <span>
                    Pólizas cargadas
                  </span>

                  <strong>
                    {number(
                      data.migration
                        .loadedPolicies
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Sin cliente
                  </span>

                  <strong>
                    {number(
                      data.migration
                        .policiesWithoutClient
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Sin producto
                  </span>

                  <strong>
                    {number(
                      data.migration
                        .policiesWithoutProduct
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Sin compañía
                  </span>

                  <strong>
                    {number(
                      data.migration
                        .policiesWithoutCompany
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Sin vencimiento
                  </span>

                  <strong>
                    {number(
                      data.migration
                        .policiesWithoutExpiry
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Gestiones sin match
                  </span>

                  <strong>
                    {number(
                      data.migration
                        .unmatchedOperations
                    )}
                  </strong>
                </div>
              </div>
            </Section>
          </>
        )}

        {tab === "crm" && (
          <>
            <HelpZone
              help={MODULE_HELP.crm}
              id="crm"
              onAction={applyHelpAction}
            />
            {!data.crm.available ? (
              <Section
                title="CRM · Venta y gestión"
                subtitle="Datos del CRM Vocero (solo lectura)"
              >
                <div className="empty-state">
                  Todavía no hay snapshot del CRM en este
                  entorno. Ejecutá{" "}
                  <span className="mono">
                    npm run sync-crm
                  </span>{" "}
                  para generarlo y volvé a cargar el tablero.
                </div>
              </Section>
            ) : (
              <>
                <section className="kpi-grid">
                  <Kpi
                    title="Contactos del CRM"
                    value={number(
                      data.crm.kpis.contacts
                    )}
                    subtitle={`${number(
                      data.crm.kpis.conversations
                    )} conversaciones · ${number(
                      data.crm.kpis.openConversations
                    )} ${
                      data.crm.kpis
                        .openConversations === 1
                        ? "abierta"
                        : "abiertas"
                    }`}
                    icon={<Users />}
                  />

                  <Kpi
                    title="Mensajes intercambiados"
                    value={number(
                      data.crm.kpis.messages
                    )}
                    subtitle={`${number(
                      data.crm.kpis.inbound
                    )} recibidos · ${number(
                      data.crm.kpis.outbound
                    )} enviados`}
                    icon={<MessageSquareText />}
                    tone="accent"
                  />

                  <Kpi
                    title="Respuestas con IA"
                    value={number(
                      data.crm.kpis.ai
                    )}
                    subtitle="Mensajes generados por el agente"
                    icon={<ShieldCheck />}
                    tone="success"
                  />

                  <Kpi
                    title="Oportunidades abiertas"
                    value={number(
                      data.crm.kpis.leads
                    )}
                    subtitle={`${number(
                      data.crm.kpis.converted
                    )} ganadas (${percent(
                      data.crm.kpis.conversionRate
                    )})`}
                    icon={<Target />}
                  />

                  <Kpi
                    title="Monto en pipeline"
                    value={money(
                      data.crm.kpis.pipelineAmount
                    )}
                    subtitle="Suma de las oportunidades cargadas"
                    icon={<CircleDollarSign />}
                    tone="warning"
                  />

                  <Kpi
                    title="Vínculo con la cartera"
                    value={percent(
                      data.crm.kpis.matchRate
                    )}
                    subtitle={`${number(
                      data.crm.kpis.matchedContacts
                    )} de ${number(
                      data.crm.kpis.contacts
                    )} contactos cruzados con SGSA`}
                    icon={<HeartHandshake />}
                  />

                  <Kpi
                    title="Prima activa vinculada"
                    value={money(
                      data.crm.kpis.matchedPremium
                    )}
                    subtitle={`Pólizas activas de contactos del CRM · ${number(
                      data.crm.kpis.expiring30
                    )} vencen ≤ 30 días`}
                    icon={<BriefcaseBusiness />}
                    tone="success"
                  />

                  <Kpi
                    title="Oportunidades ligadas"
                    value={number(
                      data.crm.kpis.leadsLinked
                    )}
                    subtitle={`${money(
                      data.crm.kpis.linkedAmount
                    )} en juego sobre clientes de la cartera`}
                    icon={<Activity />}
                  />
                </section>

                <Section
                  title="Venta — pipeline desde el CRM"
                  subtitle="Cómo avanza cada oportunidad según la etapa del tablero comercial"
                >
                  <div className="stage-list">
                    {data.crm.pipeline.map(
                      (stage) => {
                        const max = Math.max(
                          ...data.crm.pipeline.map(
                            (item) => item.amount
                          ),
                          1
                        );

                        const width = Math.max(
                          (stage.amount / max) * 100,
                          stage.amount > 0 ? 3 : 0
                        );

                        return (
                          <div
                            className="stage-row"
                            key={stage.name}
                          >
                            <div className="stage-name">
                              {stage.name}

                              <small>
                                {stage.kind === "won"
                                  ? "ganada"
                                  : stage.kind === "lost"
                                    ? "perdida"
                                    : "en curso"}
                              </small>
                            </div>

                            <div className="stage-track">
                              <div
                                className="stage-fill"
                                style={{
                                  width: `${width}%`,
                                }}
                              />
                            </div>

                            <div className="stage-value">
                              <strong>
                                {money(stage.amount)}
                              </strong>

                              {" · "}

                              {number(stage.leads)}{" "}
                              {stage.leads === 1
                                ? "oportunidad"
                                : "oportunidades"}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </Section>

                <div className="two-columns">
                  <Section
                    title="Gestión — mensajes por día"
                    subtitle="Recibidos y enviados (últimos 30 días con actividad)"
                  >
                    <div className="chart-large">
                      <ResponsiveContainer>
                        <AreaChart
                          data={data.crm.daily}
                        >
                          <CartesianGrid strokeDasharray="3 3" />

                          <XAxis
                            dataKey="day"
                            tick={{ fontSize: 10 }}
                            tickFormatter={(
                              value
                            ) =>
                              String(value)
                                .slice(5)
                                .replace("-", "/")
                            }
                          />

                          <YAxis
                            tick={{ fontSize: 10 }}
                            width={34}
                          />

                          <Tooltip />

                          <Area
                            type="monotone"
                            dataKey="inbound"
                            name="Recibidos"
                            stroke="var(--primary)"
                            fill="var(--primary)"
                            fillOpacity={0.15}
                            strokeWidth={2}
                          />

                          <Area
                            type="monotone"
                            dataKey="outbound"
                            name="Enviados"
                            stroke="#00c6f5"
                            fill="#00c6f5"
                            fillOpacity={0.12}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Section>

                  <Section
                    title="Canales y equipo"
                    subtitle="Conversaciones según canal de entrada"
                  >
                    <div className="quality-grid">
                      {data.crm.channels.map(
                        (channel) => (
                          <div
                            key={channel.name}
                          >
                            <span>
                              {channel.name}
                            </span>

                            <strong>
                              {number(
                                channel.value
                              )}
                            </strong>
                          </div>
                        )
                      )}
                    </div>

                    <div className="crm-note">
                      <Users size={15} />

                      <span>
                        <strong>
                          {number(
                            data.crm.kpis.users
                          )}{" "}
                          usuarios
                        </strong>{" "}
                        en el CRM ·{" "}
                        {number(
                          data.crm.kpis.closedConversations
                        )}{" "}
                        {data.crm.kpis
                          .closedConversations === 1
                          ? "conversación cerrada"
                          : "conversaciones cerradas"}
                      </span>
                    </div>
                  </Section>
                </div>

                <Section
                  title="Macheo con la cartera (CRM ↔ SGSA)"
                  subtitle="Contactos del CRM cruzados contra clientes, pólizas activas y gestiones históricas"
                >
                  <div className="quality-grid">
                    <div>
                      <span>
                        Contactos macheados
                      </span>

                      <strong>
                        {number(
                          data.crm.kpis.matchedContacts
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Tasa de match</span>

                      <strong>
                        {percent(
                          data.crm.kpis.matchRate
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Con póliza activa
                      </span>

                      <strong>
                        {number(
                          data.crm.kpis
                            .matchedWithActive
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Prima activa vinculada
                      </span>

                      <strong>
                        {money(
                          data.crm.kpis
                            .matchedPremium
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Vencen ≤ 30 días
                      </span>

                      <strong>
                        {number(
                          data.crm.kpis.expiring30
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Oportunidades ligadas
                      </span>

                      <strong>
                        {number(
                          data.crm.kpis.leadsLinked
                        )}{" "}
                        ·{" "}
                        {money(
                          data.crm.kpis.linkedAmount
                        )}
                      </strong>
                    </div>
                  </div>

                  <div
                    className="table-wrap"
                    style={{ marginTop: 16 }}
                  >
                    <table>
                      <thead>
                        <tr>
                          <th>Contacto</th>
                          <th>Canal</th>
                          <th>Mensajes</th>
                          <th>Vínculo</th>
                          <th>Pólizas activas</th>
                          <th>Prima activa</th>
                          <th>Vence ≤ 30d</th>
                        </tr>
                      </thead>

                      <tbody>
                        {data.crm.rows
                          .slice(0, 12)
                          .map((row) => (
                            <tr key={row.contactId}>
                              <td>
                                <strong>
                                  {row.name}
                                </strong>
                              </td>

                              <td>
                                {row.channel || "—"}
                              </td>

                              <td>
                                {number(
                                  row.messages
                                )}
                              </td>

                              <td>
                                {row.link ===
                                "sin-match" ? (
                                  <Badge>
                                    Sin vínculo
                                  </Badge>
                                ) : (
                                  <>
                                    <Badge
                                      tone={
                                        row.link ===
                                        "sgsa"
                                          ? "success"
                                          : "accent"
                                      }
                                    >
                                      {row.link ===
                                      "sgsa"
                                        ? "Vínculo directo"
                                        : row.link ===
                                            "telefono"
                                          ? "Por teléfono"
                                          : "Por nombre"}
                                    </Badge>

                                    {row.clientName && (
                                      <div className="mono">
                                        {
                                          row.clientName
                                        }
                                      </div>
                                    )}
                                  </>
                                )}
                              </td>

                              <td>
                                {number(
                                  row.activePolicies
                                )}
                              </td>

                              <td>
                                {row.activePremium >
                                0
                                  ? money(
                                      row.activePremium
                                    )
                                  : "—"}
                              </td>

                              <td>
                                {row.expiring30 > 0
                                  ? number(
                                      row.expiring30
                                    )
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="crm-note">
                    <RefreshCcw size={15} />

                    <span>
                      Snapshot de solo lectura del CRM
                      al{" "}
                      <strong>
                        {new Date(
                          data.crm.generatedAt ||
                            data.generatedAt
                        ).toLocaleString("es-AR")}
                      </strong>{" "}
                      · sin registros de prueba · se
                      regenera con{" "}
                      <span className="mono">
                        npm run sync-crm
                      </span>
                    </span>
                  </div>
                </Section>
              </>
            )}
          </>
        )}

        <footer>
          <span>
            Rafael Allende ·
            Inteligencia de Cartera
          </span>

          <span>
            Actualizado{" "}
            {new Date(
              data.generatedAt
            ).toLocaleString(
              "es-AR"
            )}
          </span>
        </footer>
      </div>
    </main>
  );
}
