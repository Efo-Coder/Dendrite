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

export async function sendVerificationEmail(email: string, token: string) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;
  const from = process.env.SMTP_FROM || 'Dendrite <noreply@dendrite.app>';

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Dendrite</span>
            </td>
          </tr>
          <tr>
            <td style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ffffff;">E-Mail bestätigen</p>
              <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.6;">
                Klicke auf den Button, um deine Registrierung abzuschließen. Der Link ist 24 Stunden gültig.
              </p>
              <a href="${verifyUrl}"
                 style="display:inline-block;background:#26ad53;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:12px;">
                E-Mail bestätigen
              </a>
              <p style="margin:28px 0 0;font-size:13px;color:rgba(255,255,255,0.35);line-height:1.6;">
                Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br/>
                <span style="color:rgba(255,255,255,0.5);word-break:break-all;">${verifyUrl}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);">
                Falls du kein Konto erstellt hast, kannst du diese E-Mail ignorieren.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await createTransporter().sendMail({
    from,
    to: email,
    subject: 'Dendrite – E-Mail bestätigen',
    html,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
  const from = process.env.SMTP_FROM || 'Dendrite <noreply@dendrite.app>';

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Dendrite</span>
            </td>
          </tr>
          <tr>
            <td style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ffffff;">Passwort zurücksetzen</p>
              <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.6;">
                Klicke auf den Button, um ein neues Passwort zu setzen. Der Link ist 1 Stunde gültig.
              </p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#26ad53;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:12px;">
                Passwort zurücksetzen
              </a>
              <p style="margin:28px 0 0;font-size:13px;color:rgba(255,255,255,0.35);line-height:1.6;">
                Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br/>
                <span style="color:rgba(255,255,255,0.5);word-break:break-all;">${resetUrl}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);">
                Falls du kein Passwort-Reset angefordert hast, kannst du diese E-Mail ignorieren.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await createTransporter().sendMail({
    from,
    to: email,
    subject: 'Dendrite – Passwort zurücksetzen',
    html,
  });
}
