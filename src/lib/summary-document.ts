// Frontend consultation-summary document. Formats a ConsultationSummary into a
// printable HTML page and opens it in a new tab — for viewing or for
// "Download" (browser print → Save as PDF). No external dependencies.

import type { ConsultationSummary } from "@/hooks/doctor/use-consultation-summaries";

const pretty = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Rich-text fields are first-party HTML (sanitised on save) — render as-is. */
function richOrDash(html?: string | null): string {
  const v = (html ?? "").trim();
  return v || "<span class='muted'>—</span>";
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function patientName(s: ConsultationSummary): string {
  const p = (s as unknown as { patient?: { name?: string; user?: { name?: string } } }).patient;
  return p?.name || p?.user?.name || `Patient #${s.patient_id}`;
}

function doctorName(s: ConsultationSummary): string {
  const d = (s as unknown as { doctor?: { user?: { name?: string }; name?: string } }).doctor;
  return d?.user?.name || d?.name || "";
}

function section(title: string, body: string): string {
  if (!body.trim()) return "";
  return `<section><h2>${esc(title)}</h2><div class="body">${body}</div></section>`;
}

function row(label: string, value: string): string {
  if (!value.trim()) return "";
  return `<div class="row"><span class="k">${esc(label)}</span><span class="v">${value}</span></div>`;
}

function chips(items: string[]): string {
  return items.map((i) => `<span class="chip">${esc(pretty(i))}</span>`).join(" ");
}

export function buildSummaryHtml(s: ConsultationSummary): string {
  console.log("Building summary HTML for summary ID:", s);
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

  const ccBody =
    richOrDash(cc.main_complaint) +
    (cc.duration_value != null
      ? `<p class="meta">Duration: ${esc(cc.duration_value)} ${esc(cc.duration_unit ?? "")}</p>`
      : "");

  const hpiBody =
    row("Onset", esc(hpi.onset ?? "")) +
    row("Location", esc(hpi.location ?? "")) +
    row("Severity", hpi.severity != null ? `${esc(hpi.severity)}/10` : "");

  const rosBody = Object.entries(ros)
    .filter(([, list]) => (list ?? []).length)
    .map(([sys, list]) => `<div class="row"><span class="k">${esc(pretty(sys))}</span><span class="v">${chips(list ?? [])}</span></div>`)
    .join("");

  const flagsBody = flags.length
    ? `<div class="chips danger">${flags.map(([k]) => `<span class="chip danger">${esc(pretty(k))}</span>`).join(" ")}</div>`
    : "";

  const caBody =
    row("Primary diagnosis", esc(ca.primary_diagnosis ?? "")) +
    row("Severity", esc(ca.severity_classification ? pretty(ca.severity_classification) : ""));

  const meds = mp.medications_prescribed ?? [];
  const mpBody =
    (meds.length ? row("Medications", chips(meds)) : "") +
    (mp.followup_plan ? `<div class="rich">${richOrDash(mp.followup_plan)}</div>` : "");

  const dn = doctorName(s);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Consultation Summary #${esc(s.id)}</title>
<style>
  :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --brand:#0ea5a4; --danger:#dc2626; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color:var(--ink); background:#f1f5f9; }
  .toolbar { position:sticky; top:0; display:flex; gap:8px; justify-content:flex-end; padding:12px 16px; background:#fff; border-bottom:1px solid var(--line); }
  .toolbar button { font:inherit; font-size:13px; font-weight:600; padding:8px 14px; border-radius:6px; border:1px solid var(--line); background:#fff; cursor:pointer; }
  .toolbar button.primary { background:var(--brand); border-color:var(--brand); color:#fff; }
  .page { max-width:800px; margin:18px auto; background:#fff; border:1px solid var(--line); border-radius:8px; padding:32px 36px; }
  header.doc { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid var(--brand); padding-bottom:14px; margin-bottom:18px; }
  .brand { font-size:20px; font-weight:800; color:var(--brand); letter-spacing:-.3px; }
  .brand small { display:block; font-size:10px; font-weight:600; color:var(--muted); letter-spacing:1px; text-transform:uppercase; }
  .docmeta { text-align:right; font-size:12px; color:var(--muted); }
  .docmeta b { color:var(--ink); }
  .badge { display:inline-block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; padding:2px 8px; border-radius:999px; background:#ecfeff; color:#0e7490; }
  .who { display:flex; gap:28px; flex-wrap:wrap; margin-bottom:8px; }
  .who div span { display:block; font-size:10px; text-transform:uppercase; letter-spacing:.6px; color:var(--muted); }
  .who div b { font-size:14px; }
  .alert { margin:14px 0; padding:10px 14px; border:1px solid #fecaca; background:#fef2f2; color:var(--danger); border-radius:6px; font-size:13px; font-weight:600; }
  section { margin-top:18px; }
  section h2 { font-size:11px; text-transform:uppercase; letter-spacing:.8px; color:var(--brand); margin:0 0 8px; padding-bottom:4px; border-bottom:1px solid var(--line); }
  .body { font-size:13.5px; line-height:1.55; }
  .row { display:flex; gap:12px; padding:4px 0; }
  .row .k { min-width:140px; color:var(--muted); font-size:12px; text-transform:capitalize; }
  .row .v { flex:1; }
  .chip { display:inline-block; font-size:11px; padding:2px 8px; border-radius:999px; background:#f1f5f9; margin:2px 2px 2px 0; }
  .chip.danger { background:#fef2f2; color:var(--danger); }
  .meta, .muted { color:var(--muted); font-size:12px; }
  .rich { margin-top:6px; }
  footer.doc { margin-top:26px; padding-top:12px; border-top:1px solid var(--line); font-size:11px; color:var(--muted); display:flex; justify-content:space-between; }
  @media print {
    body { background:#fff; }
    .toolbar { display:none; }
    .page { border:0; margin:0; max-width:none; padding:0; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()" class="primary">Download / Print PDF</button>
    <button onclick="window.close()">Close</button>
  </div>
  <div class="page">
    <header class="doc">
      <div class="brand">MediConnect<small>Consultation Summary</small></div>
      <div class="docmeta">
        <div><b>#${esc(s.id)}</b> · <span class="badge">${isInstant ? "Instant" : "Appointment"}</span></div>
        ${s.created_at ? `<div>${esc(fmtDate(s.created_at))}</div>` : ""}
      </div>
    </header>

    <div class="who">
      <div><span>Patient</span><b>${esc(patientName(s))}</b></div>
      ${dn ? `<div><span>Attending doctor</span><b>${esc(dn)}</b></div>` : ""}
    </div>

    ${alert ? `<div class="alert">⚠ Red flag present — escalation / in-person care may be required.</div>` : ""}

    ${section("Chief complaint", ccBody)}
    ${section("History of present illness", hpiBody)}
    ${section("Review of systems", rosBody)}
    ${section("Red-flag screening", flagsBody)}
    ${section("Clinical assessment", caBody)}
    ${section("Management plan", mpBody)}

    <footer class="doc">
      <span>Generated by MediConnect</span>
      <span>${esc(fmtDate(new Date().toISOString()))}</span>
    </footer>
  </div>
</body>
</html>`;
}

/** Write the document into an already-opened window (preserves the user gesture
 *  so the browser doesn't block it when data is fetched asynchronously). */
export function writeSummaryToWindow(
  win: Window | null,
  summary: ConsultationSummary,
  autoPrint = false,
): boolean {
  if (!win) return false;
  win.document.open();
  win.document.write(buildSummaryHtml(summary));
  win.document.close();
  if (autoPrint) {
    // Give the layout a tick before invoking print.
    win.setTimeout(() => win.print(), 350);
  }
  return true;
}

/** Open the summary document in a new tab. autoPrint=true → straight to the
 *  print / Save-as-PDF dialog. */
export function openSummaryDocument(summary: ConsultationSummary, autoPrint = false): void {
  const win = window.open("", "_blank");
  writeSummaryToWindow(win, summary, autoPrint);
}

/** Open a blank tab synchronously (call inside a click handler), so a later
 *  async fetch can write into it without popup-blocking. */
export function openBlankSummaryWindow(): Window | null {
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(
      "<!doctype html><title>Loading…</title><body style='font:14px system-ui;padding:24px;color:#475569'>Preparing consultation summary…</body>",
    );
  }
  return win;
}
