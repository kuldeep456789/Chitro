/**
 * AutoTrade Account Verification Email Template
 *
 * Professional, dark-themed, responsive email template for AutoTrade.
 * Designed for cross-client email compatibility (Gmail, Outlook, Apple Mail, iOS/Android).
 */

export interface AutoTradeEmailParams {
  name: string;
  otp: string;
  expiryMinutes?: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Raw plain-text template with {{name}}, {{otp}}, and {{expiryMinutes}} placeholders.
 */
export const AUTOTRADE_TEXT_TEMPLATE = `=======================================================
AUTOTRADE — GENUINE PARTS & PREMIUM CARE
=======================================================

Hello {{name}},

Verify your account

Thank you for choosing AutoTrade. To complete your account
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

-------------------------------------------------------
AutoTrade Support Team
Genuine Parts & Premium Care
© {{year}} AutoTrade Inc. All rights reserved.
This is an automated message, please do not reply.
=======================================================`;

/**
 * Raw HTML template with table-based structure, inline CSS, and dark-theme aesthetic.
 * Placeholders: {{name}}, {{otp}}, {{expiryMinutes}}, {{year}}
 */
export const AUTOTRADE_HTML_TEMPLATE = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Verify Your AutoTrade Account</title>
  <style type="text/css">
    /* Client-specific resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #0B0F19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }

    /* Responsive styling */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .content-padding { padding: 28px 20px !important; }
      .otp-code { font-size: 32px !important; letter-spacing: 6px !important; }
      .brand-title { font-size: 24px !important; }
      .brand-tagline { font-size: 10px !important; letter-spacing: 1.5px !important; }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, h1, h2, p, a, span { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F19; color: #E2E8F0; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (invisible in email body, visible in inbox preview) -->
  <div style="display: none; font-size: 1px; color: #0B0F19; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    Your AutoTrade account verification code is {{otp}}. This code expires in {{expiryMinutes}} minutes.
  </div>

  <!-- Background Wrapper -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0B0F19; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <!-- Email Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 520px; background-color: #121826; border: 1px solid #1E293B; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);">

          <!-- Top Orange Accent Bar -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #FF6B00 0%, #FFA149 50%, #FF6B00 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
          </tr>

          <!-- Header / Branding Section -->
          <tr>
            <td align="center" style="padding: 36px 32px 24px; text-align: center; border-bottom: 1px solid #1E293B;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <!-- Brand Icon & Name -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding-bottom: 8px;">
                          <!-- Stylized Automotive Emblem -->
                          <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: rgba(255, 107, 0, 0.12); border: 1px solid rgba(255, 107, 0, 0.35); border-radius: 12px; text-align: center;">
                            <span style="color: #FF6B00; font-size: 22px; font-weight: bold;">⚡</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <h1 class="brand-title" style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 2px; color: #FF6B00; text-transform: uppercase;">
                            AUTOTRADE
                          </h1>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <p class="brand-tagline" style="margin: 6px 0 0; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; color: #94A3B8; text-transform: uppercase;">
                            GENUINE PARTS &amp; PREMIUM CARE
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Section -->
          <tr>
            <td class="content-padding" style="padding: 36px 36px 28px;">
              <!-- Heading -->
              <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.3px;">
                Verify your account
              </h2>

              <!-- Greeting -->
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #E2E8F0;">
                Hello <strong style="color: #FFFFFF;">{{name}}</strong>,
              </p>

              <!-- Description -->
              <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #94A3B8;">
                Thank you for choosing AutoTrade. To complete your account registration and secure your profile, please enter the verification code below in your application:
              </p>

              <!-- OTP Verification Code Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="background-color: #0B0F19; border: 2px solid #FF6B00; border-radius: 14px; padding: 24px 16px; box-shadow: 0 0 20px rgba(255, 107, 0, 0.15);">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #FF6B00; margin-bottom: 10px;">
                      VERIFICATION CODE
                    </div>
                    <div class="otp-code" style="font-family: 'SF Mono', Monaco, 'Courier New', Courier, monospace; font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #FFFFFF; text-shadow: 0 0 10px rgba(255, 107, 0, 0.3); padding-left: 10px; line-height: 1.2;">
                      {{otp}}
                    </div>
                    <div style="margin-top: 12px; font-size: 12px; color: #94A3B8;">
                      ⏱ Valid for <span style="color: #FFA149; font-weight: 600;">{{expiryMinutes}} minutes</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry Note -->
              <p style="margin: 0 0 24px; font-size: 13px; line-height: 1.6; color: #94A3B8; text-align: center;">
                This one-time passcode will expire in <strong style="color: #E2E8F0;">{{expiryMinutes}} minutes</strong>. For your security, never share this code with anyone.
              </p>

              <!-- Security Notice Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(15, 23, 42, 0.6); border: 1px solid #1E293B; border-left: 3px solid #FF6B00; border-radius: 8px; margin-top: 8px;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94A3B8;">
                      <strong style="color: #E2E8F0;">Security Tip:</strong> If you did not initiate this registration or request, please disregard this email. Your email address remains secure and no action is required on your part.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td align="center" style="padding: 24px 32px 32px; background-color: #0E1420; border-top: 1px solid #1E293B; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #FF6B00;">
                AUTOTRADE
              </p>
              <p style="margin: 0 0 12px; font-size: 11px; color: #64748B; letter-spacing: 0.5px;">
                GENUINE PARTS &amp; PREMIUM CARE
              </p>
              <p style="margin: 0 0 6px; font-size: 11px; color: #475569;">
                &copy; {{year}} AutoTrade Inc. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 10px; color: #475569; line-height: 1.4;">
                This is an automated system email. Please do not reply directly to this message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * Replaces placeholders in a template string.
 */
export function replacePlaceholders(template: string, values: Record<string, string | number>): string {
  let result = template;
  for (const [key, val] of Object.entries(values)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(val));
  }
  return result;
}

/**
 * Generates the complete AutoTrade verification email (HTML, plain-text fallback, and subject).
 *
 * @param params User's name, OTP code, and optional expiry time (default: 10 minutes)
 * @returns {RenderedEmail} Subject, rendered HTML, and plain-text fallback
 */
export function getAutoTradeVerificationTemplate({
  name,
  otp,
  expiryMinutes = 10,
}: AutoTradeEmailParams): RenderedEmail {
  const currentYear = new Date().getFullYear();

  const values: Record<string, string | number> = {
    name: name || 'User',
    otp: otp || '------',
    expiryMinutes: expiryMinutes || 10,
    year: currentYear,
  };

  const subject = 'Verify Your AutoTrade Account';
  const html = replacePlaceholders(AUTOTRADE_HTML_TEMPLATE, values);
  const text = replacePlaceholders(AUTOTRADE_TEXT_TEMPLATE, values);

  return { subject, html, text };
}
