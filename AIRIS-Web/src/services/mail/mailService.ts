import nodemailer from "nodemailer";

interface SendMailResult {
  success: boolean;
  simulated?: boolean;
  messageId?: string;
  error?: string;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

/**
 * Masks an email for safe display in the UI (e.g. "danielespela251@gmail.com" -> "d****1@gmail.com")
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "your authorized email";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}${"*".repeat(Math.min(local.length - 2, 4))}${last}@${domain}`;
}

/**
 * Sends a 6-digit Admin OTP verification code.
 * Uses configured SMTP server if environment variables are supplied.
 * Otherwise, falls back safely to logging in development/staging.
 */
export async function sendAdminOtpEmail(
  toEmail: string,
  otpCode: string,
  expiryMinutes = 5
): Promise<SendMailResult> {
  const masked = maskEmail(toEmail);

  if (!isSmtpConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        `[AIRIS Mailer] CRITICAL: SMTP configuration missing in production environment. Refusing silent simulation.`
      );
      return {
        success: false,
        error: "Email delivery service is not configured on this server. Contact system administrator.",
      };
    }
    console.log(
      `[AIRIS Mailer] Notice: OTP challenge generated for ${masked}. SMTP is not configured in environment. Set credentials in server environment for live delivery.`
    );
    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`,
    };
  }

  const host = process.env.SMTP_HOST!;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;
  const from = process.env.SMTP_FROM || `"AIRIS Security" <noreply@airis.edu.ph>`;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });

    // Clean, professional, university-appropriate template (no gradients, em dashes, or generic AI styling)
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AIRIS Admin Verification Code</title>
</head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:32px 28px;text-align:left;" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <h1 style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">AIRIS Administrator Verification</h1>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.5;color:#475569;">A sign-in request was received for your administrator account. Use the verification code below to complete authentication:</p>

              <!-- Prominent, easily selectable OTP display block -->
              <table role="presentation" width="100%" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;margin:18px 0;" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:18px 12px;">
                    <div style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:#0f172a;user-select:all;-webkit-user-select:all;">${otpCode}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:8px;">Expires in ${expiryMinutes} minutes</div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:12px;color:#64748b;text-align:center;">
                Select or double-click the code above to copy it to your clipboard.
              </p>

              <!-- Restrained Security Notice -->
              <div style="background:#f8fafc;border-left:3px solid #0284c7;padding:12px 14px;margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#334155;">
                <strong>Security Notice:</strong> If you did not initiate this request, disregard this message. Your account password should be updated immediately.
              </div>

              <!-- Product & Institutional Footer -->
              <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;line-height:1.5;color:#94a3b8;text-align:center;">
                Technological Institute of the Philippines (T.I.P.) Manila<br>
                AIRIS: AI-Assisted Resume Analysis and Interview Simulation Platform
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const textContent = `
AIRIS Administrator Verification

A sign-in request was received for your administrator account. Use the verification code below to complete authentication:

Verification Code: ${otpCode}
Expires in: ${expiryMinutes} minutes

Security Notice: If you did not initiate this request, disregard this message. Your account password should be updated immediately.

Technological Institute of the Philippines (T.I.P.) Manila
AIRIS: AI-Assisted Resume Analysis and Interview Simulation Platform
    `.trim();

    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject: `AIRIS Admin Verification Code: ${otpCode}`,
      text: textContent,
      html: htmlContent,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to send email through configured SMTP provider.";
    console.error(`[AIRIS Mailer] Failed to deliver OTP to ${masked}:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
