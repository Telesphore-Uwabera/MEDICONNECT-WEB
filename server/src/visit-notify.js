import { hasColumn, insert, one, q, tableExists, update } from "./db.js";
import { sendMail, buildEmailHtml, emailBtn, emailInfoBox, emailP, emailHtml, emailOtpBlock } from "./mail.js";
import { greeting as greetPerson, pick } from "./user-text.js";
import { guestAccessLine, reissueGuestPassword } from "./guest-password.js";
import { languageForUserId } from "./user-language.js";
import { broadcast } from "./realtime.js";
import { beginReadyMail, finishReadyMail, renewReadyMail, READY_CLAIM_RENEW_MS, READY_MAIL_TIMEOUT_MS } from "./ready-mail.js";
import { visitAwaitsPayment } from "./visit-rules.js";

const reminded = new Set();

// ─── In-app notification helper ───────────────────────────────────────────────
async function notifyInApp(userId, title, message, type) {
  if (!userId || !(await tableExists("notifications")) || !(await hasColumn("notifications", "notifiable_id"))) return;
  const fields = {
    notifiable_id: userId,
    data: JSON.stringify({ title, message, body: message }),
  };
  if (await hasColumn("notifications", "type")) fields.type = type;
  if (await hasColumn("notifications", "notifiable_type")) fields.notifiable_type = "App\\Models\\User";
  const now = new Date();
  if (await hasColumn("notifications", "created_at")) fields.created_at = now;
  if (await hasColumn("notifications", "updated_at")) fields.updated_at = now;
  try {
    await insert("notifications", fields);
    return true;
  } catch {
    return false;
  }
}

// ─── Contact resolution helpers ───────────────────────────────────────────────
async function doctorContact(doctorId) {
  if (!doctorId) return null;
  const row = await one(
    `SELECT d.id, u.id AS user_id, u.name, u.email, u.phone
     FROM doctors d JOIN users u ON u.id = d.user_id WHERE d.id = ? LIMIT 1`,
    [doctorId],
  ).catch(() => null);
  if (!row) return null;
  return { ...row, lang: await languageForUserId(row.user_id) };
}

// A "any available doctor" request carries no doctor_id, so nobody is the
// obvious recipient. The queue endpoint shows such rows to every doctor
// (`doctor_id = ? OR doctor_id IS NULL`), so the matching audience for a
// notification is every doctor currently flagged as accepting instant work.
async function instantAvailableDoctors(limit = 50) {
  if (!(await tableExists("doctors"))) return [];
  if (!(await hasColumn("doctors", "instant_consultation"))) return [];
  return q(
    `SELECT d.id, u.id AS user_id, u.name
     FROM doctors d JOIN users u ON u.id = d.user_id
     WHERE d.instant_consultation = 1
     ORDER BY d.id ASC LIMIT ?`,
    [limit],
  ).catch(() => []);
}

function cleanContact(value) {
  return String(value || "").trim();
}

function sameContact(left, right, phone = false) {
  const a = cleanContact(left);
  const b = cleanContact(right);
  if (!a || !b) return a || b;
  if (phone) {
    const digits = (value) => String(value).replace(/[+\s\-()]/g, "");
    return digits(a) === digits(b) ? a : null;
  }
  return a.toLowerCase() === b.toLowerCase() ? a : null;
}

/** Null when two stored copies of the same channel disagree. */
function agreed(primary, secondary, phone = false) {
  const a = cleanContact(primary);
  const b = cleanContact(secondary);
  if (a && b && sameContact(a, b, phone) == null) return null;
  return a || b;
}

async function provenAccount(userId) {
  let user;
  try {
    user = await one(
      "SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
  } catch {
    return null;
  }
  if (!user || !Number(user.id)) return null;
  return {
    userId: Number(user.id),
    name: cleanContact(user.name) || "Patient",
    email: cleanContact(user.email),
    phone: cleanContact(user.phone),
    lang: await languageForUserId(user.id),
  };
}

/** `unknown` means the patients table could not be read. That is not "no profile". */
async function lookupProfile(patientId) {
  try {
    if (!(await tableExists("patients"))) return { status: "unknown" };
  } catch {
    return { status: "unknown" };
  }
  try {
    const profile = await one(
      "SELECT user_id, name, email, phone FROM patients WHERE id = ? LIMIT 1",
      [patientId],
    );
    return { status: "ok", profile: profile || null };
  } catch {
    return { status: "unknown" };
  }
}

async function patientNotice(row) {
  return await patientContact(row) || { userId: null, name: "Patient", email: "", phone: "" };
}

async function patientContact(row) {
  const userId = Number(row?.user_id) || null;
  const patientId = Number(row?.patient_id) || null;
  // Appointment rows copy the account id into patient_id. A different patient_id
  // is a profile id and must name that same account.
  if (userId && patientId && patientId !== userId) {
    const found = await lookupProfile(patientId);
    if (found.status !== "ok") return null;
    const ownerId = Number(found.profile?.user_id) || null;
    if (!found.profile || ownerId !== userId) return null;
    return provenAccount(userId);
  }
  if (userId) return provenAccount(userId);
  if (patientId) {
    const found = await lookupProfile(patientId);
    if (found.status !== "ok" || !found.profile) return null;
    const ownerId = Number(found.profile.user_id) || null;
    if (ownerId) return provenAccount(ownerId);
    const email = cleanContact(found.profile.email);
    const phone = cleanContact(found.profile.phone);
    if (!email && !phone) return null;
    return { userId: null, name: cleanContact(found.profile.name) || "Patient", email, phone, lang: "en" };
  }
  const email = agreed(row?.guest_email, row?.email);
  const phone = agreed(row?.guest_phone, row?.phone, true);
  if (email == null || phone == null) return null;
  if (!email && !phone) return null;
  return {
    userId: null,
    name: cleanContact(row?.guest_name || row?.patient_name || row?.name) || "Patient",
    email,
    phone,
    lang: "en",
  };
}

// ─── Deliver: in-app + email ──────────────────────────────────────────────────
async function deliver({ userId, email, subject, text, html, type }) {
  if (userId) await notifyInApp(userId, subject, text, type);
  if (email && email.includes("@")) {
    return (await sendMail({ to: email, subject, text, html })) !== false;
  }
  return true;
}

// ─── Greeting helper ──────────────────────────────────────────────────────────
function greeting(name, lang = "en") {
  return greetPerson(lang, name);
}

/** Include a fresh temporary password until the guest has signed in or joined. */
async function guestAccess(userId, lang, email, existingPlain) {
  let plain = existingPlain || null;
  let address = email || "";
  if (!plain && userId) {
    const issued = await reissueGuestPassword(userId).catch(() => null);
    if (issued?.plain) {
      plain = issued.plain;
      address = issued.email || address;
    }
  }
  if (!plain) return { text: "", html: "", plain: null };
  const line = guestAccessLine(lang, address, plain);
  return { text: `\n${line}\n`, html: emailP(line), plain };
}

// ─────────────────────────────────────────────────────────────────────────────
//  notifyPaidVisit
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyPaidVisit(payment, account = null) {
  let tempPassword = null;
  const payableType = String(payment?.payable_type || "");
  const payableId = payment?.payable_id;
  if (!payableId) return;
  if (payableType.toLowerCase().includes("fitness")) return;
  const instant = payableType.toLowerCase().includes("instant");
  const table = instant
    ? ((await tableExists("instant_consultation_requests")) ? "instant_consultation_requests" : "instant_consultations")
    : "appointments";
  if (!(await tableExists(table))) return;
  const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [payableId]).catch(() => null);
  if (!row) return;

  const doctor = await doctorContact(row.doctor_id);
  const patient = await patientNotice(row);
  const when = [row.appointment_date, row.appointment_time].filter(Boolean).join(" at ") || "your scheduled time";
  const amount = Number(payment?.amount || row.patient_pays || row.consultation_fee || 0);
  const amountStr = amount > 0 ? `${amount.toLocaleString()} RWF` : null;

  // ── Doctor notification ──
  if (doctor?.email || doctor?.user_id) {
    const subjectDoctor = instant
      ? `New instant consultation #${payableId} — patient is ready`
      : `Paid appointment #${payableId} is confirmed`;
    const textDoctor = instant
      ? `${patient.name} paid for an instant consultation${amountStr ? ` (${amountStr})` : ""}. Open your MediConnect dashboard to join.`
      : `${patient.name} paid for an appointment on ${when}. The visit is confirmed and ready.`;

    const infoRows = [
      ["Patient", patient.name],
      amountStr && ["Amount paid", amountStr],
      !instant && ["Scheduled", when],
      patient.email && ["Patient email", patient.email],
      patient.phone && ["Patient phone", patient.phone],
    ].filter(Boolean);

    const htmlDoctor = buildEmailHtml({
      title: subjectDoctor,
      preheader: textDoctor,
      body: `
        ${emailP(greeting(doctor.name, doctor.lang))}
        ${emailHtml(instant
          ? `A patient has paid for an instant consultation${amountStr ? ` of <strong>${amountStr}</strong>` : ""} and is ready to join.`
          : `<strong>${patient.name}</strong> has paid for an ${amountStr ? `<strong>${amountStr}</strong> ` : ""}appointment on <strong>${when}</strong>. The visit is confirmed and ready.`
        )}
        ${emailInfoBox(infoRows, "#0BA59B")}
        ${emailBtn(
          instant ? "Join now" : "View Appointment",
          instant ? "https://mediconnect.rw/doctor" : "https://mediconnect.rw/doctor/appointments",
        )}
        ${emailP("Sign in to your MediConnect dashboard to take action.", "font-size:12px;color:#9ca3af;")}
      `,
    });

    await deliver({ userId: doctor?.user_id, email: doctor?.email, subject: subjectDoctor, text: textDoctor, html: htmlDoctor, type: "visit.paid" });
  }

  // ── Patient notification ──
  if (patient.email || patient.userId) {
    const subjectPatient = instant
      ? `Payment confirmed — consultation #${payableId} is ready`
      : `Payment received for appointment #${payableId}`;
    const access = await guestAccess(patient.userId, patient.lang, patient.email, account?.plain);
    tempPassword = access.plain || tempPassword;
    const textPatient = (instant
      ? `Your payment is confirmed${doctor?.name ? ` with ${doctor.name}` : ""}. Sign in to join when the doctor is ready.`
      : `Your payment${amountStr ? ` of ${amountStr}` : ""} was received${doctor?.name ? ` for your appointment with Dr. ${doctor.name}` : ""}. The visit is confirmed.`) + access.text;

    const infoRows = [
      doctor?.name && ["Doctor", `Dr. ${doctor.name}`],
      amountStr && ["Amount paid", amountStr],
      !instant && ["Scheduled", when],
    ].filter(Boolean);

    // If a new guest account was just created, include sign-in credentials
    const hasNewAccount = account?.created && account?.plain;
    const credentialsBlock = hasNewAccount ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="margin:20px 0;border-radius:8px;border:1px solid #0BA59B44;background:#f0fafa;overflow:hidden;">
        <tr>
          <td style="padding:18px 22px;border-left:4px solid #0BA59B;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4a6360;font-family:'Segoe UI',Arial,sans-serif;text-transform:uppercase;letter-spacing:.5px;">Your sign-in credentials</p>
            <p style="margin:4px 0;font-size:13px;color:#1a2e2d;font-family:'Segoe UI',Arial,sans-serif;"><strong>Email:</strong> ${account.email || patient.email}</p>
            <p style="margin:4px 0;font-size:13px;color:#1a2e2d;font-family:'Segoe UI',Arial,sans-serif;"><strong>Temporary password:</strong></p>
            <p style="margin:8px 0 0;font-size:22px;font-weight:800;letter-spacing:4px;color:#0BA59B;font-family:'Courier New',monospace;">${account.plain}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 16px;font-size:12px;color:#6b7280;font-family:'Segoe UI',Arial,sans-serif;">You can change this password from <strong>Account Settings</strong> after signing in.</p>
    ` : "";

    const htmlPatient = buildEmailHtml({
      title: subjectPatient,
      preheader: textPatient,
      accentHex: "#38a169",
      body: `
        ${emailP(greeting(patient.name, patient.lang))}
        ${emailHtml(instant
          ? `Your payment has been confirmed. ${doctor?.name ? `Dr. <strong>${doctor.name}</strong> will join you shortly.` : "A doctor will join your consultation shortly."}`
          : `Your payment${amountStr ? ` of <strong>${amountStr}</strong>` : ""} has been received. Your appointment is confirmed.`
        )}
        ${infoRows.length ? emailInfoBox(infoRows, "#38a169") : ""}
        ${credentialsBlock}
        ${access.html}
        ${emailBtn(
          instant ? "Sign In & Join Consultation" : "View My Appointments",
          instant ? "https://mediconnect.rw/auth" : "https://mediconnect.rw/patient/appointments",
          "#38a169",
        )}
        ${hasNewAccount ? `<p style="margin:8px 0 0;font-size:12px;color:#6b7280;font-family:'Segoe UI',Arial,sans-serif;text-align:center;">After signing in, go to <strong>Search Doctors → Instant Consultation</strong> to join your session.</p>` : ""}
      `,
    });

    await deliver({ userId: patient.userId, email: patient.email, subject: subjectPatient, text: textPatient, html: htmlPatient, type: "visit.paid" });
  }

  // ── Broadcast realtime queue-refresh event to the doctor's channel ─────────
  // The doctor's queue React component polls every 3s but that's still a delay.
  // Pushing a WebSocket event lets it invalidate immediately when a patient pays.
  if (instant) {
    const recipients = row.doctor_id
      ? [await doctorContact(row.doctor_id)]
      // General request: nobody was emailed above, so at minimum push the new
      // paid patient into every doctor's queue in real time and leave them an
      // in-app notice.
      : await instantAvailableDoctors();

    for (const target of recipients.filter(Boolean)) {
      if (!target.user_id) continue;

      if (!row.doctor_id) {
        await notifyInApp(
          target.user_id,
          "New instant consultation — patient has paid and is ready",
          "A patient is in the instant queue with a paid consultation. Open your MediConnect dashboard to join.",
          "visit.paid",
        ).catch(() => null);
      }

      // Private channel name in Pusher protocol is "private-{name}"
      broadcast(`private-doctor.${target.user_id}`, "instant.queue.updated", {
        consultation_id: payableId,
        patient_name: patient.name,
        status: "confirmed",
      });
    }
  }
  return { tempPassword };
}

// ─────────────────────────────────────────────────────────────────────────────
//  notifyBookedVisit  — new appointment booked (awaiting payment)
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyBookedVisit(row) {
  let tempPassword = null;
  const doctor = await doctorContact(row?.doctor_id);
  const patient = await patientNotice(row);
  const when = [row?.appointment_date, row?.appointment_time].filter(Boolean).join(" at ") || "the scheduled time";
  const amount = Number(row?.patient_pays || row?.consultation_fee || row?.amount || 0);
  const amountStr = amount > 0 ? `${amount.toLocaleString()} RWF` : "the consultation fee";
  const payUrl = "https://mediconnect.rw/patient/appointments";

  // ── Patient notification ──
  if (patient.email || patient.userId) {
    const access = await guestAccess(patient.userId, patient.lang, patient.email, row?.account_plain || null);
    tempPassword = access.plain || tempPassword;
    const subject = pick(patient.lang, {
      en: `Pay to secure appointment #${row?.id ?? ""}`.trim(),
      fr: `Payez pour confirmer le rendez-vous n° ${row?.id ?? ""}`.trim(),
      rw: `Ishyura wemeze gahunda ya #${row?.id ?? ""}`.trim(),
    });
    const text = pick(patient.lang, {
      en: `Appointment #${row?.id ?? ""}${doctor?.name ? ` with ${doctor.name}` : ""} is reserved for ${when}. Pay ${amountStr} at ${payUrl} before the doctor can confirm it.`,
      fr: `Le rendez-vous n° ${row?.id ?? ""}${doctor?.name ? ` avec ${doctor.name}` : ""} est réservé pour ${when}. Payez ${amountStr} sur ${payUrl} avant que le médecin ne puisse le confirmer.`,
      rw: `Gahunda ya #${row?.id ?? ""}${doctor?.name ? ` na ${doctor.name}` : ""} yarafashwe kuri ${when}. Ishyura ${amountStr} kuri ${payUrl} mbere y'uko umuganga ayemeza.`,
    }) + access.text;

    const html = buildEmailHtml({
      lang: patient.lang,
      title: pick(patient.lang, { en: "Your appointment is reserved", fr: "Votre rendez-vous est réservé", rw: "Gahunda yawe yarafashwe" }),
      preheader: text,
      accentHex: "#0BA59B",
      body: `
        ${emailP(greeting(patient.name, patient.lang))}
        ${emailHtml(`Your appointment${doctor?.name ? ` with <strong>Dr. ${doctor.name}</strong>` : ""} is successfully reserved for <strong>${when}</strong>.`)}
        ${emailHtml("To hold your slot, please complete payment. The appointment will remain <em>pending</em> until payment is received.")}
        ${emailInfoBox([
          doctor?.name && ["Doctor", `Dr. ${doctor.name}`],
          ["Scheduled", when],
          ["Amount due", amountStr],
        ].filter(Boolean), "#0BA59B")}
        ${access.html}
        ${emailBtn("Pay Now to Confirm", payUrl)}
        ${emailP("If you did not book this appointment, please contact us immediately.", "font-size:12px;color:#9ca3af;")}
      `,
    });

    await deliver({ userId: patient.userId, email: patient.email, subject, text, html, type: "visit.booked" });
  }

  // ── Doctor notification ──
  if (doctor?.email || doctor?.user_id) {
    const subject = "New appointment request on MediConnect";
    const text = `${patient.name} requested an appointment on ${when}. It stays pending until they pay ${amountStr}.`;

    const html = buildEmailHtml({
      title: "New appointment request",
      preheader: text,
      body: `
        ${emailP(greeting(doctor?.name, doctor?.lang))}
        ${emailHtml(`<strong>${patient.name}</strong> has requested an appointment on <strong>${when}</strong>.`)}
        ${emailHtml(`The appointment is <strong>pending</strong> until the patient completes payment of ${amountStr}. You'll receive a confirmation notification once they pay.`)}
        ${emailInfoBox([
          ["Patient", patient.name],
          ["Scheduled", when],
          patient.email && ["Patient email", patient.email],
          patient.phone && ["Patient phone", patient.phone],
        ].filter(Boolean))}
        ${emailBtn("View Appointments", "https://mediconnect.rw/doctor/appointments")}
      `,
    });

    await deliver({ userId: doctor?.user_id, email: doctor?.email, subject, text, html, type: "visit.booked" });
  }
  return { tempPassword };
}

// ─────────────────────────────────────────────────────────────────────────────
//  notifyAppointmentConfirmed
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyAppointmentConfirmed(row) {
  const doctor = await doctorContact(row?.doctor_id);
  const patient = await patientNotice(row);
  const when = [row?.appointment_date, row?.appointment_time].filter(Boolean).join(" at ") || "your scheduled time";

  // ── Patient ──
  if (patient.email || patient.userId) {
    const access = await guestAccess(patient.userId, patient.lang, patient.email, null);
    const subject = "Your appointment is confirmed ✓";
    const text = `${doctor?.name || "Your doctor"} confirmed your appointment for ${when}. Sign in to view details.` + access.text;

    const html = buildEmailHtml({
      title: "Appointment confirmed",
      preheader: text,
      accentHex: "#38a169",
      body: `
        ${emailP(greeting(patient.name, patient.lang))}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
          <tr>
            <td style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;border-left:4px solid #38a169;">
              <p style="margin:0;font-size:15px;font-weight:700;color:#166534;font-family:'Segoe UI',Arial,sans-serif;">✓ Your appointment has been confirmed</p>
            </td>
          </tr>
        </table>
        ${emailHtml(`<strong>Dr. ${doctor?.name || "Your doctor"}</strong> has confirmed your appointment for <strong>${when}</strong>.`)}
        ${emailInfoBox([
          doctor?.name && ["Doctor", `Dr. ${doctor.name}`],
          ["Date & Time", when],
        ].filter(Boolean), "#38a169")}
        ${emailP("You will receive a reminder before your appointment starts. Please be on time and ensure you have a stable internet connection for video consultations.")}
        ${access.html}
        ${emailBtn("View My Appointments", "https://mediconnect.rw/patient/appointments", "#38a169")}
      `,
    });

    await deliver({ userId: patient.userId, email: patient.email, subject, text, html, type: "visit.confirmed" });
  }

  // ── Doctor ──
  if (doctor?.email || doctor?.user_id) {
    const subject = "Appointment confirmed";
    const text = `You confirmed ${patient.name}'s appointment for ${when}.`;

    const html = buildEmailHtml({
      title: "Appointment confirmed",
      preheader: text,
      accentHex: "#38a169",
      body: `
        ${emailP(greeting(doctor?.name, doctor?.lang))}
        ${emailHtml(`You have successfully confirmed <strong>${patient.name}</strong>'s appointment for <strong>${when}</strong>.`)}
        ${emailInfoBox([
          ["Patient", patient.name],
          ["Scheduled", when],
          patient.email && ["Patient email", patient.email],
          patient.phone && ["Patient phone", patient.phone],
        ].filter(Boolean), "#38a169")}
        ${emailBtn("View Appointments", "https://mediconnect.rw/doctor/appointments", "#38a169")}
      `,
    });

    await deliver({ userId: doctor?.user_id, email: doctor?.email, subject, text, html, type: "visit.confirmed" });
  }
}

export async function notifyAppointmentRescheduled(row) {
  const doctor = await doctorContact(row?.doctor_id);
  const patient = await patientNotice(row);
  const when = [row?.appointment_date, row?.appointment_time].filter(Boolean).join(" at ") || "the new scheduled time";

  if (patient.email || patient.userId) {
    const subject = "Your appointment has been rescheduled";
    const text = `${doctor?.name ? `Dr. ${doctor.name}` : "Your doctor"} rescheduled your appointment to ${when}.`;
    const html = buildEmailHtml({
      title: "Appointment rescheduled",
      preheader: text,
      accentHex: "#0ea5e9",
      body: `
        ${emailP(greeting(patient.name, patient.lang))}
        ${emailHtml(`<strong>${doctor?.name ? `Dr. ${doctor.name}` : "Your doctor"}</strong> has moved your appointment to <strong>${when}</strong>.`)}
        ${emailInfoBox([
          doctor?.name && ["Doctor", `Dr. ${doctor.name}`],
          ["New date & time", when],
        ].filter(Boolean), "#0ea5e9")}
        ${emailP("Please be on time. If you cannot attend, sign in to cancel or request another time.")}
        ${emailBtn("View My Appointments", "https://mediconnect.rw/patient/appointments", "#0ea5e9")}
      `,
    });
    await deliver({ userId: patient.userId, email: patient.email, subject, text, html, type: "visit.rescheduled" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  notifyVisitCompleted
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyVisitCompleted(row, kind = "consultation") {
  const doctor = await doctorContact(row?.doctor_id);
  const patient = await patientNotice(row);
  const kindLabel = kind === "appointment" ? "appointment" : "instant consultation";

  // ── Patient ──
  if (patient.email || patient.userId) {
    const subject = `Your MediConnect consultation #${row?.id ?? ""} is complete`;
    const text = `Your ${kindLabel}${doctor?.name ? ` with ${doctor.name}` : ""} is complete. Sign in to view notes, prescriptions, or book a follow-up.`;

    const html = buildEmailHtml({
      title: "Consultation complete",
      preheader: text,
      accentHex: "#0BA59B",
      body: `
        ${emailP(greeting(patient.name, patient.lang))}
        ${emailHtml(`Your ${kindLabel}${doctor?.name ? ` with <strong>Dr. ${doctor.name}</strong>` : ""} has been marked as complete.`)}
        ${emailP("Your doctor may have added notes, a diagnosis summary, or a prescription to your profile. You can view and download them from your MediConnect account.")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:4px;">
              ${emailBtn("View Prescriptions", "https://mediconnect.rw/patient/prescriptions", "#0BA59B")}
            </td>
            <td style="padding:4px;">
              ${emailBtn("Book a Follow-up", "https://mediconnect.rw/patient/search-doctors", "#6366f1")}
            </td>
          </tr>
        </table>
        ${emailP("Thank you for trusting MediConnect with your healthcare.", "font-size:12px;color:#6b7280;")}
      `,
    });

    await deliver({ userId: patient.userId, email: patient.email, subject, text, html, type: "visit.completed" });
  }

  // ── Doctor ──
  if (doctor?.email || doctor?.user_id) {
    const subject = `Consultation #${row?.id ?? ""} marked complete`;
    const text = `${patient.name}'s ${kindLabel} is marked complete.`;

    const html = buildEmailHtml({
      title: "Consultation complete",
      preheader: text,
      accentHex: "#0BA59B",
      body: `
        ${emailP(greeting(doctor?.name, doctor?.lang))}
        ${emailHtml(`<strong>${patient.name}</strong>'s ${kindLabel} has been marked as complete.`)}
        ${emailP("You can review and update any consultation notes, prescriptions, or follow-up bookings from your dashboard.")}
        ${emailBtn("Go to Dashboard", "https://mediconnect.rw/doctor", "#0BA59B")}
      `,
    });

    await deliver({ userId: doctor?.user_id, email: doctor?.email, subject, text, html, type: "visit.completed" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  notifyDoctorReady
// ─────────────────────────────────────────────────────────────────────────────

async function readyNotice(visitKey, patient, subject, text) {
  if (!patient?.userId) return;
  const noticeKey = `${visitKey}:notice`;
  let claim;
  try {
    claim = await beginReadyMail(noticeKey);
  } catch (error) {
    console.error("Ready notice was not recorded:", error?.message || error);
    return;
  }
  if (!claim.send) return;
  const stored = await notifyInApp(patient.userId, subject, text, "visit.ready");
  await finishReadyMail(noticeKey, claim.attempt, stored, stored ? "" : "notice was not stored");
}

async function composeReadyMessage(row, patient) {
  const doctor = await doctorContact(row.doctor_id);
  const lang = patient.lang;
  const access = await guestAccess(patient.userId, lang, patient.email, null);
  const subject = pick(lang, {
    en: `Your doctor is ready for consultation #${row.id}`,
    fr: `Votre médecin est prêt pour la consultation n° ${row.id}`,
    rw: `Umuganga wawe arategereje ikiganiro cya #${row.id}`,
  });
  const text = pick(lang, {
    en: `${doctor?.name || "Your doctor"} is in consultation #${row.id} and waiting for you. Open MediConnect and join now.`,
    fr: `${doctor?.name || "Votre médecin"} est dans la consultation n° ${row.id} et vous attend. Ouvrez MediConnect et rejoignez maintenant.`,
    rw: `${doctor?.name || "Umuganga wawe"} ari mu kiganiro cya #${row.id} akurindirira. Fungura MediConnect winjire ubu.`,
  }) + access.text;
  const html = buildEmailHtml({
    lang,
    title: pick(lang, { en: "Your doctor is ready!", fr: "Votre médecin est prêt !", rw: "Umuganga wawe arategereje!" }),
    preheader: text,
    accentHex: "#7c3aed",
    body: `
      ${emailP(greeting(patient.name, patient.lang))}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
        <tr>
          <td style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px 20px;border-left:4px solid #7c3aed;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#6d28d9;font-family:'Segoe UI',Arial,sans-serif;">🔴 Live — Doctor is waiting</p>
          </td>
        </tr>
      </table>
      ${emailHtml(`<strong>Dr. ${doctor?.name || "Your doctor"}</strong> is currently in the consultation room and waiting for you to join.`)}
      ${emailP("Please join immediately to avoid missing your appointment slot.")}
      ${access.html}
      ${emailBtn("Join Consultation Now →", "https://mediconnect.rw/patient/appointments", "#7c3aed")}
      ${emailP("If you have trouble joining, please contact us at admin@mediconnect.rw.", "font-size:12px;color:#9ca3af;")}
    `,
  });
  return { subject, text, html };
}

export async function notifyDoctorReady(row) {
  const key = row?.id ? `instant:${row.id}` : "";
  if (!key || visitAwaitsPayment(row)) return;
  const patient = await patientContact(row);
  if (!patient) return;
  const mailKey = `${key}:mail`;
  let claim;
  try {
    claim = await beginReadyMail(mailKey);
  } catch (error) {
    console.error("Ready mail was not sent:", error?.message || error);
    throw error;
  }
  if (!claim.send) {
    if (claim.reason === "sent" || claim.reason === "local-sent") {
      try {
        const message = await composeReadyMessage(row, patient);
        await readyNotice(key, patient, message.subject, message.text);
      } catch (error) {
        console.error("Ready notice was not recorded:", error?.message || error);
      }
    }
    return;
  }
  let renew;
  try {
    renew = setInterval(() => {
      renewReadyMail(mailKey, claim.attempt).catch((error) => {
        console.error("Ready mail lease renew failed:", error?.message || error);
      });
    }, READY_CLAIM_RENEW_MS);
    const message = await composeReadyMessage(row, patient);
    await readyNotice(key, patient, message.subject, message.text);
    let emailed = true;
    if (patient.email && patient.email.includes("@")) {
      emailed = (await sendMail({
        to: patient.email,
        subject: message.subject,
        text: message.text,
        html: message.html,
        timeoutMs: READY_MAIL_TIMEOUT_MS,
      })) !== false;
    }
    if (!emailed) {
      await finishReadyMail(mailKey, claim.attempt, false, "mailer declined");
      return;
    }
    await finishReadyMail(mailKey, claim.attempt, true);
  } catch (error) {
    await finishReadyMail(mailKey, claim.attempt, false, error?.message || "send failed");
    console.error("Ready mail was not sent:", error?.message || error);
    throw error;
  } finally {
    if (renew) clearInterval(renew);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  remindUpcomingVisits  — reminder ~30–90 min before appointment
// ─────────────────────────────────────────────────────────────────────────────
export async function remindUpcomingVisits() {
  if (!(await tableExists("appointments")) || !(await hasColumn("appointments", "appointment_date"))) return;
  const rows = await q(
    `SELECT * FROM appointments
     WHERE appointment_date = CURDATE()
       AND status IN ('pending','confirmed','accepted','paid')
     ORDER BY id DESC LIMIT 100`,
  ).catch(() => []);

  const now = new Date();
  for (const row of rows) {
    const dateText = row.appointment_date instanceof Date
      ? `${row.appointment_date.getFullYear()}-${String(row.appointment_date.getMonth() + 1).padStart(2, "0")}-${String(row.appointment_date.getDate()).padStart(2, "0")}`
      : String(row.appointment_date).slice(0, 10);
    const time = String(row.appointment_time || "00:00");
    const start = new Date(`${dateText}T${time.length === 5 ? `${time}:00` : time}`);
    if (Number.isNaN(start.getTime())) continue;
    const minutes = (start.getTime() - now.getTime()) / 60000;

    // ── 1-hour reminder: fire once in the 55–65 min window ──
    const want60 = minutes >= 55 && minutes <= 65;
    // ── 30-minute reminder: fire once in the 25–35 min window ──
    const want30 = minutes >= 25 && minutes <= 35;

    if (!want60 && !want30) continue;

    const doctor = await doctorContact(row.doctor_id);
    const patient = await patientNotice(row);
    const unpaid = visitAwaitsPayment(row);

    // ── 1-hour reminder ──────────────────────────────────────────────────
    if (want60 && !reminded.has(`appt-60-${row.id}`)) {
      reminded.add(`appt-60-${row.id}`);

      if (patient.email || patient.userId) {
        const access = await guestAccess(patient.userId, patient.lang, patient.email, null);
        const subject = unpaid
          ? `Payment still due for appointment #${row.id}`
          : "Reminder: your appointment starts in 1 hour";
        const text = (unpaid
          ? `Appointment #${row.id} at ${time} is still unpaid. Pay before the doctor can confirm it.`
          : `Your MediConnect appointment${doctor?.name ? ` with ${doctor.name}` : ""} starts at ${time}. Sign in to join.`) + access.text;
        const html = buildEmailHtml({
          title: "Appointment in 1 hour",
          preheader: text,
          accentHex: "#0BA59B",
          body: `
            ${emailP(greeting(patient.name, patient.lang))}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
              <tr>
                <td style="background:#f0fafa;border:1px solid #d0ecea;border-radius:8px;padding:16px 20px;border-left:4px solid #0BA59B;">
                  <p style="margin:0;font-size:15px;font-weight:700;color:#0d3533;font-family:'Segoe UI',Arial,sans-serif;">🕐 Your appointment starts in 1 hour</p>
                </td>
              </tr>
            </table>
            ${emailHtml(unpaid
              ? `Appointment <strong>#${row.id}</strong> at <strong>${time}</strong> is still unpaid. The doctor cannot confirm it until payment is received.`
              : `Your appointment${doctor?.name ? ` with <strong>Dr. ${doctor.name}</strong>` : ""} is scheduled at <strong>${time}</strong> today.`)}
            ${emailP(unpaid
              ? "This reminder is about payment, not a live visit."
              : "Please make sure you have a stable internet connection and your camera and microphone are ready.")}
            ${emailInfoBox([
              doctor?.name && ["Doctor", `Dr. ${doctor.name}`],
              ["Time", time],
            ].filter(Boolean), "#0BA59B")}
            ${access.html}
            ${emailBtn(unpaid ? "Review payment" : "View My Appointments", "https://mediconnect.rw/patient/appointments", "#0BA59B")}
          `,
        });
        await deliver({ userId: patient.userId, email: patient.email, subject, text, html, type: "visit.reminder" });
      }

      if (doctor?.email || doctor?.user_id) {
        const subject = `Appointment with ${patient.name} in 1 hour`;
        const text = `${patient.name} has an appointment at ${time}.`;
        const html = buildEmailHtml({
          title: "Appointment in 1 hour",
          preheader: text,
          accentHex: "#0BA59B",
          body: `
            ${emailP(greeting(doctor?.name, doctor?.lang))}
            ${emailHtml(`<strong>${patient.name}</strong> has an appointment with you at <strong>${time}</strong> today — in approximately 1 hour.`)}
            ${emailInfoBox([
              ["Patient", patient.name],
              ["Time", time],
              patient.phone && ["Patient phone", patient.phone],
            ].filter(Boolean), "#0BA59B")}
            ${emailBtn("Open Appointments", "https://mediconnect.rw/doctor/appointments", "#0BA59B")}
          `,
        });
        await deliver({ userId: doctor?.user_id, email: doctor?.email, subject, text, html, type: "visit.reminder" });
      }
    }

    // ── 30-minute reminder ───────────────────────────────────────────────
    if (want30 && !reminded.has(`appt-30-${row.id}`)) {
      reminded.add(`appt-30-${row.id}`);

      if (patient.email || patient.userId) {
        const access = await guestAccess(patient.userId, patient.lang, patient.email, null);
        const subject = unpaid
          ? `Payment still due for appointment #${row.id}`
          : "Reminder: your appointment starts in 30 minutes";
        const text = (unpaid
          ? `Appointment #${row.id} at ${time} is still unpaid. Pay before the doctor can confirm it.`
          : `Your MediConnect appointment${doctor?.name ? ` with ${doctor.name}` : ""} starts at ${time}. Sign in and get ready.`) + access.text;
        const html = buildEmailHtml({
          title: "Appointment in 30 minutes",
          preheader: text,
          accentHex: "#d97706",
          body: `
            ${emailP(greeting(patient.name, patient.lang))}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
              <tr>
                <td style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;border-left:4px solid #d97706;">
                  <p style="margin:0;font-size:15px;font-weight:700;color:#92400e;font-family:'Segoe UI',Arial,sans-serif;">⏰ Starting in 30 minutes</p>
                </td>
              </tr>
            </table>
            ${emailHtml(unpaid
              ? `Appointment <strong>#${row.id}</strong> at <strong>${time}</strong> is still unpaid.`
              : `Your appointment${doctor?.name ? ` with <strong>Dr. ${doctor.name}</strong>` : ""} is starting at <strong>${time}</strong> — in about 30 minutes.`)}
            ${emailP(unpaid
              ? "This reminder is about payment, not a live visit."
              : "Please ensure you have a stable internet connection and your camera/microphone are working.")}
            ${access.html}
            ${emailBtn(unpaid ? "Review payment" : "Join Appointment Now", "https://mediconnect.rw/patient/appointments", "#d97706")}
          `,
        });
        await deliver({ userId: patient.userId, email: patient.email, subject, text, html, type: "visit.reminder" });
      }

      if (doctor?.email || doctor?.user_id) {
        const subject = `Appointment with ${patient.name} in 30 minutes`;
        const text = `${patient.name} has an appointment at ${time} — starting in 30 minutes.`;
        const html = buildEmailHtml({
          title: "Appointment in 30 minutes",
          preheader: text,
          accentHex: "#d97706",
          body: `
            ${emailP(greeting(doctor?.name, doctor?.lang))}
            ${emailHtml(`<strong>${patient.name}</strong> has an appointment with you at <strong>${time}</strong> — starting in approximately 30 minutes.`)}
            ${emailInfoBox([
              ["Patient", patient.name],
              ["Time", time],
              patient.phone && ["Patient phone", patient.phone],
            ].filter(Boolean), "#d97706")}
            ${emailBtn("Open Appointments", "https://mediconnect.rw/doctor/appointments", "#d97706")}
          `,
        });
        await deliver({ userId: doctor?.user_id, email: doctor?.email, subject, text, html, type: "visit.reminder" });
      }
    }
  }
}

export { autoDisableInstantOutsideSchedule, doctorOnInstantSchedule } from "./doctor-schedule.js";

