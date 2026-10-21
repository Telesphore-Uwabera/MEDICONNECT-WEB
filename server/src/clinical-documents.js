import { hasColumn, insert, one, q, tableExists, update } from "./db.js";
import { loadOwnedId } from "./auth.js";

function pdfEscape(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(text, width = 92) {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function buildPlainPdf(title, lines) {
  const all = [title, "", ...lines.flatMap((line) => wrapLine(line, 90))];
  const ops = ["BT", "/F1 16 Tf", "50 760 Td", `(${pdfEscape(all[0] || "MediConnect")}) Tj`, "/F1 10 Tf"];
  for (const line of all.slice(1)) {
    ops.push("0 -14 Td", `(${pdfEscape(line)}) Tj`);
  }
  ops.push("ET");
  const stream = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "utf8");
}

function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function loadPrescriptionItems(prescriptionId) {
  for (const table of ["prescription_items", "prescription_medicines", "prescription_lines"]) {
    if (!(await tableExists(table))) continue;
    if (!(await hasColumn(table, "prescription_id"))) continue;
    const rows = await q(`SELECT * FROM \`${table}\` WHERE prescription_id = ?`, [prescriptionId]).catch(() => []);
    if (rows.length) return rows;
  }
  const rx = await one("SELECT * FROM prescriptions WHERE id = ?", [prescriptionId]).catch(() => null);
  try {
    const embedded = typeof rx?.items_json === "string" ? JSON.parse(rx.items_json) : rx?.items_json || rx?.items;
    return Array.isArray(embedded) ? embedded : [];
  } catch {
    return [];
  }
}

async function patientName(patientId) {
  if (!patientId) return "";
  const row = await one(
    `SELECT u.name FROM patients p LEFT JOIN users u ON u.id = p.user_id WHERE p.id = ? LIMIT 1`,
    [patientId],
  ).catch(() => null);
  return row?.name || `Patient #${patientId}`;
}

async function doctorName(doctorId) {
  if (!doctorId) return "";
  const row = await one(
    `SELECT u.name FROM doctors d LEFT JOIN users u ON u.id = d.user_id WHERE d.id = ? LIMIT 1`,
    [doctorId],
  ).catch(() => null);
  return row?.name || `Doctor #${doctorId}`;
}

export async function prescriptionPdfBuffer(prescriptionId) {
  const rx = await one("SELECT * FROM prescriptions WHERE id = ?", [prescriptionId]).catch(() => null);
  if (!rx) return null;
  const items = await loadPrescriptionItems(rx.id);
  const lines = [
    `Reference: ${rx.prescription_number || `#${rx.id}`}`,
    `Status: ${rx.status || "issued"}`,
    `Patient: ${await patientName(rx.patient_id)}`,
    `Prescriber: ${await doctorName(rx.doctor_id || rx.prescriber_id)}`,
    `Issued: ${rx.issued_at || rx.created_at || ""}`,
    `Valid until: ${rx.valid_until || ""}`,
    `Diagnosis: ${stripHtml(rx.diagnosis)}`,
    `Notes: ${stripHtml(rx.notes)}`,
    "",
    "Medications",
    ...items.map((item, index) => {
      const name = item.medicine_name || item.name || "Medicine";
      return `${index + 1}. ${name} — ${item.dosage || ""} ${item.frequency || ""} ${item.duration || ""} qty ${item.quantity ?? ""} ${item.instructions || ""}`.trim();
    }),
    "",
    "Sending a prescription does not mean the medicine has been purchased or dispensed.",
    "MediConnect LTD",
  ];
  return buildPlainPdf("MediConnect prescription", lines);
}

export async function referralPdfBuffer(referralId) {
  const row = await one("SELECT * FROM referrals WHERE id = ?", [referralId]).catch(() => null);
  if (!row) return null;
  const soap = row.appointment_id
    ? await one("SELECT * FROM consultation_summaries WHERE appointment_id = ? ORDER BY id DESC LIMIT 1", [row.appointment_id]).catch(() => null)
    : row.instant_consultation_id
      ? await one("SELECT * FROM consultation_summaries WHERE instant_consultation_id = ? ORDER BY id DESC LIMIT 1", [row.instant_consultation_id]).catch(() => null)
      : null;
  const lines = [
    `Referral #${row.id}`,
    `Date: ${row.created_at || ""}`,
    `Urgency: ${row.urgency || "medium"}`,
    `Status: ${row.status || "pending"}`,
    `Patient: ${await patientName(row.patient_id)}`,
    `Referring doctor: ${await doctorName(row.doctor_id || row.referring_doctor_id)}`,
    `Facility / pharmacy / specialist IDs: hospital ${row.hospital_id || "-"} pharmacy ${row.pharmacy_id || "-"} doctor ${row.referred_to_doctor_id || "-"}`,
    `Reason: ${stripHtml(row.reason)}`,
    `Notes: ${stripHtml(row.notes)}`,
    soap ? `Chief complaint: ${stripHtml(soap.chief_complaint)}` : "",
    soap ? `Assessment: ${stripHtml(soap.clinical_assessment)}` : "",
    soap ? `Plan: ${stripHtml(soap.management_plan)}` : "",
    "",
    "Do not delay emergency care for booking or email.",
    "MediConnect LTD",
  ].filter(Boolean);
  return buildPlainPdf("MediConnect referral / transfer summary", lines);
}

export async function careOrderPdfBuffer(orderId) {
  const order = await one("SELECT * FROM care_orders WHERE id = ?", [orderId]).catch(() => null);
  if (!order) return null;
  let items = [];
  try {
    items = typeof order.items_json === "string" ? JSON.parse(order.items_json) : order.items_json || [];
  } catch {
    items = [];
  }
  const lines = [
    `Request #${order.id} · ${order.order_type || "investigation"}`,
    `Status: ${order.status || "pending"}`,
    `Urgency: ${order.urgency || "medium"}`,
    `Patient code: ${order.patient_code || "-"}`,
    `Patient: ${await patientName(order.patient_id)}`,
    `Ordering doctor: ${await doctorName(order.doctor_id)}`,
    `Indication: ${stripHtml(order.clinical_notes || order.doctor_message)}`,
    `Requested: ${Array.isArray(items) ? items.join(", ") : String(items || "")}`,
    `Preparation: ${stripHtml(order.protocol_json || "")}`,
    "",
    "This investigation request is stored in the patient file and linked to the consultation.",
    "MediConnect LTD",
  ];
  return buildPlainPdf("MediConnect investigation request", lines);
}

async function sendPdf(res, buffer, filename) {
  if (!buffer) return res.status(404).json({ message: "Document not found." });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

async function patientIdsForUser(userId) {
  const owned = await loadOwnedId(userId, "patients");
  const patient = await one("SELECT * FROM patients WHERE id = ? OR user_id = ? LIMIT 1", [owned, userId]).catch(() => null);
  return new Set([patient?.id, patient?.user_id, userId, owned].filter(Boolean).map(Number));
}

export async function ensurePharmacyPrescriptionRequests() {
  await q(`
    CREATE TABLE IF NOT EXISTS pharmacy_prescription_requests (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      prescription_id BIGINT UNSIGNED NOT NULL,
      pharmacy_id BIGINT UNSIGNED NOT NULL,
      patient_id BIGINT UNSIGNED NULL,
      doctor_id BIGINT UNSIGNED NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'pending',
      delivery_type VARCHAR(40) NULL,
      delivery_address VARCHAR(255) NULL,
      notes TEXT NULL,
      fulfillment_status VARCHAR(40) NULL,
      fulfillment_method VARCHAR(40) NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY ppr_prescription (prescription_id),
      KEY ppr_pharmacy (pharmacy_id)
    )
  `).catch(() => {});
}

export async function enqueuePharmacyPrescription(prescription, body = {}) {
  if (!prescription?.id) return prescription;
  const pharmacyId = Number(body.pharmacy_id || prescription.pharmacy_id) || null;
  const patch = { status: "sent_to_pharmacy" };
  if (pharmacyId && (await hasColumn("prescriptions", "pharmacy_id"))) patch.pharmacy_id = pharmacyId;
  if (body.delivery_type && (await hasColumn("prescriptions", "delivery_type"))) patch.delivery_type = body.delivery_type;
  if (body.delivery_address && (await hasColumn("prescriptions", "delivery_address"))) {
    patch.delivery_address = body.delivery_address;
  }
  if (await hasColumn("prescriptions", "pdf_url")) {
    patch.pdf_url = `/api/v1/patient/prescriptions/${prescription.id}/document`;
  }
  await update("prescriptions", prescription.id, patch).catch(() => null);
  if (pharmacyId) {
    await ensurePharmacyPrescriptionRequests();
    const existing = await one(
      "SELECT id FROM pharmacy_prescription_requests WHERE prescription_id = ? AND pharmacy_id = ? LIMIT 1",
      [prescription.id, pharmacyId],
    ).catch(() => null);
    if (!existing) {
      await insert("pharmacy_prescription_requests", {
        prescription_id: prescription.id,
        pharmacy_id: pharmacyId,
        patient_id: prescription.patient_id || null,
        doctor_id: prescription.doctor_id || null,
        status: "pending",
        delivery_type: body.delivery_type || "pickup",
        delivery_address: body.delivery_address || null,
        notes: body.notes || null,
      }).catch(() => null);
    }
  }
  return one("SELECT * FROM prescriptions WHERE id = ?", [prescription.id]);
}

export async function stampPrescriptionIssued(prescription) {
  if (!prescription?.id) return prescription;
  const patch = {};
  if (await hasColumn("prescriptions", "issued_at") && !prescription.issued_at) patch.issued_at = new Date();
  if (await hasColumn("prescriptions", "pdf_url")) {
    patch.pdf_url = `/api/v1/patient/prescriptions/${prescription.id}/document`;
  }
  if (Object.keys(patch).length) await update("prescriptions", prescription.id, patch).catch(() => null);
  return one("SELECT * FROM prescriptions WHERE id = ?", [prescription.id]);
}

export function registerClinicalDocumentRoutes(router, { requireAuth, requireRole }) {
  const rxDoc = async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const rx = await one("SELECT * FROM prescriptions WHERE id = ?", [id]).catch(() => null);
      if (!rx) return res.status(404).json({ message: "Prescription not found." });
      const role = req.user.active_role;
      if (role === "doctor") {
        const doctorId = await loadOwnedId(req.user.id, "doctors");
        if (Number(rx.doctor_id || rx.prescriber_id) !== Number(doctorId)) {
          return res.status(404).json({ message: "Prescription not found." });
        }
      } else if (role === "patient") {
        const ids = await patientIdsForUser(req.user.id);
        if (!ids.has(Number(rx.patient_id))) return res.status(404).json({ message: "Prescription not found." });
      } else if (role === "pharmacy") {
        const pharmacyId = await loadOwnedId(req.user.id, "pharmacies");
        const request = await one(
          "SELECT id FROM pharmacy_prescription_requests WHERE prescription_id = ? AND pharmacy_id = ? LIMIT 1",
          [id, pharmacyId],
        ).catch(() => null);
        if (!request && Number(rx.pharmacy_id) !== Number(pharmacyId)) {
          return res.status(404).json({ message: "Prescription not found." });
        }
      }
      await sendPdf(res, await prescriptionPdfBuffer(id), `prescription-${id}.pdf`);
    } catch (error) {
      next(error);
    }
  };

  router.get("/doctor/prescriptions/:id/document", requireAuth, requireRole("doctor"), rxDoc);
  router.get("/patient/prescriptions/:id/document", requireAuth, requireRole("patient"), rxDoc);
  router.get("/pharmacy/prescriptions/:id/document", requireAuth, requireRole("pharmacy"), rxDoc);

  const referralDoc = async (req, res, next) => {
    try {
      const id = Number(req.params.id || req.params.referralId);
      const row = await one("SELECT * FROM referrals WHERE id = ?", [id]).catch(() => null);
      if (!row) return res.status(404).json({ message: "Referral not found." });
      if (req.user.active_role === "doctor") {
        const doctorId = await loadOwnedId(req.user.id, "doctors");
        if (Number(row.doctor_id || row.referring_doctor_id) !== Number(doctorId)) {
          return res.status(404).json({ message: "Referral not found." });
        }
      } else {
        const ids = await patientIdsForUser(req.user.id);
        if (!ids.has(Number(row.patient_id))) return res.status(404).json({ message: "Referral not found." });
      }
      await sendPdf(res, await referralPdfBuffer(id), `referral-${id}.pdf`);
    } catch (error) {
      next(error);
    }
  };

  router.get("/doctor/referrals/:id/document", requireAuth, requireRole("doctor"), referralDoc);
  router.get("/patient/referrals/:id/document", requireAuth, requireRole("patient"), referralDoc);

  const orderDoc = async (req, res, next) => {
    try {
      const id = Number(req.params.id || req.params.careOrderId);
      const order = await one("SELECT * FROM care_orders WHERE id = ?", [id]).catch(() => null);
      if (!order) return res.status(404).json({ message: "Request not found." });
      const role = req.user.active_role;
      if (role === "doctor") {
        const doctorId = await loadOwnedId(req.user.id, "doctors");
        if (Number(order.doctor_id) !== Number(doctorId)) return res.status(404).json({ message: "Request not found." });
      } else if (role === "patient") {
        const ids = await patientIdsForUser(req.user.id);
        if (!ids.has(Number(order.patient_id))) return res.status(404).json({ message: "Request not found." });
      } else if (role === "hospital") {
        const hospitalId = await loadOwnedId(req.user.id, "hospitals");
        if (Number(order.hospital_id) !== Number(hospitalId)) return res.status(404).json({ message: "Request not found." });
      } else if (role === "pharmacy") {
        const pharmacyId = await loadOwnedId(req.user.id, "pharmacies");
        if (Number(order.pharmacy_id) !== Number(pharmacyId)) return res.status(404).json({ message: "Request not found." });
      }
      await sendPdf(res, await careOrderPdfBuffer(id), `investigation-${id}.pdf`);
    } catch (error) {
      next(error);
    }
  };

  router.get("/doctor/care-orders/:id/document", requireAuth, requireRole("doctor"), orderDoc);
  router.get("/patient/care-orders/:id/document", requireAuth, requireRole("patient"), orderDoc);
  router.get("/hospital/care-orders/:id/document", requireAuth, requireRole("hospital"), orderDoc);
  router.get("/pharmacy/care-orders/:id/document", requireAuth, requireRole("pharmacy"), orderDoc);
}
