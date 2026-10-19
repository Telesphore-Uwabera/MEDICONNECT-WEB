import { loadOwnedId } from "./auth.js";
import { decorateAppointments } from "./appointments.js";
import { verifierNames } from "./verification.js";
import {
  countWhere,
  hasColumn,
  laravelPage,
  one,
  pageArgs,
  presentRow,
  presentRows,
  q,
  tableExists,
  update,
} from "./db.js";
import { visitBodyGuard } from "./visit-rules.js";

const PROFILE = { doctor: "doctors", patient: "patients", hospital: "hospitals", pharmacy: "pharmacies" };

const IDENTITY = new Set(["users", "staff", "doctors", "patients", "hospitals", "pharmacies", "team", "doctor-consultations"]);
const NAMED_TABLES = new Set(["doctors", "hospitals", "pharmacies", "patients", "users"]);

function entry(spec) {
  return {
    actionScopes: [],
    allowDelete: !IDENTITY.has(spec.resource),
    allowWrite: true,
    ...spec,
  };
}

/** Every catalog row is addressed by its own PK and scoped by FKs. */
export const DEDICATED = Object.fromEntries(
  [
    {
      resource: "appointments",
      tables: ["appointments"],
      idName: "appointment_id",
      param: "appointmentId",
      scopes: ["doctor", "patient", "hospital", "admin"],
      allowDelete: false,
    },
    {
      resource: "instant-consultations",
      tables: ["instant_consultation_requests", "instant_consultations"],
      idName: "instant_consultation_id",
      param: "instantConsultationId",
      scopes: ["doctor", "patient", "admin"],
      allowDelete: false,
    },
    {
      resource: "service-bookings",
      tables: ["service_bookings"],
      idName: "booking_id",
      param: "bookingId",
      scopes: ["hospital", "patient", "doctor", "admin"],
      actionScopes: ["hospital"],
      statusActions: { accept: "accepted", reject: "rejected", complete: "completed", cancel: "cancelled" },
    },
    {
      resource: "prescriptions",
      tables: ["prescriptions"],
      idName: "prescription_id",
      param: "prescriptionId",
      scopes: ["doctor", "patient", "hospital", "pharmacy", "admin"],
      actionScopes: ["doctor", "pharmacy"],
      statusActions: { sign: "signed", issue: "issued", complete: "completed", cancel: "cancelled", fulfill: "fulfilled" },
    },
    {
      resource: "consultation-summaries",
      tables: ["consultation_summaries"],
      idName: "summary_id",
      param: "summaryId",
      scopes: ["doctor", "patient", "admin"],
    },
    {
      resource: "pharmacy-orders",
      tables: ["pharmacy_orders"],
      idName: "pharmacy_order_id",
      param: "pharmacyOrderId",
      scopes: ["pharmacy", "patient", "admin"],
      actionScopes: ["pharmacy"],
      statusActions: { accept: "confirmed", reject: "cancelled", complete: "dispensed" },
    },
    {
      resource: "orders",
      tables: ["pharmacy_orders"],
      idName: "pharmacy_order_id",
      param: "pharmacyOrderId",
      scopes: ["pharmacy", "admin"],
      actionScopes: ["pharmacy"],
      statusActions: { accept: "confirmed", reject: "cancelled", complete: "dispensed" },
    },
    {
      resource: "prescription-requests",
      tables: ["pharmacy_prescription_requests", "prescription_requests", "prescriptions"],
      idName: "prescription_id",
      param: "prescriptionId",
      scopes: ["pharmacy"],
      actionScopes: ["pharmacy"],
      statusActions: { accept: "accepted", reject: "rejected", fulfill: "fulfilled", complete: "completed" },
    },
    {
      resource: "users",
      tables: ["users"],
      idName: "user_id",
      param: "userId",
      scopes: ["admin"],
      allowDelete: false,
    },
    {
      resource: "staff",
      tables: ["users"],
      idName: "user_id",
      param: "userId",
      scopes: ["admin"],
      allowDelete: false,
    },
    {
      resource: "doctors",
      tables: ["doctors"],
      idName: "doctor_id",
      param: "doctorId",
      scopes: ["admin"],
      allowDelete: false,
    },
    {
      resource: "doctor-consultations",
      tables: ["doctors"],
      idName: "doctor_id",
      param: "doctorId",
      scopes: ["admin"],
      allowDelete: false,
    },
    {
      resource: "patients",
      tables: ["patients"],
      idName: "patient_id",
      param: "patientId",
      scopes: ["admin", "doctor"],
      allowDelete: false,
    },
    {
      resource: "hospitals",
      tables: ["hospitals"],
      idName: "hospital_id",
      param: "hospitalId",
      scopes: ["admin"],
      allowDelete: false,
    },
    {
      resource: "pharmacies",
      tables: ["pharmacies"],
      idName: "pharmacy_id",
      param: "pharmacyId",
      scopes: ["admin"],
      allowDelete: false,
    },
    {
      resource: "team",
      tables: ["team_members"],
      idName: "team_member_id",
      param: "teamMemberId",
      scopes: ["admin"],
      allowDelete: false,
    },
    {
      resource: "reviews",
      tables: ["reviews"],
      idName: "review_id",
      param: "reviewId",
      scopes: ["admin", "patient", "doctor", "hospital"],
      actionScopes: ["admin"],
      statusActions: { approve: "approved", reject: "rejected" },
    },
    {
      resource: "refunds",
      tables: ["refunds"],
      idName: "refund_id",
      param: "refundId",
      scopes: ["admin", "patient"],
      actionScopes: ["admin"],
      statusActions: { approve: "approved", reject: "rejected", complete: "completed" },
    },
    {
      resource: "notifications",
      tables: ["notifications"],
      idName: "notification_id",
      param: "notificationId",
      scopes: ["admin", "doctor", "patient", "hospital", "pharmacy"],
      actionScopes: [],
    },
    {
      resource: "insurances",
      tables: ["insurances", "hospital_insurances"],
      idName: "insurance_id",
      param: "insuranceId",
      scopes: ["hospital", "admin", "patient"],
    },
    {
      resource: "departments",
      tables: ["hospital_departments", "departments"],
      idName: "department_id",
      param: "departmentId",
      scopes: ["hospital", "admin"],
    },
    {
      resource: "services",
      tables: ["services", "hospital_services"],
      idName: "service_id",
      param: "serviceId",
      scopes: ["admin", "hospital"],
    },
    {
      resource: "working-hours",
      tablesByScope: {
        hospital: ["hospital_working_hours"],
        pharmacy: ["pharmacy_working_hours", "working_hours"],
        admin: ["hospital_working_hours"],
      },
      idName: "working_hour_id",
      param: "workingHourId",
      scopes: ["hospital", "pharmacy", "admin"],
    },
    {
      resource: "closures",
      tablesByScope: {
        hospital: ["hospital_closures", "closures"],
        pharmacy: ["pharmacy_closures", "closures"],
      },
      idName: "closure_id",
      param: "closureId",
      scopes: ["hospital", "pharmacy"],
    },
    {
      resource: "medicines",
      tables: ["pharmacy_medicines", "medicines"],
      idName: "medicine_id",
      param: "medicineId",
      scopes: ["pharmacy", "admin"],
    },
    {
      resource: "pharmacy-inventory-medicines",
      prefix: "/pharmacy/inventory/medicines",
      tables: ["pharmacy_medicines", "medicines"],
      idName: "medicine_id",
      param: "medicineId",
      scopes: ["pharmacy"],
    },
    {
      resource: "categories",
      tables: ["pharmacy_medicine_categories", "medicine_categories"],
      idName: "category_id",
      param: "categoryId",
      scopes: ["pharmacy", "admin"],
    },
    {
      resource: "pharmacy-inventory-categories",
      prefix: "/pharmacy/inventory/categories",
      tables: ["pharmacy_medicine_categories", "medicine_categories"],
      idName: "category_id",
      param: "categoryId",
      scopes: ["pharmacy"],
    },
    {
      resource: "stock-requests",
      tables: ["pharmacy_stock_requests", "stock_requests"],
      idName: "stock_request_id",
      param: "stockRequestId",
      scopes: ["pharmacy", "admin"],
      actionScopes: ["pharmacy"],
      statusActions: { approve: "approved", reject: "rejected", receive: "received" },
    },
    {
      resource: "pharmacy-inventory-stock-requests",
      prefix: "/pharmacy/inventory/stock-requests",
      tables: ["pharmacy_stock_requests", "stock_requests"],
      idName: "stock_request_id",
      param: "stockRequestId",
      scopes: ["pharmacy"],
      actionScopes: ["pharmacy"],
      statusActions: { approve: "approved", reject: "rejected", receive: "received" },
    },
    {
      resource: "help-center-links",
      tables: ["help_center_links"],
      idName: "help_link_id",
      param: "helpLinkId",
      scopes: ["admin"],
    },
    {
      resource: "legal-documents",
      tables: ["legal_documents"],
      idName: "legal_document_id",
      param: "legalDocumentId",
      scopes: ["admin"],
    },
    {
      resource: "checklist-questions",
      tables: ["fitness_checklist_questions"],
      idName: "question_id",
      param: "questionId",
      scopes: ["admin"],
    },
    {
      resource: "multi-notifications",
      tables: ["notification_batches"],
      idName: "batch_id",
      param: "batchId",
      scopes: ["admin"],
    },
    {
      resource: "specializations",
      tables: ["specializations"],
      idName: "specialization_id",
      param: "specializationId",
      scopes: ["admin"],
    },
    {
      resource: "specialization-fees",
      tables: ["specialization_fees"],
      idName: "specialization_fee_id",
      param: "specializationFeeId",
      scopes: ["admin"],
    },
  ].map((spec) => [spec.resource, entry(spec)]),
);

const ALSO_DEDICATED = new Set(["care-orders", "referrals", "certificates"]);

export function isDedicatedResource(resource) {
  return Boolean(DEDICATED[resource]) || ALSO_DEDICATED.has(resource);
}

export function routeRecordId(req) {
  return (
    req.params.userId ||
    req.params.doctorId ||
    req.params.patientId ||
    req.params.hospitalId ||
    req.params.pharmacyId ||
    req.params.appointmentId ||
    req.params.instantConsultationId ||
    req.params.bookingId ||
    req.params.prescriptionId ||
    req.params.summaryId ||
    req.params.pharmacyOrderId ||
    req.params.reviewId ||
    req.params.refundId ||
    req.params.notificationId ||
    req.params.departmentId ||
    req.params.serviceId ||
    req.params.medicineId ||
    req.params.insuranceId ||
    req.params.careOrderId ||
    req.params.referralId ||
    req.params.id
  );
}

async function firstTable(names) {
  for (const name of names || []) {
    if (name && (await tableExists(name))) return name;
  }
  return null;
}

function tablesFor(spec, scope) {
  return spec.tablesByScope?.[scope] || spec.tables || [];
}

function withPk(row, idName) {
  if (!row) return row;
  return { ...row, id: row.id, [idName]: row.id };
}

function withTeamPhoto(member) {
  if (!member) return member;
  return {
    ...member,
    photo_url: member.photo_url || member.photo || null,
    icon_url: member.icon_url || member.icon || null,
  };
}

async function ownerWhere(scope, table, user) {
  if (scope === "admin") return { sql: "1=1", params: [] };
  const ownerId = PROFILE[scope] ? await loadOwnedId(user.id, PROFILE[scope]) : null;
  if (table === "notifications" && (await hasColumn(table, "notifiable_id"))) {
    return { sql: "`notifiable_id` = ?", params: [user.id] };
  }
  if (table === "users") return { sql: "`id` = ?", params: [user.id] };
  if (scope === "patient" && (await hasColumn(table, "patient_id"))) {
    return { sql: "(`patient_id` = ? OR `patient_id` = ?)", params: [user.id, ownerId ?? 0] };
  }
  if (await hasColumn(table, `${scope}_id`)) {
    return { sql: `\`${scope}_id\` = ?`, params: [ownerId ?? 0] };
  }
  if (await hasColumn(table, "user_id")) return { sql: "`user_id` = ?", params: [user.id] };
  return { sql: "1=0", params: [] };
}

async function extraFilters(req, table, spec) {
  const filters = [];
  const params = [];
  if (req.query.status && (await hasColumn(table, "status"))) {
    filters.push("`status` = ?");
    params.push(req.query.status);
  }
  if (req.query.type && (await hasColumn(table, "type"))) {
    filters.push("`type` = ?");
    params.push(req.query.type);
  }
  if (spec.idName === "appointment_id" && (await hasColumn(table, "appointment_date"))) {
    if (req.query.date) {
      filters.push("DATE(`appointment_date`) = ?");
      params.push(String(req.query.date).slice(0, 10));
    } else if (String(req.query.today) === "1" || req.query.today === "true") {
      filters.push("DATE(`appointment_date`) = CURDATE()");
    } else if (String(req.query.upcoming) === "1" || req.query.upcoming === "true") {
      filters.push("DATE(`appointment_date`) >= CURDATE()");
      if (await hasColumn(table, "status")) {
        filters.push("`status` NOT IN ('completed','cancelled','canceled','expired','declined','rejected','no_show')");
      }
    }
  }
  for (const column of ["patient_id", "doctor_id", "hospital_id", "pharmacy_id", "department_id", "user_id"]) {
    if (req.query[column] && (await hasColumn(table, column))) {
      filters.push(`\`${column}\` = ?`);
      params.push(Number(req.query[column]));
    }
  }
  const term = req.query.search || req.query.q;
  if (term) {
    const cols = [];
    for (const name of ["name", "name_en", "title", "email", "phone", "slug"]) {
      if (await hasColumn(table, name)) cols.push(name);
    }
    if (cols.length) {
      filters.push(`(${cols.map((name) => `\`${name}\` LIKE ?`).join(" OR ")})`);
      cols.forEach(() => params.push(`%${term}%`));
    }
  }
  if ((req.query.active_only === "true" || req.query.active_only === "1") && (await hasColumn(table, "is_active"))) {
    filters.push("`is_active` = 1");
  }
  if (req.query.is_emergency === "true" && (await hasColumn(table, "is_emergency"))) {
    filters.push("`is_emergency` = 1");
  }
  if (req.query.is_emergency === "false" && (await hasColumn(table, "is_emergency"))) {
    filters.push("`is_emergency` = 0");
  }
  return { filters, params };
}

function sortClause(req, fallback = "`id` DESC") {
  const allowed = new Set(["id", "sort_order", "name_en", "name", "created_at", "updated_at", "capacity"]);
  const column = String(req.query.sort_by || "").trim();
  if (!allowed.has(column)) return fallback;
  const dir = String(req.query.sort_dir || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
  return `\`${column}\` ${dir}, \`id\` DESC`;
}

async function loadOwnedRow(scope, spec, user, recordId) {
  if (!/^\d+$/.test(String(recordId || ""))) return { table: null, row: null };
  const table = await firstTable(tablesFor(spec, scope));
  if (!table) return { table: null, row: null };
  const owned = await ownerWhere(scope, table, user);
  const row = await one(
    `SELECT * FROM \`${table}\` WHERE id = ? AND ${owned.sql} LIMIT 1`,
    [Number(recordId), ...owned.params],
  ).catch(() => null);
  return { table, row };
}

function adminRoles(requireRole, scope) {
  if (scope === "admin") return requireRole("admin", "moderator", "finance", "help_desk");
  return requireRole(scope);
}

function mountBase(scope, spec) {
  return spec.prefix || `/${scope}/${spec.resource}`;
}

async function presentDedicated(table, row, spec) {
  let presented = await presentRow(table, row);
  if (table === "appointments") presented = await decorateAppointments(presented);
  if (table === "team_members") presented = withTeamPhoto(presented);
  if (NAMED_TABLES.has(table)) [presented] = await verifierNames([presented]);
  return withPk(presented, spec.idName);
}

export function registerDedicatedResourceRoutes(router, { requireAuth, requireRole }) {
  for (const spec of Object.values(DEDICATED)) {
    for (const scope of spec.scopes) {
      const guard = [requireAuth, adminRoles(requireRole, scope)];
      const listGuard = scope === "admin" ? guard : [requireAuth];
      const base = mountBase(scope, spec);

      router.get(base, ...listGuard, async (req, res, next) => {
        try {
          const table = await firstTable(tablesFor(spec, scope));
          if (!table) return next();
          const { page, perPage, offset } = pageArgs(req);
          const owned = await ownerWhere(scope, table, req.user);
          const extra = await extraFilters(req, table, spec);
          const where = `WHERE ${[owned.sql, ...extra.filters].join(" AND ")}`;
          const params = [...owned.params, ...extra.params];
          const total = await countWhere(table, where, params);
          let data = await presentRows(
            table,
            await q(
              `SELECT * FROM \`${table}\` ${where} ORDER BY ${sortClause(req)} LIMIT ? OFFSET ?`,
              [...params, perPage, offset],
            ),
          );
          if (table === "appointments") data = await decorateAppointments(data);
          if (table === "team_members") data = (Array.isArray(data) ? data : []).map(withTeamPhoto);
          if (NAMED_TABLES.has(table)) data = await verifierNames(Array.isArray(data) ? data : []);
          data = (Array.isArray(data) ? data : []).map((row) => withPk(row, spec.idName));
          const pagePayload = laravelPage({
            data,
            total,
            page,
            perPage,
            path: `${req.protocol}://${req.get("host")}${req.baseUrl}${req.path}`,
          });
          res.json({ ...pagePayload, [spec.idName.replace(/_id$/, "s")]: data });
        } catch (error) {
          next(error);
        }
      });

      router.get(`${base}/:${spec.param}`, ...listGuard, async (req, res, next) => {
        try {
          const recordId = req.params[spec.param];
          if (!/^\d+$/.test(String(recordId))) return next();
          const { table, row } = await loadOwnedRow(scope, spec, req.user, recordId);
          if (!table) return next();
          if (!row) return res.status(404).json({ message: "Record not found." });
          const tagged = await presentDedicated(table, row, spec);
          res.json({ data: tagged, [spec.idName.replace(/_id$/, "")]: tagged, ...tagged });
        } catch (error) {
          next(error);
        }
      });

      if (spec.allowWrite) {
        router.put(`${base}/:${spec.param}`, ...guard, (req, res, next) => updateDedicated(req, res, next, scope, spec));
        router.patch(`${base}/:${spec.param}`, ...guard, (req, res, next) => updateDedicated(req, res, next, scope, spec));
      }

      if (spec.allowDelete) {
        router.delete(`${base}/:${spec.param}`, ...guard, async (req, res, next) => {
          try {
            const { table, row } = await loadOwnedRow(scope, spec, req.user, req.params[spec.param]);
            if (!table) return next();
            if (!row) return res.status(404).json({ message: "Record not found." });
            if (await hasColumn(table, "deleted_at")) await update(table, row.id, { deleted_at: new Date() });
            else if (await hasColumn(table, "status")) await update(table, row.id, { status: "cancelled" });
            else return res.status(405).json({ message: "This record cannot be deleted this way." });
            res.json({ message: "Deleted.", [spec.idName]: row.id });
          } catch (error) {
            next(error);
          }
        });
      }

      if (spec.statusActions && spec.actionScopes.includes(scope)) {
        router.post(`${base}/:${spec.param}/:action`, ...guard, async (req, res, next) => {
          try {
            const action = String(req.params.action || "");
            const nextStatus = spec.statusActions[action];
            if (!nextStatus) return next();
            const { table, row } = await loadOwnedRow(scope, spec, req.user, req.params[spec.param]);
            if (!table) return next();
            if (!row) return res.status(404).json({ message: "Record not found." });
            const patch = { status: nextStatus };
            if (action === "reject" && req.body?.rejection_reason && (await hasColumn(table, "rejection_reason"))) {
              patch.rejection_reason = req.body.rejection_reason;
            }
            if (req.body?.notes && (await hasColumn(table, "notes"))) patch.notes = req.body.notes;
            await update(table, row.id, patch);
            const tagged = await presentDedicated(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [row.id]), spec);
            res.json({ message: "Updated.", data: tagged, booking: tagged, order: tagged, ...tagged });
          } catch (error) {
            next(error);
          }
        });
      }
    }
  }
}

async function updateDedicated(req, res, next, scope, spec) {
  try {
    const recordId = req.params[spec.param];
    if (!/^\d+$/.test(String(recordId || ""))) return next();
    const { table, row } = await loadOwnedRow(scope, spec, req.user, recordId);
    if (!table) return next();
    if (!row) return res.status(404).json({ message: "Record not found." });
    const body = visitBodyGuard(scope, table, { ...(req.body ?? {}) });
    delete body.password;
    delete body.id;
    delete body[spec.idName];
    await update(table, row.id, body);
    const tagged = await presentDedicated(table, await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [row.id]), spec);
    res.json({ message: "Updated.", data: tagged, ...tagged });
  } catch (error) {
    next(error);
  }
}
