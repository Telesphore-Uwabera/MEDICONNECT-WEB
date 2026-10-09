import { hasColumn, insert, one, q, tableExists } from "./db.js";
import { sendMail, buildEmailHtml, emailBtn, emailInfoBox, emailP, emailHtml, emailOtpBlock } from "./mail.js";

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
  await insert("notifications", fields).catch(() => null);
}

// ─── Contact resolution helpers ───────────────────────────────────────────────
async function doctorContact(doctorId) {
  if (!doctorId) return null;
  return one(
    `SELECT d.id, u.id AS user_id, u.name, u.email, u.phone
     FROM doctors d JOIN users u ON u.id = d.user_id WHERE d.id = ? LIMIT 1`,
    [doctorId],
  ).catch(() => null);
}

async function patientContact(row) {
  const email = String(row?.guest_email || row?.email || row?.patient_email || "").trim();
  const phone = String(row?.guest_phone || row?.phone || row?.patient_phone || "").trim();
  const name = String(row?.guest_name || row?.patient_name || row?.name || "Patient").trim();
  let userId = row?.user_id || null;
  if (!userId && row?.patient_id) {
    const user = await one("SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1", [row.patient_id]).catch(() => null);
    if (user) return { userId: user.id, name: name || user.name || "Patient", email: email || user.email || "", phone: phone || user.phone || "" };
    if (await tableExists("patients")) {
      const patient = await one("SELECT user_id, name, email, phone FROM patients WHERE id = ? LIMIT 1", [row.patient_id]).catch(() => null);
      userId = patient?.user_id || null;
      if (!userId) return { userId: null, name: name || patient?.name || "Patient", email: email || patient?.email || "", phone: phone || patient?.phone || "" };
    }
  }
  if (userId) {
    const user = await one("SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1", [userId]).catch(() => null);
    return { userId, name: name || user?.name || "Patient", email: email || user?.email || "", phone: phone || user?.phone || "" };
  }
  return { userId: null, name, email, phone };
}

// ─── Deliver: in-app + email ──────────────────────────────────────────────────
async function deliver({ userId, email, subject, text, html, type }) {
  if (userId) await notifyInApp(userId, subject, text, type);
  if (email && email.includes("@")) {
    await sendMail({ to: email, subject, text, html });
  }
}

// ─── Greeting helper ──────────────────────────────────────────────────────────
function greeting(name) {
  const first = String(name || "").split(" ")[0] || "there";
  return `Hello, ${first}!`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  notifyPaidVisit
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyPaidVisit(payment) {
  const payableType = String(payment?.payable_type || "");
  const payableId = payment?.payable_id;
  if (!payableId) return;
  const instant = payableType.toLowerCase().includes("instant");
  const table = instant
    ? ((await tableExists("instant_consultation_requests")) ? "instant_consultation_requests" : "instant_consultations")
    : "appointments";
  if (!(await tableExists(table))) return;
  const row = await one(`SELECT * FROM \`${table}\` WHERE id = ?`, [payableId]).catch(() => null);
  if (!row) return;

  const doctor = await doctorContact(row.doctor_id);
  const patient = await patientContact(row);
  const when = [row.appointment_date, row.appointment_time].filter(Boolean).join(" at ") || "your scheduled time";
  const amount = Number(payment?.amount || row.patient_pays || row.consultation_fee || 0);
  const amountStr = amount > 0 ? `${amount.toLocaleString()} RWF` : null;

  // ── Doctor notification ──
  if (doctor?.email || doctor?.user_id) {
    const subjectDoctor = instant
      ? "New instant consultation — patient is ready"
      : "New paid appointment awaiting your confirmation";
    const textDoctor = instant
      ? `${patient.name} paid for an instant consultation${amountStr ? ` (${amountStr})` : ""}. Open your MediConnect dashboard to accept and join.`
      : `${patient.name} paid for an appointment on ${when}. Open your appointments, review their details, and confirm the visit.`;

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
        ${emailP(greeting(doctor.name))}
        ${emailHtml(instant
          ? `A patient has paid for an instant consultation${amountStr ? ` of <strong>${amountStr}</strong>` : ""} and is waiting for you.`
          : `<strong>${patient.name}</strong> has paid for an ${amountStr ? `<strong>${amountStr}</strong> ` : ""}appointment on <strong>${when}</strong>. Please review their details and confirm the visit.`
        )}
        ${emailInfoBox(infoRows, "#0BA59B")}
        ${emailBtn(
          instant ? "Accept & Join Now" : "View Appointment",
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
      ? "Payment confirmed — your consultation is ready"
      : "Payment received for your appointment";
    const textPatient = instant
      ? `Your payment is confirmed${doctor?.name ? ` with ${doctor.name}` : ""}. Sign in to join when the doctor is ready.`
      : `Your payment${amountStr ? ` of ${amountStr}` : ""} was received${doctor?.name ? ` for your appointment with Dr. ${doctor.name}` : ""}. The doctor will confirm your appointment shortly.`;

    const infoRows = [
      doctor?.name && ["Doctor", `Dr. ${doctor.name}`],
      amountStr && ["Amount paid", amountStr],
      !instant && ["Scheduled", when],
    ].filter(Boolean);

    const htmlPatient = buildEmailHtml({
      title: subjectPatient,
      preheader: textPatient,
      body: `
        ${emailP(greeting(patient.name))}
        ${emailHtml(instant
          ? `Your payment has been confirmed. ${doctor?.name ? `Dr. <strong>${doctor.name}</strong> will join you shortly.` : "A doctor will join your consultation shortly."}`
          : `Your payment${amountStr ? ` of <strong>${amountStr}</strong>` : ""} has been received. Your appointment is now pending the doctor's confirmation — you'll receive another email once they confirm.`
        )}
        ${infoRows.length ? emailInfoBox(infoRows, "#38a169") : ""}
        ${emailBtn(
          instant ? "Join Consultation" : "View My Appointments",
          instant ? "https://mediconnect.rw/patient/instant" : "https://mediconnect.rw/patient/appointments",
          "#38a169",
        )}
      `,
    });

    await deliver({ userId: patient.userId, email: patient.email, subject: subjectPatient, text: textPatient, html: htmlPatient, type: "visit.paid" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  notifyBookedVisit  — new appointment booked (awaiting payment)
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyBookedVisit(row) {
  const doctor = await doctorContact(row?.doctor_id);
  const patient = await patientContact(row);
  const when = [row?.appointment_date, row?.appointment_time].filter(Boolean).join(" at ") || "the scheduled time";
  const amount = Number(row?.patient_pays || row?.consultation_fee || row?.amount || 0);
  const amountStr = amount > 0 ? `${amount.toLocaleString()} RWF` : "the consultation fee";
  const payUrl = "https://mediconnect.rw/patient/appointments";

  // ── Patient notification ──
  if (patient.email || patient.userId) {
    const subject = "Pay to secure your MediConnect appointment";
    const text = `Your appointment${doctor?.name ? ` with ${doctor.name}` : ""} is reserved for ${when}. Pay ${amountStr} at ${payUrl} before the doctor can confirm it.`;

    const html = buildEmailHtml({
      title: "Your appointment is reserved",
      preheader: text,
      accentHex: "#0BA59B",
      body: `
        ${emailP(greeting(patient.name))}
        ${emailHtml(`Your appointment${doctor?.name ? ` with <strong>Dr. ${doctor.name}</strong>` : ""} is successfully reserved for <strong>${when}</strong>.`)}
        ${emailHtml("To hold your slot, please complete payment. The appointment will remain <em>pending</em> until payment is received.")}
        ${emailInfoBox([
          doctor?.name && ["Doctor", `Dr. ${doctor.name}`],
          ["Scheduled", when],
          ["Amount due", amountStr],
        ].filter(Boolean), "#0BA59B")}
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
        ${emailP(greeting(doctor?.name))}
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
}

// ─────────────────────────────────────────────────────────────────────────────
//  notifyAppointmentConfirmed
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyAppointmentConfirmed(row) {
  const doctor = await doctorContact(row?.doctor_id);
  const patient = await patientContact(row);
  const when = [row?.appointment_date, row?.appointment_time].filter(Boolean).join(" at ") || "your scheduled time";

  // ── Patient ──
  if (patient.email || patient.userId) {
    const subject = "Your appointment is confirmed ✓";
    const text = `${doctor?.name || "Your doctor"} confirmed your appointment for ${when}. Sign in to view details.`;

    const html = buildEmailHtml({
      title: "Appointment confirmed",
      preheader: text,
      accentHex: "#38a169",
      body: `
        ${emailP(greeting(patient.name))}
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
        ${emailP(greeting(doctor?.name))}
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

// ─────────────────────────────────────────────────────────────────────────────
//  notifyVisitCompleted
// ─────────────────────────────────────────────────────────────────────────────
export async function notifyVisitCompleted(row, kind = "consultation") {
  const doctor = await doctorContact(row?.doctor_id);
  const patient = await patientContact(row);
  const kindLabel = kind === "appointment" ? "appointment" : "instant consultation";

  // ── Patient ──
  if (patient.email || patient.userId) {
    const subject = "Your MediConnect consultation is complete";
    const text = `Your ${kindLabel}${doctor?.name ? ` with ${doctor.name}` : ""} is complete. Sign in to view notes, prescriptions, or book a follow-up.`;

    const html = buildEmailHtml({
      title: "Consultation complete",
      preheader: text,
      accentHex: "#0BA59B",
      body: `
        ${emailP(greeting(patient.name))}
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
    const subject = "Consultation marked complete";
    const text = `${patient.name}'s ${kindLabel} is marked complete.`;

    const html = buildEmailHtml({
      title: "Consultation complete",
      preheader: text,
      accentHex: "#0BA59B",
      body: `
        ${emailP(greeting(doctor?.name))}
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
export async function notifyDoctorReady(row) {
  const patient = await patientContact(row);
  const doctor = await doctorContact(row.doctor_id);
  const subject = "Your doctor is ready — join now!";
  const text = `${doctor?.name || "Your doctor"} is in the video consultation and waiting for you. Open MediConnect and join now.`;

  const html = buildEmailHtml({
    title: "Your doctor is ready!",
    preheader: text,
    accentHex: "#7c3aed",
    body: `
      ${emailP(greeting(patient.name))}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
        <tr>
          <td style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:16px 20px;border-left:4px solid #7c3aed;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#6d28d9;font-family:'Segoe UI',Arial,sans-serif;">🔴 Live — Doctor is waiting</p>
          </td>
        </tr>
      </table>
      ${emailHtml(`<strong>Dr. ${doctor?.name || "Your doctor"}</strong> is currently in the consultation room and waiting for you to join.`)}
      ${emailP("Please join immediately to avoid missing your appointment slot.")}
      ${emailBtn("Join Consultation Now →", "https://mediconnect.rw/patient/appointments", "#7c3aed")}
      ${emailP("If you have trouble joining, please contact us at admin@mediconnect.rw.", "font-size:12px;color:#9ca3af;")}
    `,
  });

  await deliver({ userId: patient.userId, email: patient.email, subject, text, html, type: "visit.ready" });
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
    const patient = await patientContact(row);

    // ── 1-hour reminder ──────────────────────────────────────────────────
    if (want60 && !reminded.has(`appt-60-${row.id}`)) {
      reminded.add(`appt-60-${row.id}`);

      if (patient.email || patient.userId) {
        const subject = "Reminder: your appointment starts in 1 hour";
        const text = `Your MediConnect appointment${doctor?.name ? ` with ${doctor.name}` : ""} starts at ${time}. Sign in to join.`;
        const html = buildEmailHtml({
          title: "Appointment in 1 hour",
          preheader: text,
          accentHex: "#0BA59B",
          body: `
            ${emailP(greeting(patient.name))}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
              <tr>
                <td style="background:#f0fafa;border:1px solid #d0ecea;border-radius:8px;padding:16px 20px;border-left:4px solid #0BA59B;">
                  <p style="margin:0;font-size:15px;font-weight:700;color:#0d3533;font-family:'Segoe UI',Arial,sans-serif;">🕐 Your appointment starts in 1 hour</p>
                </td>
              </tr>
            </table>
            ${emailHtml(`Your appointment${doctor?.name ? ` with <strong>Dr. ${doctor.name}</strong>` : ""} is scheduled at <strong>${time}</strong> today.`)}
            ${emailP("Please make sure you have a stable internet connection and your camera and microphone are ready.")}
            ${emailInfoBox([
              doctor?.name && ["Doctor", `Dr. ${doctor.name}`],
              ["Time", time],
            ].filter(Boolean), "#0BA59B")}
            ${emailBtn("View My Appointments", "https://mediconnect.rw/patient/appointments", "#0BA59B")}
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
            ${emailP(greeting(doctor?.name))}
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
        const subject = "Reminder: your appointment starts in 30 minutes";
        const text = `Your MediConnect appointment${doctor?.name ? ` with ${doctor.name}` : ""} starts at ${time}. Sign in and get ready.`;
        const html = buildEmailHtml({
          title: "Appointment in 30 minutes",
          preheader: text,
          accentHex: "#d97706",
          body: `
            ${emailP(greeting(patient.name))}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
              <tr>
                <td style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;border-left:4px solid #d97706;">
                  <p style="margin:0;font-size:15px;font-weight:700;color:#92400e;font-family:'Segoe UI',Arial,sans-serif;">⏰ Starting in 30 minutes</p>
                </td>
              </tr>
            </table>
            ${emailHtml(`Your appointment${doctor?.name ? ` with <strong>Dr. ${doctor.name}</strong>` : ""} is starting at <strong>${time}</strong> — in about 30 minutes.`)}
            ${emailP("Please ensure you have a stable internet connection and your camera/microphone are working.")}
            ${emailBtn("Join Appointment Now", "https://mediconnect.rw/patient/appointments", "#d97706")}
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
            ${emailP(greeting(doctor?.name))}
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
