const SibApiV3Sdk = require("sib-api-v3-sdk");

// configure client
let client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

// email API instance
const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async ({ to, subject, html }) => {
  try {
    const response = await tranEmailApi.sendTransacEmail({
      sender: {
        // email: "usamasaeed3k@gmail.com", // MUST be verified in Brevo
        email: "usamasaeed3k@gmail.com", // MUST be verified in Brevo
        name: "ButternutBox",
      },
      to: [
        {
          email: to,
        },
      ],
      subject: subject,
      htmlContent: html,
    });

    console.log("✅ Email sent:", response.messageId);
    return true;
  } catch (error) {
    console.error("❌ Email error:", error);
    return false;
  }
};

module.exports = sendEmail;