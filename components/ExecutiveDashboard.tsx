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
  CircleDollarSign,
  Clock3,
  Database,
  HeartHandshake,
  MessageSquareText,
  RefreshCcw,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRoundCheck,
  Users,
} from "lucide-react";

import type {
  DashboardResponse,
} from "@/lib/types";

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

  async function load() {
    setLoading(true);
    setError("");

    try {
      const query =
        new URLSearchParams();

      Object.entries(filters).forEach(
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

        <button onClick={load}>
          Reintentar
        </button>
      </main>
    );
  }

  if (!data) return null;

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
              onClick={load}
            >
              <RefreshCcw size={16} />

              Actualizar
            </button>
          </div>
        </header>

        <section className="filter-panel">
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
            onClick={load}
          >
            Aplicar filtros
          </button>
        </section>

        {tab === "pulso" && (
          <>
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
                  onClick={load}
                >
                  Buscar cliente
                </button>
              </div>
            </Section>

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
                      <span>
                        Próxima mejor
                        acción
                      </span>

                      <strong>
                        {
                          customer.recommendation
                        }
                      </strong>
                    </div>
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
                    )} abiertas`}
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
                        conversaciones cerradas
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
