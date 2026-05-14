// services/emailService.js

const nodemailer = require('nodemailer');
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");
// 1️⃣ Create transporter once
// const transporter = nodemailer.createTransport({
//   service: "gmail", // or use host/port if custom SMTP
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4, // 🔥 FORCE IPv4 (MOST IMPORTANT FIX)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
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
    console.error("Email error:", error.message);
    console.error(error);
    return false;
  }
};

module.exports = sendEmail;
