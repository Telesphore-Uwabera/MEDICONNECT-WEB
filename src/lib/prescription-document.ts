import { formatDateOnly } from "@/lib/date";
import LOGOLIGHT from "@/assets/LOGOLIGHT.png";
// Frontend medical-prescription document. The backend PDF isn't publicly
// reachable (storage is 403/route 404), so we format the prescription data the
// app already has into a printable HTML page and open it for View / Download
// (browser print -> Save as PDF). No external dependencies.

export type DocumentBrandSettings = unknown;

type ResolvedBrand = {
  appName: string;
  tagline: string;
  logoUrl: string;
  email: string;
  phone: string;
  address: string;
  website: string;
};

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
    return formatDateOnly(iso, undefined, { year: "numeric", month: "short", day: "numeric" });
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

function getGeneral(settings?: DocumentBrandSettings): Record<string, unknown> {
  const payload = (settings ?? {}) as any;
  return payload?.general ?? payload?.settings?.general ?? payload?.settings ?? payload ?? {};
}

function localized(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{")) {
      try {
        return localized(JSON.parse(trimmed));
      } catch {
        return value;
      }
    }
    return value;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.en ?? record.en_US ?? "");
  }
  return "";
}
function resolveBrand(settings?: DocumentBrandSettings): ResolvedBrand {
  const general = getGeneral(settings);
  return {
    appName: String(general.app_name ?? "MediConnect"),
    tagline: localized(general.app_tagline) || "Bringing care to your fingertips",
    logoUrl: String(general.app_logo_url ?? LOGOLIGHT),
    email: String(general.contact_email ?? "admin@mediconnect.rw"),
    phone: String(general.contact_phone ?? "+250 782 168 650"),
    address: String(general.contact_address ?? "Kigali, Rwanda"),
    website: String(general.app_url ?? "mediconnect.rw"),
  };
}

function contactBlock(brand: ResolvedBrand): string {
  return `<table class="contact-table"><tr>
    <td><b>Email:</b> ${esc(brand.email)}</td>
    <td><b>Phone:</b> ${esc(brand.phone)}</td>
  </tr><tr>
    <td><b>Address:</b> ${esc(brand.address)}</td>
    <td><b>Website:</b> ${esc(brand.website)}</td>
  </tr></table>`;
}

function statusLabel(status?: string): string {
  return String(status ?? "Prescription").replace(/_/g, " ");
}

function infoRow(label: string, value: string): string {
  return `<tr><td class="label">${esc(label)}</td><td>${value.trim() ? value : "-"}</td></tr>`;
}

function section(title: string, rows: string): string {
  if (!rows.trim()) return "";
  return `<table class="section-table"><thead><tr><th colspan="2">${esc(title)}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

const documentCss = `
  :root { --ink:#111827; --muted:#4b5563; --line:#222; --soft-line:#9ca3af; --header:#bcd7fb; --brand:#05a8a2; --brand-dark:#05716f; --success:#166534; --warning:#92400e; }
  * { box-sizing:border-box; }
  body { margin:0; font-family: Georgia, "Times New Roman", serif; color:var(--ink); background:#eef3f8; }
  .toolbar { position:sticky; top:0; z-index:10; display:flex; gap:8px; justify-content:flex-end; padding:12px 16px; background:#fff; border-bottom:1px solid #d5dee8; font-family:Arial, sans-serif; }
  .toolbar button { font:inherit; font-size:13px; font-weight:700; padding:8px 14px; border-radius:6px; border:1px solid #cbd5e1; background:#fff; cursor:pointer; }
  .toolbar button.primary { background:var(--brand); border-color:var(--brand); color:#fff; }
  .page { width:8.27in; min-height:11.69in; margin:22px auto; background:#fff; padding:.55in .62in; box-shadow:0 12px 35px rgba(15,23,42,.12); }
  .doc-header { display:grid; grid-template-columns:1.3fr 1fr; gap:20px; align-items:start; border-bottom:3px solid var(--brand); padding-bottom:14px; margin-bottom:12px; }
  .brand-row { display:flex; gap:14px; align-items:center; }
  .brand-row img { max-width:172px; max-height:64px; object-fit:contain; }
  .brand-name { font-family:Arial, sans-serif; font-size:20px; font-weight:900; color:var(--brand-dark); line-height:1.05; }
  .tagline { font-family:Arial, sans-serif; font-size:11px; color:var(--muted); margin-top:3px; }
  .title-box { text-align:right; font-family:Arial, sans-serif; }
  .title-box h1 { margin:0; font-size:18px; letter-spacing:.7px; text-transform:uppercase; color:#0f172a; }
  .title-box .doc-no { margin-top:7px; font-size:12px; color:var(--muted); }
  .badge { display:inline-block; padding:2px 8px; border:1px solid var(--brand); border-radius:99px; color:var(--brand-dark); font-weight:800; text-transform:uppercase; font-size:10px; }
  .rx-mark { display:inline-block; margin-top:8px; border:1px solid var(--brand); color:var(--brand-dark); padding:3px 10px; font-size:17px; font-weight:900; }
  table { width:100%; border-collapse:collapse; margin:0 0 14px; font-size:13px; }
  .contact-table { font-family:Arial, sans-serif; font-size:11px; border:1px solid var(--soft-line); margin-bottom:18px; }
  .contact-table td { border:1px solid var(--soft-line); padding:6px 8px; }
  .section-table th, .med-table th { background:var(--header); border:1px solid var(--line); padding:7px 9px; text-align:left; font-size:14px; font-weight:800; }
  .section-table td, .med-table td { border:1px solid var(--line); padding:7px 9px; vertical-align:top; line-height:1.45; }
  .section-table td.label { width:34%; font-weight:700; background:#fafafa; }
  .med-table th { font-size:12px; }
  .med-table .num { width:38px; text-align:center; }
  .sub { display:block; color:var(--muted); font-size:11px; margin-top:2px; }
  .signed, .unsigned { margin:0 0 14px; padding:8px 10px; border:1px solid var(--line); font-family:Arial, sans-serif; font-size:12px; font-weight:700; }
  .signed { color:var(--success); background:#f0fdf4; border-color:#86efac; }
  .unsigned { color:var(--warning); background:#fffbeb; border-color:#fcd34d; }
  .footer { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; border-top:2px solid var(--brand); padding-top:9px; margin-top:22px; font-family:Arial, sans-serif; color:var(--muted); font-size:10.5px; }
  .footer img { width:70px; height:70px; object-fit:contain; border:1px solid var(--soft-line); padding:4px; }
  @media print {
    body { background:#fff; }
    .toolbar { display:none; }
    .page { width:auto; min-height:auto; margin:0; padding:.35in .45in; box-shadow:none; }
    table, .signed, .unsigned { break-inside:avoid; }
  }
`;

export function buildPrescriptionHtml(p: PrescriptionLike, settings?: DocumentBrandSettings): string {
  const brand = resolveBrand(settings);
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
        <td class="num">${i + 1}</td>
        <td><b>${esc(it.medicine_name ?? "")}</b>${it.dosage ? `<span class="sub">${esc(it.dosage)}</span>` : ""}</td>
        <td>${esc(it.frequency ?? "-")}</td>
        <td>${esc(it.duration ?? "-")}</td>
        <td>${esc(it.quantity ?? "-")}</td>
        <td>${esc(it.instructions ?? "-")}</td>
      </tr>`,
    )
    .join("");

  const signedLine = p.is_signed
    ? `<div class="signed">Digitally signed by ${doctorName ? esc(doctorName) : "the doctor"}${p.signed_at ? ` on ${esc(fmtDate(p.signed_at))}` : ""}</div>`
    : `<div class="unsigned">Not yet signed</div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Prescription ${esc(p.prescription_number ?? "")}</title>
<style>${documentCss}</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()" class="primary">Download / Print PDF</button>
    <button onclick="window.close()">Close</button>
  </div>
  <main class="page">
    <header class="doc-header">
      <div class="brand-row">
        <img src="${esc(brand.logoUrl)}" alt="${esc(brand.appName)}" />
        <div>
          <div class="brand-name">${esc(brand.appName)}</div>
          <div class="tagline">${esc(brand.tagline)}</div>
        </div>
      </div>
      <div class="title-box">
        <h1>Medical Prescription</h1>
        <div class="rx-mark">Rx</div>
        <div class="doc-no"><b>${esc(p.prescription_number ?? "Prescription")}</b></div>
        ${p.status ? `<div class="doc-no"><span class="badge">${esc(statusLabel(p.status))}</span></div>` : ""}
      </div>
    </header>

    ${contactBlock(brand)}

    ${section("Patient Information", infoRow("Patient Name", esc(patientName)) + infoRow("Phone Number", esc(patientPhone)))}
    ${section("Prescribing Physician Information", infoRow("Physician Name", esc(doctorName)) + infoRow("Specialty", esc(doctorSpec)) + infoRow("Qualification", esc(doctorDegree)) + infoRow("Email", esc(doctorEmail)) + infoRow("Phone Number", esc(doctorPhone)))}
    ${section("Prescription Information", infoRow("Prescription Number", esc(p.prescription_number ?? "")) + infoRow("Status", esc(statusLabel(p.status))) + infoRow("Issued Date", esc(fmtDate(p.issued_at ?? p.created_at))) + infoRow("Valid Until", esc(fmtDate(p.valid_until))))}
    ${
      p.diagnosis || p.notes
        ? section("Diagnosis and Notes", infoRow("Diagnosis", esc(p.diagnosis ?? "")) + infoRow("Notes", esc(p.notes ?? "")))
        : ""
    }

    <table class="med-table">
      <thead><tr><th class="num">#</th><th>Medicine</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6">No medications listed.</td></tr>`}</tbody>
    </table>

    ${signedLine}

    <footer class="footer">
      <div>
        <div>${esc(brand.appName)} digital health document</div>
        <div>${esc(brand.email)} | ${esc(brand.phone)}</div>
        <div>Generated ${esc(fmtDate(new Date().toISOString()))}</div>
      </div>
      ${p.qr_code ? `<img src="${esc(p.qr_code)}" alt="QR code" />` : ""}
    </footer>
  </main>
</body>
</html>`;
}

export function openPrescriptionDocument(
  prescription: PrescriptionLike,
  autoPrint = false,
  settings?: DocumentBrandSettings,
): void {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.open();
  win.document.write(buildPrescriptionHtml(prescription, settings));
  win.document.close();
  if (autoPrint) win.setTimeout(() => win.print(), 350);
}
