/**
 * Clean, responsive HTML email template for Course Purchase Invoices / Receipts
 */

export interface PurchaseEmailParams {
  studentName?: string;
  studentEmail: string;
  courseTitle: string;
  amountRupees: number;
  orderId: string;
  paymentId: string;
  dateStr: string;
  appName?: string;
  supportEmail?: string;
}

export function renderPurchaseEmailHtml(params: PurchaseEmailParams): string {
  const {
    studentName = 'Student',
    courseTitle,
    amountRupees,
    orderId,
    paymentId,
    dateStr,
    appName = 'YouTube Sikho Academy',
    supportEmail = 'support@youtubesikho.com',
  } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Purchase Receipt</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #1E293B; }
    .container { max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #3730A3 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; }
    .header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 16px; margin-bottom: 20px; }
    .card { background-color: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0; padding: 20px; margin-bottom: 24px; }
    .card-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; font-weight: 700; margin-bottom: 12px; }
    .course-name { font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 16px; }
    .meta-row { display: flex; justify-content: space-between; font-size: 14px; padding: 6px 0; border-bottom: 1px solid #EDF2F7; }
    .meta-row:last-child { border-bottom: none; font-weight: 700; font-size: 16px; padding-top: 10px; color: #4F46E5; }
    .meta-label { color: #64748B; }
    .meta-value { color: #1E293B; }
    .cta-container { text-align: center; margin: 32px 0 16px; }
    .cta-btn { display: inline-block; background-color: #4F46E5; color: #FFFFFF !important; font-weight: 600; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 10px; }
    .footer { text-align: center; padding: 24px; font-size: 12px; color: #94A3B8; border-top: 1px solid #F1F5F9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Payment Successful!</h1>
      <p>Thank you for enrolling in ${appName}</p>
    </div>
    <div class="content">
      <div class="greeting">
        Hi <strong>${studentName}</strong>,
      </div>
      <p style="font-size: 15px; line-height: 24px; margin-bottom: 24px; color: #334155;">
        Your payment has been verified. You now have permanent, lifetime access to your course and all its study materials.
      </p>

      <div class="card">
        <div class="card-title">Order Details</div>
        <div class="course-name">${courseTitle}</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Order ID:</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 600;">${orderId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Payment ID:</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace;">${paymentId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748B;">Date:</td>
            <td style="padding: 6px 0; text-align: right;">${dateStr}</td>
          </tr>
          <tr style="border-top: 2px solid #E2E8F0;">
            <td style="padding: 10px 0 0; font-weight: 700; font-size: 16px; color: #1E293B;">Amount Paid:</td>
            <td style="padding: 10px 0 0; text-align: right; font-weight: 700; font-size: 18px; color: #4F46E5;">₹${amountRupees}</td>
          </tr>
        </table>
      </div>

      <div class="cta-container">
        <a href="https://sikho-77341.web.app" class="cta-btn">Start Learning Now &rarr;</a>
      </div>
    </div>
    <div class="footer">
      <p>If you have any questions, reach out to our team at <a href="mailto:${supportEmail}" style="color: #4F46E5; text-decoration: none;">${supportEmail}</a>.</p>
      <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
