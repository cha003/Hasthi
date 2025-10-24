// server/utils/mailer.js
const nodemailer = require("nodemailer");

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true", // true for 465
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

async function sendMail({ to, subject, text, html, cc, bcc, from }) {
  const fromAddr = from || process.env.MAIL_FROM || process.env.SMTP_USER;
  if (!fromAddr) throw new Error("MAIL_FROM or SMTP_USER must be set");

  const info = await transport.sendMail({
    from: fromAddr,
    to,
    cc,
    bcc,
    subject,
    text,
    html,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("✉️  Email sent:", info.messageId);
  }
  return info;
}

module.exports = { transport, sendMail };
