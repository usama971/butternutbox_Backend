// services/emailService.js

const dns = require("dns");
const nodemailer = require("nodemailer");

// Prefer IPv4 — Render (and many clouds) often have no working IPv6 route to Google SMTP.
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

// Use hostname (not a hardcoded IP). Override via env on Render if you use SendGrid, Mailgun, etc.
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT) || 587;
// 465 → SSL; 587 → STARTTLS (587 + IPv4 is usually most reliable on PaaS like Render)
const useSecure = smtpPort === 465;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: useSecure,
  requireTLS: !useSecure && smtpPort === 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Force IPv4 for SMTP connect (fixes ENETUNREACH to Gmail IPv6 from Render)
  lookup(hostname, options, callback) {
    dns.lookup(hostname, { family: 4, all: false }, callback);
  },
  family: 4,
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"ButternutBox" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Email error:", error.message);
    console.error(error);
    return false;
  }
};

module.exports = sendEmail;
