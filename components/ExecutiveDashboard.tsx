"use client";

import {
  useEffect,
  useMemo,
  useRef,
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
  ListTree,
} from "lucide-react";

import type {
  DrillList,
} from "@/lib/types";

import { MODULE_AI_IDS } from "@/lib/types";

import type {
  ClientInsight,
  DashboardResponse,
  InsightMode,
  ModuleAiId,
  ModuleInsight,
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
  onClick,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone?: string;
  onClick?: () => void;
}) {
  return (
    <article
      className={`kpi-card ${tone}${
        onClick ? " clickable" : ""
      }`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      title={
        onClick
          ? "Ver la lista de registros detrás de este número"
          : undefined
      }
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

      {onClick && (
        <span className="kpi-more">
          Ver lista →
        </span>
      )}
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
  onOpenList,
}: {
  data: DashboardResponse;
  onGoto: (tab: Tab) => void;
  onOpenList: (tab: Tab, listId: string) => void;
}) {
  const items: {
    text: string;
    tab: Tab;
    list?: string;
  }[] = [];

  if (data.current.expires7 > 0) {
    items.push({
      text: `${number(
        data.current.expires7
      )} pólizas vencen en ≤7 días — hablá hoy`,
      tab: "retencion",
      list: "expires7",
    });
  } else if (data.current.expires30 > 0) {
    items.push({
      text: `${number(
        data.current.expires30
      )} pólizas vencen este mes — prepará la ronda`,
      tab: "retencion",
      list: "expires30",
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
      list: "candidates",
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
      list: topCross.opportunity
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
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
            onClick={() =>
              item.list
                ? onOpenList(item.tab, item.list)
                : onGoto(item.tab)
            }
          >
            {item.text}
          </button>
        ))}
      </div>
    </section>
  );
}

/*
 * Listas dinamicas: el "por dentro" de cada numero del modulo.
 * Muestra los registros reales detras de cada metrica (clientes,
 * polizas, gestiones) con su link a la ficha en el backoffice,
 * y permite filtrarlos al vuelo.
 */
function ModuleLists({
  module,
  lists,
  open,
  active,
  onToggle,
  onSelect,
  onClose,
}: {
  module: string;
  lists: DrillList[];
  open: boolean;
  active: string;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const current =
    lists.find((list) => list.id === active) ||
    lists[0];

  if (lists.length === 0 || !current) {
    return null;
  }

  const normalized = query.trim().toLowerCase();

  const visible = normalized
    ? current.items.filter((item) =>
        [
          item.name,
          item.dni,
          item.detail,
          item.extra,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      )
    : current.items;

  const totalRecords = lists.reduce(
    (sum, list) => sum + list.total,
    0
  );

  return (
    <div
      className="mod-lists"
      id={`lists-${module}`}
    >
      <button
        type="button"
        className="mod-lists-toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        <ListTree size={15} />

        <span className="mod-lists-label">
          {open
            ? "Cerrar listas"
            : "Listas del módulo"}
        </span>

        <span className="mod-lists-count">
          {number(totalRecords)} registros
        </span>

        <ChevronDown
          size={15}
          className={
            open
              ? "mod-lists-chevron open"
              : "mod-lists-chevron"
          }
        />
      </button>

      {open && (
        <div className="mod-lists-body">
          <div className="mod-lists-tabs">
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                className={`mod-list-tab${
                  list.id === current.id
                    ? " active"
                    : ""
                }`}
                onClick={() => onSelect(list.id)}
              >
                {list.title}

                <b>{number(list.total)}</b>
              </button>
            ))}
          </div>

          <div className="mod-lists-tools">
            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Filtrar (nombre, DNI, póliza…)"
            />

            <span className="mod-lists-print">
              {normalized
                ? `${visible.length} de ${current.items.length}`
                : current.total > current.shown
                  ? `Últimas ${current.shown} de ${number(
                      current.total
                    )}`
                  : `${number(current.total)} registro${
                      current.total === 1 ? "" : "s"
                    }`}
            </span>

            <button
              type="button"
              className="mod-lists-close"
              onClick={onClose}
              title="Cerrar y volver a donde estabas"
            >
              <X size={14} />
              Cerrar
            </button>
          </div>

          <div className="mod-lists-table">
            {visible.map((item, index) => (
              <div
                className="mod-list-row"
                key={`${item.name}-${index}`}
              >
                <div className="mod-list-main">
                  <strong>{item.name}</strong>

                  {item.dni && (
                    <span className="mod-list-dni">
                      DNI {item.dni}
                    </span>
                  )}
                </div>

                <div className="mod-list-detail">
                  <span>{item.detail}</span>

                  <span className="mod-list-extra">
                    {item.extra}
                  </span>
                </div>

                <div className="mod-list-links">
                  {item.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mod-list-link"
                    >
                      {link.label}

                      <ArrowUpRight size={12} />
                    </a>
                  ))}
                </div>
              </div>
            ))}

            {visible.length === 0 && (
              <div className="mod-list-empty">
                Sin resultados para el filtro.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const MODULE_AI_TITLES: Record<ModuleAiId, string> = {
  pulso: "Pulso del negocio",
  cartera: "Cartera",
  retencion: "Retención",
  reactivacion: "Reactivación",
  cross: "Venta cruzada",
  migracion: "Calidad y avance de la migración",
  crm: "CRM · Venta y gestión",
};

/*
 * Fila de IA de un módulo: selector de motor (algoritmo / dual / solo IA)
 * + panel de análisis. En "solo IA" el análisis se genera automáticamente;
 * en "dual" se genera cuando el usuario lo pide.
 */
function ModuleAiRow({
  id,
  engine,
  onEngine,
  state,
  onGenerate,
  onCopy,
  copied,
}: {
  id: ModuleAiId;
  engine: InsightMode;
  onEngine: (mode: InsightMode) => void;
  state?: {
    status: "loading" | "error" | "done";
    data?: ModuleInsight;
    error?: string;
  };
  onGenerate: () => void;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const label = MODULE_AI_TITLES[id];

  const insight =
    state?.status === "done" ? state.data : undefined;

  useEffect(() => {
    if (engine === "ia" && !state) {
      onGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  return (
    <div className="module-ai">
      <div
        className="engine-switch"
        role="group"
        aria-label={`Motor de sugerencias · ${label}`}
      >
        <span className="engine-switch-label">
          Motor
        </span>

        <button
          className={`engine-option${
            engine === "algoritmo" ? " active" : ""
          }`}
          onClick={() => onEngine("algoritmo")}
          title="Solo los datos y reglas del sistema, sin IA"
        >
          Algoritmo solo
        </button>

        <button
          className={`engine-option${
            engine === "dual" ? " active" : ""
          }`}
          onClick={() => onEngine("dual")}
          title="Los datos del módulo + la lectura de la IA cuando la pidas"
        >
          Dual (IA + datos)
        </button>

        <button
          className={`engine-option${
            engine === "ia" ? " active" : ""
          }`}
          onClick={() => onEngine("ia")}
          title="La IA lee los datos reales del módulo y arma el resumen y las acciones; se genera sola"
        >
          Solo IA
        </button>

        <span className="engine-hint">
          {engine === "algoritmo" &&
            "Sin IA: solo los datos y las reglas del sistema."}
          {engine === "dual" &&
            "Los datos del módulo + la lectura de la IA (la generás cuando quieras)."}
          {engine === "ia" &&
            "La IA lee los datos reales de este módulo y arma el resumen y las acciones; se genera sola."}
        </span>
      </div>

      {engine !== "algoritmo" && (
        <div
          className={`ia-block${
            engine === "ia" ? " primary" : ""
          }`}
        >
          <span className="ia-badge">
            <Sparkles size={12} />
            {engine === "ia"
              ? `Análisis con IA · ${label}`
              : `Análisis IA (extra) · ${label}`}
          </span>

          {state?.status === "loading" && (
            <div className="ia-loading">
              Generando análisis con la IA…
            </div>
          )}

          {!state && (
            <button
              className="ia-button"
              onClick={onGenerate}
            >
              <Sparkles size={13} />
              Generar análisis con IA
            </button>
          )}

          {state?.status === "error" && (
            <div className="ia-error">
              <span>{state.error}</span>

              <button
                className="ia-button"
                onClick={onGenerate}
              >
                Reintentar
              </button>
            </div>
          )}

          {insight && (
            <>
              <p className="ia-why">
                {insight.resumen}
              </p>

              {insight.focos.length > 0 && (
                <>
                  <span className="ia-subhead">
                    Qué mirar
                  </span>

                  <ul className="reco-steps">
                    {insight.focos.map((foco) => (
                      <li key={foco}>{foco}</li>
                    ))}
                  </ul>
                </>
              )}

              {insight.acciones.length > 0 && (
                <>
                  <span className="ia-subhead">
                    Qué hacer
                  </span>

                  <ul className="reco-steps">
                    {insight.acciones.map(
                      (accion) => (
                        <li key={accion}>
                          {accion}
                        </li>
                      )
                    )}
                  </ul>
                </>
              )}

              {insight.mensaje && (
                <div className="ia-message">
                  <p>{insight.mensaje}</p>

                  <button
                    className="ia-copy"
                    onClick={() =>
                      onCopy(insight.mensaje)
                    }
                  >
                    {copied
                      ? "Copiado ✓"
                      : "Copiar mensaje"}
                  </button>
                </div>
              )}

              <span className="ia-meta">
                Generado con {insight.model} · solo
                sobre los datos del sistema
              </span>
            </>
          )}
        </div>
      )}
    </div>
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

  // Timer para la auto-busqueda del Cliente 360°.
  const searchTimer =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

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

  /*
   * IA de módulos (Pulso, Cartera, Retención, Reactivación, Venta cruzada,
   * Migración y CRM): mismo patrón que el Cliente 360° — motor elegible
   * (algoritmo solo / dual / solo IA) y análisis server-side con DeepSeek.
   */
  const [modEngines, setModEngines] = useState<
    Partial<Record<ModuleAiId, InsightMode>>
  >({});

  const [modInsights, setModInsights] = useState<
    Record<
      string,
      {
        status: "loading" | "error" | "done";
        data?: ModuleInsight;
        error?: string;
      }
    >
  >({});

  const [copiedMod, setCopiedMod] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved: Partial<
        Record<ModuleAiId, InsightMode>
      > = {};

      MODULE_AI_IDS.forEach((module) => {
        const value = localStorage.getItem(
          `r360-engine-${module}`
        );

        if (
          value === "algoritmo" ||
          value === "dual" ||
          value === "ia"
        ) {
          saved[module] = value;
        }
      });

      if (Object.keys(saved).length > 0) {
        setModEngines((prev) => ({
          ...saved,
          ...prev,
        }));
      }
    } catch {}
  }, []);

  function chooseModEngine(
    module: ModuleAiId,
    mode: InsightMode
  ) {
    setModEngines((prev) => ({
      ...prev,
      [module]: mode,
    }));

    try {
      localStorage.setItem(
        `r360-engine-${module}`,
        mode
      );
    } catch {}
  }

  function moduleContext(
    module: ModuleAiId
  ): Record<string, unknown> {
    if (!data) {
      return {};
    }

    switch (module) {
      case "pulso":
        return {
          "Pólizas activas":
            data.current.activePolicies,
          "Prima activa ARS":
            data.current.activePremium,
          "Clientes con póliza activa":
            data.current.activeClients,
          "Vencen ≤7 días": data.current.expires7,
          "Vencen ≤30 días":
            data.current.expires30,
          "Altas históricas": data.historic.altas,
          "Anulaciones históricas":
            data.historic.anulaciones,
          "Crecimiento neto": data.historic.net,
          "Siniestros históricos":
            data.historic.siniestros,
          Cotizaciones: data.historic.cotizaciones,
          "Evolución mensual (últimos 6 meses)":
            data.monthly.slice(-6).map(
              (row) =>
                `${row.month}: altas ${row.altas}, anulaciones ${row.anulaciones}, neto ${row.net}, siniestros ${row.siniestros}`
            ),
        };

      case "cartera":
        return {
          "Pólizas cargadas":
            data.current.loadedPolicies,
          "Pólizas activas":
            data.current.activePolicies,
          "Prima activa ARS":
            data.current.activePremium,
          "Clientes con 1 póliza":
            data.current.onePolicyClients,
          "Clientes con 2 o más":
            data.current.multiPolicyClients,
          "Productos con más pólizas activas":
            data.currentProducts
              .slice(0, 6)
              .map(
                (row) =>
                  `${row.name}: ${row.value}`
              ),
          "Compañías (pólizas y prima activa)":
            data.companies
              .slice(0, 6)
              .map(
                (row) =>
                  `${row.name}: ${row.policies} pólizas, prima activa $${row.activePremium}`
              ),
          "Oficinas (altas / anulaciones / neto)":
            data.offices
              .slice(0, 6)
              .map(
                (row) =>
                  `${row.name}: ${row.altas} / ${row.anulaciones} / ${row.net}`
              ),
        };

      case "retencion":
        return {
          "Vencen ≤7 días": data.current.expires7,
          "Vencen ≤30 días":
            data.current.expires30,
          "Pólizas activas":
            data.current.activePolicies,
          "Clientes a observar (activos con anulaciones históricas)":
            data.opportunity.retentionWatch,
          "Siniestros históricos":
            data.historic.siniestros,
          "Anulaciones históricas":
            data.historic.anulaciones,
        };

      case "reactivacion":
        return {
          "Candidatos (histórico sin póliza activa)":
            data.opportunity
              .reactivationCandidates,
          "Universo potencial (histórico sin póliza cargada)":
            data.opportunity
              .historicalWithoutCurrentPolicy,
          "Altas históricas": data.historic.altas,
          "Anulaciones históricas":
            data.historic.anulaciones,
          "Siniestros históricos":
            data.historic.siniestros,
        };

      case "cross":
        return {
          "Clientes con 1 sola póliza activa":
            data.opportunity.activeWithOnePolicy,
          "Pólizas activas":
            data.current.activePolicies,
          "Oportunidades detectadas (clientes por combinación)":
            data.crossSell
              .slice(0, 8)
              .map(
                (row) =>
                  `${row.opportunity}: ${row.customers} clientes`
              ),
        };

      case "migracion":
        return {
          "Clientes en el sistema":
            data.migration.clients,
          "Gestiones históricas":
            data.migration.historicOperations,
          "Clientes vinculados":
            data.migration.matchedClients,
          "Gestiones vinculadas":
            data.migration.matchedOperations,
          "Tasa de vínculo de clientes %":
            data.migration.clientMatchRate,
          "Tasa de vínculo de gestiones %":
            data.migration.operationMatchRate,
          "Gestiones sin vincular":
            data.migration.unmatchedOperations,
          "Pólizas cargadas":
            data.migration.loadedPolicies,
          "Pólizas sin cliente":
            data.migration.policiesWithoutClient,
          "Pólizas sin producto":
            data.migration.policiesWithoutProduct,
          "Pólizas sin compañía":
            data.migration.policiesWithoutCompany,
          "Pólizas sin vencimiento":
            data.migration.policiesWithoutExpiry,
        };

      case "crm":
        return {
          Nota: data.crm?.available
            ? "Snapshot real del CRM Vocero"
            : "Snapshot del CRM no disponible",
          Contactos: data.crm?.kpis?.contacts,
          Conversaciones:
            data.crm?.kpis?.conversations,
          "Conversaciones abiertas":
            data.crm?.kpis?.openConversations,
          Mensajes: data.crm?.kpis?.messages,
          "Mensajes de la IA":
            data.crm?.kpis?.ai,
          Leads: data.crm?.kpis?.leads,
          Convertidos: data.crm?.kpis?.converted,
          "Tasa de conversión %":
            data.crm?.kpis?.conversionRate,
          "Monto de pipeline ARS":
            data.crm?.kpis?.pipelineAmount,
          "Contactos vinculados a cartera":
            data.crm?.kpis?.matchedContacts,
          "Tasa de vínculo %":
            data.crm?.kpis?.matchRate,
          "Prima vinculada ARS":
            data.crm?.kpis?.matchedPremium,
          "Etapas del pipeline (leads por etapa)":
            data.crm?.pipeline
              ?.slice(0, 6)
              .map(
                (row) =>
                  `${row.name}: ${row.leads}`
              ),
        };

      default:
        return {};
    }
  }

  const insightKeyFor = (
    module: ModuleAiId,
    mode: InsightMode
  ) =>
    `${module}:${
      mode === "ia" ? "ia" : "dual"
    }`;

  async function requestModuleInsight(
    module: ModuleAiId,
    mode: "dual" | "ia"
  ) {
    const key = `${module}:${mode}`;

    setModInsights((prev) => ({
      ...prev,
      [key]: { status: "loading" },
    }));

    try {
      const response = await fetch(
        "/api/module-insight",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            module,
            mode,
            context: moduleContext(module),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "La IA no respondió."
        );
      }

      setModInsights((prev) => ({
        ...prev,
        [key]: {
          status: "done",
          data: result.insight,
        },
      }));
    } catch (err: any) {
      setModInsights((prev) => ({
        ...prev,
        [key]: {
          status: "error",
          error:
            err?.message || "La IA no respondió.",
        },
      }));
    }
  }

  async function copyModuleMessage(
    module: ModuleAiId,
    text: string
  ) {
    try {
      await navigator.clipboard.writeText(text);

      setCopiedMod(module);

      setTimeout(() => setCopiedMod(null), 1800);
    } catch {}
  }

  const aiRow = (module: ModuleAiId) => {
    const mode: InsightMode =
      modEngines[module] || "dual";

    return (
      <ModuleAiRow
        key={module}
        id={module}
        engine={mode}
        onEngine={(next) =>
          chooseModEngine(module, next)
        }
        state={
          modInsights[insightKeyFor(module, mode)]
        }
        onGenerate={() =>
          requestModuleInsight(
            module,
            mode === "ia" ? "ia" : "dual"
          )
        }
        onCopy={(text) =>
          copyModuleMessage(module, text)
        }
        copied={copiedMod === module}
      />
    );
  };

  /*
   * Listas dinamicas por modulo: estado de abierto/activo y
   * helpers para abrirlas desde las tarjetas de KPI.
   */

  const [listOpen, setListOpen] = useState<
    Record<string, boolean>
  >({});

  const [listSel, setListSel] = useState<
    Record<string, string>
  >({});

  /*
   * Al abrir una lista se guarda DONDE estaba el usuario (modulo y
   * scroll). Al cerrarla, la pagina vuelve exactamente ahi.
   */
  const [listRestore, setListRestore] = useState<{
    tab: Tab;
    scrollY: number;
  } | null>(null);

  const openList = (
    module: string,
    listId: string
  ) => {
    setListRestore(
      (prev) =>
        prev || {
          tab: tab,
          scrollY: window.scrollY,
        }
    );

    setListSel((prev) => ({
      ...prev,
      [module]: listId,
    }));

    // Una sola lista abierta a la vez.
    setListOpen({ [module]: true });

    setTimeout(() => {
      document
        .getElementById(`lists-${module}`)
        ?.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
    }, 80);
  };

  /*
   * Cierre completo: oculta la lista y devuelve la pagina al modulo
   * y la posicion donde estaba el usuario antes de abrirla.
   */
  const closeList = () => {
    setListOpen({});

    const restore = listRestore;

    if (!restore) return;

    setListRestore(null);

    setTab(restore.tab);

    setTimeout(() => {
      window.scrollTo({
        top: restore.scrollY,
        behavior: "auto",
      });
    }, 80);
  };

  /*
   * gotoList: cambia de modulo y abre la lista pedida. Para numeros
   * accionables cuya lista vive en otro modulo (tab distinto).
   */
  const gotoList = (
    module: string,
    listId: string
  ) => {
    setTab(module as Tab);
    openList(module, listId);
  };

  const listsRow = (module: string) => {
    const moduleLists =
      (data && data.lists && data.lists[module]) ||
      [];

    if (moduleLists.length === 0) {
      return null;
    }

    return (
      <ModuleLists
        key={module}
        module={module}
        lists={moduleLists}
        open={Boolean(listOpen[module])}
        active={
          listSel[module] || moduleLists[0].id
        }
        onToggle={() => {
          if (listOpen[module]) {
            closeList();
          } else {
            openList(
              module,
              listSel[module] || moduleLists[0].id
            );
          }
        }}
        onSelect={(id) => {
          setListSel((prev) => ({
            ...prev,
            [module]: id,
          }));

          setListOpen((prev) => ({
            ...prev,
            [module]: true,
          }));
        }}
        onClose={() => closeList()}
      />
    );
  };

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
          onOpenList={(nextTab, listId) => {
            setTab(nextTab);
            openList(nextTab, listId);
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
            onChange={(e) => {
              const next = {
                ...filters,
                from: e.target.value,
              };

              setFilters(next);
              load(next);
            }}
          />

          <input
            type="date"
            value={filters.to}
            onChange={(e) => {
              const next = {
                ...filters,
                to: e.target.value,
              };

              setFilters(next);
              load(next);
            }}
          />

          <select
            value={filters.office}
            onChange={(e) => {
              const next = {
                ...filters,
                office:
                  e.target.value,
              };

              setFilters(next);
              load(next);
            }}
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
            onChange={(e) => {
              const next = {
                ...filters,
                product:
                  e.target.value,
              };

              setFilters(next);
              load(next);
            }}
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
            onChange={(e) => {
              const next = {
                ...filters,
                channel:
                  e.target.value,
              };

              setFilters(next);
              load(next);
            }}
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
            onChange={(e) => {
              const next = {
                ...filters,
                employee:
                  e.target.value,
              };

              setFilters(next);
              load(next);
            }}
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
            onChange={(e) => {
              const next = {
                ...filters,
                company:
                  e.target.value,
              };

              setFilters(next);
              load(next);
            }}
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

          {loading && data && (
            <span className="filter-updating">
              Actualizando datos…
            </span>
          )}

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

            {aiRow("pulso")}

            {listsRow("pulso")}
            <section className="kpi-grid">
              <Kpi
                title="Clientes históricos"
                value={number(
                  data.migration.clients
                )}
                subtitle="Base maestra actual"
                onClick={() =>
                  openList("pulso", "clients")
                }
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
                onClick={() =>
                  openList("pulso", "altas")
                }
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
                title="Pólizas en el sistema nuevo"
                value={number(
                  data.current
                    .loadedPolicies
                )}
                subtitle="Activas + no vigentes — cualquier estado"
                onClick={() =>
                  gotoList("cartera", "loaded")
                }
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
                onClick={() =>
                  gotoList("cartera", "active")
                }
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

            {aiRow("cartera")}

            {listsRow("cartera")}
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
                  creadas y cargadas
                  en el sistema nuevo
                  (Seguros Agénticos).
                  No deben interpretarse
                  como la cartera final.
                </p>
              </div>
            </div>

            <section className="kpi-grid">
              <Kpi
                title="Pólizas cargadas en el sistema nuevo"
                value={number(
                  data.current
                    .loadedPolicies
                )}
                subtitle={`Activas ${number(
                  data.current
                    .activePolicies
                )} · No vigentes ${number(
                  data.current
                    .loadedPolicies -
                    data.current
                      .activePolicies
                )}`}
                onClick={() =>
                  openList("cartera", "loaded")
                }
                icon={
                  <BriefcaseBusiness />
                }
              />

              <Kpi
                title="Pólizas activas"
                value={number(
                  data.current
                    .activePolicies
                )}
                subtitle="Vigentes o renovadas — según estado"
                onClick={() =>
                  openList("cartera", "active")
                }
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
                onClick={() =>
                  openList("cartera", "clients")
                }
                icon={<Users />}
              />

              <Kpi
                title="Prima activa cargada"
                value={money(
                  data.current
                    .activePremium
                )}
                subtitle="Valor parcial"
                onClick={() =>
                  openList("cartera", "active")
                }
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

            {aiRow("retencion")}

            {listsRow("retencion")}
            <section className="kpi-grid">
              <Kpi
                title="Vencen ≤7 días"
                onClick={() =>
                  openList(
                    "retencion",
                    "expires7"
                  )
                }
                value={number(
                  data.current.expires7
                )}
                subtitle="Acción inmediata"
                icon={<Clock3 />}
                tone="danger"
              />

              <Kpi
                title="Vencen ≤30 días"
                onClick={() =>
                  openList(
                    "retencion",
                    "expires30"
                  )
                }
                value={number(
                  data.current.expires30
                )}
                subtitle="Secuencia de renovación"
                icon={<Clock3 />}
                tone="warning"
              />

              <Kpi
                title="Clientes a observar"
                onClick={() =>
                  openList(
                    "retencion",
                    "watch"
                  )
                }
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
                onClick={() =>
                  gotoList("pulso", "siniestros")
                }
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

            {aiRow("reactivacion")}

            {listsRow("reactivacion")}
            <section className="kpi-grid">
              <Kpi
                title="Candidatos detectados"
                onClick={() =>
                  openList(
                    "reactivacion",
                    "candidates"
                  )
                }
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
                onClick={() =>
                  openList(
                    "reactivacion",
                    "universe"
                  )
                }
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

            {aiRow("cross")}

            {listsRow("cross")}
            <section className="kpi-grid">
              <Kpi
                title="Una sola póliza"
                value={number(
                  data.current
                    .onePolicyClients
                )}
                subtitle="Oportunidad directa de cross-selling"
                onClick={() =>
                  openList("cross", "one")
                }
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
                onClick={() =>
                  gotoList("cartera", "multi")
                }
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
                      className="opportunity-row clickable"
                      key={
                        item.opportunity
                      }
                      role="button"
                      title="Ver los clientes de esta combinación"
                      onClick={() =>
                        openList(
                          "cross",
                          item.opportunity
                            .toLowerCase()
                            .replace(
                              /[^a-z0-9]+/g,
                              "-"
                            )
                        )
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

                      <span className="row-go">
                        Ver clientes →
                      </span>
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
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    setFilters({
                      ...filters,
                      search: value,
                    });

                    if (searchTimer.current) {
                      clearTimeout(
                        searchTimer.current
                      );
                    }

                    // Auto-busqueda: 700ms desde la ultima tecla.
                    searchTimer.current =
                      setTimeout(() => {
                        load({
                          ...filters,
                          search: value,
                        });
                      }, 700);
                  }}
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

            <p className="customer-count">
              {filters.search
                ? data.customers.length === 0
                  ? "Sin resultados. Probá con otro nombre, DNI o teléfono."
                  : data.customerStats &&
                    data.customerStats.matched >
                      data.customers.length
                    ? `Mostrando las últimas ${data.customers.length} de ${data.customerStats.matched} coincidencias. Afiná la búsqueda para ver menos.`
                    : `${data.customers.length} resultado${data.customers.length === 1 ? "" : "s"}.`
                : data.customerStats
                  ? `Últimas ${data.customers.length} de ${data.customerStats.total} clientes cargados (los más recientes). Buscá por nombre, DNI o teléfono para ir directo a una ficha.`
                  : ""}
            </p>

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

            {aiRow("migracion")}

            {listsRow("migracion")}
            <section className="kpi-grid">
              <Kpi
                title="Clientes"
                value={number(
                  data.migration.clients
                )}
                subtitle="Maestro Agentico"
                onClick={() =>
                  openList("migracion", "clients")
                }
                icon={<Users />}
              />

              <Kpi
                title="Gestiones históricas"
                value={number(
                  data.migration
                    .historicOperations
                )}
                subtitle="Base Rafael"
                onClick={() =>
                  openList(
                    "migracion",
                    "recent"
                  )
                }
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
                onClick={() =>
                  openList(
                    "migracion",
                    "matched"
                  )
                }
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
                onClick={() =>
                  openList(
                    "migracion",
                    "matchedops"
                  )
                }
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

                <div
                  className="clickable"
                  role="button"
                  title="Ver la lista detrás de este número"
                  onClick={() =>
                    openList(
                      "migracion",
                      "incomplete"
                    )
                  }
                >
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

                <div
                  className="clickable"
                  role="button"
                  title="Ver la lista detrás de este número"
                  onClick={() =>
                    openList(
                      "migracion",
                      "incomplete"
                    )
                  }
                >
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

                <div
                  className="clickable"
                  role="button"
                  title="Ver la lista detrás de este número"
                  onClick={() =>
                    openList(
                      "migracion",
                      "incomplete"
                    )
                  }
                >
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

                <div
                  className="clickable"
                  role="button"
                  title="Ver la lista detrás de este número"
                  onClick={() =>
                    openList(
                      "migracion",
                      "incomplete"
                    )
                  }
                >
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

                <div
                  className="clickable"
                  role="button"
                  title="Ver la lista detrás de este número"
                  onClick={() =>
                    openList(
                      "migracion",
                      "unmatched"
                    )
                  }
                >
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

            {data.crm?.available &&
              aiRow("crm")}

            {listsRow("crm")}
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
                    onClick={() =>
                      openList("crm", "matched")
                    }
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
                    onClick={() =>
                      openList("crm", "matched")
                    }
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
