const getUserOtpTemplate = (userName, otpCode) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Your Verification Code</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 0;">
    <tr>
      <td align="center">

        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#FBEDB6; padding:25px 30px; color:#1f2937;">
              <h2 style="margin:0; font-size:20px; font-weight:700;">
                Verification Code
              </h2>
              <p style="margin:8px 0 0 0; font-size:13px; color:#374151;">
                Use the code below to verify your account
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px; color:#374151; font-size:14px; line-height:1.6;">

              <p style="margin:0 0 20px 0;">
                Hello <strong>${userName}</strong>,
              </p>

              <p style="margin:0 0 20px 0;">
                Please use the verification code below to continue your request.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f9fafb; border-radius:6px; padding:20px; margin:20px 0; text-align:center;">
                <tr>
                  <td style="font-size:28px; font-weight:700; letter-spacing:6px; color:#111827;">
                    ${otpCode}
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;">
                This code will expire in <strong>10 minutes</strong>.
              </p>

              <p style="margin:0 0 20px 0;">
                If you did not request this code, you can safely ignore this email.
              </p>

              <p style="margin:0;">
                Thank you.
              </p>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top:1px solid #e5e7eb;"></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 30px; font-size:12px; color:#9ca3af; text-align:center;">
              This is an automated email notification.  
              Please do not reply directly to this message.
            </td>
          </tr>

        </table>
        <!-- End Container -->

      </td>
    </tr>
  </table>

</body>
</html>
`;

module.exports = {
  getUserOtpTemplate,
};