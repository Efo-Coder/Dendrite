import nodemailer from 'nodemailer';

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
const BG = `#0b0d13`;
const CARD_BG = `#13161f`;
const CARD_BORDER = `rgba(255,255,255,0.07)`;
const TEXT_PRIMARY = `#eeeef0`;
const TEXT_SECONDARY = `rgba(238,238,240,0.55)`;
const TEXT_MUTED = `rgba(238,238,240,0.28)`;
const ACCENT = `#26ad53`;

function emailShell(content: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:${BG};font-family:${FONT};-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};">
    <tr>
      <td align="center" style="padding:52px 20px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="36" height="36" style="width:36px;height:36px;background:${ACCENT};border-radius:10px;text-align:center;vertical-align:middle;">
                    <span style="font-size:17px;font-weight:800;color:#ffffff;font-family:${FONT};">D</span>
                  </td>
                  <td width="10" style="width:10px;">&nbsp;</td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:20px;font-weight:700;color:${TEXT_PRIMARY};letter-spacing:-0.4px;font-family:${FONT};">Dendrite</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:${CARD_BG};border:1px solid ${CARD_BORDER};border-radius:20px;padding:44px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${content}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0 0 6px;font-size:12px;color:${TEXT_MUTED};font-family:${FONT};line-height:1.6;">
                &copy; ${year} Dendrite &nbsp;&middot;&nbsp;
                <a href="mailto:support@dendrite-notes.com" style="color:rgba(238,238,240,0.38);text-decoration:none;font-family:${FONT};">support@dendrite-notes.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(email: string, token: string) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;
  const from = process.env.SMTP_FROM || 'Dendrite <noreply@dendrite-notes.com>';

  const content = `
    <tr>
      <td style="padding-bottom:12px;">
        <p style="margin:0;font-size:26px;font-weight:700;color:${TEXT_PRIMARY};letter-spacing:-0.4px;line-height:1.25;font-family:${FONT};">Verify your email</p>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:32px;">
        <p style="margin:0;font-size:16px;color:${TEXT_SECONDARY};line-height:1.75;font-family:${FONT};">
          Click the button below to complete your registration. The link is valid for
          <strong style="color:rgba(238,238,240,0.78);font-weight:600;">24 hours</strong>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:36px;">
        <a href="${verifyUrl}"
           style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:15px 36px;border-radius:12px;letter-spacing:0.1px;font-family:${FONT};">
          Verify email
        </a>
      </td>
    </tr>
    <tr>
      <td style="border-top:1px solid ${CARD_BORDER};padding-top:28px;">
        <p style="margin:0 0 6px;font-size:13px;color:${TEXT_MUTED};font-family:${FONT};">Button not working? Copy this link into your browser:</p>
        <p style="margin:0 0 20px;font-size:12px;color:rgba(238,238,240,0.42);word-break:break-all;line-height:1.6;font-family:${FONT};">${verifyUrl}</p>
        <p style="margin:0;font-size:12px;color:${TEXT_MUTED};font-family:${FONT};">If you didn't create an account, you can safely ignore this email.</p>
      </td>
    </tr>`;

  await createTransporter().sendMail({
    from,
    to: email,
    subject: 'Dendrite – Verify your email',
    text: `Verify your email\n\nClick this link to complete your registration (valid for 24 hours):\n${verifyUrl}\n\nIf you didn't create an account, ignore this email.\n\n© ${new Date().getFullYear()} Dendrite`,
    html: emailShell(content),
    headers: { 'X-Mailin-Track-Open': '0', 'X-Mailin-Track-Click': '0' },
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
  const from = process.env.SMTP_FROM || 'Dendrite <noreply@dendrite-notes.com>';

  const content = `
    <tr>
      <td style="padding-bottom:12px;">
        <p style="margin:0;font-size:26px;font-weight:700;color:${TEXT_PRIMARY};letter-spacing:-0.4px;line-height:1.25;font-family:${FONT};">Reset your password</p>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:32px;">
        <p style="margin:0;font-size:16px;color:${TEXT_SECONDARY};line-height:1.75;font-family:${FONT};">
          Click the button below to set a new password. The link is valid for
          <strong style="color:rgba(238,238,240,0.78);font-weight:600;">1 hour</strong>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:36px;">
        <a href="${resetUrl}"
           style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:15px 36px;border-radius:12px;letter-spacing:0.1px;font-family:${FONT};">
          Reset password
        </a>
      </td>
    </tr>
    <tr>
      <td style="border-top:1px solid ${CARD_BORDER};padding-top:28px;">
        <p style="margin:0 0 6px;font-size:13px;color:${TEXT_MUTED};font-family:${FONT};">Button not working? Copy this link into your browser:</p>
        <p style="margin:0 0 20px;font-size:12px;color:rgba(238,238,240,0.42);word-break:break-all;line-height:1.6;font-family:${FONT};">${resetUrl}</p>
        <p style="margin:0;font-size:12px;color:${TEXT_MUTED};font-family:${FONT};">If you didn't request a password reset, you can safely ignore this email.</p>
      </td>
    </tr>`;

  await createTransporter().sendMail({
    from,
    to: email,
    subject: 'Dendrite – Reset your password',
    text: `Reset your password\n\nClick this link to set a new password (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request a password reset, ignore this email.\n\n© ${new Date().getFullYear()} Dendrite`,
    html: emailShell(content),
    headers: { 'X-Mailin-Track-Open': '0', 'X-Mailin-Track-Click': '0' },
  });
}
