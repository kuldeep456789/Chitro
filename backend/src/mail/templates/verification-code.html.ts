export interface VerificationEmailParams {
  displayName: string;
  code: string;
  expiresInMinutes?: number;
}

export function getVerificationEmailTemplate({
  displayName,
  code,
  expiresInMinutes = 10,
}: VerificationEmailParams): { subject: string; html: string; text: string } {
  const subject = `${code} is your Chitro verification code`;

  const text = `Hi ${displayName},

Welcome to Chitro! Please verify your email address to activate your account.

Your 6-digit verification code is:
${code}

This code will expire in ${expiresInMinutes} minutes. If you did not request this verification, you can safely ignore this email.

— The Chitro Team
Simple Today. More Tomorrow.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F8FAFC;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 480px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 20px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 10px 25px -5px rgba(39, 100, 245, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #2764F5 0%, #1E51D4 100%);
      padding: 36px 32px 32px;
      text-align: center;
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      margin-bottom: 12px;
      backdrop-filter: blur(8px);
    }
    .logo-text {
      color: #FFFFFF;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .tagline {
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
      margin: 4px 0 0;
      letter-spacing: 0.2px;
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 12px;
    }
    .paragraph {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 24px;
    }
    .code-box {
      background: #EEF4FF;
      border: 2px dashed #2764F5;
      border-radius: 16px;
      padding: 24px 16px;
      text-align: center;
      margin: 24px 0;
    }
    .code-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #2764F5;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .code-digits {
      font-family: 'SF Mono', 'Roboto Mono', Menlo, Consolas, Monaco, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #1E51D4;
      margin: 0;
      padding-left: 10px;
    }
    .expiry-note {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #64748B;
      margin-top: 10px;
    }
    .divider {
      border: 0;
      border-top: 1px solid #E2E8F0;
      margin: 28px 0;
    }
    .security-notice {
      background-color: #F8FAFC;
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 12px;
      line-height: 1.5;
      color: #64748B;
    }
    .security-notice strong {
      color: #0F172A;
    }
    .footer {
      padding: 24px 32px 32px;
      text-align: center;
      font-size: 12px;
      color: #94A3B8;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo-container">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.58 3.39 17.07L2.05 21.05C1.93 21.41 2.25 21.73 2.61 21.61L6.68 20.37C8.25 21.4 10.06 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="#FFFFFF"/>
            <circle cx="8" cy="12" r="1.5" fill="#2764F5"/>
            <circle cx="12" cy="12" r="1.5" fill="#2764F5"/>
            <circle cx="16" cy="12" r="1.5" fill="#2764F5"/>
          </svg>
        </div>
        <h1 class="logo-text">Chitro</h1>
        <p class="tagline">Conversations that matter</p>
      </div>

      <div class="content">
        <h2 class="greeting">Hi ${displayName},</h2>
        <p class="paragraph">
          Thank you for signing up for Chitro. Please use the following 6-digit verification code to confirm your email address and activate your account:
        </p>

        <div class="code-box">
          <div class="code-label">Verification Code</div>
          <div class="code-digits">${code}</div>
          <div class="expiry-note">
            <span>⏱ Expires in <strong>${expiresInMinutes} minutes</strong></span>
          </div>
        </div>

        <div class="security-notice">
          <strong>Security Notice:</strong> Never share this code with anyone. Chitro support will never ask for your verification code. If you did not request this, you can safely ignore this email.
        </div>
      </div>

      <div class="footer">
        <p>Sent with care by Chitro Messenger</p>
        <p>&copy; ${new Date().getFullYear()} Chitro. Simple Today. More Tomorrow.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
