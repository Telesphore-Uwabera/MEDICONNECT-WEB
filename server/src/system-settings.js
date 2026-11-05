import { forgetColumns, hasColumn, insert, one, pageArgs, pool, q, tableExists, update } from "./db.js";

const PUBLIC_GROUPS = new Set(["general", "video", "security"]);

const FIELD_TYPES = {
  general: {
    app_name: "string",
    app_tagline: "string",
    contact_email: "string",
    contact_phone: "string",
    contact_address: "string",
    default_language: "string",
    supported_languages: "array",
    timezone: "string",
    default_currency: "string",
    terms_url: "string",
    privacy_url: "string",
    app_logo_url: "string",
    app_favicon_url: "string",
    app_url: "string",
  },
  sms: {
    enabled: "boolean",
    provider: "string",
    sender_id: "string",
    api_key: "string",
    api_secret: "string",
    test_mode: "boolean",
    test_number: "string",
    otp_expiry_minutes: "integer",
  },
  email: {
    enabled: "boolean",
    driver: "string",
    host: "string",
    port: "integer",
    encryption: "string",
    username: "string",
    password: "string",
    from_address: "string",
    from_name: "string",
  },
  payment: {
    enabled: "boolean",
    provider: "string",
    public_key: "string",
    secret_key: "string",
    environment: "string",
    currency: "string",
  },
  video: {
    provider: "string",
    session_duration_minutes: "integer",
    waiting_room_enabled: "boolean",
  },
  notifications: {
    email_enabled: "boolean",
    sms_enabled: "boolean",
    in_app_enabled: "boolean",
  },
  security: {
    otp_enabled: "boolean",
    guest_access_enabled: "boolean",
    require_phone_verification: "boolean",
    require_email_verification: "boolean",
    session_lifetime_minutes: "integer",
  },
};

const SECRET_KEYS = new Set(["api_key", "api_secret", "password", "secret_key", "public_key"]);

export function knownGroups() {
  return Object.keys(FIELD_TYPES);
}

export function coerceSetting(type, value) {
  if (value == null || value === "") return type === "boolean" ? false : null;
  if (type === "boolean") return value === true || value === 1 || value === "1" || value === "true";
  if (type === "integer" || type === "number") {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  if (type === "array") {
    if (Array.isArray(value)) return value.map(String);
    return String(value).split(",").map((part) => part.trim()).filter(Boolean);
  }
  return String(value);
}

function encode(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function decode(type, raw) {
  if (raw == null || raw === "") return type === "boolean" ? false : null;
  if (type === "boolean") return raw === true || raw === 1 || raw === "1" || raw === "true";
  if (type === "integer" || type === "number") return Number(raw);
  if (type === "array" || (typeof raw === "string" && (raw.startsWith("[") || raw.startsWith("{")))) {
    try {
      const parsed = JSON.parse(raw);
      return type === "array" && !Array.isArray(parsed) ? [String(parsed)] : parsed;
    } catch {
      if (type === "array") return String(raw).split(",").map((part) => part.trim()).filter(Boolean);
    }
  }
  return type === "integer" || type === "number" ? Number(raw) : raw;
}

async function addColumn(table, name, ddl) {
  if (await hasColumn(table, name)) return;
  await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` ${ddl}`).catch(() => null);
  forgetColumns(table);
}

export async function ensureSettingsTables() {
  if (!(await tableExists("system_settings"))) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        group_name VARCHAR(40) NOT NULL,
        setting_key VARCHAR(80) NOT NULL,
        setting_value TEXT NULL,
        value_type VARCHAR(20) NOT NULL DEFAULT 'string',
        is_public TINYINT(1) NOT NULL DEFAULT 0,
        description VARCHAR(255) NULL,
        updated_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY system_settings_group_key (group_name, setting_key)
      )
    `);
  }
  await addColumn("system_settings", "group_name", "VARCHAR(40) NULL");
  await addColumn("system_settings", "setting_key", "VARCHAR(80) NULL");
  await addColumn("system_settings", "setting_value", "TEXT NULL");
  await addColumn("system_settings", "value_type", "VARCHAR(20) NULL");
  await addColumn("system_settings", "is_public", "TINYINT(1) NOT NULL DEFAULT 0");
  await addColumn("system_settings", "description", "VARCHAR(255) NULL");
  await addColumn("system_settings", "updated_by", "BIGINT UNSIGNED NULL");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings_audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      admin_id BIGINT UNSIGNED NULL,
      setting_group VARCHAR(40) NOT NULL,
      setting_key VARCHAR(80) NOT NULL,
      action VARCHAR(40) NOT NULL,
      old_value TEXT NULL,
      new_value TEXT NULL,
      ip_address VARCHAR(64) NULL,
      user_agent VARCHAR(255) NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY settings_audit_group (setting_group, action)
    )
  `);
}

async function rowsFor(group) {
  if (!(await tableExists("system_settings"))) return [];
  return q(
    "SELECT * FROM system_settings WHERE group_name = ? OR `group` = ?",
    [group, group],
  ).catch(async () => q("SELECT * FROM system_settings WHERE group_name = ?", [group]).catch(() => []));
}

function rowKey(row) {
  return row.setting_key || row.key || row.name;
}

function rowGroup(row) {
  return row.group_name || row.group || "general";
}

export async function readSettingsGroup(group) {
  const types = FIELD_TYPES[group] || {};
  const settings = {};
  for (const [key, type] of Object.entries(types)) {
    settings[key] = {
      value: type === "boolean" ? false : null,
      type,
      is_public: PUBLIC_GROUPS.has(group) && !SECRET_KEYS.has(key),
      description: null,
    };
  }
  for (const row of await rowsFor(group)) {
    const key = rowKey(row);
    if (!key) continue;
    const type = row.value_type || types[key] || "string";
    settings[key] = {
      value: decode(type, row.setting_value ?? row.value),
      type,
      is_public: row.is_public === true || row.is_public === 1 || (row.is_public == null && PUBLIC_GROUPS.has(group) && !SECRET_KEYS.has(key)),
      description: row.description ?? null,
    };
  }
  return { group, settings };
}

export async function readPublicSettings() {
  const flat = {};
  if (!(await tableExists("system_settings"))) return { settings: flat };
  const rows = await q("SELECT * FROM system_settings").catch(() => []);
  for (const row of rows) {
    const group = rowGroup(row);
    const key = rowKey(row);
    if (!key) continue;
    const isPublic = row.is_public === true || row.is_public === 1 || row.is_public == null;
    if (!isPublic || SECRET_KEYS.has(key)) continue;
    if (!PUBLIC_GROUPS.has(group) && row.is_public !== 1 && row.is_public !== true) continue;
    const type = row.value_type || FIELD_TYPES[group]?.[key] || "string";
    const value = decode(type, row.setting_value ?? row.value);
    flat[key] = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  }
  return { settings: flat };
}

export async function writeSettingsGroup(group, payload, actor = {}) {
  if (!FIELD_TYPES[group]) {
    const error = new Error("Unknown settings group.");
    error.status = 404;
    throw error;
  }
  await ensureSettingsTables();
  const current = await readSettingsGroup(group);
  const updated = [];
  const skipped = [];
  const types = FIELD_TYPES[group];
  for (const [key, raw] of Object.entries(payload || {})) {
    if (!types[key]) {
      skipped.push(key);
      continue;
    }
    if (SECRET_KEYS.has(key) && (raw == null || raw === "")) {
      skipped.push(key);
      continue;
    }
    const type = types[key];
    const value = coerceSetting(type, raw);
    const previous = current.settings[key]?.value ?? null;
    const same = JSON.stringify(previous) === JSON.stringify(value);
    if (same) continue;
    const existing = await one(
      "SELECT id FROM system_settings WHERE (group_name = ? OR `group` = ?) AND (setting_key = ? OR `key` = ?) LIMIT 1",
      [group, group, key, key],
    ).catch(() => one(
      "SELECT id FROM system_settings WHERE group_name = ? AND setting_key = ? LIMIT 1",
      [group, key],
    ).catch(() => null));
    const isPublic = PUBLIC_GROUPS.has(group) && !SECRET_KEYS.has(key) ? 1 : 0;
    const stored = {
      group_name: group,
      group,
      setting_key: key,
      key,
      name: key,
      setting_value: encode(value),
      value: encode(value),
      value_type: type,
      is_public: isPublic,
      updated_by: actor.adminId || null,
    };
    if (existing?.id) await update("system_settings", existing.id, stored);
    else await insert("system_settings", stored);
    await insert("settings_audit_logs", {
      admin_id: actor.adminId || null,
      setting_group: group,
      setting_key: key,
      action: previous == null ? "created" : "updated",
      old_value: encode(previous),
      new_value: encode(SECRET_KEYS.has(key) ? "[redacted]" : value),
      ip_address: actor.ip || null,
      user_agent: actor.userAgent ? String(actor.userAgent).slice(0, 255) : null,
    }).catch(() => null);
    updated.push(key);
  }
  return { message: "Settings saved.", updated, skipped };
}

export async function readAuditLogs(query) {
  if (!(await tableExists("settings_audit_logs"))) {
    return { data: [], current_page: 1, per_page: 25, total: 0 };
  }
  const { page, perPage, offset } = pageArgs({ query }, 25);
  const filters = [];
  const params = [];
  if (query.group) {
    filters.push("setting_group = ?");
    params.push(String(query.group));
  }
  if (query.action) {
    filters.push("action = ?");
    params.push(String(query.action));
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const total = Number((await one(`SELECT COUNT(*) AS total FROM settings_audit_logs ${where}`, params).catch(() => ({ total: 0 })))?.total ?? 0);
  const rows = await q(
    `SELECT * FROM settings_audit_logs ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, perPage, offset],
  ).catch(() => []);
  const data = [];
  for (const row of rows) {
    let admin = null;
    if (row.admin_id && await tableExists("users")) {
      const user = await one("SELECT id, name FROM users WHERE id = ?", [row.admin_id]).catch(() => null);
      if (user) admin = { id: user.id, name: user.name };
    }
    data.push({
      id: row.id,
      admin_id: row.admin_id ?? null,
      setting_group: row.setting_group,
      setting_key: row.setting_key,
      action: row.action,
      old_value: row.old_value ?? null,
      new_value: row.new_value ?? null,
      ip_address: row.ip_address ?? null,
      user_agent: row.user_agent ?? null,
      created_at: row.created_at,
      admin,
    });
  }
  return { data, current_page: page, per_page: perPage, total };
}

export async function publicSettingsTree() {
  const tree = { general: {}, video: {}, security: {} };
  if (!(await tableExists("system_settings"))) return tree;
  const groupColumn = (await hasColumn("system_settings", "group_name")) ? "group_name" : "group";
  const rows = await q("SELECT * FROM system_settings").catch(() => []);
  for (const row of rows) {
    const group = row[groupColumn] || row.group || row.group_name || "general";
    if (!tree[group]) continue;
    const key = rowKey(row);
    if (!key || SECRET_KEYS.has(key)) continue;
    tree[group][key] = decode(row.value_type || "string", row.setting_value ?? row.value);
  }
  return tree;
}
