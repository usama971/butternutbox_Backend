// services/emailService.js

const nodemailer = require("nodemailer");

// Use hostname (not a hardcoded IP) — IPs change and cloud networks often block or time out to random Google IPs.
// Override via env on Render if you use SendGrid, Mailgun, etc.
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT) || 587;
// 465 → SSL; 587 → STARTTLS
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
  // Helps on some hosts where IPv6 path is broken (optional)
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
