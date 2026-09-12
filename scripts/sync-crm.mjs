#!/usr/bin/env node
/**
 * sync-crm.mjs — Trae un snapshot compacto (solo lectura) de la base del
 * Vocero CRM y lo escribe en data/crm-snapshot.json para que el cockpit lo
 * consuma junto a las bases de Airtable.
 *
 * Config por ENV (valores por defecto = infra real):
 *   CRM_SSH_HOST   root@187.127.45.42
 *   CRM_SSH_KEY    ~/.ssh/id_hermes_coolify
 *   CRM_DB_CONTAINER a10fs4r4f2hzuaoeyyqkglea
 *   CRM_DB_NAME    vocero
 *
 * Uso: npm run sync-crm
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const HOST = process.env.CRM_SSH_HOST || "root@187.127.45.42";
const KEY = process.env.CRM_SSH_KEY || join(os.homedir(), ".ssh", "id_hermes_coolify");
const CONTAINER = process.env.CRM_DB_CONTAINER || "a10fs4r4f2hzuaoeyyqkglea";
const DB = process.env.CRM_DB_NAME || "vocero";

const SQL = `
SELECT json_build_object(
  'generatedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS'),
  'contacts', (SELECT COALESCE(json_agg(json_build_object(
      'id', id, 'name', name, 'phone', phone, 'channel', channel, 'source', source,
      'isTest', COALESCE(is_test, false), 'externalRef', external_ref,
      'createdAt', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS'))), '[]'::json)
    FROM contact WHERE archived_at IS NULL),
  'conversations', (SELECT COALESCE(json_agg(json_build_object(
      'id', id, 'contactId', contact_id, 'channel', channel,
      'isTest', COALESCE(is_test, false), 'topic', topic, 'assigneeId', assignee_id,
      'createdAt', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
      'lastMessageAt', to_char(last_message_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
      'lastInboundAt', to_char(last_inbound_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
      'closedAt', to_char(closed_at, 'YYYY-MM-DD"T"HH24:MI:SS'))), '[]'::json)
    FROM conversation),
  'messageStats', (SELECT COALESCE(json_agg(x), '[]'::json) FROM (
      SELECT m.conversation_id AS "conversationId", count(*) AS total,
        sum((m.direction = 'in')::int) AS inbound,
        sum((m.direction = 'out')::int) AS outbound,
        sum((m.ai_generated)::int) AS ai
      FROM message m GROUP BY m.conversation_id) x),
  'dailyMessages', (SELECT COALESCE(json_agg(y), '[]'::json) FROM (
      SELECT to_char(m.created_at::date, 'YYYY-MM-DD') AS day,
        COALESCE(c.is_test, false) AS "isTest",
        count(*) AS total,
        sum((m.direction = 'in')::int) AS inbound,
        sum((m.direction = 'out')::int) AS outbound,
        sum((m.ai_generated)::int) AS ai
      FROM message m JOIN conversation c ON c.id = m.conversation_id
      GROUP BY 1, 2 ORDER BY 1) y),
  'dailyConversations', (SELECT COALESCE(json_agg(z), '[]'::json) FROM (
      SELECT to_char(created_at::date, 'YYYY-MM-DD') AS day,
        COALESCE(is_test, false) AS "isTest", count(*) AS total
      FROM conversation GROUP BY 1, 2 ORDER BY 1) z),
  'leads', (SELECT COALESCE(json_agg(json_build_object(
      'id', l.id, 'contactId', l.contact_id, 'stage', ps.name, 'stageKind', ps.kind,
      'amountCents', COALESCE(l.amount_cents, 0), 'priority', l.priority,
      'createdAt', to_char(l.created_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
      'lastActivityAt', to_char(l.last_activity_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
      'contactName', ct.name, 'isTest', COALESCE(ct.is_test, false))), '[]'::json)
    FROM lead l
    JOIN pipeline_stage ps ON ps.id = l.stage_id
    JOIN contact ct ON ct.id = l.contact_id),
  'stages', (SELECT COALESCE(json_agg(json_build_object(
      'name', name, 'kind', kind, 'position', position) ORDER BY position), '[]'::json)
    FROM pipeline_stage),
  'usersCount', (SELECT count(*) FROM "user")
) AS snapshot;
`;

const ssh = spawnSync(
  "ssh",
  [
    "-i", KEY,
    "-o", "StrictHostKeyChecking=no",
    "-o", "BatchMode=yes",
    HOST,
    `docker exec -i ${CONTAINER} psql -U postgres -d ${DB} -At -q --no-psqlrc -v ON_ERROR_STOP=1`,
  ],
  { input: SQL, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
);

if (ssh.error) {
  console.error("No se pudo ejecutar ssh:", ssh.error.message);
  process.exit(1);
}
if (ssh.status !== 0) {
  console.error("SSH/psql falló (status " + ssh.status + "):");
  console.error((ssh.stderr || "").slice(0, 800));
  process.exit(1);
}

// psql (PG16) puede formatear el JSON con espacios y saltos de línea
// intercalados; extraemos desde la primera "{" hasta la última "}" para
// parsear de forma robusta en cualquier caso.
const rawOut = ssh.stdout || "";
const jsonStart = rawOut.indexOf("{");
const jsonEnd = rawOut.lastIndexOf("}");

if (jsonStart === -1 || jsonEnd <= jsonStart) {
  console.error("La salida de psql no contiene el JSON esperado:");
  console.error(rawOut.slice(0, 400));
  process.exit(1);
}

const snapshot = JSON.parse(rawOut.slice(jsonStart, jsonEnd + 1));
snapshot.generatedAt = new Date().toISOString();
snapshot.source = { host: HOST, db: DB, container: CONTAINER };

const out = join(root, "data", "crm-snapshot.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(snapshot, null, 2));

const realCount = (arr) => arr.filter((x) => !x.isTest).length;
console.log("Snapshot CRM escrito en " + out);
console.log(`  contactos:      ${snapshot.contacts.length} (${realCount(snapshot.contacts)} reales)`);
console.log(`  conversaciones: ${snapshot.conversations.length} (${realCount(snapshot.conversations)} reales)`);
console.log(`  leads:          ${snapshot.leads.length} (${realCount(snapshot.leads)} reales)`);
console.log(`  etapas:         ${snapshot.stages.length} | usuarios: ${snapshot.usersCount}`);
