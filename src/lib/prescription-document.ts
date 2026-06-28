// Frontend medical-prescription document. The backend PDF isn't publicly
// reachable (storage is 403/route 404), so we format the prescription data the
// app already has into a printable HTML page and open it for View / Download
// (browser print → Save as PDF). No external dependencies.

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(iso);
  }
}

function get<T = unknown>(obj: unknown, path: string): T | undefined {
  return path.split(".").reduce<any>((o, k) => (o == null ? o : o[k]), obj) as T | undefined;
}

/** Accepts the patient OR doctor prescription shape (read defensively). */
export interface PrescriptionLike {
  prescription_number?: string;
  diagnosis?: string | null;
  notes?: string | null;
  valid_until?: string | null;
  status?: string;
  is_signed?: boolean;
  signed_at?: string | null;
  issued_at?: string | null;
  created_at?: string;
  qr_code?: string | null;
  items?: Array<{
    medicine_name?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
    instructions?: string;
  }>;
  [key: string]: unknown;
}

export function buildPrescriptionHtml(p: PrescriptionLike): string {
  const doctorName =
    get<string>(p, "doctor.user.name") ?? get<string>(p, "doctor.name") ?? "";
  const doctorSpec =
    get<string>(p, "doctor.specialization") ?? "";
  const doctorDegree =
    get<string>(p, "doctor.doctor_degree") ?? get<string>(p, "doctor.degree") ?? "";
  const doctorEmail = get<string>(p, "doctor.user.email") ?? get<string>(p, "doctor.email") ?? "";
  const doctorPhone = get<string>(p, "doctor.user.phone") ?? get<string>(p, "doctor.phone") ?? "";

  const patientName =
    get<string>(p, "patient.name") ?? get<string>(p, "patient.user.name") ?? "";
  const patientPhone = get<string>(p, "patient.phone") ?? "";

  const items = p.items ?? [];
  const rows = items
    .map(
      (it, i) => `<tr>
        <td>${i + 1}</td>
        <td><b>${esc(it.medicine_name ?? "")}</b>${it.dosage ? `<div class="sub">${esc(it.dosage)}</div>` : ""}</td>
        <td>${esc(it.frequency ?? "—")}</td>
        <td>${esc(it.duration ?? "—")}</td>
        <td>${esc(it.quantity ?? "—")}</td>
        <td>${esc(it.instructions ?? "—")}</td>
      </tr>`,
    )
    .join("");

  const signedLine = p.is_signed
    ? `<div class="signed">✔ Digitally signed by ${doctorName ? esc(doctorName) : "the doctor"}${p.signed_at ? ` on ${esc(fmtDate(p.signed_at))}` : ""}</div>`
    : `<div class="unsigned">Not yet signed</div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Prescription ${esc(p.prescription_number ?? "")}</title>
<style>
  :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --brand:#0ea5a4; }
  * { box-sizing:border-box; }
  body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color:var(--ink); background:#f1f5f9; }
  .toolbar { position:sticky; top:0; display:flex; gap:8px; justify-content:flex-end; padding:12px 16px; background:#fff; border-bottom:1px solid var(--line); }
  .toolbar button { font:inherit; font-size:13px; font-weight:600; padding:8px 14px; border-radius:6px; border:1px solid var(--line); background:#fff; cursor:pointer; }
  .toolbar button.primary { background:var(--brand); border-color:var(--brand); color:#fff; }
  .page { max-width:820px; margin:18px auto; background:#fff; border:1px solid var(--line); border-radius:8px; padding:32px 36px; }
  header.doc { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid var(--brand); padding-bottom:14px; margin-bottom:16px; }
  .brand { font-size:20px; font-weight:800; color:var(--brand); letter-spacing:-.3px; }
  .brand small { display:block; font-size:10px; font-weight:600; color:var(--muted); letter-spacing:1px; text-transform:uppercase; }
  .docmeta { text-align:right; font-size:12px; color:var(--muted); }
  .docmeta b { color:var(--ink); }
  .badge { display:inline-block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; padding:2px 8px; border-radius:999px; background:#ecfeff; color:#0e7490; }
  .who { display:flex; gap:32px; flex-wrap:wrap; margin:6px 0 14px; }
  .who div span { display:block; font-size:10px; text-transform:uppercase; letter-spacing:.6px; color:var(--muted); }
  .who div b { font-size:14px; }
  section { margin-top:16px; }
  section h2 { font-size:11px; text-transform:uppercase; letter-spacing:.8px; color:var(--brand); margin:0 0 8px; padding-bottom:4px; border-bottom:1px solid var(--line); }
  .rx { font-size:34px; font-weight:800; color:var(--brand); line-height:1; }
  table { width:100%; border-collapse:collapse; font-size:12.5px; }
  th { text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); padding:8px 8px; border-bottom:1px solid var(--line); }
  td { padding:9px 8px; border-bottom:1px solid var(--line); vertical-align:top; }
  td .sub { color:var(--muted); font-size:11px; margin-top:2px; }
  .meta { color:var(--muted); font-size:12px; }
  .signed { margin-top:14px; color:#16a34a; font-weight:600; font-size:13px; }
  .unsigned { margin-top:14px; color:#d97706; font-weight:600; font-size:13px; }
  footer.doc { margin-top:22px; padding-top:12px; border-top:1px solid var(--line); font-size:11px; color:var(--muted); display:flex; justify-content:space-between; align-items:center; }
  footer.doc img { height:64px; width:64px; }
  @media print { body { background:#fff; } .toolbar { display:none; } .page { border:0; margin:0; max-width:none; padding:0; } }
</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()" class="primary">Download / Print PDF</button>
    <button onclick="window.close()">Close</button>
  </div>
  <div class="page">
    <header class="doc">
      <div>
        <div class="brand">MediConnect<small>Medical Prescription</small></div>
        <div class="rx" style="margin-top:8px">℞</div>
      </div>
      <div class="docmeta">
        <div><b>${esc(p.prescription_number ?? "")}</b></div>
        ${p.status ? `<div><span class="badge">${esc(String(p.status).replace(/_/g, " "))}</span></div>` : ""}
        ${p.created_at ? `<div>Issued ${esc(fmtDate(p.issued_at ?? p.created_at))}</div>` : ""}
        ${p.valid_until ? `<div>Valid until ${esc(fmtDate(p.valid_until))}</div>` : ""}
      </div>
    </header>

    <div class="who">
      ${patientName ? `<div><span>Patient</span><b>${esc(patientName)}</b>${patientPhone ? `<div class="meta">${esc(patientPhone)}</div>` : ""}</div>` : ""}
      ${doctorName ? `<div><span>Prescribing doctor</span><b>${esc(doctorName)}</b><div class="meta">${[doctorSpec, doctorDegree].filter(Boolean).map(esc).join(" · ")}</div></div>` : ""}
    </div>

    ${
      p.diagnosis || p.notes
        ? `<section><h2>Diagnosis</h2><div>${esc(p.diagnosis ?? "")}</div>${p.notes ? `<div class="meta" style="margin-top:4px">${esc(p.notes)}</div>` : ""}</section>`
        : ""
    }

    <section>
      <h2>Medications</h2>
      ${
        rows
          ? `<table>
              <thead><tr><th>#</th><th>Medicine</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>`
          : `<p class="meta">No medications listed.</p>`
      }
    </section>

    ${signedLine}

    <footer class="doc">
      <div>
        ${doctorEmail ? `<div>${esc(doctorEmail)}</div>` : ""}
        ${doctorPhone ? `<div>${esc(doctorPhone)}</div>` : ""}
        <div style="margin-top:4px">Generated by MediConnect · ${esc(fmtDate(new Date().toISOString()))}</div>
      </div>
      ${p.qr_code ? `<img src="${esc(p.qr_code)}" alt="QR code" />` : ""}
    </footer>
  </div>
</body>
</html>`;
}

export function openPrescriptionDocument(prescription: PrescriptionLike, autoPrint = false): void {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.open();
  win.document.write(buildPrescriptionHtml(prescription));
  win.document.close();
  if (autoPrint) win.setTimeout(() => win.print(), 350);
}
