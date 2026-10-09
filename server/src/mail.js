import nodemailer from "nodemailer";

// ─── Brand constants ──────────────────────────────────────────────────────────
const BRAND = {
  primary: "#0BA59B",       // MediConnect teal
  primaryDark: "#078A81",
  accent: "#06C9BD",
  text: "#1a2e2d",
  textLight: "#4a6360",
  bg: "#f0fafa",
  cardBg: "#ffffff",
  border: "#d0ecea",
  footerBg: "#0d3533",
  footerText: "#a8d5d2",
  danger: "#e53e3e",
  success: "#38a169",
  warning: "#d97706",
};

// ─── SMTP config ──────────────────────────────────────────────────────────────
function mailConfig() {
  const host = process.env.MAIL_HOST || process.env.SMTP_HOST || "";
  const user = process.env.MAIL_USERNAME || process.env.SMTP_USER || "";
  const pass = process.env.MAIL_PASSWORD || process.env.SMTP_PASS || "";
  if (!host || !user || !pass) return null;
  const port = Number(process.env.MAIL_PORT || process.env.SMTP_PORT || 587);
  const encryption = String(process.env.MAIL_ENCRYPTION || "").toLowerCase();
  const secure = encryption === "ssl" || port === 465;
  return {
    host, port, secure,
    auth: { user, pass },
    from: process.env.MAIL_FROM_ADDRESS || user,
    fromName: process.env.MAIL_FROM_NAME || "MediConnect",
  };
}

// ─── HTML shell ───────────────────────────────────────────────────────────────
/**
 * Wraps any inner HTML content in the full MediConnect branded email shell.
 * @param {object} opts
 * @param {string} opts.title       - Email title shown in the header banner
 * @param {string} opts.preheader   - Short preview text (hidden, for email clients)
 * @param {string} opts.body        - Inner HTML content (paragraphs, buttons, etc.)
 * @param {string} [opts.accentHex] - Override the header accent color
 */
export function buildEmailHtml({ title, preheader = "", body, accentHex }) {
  const accent = accentHex || BRAND.primary;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escHtml(title)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}
    body{margin:0;padding:0;background-color:${BRAND.bg};font-family:'Segoe UI',Arial,sans-serif}
    a{color:${accent};text-decoration:none}
    a:hover{text-decoration:underline}
    .btn:hover{opacity:.88!important}
    @media only screen and (max-width:600px){
      .email-container{width:100%!important;max-width:100%!important}
      .px-mobile{padding-left:20px!important;padding-right:20px!important}
      .hide-mobile{display:none!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};">
  <!-- preheader -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:${BRAND.bg};">
    ${escHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table class="email-container" role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

          <!-- ── Header ─────────────────────────────────────────── -->
          <tr>
            <td style="background:linear-gradient(135deg,${accent} 0%,${BRAND.primaryDark} 100%);padding:28px 40px 24px;" class="px-mobile">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <!-- Logo wordmark -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:rgba(255,255,255,.18);border-radius:8px;padding:6px 10px;">
                          <span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-.3px;font-family:'Segoe UI',Arial,sans-serif;">Medi<span style="color:${BRAND.accent};">Connect</span></span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="color:rgba(255,255,255,.65);font-size:11px;font-family:'Segoe UI',Arial,sans-serif;">
                    Bringing Care to Your Fingertips
                  </td>
                </tr>
              </table>
              <!-- Title -->
              <p style="margin:18px 0 0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;font-family:'Segoe UI',Arial,sans-serif;">${escHtml(title)}</p>
            </td>
          </tr>

          <!-- ── Body ──────────────────────────────────────────── -->
          <tr>
            <td style="background:${BRAND.cardBg};padding:36px 40px 32px;" class="px-mobile">
              ${body}
            </td>
          </tr>

          <!-- ── Divider ────────────────────────────────────────── -->
          <tr>
            <td style="background:${BRAND.cardBg};padding:0 40px;" class="px-mobile">
              <hr style="border:none;border-top:1px solid ${BRAND.border};margin:0;" />
            </td>
          </tr>

          <!-- ── Footer ────────────────────────────────────────── -->
          <tr>
            <td style="background:${BRAND.footerBg};padding:28px 40px;" class="px-mobile">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;">MediConnect Rwanda</p>
                    <p style="margin:0 0 4px;font-size:11px;color:${BRAND.footerText};font-family:'Segoe UI',Arial,sans-serif;">📧 <a href="mailto:admin@mediconnect.rw" style="color:${BRAND.footerText};">admin@mediconnect.rw</a></p>
                    <p style="margin:0 0 4px;font-size:11px;color:${BRAND.footerText};font-family:'Segoe UI',Arial,sans-serif;">📞 <a href="tel:+250792363601" style="color:${BRAND.footerText};">+250 792 363 601</a></p>
                    <p style="margin:0 0 4px;font-size:11px;color:${BRAND.footerText};font-family:'Segoe UI',Arial,sans-serif;">🌐 <a href="https://mediconnect.rw" style="color:${BRAND.accent};">mediconnect.rw</a></p>
                  </td>
                  <td align="right" valign="top" class="hide-mobile">
                    <p style="margin:0;font-size:10px;color:${BRAND.footerText};font-family:'Segoe UI',Arial,sans-serif;">© ${year} MediConnect Ltd.<br/>All rights reserved.</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:16px;">
                    <p style="margin:0;font-size:10px;color:${BRAND.footerText};opacity:.65;font-family:'Segoe UI',Arial,sans-serif;">
                      You received this email because you have an account on MediConnect. If you believe this was sent in error, please contact us at <a href="mailto:admin@mediconnect.rw" style="color:${BRAND.footerText};">admin@mediconnect.rw</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Reusable building blocks ─────────────────────────────────────────────────

/** Escape HTML special characters */
function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A teal CTA button */
export function emailBtn(label, url, color) {
  const bg = color || BRAND.primary;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="border-radius:8px;background:${bg};">
      <a class="btn" href="${escHtml(url)}" target="_blank" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;text-decoration:none;border-radius:8px;background:${bg};">${escHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

/** A highlighted info box */
export function emailInfoBox(rows, accentColor) {
  const color = accentColor || BRAND.primary;
  const cells = rows
    .filter(Boolean)
    .map(([label, value]) => `
      <tr>
        <td style="padding:6px 0;font-size:12px;color:${BRAND.textLight};font-family:'Segoe UI',Arial,sans-serif;white-space:nowrap;padding-right:16px;">${escHtml(label)}</td>
        <td style="padding:6px 0;font-size:13px;color:${BRAND.text};font-weight:600;font-family:'Segoe UI',Arial,sans-serif;">${escHtml(value)}</td>
      </tr>`)
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="margin:20px 0;border-radius:8px;border:1px solid ${color}22;background:${color}08;overflow:hidden;">
  <tr>
    <td style="padding:16px 20px;border-left:4px solid ${color};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">${cells}</table>
    </td>
  </tr>
</table>`;
}

/** A plain paragraph — text is HTML-escaped (safe for user input) */
export function emailP(text, style) {
  return `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:${BRAND.text};font-family:'Segoe UI',Arial,sans-serif;${style || ""}">${escHtml(text)}</p>`;
}

/** A paragraph that accepts raw HTML markup (use only for trusted content) */
export function emailHtml(html, style) {
  return `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:${BRAND.text};font-family:'Segoe UI',Arial,sans-serif;${style || ""}">${html}</p>`;
}

/** A one-time code block */
export function emailOtpBlock(code) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
  <tr>
    <td align="center" style="border-radius:10px;background:${BRAND.bg};border:2px dashed ${BRAND.primary};padding:18px 36px;">
      <span style="font-size:34px;font-weight:800;letter-spacing:10px;color:${BRAND.primary};font-family:'Courier New',monospace;">${escHtml(code)}</span>
    </td>
  </tr>
</table>`;
}

// ─── Send ─────────────────────────────────────────────────────────────────────
/**
 * @param {{ to: string, subject: string, text: string, html?: string }} opts
 */
export async function sendMail({ to, subject, text, html }) {
  const config = mailConfig();
  if (!config || !to) return false;
  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
    await transport.sendMail({
      from: `"${config.fromName}" <${config.from}>`,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });
    return true;
  } catch (error) {
    console.error("Mail send failed:", error?.message || error);
    return false;
  }
}

// ─── Auth email builders ──────────────────────────────────────────────────────

function greeting(name) {
  const first = String(name || "").split(" ")[0] || "there";
  return `Hello, ${first}!`;
}

/**
 * Branded OTP email for password reset and phone/email verification.
 * Called from app.js for forgot-password and send-otp flows.
 */
export function buildOtpEmail({ code, type = "verification", recipientName }) {
  const isReset = String(type).includes("reset") || String(type).includes("password");
  const title = isReset ? "Reset your password" : "Your verification code";
  const preheader = `Your MediConnect ${isReset ? "password reset" : "verification"} code is ${code}`;
  const accentHex = isReset ? "#d97706" : BRAND.primary;

  const body = `
    ${emailP(greeting(recipientName))}
    ${emailHtml(isReset
      ? "We received a request to reset the password on your MediConnect account. Use the 6-digit code below — it expires in <strong>10 minutes</strong>."
      : "Use the one-time code below to verify your MediConnect account. This code expires in <strong>10 minutes</strong>."
    )}
    ${emailOtpBlock(code)}
    ${emailP("If you did not request this, you can safely ignore this email — your account remains secure.", "font-size:12px;color:#6b7280;")}
    ${isReset
      ? `<p style="margin:0;font-size:12px;color:#9ca3af;font-family:'Segoe UI',Arial,sans-serif;">For your security, never share this code with anyone — MediConnect staff will never ask for it.</p>`
      : ""}
  `;

  return buildEmailHtml({ title, preheader, body, accentHex });
}

/**
 * Welcome email sent right after account creation.
 */
export function buildWelcomeEmail({ name, role, loginUrl = "https://mediconnect.rw/auth" }) {
  const roleLabel = {
    patient: "Patient",
    doctor: "Doctor",
    hospital: "Hospital / Facility",
    pharmacy: "Pharmacy",
    admin: "Administrator",
  }[role] || "Member";

  const title = "Welcome to MediConnect!";
  const preheader = `Your ${roleLabel} account is ready. Sign in to get started.`;

  const body = `
    ${emailP(greeting(name))}
    ${emailHtml(`Your MediConnect <strong>${roleLabel}</strong> account has been successfully created. You can now sign in and start using the platform.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
      <tr>
        <td style="background:#f0fafa;border:1px solid #d0ecea;border-radius:8px;padding:16px 20px;border-left:4px solid #0BA59B;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0d3533;font-family:'Segoe UI',Arial,sans-serif;">What you can do on MediConnect</p>
          ${role === "patient" ? `
            <p style="margin:2px 0;font-size:12px;color:#4a6360;font-family:'Segoe UI',Arial,sans-serif;">✓ Book appointments with verified doctors</p>
            <p style="margin:2px 0;font-size:12px;color:#4a6360;font-family:'Segoe UI',Arial,sans-serif;">✓ Start instant video consultations</p>
            <p style="margin:2px 0;font-size:12px;color:#4a6360;font-family:'Segoe UI',Arial,sans-serif;">✓ View prescriptions and medical records</p>
            <p style="margin:2px 0;font-size:12px;color:#4a6360;font-family:'Segoe UI',Arial,sans-serif;">✓ Order medications from partnered pharmacies</p>
          ` : role === "doctor" ? `
            <p style="margin:2px 0;font-size:12px;color:#4a6360;font-family:'Segoe UI',Arial,sans-serif;">✓ Complete your profile to get approved</p>
            <p style="margin:2px 0;font-size:12px;color:#4a6360;font-family:'Segoe UI',Arial,sans-serif;">✓ Manage your schedule and appointments</p>
            <p style="margin:2px 0;font-size:12px;color:#4a6360;font-family:'Segoe UI',Arial,sans-serif;">✓ Conduct video consultations with patients</p>
            <p style="margin:2px 0;font-size:12px;color:#4a6360;font-family:'Segoe UI',Arial,sans-serif;">✓ Issue prescriptions and fitness certificates</p>
          ` : `
            <p style="margin:2px 0;font-size:12px;color:#4a6360;font-family:'Segoe UI',Arial,sans-serif;">✓ Complete your profile to get approved</p>
            <p style="margin:2px 0;font-size:12px;color:#4a6360;font-family:'Segoe UI',Arial,sans-serif;">✓ Manage your services and team</p>
            <p style="margin:2px 0;font-size:12px;color:#4a6360;font-family:'Segoe UI',Arial,sans-serif;">✓ Connect with patients across Rwanda</p>
          `}
        </td>
      </tr>
    </table>
    ${emailBtn("Sign In to MediConnect", loginUrl)}
    ${emailP("If you have any questions, our support team is always happy to help.", "font-size:12px;color:#6b7280;")}
  `;

  return buildEmailHtml({ title, preheader, body });
}
