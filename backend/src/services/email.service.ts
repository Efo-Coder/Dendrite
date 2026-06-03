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

const FONT_DISPLAY = `'Cormorant Garamond','Cormorant',Georgia,'Times New Roman',serif`;
const FONT_BODY    = `'EB Garamond','Garamond',Georgia,'Times New Roman',serif`;
const FONT_UI      = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;

const BG         = `#1b1810`;
const SURFACE    = `#242018`;
const LINE       = `rgba(210,190,130,0.10)`;
const INK        = `#efebe0`;
const INK_MID    = `rgba(239,235,224,0.58)`;
const INK_DIM    = `rgba(239,235,224,0.22)`;
const ACCENT     = `#c6a43c`;
const ACCENT_INK = `#181510`;

function emailShell(content: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background:${BG};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};">
    <tr>
      <td align="center" style="padding:56px 20px 44px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

          <!-- Wordmark -->
          <tr>
            <td align="center" style="padding-bottom:6px;">
              <span style="font-family:${FONT_DISPLAY};font-size:22px;font-weight:400;color:${INK};letter-spacing:0.18em;text-transform:uppercase;">Dendrite</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:44px;">
              <span style="font-family:${FONT_BODY};font-size:12px;font-style:italic;color:${INK_DIM};letter-spacing:0.06em;">a notebook</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:${SURFACE};border:1px solid ${LINE};border-radius:16px;padding:48px 44px 44px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${content}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0;font-size:12px;font-family:${FONT_UI};color:${INK_DIM};line-height:1.6;">
                &copy; ${year} Dendrite &nbsp;&middot;&nbsp;
                <a href="mailto:support@dendrite-notes.com" style="color:rgba(239,235,224,0.30);text-decoration:none;font-family:${FONT_UI};">support@dendrite-notes.com</a>
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
      <td style="padding-bottom:16px;">
        <p style="margin:0;font-family:${FONT_DISPLAY};font-size:32px;font-weight:300;color:${INK};letter-spacing:0.01em;line-height:1.15;">Verify your email</p>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:24px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="28" height="1" style="width:28px;height:1px;background:${ACCENT};font-size:1px;line-height:1px;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:36px;">
        <p style="margin:0;font-family:${FONT_BODY};font-size:18px;color:${INK_MID};line-height:1.75;">
          Click the button below to complete your registration. The link is valid for <em style="color:rgba(239,235,224,0.80);">24 hours</em>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:40px;">
        <a href="${verifyUrl}"
           style="display:inline-block;background:${ACCENT};color:${ACCENT_INK};text-decoration:none;font-weight:600;font-size:12px;padding:13px 30px;border-radius:7px;letter-spacing:0.1em;text-transform:uppercase;font-family:${FONT_UI};">
          Verify email
        </a>
      </td>
    </tr>
    <tr>
      <td style="border-top:1px solid ${LINE};padding-top:28px;">
        <p style="margin:0 0 6px;font-size:12px;font-family:${FONT_UI};color:${INK_DIM};">Button not working? Copy this link into your browser:</p>
        <p style="margin:0 0 20px;font-size:11px;font-family:${FONT_UI};color:rgba(239,235,224,0.36);word-break:break-all;line-height:1.6;">${verifyUrl}</p>
        <p style="margin:0;font-size:12px;font-family:${FONT_UI};color:${INK_DIM};">If you didn't create an account, you can safely ignore this email.</p>
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
      <td style="padding-bottom:16px;">
        <p style="margin:0;font-family:${FONT_DISPLAY};font-size:32px;font-weight:300;color:${INK};letter-spacing:0.01em;line-height:1.15;">Reset your password</p>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:24px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="28" height="1" style="width:28px;height:1px;background:${ACCENT};font-size:1px;line-height:1px;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:36px;">
        <p style="margin:0;font-family:${FONT_BODY};font-size:18px;color:${INK_MID};line-height:1.75;">
          Click the button below to set a new password. The link is valid for <em style="color:rgba(239,235,224,0.80);">1 hour</em>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom:40px;">
        <a href="${resetUrl}"
           style="display:inline-block;background:${ACCENT};color:${ACCENT_INK};text-decoration:none;font-weight:600;font-size:12px;padding:13px 30px;border-radius:7px;letter-spacing:0.1em;text-transform:uppercase;font-family:${FONT_UI};">
          Reset password
        </a>
      </td>
    </tr>
    <tr>
      <td style="border-top:1px solid ${LINE};padding-top:28px;">
        <p style="margin:0 0 6px;font-size:12px;font-family:${FONT_UI};color:${INK_DIM};">Button not working? Copy this link into your browser:</p>
        <p style="margin:0 0 20px;font-size:11px;font-family:${FONT_UI};color:rgba(239,235,224,0.36);word-break:break-all;line-height:1.6;">${resetUrl}</p>
        <p style="margin:0;font-size:12px;font-family:${FONT_UI};color:${INK_DIM};">If you didn't request a password reset, you can safely ignore this email.</p>
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
