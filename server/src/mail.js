import nodemailer from "nodemailer";
import { greeting as greetPerson, normalizeLang, phrase, pick } from "./user-text.js";

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
  const user = process.env.MAIL_USERNAME || process.env.SMTP_USER || "";
  const pass = process.env.MAIL_PASSWORD || process.env.SMTP_PASS || "";
  let host = process.env.MAIL_HOST || process.env.SMTP_HOST || "";
  if (!host && (user.includes("@gmail.com") || user.toLowerCase().includes("gmail"))) {
    host = "smtp.gmail.com";
  }
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
export function buildEmailHtml({ title, preheader = "", body, accentHex, lang = "en" }) {
  const accent = accentHex || BRAND.primary;
  const language = normalizeLang(lang);
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="${language === "rw" ? "rw" : language}">
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
                    ${escHtml(phrase(language, "tagline"))}
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
                    <p style="margin:0 0 4px;font-size:11px;color:${BRAND.footerText};font-family:'Segoe UI',Arial,sans-serif;">📞 <a href="tel:+250792353501" style="color:${BRAND.footerText};">+250 792 363 601</a></p>
                    <p style="margin:0 0 4px;font-size:11px;color:${BRAND.footerText};font-family:'Segoe UI',Arial,sans-serif;">🌐 <a href="https://mediconnect.rw" style="color:${BRAND.accent};">mediconnect.rw</a></p>
                  </td>
                  <td align="right" valign="top" class="hide-mobile">
                    <p style="margin:0;font-size:10px;color:${BRAND.footerText};font-family:'Segoe UI',Arial,sans-serif;">© ${year} MediConnect Ltd.<br/>${escHtml(phrase(language, "rights"))}</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:16px;">
                    <p style="margin:0;font-size:10px;color:${BRAND.footerText};opacity:.65;font-family:'Segoe UI',Arial,sans-serif;">
                      ${escHtml(phrase(language, "received"))} <a href="mailto:admin@mediconnect.rw" style="color:${BRAND.footerText};">admin@mediconnect.rw</a>.
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
 * @param {{ to: string, subject: string, text: string, html?: string, replyTo?: string }} opts
 */
export async function sendMail({ to, subject, text, html, replyTo, timeoutMs }) {
  const config = mailConfig();
  if (!config || !to) return false;
  const bounded = Number(timeoutMs);
  const timeouts = Number.isFinite(bounded) && bounded > 0
    ? { connectionTimeout: bounded, greetingTimeout: bounded, socketTimeout: bounded }
    : {};
  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      ...timeouts,
      // Increase deliverability: identify ourselves properly
      name: "mediconnect.rw",
    });

    // Build a deterministic Message-ID for this message
    const domain = config.from.split("@")[1] || "mediconnect.rw";
    const msgId = `<${Date.now()}-${Math.random().toString(36).slice(2)}@${domain}>`;

    await transport.sendMail({
      from: `"${config.fromName}" <${config.from}>`,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
      ...(replyTo ? { replyTo } : { replyTo: `"MediConnect Support" <admin@mediconnect.rw>` }),
      messageId: msgId,
      headers: {
        // Help recipients mark as legitimate and avoid spam filters
        "X-Mailer": "MediConnect Mailer 2.0",
        "X-Entity-Ref-ID": msgId,
        // List-Unsubscribe tells Gmail this is transactional, not bulk
        "List-Unsubscribe": "<mailto:admin@mediconnect.rw?subject=unsubscribe>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        // Explicitly mark as transactional (not promotional/bulk)
        "Precedence": "transactional",
        // MIME version declaration
        "MIME-Version": "1.0",
      },
    });
    return true;
  } catch (error) {
    console.error("Mail send failed:", error?.message || error);
    return false;
  }
}

// ─── Auth email builders ──────────────────────────────────────────────────────

function greeting(name, lang = "en") {
  const first = String(name || "").split(" ")[0] || "";
  if (!first || first.toLowerCase() === "there") return greetPerson(lang, "");
  return greetPerson(lang, name);
}

/**
 * Branded OTP email for password reset and phone/email verification.
 * Called from app.js for forgot-password and send-otp flows.
 */
export function buildOtpEmail({ code, type = "verification", recipientName, lang = "en" }) {
  const isReset = String(type).includes("reset") || String(type).includes("password");
  const title = pick(lang, {
    en: isReset ? "Reset your password" : "Your verification code",
    fr: isReset ? "Réinitialisez votre mot de passe" : "Votre code de vérification",
    rw: isReset ? "Ongera ushyire ijambo ry'ibanga" : "Kode yo kwemeza",
  });
  const preheader = pick(lang, {
    en: `Your MediConnect ${isReset ? "password reset" : "verification"} code is ${code}`,
    fr: `Votre code MediConnect de ${isReset ? "réinitialisation" : "vérification"} est ${code}`,
    rw: `Kode yawe ya MediConnect yo ${isReset ? "guhindura ijambo ry'ibanga" : "kwemeza"} ni ${code}`,
  });
  const accentHex = isReset ? "#d97706" : BRAND.primary;
  const lead = isReset
    ? pick(lang, {
      en: "We received a request to reset the password on your MediConnect account. Use the 6-digit code below — it expires in <strong>10 minutes</strong>.",
      fr: "Nous avons reçu une demande de réinitialisation du mot de passe de votre compte MediConnect. Utilisez le code à 6 chiffres ci-dessous — il expire dans <strong>10 minutes</strong>.",
      rw: "Twakiriye icyifuzo cyo guhindura ijambo ry'ibanga rya konti yawe ya MediConnect. Koresha kode y'imibare 6 iri hepfo — irangira mu <strong>iminota 10</strong>.",
    })
    : pick(lang, {
      en: "Use the one-time code below to verify your MediConnect account. This code expires in <strong>10 minutes</strong>.",
      fr: "Utilisez le code à usage unique ci-dessous pour vérifier votre compte MediConnect. Ce code expire dans <strong>10 minutes</strong>.",
      rw: "Koresha kode y'inshuro imwe iri hepfo wemeze konti yawe ya MediConnect. Iyi kode irangira mu <strong>iminota 10</strong>.",
    });
  const ignore = pick(lang, {
    en: "If you did not request this, you can safely ignore this email — your account remains secure.",
    fr: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail — votre compte reste en sécurité.",
    rw: "Niba utabisabye, wirengagize iyi imeri — konti yawe ikomeza kuba itekanye.",
  });

  const body = `
    ${emailP(greeting(recipientName, lang))}
    ${emailHtml(lead)}
    ${emailOtpBlock(code)}
    ${emailP(ignore, "font-size:12px;color:#6b7280;")}
    ${isReset
      ? `<p style="margin:0;font-size:12px;color:#9ca3af;font-family:'Segoe UI',Arial,sans-serif;">${escHtml(pick(lang, {
        en: "For your security, never share this code with anyone — MediConnect staff will never ask for it.",
        fr: "Pour votre sécurité, ne partagez jamais ce code — le personnel de MediConnect ne vous le demandera jamais.",
        rw: "Ku mutekano wawe, ntukoreshe iyi kode ku wundi muntu — abakozi ba MediConnect ntibayisaba.",
      }))}</p>`
      : ""}
  `;

  return buildEmailHtml({ title, preheader, body, accentHex, lang });
}

/**
 * Welcome email sent right after account creation.
 */
export function buildWelcomeEmail({ name, role, loginUrl = "https://mediconnect.rw/auth", lang = "en" }) {
  const roleLabel = {
    patient: pick(lang, { en: "Patient", fr: "Patient", rw: "Umurwayi" }),
    doctor: pick(lang, { en: "Doctor", fr: "Médecin", rw: "Umuganga" }),
    hospital: pick(lang, { en: "Hospital / Facility", fr: "Hôpital / établissement", rw: "Ibitaro / ikigo" }),
    pharmacy: pick(lang, { en: "Pharmacy", fr: "Pharmacie", rw: "Farumasi" }),
    admin: pick(lang, { en: "Administrator", fr: "Administrateur", rw: "Umuyobozi" }),
  }[role] || pick(lang, { en: "Member", fr: "Membre", rw: "Umunyamuryango" });

  const patientProfile = role === "patient";
  const actionUrl = patientProfile ? "https://mediconnect.rw/patient/profile" : loginUrl;
  const actionLabel = patientProfile
    ? pick(lang, { en: "Complete your profile", fr: "Complétez votre profil", rw: "Uzuza umwirondoro wawe" })
    : pick(lang, { en: "Sign In to MediConnect", fr: "Se connecter à MediConnect", rw: "Injira muri MediConnect" });
  const title = patientProfile
    ? pick(lang, { en: "Complete your MediConnect profile", fr: "Complétez votre profil MediConnect", rw: "Uzuza umwirondoro wawe wa MediConnect" })
    : pick(lang, { en: "Welcome to MediConnect!", fr: "Bienvenue sur MediConnect !", rw: "Murakaza neza kuri MediConnect!" });
  const preheader = patientProfile
    ? pick(lang, {
      en: "Finish your patient profile before you book or start a consultation.",
      fr: "Terminez votre profil patient avant de réserver ou de commencer une consultation.",
      rw: "Uzuza umwirondoro wawe w'umurwayi mbere yo gufata gahunda cyangwa gutangira ikiganiro.",
    })
    : pick(lang, {
      en: `Your ${roleLabel} account is ready. Sign in to get started.`,
      fr: `Votre compte ${roleLabel} est prêt. Connectez-vous pour commencer.`,
      rw: `Konti yawe ya ${roleLabel} iriteguye. Injira utangire.`,
    });

  const body = `
    ${emailP(greeting(name, lang))}
    ${emailHtml(patientProfile
      ? `Your MediConnect <strong>Patient</strong> account has been created. Complete your profile next — date of birth, gender, phone, and address — so doctors have your file before any consultation.`
      : `Your MediConnect <strong>${roleLabel}</strong> account has been successfully created. You can now sign in and start using the platform.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
      <tr>
        <td style="background:#f0fafa;border:1px solid #d0ecea;border-radius:8px;padding:16px 20px;border-left:4px solid #0BA59B;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0d3533;font-family:'Segoe UI',Arial,sans-serif;">${patientProfile ? "Before you can consult" : "What you can do on MediConnect"}</p>
          ${role === "patient" ? `
            <p style="margin:2px 0;font-size:12px;color:#4a6360;font-family:'Segoe UI',Arial,sans-serif;">✓ Fill date of birth, gender, phone, and address</p>
            <p style="margin:2px 0;font-size:12px;color:#4a6360;font-family:'Segoe UI',Arial,sans-serif;">✓ Then book appointments or start instant video visits</p>
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
    ${emailBtn(actionLabel, actionUrl)}
    ${emailP("If you have any questions, our support team is always happy to help.", "font-size:12px;color:#6b7280;")}
  `;

  return buildEmailHtml({ title, preheader, body, lang });
}
