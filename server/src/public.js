import crypto from "crypto";
import { countWhere, hasColumn, insert, knownWrite, paginateList, one, pageArgs, pool, presentRow, presentRows, q, tableExists, update } from "./db.js";
import { readSettingsGroup } from "./system-settings.js";
import { ensureRole } from "./auth.js";
import { doctorIsApproved } from "./doctor-review.js";
import { sendMail, buildEmailHtml, emailP, emailHtml, emailBtn, emailOtpBlock } from "./mail.js";
import { createGuestPassword } from "./guest-password.js";
import { publishSignal, realtimeStats, signalsSince } from "./realtime.js";
import { publicRealtimeConfig } from "./realtime-config.js";
import { callToken, relayDiagnostics, roomFromToken, withLiveIce } from "./call-token.js";
import { notifyPaidVisit, notifyUnconductedInstantVisit } from "./visit-notify.js";
import { handlePublicFitness, markFitnessCertificatePaid } from "./fitness-certificates.js";
import { publicDoctor, publicHospital, publicPharmacy, publicSlot, stripCallSecrets } from "./public-profile.js";
import { containsLike, doctorOrderKey, languageFilterValues, likeContains, publicMedicine } from "./search-text.js";
import { sumPharmacyStock } from "./medicine-stock.js";
import { addIsoDays, upcomingPublicSlots } from "./booking-calendar.js";
import { insuranceCatalogWhere, loadInstantViewer, releaseSlot, settledAppointmentPatch } from "./visit-rules.js";
import { ageSeconds, canJoinInstant, canPayInstant, ownsInstant, placeInQueue, verifiedPaidAmount } from "./instant-visit.js";
import { validateIncomingPhone } from "./phone.js";
import { clientMayClaimEmail, isReservedAccountEmail, isServerGuestAccount } from "./guest-account.js";
import { normalizeLang } from "./user-text.js";
import { withNamedLock } from "./named-lock.js";
import { runningCommit } from "./runtime-commit.js";
import { publicPagePath } from "./public-url.js";

function pathOf(req) {
  return publicPagePath(req);
}

export function teamPhotoUrl(photo) {
  if (!photo) return null;
  if (/^https?:\/\//i.test(photo) || photo.startsWith("/")) return photo;
  if (!/\.(webp|jpe?g|png|gif|bmp|tiff?)$/i.test(String(photo))) return null;
  return `/minio/mediconnect-avatars/${String(photo).replace(/^\/+/, "")}`;
}

export function withTeamPhoto(member) {
  if (!member) return member;
  return {
    ...member,
    photo_url: member.photo_url || teamPhotoUrl(member.photo),
    icon_url: member.icon_url || teamPhotoUrl(member.icon),
  };
}

const UNLISTED_PUBLIC = new Set(["pending", "submitted", "rejected", "suspended", "action_requested", "inactive", "draft"]);

async function overlayPharmacyStock(rows) {
  if (!rows?.length || !(await tableExists("pharmacy_stocks")) || !(await hasColumn("pharmacy_stocks", "medicine_id"))) return rows;
  const ids = [...new Set(rows.map((row) => Number(row.id)).filter((id) => id > 0))];
  if (!ids.length) return rows;
  const stocks = await q(
    `SELECT medicine_id, pharmacy_id, quantity FROM pharmacy_stocks WHERE pharmacy_id IS NOT NULL AND medicine_id IN (${ids.map(() => "?").join(",")})`,
    ids,
  ).catch(() => []);
  return rows.map((row) => ({
    ...row,
    quantity: sumPharmacyStock(stocks.filter((stock) => Number(stock.medicine_id) === Number(row.id)), row.pharmacy_id),
  }));
}

function publiclyListed(status) {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return true;
  return !UNLISTED_PUBLIC.has(value);
}

async function whereActive(table, alias = "") {
  const prefix = alias ? `${alias}.` : "";
  const parts = [];
  if (await hasColumn(table, "deleted_at")) parts.push(`${prefix}deleted_at IS NULL`);
  if (await hasColumn(table, "status")) parts.push(`(${prefix}status = 'active' OR ${prefix}status IS NULL OR ${prefix}status = 'approved')`);
  if (await hasColumn(table, "is_active")) parts.push(`(${prefix}is_active = 1 OR ${prefix}is_active IS NULL)`);
  return parts.length ? parts.join(" AND ") : "1=1";
}

async function attachDoctorRelations(doctors) {
  if (!doctors.length) return [];
  const ids = doctors.map((doctor) => doctor.id);
  const marks = ids.map(() => "?").join(",");
  const specs = await q(
    `SELECT ds.doctor_id, s.id, s.name
     FROM doctor_specialization ds
     JOIN specializations s ON s.id = ds.specialization_id
     WHERE ds.doctor_id IN (${marks})`,
    ids,
  ).catch(() => []);
  const hospitals = await q(
    `SELECT hd.doctor_id, h.id, COALESCE(h.name_en, h.name) AS name, h.city, h.address
     FROM hospital_doctors hd
     JOIN hospitals h ON h.id = hd.hospital_id
     WHERE hd.doctor_id IN (${marks})`,
    ids,
  ).catch(() => []);
  return doctors.map((doctor) => publicDoctor({
    ...doctor,
    name: doctor.name || doctor.user_name,
    user_avatar: doctor.user_avatar,
    hospitals: hospitals.filter((row) => row.doctor_id === doctor.id).map(({ id, name, city }) => ({ id, name, city })),
    specializations: specs.filter((row) => row.doctor_id === doctor.id).map(({ id, name }) => ({ id, name })),
  }));
}

async function facilityInsurances(linkTable, idColumn, id) {
  if (!id || !(await tableExists(linkTable)) || !(await tableExists("insurances"))) return [];
  if (!(await hasColumn(linkTable, idColumn)) || !(await hasColumn(linkTable, "insurance_id"))) return [];
  return q(
    `SELECT i.id, i.name, i.code, i.logo
     FROM \`${linkTable}\` link_row
     JOIN insurances i ON i.id = link_row.insurance_id
     WHERE link_row.\`${idColumn}\` = ?
     ORDER BY i.name`,
    [id],
  ).catch(() => []);
}

function kigaliDay(isoDate) {
  if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const date = new Date(`${isoDate}T00:00:00Z`);
    return {
      date: isoDate,
      weekday: date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }).toLowerCase(),
    };
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Kigali",
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date()).map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: String(parts.weekday || "").toLowerCase(),
  };
}

export async function consultationAmount(row) {
  const stored = Number(row?.amount || 0);
  if (stored > 0) return stored;
  const doctorId = Number(row?.doctor_id) || null;
  if (!doctorId) return 0;
  const doctor = await one(
    "SELECT consultation_fee, specialization_fee_id FROM doctors WHERE id = ?",
    [doctorId],
  ).catch(() => null);
  let amount = Number(doctor?.consultation_fee || 0);
  if (!amount && await tableExists("specialization_fees")) {
    const fee = doctor?.specialization_fee_id
      ? await one(
        "SELECT online_fee FROM specialization_fees WHERE id = ?",
        [doctor.specialization_fee_id],
      ).catch(() => null)
      : await one(
        "SELECT online_fee FROM specialization_fees WHERE sub_specialization = ? ORDER BY id ASC LIMIT 1",
        [doctor?.specialization || ""],
      ).catch(() => null);
    amount = Number(fee?.online_fee || 0);
  }
  return amount;
}

function paymentPublicKey() {
  return String(process.env.PAYMENT_PUBLIC_KEY || process.env.IPAY_PUBLIC_KEY || "").trim();
}

function paymentSecretKey() {
  return String(process.env.PAYMENT_SECRET_KEY || process.env.IPAY_SECRET_KEY || "").trim();
}

function paymentApiBase() {
  const env = String(process.env.PAYMENT_ENVIRONMENT || process.env.IPAY_ENVIRONMENT || "production").toLowerCase();
  if (env === "sandbox") return "https://api.sandbox.irembopay.com/payments";
  if (env === "checkout") return "https://api.checkout.irembopay.com/payments";
  return "https://api.irembopay.com/payments";
}

function isLocalInvoiceNumber(value) {
  return !value || /^MC-/i.test(String(value));
}

/**
 * HMAC over the exact bytes IremboPay sent. The body must not be re-serialised
 * (key order and whitespace change the digest), so this route needs the raw
 * buffer captured by express.json's verify hook.
 */
function webhookSignatureOk(req, secret, header) {
  const digest = crypto.createHmac("sha256", secret)
    .update(req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {})))
    .digest("hex");
  const given = String(header).replace(/^sha256=/i, "").trim().toLowerCase();
  if (given.length !== digest.length) return false;
  return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(given, "hex"));
}

export async function createIremboInvoice({ transactionId, amount, customer, description }) {
  const secret = paymentSecretKey();
  const publicKey = paymentPublicKey();
  const account = String(process.env.PAYMENT_ACCOUNT_IDENTIFIER || "Mediconnect_RWF").trim();
  const amountKey = String(Math.round(Number(amount) || 0));
  const productCode = String(
    process.env[`PAYMENT_PRODUCT_CODE_${amountKey}`] || process.env.PAYMENT_PRODUCT_CODE || "",
  ).trim();
  if (!publicKey || !secret || !productCode) {
    const error = new Error(
      "Payment gateway is not configured. Add PAYMENT_PUBLIC_KEY, PAYMENT_SECRET_KEY, and PAYMENT_PRODUCT_CODE on the API server.",
    );
    error.status = 503;
    throw error;
  }
  const expiryAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const response = await fetch(`${paymentApiBase()}/invoices`, {
    method: "POST",
    headers: {
      "irembopay-secretkey": secret,
      "X-API-Version": "2",
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transactionId: String(transactionId),
      paymentAccountIdentifier: account,
      customer: {
        email: customer.email || undefined,
        phoneNumber: customer.phone || undefined,
        name: customer.name || "Patient",
      },
      paymentItems: [
        {
          unitAmount: Number(amount),
          quantity: 1,
          code: productCode,
        },
      ],
      description: description || `Payment ${transactionId}`,
      expiryAt,
      language: "EN",
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      payload?.errors?.[0]?.detail ||
      payload?.message ||
      payload?.error ||
      `IremboPay invoice create failed (${response.status})`;
    const error = new Error(String(detail));
    error.status = response.status >= 400 && response.status < 600 ? response.status : 502;
    throw error;
  }
  const invoiceNumber =
    payload?.data?.invoiceNumber ||
    payload?.data?.invoice_number ||
    payload?.invoiceNumber ||
    payload?.invoice_number ||
    null;
  if (!invoiceNumber) {
    const error = new Error("IremboPay did not return an invoice number.");
    error.status = 502;
    throw error;
  }
  return { invoiceNumber: String(invoiceNumber), publicKey };
}

async function iremboInvoiceStatus(invoiceNumber) {
  const secret = paymentSecretKey();
  if (!secret || isLocalInvoiceNumber(invoiceNumber)) return null;
  const response = await fetch(`${paymentApiBase()}/invoices/${encodeURIComponent(invoiceNumber)}`, {
    headers: {
      "irembopay-secretkey": secret,
      "X-API-Version": "2",
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  const data = payload?.data;
  if (!data) return null;
  return {
    paymentStatus: String(data.paymentStatus || ""),
    paidAt: data.paidAt || null,
    paymentMethod: data.paymentMethod || null,
    paymentReference: data.paymentReference || null,
    amount: data.amount != null ? Number(data.amount) : (data.totalAmount != null ? Number(data.totalAmount) : null),
  };
}

const DOCTOR_BUSY_MESSAGE = "The doctor is in another consultation. You stay in the queue. You can pay now; the visit starts when the doctor is free.";

async function doctorBusyInstant(doctorId, exceptId = null) {
  if (!doctorId) return null;
  const table = (await tableExists("instant_consultation_requests"))
    ? "instant_consultation_requests"
    : "instant_consultations";
  if (!(await tableExists(table)) || !(await hasColumn(table, "doctor_id"))) return null;
  const params = [doctorId];
  let sql = `SELECT id FROM \`${table}\` WHERE doctor_id = ? AND status IN ('accepted','in_progress')`;
  if (exceptId != null) {
    sql += " AND id <> ?";
    params.push(exceptId);
  }
  sql += " ORDER BY id DESC LIMIT 1";
  const instant = await one(sql, params).catch(() => null);
  if (instant) return instant;
  // A live appointment (video meeting) also makes the doctor busy for instant consults.
  if (await tableExists("appointments") && await hasColumn("appointments", "doctor_id")) {
    const appointment = await one(
      "SELECT id FROM appointments WHERE doctor_id = ? AND LOWER(COALESCE(status,'')) = 'in_progress' ORDER BY id DESC LIMIT 1",
      [doctorId],
    ).catch(() => null);
    if (appointment) return appointment;
  }
  return null;
}

async function doctorNetAmount(gross) {
  const amount = Number(gross);
  if (!(amount > 0)) return 0;
  const group = await readSettingsGroup("payment").catch(() => null);
  const settings = group?.settings || {};
  const raw = settings.commission_percent?.value
    ?? settings.doctor_commission_percent?.value
    ?? settings.platform_fee_percent?.value;
  const percent = Number(raw);
  if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) return amount;
  return Math.round((amount * (100 - percent)) * 100) / 100;
}

async function creditDoctorWallet(doctorId, amount) {
  const credit = await doctorNetAmount(amount);
  if (!doctorId || !(credit > 0) || !(await tableExists("doctor_wallets"))) return;
  const wallet = await one("SELECT * FROM doctor_wallets WHERE doctor_id = ? LIMIT 1", [doctorId]).catch(() => null);
  if (!wallet) {
    const created = await knownWrite("doctor_wallets", {
      doctor_id: doctorId,
      balance: credit,
      total_earned: credit,
      currency: "RWF",
    });
    if (created.payload.doctor_id) await insert("doctor_wallets", created.payload);
    return;
  }
  const sets = [];
  const params = [];
  if (await hasColumn("doctor_wallets", "balance")) {
    sets.push("balance = COALESCE(balance, 0) + ?");
    params.push(credit);
  }
  if (await hasColumn("doctor_wallets", "total_earned")) {
    sets.push("total_earned = COALESCE(total_earned, 0) + ?");
    params.push(credit);
  }
  if (!sets.length) return;
  await pool.query(`UPDATE doctor_wallets SET ${sets.join(", ")} WHERE id = ?`, [...params, wallet.id]);
}

const PAID_PAYMENT_STATUSES = ["paid", "completed", "success", "successful"];

async function claimPaidPayment(payment, patch) {
  const known = await knownWrite("payments", patch);
  const keys = Object.keys(known.payload);
  if (!keys.length || !payment?.id) return false;
  const [result] = await pool.query(
    `UPDATE payments SET ${keys.map((key) => `\`${key}\` = ?`).join(", ")}
     WHERE id = ? AND LOWER(COALESCE(status, '')) NOT IN (${PAID_PAYMENT_STATUSES.map(() => "?").join(",")})`,
    [...keys.map((key) => known.payload[key]), payment.id, ...PAID_PAYMENT_STATUSES],
  );
  return Number(result?.affectedRows || 0) === 1;
}

async function writeKnown(table, id, data) {
  const known = await knownWrite(table, data);
  if (!Object.keys(known.payload).length) return;
  await update(table, id, known.payload);
}

export async function confirmPaidInvoice(payment, remote, { notify = true } = {}) {
  if (!payment?.id) return payment;
  if (remote && !verifiedPaidAmount(payment, remote)) return payment;
  const patch = { status: "paid" };
  if (remote?.paidAt) {
    const paidAt = new Date(remote.paidAt);
    if (!Number.isNaN(paidAt.getTime())) patch.paid_at = paidAt.toISOString().slice(0, 19).replace("T", " ");
  }
  if (remote?.paymentMethod) patch.payment_method = remote.paymentMethod;
  if (remote?.paymentReference) patch.provider_reference = remote.paymentReference;
  const alreadyPaid = PAID_PAYMENT_STATUSES.includes(String(payment.status || "").toLowerCase());
  const claimed = alreadyPaid ? false : await claimPaidPayment(payment, patch);

  const payableId = payment.payable_id;
  const payableType = String(payment.payable_type || "");
  let paidDoctorId = null;
  if (payableId && payableType.includes("instant")) {
    const table = (await tableExists("instant_consultation_requests"))
      ? "instant_consultation_requests"
      : "instant_consultations";
    const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [payableId]).catch(() => null);
    if (row) {
      paidDoctorId = row.doctor_id || null;
      const open = ["pending", "queued", "waiting", "payment_pending", ""].includes(String(row.status || ""));
      const roomName = row.daily_room_name || row.room_name || `instant-${row.id}`;
      const visitPatch = {
        payment_status: "paid",
        ...(open ? { status: "confirmed" } : {}),
      };
      if (!row.room_name && await hasColumn(table, "room_name")) visitPatch.room_name = roomName;
      if (!row.daily_room_name && await hasColumn(table, "daily_room_name")) visitPatch.daily_room_name = roomName;
      await writeKnown(table, row.id, visitPatch);
    }
  }
  if (payableId && payableType.toLowerCase().includes("appointment") && await tableExists("appointments")) {
    const appointment = await one("SELECT * FROM appointments WHERE id = ?", [payableId]).catch(() => null);
    if (appointment) {
      paidDoctorId = appointment.doctor_id || paidDoctorId;
      const visitPatch = settledAppointmentPatch(appointment);
      if (Object.keys(visitPatch).length) await writeKnown("appointments", appointment.id, visitPatch);
    }
  }
  if (payableId && payableType.toLowerCase().includes("fitness")) {
    await markFitnessCertificatePaid(payableId, payment.amount).catch(() => null);
  }
  const saved = (await one("SELECT * FROM payments WHERE id = ?", [payment.id])) || payment;
  if (claimed) {
    await creditDoctorWallet(paidDoctorId, payment.amount).catch(() => null);
    if (notify) notifyPaidVisit(saved).catch(() => null);
  }
  return saved;
}

async function confirmPaidInvoiceAndNotify(payment, remote, account = null) {
  // notify:false — the account-aware notification below is the only one that
  // should go out, otherwise the patient gets a second email without credentials.
  const saved = await confirmPaidInvoice(payment, remote, { notify: false });
  notifyPaidVisit(saved, account).catch(() => null);
  return saved;
}

const UNPAID_PAYMENT = ["pending", "initiated", "new", "unpaid", "processing"];
const CLOSED_VISIT = new Set(["accepted", "in_progress", "completed", "done", "declined", "cancelled", "canceled", "expired", "payment_expired", "rejected"]);
const UNPAID_VISIT_MINUTES = 15;

async function paymentIsDue(payment) {
  if (!payment?.id) return false;
  const due = await one(
    `SELECT
       (
         (expires_at IS NOT NULL AND expires_at < UTC_TIMESTAMP())
         OR (
           created_at IS NOT NULL
           AND created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${UNPAID_VISIT_MINUTES} MINUTE)
         )
       ) AS due
     FROM payments WHERE id = ?`,
    [payment.id],
  ).catch(() => null);
  return Boolean(Number(due?.due));
}

async function ensureEnumValue(table, column, value) {
  if (!(await tableExists(table)) || !(await hasColumn(table, column))) return false;
  const meta = await one(
    `SELECT COLUMN_TYPE AS column_type, IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  ).catch(() => null);
  if (!meta) return false;
  const type = String(meta.column_type || "");
  if (!/^enum\(/i.test(type)) return true;
  if (type.toLowerCase().includes(`'${String(value).toLowerCase()}'`)) return true;
  const widened = type.replace(/\)\s*$/, `,'${value}')`);
  let sql = `ALTER TABLE \`${table}\` MODIFY \`${column}\` ${widened}`;
  sql += String(meta.is_nullable).toUpperCase() === "NO" ? " NOT NULL" : " NULL";
  if (meta.column_default != null && String(meta.column_default).toUpperCase() !== "NULL") {
    sql += ` DEFAULT '${String(meta.column_default).replace(/'/g, "''")}'`;
  }
  await pool.query(sql);
  return true;
}

async function payableAlreadyPaid(payableId) {
  if (!payableId) return false;
  const paid = await one(
    `SELECT id FROM payments WHERE payable_id = ? AND LOWER(status) IN ('paid','completed','success','successful') LIMIT 1`,
    [payableId],
  ).catch(() => null);
  return Boolean(paid);
}

export async function expireLinkedVisit(payment) {
  const payableId = payment?.payable_id || payment?.appointment_id;
  const payableType = String(payment?.payable_type || (payment?.appointment_id ? "appointment" : "")).toLowerCase();
  if (!payableId || await payableAlreadyPaid(payableId)) return;
  if (payableType.includes("instant")) {
    const table = (await tableExists("instant_consultation_requests"))
      ? "instant_consultation_requests"
      : "instant_consultations";
    if (!(await tableExists(table))) return;
    await ensureEnumValue(table, "status", "expired").catch(() => null);
    await ensureEnumValue(table, "status", "payment_expired").catch(() => null);
    await ensureEnumValue(table, "payment_status", "expired").catch(() => null);
    const paidCol = await hasColumn(table, "payment_status");
    const row = await one(`SELECT id, status${paidCol ? ", payment_status" : ""} FROM \`${table}\` WHERE id = ?`, [payableId]).catch(() => null);
    if (!row || CLOSED_VISIT.has(String(row.status || "").toLowerCase())) return;
    if (String(row.payment_status || "").toLowerCase() === "paid") return;
    const expiredStatus = await ensureEnumValue(table, "status", "payment_expired").catch(() => false)
      ? "payment_expired"
      : "expired";
    await writeKnown(table, row.id, { status: expiredStatus, payment_status: "expired" });
    return;
  }
  if (payableType.includes("appointment") && await tableExists("appointments")) {
    await ensureEnumValue("appointments", "status", "expired").catch(() => null);
    await ensureEnumValue("appointments", "payment_status", "expired").catch(() => null);
    const row = await one("SELECT * FROM appointments WHERE id = ?", [payableId]).catch(() => null);
    if (!row || String(row.payment_status || "").toLowerCase() === "paid") return;
    const status = String(row.status || "").toLowerCase();
    if (CLOSED_VISIT.has(status) || ["confirmed"].includes(status)) {
      await writeKnown("appointments", row.id, { payment_status: "expired" });
      return;
    }
    await writeKnown("appointments", row.id, { status: "expired", payment_status: "expired" });
    // The unpaid hold is over — give the minute back to the doctor's calendar.
    await releaseSlot(row);
  }
}

async function expirePaymentRecord(payment) {
  if (!payment?.id) return payment;
  const current = String(payment.status || "").toLowerCase();
  if (["paid", "completed", "success", "successful", "expired", "refunded"].includes(current)) return payment;
  if (!(await paymentIsDue(payment))) return payment;
  const remote = payment.invoice_number && !isLocalInvoiceNumber(payment.invoice_number)
    ? await iremboInvoiceStatus(payment.invoice_number).catch(() => null)
    : null;
  if (remote?.paymentStatus === "PAID") return confirmPaidInvoice(payment, remote);
  await ensureEnumValue("payments", "status", "expired").catch(() => null);
  await update("payments", payment.id, { status: "expired" });
  await expireLinkedVisit(payment).catch(() => null);
  return { ...payment, status: "expired" };
}

async function expireStaleUnpaidVisits() {
  const table = (await tableExists("instant_consultation_requests"))
    ? "instant_consultation_requests"
    : ((await tableExists("instant_consultations")) ? "instant_consultations" : null);
  if (!table || !(await hasColumn(table, "created_at"))) return;
  await ensureEnumValue(table, "status", "expired").catch(() => null);
  await ensureEnumValue(table, "status", "payment_expired").catch(() => null);
  const paidCol = await hasColumn(table, "payment_status");
  if (paidCol) await ensureEnumValue(table, "payment_status", "expired").catch(() => null);
  const expiredStatus = await ensureEnumValue(table, "status", "payment_expired").catch(() => false)
    ? "payment_expired"
    : "expired";
  const unpaidStatus = "status IN ('pending','queued','waiting','payment_pending')";
  const notPaid = paidCol
    ? "AND (payment_status IS NULL OR LOWER(payment_status) NOT IN ('paid','completed','success','successful'))"
    : "";
  const staleClock = `created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${UNPAID_VISIT_MINUTES} MINUTE)`;
  const rows = await q(
    `SELECT id, status${paidCol ? ", payment_status" : ""} FROM \`${table}\`
     WHERE ${unpaidStatus}
       ${notPaid}
       AND ${staleClock}
     ORDER BY id ASC LIMIT 200`,
  ).catch(() => []);
  for (const row of rows) {
    if (await payableAlreadyPaid(row.id)) continue;
    const patch = paidCol ? { status: expiredStatus, payment_status: "expired" } : { status: expiredStatus };
    const saved = await update(table, row.id, patch).catch(() => null);
    if (!saved && paidCol) await update(table, row.id, { status: expiredStatus }).catch(() => null);
  }

  // ── 1-hour timeout for paid instant consultations that were never conducted ──
  const hasStartedAt = await hasColumn(table, "started_at");
  const notStartedSql = hasStartedAt ? "AND started_at IS NULL" : "";
  const unconductedRows = await q(
    `SELECT * FROM \`${table}\`
     WHERE LOWER(status) IN ('confirmed','accepted')
       ${notStartedSql}
       AND created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 MINUTE)
     ORDER BY id ASC LIMIT 100`,
  ).catch(() => []);
  for (const row of unconductedRows) {
    const age = ageSeconds(row.created_at);
    if (age == null || age < 3600) continue;
    if (hasStartedAt && row.started_at) continue;
    await update(table, row.id, { status: "expired" }).catch(() => null);
    if (await tableExists("refunds")) {
      const existingRefund = await one(
        "SELECT id FROM refunds WHERE payable_type = 'instant_consultation' AND payable_id = ? LIMIT 1",
        [row.id],
      ).catch(() => null);
      if (!existingRefund) {
        const refund = await knownWrite("refunds", {
          patient_id: row.patient_id || row.user_id || null,
          doctor_id: row.doctor_id || null,
          amount: row.amount || row.consultation_fee || row.patient_pays || 0,
          reason: "Instant consultation was not conducted within 1 hour",
          status: "pending",
          payable_type: "instant_consultation",
          payable_id: row.id,
        });
        if (Object.keys(refund.payload).length) {
          await insert("refunds", refund.payload).catch(() => null);
        }
      }
    }
    notifyUnconductedInstantVisit(row).catch(() => null);
  }
}

export async function expireUnpaidPayments() {
  if (!(await tableExists("payments")) || !(await hasColumn("payments", "expires_at"))) {
    await expireStaleUnpaidVisits().catch(() => null);
    return { expired: 0 };
  }
  const unpaidHolders = UNPAID_PAYMENT.map(() => "?").join(",");
  const rows = await q(
    `SELECT * FROM payments
     WHERE LOWER(status) IN (${unpaidHolders})
       AND (
         (expires_at IS NOT NULL AND expires_at < UTC_TIMESTAMP())
         OR (expires_at IS NULL AND created_at IS NOT NULL AND created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${UNPAID_VISIT_MINUTES} MINUTE))
       )
     ORDER BY id ASC LIMIT 200`,
    UNPAID_PAYMENT,
  ).catch(() => []);
  let expired = 0;
  for (const payment of rows) {
    const saved = await expirePaymentRecord(payment).catch(() => payment);
    if (String(saved?.status || "").toLowerCase() === "expired") expired += 1;
  }
  await expireStaleUnpaidVisits().catch(() => null);
  return { expired };
}

async function payerRecord(payment) {
  const payableType = String(payment?.payable_type || "");
  const payableId = payment?.payable_id;
  if (!payableId) return null;
  if (payableType.toLowerCase().includes("instant")) {
    const table = (await tableExists("instant_consultation_requests"))
      ? "instant_consultation_requests"
      : "instant_consultations";
    const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [payableId]).catch(() => null);
    return row ? { table, row } : null;
  }
  if (payableType.toLowerCase().includes("appointment") && await tableExists("appointments")) {
    const row = await one("SELECT * FROM appointments WHERE id = ?", [payableId]).catch(() => null);
    return row ? { table: "appointments", row } : null;
  }
  return null;
}

export async function attachPayerAccount(payment) {
  const found = await payerRecord(payment);
  if (!found) return { created: false, email: null, plain: null };
  const { table, row } = found;
  const email = String(row.guest_email || row.email || row.patient_email || "").trim().toLowerCase();

  if (row.user_id) {
    const existing = await one("SELECT email FROM users WHERE id = ? LIMIT 1", [row.user_id]).catch(() => null);
    return { created: false, email: existing?.email || email || null, plain: null };
  }

  if (!email.includes("@")) return { created: false, email: null, plain: null };
  const name = String(row.guest_name || row.patient_name || row.name || email).trim() || email;
  const phone = String(row.guest_phone || row.phone || row.patient_phone || "").trim();

  let user = await one("SELECT * FROM users WHERE email = ? LIMIT 1", [email]).catch(() => null);
  let created = false;
  let plain = null;

  if (!user && isReservedAccountEmail(email)) {
    return { created: false, email: null, plain: null };
  }

  if (!user) {
    const issued = await createGuestPassword();
    plain = issued.plain;
    const rawLang = row.preferred_language || row.language || "";
    try {
      const id = await insert("users", {
        name,
        email,
        phone: phone || null,
        password: issued.password,
        status: "active",
        active_role: "patient",
        is_verified: 1,
        ...(rawLang && await hasColumn("users", "preferred_language")
          ? { preferred_language: normalizeLang(rawLang) }
          : {}),
        ...issued.extra,
      });
      await ensureRole(id, "patient");
      user = await one("SELECT * FROM users WHERE id = ?", [id]);
      created = true;
    } catch (error) {
      user = await one("SELECT * FROM users WHERE email = ? LIMIT 1", [email]).catch(() => null);
      if (!user) {
        console.error("Could not create payer account:", error?.message || error);
        return { created: false, email, plain: null };
      }
    }
  }

  if (user && await tableExists("patients") && !(await one("SELECT id FROM patients WHERE user_id = ? LIMIT 1", [user.id]).catch(() => null))) {
    const known = await knownWrite("patients", {
      user_id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: "active",
    });
    if (known.payload.user_id) {
      await insert("patients", known.payload).catch((error) => console.error("Could not create patient profile:", error?.message || error));
    }
  }

  const patient = user ? await one("SELECT id FROM patients WHERE user_id = ? LIMIT 1", [user.id]).catch(() => null) : null;
  const link = {};
  if (user && await hasColumn(table, "user_id")) link.user_id = user.id;
  if (patient?.id && await hasColumn(table, "patient_id")) link.patient_id = patient.id;
  if (Object.keys(link).length) await writeKnown(table, row.id, link);
  // payments.patient_id stores users.id, the same id appointments.patient_id stores.
  if (user?.id && payment?.id && await hasColumn("payments", "patient_id") && !payment.patient_id) {
    await writeKnown("payments", payment.id, { patient_id: user.id });
  }
  return { created: created || Boolean(plain), email, plain };
}


function kigaliClock() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Kigali",
    weekday: "long",
  }).format(now).toLowerCase();
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Kigali",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const [hour, minute] = time.split(":");
  return { date, weekday, minutes: Number(hour) * 60 + Number(minute) };
}

function clockMinutes(value) {
  const [hour, minute] = String(value || "").split(":");
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function timeCovers(start, end, minutes) {
  const from = clockMinutes(start);
  const to = clockMinutes(end);
  if (from == null || to == null || to <= from) return false;
  return minutes >= from && minutes < to;
}

function listedDays(value) {
  if (Array.isArray(value)) return value.map((day) => String(day).toLowerCase());
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((day) => String(day).toLowerCase());
    } catch {
      return value.split(",").map((day) => day.trim().toLowerCase()).filter(Boolean);
    }
  }
  return [];
}

function dayListed(value, weekday) {
  const days = listedDays(value);
  if (!days.length) return true;
  return days.some((day) => day === weekday || day.startsWith(weekday.slice(0, 3)) || weekday.startsWith(day.slice(0, 3)));
}

function onlineVisit(type) {
  const value = String(type || "").toLowerCase();
  return !value || value === "online" || value === "both" || value === "instant";
}


function scheduleOnDay() {
  return `(
    EXISTS (
      SELECT 1 FROM appointment_slots s
      WHERE s.doctor_id = d.id
        AND s.slot_date = ?
        AND (s.is_active = 1 OR s.is_active IS NULL)
        AND (s.status IS NULL OR s.status IN ('available', 'open'))
    )
    OR EXISTS (
      SELECT 1 FROM doctor_availability_periods p
      WHERE p.doctor_id = d.id
        AND (p.is_active = 1 OR p.is_active IS NULL)
        AND (p.deleted_at IS NULL)
        AND ? BETWEEN DATE(p.from_date) AND DATE(p.to_date)
        AND (
          p.days_of_week IS NULL
          OR p.days_of_week = ''
          OR p.days_of_week = '[]'
          OR LOWER(CAST(p.days_of_week AS CHAR)) LIKE ?
        )
    )
  )`;
}

async function doctorStats(whereSql, params) {
  const total = await countWhere("doctors d JOIN users u ON u.id = d.user_id", whereSql, params);
  const online = await countWhere(
    "doctors d JOIN users u ON u.id = d.user_id",
    `${whereSql} AND (d.consultation_type IN ('online','both') OR d.is_available = 1)`,
    params,
  ).catch(() => total);
  const instant = await countWhere(
    "doctors d JOIN users u ON u.id = d.user_id",
    `${whereSql} AND d.instant_consultation = 1`,
    params,
  ).catch(() => 0);
  return { total, online, instant, available_today: 0 };
}

export function publicRoutes(router) {
  router.get("/public/verify/:certificateNumber", async (req, res, next) => {
    try {
      if (!(await handlePublicFitness(req, res))) next();
    } catch (error) {
      next(error);
    }
  });
  router.get("/public/certificates/file/:token", async (req, res, next) => {
    try {
      if (!(await handlePublicFitness(req, res))) next();
    } catch (error) {
      next(error);
    }
  });
  router.get(["/public/doctors", "/public/doctors/available-doctors"], async (req, res, next) => {
    try {
      const { page, perPage, offset } = pageArgs(req, 15);
      const filters = ["(" + (await whereActive("doctors", "d")) + ")"];
      const params = [];
      if (req.query.q) {
        const like = likeContains(req.query.q);
        const parts = [containsLike("u.name"), containsLike("d.specialization"), containsLike("d.slug")];
        params.push(like, like, like);
        if (await hasColumn("doctors", "city")) {
          parts.push(containsLike("d.city"));
          params.push(like);
        }
        if (await tableExists("hospitals") && await tableExists("hospital_doctors")) {
          parts.push(`EXISTS (
            SELECT 1 FROM hospital_doctors hd
            JOIN hospitals h ON h.id = hd.hospital_id
            WHERE hd.doctor_id = d.id AND (${containsLike("h.name")} OR ${containsLike("COALESCE(h.name_en, h.name)")})
          )`);
          params.push(like, like);
        }
        if (await tableExists("specialization_fees")) {
          const extraFee = await tableExists("doctor_specialization_fees")
            ? `OR EXISTS (
                SELECT 1 FROM doctor_specialization_fees dsf
                WHERE dsf.doctor_id = d.id AND dsf.specialization_fee_id = sf.id
                  AND (dsf.is_active = 1 OR dsf.is_active IS NULL)
              )`
            : "";
          parts.push(`EXISTS (
            SELECT 1 FROM specialization_fees sf
            WHERE (sf.id = d.specialization_fee_id ${extraFee})
              AND (${containsLike("sf.sub_specialization")} OR ${containsLike("sf.sub_specialization_fr")} OR ${containsLike("sf.sub_specialization_kiny")} OR ${containsLike("sf.slug")})
          )`);
          params.push(like, like, like, like);
        }
        filters.push(`(${parts.join(" OR ")})`);
      }
      const specialityName = String(req.query.specialization || "").trim();
      const subName = String(req.query.sub_specialization || "").trim();
      const feeId = Number(req.query.specialization_fee_id);
      if (Number.isFinite(feeId) && feeId > 0) {
        if (await tableExists("doctor_specialization_fees")) {
          filters.push(`(
            d.specialization_fee_id = ?
            OR EXISTS (
              SELECT 1 FROM doctor_specialization_fees dsf
              WHERE dsf.doctor_id = d.id
                AND dsf.specialization_fee_id = ?
                AND (dsf.is_active = 1 OR dsf.is_active IS NULL)
            )
          )`);
          params.push(feeId, feeId);
        } else {
          filters.push("d.specialization_fee_id = ?");
          params.push(feeId);
        }
      } else if (specialityName || subName) {
        const clauses = [];
        for (const name of [...new Set([specialityName, subName].filter(Boolean))]) {
        const like = likeContains(name);
        clauses.push(`(d.specialization = ? OR ${containsLike("d.specialization")})`);
          params.push(name, like);
          if (await tableExists("specialization_fees")) {
            const extraFee = await tableExists("doctor_specialization_fees")
              ? `OR EXISTS (
                  SELECT 1 FROM doctor_specialization_fees dsf
                  WHERE dsf.doctor_id = d.id AND dsf.specialization_fee_id = sf.id
                    AND (dsf.is_active = 1 OR dsf.is_active IS NULL)
                )`
              : "";
            clauses.push(`EXISTS (
              SELECT 1 FROM specialization_fees sf
              WHERE (sf.id = d.specialization_fee_id ${extraFee})
                AND (
                  sf.sub_specialization = ? OR ${containsLike("sf.sub_specialization")}
                  OR sf.sub_specialization_fr = ? OR ${containsLike("sf.sub_specialization_fr")}
                  OR sf.sub_specialization_kiny = ? OR ${containsLike("sf.sub_specialization_kiny")}
                  OR sf.slug = ?
                )
            )`);
            params.push(name, like, name, like, name, like, name);
          }
        }
        if (clauses.length) filters.push(`(${clauses.join(" OR ")})`);
      }
      const consultationType = String(req.query.type || "").toLowerCase();
      if (consultationType === "instant" || req.query.instant === "true") {
        filters.push("d.instant_consultation = 1");
      } else if (consultationType === "booking") {
        filters.push("d.consultation_type IN ('online', 'in_person', 'both', 'booking')");
        filters.push("(d.bookings_paused = 0 OR d.bookings_paused IS NULL)");
      } else if (consultationType) {
        filters.push("d.consultation_type = ?");
        params.push(consultationType);
      }
      if (req.query.language) {
        const values = languageFilterValues(req.query.language);
        if (values.length) {
          const marks = values.map(() => "?").join(", ");
          const parts = [`LOWER(d.preferred_language) IN (${marks})`];
          const langParams = [...values];
          if (await hasColumn("users", "preferred_language")) {
            parts.push(`LOWER(u.preferred_language) IN (${marks})`);
            langParams.push(...values);
          }
          if (await hasColumn("doctors", "languages")) {
            parts.push(`LOWER(d.languages) IN (${marks})`);
            langParams.push(...values);
          }
          filters.push(`(${parts.join(" OR ")})`);
          params.push(...langParams);
        }
      }
      if (req.query.city) {
        const like = likeContains(String(req.query.city).trim().toLowerCase());
        const cityParts = [];
        if (await hasColumn("doctors", "city")) {
          cityParts.push(containsLike("LOWER(d.city)"));
          params.push(like);
        }
        if (await tableExists("hospitals") && await hasColumn("hospitals", "city") && await tableExists("hospital_doctors")) {
          cityParts.push(`EXISTS (
            SELECT 1 FROM hospital_doctors hd
            JOIN hospitals h ON h.id = hd.hospital_id
            WHERE hd.doctor_id = d.id AND ${containsLike("LOWER(h.city)")}
          )`);
          params.push(like);
        }
        filters.push(cityParts.length ? `(${cityParts.join(" OR ")})` : "1 = 0");
      }
      if (req.query.gender && (await hasColumn("users", "gender"))) {
        filters.push("LOWER(u.gender) = ?");
        params.push(String(req.query.gender).toLowerCase());
      }
      if (req.query.hospital_id) {
        filters.push("EXISTS (SELECT 1 FROM hospital_doctors hd WHERE hd.doctor_id = d.id AND hd.hospital_id = ?)");
        params.push(req.query.hospital_id);
      }
      if (req.query.insurance_id) {
        const insuranceId = Number(req.query.insurance_id);
        const insuranceParts = [];
        if (await tableExists("doctor_insurances")) {
          insuranceParts.push("EXISTS (SELECT 1 FROM doctor_insurances di WHERE di.doctor_id = d.id AND di.insurance_id = ?)");
          params.push(insuranceId);
        }
        if (await tableExists("hospital_insurances") && await tableExists("hospital_doctors")) {
          insuranceParts.push(`EXISTS (
            SELECT 1 FROM hospital_doctors hd
            JOIN hospital_insurances hi ON hi.hospital_id = hd.hospital_id
            WHERE hd.doctor_id = d.id AND hi.insurance_id = ?
          )`);
          params.push(insuranceId);
        }
        filters.push(insuranceParts.length ? `(${insuranceParts.join(" OR ")})` : "1 = 0");
      }
      const scheduleDays = [];
      if (req.query.available_today === "true") scheduleDays.push(kigaliDay());
      if (req.query.date) scheduleDays.push(kigaliDay(String(req.query.date).slice(0, 10)));
      const seenDays = new Set();
      for (const day of scheduleDays) {
        const key = `${day.date}|${day.weekday}`;
        if (!day.date || seenDays.has(key)) continue;
        seenDays.add(key);
        filters.push("(d.is_available = 1 OR d.is_available IS NULL)");
        filters.push("(d.bookings_paused = 0 OR d.bookings_paused IS NULL)");
        filters.push(scheduleOnDay());
        params.push(day.date, day.date, `%${day.weekday}%`);
      }
      if (req.user?.id && req.user.active_role === "patient") {
        filters.push("d.user_id <> ?");
        params.push(req.user.id);
      }
      const where = `WHERE ${filters.join(" AND ")}`;
      const total = await countWhere("doctors d JOIN users u ON u.id = d.user_id", where, params);
      const orderKey = doctorOrderKey(req.query);
      const rows = await q(
        `SELECT d.*, u.name AS user_name, u.avatar AS user_avatar
         FROM doctors d JOIN users u ON u.id = d.user_id
         ${where}
         ORDER BY CRC32(CONCAT(d.id, ':', ?)), d.id
         LIMIT ? OFFSET ?`,
        [...params, orderKey, perPage, offset],
      );
      const shaped = await presentRows("doctors", rows);
      const data = await attachDoctorRelations(shaped);
      const stats = await doctorStats(where, params);
      res.json({ ...paginateList({ data, total, page, perPage, path: pathOf(req) }), stats });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/doctors/:slug/availability", async (req, res, next) => {
    try {
      const doctor = await one("SELECT * FROM doctors WHERE slug = ? LIMIT 1", [req.params.slug]);
      if (!doctor) return res.status(404).json({ message: "Doctor not found." });
      if (!doctorIsApproved(doctor.status)) {
        return res.json({
          recurring_availability: [],
          availability_periods: [],
          slots_for_date: [],
        });
      }
      const recurring = await q("SELECT * FROM doctor_availabilities WHERE doctor_id = ?", [doctor.id]).catch(() => []);
      const periods = await q("SELECT * FROM doctor_availability_periods WHERE doctor_id = ?", [doctor.id]).catch(() => []);
      const today = kigaliClock().date;
      const slots = await q(
        "SELECT * FROM appointment_slots WHERE doctor_id = ? AND slot_date = ?",
        [doctor.id, today],
      ).catch(() => []);
      res.json({
        recurring_availability: (await presentRows("doctor_availabilities", recurring)).map(publicSlot),
        availability_periods: (await presentRows("doctor_availability_periods", periods)).map(publicSlot),
        slots_for_date: (await presentRows("appointment_slots", slots)).map(publicSlot),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/doctors/:slug/slots", async (req, res, next) => {
    try {
      const doctor = await one(
        `SELECT d.id, d.slug, d.status, u.name AS user_name
         FROM doctors d LEFT JOIN users u ON u.id = d.user_id
         WHERE d.slug = ? OR d.id = ? LIMIT 1`,
        [req.params.slug, req.params.slug],
      );
      if (!doctor) return res.status(404).json({ message: "Doctor not found." });
      if (!doctorIsApproved(doctor.status)) {
        return res.json({
          doctor: { id: doctor.id, name: doctor.user_name, slug: doctor.slug },
          slots: {},
          dates: [],
          total: 0,
        });
      }
      const now = kigaliClock();
      const requested = req.query.date ? String(req.query.date).slice(0, 10) : "";
      const doctorCard = { id: doctor.id, name: doctor.user_name, slug: doctor.slug };
      if (requested && requested < now.date) {
        return res.json({ doctor: doctorCard, slots: {}, dates: [], total: 0 });
      }
      const from = requested || now.date;
      const to = requested || addIsoDays(now.date, 90);
      const rows = await q(
        `SELECT * FROM appointment_slots
         WHERE doctor_id = ? AND slot_date >= ? AND slot_date <= ?
         ORDER BY slot_date, start_time
         LIMIT 4000`,
        [doctor.id, from, to],
      ).catch(() => []);
      const periods = await q(
        "SELECT * FROM doctor_availability_periods WHERE doctor_id = ?",
        [doctor.id],
      ).catch(() => []);
      const recurring = await q(
        "SELECT * FROM doctor_availabilities WHERE doctor_id = ?",
        [doctor.id],
      ).catch(() => []);
      const presentedRows = await presentRows("appointment_slots", rows).catch(() => rows);
      const presentedPeriods = await presentRows("doctor_availability_periods", periods).catch(() => periods);
      const presentedRecurring = await presentRows("doctor_availabilities", recurring).catch(() => recurring);
      const upcoming = upcomingPublicSlots({
        rows: presentedRows,
        periods: presentedPeriods,
        recurring: presentedRecurring,
        now,
        from,
        to,
      });
      const slots = Object.fromEntries(Object.entries(upcoming.slots || {}).map(([day, list]) => [day, list.map(publicSlot)]));
      res.json({ doctor: doctorCard, ...upcoming, slots });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/doctors/:slug", async (req, res, next) => {
    try {
      const rows = await q(
        `SELECT d.*, u.name AS user_name, u.avatar AS user_avatar
         FROM doctors d JOIN users u ON u.id = d.user_id
         WHERE d.slug = ? LIMIT 1`,
        [req.params.slug],
      );
      if (!rows.length) return res.status(404).json({ message: "Doctor not found." });
      if (!doctorIsApproved(rows[0].status)) return res.status(404).json({ message: "Doctor not found." });
      const [doctor] = await attachDoctorRelations(await presentRows("doctors", rows));
      const safe = publicDoctor(doctor);
      res.json({ data: safe, ...safe });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/hospitals", async (req, res, next) => {
    try {
      const { page, perPage, offset } = pageArgs(req, 12);
      const filters = [await whereActive("hospitals", "h")];
      const params = [];
      if (req.query.q) {
        const like = likeContains(req.query.q);
        const parts = [containsLike("h.city"), containsLike("h.slug")];
        params.push(like, like);
        for (const column of ["name", "name_en", "name_fr", "name_kiny", "address"]) {
          if (await hasColumn("hospitals", column)) {
            parts.push(containsLike(`h.${column}`));
            params.push(like);
          }
        }
        const departmentColumns = [];
        for (const column of ["name_en", "name_fr", "name_kiny", "name"]) {
          if (await hasColumn("hospital_departments", column)) departmentColumns.push(column);
        }
        if (departmentColumns.length) {
          parts.push(`EXISTS (SELECT 1 FROM hospital_departments hd WHERE hd.hospital_id = h.id AND (${departmentColumns.map((column) => containsLike(`hd.${column}`)).join(" OR ")}))`);
          departmentColumns.forEach(() => params.push(like));
        }
        filters.push(`(${parts.join(" OR ")})`);
      }
      if (req.query.city) {
        filters.push("h.city = ?");
        params.push(req.query.city);
      }
      if (req.query.type) {
        filters.push("h.type = ?");
        params.push(req.query.type);
      }
      const where = `WHERE ${filters.join(" AND ")}`;
      const total = await countWhere("hospitals h", where, params);
      const rows = await presentRows("hospitals", await q(`SELECT h.* FROM hospitals h ${where} ORDER BY h.id DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]));
      const ids = rows.map((hospital) => hospital.id).filter((id) => Number(id) > 0);
      const marks = ids.map(() => "?").join(",") || "0";
      const [departments, hours, doctorCounts, insuranceRows] = ids.length
        ? await Promise.all([
          q(`SELECT * FROM hospital_departments WHERE hospital_id IN (${marks})`, ids).catch(() => []),
          q(`SELECT day, day_of_week, open_time, close_time, is_closed, hospital_id FROM hospital_working_hours WHERE hospital_id IN (${marks})`, ids).catch(() => []),
          q(`SELECT hospital_id, COUNT(*) AS total FROM hospital_doctors WHERE hospital_id IN (${marks}) GROUP BY hospital_id`, ids).catch(() => []),
          q(
            `SELECT hi.hospital_id, i.id, i.name, i.code, i.logo
             FROM hospital_insurances hi
             JOIN insurances i ON i.id = hi.insurance_id
             WHERE hi.hospital_id IN (${marks})`,
            ids,
          ).catch(() => []),
        ])
        : [[], [], [], []];
      const grouped = (list, key = "hospital_id") => {
        const map = new Map();
        for (const row of list || []) {
          const id = Number(row[key]);
          if (!map.has(id)) map.set(id, []);
          map.get(id).push(row);
        }
        return map;
      };
      const departmentMap = grouped(departments);
      const hourMap = grouped(hours);
      const countMap = new Map((doctorCounts || []).map((row) => [Number(row.hospital_id), Number(row.total || 0)]));
      const insuranceMap = grouped(insuranceRows);
      const data = rows.map((hospital) => publicHospital({
        ...hospital,
        name_en: hospital.name_en || hospital.name,
        doctors_count: countMap.get(Number(hospital.id)) || 0,
        departments_count: (departmentMap.get(Number(hospital.id)) || []).length,
        departments: departmentMap.get(Number(hospital.id)) || [],
        ...((insuranceMap.get(Number(hospital.id)) || []).length ? { insurances: insuranceMap.get(Number(hospital.id)) } : {}),
        working_hours: hourMap.get(Number(hospital.id)) || [],
      }));
      res.json(paginateList({ data, total, page, perPage, path: pathOf(req) }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/hospitals/:slug", async (req, res, next) => {
    try {
      const row = await one("SELECT * FROM hospitals WHERE slug = ? OR id = ? LIMIT 1", [req.params.slug, req.params.slug]);
      if (!row || !publiclyListed(row.status)) return res.status(404).json({ message: "Hospital not found." });
      const hospital = await presentRow("hospitals", row);
      const departments = await q("SELECT * FROM hospital_departments WHERE hospital_id = ?", [row.id]).catch(() => []);
      const insurances = await facilityInsurances("hospital_insurances", "hospital_id", row.id);
      res.json({
        data: publicHospital({
          ...hospital,
          departments,
          ...(insurances.length ? { insurances } : {}),
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get(["/public/pharmacies", "/public/pharmacies/nearby"], async (req, res, next) => {
    try {
      const { page, perPage, offset } = pageArgs(req, 12);
      const filters = [await whereActive("pharmacies", "p")];
      const params = [];
      if (req.query.q) {
        filters.push(`(${containsLike("p.name")} OR ${containsLike("p.city")} OR ${containsLike("p.slug")})`);
        const like = likeContains(req.query.q);
        params.push(like, like, like);
      }
      if (req.query.city) {
        filters.push("p.city = ?");
        params.push(req.query.city);
      }
      const lat = Number(req.query.lat ?? req.query.latitude);
      const lng = Number(req.query.lng ?? req.query.longitude ?? req.query.lon);
      const canDistance = Number.isFinite(lat) && Number.isFinite(lng)
        && (await hasColumn("pharmacies", "latitude"))
        && (await hasColumn("pharmacies", "longitude"));
      const where = `WHERE ${filters.join(" AND ")}`;
      const total = await countWhere("pharmacies p", where, params);
      const distanceSql = canDistance
        ? ", (6371 * ACOS(LEAST(1, COS(RADIANS(?)) * COS(RADIANS(p.latitude)) * COS(RADIANS(p.longitude) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(p.latitude))))) AS distance_km"
        : "";
      const order = canDistance
        ? "(p.latitude IS NULL OR p.longitude IS NULL), distance_km ASC, p.id DESC"
        : "p.id DESC";
      const selectParams = canDistance ? [lat, lng, lat, ...params, perPage, offset] : [...params, perPage, offset];
      const rows = await presentRows("pharmacies", await q(`SELECT p.*${distanceSql} FROM pharmacies p ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, selectParams));
      const data = await Promise.all(rows.map(async (pharmacy) => {
        const linked = await facilityInsurances("pharmacy_insurances", "pharmacy_id", pharmacy.id);
        return publicPharmacy({
          ...pharmacy,
          working_hours: await q("SELECT * FROM pharmacy_working_hours WHERE pharmacy_id = ?", [pharmacy.id]).catch(() => []),
          ...(linked.length ? { insurances: linked } : {}),
        });
      }));
      const last = Math.max(1, Math.ceil(total / perPage) || 1);
      res.json({
        status: "success",
        data,
        meta: { current_page: page, last_page: last, per_page: perPage, total },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/pharmacies/:slug", async (req, res, next) => {
    try {
      const row = await one("SELECT * FROM pharmacies WHERE slug = ? LIMIT 1", [req.params.slug]);
      if (!row || !publiclyListed(row.status)) return res.status(404).json({ message: "Pharmacy not found." });
      const presented = await presentRow("pharmacies", row);
      const linked = await facilityInsurances("pharmacy_insurances", "pharmacy_id", row.id);
      const pharmacy = publicPharmacy({
        ...presented,
        working_hours: await q("SELECT * FROM pharmacy_working_hours WHERE pharmacy_id = ?", [row.id]).catch(() => []),
        ...(linked.length ? { insurances: linked } : {}),
      });
      res.json({ status: "success", data: pharmacy });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/services", async (req, res, next) => {
    try {
      const { page, perPage, offset } = pageArgs(req, 20);
      const params = [];
      let where = "WHERE 1=1";
      if (await hasColumn("services", "is_active")) where += " AND (is_active = 1 OR is_active IS NULL)";
      if (req.query.search) {
        where += ` AND (${containsLike("title_en")} OR ${containsLike("title_fr")} OR ${containsLike("title_kiny")})`;
        const like = likeContains(req.query.search);
        params.push(like, like, like);
      }
      const total = await countWhere("services", where, params);
      const data = await presentRows("services", await q(`SELECT * FROM services ${where} ORDER BY \`order\` ASC, id ASC LIMIT ? OFFSET ?`, [...params, perPage, offset]).catch(async () => q(`SELECT * FROM services ${where} ORDER BY id ASC LIMIT ? OFFSET ?`, [...params, perPage, offset])));
      res.json(paginateList({ data, total, page, perPage, path: pathOf(req) }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/services/:id", async (req, res, next) => {
    try {
      const service = await presentRow("services", await one("SELECT * FROM services WHERE id = ?", [req.params.id]));
      if (!service) return res.status(404).json({ message: "Service not found." });
      res.json({ service });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/team", async (req, res, next) => {
    try {
      const { page, perPage, offset } = pageArgs(req, 20);
      const params = [];
      let where = "WHERE 1=1";
      if (await hasColumn("team_members", "is_active")) where += " AND (is_active = 1 OR is_active IS NULL)";
      if (req.query.search) {
        where += ` AND ${containsLike("name")}`;
        params.push(likeContains(req.query.search));
      }
      const total = await countWhere("team_members", where, params);
      const data = (await presentRows("team_members", await q(`SELECT * FROM team_members ${where} ORDER BY \`order\` ASC, id ASC LIMIT ? OFFSET ?`, [...params, perPage, offset]).catch(async () => q(`SELECT * FROM team_members ${where} ORDER BY id ASC LIMIT ? OFFSET ?`, [...params, perPage, offset])))).map(withTeamPhoto);
      res.json(paginateList({ data, total, page, perPage, path: pathOf(req) }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/team/:id", async (req, res, next) => {
    try {
      const member = withTeamPhoto(await presentRow("team_members", await one("SELECT * FROM team_members WHERE id = ?", [req.params.id])));
      if (!member) return res.status(404).json({ message: "Team member not found." });
      res.json({ member });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/settings", async (req, res, next) => {
    try {
      const rows = await q("SELECT * FROM system_settings").catch(() => []);
      const settings = { general: {}, video: {}, security: {} };
      for (const row of rows) {
        const key = row.key || row.name || row.setting_key;
        if (!key) continue;
        const namedGroup = row.group || row.group_name;
        const group = settings[namedGroup] ? namedGroup : "general";
        let value = row.value ?? row.setting_value;
        if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
          try { value = JSON.parse(value); } catch { /* keep string */ }
        }
        settings[group][key] = value;
      }
      res.json({ settings });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/stats/login-stats", async (req, res, next) => {
    try {
      const users = await one("SELECT COUNT(*) AS total FROM users");
      res.json({ users_served: Number(users?.total ?? 0), recovery_rate: 0 });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/stats/pharmacies", async (req, res, next) => {
    try {
      const totals = await one("SELECT COUNT(*) AS total FROM pharmacies");
      const medicines = await one("SELECT COUNT(*) AS total FROM medicines").catch(() => ({ total: 0 }));
      const active = await one("SELECT COUNT(*) AS total FROM medicines WHERE is_active = 1").catch(() => medicines);
      const rows = await q("SELECT * FROM pharmacies ORDER BY id DESC LIMIT 50").catch(() => []);
      res.json({
        summary: {
          total_pharmacies: Number(totals?.total ?? 0),
          total_medicines: Number(medicines?.total ?? 0),
          active_medicines: Number(active?.total ?? 0),
        },
        pharmacies: rows.map((row) => publicPharmacy({
          id: row.id,
          name: row.name_en || row.name || row.slug || "Pharmacy",
          slug: row.slug || String(row.id),
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/help-center", async (req, res, next) => {
    try {
      const params = [];
      let where = "WHERE 1=1";
      if (await hasColumn("help_center_links", "is_active")) where += " AND (is_active = 1 OR is_active IS NULL)";
      if (req.query.category) {
        where += " AND category = ?";
        params.push(req.query.category);
      }
      const links = await presentRows("help_center_links", await q(`SELECT * FROM help_center_links ${where} ORDER BY \`order\` ASC, id ASC`, params).catch(async () => q(`SELECT * FROM help_center_links ${where} ORDER BY id ASC`, params)));
      res.json({ links });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/insurances", async (req, res, next) => {
    try {
      const catalog = await insuranceCatalogWhere();
      const insurances = await presentRows("insurances", await q(`SELECT * FROM insurances WHERE ${catalog.sql} ORDER BY name ASC`, catalog.params));
      res.json({ insurances, data: insurances });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/dropdowns/specializations", async (req, res, next) => {
    try {
      const params = [];
      let where = "";
      if (req.query.search) {
        where = `WHERE ${containsLike("name")} OR ${containsLike("slug")}`;
        const like = likeContains(req.query.search);
        params.push(like, like);
      }
      const rows = await presentRows("specializations", await q(`SELECT * FROM specializations ${where} ORDER BY name ASC LIMIT 100`, params));
      res.json(rows.map((row) => ({ ...row, doctorCount: undefined })));
    } catch (error) {
      next(error);
    }
  });

  router.get(["/public/specialization-fees", "/public/dropdowns/specialization-fees"], async (req, res, next) => {
    try {
      const params = [];
      const filters = [];
      if (req.query.specialization_id) {
        filters.push("specialization_id = ?");
        params.push(req.query.specialization_id);
      }
      if (req.query.search) {
        filters.push(`(${containsLike("sub_specialization")} OR ${containsLike("tier_name")} OR ${containsLike("slug")})`);
        const like = likeContains(req.query.search);
        params.push(like, like, like);
      }
      const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      res.json(await presentRows("specialization_fees", await q(`SELECT * FROM specialization_fees ${where} ORDER BY id ASC LIMIT 100`, params)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/dropdowns/specialization-sub-types/:slug", async (req, res, next) => {
    try {
      const specialization = await one("SELECT id, name, slug FROM specializations WHERE slug = ? LIMIT 1", [req.params.slug]);
      const rows = await q(
        "SELECT * FROM specialization_sub_types WHERE slug = ? OR specialization_id = ? ORDER BY name ASC",
        [req.params.slug, specialization?.id ?? 0],
      ).catch(() => []);
      res.json({
        specialization: specialization ?? { id: 0, name: req.params.slug, slug: req.params.slug },
        sub_types: await presentRows("specialization_sub_types", rows),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get(["/public/medicines", "/public/medicines/all"], async (req, res, next) => {
    try {
      const all = req.path.endsWith("/all");
      const { page, perPage, offset } = pageArgs(req, all ? 50 : 20);
      if (!(await tableExists("pharmacy_medicines")) || !(await hasColumn("pharmacy_medicines", "pharmacy_id")) || !(await tableExists("pharmacies"))) {
        const empty = [];
        if (all) return res.json({ count: 0, medicines: empty, data: empty });
        return res.json({ status: "success", count: 0, medicines: empty, data: empty, meta: { current_page: 1, last_page: 1, per_page: perPage, total: 0 } });
      }
      const params = [];
      let where = `WHERE ${await whereActive("pharmacies", "p")}`;
      if (req.query.q || req.query.search) {
        where += ` AND ${containsLike("m.name")}`;
        params.push(likeContains(req.query.q || req.query.search));
      }
      const total = await countWhere("pharmacy_medicines m JOIN pharmacies p ON p.id = m.pharmacy_id", where, params);
      const rows = await q(
        `SELECT m.*, p.name AS pharmacy_name, p.slug AS pharmacy_slug, p.city AS pharmacy_city
         FROM pharmacy_medicines m
         JOIN pharmacies p ON p.id = m.pharmacy_id
         ${where}
         ORDER BY m.id DESC
         LIMIT ? OFFSET ?`,
        [...params, perPage, offset],
      ).catch(() => []);
      const data = (await overlayPharmacyStock(rows)).map((row) => publicMedicine(row));
      const last = Math.max(1, Math.ceil(total / perPage) || 1);
      const body = {
        status: "success",
        count: data.length,
        medicines: data,
        data,
        meta: { current_page: page, last_page: last, per_page: perPage, total },
      };
      if (all) return res.json(body);
      res.json(body);
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/medicines/where", async (req, res, next) => {
    try {
      const term = String(req.query.q || req.query.search || "").trim();
      if (term.length < 2) return res.json({ query: term, count: 0, pharmacies: [] });
      if (!(await tableExists("pharmacy_medicines")) || !(await tableExists("pharmacies"))) {
        return res.json({ query: term, count: 0, pharmacies: [] });
      }
      const rows = await q(
        `SELECT m.id, m.name, m.pharmacy_id, m.quantity, p.name AS pharmacy_name, p.slug AS pharmacy_slug, p.city AS pharmacy_city
         FROM pharmacy_medicines m
         JOIN pharmacies p ON p.id = m.pharmacy_id
         WHERE ${await whereActive("pharmacies", "p")} AND ${containsLike("m.name")}
         ORDER BY p.name, m.name
         LIMIT 50`,
        [likeContains(term)],
      ).catch(() => []);
      const stocked = await overlayPharmacyStock(rows);
      const pharmacies = stocked.map((row) => ({
        medicine: row.name || null,
        in_stock: Number(row.quantity) > 0,
        pharmacy: {
          id: row.pharmacy_id ?? null,
          name: row.pharmacy_name || null,
          slug: row.pharmacy_slug || null,
          city: row.pharmacy_city || null,
        },
      }));
      res.json({ query: term, count: pharmacies.length, pharmacies });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/payments/:uuid/status", async (req, res, next) => {
    try {
      const payment = await one(
        "SELECT * FROM payments WHERE uuid = ? OR transaction_id = ? OR invoice_number = ? LIMIT 1",
        [req.params.uuid, req.params.uuid, req.params.uuid],
      );
      if (!payment) return res.status(404).json({ message: "Payment not found." });
      res.json({ status: payment.status, payment: await presentRow("payments", payment) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/public/contact", async (req, res) => {
    res.json({ message: "Message received." });
  });

  async function instantOwnerIdentity(req) {
    return await loadInstantViewer(req.user) || {
      userId: 0,
      patientIds: [],
      email: "",
      phone: "",
      occupiedUserId: null,
    };
  }

  async function instantRequestTable() {
    if (await tableExists("instant_consultation_requests")) return "instant_consultation_requests";
    if (await tableExists("instant_consultations")) return "instant_consultations";
    return null;
  }

  async function queuePeers(table, doctorId) {
    if (!table) return [];
    if (!doctorId) {
      return q(
        `SELECT id, doctor_id, status, created_at FROM \`${table}\`
         WHERE doctor_id IS NULL AND status IN ('pending','queued','waiting','payment_pending','confirmed','accepted','in_progress')
         ORDER BY id ASC LIMIT 100`,
      ).catch(() => []);
    }
    return q(
      `SELECT id, doctor_id, status, created_at FROM \`${table}\`
       WHERE doctor_id = ? AND status IN ('pending','queued','waiting','payment_pending','confirmed','accepted','in_progress')
       ORDER BY id ASC LIMIT 100`,
      [doctorId],
    ).catch(() => []);
  }

  async function findOpenInstant(table, doctorId, identity) {
    if (!table || !identity) return null;
    const rows = await q(
      `SELECT * FROM \`${table}\`
       WHERE status IN ('pending','queued','waiting','payment_pending','confirmed','accepted','in_progress')
       ORDER BY id DESC LIMIT 100`,
    ).catch(() => []);
    return rows.find((row) => {
      const rowDoctor = row.doctor_id == null || row.doctor_id === "" ? null : Number(row.doctor_id);
      if (doctorId && rowDoctor && rowDoctor !== Number(doctorId)) return false;
      return ownsInstant(row, identity);
    }) || null;
  }

  function instantPayload(row, place, { amount, doctorBusy, created = false, message }) {
    return {
      message,
      is_existing: !created,
      doctor_busy: doctorBusy,
      guest_token: row.guest_token || null,
      queue_position: place.queue_position,
      people_ahead: place.people_ahead,
      you_are_next: place.you_are_next,
      id: row.id,
      amount,
      currency: row.currency || "RWF",
      payment_status: row.payment_status || (row.status === "confirmed" ? "paid" : null),
      status: row.status || "pending",
      can_pay: canPayInstant(row),
      can_join: canJoinInstant(row),
      data: stripCallSecrets(row),
    };
  }

  router.post(["/public/instant-consultations/request", "/public/instant-consultations/request-any"], async (req, res, next) => {
    try {
      const body = { ...(req.body ?? {}) };
      delete body.password;
      delete body.token;
      delete body.amount;
      const doctorId = Number(body.doctor_id) || null;
      const doctor = doctorId ? await one("SELECT * FROM doctors WHERE id = ?", [doctorId]) : null;
      if (doctor && !doctorIsApproved(doctor.status)) {
        return res.status(422).json({ message: "This doctor is not available for consultations yet." });
      }
      if (doctor && !Number(doctor.instant_consultation)) {
        return res.status(422).json({
          message: "This doctor is not offering instant consultations right now.",
        });
      }
      const role = req.user?.active_role || req.user?.role;
      const accountEmail = String(req.user?.email || "");
      void role;
      void accountEmail;
      const rawPhone = body.phone || body.guest_phone || req.user?.phone || "";
      const rawCode = body.country_code || req.user?.country_code || "+250";
      let phone = rawPhone;
      if (rawPhone) {
        const checked = validateIncomingPhone(rawPhone, rawCode);
        if (!checked.ok) return res.status(422).json({ message: checked.message });
        phone = checked.phone;
        body.country_code = checked.country_code;
      }

      const requestedEmail = body.email || body.guest_email || "";
      if (requestedEmail && !clientMayClaimEmail(requestedEmail)) {
        return res.status(422).json({ message: "Choose a different email address." });
      }
      const identity = await instantOwnerIdentity(req);
      if (phone) identity.phone = identity.phone || phone;
      const email = requestedEmail || req.user?.email || "";
      if (email) identity.email = identity.email || email;
      const table = await instantRequestTable();
      if (!table) return res.status(503).json({ message: "Instant consultations are not available." });
      const ownerKey = req.user?.id ? `u${req.user.id}` : `g${phone || email || "anon"}`;
      await withNamedLock(pool, `ic:${doctorId || 0}:${ownerKey}`, async () => {
      const existing = await findOpenInstant(table, doctorId, identity);
      if (existing) {
        const place = placeInQueue(existing, await queuePeers(table, existing.doctor_id));
        const amount = await consultationAmount({ doctor_id: existing.doctor_id, amount: existing.amount });
        const doctorBusy = Boolean(await doctorBusyInstant(existing.doctor_id, existing.id));
        return res.status(200).json(instantPayload(existing, place, {
          amount,
          doctorBusy,
          created: false,
          message: doctorBusy ? DOCTOR_BUSY_MESSAGE : "You already have an open request.",
        }));
      }

      const amount = await consultationAmount({ doctor_id: doctorId });
      let patientId = Number(body.patient_id) || null;
      if (!patientId && req.user?.id && await tableExists("patients")) {
        const patient = await one("SELECT id FROM patients WHERE user_id = ? LIMIT 1", [req.user.id]).catch(() => null);
        patientId = patient?.id ?? null;
      }
      const guestToken = crypto.randomBytes(24).toString("hex");
      const known = await knownWrite(table, {
        doctor_id: doctorId || null,
        patient_id: patientId || null,
        user_id: req.user?.id || null,
        guest_name: body.name || body.guest_name || req.user?.name || null,
        guest_email: email || null,
        guest_phone: phone || null,
        guest_token: guestToken,
        description: body.description || body.symptoms || body.reason || null,
        country_code: body.country_code || null,
        status: Number(amount) > 0 ? "pending" : "confirmed",
        payment_status: Number(amount) > 0 ? "pending" : "paid",
        amount,
        currency: "RWF",
      });
      const id = await insert(table, known.payload);
      const request = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
      const place = placeInQueue(request, await queuePeers(table, doctorId));
      const doctorBusy = Boolean(await doctorBusyInstant(doctorId, id));
      const presented = await presentRow(table, request);
      if (!(Number(amount) > 0)) {
        notifyPaidVisit({
          payable_type: "instant_consultation",
          payable_id: id,
          amount: 0,
          status: "paid",
        }).catch(() => null);
      }
      res.status(201).json(instantPayload(presented || request, place, {
        amount: Number(request?.amount ?? amount),
        doctorBusy,
        created: true,
        message: doctorBusy ? DOCTOR_BUSY_MESSAGE : "Request received.",
      }));
      });
    } catch (error) {
      if (error?.status === 409 && !res.headersSent) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  });

  // The mobile app reads this before opening a socket and falls back to
  // GET /public/consultations/signal/:room when Reverb is not configured.
  // No auth: the values are the same public client settings the web bundle ships.
  router.get("/public/realtime", (_req, res) => {
    res.json(publicRealtimeConfig());
  });

  // Both peers already hold a room token from the join endpoint; presenting it
  // here is what keeps a guessed room name from reading or poisoning someone
  // else's SDP. The token is stripped before relaying so it never appears in
  // the signal log the other peer receives.
  router.post("/public/consultations/signal", (req, res) => {
    const room = String(req.body?.room ?? "").trim();
    if (!room || roomFromToken(req.body?.token) !== room) {
      return res.status(401).json({ message: "A valid room token is required." });
    }
    const { token: _token, ...signal } = req.body;
    publishSignal(room, signal);
    res.json({ message: "Signal sent." });
  });

  router.get("/public/consultations/signal/:room", (req, res) => {
    const room = decodeURIComponent(req.params.room);
    if (roomFromToken(req.query.token) !== room) {
      return res.status(401).json({ message: "A valid room token is required." });
    }
    res.json({ signals: signalsSince(room, req.query.after) });
  });

  // Read-only operator self-check for cross-network calls, so a deployment can
  // be verified with one request instead of reading service logs. It reports
  // which configuration layer is missing and never returns a credential; the
  // relay host and the auth username it does show are already inside every call
  // token the browser receives.
  router.get("/public/consultations/relay-health", (_req, res) => {
    res.json({
      ...relayDiagnostics(),
      signaling: realtimeStats(),
      // POST /deploy refuses to run without this, so a deployment can confirm
      // here that pushes to main will still reach it.
      deploy_webhook_configured: Boolean(String(process.env.DEPLOY_SECRET || "").trim()),
      commit: runningCommit(),
    });
  });

  router.get("/public/instant-consultations/:token/status", async (req, res, next) => {
    try {
      await expireUnpaidPayments().catch(() => null);
      const table = (await tableExists("instant_consultation_requests")) ? "instant_consultation_requests" : "instant_consultations";
      // Token only. `OR id = ?` let anyone walk the numeric ids and read — and
      // then write, via the status field below — other patients' consultations.
      const row = await one(
        `SELECT * FROM \`${table}\` WHERE guest_token = ? ORDER BY id DESC LIMIT 1`,
        [req.params.token],
      ).catch(() => null);
      if (!row) return res.status(404).json({ message: "Consultation not found." });
      if (req.user && !ownsInstant(row, await instantOwnerIdentity(req))) {
        return res.status(404).json({ message: "Consultation not found." });
      }
      const payment = await one(
        "SELECT * FROM payments WHERE payable_id = ? AND payable_type LIKE '%instant%' ORDER BY id DESC LIMIT 1",
        [row.id],
      ).catch(() => null);
      if (payment) {
        const paymentStatus = String(payment.status || "").toLowerCase();
        if (["paid", "completed", "success", "successful"].includes(paymentStatus)) {
          if (String(row.payment_status || "").toLowerCase() !== "paid") {
            const open = ["pending", "queued", "waiting", "payment_pending", ""].includes(String(row.status || "").toLowerCase());
            const roomName = row.daily_room_name || row.room_name || `instant-${row.id}`;
            const patch = {
              payment_status: "paid",
              ...(open ? { status: "confirmed" } : {}),
            };
            if (!row.room_name && await hasColumn(table, "room_name")) patch.room_name = roomName;
            if (!row.daily_room_name && await hasColumn(table, "daily_room_name")) patch.daily_room_name = roomName;
            await writeKnown(table, row.id, patch);
          }
        } else if (payment.invoice_number && !isLocalInvoiceNumber(payment.invoice_number)) {
          const remote = await iremboInvoiceStatus(payment.invoice_number).catch(() => null);
          if (verifiedPaidAmount(payment, remote)) {
            await confirmPaidInvoice(payment, remote).catch(() => null);
          } else if (remote?.paymentStatus !== "PAID") {
            await expirePaymentRecord(payment).catch(() => null);
          }
        } else {
          await expirePaymentRecord(payment).catch(() => null);
        }
      } else {
        const age = ageSeconds(row.created_at);
        const waiting = ["pending", "queued", "waiting", "payment_pending"].includes(String(row.status || "").toLowerCase());
        const unpaid = !row.payment_status || UNPAID_PAYMENT.includes(String(row.payment_status).toLowerCase());
        if (waiting && unpaid && age != null && age > 30 * 60) {
          await ensureEnumValue(table, "status", "expired").catch(() => null);
          await writeKnown(table, row.id, { status: "expired", payment_status: "expired" });
        }
      }
      const fresh = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [row.id]).catch(() => row) || row;
      const ownCall = canJoinInstant(fresh);
      const doctorBusy = !ownCall && Boolean(await doctorBusyInstant(fresh.doctor_id, fresh.id));
      const roomName = fresh.daily_room_name || fresh.room_name || `instant-${fresh.id}`;
      const guestToken = ownCall
        ? (withLiveIce(fresh.daily_guest_token) || callToken({
          room: roomName,
          role: "patient",
          consultationId: fresh.id,
          name: fresh.guest_name || "Patient",
        }))
        : null;
      const place = placeInQueue(fresh, await queuePeers(table, fresh.doctor_id));
      const amount = await consultationAmount({ doctor_id: fresh.doctor_id, amount: fresh.amount });
      res.json({
        id: fresh.id,
        status: fresh.status || "pending",
        payment_status: fresh.payment_status || (fresh.status === "confirmed" ? "paid" : null),
        queue_position: place.queue_position,
        people_ahead: place.people_ahead,
        you_are_next: place.you_are_next,
        age_seconds: ageSeconds(fresh.created_at),
        can_pay: canPayInstant(fresh),
        can_join: ownCall,
        doctor_busy: doctorBusy,
        message: fresh.status === "expired" || fresh.status === "payment_expired"
          ? "This payment expired because it was not completed."
          : (doctorBusy ? DOCTOR_BUSY_MESSAGE : null),
        room_url: ownCall ? (fresh.daily_room_url || fresh.room_url || `/consultation/${roomName}`) : null,
        daily_room_name: ownCall ? roomName : null,
        daily_guest_token: guestToken,
        amount,
        currency: fresh.currency || "RWF",
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/public/instant-consultations/pay/:id", async (req, res, next) => {
    try {
      const table = (await tableExists("instant_consultation_requests")) ? "instant_consultation_requests" : "instant_consultations";
      const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [req.params.id]);
      if (!row) return res.status(404).json({ message: "Consultation not found." });
      if (req.user) {
        if (!ownsInstant(row, await instantOwnerIdentity(req))) {
          return res.status(404).json({ message: "Consultation not found." });
        }
      } else if (!req.body?.guest_token || req.body.guest_token !== row.guest_token) {
        return res.status(404).json({ message: "Consultation not found." });
      }
      const amount = await consultationAmount({ doctor_id: row.doctor_id, amount: row.amount });
      if (!(amount > 0)) {
        return res.status(422).json({ message: "This consultation has no payable fee." });
      }
      const expiresAt = new Date(Date.now() + UNPAID_VISIT_MINUTES * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
      const customer = {
        name: row.guest_name || row.patient_name || "Patient",
        phone: row.guest_phone || row.phone || "",
        email: row.guest_email || row.email || "",
      };

      let payment = null;
      if (await tableExists("payments")) {
        payment = await one(
          "SELECT * FROM payments WHERE payable_type = ? AND payable_id = ? AND status IN ('initiated','pending') ORDER BY id DESC LIMIT 1",
          ["instant_consultation", row.id],
        ).catch(() => null);
        if (payment && await paymentIsDue(payment)) {
          await expirePaymentRecord(payment).catch(() => null);
          payment = null;
        } else if (payment?.id && Number(payment.amount || 0) !== amount) {
          await update("payments", payment.id, { amount });
          payment.amount = amount;
        }
      }

      let invoiceNumber = payment?.invoice_number || null;
      let publicKey = paymentPublicKey();
      if (isLocalInvoiceNumber(invoiceNumber)) {
        const created = await createIremboInvoice({
          transactionId: payment?.transaction_id || payment?.uuid || `IC-${row.id}-${Date.now()}`,
          amount,
          customer,
          description: `Instant consultation ${row.id}`,
        });
        invoiceNumber = created.invoiceNumber;
        publicKey = created.publicKey;
      }
      if (!publicKey) {
        return res.status(503).json({
          message: "Payment gateway is not configured. Add PAYMENT_PUBLIC_KEY on the API server.",
        });
      }

      if (await tableExists("payments")) {
        if (payment?.id) {
          await update("payments", payment.id, {
            invoice_number: invoiceNumber,
            amount,
            expires_at: expiresAt,
            description: `Instant consultation ${row.id}`,
          });
        } else {
          let payerUserId = Number(req.user?.id || row.user_id) || null;
          if (!payerUserId && row.patient_id && await tableExists("patients")) {
            const patientRow = await one("SELECT user_id FROM patients WHERE id = ? LIMIT 1", [row.patient_id]).catch(() => null);
            payerUserId = Number(patientRow?.user_id) || null;
          }
          const paymentUuid = crypto.randomUUID();
          const paymentId = await insert("payments", {
            uuid: paymentUuid,
            payable_type: "instant_consultation",
            payable_id: row.id,
            invoice_number: invoiceNumber,
            transaction_id: paymentUuid,
            idempotency_key: paymentUuid,
            amount,
            currency: row.currency || "RWF",
            status: "pending",
            description: `Instant consultation ${row.id}`,
            expires_at: expiresAt,
            patient_id: payerUserId,
            payment_account_identifier: process.env.PAYMENT_ACCOUNT_IDENTIFIER || "Mediconnect_RWF",
          });
          payment = { id: paymentId, uuid: paymentUuid };
        }
      }

      const remote = await iremboInvoiceStatus(invoiceNumber).catch(() => null);
      if (verifiedPaidAmount({ ...payment, amount }, remote)) {
        let account = null;
        if (payment?.id) {
          payment = await confirmPaidInvoice(payment, remote, { notify: false });
          account = await attachPayerAccount(payment).catch(() => null);
          payment.account_created = Boolean(account?.created);
          payment.account_email = account?.email || null;
          payment.account_temp_password = account?.plain || null;
          // Notify with account so patient email includes sign-in credentials
          const notice = await notifyPaidVisit(payment, account).catch(() => null);
          if (notice?.tempPassword) payment.account_temp_password = notice.tempPassword;
        }
        const tempPassword = payment?.account_temp_password || account?.plain || null;
        const accountEmail = payment?.account_email || account?.email || null;
        const accountCreated = Boolean(payment?.account_created || account?.created || tempPassword);

        return res.json({
          message: "Payment already completed.",
          status: "paid",
          already_paid: true,
          account_created: accountCreated,
          account_email: accountEmail,
          temp_password: tempPassword,
          invoice_number: invoiceNumber,
          public_key: publicKey,
          amount,
          currency: row.currency || "RWF",
          payment_uuid: payment?.uuid || payment?.payment_uuid || null,
        });
      }

      res.json({
        message: "Payment started.",
        status: "pending",
        invoice_number: invoiceNumber,
        public_key: publicKey,
        amount,
        currency: row.currency || "RWF",
        payment_uuid: payment?.uuid || null,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/public/payments/check-invoice/:invoice", async (req, res, next) => {
    try {
      const invoice = decodeURIComponent(req.params.invoice);
      let payment = await one(
        "SELECT * FROM payments WHERE invoice_number = ? OR uuid = ? OR transaction_id = ? ORDER BY id DESC LIMIT 1",
        [invoice, invoice, invoice],
      ).catch(() => null);
      let account = null;
      if (payment && String(payment.status).toLowerCase() !== "paid") {
        const remote = await iremboInvoiceStatus(payment.invoice_number || invoice).catch(() => null);
        if (verifiedPaidAmount(payment, remote)) {
          payment = await confirmPaidInvoice(payment, remote, { notify: false });
          account = await attachPayerAccount(payment).catch(() => null);
          payment.account_created = Boolean(account?.created);
          payment.account_email = account?.email || null;
          payment.account_temp_password = account?.plain || null;
          const notice = await notifyPaidVisit(payment, account).catch(() => null);
          if (notice?.tempPassword) payment.account_temp_password = notice.tempPassword;
        } else {
          payment = await expirePaymentRecord(payment);
        }
      }
      if (payment && String(payment.status) === "paid") {
        account = await attachPayerAccount(payment).catch(() => null);
        if (account?.created || account?.plain) {
          payment.account_created = true;
          payment.account_email = account.email || payment.account_email;
          payment.account_temp_password = account.plain || payment.account_temp_password;
        }
      }
      const tempPassword = payment?.account_temp_password || account?.plain || null;
      const accountEmail = payment?.account_email || account?.email || null;
      const accountCreated = Boolean(payment?.account_created || account?.created || tempPassword);

      res.json({
        status: payment?.status || "pending",
        account_created: accountCreated,
        account_email: accountEmail,
        temp_password: tempPassword,
        payment: payment ? await presentRow("payments", payment) : null,
        // Also return the consultation status so the frontend can transition
        // to "accepted" immediately when status=confirmed and payment=paid.
        consultation: await (async () => {
          if (!payment?.payable_id || !String(payment?.payable_type || "").includes("instant")) return null;
          const table = (await tableExists("instant_consultation_requests"))
            ? "instant_consultation_requests" : "instant_consultations";
          // SELECT * because room_name/payment_status are not present on every
          // deployment's instant table, and a named column list would fail here.
          const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [payment.payable_id]).catch(() => null);
          if (!row) return null;
          const roomName = row.daily_room_name || row.room_name || `instant-${row.id}`;
          return {
            id: row.id,
            status: row.status,
            payment_status: row.payment_status,
            room_name: roomName,
            room_url: `/consultation/${roomName}`,
            daily_guest_token: withLiveIce(row.daily_guest_token) || callToken({
              room: roomName, role: "patient", consultationId: row.id,
              name: "Patient",
            }),
          };
        })(),
      });
    } catch (error) {
      next(error);
    }
  });

  // ── IremboPay payment webhook ──────────────────────────────────────────────
  // IremboPay POSTs to this URL when a payment status changes.
  // Configure this URL in the IremboPay dashboard:
  //   https://api.mediconnect.rw/api/v1/public/payment/webhook
  //
  // Signature verification: IremboPay sends an HMAC-SHA256 signature in the
  // `irembopay-signature` header, computed over the raw request body using the
  // PAYMENT_SECRET_KEY. A wrong signature is rejected. A configured secret
  // always re-queries IremboPay, and only a PAID invoice whose amount matches
  // the stored payment settles the visit. A missing secret does not settle.
  router.post("/public/payment/webhook", async (req, res, next) => {
    try {
      const secret = paymentSecretKey();
      if (!secret) {
        return res.status(503).json({ message: "Payment webhook is not configured." });
      }
      const sigHeader = String(req.headers["irembopay-signature"] || req.headers["x-irembopay-signature"] || "");
      if (sigHeader && !webhookSignatureOk(req, secret, sigHeader)) {
        return res.status(401).json({ message: "Webhook signature mismatch." });
      }

      const payload = req.body ?? {};
      const invoiceNumber = payload.invoiceNumber || payload.invoice_number || payload.invoice || null;
      if (!invoiceNumber) {
        return res.json({ received: true, processed: false });
      }

      const payment = await one(
        "SELECT * FROM payments WHERE invoice_number = ? OR transaction_id = ? ORDER BY id DESC LIMIT 1",
        [invoiceNumber, payload.transactionId || invoiceNumber],
      ).catch(() => null);

      if (!payment) {
        return res.json({ received: true, processed: false, reason: "invoice_not_found" });
      }

      if (String(payment.status).toLowerCase() === "paid") {
        return res.json({ received: true, processed: false, reason: "already_paid" });
      }

      const proof = isLocalInvoiceNumber(invoiceNumber)
        ? null
        : await iremboInvoiceStatus(invoiceNumber).catch(() => null);
      if (!verifiedPaidAmount(payment, proof)) {
        const mismatch = proof?.paymentStatus === "PAID" && proof?.amount != null && proof.amount !== "" && Number(proof.amount) !== Number(payment.amount);
        return res.status(mismatch ? 400 : 202).json({
          received: true,
          processed: false,
          reason: mismatch ? "amount_mismatch" : "provider_unverified",
        });
      }
      const remote = proof;
      const confirmed = await confirmPaidInvoice(payment, remote, { notify: false });
      const account = await attachPayerAccount(confirmed).catch(() => null);
      // Notify with the account so a new guest's email actually carries their credentials.
      notifyPaidVisit(confirmed, account).catch(() => null);
      const accountCreated = Boolean(account?.created || account?.plain);

      res.json({
        received: true,
        processed: true,
        payment_id: confirmed.id,
        account_created: accountCreated,
      });
    } catch (error) {
      // Always return 200 to IremboPay so it doesn't retry forever;
      // log the error internally.
      console.error("[webhook] IremboPay webhook processing error:", error?.message || error);
      res.json({ received: true, processed: false, error: String(error?.message || "internal error") });
    }
  });

  router.get("/public/medicines/pharmacy/:slug", async (req, res, next) => {
    try {
      const pharmacy = await one("SELECT * FROM pharmacies WHERE slug = ? OR id = ? LIMIT 1", [req.params.slug, req.params.slug]);
      if (!pharmacy || !publiclyListed(pharmacy.status)) return res.status(404).json({ message: "Pharmacy not found." });
      const params = [pharmacy.id];
      let where = "WHERE m.pharmacy_id = ?";
      if (req.query.q) {
        where += ` AND ${containsLike("m.name")}`;
        params.push(likeContains(req.query.q));
      }
      const rows = await q(
        `SELECT m.*, ? AS pharmacy_name, ? AS pharmacy_slug, ? AS pharmacy_city
         FROM pharmacy_medicines m
         ${where}
         ORDER BY m.name
         LIMIT 100`,
        [pharmacy.name || pharmacy.name_en || null, pharmacy.slug || null, pharmacy.city || null, ...params],
      ).catch(() => []);
      const data = (await overlayPharmacyStock(rows)).map((row) => publicMedicine(row));
      res.json({ data, medicines: data, count: data.length });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/medicines/availability", async (req, res, next) => {
    try {
      const medicine = await one(
        `SELECT m.*, p.name AS pharmacy_name, p.slug AS pharmacy_slug, p.city AS pharmacy_city
         FROM pharmacy_medicines m
         JOIN pharmacies p ON p.id = m.pharmacy_id
         WHERE m.id = ? AND ${await whereActive("pharmacies", "p")}
         LIMIT 1`,
        [req.query.medicine_id],
      ).catch(() => null);
      const [listedRow] = medicine ? await overlayPharmacyStock([medicine]) : [];
      const listed = listedRow ? publicMedicine(listedRow) : null;
      res.json({ available: Boolean(listed?.in_stock), medicine: listed });
    } catch (error) {
      next(error);
    }
  });

  router.get(["/public/dropdowns/specialization-fees", "/public/specialization-fees"], async (req, res, next) => {
    try {
      const params = [];
      let where = "WHERE 1=1";
      if (req.query.specialization_id) {
        where += " AND (specialization_id = ? OR id = ?)";
        params.push(req.query.specialization_id, req.query.specialization_id);
      }
      if (req.query.search) {
        where += ` AND (${containsLike("sub_specialization")} OR ${containsLike("sub_specialization_fr")} OR ${containsLike("sub_specialization_kiny")})`;
        const like = likeContains(req.query.search);
        params.push(like, like, like);
      }
      const rows = await presentRows("specialization_fees", await q(`SELECT * FROM specialization_fees ${where} ORDER BY id LIMIT 200`, params).catch(() => []));
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/legal-documents/:type", async (req, res, next) => {
    try {
      const row = await one(
        "SELECT * FROM legal_documents WHERE (type = ? OR id = ?) AND deleted_at IS NULL ORDER BY is_current DESC, is_active DESC, id DESC LIMIT 1",
        [req.params.type, req.params.type],
      ).catch(() => null);
      if (!row) return res.status(404).json({ message: "Document not found." });
      res.json(await presentRow("legal_documents", row));
    } catch (error) {
      next(error);
    }
  });

  router.get("/public/page-setup/terms/:type", async (req, res, next) => {
    try {
      const row = await one(
        "SELECT * FROM legal_documents WHERE type = ? AND deleted_at IS NULL ORDER BY is_current DESC, is_active DESC, id DESC LIMIT 1",
        [req.params.type],
      ).catch(() => null);
      res.json({
        title: row?.title || row?.title_en || req.params.type,
        content: row?.content || row?.content_en || row?.body || "",
        data: row ? await presentRow("legal_documents", row) : null,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/health", async (_req, res) => {
    res.json({
      status: true,
      service: "mediconnect-node",
      database: process.env.DB_DATABASE || "mediconnect",
      commit: runningCommit(),
    });
  });
}

export function paymentUuid() {
  return crypto.randomUUID();
}
