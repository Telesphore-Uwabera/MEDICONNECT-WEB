import nodemailer from "nodemailer";

function mailConfig() {
  const host = process.env.MAIL_HOST || process.env.SMTP_HOST || "";
  const user = process.env.MAIL_USERNAME || process.env.SMTP_USER || "";
  const pass = process.env.MAIL_PASSWORD || process.env.SMTP_PASS || "";
  if (!host || !user || !pass) return null;
  const port = Number(process.env.MAIL_PORT || process.env.SMTP_PORT || 587);
  const encryption = String(process.env.MAIL_ENCRYPTION || "").toLowerCase();
  const secure = encryption === "ssl" || port === 465;
  return {
    host,
    port,
    secure,
    auth: { user, pass },
    from: process.env.MAIL_FROM_ADDRESS || user,
    fromName: process.env.MAIL_FROM_NAME || "MediConnect",
  };
}

export async function sendMail({ to, subject, text }) {
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
    });
    return true;
  } catch (error) {
    console.error("Mail send failed:", error?.message || error);
    return false;
  }
}
