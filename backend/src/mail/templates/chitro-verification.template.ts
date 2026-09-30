/**
 * Chitro Account Verification Email Template
 *
 * Professional, clean, responsive email template for Chitro messaging app.
 * Brand Identity:
 * - Primary Blue: #2563EB
 * - Deep Navy: #0F172A
 * - Cyan Accent: #06B6D4
 * - Background: #F8FAFC
 * Compatible with Gmail, Outlook, Apple Mail, iOS Mail, and Android.
 */

export interface ChitroEmailParams {
  name: string;
  otp: string;
  expiryMinutes?: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export const CHITRO_TEXT_TEMPLATE = `=======================================================
CHITRO — Conversations that matter
Simple People. Stronger Connections.
=======================================================

Hello {{name}},

Verify your account

Thank you for choosing Chitro. To complete your account
registration and verify your email address, please use the
verification code below:

-------------------------------------------------------
VERIFICATION CODE: {{otp}}
-------------------------------------------------------

This code is valid for {{expiryMinutes}} minutes.

SECURITY NOTICE:
If you did not initiate this registration or request, please
ignore this email. Your email address remains secure and no
action is required on your part. Do not share this code with anyone.

Best regards,
The Chitro Security Team
https://chitro.app
`;

export function getChitroVerificationTemplate(params: ChitroEmailParams): RenderedEmail {
  const { name, otp, expiryMinutes = 10 } = params;

  const subject = `${otp} is your Chitro verification code`;

  const text = CHITRO_TEXT_TEMPLATE
    .replace(/{{name}}/g, name)
    .replace(/{{otp}}/g, otp)
    .replace(/{{expiryMinutes}}/g, String(expiryMinutes));

  const digits = otp.split('');
  const digitBoxesHtml = digits
    .map(
      (d) => `
      <td align="center" valign="middle" style="padding: 0 4px;">
        <div style="width: 44px; height: 52px; background-color: #F1F5F9; border: 2px solid #CBD5E1; border-radius: 12px; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 26px; font-weight: 700; color: #0F172A; line-height: 52px; text-align: center;">
          ${d}
        </div>
      </td>
    `,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #0F172A; -webkit-font-smoothing: antialiased;">
  <center style="width: 100%; table-layout: fixed;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);">
      
      <!-- Brand Header -->
      <tr>
        <td style="padding: 36px 36px 20px 36px; text-align: center; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);">
          <!-- Logo Badge -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td align="center">
                <div style="width: 52px; height: 52px; background: linear-gradient(135deg, #2563EB 0%, #06B6D4 100%); border-radius: 16px; text-align: center; line-height: 52px; font-size: 24px; color: #FFFFFF; font-weight: 800; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);">
                  C
                </div>
              </td>
            </tr>
          </table>
          <h1 style="margin: 12px 0 2px 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">Chitro</h1>
          <p style="margin: 0; font-size: 13px; color: #94A3B8; font-weight: 500;">Conversations that matter</p>
        </td>
      </tr>

      <!-- Body Content -->
      <tr>
        <td style="padding: 32px 36px 24px 36px;">
          <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0F172A; text-align: center;">Verify Your Account</h2>
          <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #475569; text-align: center;">
            Hello <strong style="color: #0F172A;">${name}</strong>,<br>
            Please use the 6-digit verification code below to verify your email and activate your Chitro account:
          </p>

          <!-- OTP Digits Box -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px auto;">
            <tr>
              ${digitBoxesHtml}
            </tr>
          </table>

          <p style="margin: 0 0 28px 0; font-size: 13px; color: #64748B; text-align: center;">
            This code expires in <strong style="color: #0F172A;">${expiryMinutes} minutes</strong>.
          </p>

          <!-- Security Callout -->
          <div style="background-color: #F8FAFC; border-left: 4px solid #2563EB; border-radius: 8px; padding: 14px 16px; margin: 0 0 16px 0;">
            <p style="margin: 0; font-size: 12px; line-height: 18px; color: #64748B;">
              <strong style="color: #0F172A;">Security Tip:</strong> Never share this code with anyone. Chitro employees will never ask for your verification code.
            </p>
          </div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding: 20px 36px 28px 36px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748B;">
            If you did not request this code, you can safely ignore this email.
          </p>
          <p style="margin: 0; font-size: 11px; color: #94A3B8;">
            © ${new Date().getFullYear()} Chitro App. Simple People. Stronger Connections.
          </p>
        </td>
      </tr>

    </table>
  </center>
</body>
</html>`;

  return { subject, html, text };
}
