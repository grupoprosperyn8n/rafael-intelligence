# Rafael Allende · Customer & Portfolio Intelligence

Cockpit Ejecutivo que unifica, en una sola vista, la **historia comercial** de la base
histórica de Rafael y la **cartera actual en proceso de carga** de la nueva plataforma
agéntica — sin mezclar físicamente las bases: las consulta, normaliza y superpone en memoria.

- **Stack**: Next.js 16 + TypeScript + Recharts + CSS propio (responsive).
- **Datos**: Airtable REST API exclusivamente **server-side** (el token nunca llega al navegador).
- **Estado**: funcionando y validado contra datos reales (12-sep-2026).

---

## 1. Arquitectura

```
AIRTABLE HISTÓRICO (appIO1WFzawAfos4E)
  └── 📊 GESTIÓN GENERAL · 34.603 gestiones
        │
        ▼
 NORMALIZADOR + MATCHER  (dni > tel > email > nombre)
        │
        ▼
AIRTABLE AGÉNTICO (appuhslj3GFf60Tea)
  ├── CLIENTES (14.921)   ├── POLIZAS (2.690)
  ├── PRODUCTOS           ├── COMPANIA
  ├── EMPLEADOS           ├── OFICINAS
        │
        ▼
CRM VOCERO (Postgres) → snapshot SOLO LECTURA (contactos · conversaciones · pipeline)
        │
        ▼
 MOTOR DE ANALÍTICA (lib/analytics.ts)
   cartera · retención · reactivación · cross-selling
   migración · venta CRM · macheo CRM↔cartera
        │
        ▼
 NEXT.JS / TYPESCRIPT  →  COCKPIT EJECUTIVO
```

Estructura del proyecto:

```
rafael-intelligence/
├── app/
│   ├── api/dashboard/route.ts   (GET /api/dashboard, server-side)
│   ├── globals.css
│   ├── icon.svg
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ExecutiveDashboard.tsx   (8 módulos, guía por módulo, sugerencias, filtros)
├── lib/
│   ├── airtable.ts              (paginación completa + caché 15 min)
│   ├── analytics.ts             (el corazón: cruce + BI)
│   ├── config.ts                (bases, tablas y campos Airtable)
│   ├── crm.ts                   (3ª fuente: snapshot del CRM + macheo en memoria)
│   ├── help.ts                  (guías interactivas: qué es / qué mide / para qué sirve)
│   ├── normalize.ts             (DNI, teléfono, email, nombre)
│   └── types.ts
├── docs/
│   └── manual-usuario.html      (manual de usuario final; PDF con Chrome headless)
├── scripts/
│   └── sync-crm.mjs             (snapshot SOLO LECTURA del CRM → data/crm-snapshot.json)
├── .env.example
├── next.config.mjs
├── package.json
└── tsconfig.json
```

### Regla fundamental de lectura
- **HISTÓRICO CONSOLIDADO** = base Rafael (historial transaccional).
- **ACTUAL CARGADO** = POLIZAS de la base agéntica (en migración).
- La UI nunca presenta lo "actual" como cartera final: badge y avisos "en proceso de carga".

### Matching (prioridad estricta)
1. **DNI** → 2. **teléfono normalizado** → 3. **email** → 4. **nombre normalizado**.
- Nunca match ambiguo: si una clave está duplicada, se descarta (no se matchea).
- Vínculo por claves normalizadas en memoria; las bases permanecen separadas.

---

## 2. Módulos del cockpit

1. **Pulso del negocio** — KPIs + crecimiento mensual (altas/anulaciones/neto) + canales + lectura ejecutiva.
2. **Cartera** — pólizas cargadas, activas, prima activa, productos históricos vs actuales, compañías.
3. **Retención** — vencimientos ≤7/≤30 días, clientes a observar, siniestros (base del futuro score).
4. **Reactivación** — candidatos detectados y universo potencial de históricos sin póliza activa cargada.
5. **Venta cruzada** — clientes con 1 póliza y oportunidades por producto (Auto→Auxilio/Hogar/Vida, Moto→AP/Vida…).
6. **Cliente 360°** — búsqueda por nombre/DNI/teléfono, score y próxima mejor acción.
7. **Calidad y avance de migración** — tasas de match y campos faltantes de la migración.
8. **CRM · Venta y gestión** (3ª fuente) — pipeline comercial del CRM Vocero (etapas y montos),
   actividad de conversaciones y mensajes (incluye respuestas de IA), y **macheo CRM ↔ cartera**:
   contactos cruzados contra clientes/pólizas/gestiones, prima activa vinculada y vencimientos ≤ 30 días.

Filtros globales: rango de fechas (con presets **Este mes / Mes pasado / Este año / Todo el tiempo**), oficina, producto, empleado, canal y compañía + chips de filtros activos (quitar individual) y **Limpiar todo**. Cada módulo incluye su **zona de ayuda** interactiva (¿Qué es? / ¿Qué mide? / ¿Para qué te sirve? + sugerencias accionables) y el tablero abre con la franja **Sugerencias de hoy** (chips con datos reales que llevan al módulo correspondiente).

---

## 3. Campos Airtable utilizados

### Base histórica `appIO1WFzawAfos4E`
| Tabla | Campos |
|---|---|
| 📊 GESTIÓN GENERAL | NOMBRE Y APELLIDO, DNI, TELEFONO, E-MAIL, FECHA, OFICINAS, MOTIVOS DE LA CONSULTA, TIPO DE PRODUCTOS, FORMA DE PAGOS, IMPORTE, ATENDIDO X, TIPO DE ATENCIÓN, RENOVACIÓN |
| 👥 EMPLEADOS | NOMBRE Y APELLIDO (para traducir "ATENDIDO X") |

### Base agéntica `appuhslj3GFf60Tea`
| Tabla | Campos |
|---|---|
| CLIENTES | NOMBRE NORMALIZADO, DNI, TELEFONO, TELEFONO NORMALIZADO, EMAIL, ID_UNICO_CLIENTE, 🟢 POLIZAS_ACTIVAS, ✅ CANTIDAD_POLIZAS, PRIMA ACTIVA CLIENTE |
| POLIZAS | N° DE POLIZA, CLIENTES 2, ESTADO DE LA POLIZA, FECHA DE INICIO DE LA POLIZA, FECHA VENCIMIENTO DE LA POLIZA, FECHA DE ANULACION, PRODUCTO LINK, COMPANIA LINK, IMPORTE, PRIMA ACTIVA CALCULADA, FORMA DE PAGOS, EMPLEADOS, OFICINAS |
| PRODUCTOS | NOMBRE PRODUCTO |
| COMPANIA | NOMBRE |
| EMPLEADOS | NOMBRE Y APELLIDO |
| OFICINAS | OFICINAS |

> Acceso **solo lectura**. El dashboard jamás escribe en Airtable.

---

## 4. Cómo ejecutar

```bash
cd rafael-intelligence
npm install
cp .env.example .env.local     # colocar AIRTABLE_TOKEN real (nunca con prefijo NEXT_PUBLIC_)
npm run dev                    # desarrollo → http://localhost:3000
# o producción:
npm run build && npm start -p 3310
```

Variables (`.env.local`):
```
AIRTABLE_TOKEN=pat_...        # SOLO server-side
AIRTABLE_BASE_HISTORICA=appIO1WFzawAfos4E
AIRTABLE_BASE_AGENTICA=appuhslj3GFf60Tea
DASHBOARD_CACHE_MINUTES=15
# CRM_SNAPSHOT_PATH=./data/crm-snapshot.json   # opcional; default: data/crm-snapshot.json
```

> Primera carga: ~2 minutos (34.603 gestiones, paginación 100/página). Luego queda en
> caché `DASHBOARD_CACHE_MINUTES` (15 por defecto). El botón "Actualizar" fuerza recarga.

---

## 5. Deploy (Coolify / VPS) — ✅ LIVE

**Producción**: https://dashbord-raseguros.sistemasagenticos.cloud

- App Coolify: `dashbord-raseguros` (uuid `g4k8i3s4i2t3diogh6rrdm6g`, proyecto `crm_seguros-agenticos`, server `f13bg8daiv2bfavilj8taz16`, destino `f851shw3iv9p51fbm952gg1p`).
- Repo: `github.com/grupoprosperyn8n/rafael-intelligence` (público, rama `main`). Build pack **Dockerfile** (multi-stage `node:22-alpine` + `output: standalone`).
- Env vars (Coolify, runtime): `AIRTABLE_TOKEN`, `AIRTABLE_BASE_HISTORICA`, `AIRTABLE_BASE_AGENTICA`, `DASHBOARD_CACHE_MINUTES=15`. El token NUNCA llega al cliente (server-side solamente, sin prefijo `NEXT_PUBLIC_`).
- Redeploy: `git push` + encolar deploy (`queue_application_deployment` vía PHP en el contenedor `coolify`) — esta instancia no auto-despliega por webhook.
- Verificación post-deploy: home 200 con TLS (Let's Encrypt); `GET /api/dashboard` → 200 (primera carga ~2 min, luego caché); 0 apariciones del token en HTML/bundles.
- **Snapshot del CRM en producción**: el Postgres del CRM se exporta a `data/crm-snapshot.json` con un script
  que vive en el propio VPS (`/root/rafael-intelligence/sync_snapshot.sh`, **cron cada 2 h**) y llega al contenedor
  por **file mount** de Coolify (`/data/rafael-intelligence/crm-snapshot.json` → `/app/data/crm-snapshot.json`).
  Solo lectura; se excluyen los registros de prueba (`is_test`).

---

## 6. Anomalías de datos detectadas

1. **Teléfonos enmascarados** (`+543****0139`) en la base histórica y en CLIENTES (campo TELEFONO):
   el match por teléfono queda inoperante; la base nueva tiene TELEFONO NORMALIZADO (dígitos completos),
   que se usa como clave alternativa.
2. **909 gestiones (2,6%) sin match** — sin DNI/email/nombre únicos utilizables (duplicados ambiguos excluidos por diseño).
3. **Empleados**: la tabla EMPLEADOS agéntica es copia parcial de la histórica (comparten record IDs; 22 vs 37 registros);
   el dashboard carga ambas para traducir "ATENDIDO X" a nombres.
4. **Estados de póliza con 12+ variantes** de vencimiento ("VENCE EN 30 DIAS", "FALTA MENOS DE … PARA VENCER", "VENCE HOY",
   "RENOVADA", "NO_RENOVADA", "SIN VIGENCIA", …). Ojo: "NO_RENOVADA" contiene "RENOVADA" — se corrigió para que no cuente
   como activa, y se agregó "VENCE HOY".
5. **Canales duplicados por espaciado**: "WAPP-PERSONAL" (1.548) vs "WAPP - PERSONAL" (11); revisar también "WLVX" (2.611).
6. **Pólizas incompletas en migración**: 399 sin vencimiento, 23 sin producto, 12 sin compañía, 9 sin cliente.
7. **MOTIVOS DE LA CONSULTA** incluye valores fuera de las 4 categorías analizadas (COBRANZA, ENDOSO, NO APLICA,
   IMPRESIÓN / RETIRO DOCU, OTROS) — solo se clasifican ALTAS / ANULACIÓN / COTIZACIÓN / SINIESTRO.
8. **Higiene de esquema**: campo "JAJAJA" en GESTIÓN GENERAL; gran volumen de campos fórmula/auxiliares sin uso.
9. **Cartera cargada claramente parcial**: solo 2 compañías (TRIUNFO 2.677 pólizas, FEDERACIÓN PATRONAL 1) — coherente
   con "en proceso de carga"; la UI lo advierte explícitamente.
10. Historial: 12.134 altas vs 6.289 anulaciones (ratio 51,8%) y 3.319 siniestros en 21 meses de gestiones (2025-01 → 2026-09).
11. **CRM recién lanzado**: los únicos registros "reales" hoy son los de la puesta en marcha; el resto
    está marcado como prueba (`is_test`) y se excluye por diseño. Las métricas del tab CRM crecerán
    con el uso real (el snapshot se regenera cada 2 h).

---

## 7. Mejoras futuras

1. **Sincronización local incremental** (Postgres/SQLite) para eliminar la carga fría de ~2 min.
2. **Normalizar el estado de pólizas** a un set canónico único (la base tiene demasiadas variantes).
3. **Completar teléfonos** (desenmascarar/exportar) para match total y contacto directo; luego botón WhatsApp en Cliente 360°.
4. **Deduplicación asistida** de clientes (mismo DNI / nombre similar) para superar el 98,4% de match.
5. **Exportar listas de trabajo** (CSV de reactivación / renovaciones) desde el propio cockpit.
6. **Alertas de renovación** (≤30 días) con secuencia de contacto.
7. **Autenticación simple** antes de exponerlo fuera de la red interna.
8. **Segmentación por oficina** (los nombres traen código, ej. 7293) y mapa de distribución.
9. Sumar **siniestros/denuncias** de las tablas de carga si se quiere medir experiencia completa.
10. **Snapshot mensual** de métricas para ver evolución histórica del negocio en el tiempo.

---

## 8. Validaciones realizadas (12-sep-2026)

- [x] `npm install` + `npm run build` sin errores (Next 16.3.5, TypeScript estricto).
- [x] `GET /api/dashboard` → 200 con datos reales (14.921 clientes / 34.603 gestiones / 98,4% match clientes).
- [x] Responsive: desktop (1440: 3 columnas KPI), tablet (900: 2), móvil (375: 1) — verificados por layout real.
- [x] Estados: loading (pantalla "Preparando inteligencia…"), error (reintentar), vacío ("Sin resultados…").
- [x] Filtros: fecha desde 2026-01-01 → altas 12.134 → 5.003 (funcional).
- [x] Búsqueda Cliente 360°: "MENDOZA ROSA" → 2 fichas con score y próxima mejor acción.
- [x] Ningún token en frontend: 0 coincidencias en bundles estáticos, HTML y respuestas.
- [x] 0 errores JS en consola tras carga completa.

### Ajustes aplicados sobre el código original (mínimos, documentados)
- `lib/config.ts`: agregado `TELEFONO NORMALIZADO` (clave de match alternativa) y tabla de empleados histórica.
- `lib/analytics.ts`: traducción de empleados históricos vía su propia tabla; fix "NO_RENOVADA"/"VENCE HOY";
  teléfono de cliente desde TELEFONO NORMALIZADO con fallback a TELEFONO; opciones de oficina incluyen las de la cartera nueva.
- `components/ExecutiveDashboard.tsx` + CSS: estado vacío en Cliente 360° y favicon.
- Ninguna otra desviación: arquitectura, módulos y métricas intactos.
