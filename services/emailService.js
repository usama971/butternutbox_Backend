// services/emailService.js

const nodemailer = require("nodemailer");

// 1️⃣ Create transporter once
const transporter = nodemailer.createTransport({
  service: "gmail", // or use host/port if custom SMTP
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 2️⃣ Send Email Function
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
    console.error("Email error:", error);
    return false;
  }
};

module.exports = sendEmail;
