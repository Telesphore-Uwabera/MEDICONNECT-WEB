import { hasColumn, insert, one, q, tableExists } from "./db.js";
import { sendMail } from "./mail.js";

const reminded = new Set();

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
    if (user) {
      return {
        userId: user.id,
        name: name || user.name || "Patient",
        email: email || user.email || "",
        phone: phone || user.phone || "",
      };
    }
    if (await tableExists("patients")) {
      const patient = await one("SELECT user_id, name, email, phone FROM patients WHERE id = ? LIMIT 1", [row.patient_id]).catch(() => null);
      userId = patient?.user_id || null;
      if (!userId) {
        return {
          userId: null,
          name: name || patient?.name || "Patient",
          email: email || patient?.email || "",
          phone: phone || patient?.phone || "",
        };
      }
    }
  }
  if (userId) {
    const user = await one("SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1", [userId]).catch(() => null);
    return {
      userId,
      name: name || user?.name || "Patient",
      email: email || user?.email || "",
      phone: phone || user?.phone || "",
    };
  }
  return { userId: null, name, email, phone };
}

async function deliver({ userId, email, title, text, type }) {
  if (userId) await notifyInApp(userId, title, text, type);
  if (email && email.includes("@")) {
    await sendMail({ to: email, subject: title, text });
  }
}

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
  const when = [row.appointment_date, row.appointment_time].filter(Boolean).join(" ") || "now";
  const kind = instant ? "instant consultation" : "appointment";
  const amount = Number(payment?.amount || row.patient_pays || row.consultation_fee || 0);
  const money = amount > 0 ? ` (${amount} RWF)` : "";
  if (doctor?.email || doctor?.user_id) {
    await deliver({
      userId: doctor?.user_id,
      email: doctor?.email,
      title: instant ? "New instant consultation on MediConnect" : "Paid appointment waiting for your confirmation",
      text: instant
        ? `${patient.name} paid for an instant consultation${money}. Open your MediConnect dashboard to accept and join.`
        : `${patient.name} paid ${amount > 0 ? `${amount} RWF ` : ""}for an appointment on ${when}. Open your appointments, review the patient details, and confirm the visit. Email: ${patient.email || "not provided"}. Phone: ${patient.phone || "not provided"}.`,
      type: "visit.paid",
    });
  }
  if (patient.email || patient.userId) {
    await deliver({
      userId: patient.userId,
      email: patient.email,
      title: instant ? "Your MediConnect visit is confirmed" : "Payment received for your appointment",
      text: instant
        ? `Your payment is confirmed${doctor?.name ? ` with ${doctor.name}` : ""}. Sign in at https://mediconnect.rw to join when the doctor is ready.`
        : `Your payment${money} is received${doctor?.name ? ` for ${doctor.name}` : ""} on ${when}. The doctor still needs to confirm the appointment. You will get another email when they do. Sign in at https://mediconnect.rw/patient/appointments.`,
      type: "visit.paid",
    });
  }
}

export async function notifyBookedVisit(row) {
  const doctor = await doctorContact(row?.doctor_id);
  const patient = await patientContact(row);
  const when = [row?.appointment_date, row?.appointment_time].filter(Boolean).join(" ") || "the scheduled time";
  const amount = Number(row?.patient_pays || row?.consultation_fee || row?.amount || 0);
  const money = amount > 0 ? `${amount} RWF` : "the consultation fee";
  if (patient.email || patient.userId) {
    await deliver({
      userId: patient.userId,
      email: patient.email,
      title: "Pay to hold your MediConnect appointment",
      text: `Your appointment${doctor?.name ? ` with ${doctor.name}` : ""} is reserved for ${when}. Pay ${money} at https://mediconnect.rw/patient/appointments before the doctor can confirm it. The visit stays pending until that payment is complete.`,
      type: "visit.booked",
    });
  }
  if (doctor?.email || doctor?.user_id) {
    await deliver({
      userId: doctor?.user_id,
      email: doctor?.email,
      title: "New appointment request on MediConnect",
      text: `${patient.name} requested an appointment on ${when}. It stays pending until they pay ${money}. After payment you can open the appointment, review their details, and confirm it.`,
      type: "visit.booked",
    });
  }
}

export async function notifyAppointmentConfirmed(row) {
  const doctor = await doctorContact(row?.doctor_id);
  const patient = await patientContact(row);
  const when = [row?.appointment_date, row?.appointment_time].filter(Boolean).join(" ") || "the scheduled time";
  if (patient.email || patient.userId) {
    await deliver({
      userId: patient.userId,
      email: patient.email,
      title: "Your appointment is confirmed",
      text: `${doctor?.name || "Your doctor"} confirmed your appointment for ${when}. Sign in at https://mediconnect.rw/patient/appointments. You will get a reminder before it starts.`,
      type: "visit.confirmed",
    });
  }
  if (doctor?.email || doctor?.user_id) {
    await deliver({
      userId: doctor?.user_id,
      email: doctor?.email,
      title: "Appointment confirmed",
      text: `You confirmed ${patient.name}'s appointment for ${when}. Their email is ${patient.email || "not provided"} and their phone is ${patient.phone || "not provided"}.`,
      type: "visit.confirmed",
    });
  }
}

export async function notifyVisitCompleted(row, kind = "consultation") {
  const doctor = await doctorContact(row?.doctor_id);
  const patient = await patientContact(row);
  if (patient.email || patient.userId) {
    await deliver({
      userId: patient.userId,
      email: patient.email,
      title: "Your MediConnect consultation is complete",
      text: `Your ${kind}${doctor?.name ? ` with ${doctor.name}` : ""} is marked complete. Sign in at https://mediconnect.rw to see notes, prescriptions, or a follow-up booking.`,
      type: "visit.completed",
    });
  }
  if (doctor?.email || doctor?.user_id) {
    await deliver({
      userId: doctor?.user_id,
      email: doctor?.email,
      title: "Consultation marked complete",
      text: `${patient.name}'s ${kind} is marked complete. The next patient in the queue can now be accepted.`,
      type: "visit.completed",
    });
  }
}

export async function notifyDoctorReady(row) {
  const patient = await patientContact(row);
  const doctor = await doctorContact(row.doctor_id);
  await deliver({
    userId: patient.userId,
    email: patient.email,
    title: "Your doctor is ready",
    text: `${doctor?.name || "Your doctor"} is in the video consultation and is waiting for you. Open https://mediconnect.rw and join the call now.`,
    type: "visit.ready",
  });
}

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
    if (reminded.has(`appt-${row.id}`)) continue;
    const dateText = row.appointment_date instanceof Date
      ? `${row.appointment_date.getFullYear()}-${String(row.appointment_date.getMonth() + 1).padStart(2, "0")}-${String(row.appointment_date.getDate()).padStart(2, "0")}`
      : String(row.appointment_date).slice(0, 10);
    const time = String(row.appointment_time || "00:00");
    const start = new Date(`${dateText}T${time.length === 5 ? `${time}:00` : time}`);
    if (Number.isNaN(start.getTime())) continue;
    const minutes = (start.getTime() - now.getTime()) / 60000;
    if (minutes < 5 || minutes > 90) continue;
    reminded.add(`appt-${row.id}`);
    const doctor = await doctorContact(row.doctor_id);
    const patient = await patientContact(row);
    const text = `Your MediConnect appointment${doctor?.name ? ` with ${doctor.name}` : ""} starts at ${time}. Sign in at https://mediconnect.rw to join.`;
    await deliver({
      userId: patient.userId,
      email: patient.email,
      title: "Appointment reminder",
      text,
      type: "visit.reminder",
    });
    await deliver({
      userId: doctor?.user_id,
      email: doctor?.email,
      title: "Appointment reminder",
      text: `${patient.name} has an appointment at ${time}.`,
      type: "visit.reminder",
    });
  }
}
