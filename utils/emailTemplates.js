// utils/emailTemplates.js

const getUserCancelTemplate1 = (userName, orderID, reason, note) => `
  <div style="font-family: Arial; padding:20px;">
    <h2>Hello ${userName},</h2>
    <p>Your order <strong>${orderID}</strong> has been successfully cancelled.</p>
    <p><strong>Reason:</strong> ${reason.replaceAll("_", " ")}</p>
    ${note ? `<p><strong>Note:</strong> ${note}</p>` : ""}
    <p>If you need help, contact support.</p>
  </div>
`;


const getUserCancelTemplate = (
  userName,
  orderID,
  reason,
  note
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Cancelled</title>
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
                Order Cancellation Confirmation
              </h2>
              <p style="margin:8px 0 0 0; font-size:13px; color:#374151;">
                Your request has been successfully processed
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
  Your order <strong style="color:#111827;">${orderID}</strong> 
  has been successfully cancelled.
</p>

<p style="margin:0 0 20px 0;">
  Any eligible refund will be processed to your original payment method 
  within <strong>14 working days</strong>. You will receive a confirmation 
  once the refund has been completed.
</p>

              <!-- Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f9fafb; border-radius:6px; padding:15px; margin:20px 0;">
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Cancellation Reason</td>
                </tr>
                <tr>
                  <td style="padding:5px 0; font-weight:600; color:#111827;">
                    ${reason.replaceAll("_", " ")}
                  </td>
                </tr>

                ${
                  note
                    ? `
                <tr>
                  <td style="padding-top:15px; color:#6b7280;">Additional Note</td>
                </tr>
                <tr>
                  <td style="padding:5px 0; color:#111827;">
                    ${note}
                  </td>
                </tr>
                `
                    : ""
                }
              </table>

              <p style="margin:0 0 20px 0;">
                If you need further assistance or would like to place a new order, 
                our support team is here to help.
              </p>

              <p style="margin:0;">
                Thank you for choosing us.
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
              This is an automated email confirmation.  
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

const getUserCancelTemplate2 = (
  userName,
  orderID,
  reason,
  note
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Cancellation Request</title>
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
                Order Cancellation Request
              </h2>
              <p style="margin:8px 0 0 0; font-size:13px; color:#374151;">
                Your request has been successfully submitted
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
                We have received your cancellation request for order 
                <strong style="color:#111827;">${orderID}</strong>.
              </p>

              <p style="margin:0 0 20px 0;">
                Our team will review your request and process it shortly. 
                You will receive another confirmation once the cancellation is completed.
              </p>

              <!-- Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f9fafb; border-radius:6px; padding:15px; margin:20px 0;">
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Cancellation Reason</td>
                </tr>
                <tr>
                  <td style="padding:5px 0; font-weight:600; color:#111827;">
                    ${reason.replaceAll("_", " ")}
                  </td>
                </tr>

                ${
                  note
                    ? `
                <tr>
                  <td style="padding-top:15px; color:#6b7280;">Additional Note</td>
                </tr>
                <tr>
                  <td style="padding:5px 0; color:#111827;">
                    ${note}
                  </td>
                </tr>
                `
                    : ""
                }
              </table>

              <p style="margin:0 0 20px 0;">
                If you have any urgent concerns, please contact our support team.
              </p>

              <p style="margin:0;">
                Thank you for your patience and understanding.
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
              This is an automated email confirmation.  
              Please do not reply directly to this message.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;



// const getAdminCancelTemplate = (userName, userEmail, orderID, reason, note) => `
//   <div style="font-family: Arial; padding:20px;">
//     <h2>Order Cancelled</h2>
//     <p>User: <strong>${userName}</strong> (${userEmail})</p>
//     <p>Order ID: <strong>${orderID}</strong></p>
//     <p><strong>Reason:</strong> ${reason.replaceAll("_", " ")}</p>
//     ${note ? `<p><strong>Note:</strong> ${note}</p>` : ""}
//   </div>
// `;
const getAdminCancelTemplate = (userName, userEmail, orderID, reason, note) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Order Cancellation Alert</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 0;">
    <tr>
      <td align="center">

        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" 
          style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px #FBEDB6;">

          <!-- Header -->
          <tr>
    <td style="background:#FBEDB6; padding:25px 30px; color:#1f2937;">
      <h2 style="margin:0; font-size:20px; font-weight:700; letter-spacing:0.3px;">
                Order Cancellation Alert
              </h2>
      <p style="margin:8px 0 0 0; font-size:13px; color:#374151;">
                Immediate attention required
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px;">

              <p style="font-size:14px; color:#374151; margin:0 0 20px 0;">
                An order has been cancelled by a customer. Below are the details:
              </p>

              <!-- Info Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#111827;">
                
                <tr>
                  <td style="padding:10px 0; color:#6b7280;">Customer Name</td>
                  <td style="padding:10px 0; font-weight:600;">${userName}</td>
                </tr>

                <tr>
                  <td style="padding:10px 0; color:#6b7280;">Customer Email</td>
                  <td style="padding:10px 0;">
                    <a href="mailto:${userEmail}" style="color:#2563eb; text-decoration:none;">
                      ${userEmail}
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 0; color:#6b7280;">Order ID</td>
                  <td style="padding:10px 0; font-weight:600; color:#dc2626;">
                    ${orderID}
                  </td>
                </tr>

                <tr>
                  <td style="padding:10px 0; color:#6b7280;">Cancellation Reason</td>
                  <td style="padding:10px 0;">
                    ${reason.replaceAll("_", " ")}
                  </td>
                </tr>

                ${
                  note
                    ? `
                <tr>
                  <td style="padding:10px 0; color:#6b7280;">Additional Note</td>
                  <td style="padding:10px 0;">
                    ${note}
                  </td>
                </tr>
                `
                    : ""
                }

              </table>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top:1px solid #e5e7eb;"></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 30px; font-size:12px; color:#9ca3af; text-align:center;">
              This is an automated system notification.  
              Please log in to the admin dashboard for further action.
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




const getUserReturnRequestTemplate = (
  userName,
  orderID,
  reason,
  note
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Return Request Submitted</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#FBEDB6; padding:25px 30px; color:#1f2937;">
              <h2 style="margin:0; font-size:20px; font-weight:700;">
                Return Request Received
              </h2>
              <p style="margin:8px 0 0 0; font-size:13px; color:#374151;">
                We are reviewing your return request
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
                We’ve received your return request for order 
                <strong style="color:#111827;">${orderID}</strong>.
              </p>

              <p style="margin:0 0 20px 0;">
                Our team will review your request shortly. You will receive 
                another notification once it has been approved or rejected.
              </p>

              <!-- Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f9fafb; border-radius:6px; padding:15px; margin:20px 0;">
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Return Reason</td>
                </tr>
                <tr>
                  <td style="padding:5px 0; font-weight:600; color:#111827;">
                    ${reason.replaceAll("_", " ")}
                  </td>
                </tr>

                ${
                  note
                    ? `
                <tr>
                  <td style="padding-top:15px; color:#6b7280;">Additional Note</td>
                </tr>
                <tr>
                  <td style="padding:5px 0; color:#111827;">
                    ${note}
                  </td>
                </tr>
                `
                    : ""
                }
              </table>

              <p style="margin:0 0 20px 0;">
                If approved, eligible refunds will be processed to your original 
                payment method within <strong>14 working days</strong>.
              </p>

              <p style="margin:0;">
                Thank you for choosing us.
              </p>

            </td>
          </tr>

          <tr>
            <td style="border-top:1px solid #e5e7eb;"></td>
          </tr>

          <tr>
            <td style="padding:20px 30px; font-size:12px; color:#9ca3af; text-align:center;">
              This is an automated email confirmation.  
              Please do not reply directly to this message.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

const getAdminReturnRequestTemplate = (
  userName,
  userEmail,
  orderID,
  reason,
  note
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>New Return Request</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#FBEDB6; padding:25px 30px; color:#1f2937;">
              <h2 style="margin:0; font-size:20px; font-weight:700;">
                New Return Request Submitted
              </h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px; color:#374151; font-size:14px; line-height:1.6;">

              <p><strong>Customer Name:</strong> ${userName}</p>
              <p><strong>Customer Email:</strong> ${userEmail}</p>
              <p><strong>Order ID:</strong> ${orderID}</p>

              <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" />

              <p><strong>Return Reason:</strong></p>
              <p style="margin-top:5px;">
                ${reason.replaceAll("_", " ")}
              </p>

              ${
                note
                  ? `
              <p style="margin-top:15px;"><strong>Additional Note:</strong></p>
              <p>${note}</p>
              `
                  : ""
              }

              <p style="margin-top:25px;">
                Please review this request in the admin panel and take the appropriate action.
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

const getUserRefundCompletedTemplate = (
  userName,
  orderID,
  amount,
  transactionId
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Refund Processed Successfully</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#FBEDB6; padding:25px 30px; color:#1f2937;">
              <h2 style="margin:0; font-size:20px; font-weight:700;">
                Refund Completed
              </h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px; color:#374151; font-size:14px; line-height:1.6;">

              <p>Hello <strong>${userName}</strong>,</p>

              <p>
                Your refund for order <strong>${orderID}</strong> has been successfully processed.
              </p>

              <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" />

              <p><strong>Refund Amount:</strong> ${amount}</p>

              ${
                transactionId
                  ? `
              <p><strong>Transaction Reference:</strong> ${transactionId}</p>
              `
                  : ""
              }

              <p style="margin-top:20px;">
                The amount will reflect in your original payment method within 
                <strong>14 working days</strong>.
              </p>

              <p style="margin-top:25px;">
                Thank you for your patience and for choosing us.
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
const getUserRefundRejectedTemplate = (
  userName,
  orderID,
  rejectionReason
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Refund Request Update</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#FBEDB6; padding:25px 30px; color:#1f2937;">
              <h2 style="margin:0; font-size:20px; font-weight:700;">
                Refund Request Update
              </h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px; color:#374151; font-size:14px; line-height:1.6;">

              <p>Hello <strong>${userName}</strong>,</p>

              <p>
                After reviewing your request, we regret to inform you that 
                your refund for order <strong>${orderID}</strong> has not been approved.
              </p>

              <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" />

              ${
                rejectionReason
                  ? `
              <p><strong>Reason:</strong></p>
              <p style="margin-top:5px;">
                ${rejectionReason}
              </p>
              `
                  : ""
              }

              <p style="margin-top:20px;">
                If you believe this decision was made in error or need further clarification, 
                please contact our support team.
              </p>

              <p style="margin-top:25px;">
                Thank you for your understanding.
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

const getUserReturnApprovedTemplate = (
  userName,
  orderID
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Return Request Approved</title>
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
                Return Request Approved
              </h2>
              <p style="margin:8px 0 0 0; font-size:13px; color:#374151;">
                Your return has been successfully approved
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
                Your return request for order 
                <strong style="color:#111827;">${orderID}</strong> 
                has been approved.
              </p>

              <p style="margin:0 0 20px 0;">
                Please follow the return instructions provided by our support team.
              </p>

              <p style="margin:0 0 20px 0;">
                Once we receive and verify the returned item, 
                your refund will be processed to your original payment method.
              </p>

              <p style="margin:0;">
                Thank you for your cooperation.
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
const getUserReturnRejectedTemplate = (
  userName,
  orderID,
  rejectionReason
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Return Request Update</title>
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
                Return Request Update
              </h2>
              <p style="margin:8px 0 0 0; font-size:13px; color:#374151;">
                Your return request has been reviewed
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
                Your return request for order 
                <strong style="color:#111827;">${orderID}</strong> 
                has been carefully reviewed.
              </p>

              <p style="margin:0 0 20px 0;">
                Unfortunately, we are unable to approve your return at this time.
              </p>

              ${
                rejectionReason
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f9fafb; border-radius:6px; padding:15px; margin:20px 0;">
                <tr>
                  <td style="padding:8px 0; color:#6b7280;">Reason</td>
                </tr>
                <tr>
                  <td style="padding:5px 0; font-weight:600; color:#111827;">
                    ${rejectionReason}
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <p style="margin:0 0 20px 0;">
                If you believe this decision was made in error or need further clarification, 
                please contact our support team.
              </p>

              <p style="margin:0;">
                Thank you for your understanding.
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
  getUserCancelTemplate,
  getAdminCancelTemplate,
  getUserReturnRequestTemplate,
  getAdminReturnRequestTemplate,
  getUserRefundCompletedTemplate,
  getUserRefundRejectedTemplate,
  getUserReturnApprovedTemplate,
  getUserReturnRejectedTemplate,
};
