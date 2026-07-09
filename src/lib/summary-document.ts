// Frontend consultation-summary document. Formats a ConsultationSummary into a
// printable HTML page and opens it in a new tab for viewing or for
// "Download" (browser print -> Save as PDF). No external dependencies.

import type { ConsultationSummary } from "@/hooks/doctor/use-consultation-summaries";
import LOGOLIGHT from "@/assets/LOGOLIGHT.png";

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

const pretty = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Rich-text fields are first-party HTML (sanitised on save) - render as-is. */
function richOrDash(html?: string | null): string {
  const v = (html ?? "").trim();
  return v || "<span class='muted'>-</span>";
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function plainText(html?: string | null): string {
  return String(html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function patientName(s: ConsultationSummary): string {
  const p = (s as unknown as { patient?: { name?: string; user?: { name?: string } } }).patient;
  return p?.name || p?.user?.name || `Patient #${s.patient_id}`;
}

function doctorName(s: ConsultationSummary): string {
  const d = (s as unknown as { doctor?: { user?: { name?: string }; name?: string } }).doctor;
  return d?.user?.name || d?.name || "";
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

function row(label: string, value: string): string {
  return `<tr><td class="label">${esc(label)}</td><td>${value.trim() ? value : "-"}</td></tr>`;
}

function chips(items: string[]): string {
  return items.length ? items.map((i) => `<span class="chip">${esc(pretty(i))}</span>`).join(" ") : "-";
}

function section(title: string, rows: string): string {
  if (!rows.trim()) return "";
  return `<table class="section-table"><thead><tr><th colspan="2">${esc(title)}</th></tr></thead><tbody>${rows}</tbody></table>`;
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

const documentCss = `
  :root { --ink:#111827; --muted:#4b5563; --line:#222; --soft-line:#9ca3af; --header:#bcd7fb; --brand:#05a8a2; --brand-dark:#05716f; }
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
  table { width:100%; border-collapse:collapse; margin:0 0 14px; font-size:13px; }
  .contact-table { font-family:Arial, sans-serif; font-size:11px; border:1px solid var(--soft-line); margin-bottom:18px; }
  .contact-table td { border:1px solid var(--soft-line); padding:6px 8px; }
  .section-table th { background:var(--header); border:1px solid var(--line); padding:7px 9px; text-align:left; font-size:14px; font-weight:800; }
  .section-table td { border:1px solid var(--line); padding:7px 9px; vertical-align:top; line-height:1.45; }
  .section-table td.label { width:34%; font-weight:700; background:#fafafa; }
  .rich-cell { min-height:34px; }
  .chip { display:inline-block; font-family:Arial, sans-serif; font-size:11px; padding:2px 7px; margin:1px 2px 1px 0; border:1px solid #a7e7e2; border-radius:99px; background:#effefd; color:#075f5e; }
  .chip.danger { border-color:#fecaca; background:#fef2f2; color:#b91c1c; }
  .alert { margin:0 0 14px; padding:8px 10px; border:1px solid #b91c1c; background:#fef2f2; color:#991b1b; font-family:Arial, sans-serif; font-size:12px; font-weight:700; }
  .muted { color:var(--muted); }
  .footer { display:flex; justify-content:space-between; gap:16px; border-top:2px solid var(--brand); padding-top:9px; margin-top:22px; font-family:Arial, sans-serif; color:var(--muted); font-size:10.5px; }
  @media print {
    body { background:#fff; }
    .toolbar { display:none; }
    .page { width:auto; min-height:auto; margin:0; padding:.35in .45in; box-shadow:none; }
    table, .alert { break-inside:avoid; }
  }
`;

export function buildSummaryHtml(s: ConsultationSummary, settings?: DocumentBrandSettings): string {
  const brand = resolveBrand(settings);
  const isInstant = s.instant_consultation_id != null;
  const cc = s.chief_complaint ?? {};
  const hpi = s.history_of_present_illness ?? {};
  const ros = s.review_of_systems ?? {};
  const ca = s.clinical_assessment ?? {};
  const mp = s.management_plan ?? {};
  const flags = Object.entries(s.red_flag_screening ?? {}).filter(
    ([k, v]) => v && k !== "alert_triggered",
  );
  const alert = s.red_flag_screening?.alert_triggered;
  const dn = doctorName(s);
  const meds = mp.medications_prescribed ?? [];

  const rosRows = Object.entries(ros)
    .filter(([, list]) => (list ?? []).length)
    .map(([sys, list]) => row(pretty(sys), chips(list ?? [])))
    .join("");
  const flagsBody = flags.length
    ? `<tr><td class="label">Active red flags</td><td>${flags.map(([k]) => `<span class="chip danger">${esc(pretty(k))}</span>`).join(" ")}</td></tr>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Consultation Summary #${esc(s.id)}</title>
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
        <h1>Consultation Summary</h1>
        <div class="doc-no"><b>#${esc(s.id)}</b> &nbsp; <span class="badge">${isInstant ? "Instant" : "Appointment"}</span></div>
        ${s.created_at ? `<div class="doc-no">${esc(fmtDate(s.created_at))}</div>` : ""}
      </div>
    </header>

    ${contactBlock(brand)}
    ${alert ? `<div class="alert">Red flag present - escalation or in-person care may be required.</div>` : ""}

    ${section("Patient Information", row("Patient Name", esc(patientName(s))) + row("Patient ID", esc(s.patient_id)))}
    ${section("Attending Doctor Information", row("Doctor Name", esc(dn || "-")))}
    ${section("Document Information", row("Summary ID", esc(s.id)) + row("Consultation Type", isInstant ? "Instant" : "Appointment") + row("Generated On", esc(fmtDate(new Date().toISOString()))))}
    ${section("Chief Complaint", row("Main Complaint", `<div class="rich-cell">${richOrDash(cc.main_complaint)}</div>`) + row("Duration", cc.duration_value != null ? `${esc(cc.duration_value)} ${esc(cc.duration_unit ?? "")}` : ""))}
    ${section("History of Present Illness", row("Onset", esc(hpi.onset ?? "")) + row("Location", esc(hpi.location ?? "")) + row("Severity", hpi.severity != null ? `${esc(hpi.severity)}/10` : ""))}
    ${rosRows ? section("Review of Systems", rosRows) : ""}
    ${flagsBody ? section("Red-Flag Screening", flagsBody) : ""}
    ${section("Clinical Assessment", row("Primary Diagnosis", esc(ca.primary_diagnosis ?? "")) + row("Severity Classification", esc(ca.severity_classification ? pretty(ca.severity_classification) : "")))}
    ${section("Management Plan", row("Medications Prescribed", chips(meds)) + row("Follow-up Plan", `<div class="rich-cell">${mp.followup_plan ? richOrDash(mp.followup_plan) : "-"}</div>`))}

    <footer class="footer">
      <span>${esc(brand.appName)} digital health document</span>
      <span>${esc(brand.email)} | ${esc(brand.phone)}</span>
    </footer>
  </main>
</body>
</html>`;
}

/** Write the document into an already-opened window (preserves the user gesture
 *  so the browser doesn't block it when data is fetched asynchronously). */
export function writeSummaryToWindow(
  win: Window | null,
  summary: ConsultationSummary,
  autoPrint = false,
  settings?: DocumentBrandSettings,
): boolean {
  if (!win) return false;
  win.document.open();
  win.document.write(buildSummaryHtml(summary, settings));
  win.document.close();
  if (autoPrint) {
    // Give the layout a tick before invoking print.
    win.setTimeout(() => win.print(), 350);
  }
  return true;
}

/** Open the summary document in a new tab. autoPrint=true -> straight to the
 *  print / Save-as-PDF dialog. */
export function openSummaryDocument(
  summary: ConsultationSummary,
  autoPrint = false,
  settings?: DocumentBrandSettings,
): void {
  const win = window.open("", "_blank");
  writeSummaryToWindow(win, summary, autoPrint, settings);
}

/** Open a blank tab synchronously (call inside a click handler), so a later
 *  async fetch can write into it without popup-blocking. */
export function openBlankSummaryWindow(): Window | null {
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(
      "<!doctype html><title>Loading...</title><body style='font:14px system-ui;padding:24px;color:#475569'>Preparing consultation summary...</body>",
    );
  }
  return win;
}
