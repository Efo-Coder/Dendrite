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

function buildEmail(opts: {
  frontendUrl: string;
  heading: string;
  body: string;
  buttonText: string;
  buttonUrl: string;
  disclaimer: string;
}): string {
  const { frontendUrl, heading, body, buttonText, buttonUrl, disclaimer } = opts;
  const img = (name: string) => `${frontendUrl}/email/${name}`;
  const year = new Date().getFullYear();

  return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
    @media only screen and (min-width: 620px) {
      .u-row { width: 600px !important; }
      .u-row .u-col { vertical-align: top; }
      .u-row .u-col-100 { width: 600px !important; }
    }
    @media only screen and (max-width: 620px) {
      .u-row-container { max-width: 100% !important; padding-left: 0px !important; padding-right: 0px !important; }
      .u-row { width: 100% !important; }
      .u-row .u-col { display: block !important; width: 100% !important; min-width: 320px !important; max-width: 100% !important; }
      .u-row .u-col > div { margin: 0 auto; }
    }
    body { margin: 0; padding: 0; }
    table, td, tr { border-collapse: collapse; vertical-align: top; }
    .ie-container table, .mso-container table { table-layout: fixed; }
    * { line-height: inherit; }
    a[x-apple-data-detectors=true] { color: inherit !important; text-decoration: none !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;color:#000000;">

<table role="presentation" style="border-collapse:collapse;table-layout:fixed;border-spacing:0;vertical-align:top;min-width:320px;margin:0 auto;background-color:#ffffff;width:100%;" cellpadding="0" cellspacing="0">
<tbody><tr style="vertical-align:top"><td style="word-break:break-word;border-collapse:collapse!important;vertical-align:top;">

<!-- HEADER: dark + logo -->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:#2f3031;">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;">
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;">
        <div style="height:100%;width:100%!important;">
          <div style="box-sizing:border-box;height:100%;padding:0;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody><tr><td style="padding:30px 10px 34px;" align="left">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr><td style="padding:0;" align="center">
                    <a href="${frontendUrl}" target="_blank" style="color:#c6a43c;text-decoration:none;">
                      <img align="center" border="0" src="${img('image-1.png')}" alt="Dendrite" title="Dendrite"
                           style="outline:none;text-decoration:none;clear:both;display:inline-block!important;border:none;height:auto;float:none;width:18%;max-width:104px;"
                           width="104" height="104" />
                    </a>
                  </td></tr>
                </table>
              </td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- HERO IMAGE -->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;">
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;">
        <div style="height:100%;width:100%!important;">
          <div style="box-sizing:border-box;height:100%;padding:0;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody><tr><td style="padding:0;" align="left">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr><td style="padding:0;" align="center">
                    <img align="center" border="0" src="${img('image-2.webp')}" alt="" title=""
                         style="outline:none;text-decoration:none;clear:both;display:inline-block!important;border:none;height:auto;float:none;width:100%;max-width:600px;"
                         width="600" />
                  </td></tr>
                </table>
              </td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- HEADING: dark -->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:#2f3031;">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;">
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;">
        <div style="height:100%;width:100%!important;">
          <div style="box-sizing:border-box;height:100%;padding:0;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody><tr><td style="padding:30px 10px;" align="left">
                <!--[if mso]><table role="presentation" width="100%"><tr><td><![endif]-->
                <h1 style="margin:0;color:#ffffff;line-height:140%;text-align:center;word-wrap:break-word;font-family:'Montserrat',Arial,sans-serif;font-size:28px;font-weight:700;">${heading}</h1>
                <!--[if mso]></td></tr></table><![endif]-->
              </td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- CONTENT: light -->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:#fbfbfb;">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;">
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;">
        <div style="height:100%;width:100%!important;">
          <div style="box-sizing:border-box;height:100%;padding:0;">

            <!-- Body text -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody><tr><td style="padding:48px 40px 24px;" align="left">
                <div style="font-size:17px;color:#222222;line-height:1.8;text-align:left;word-wrap:break-word;font-family:'EB Garamond','Garamond',Georgia,serif;">
                  ${body}
                </div>
              </td></tr></tbody>
            </table>

            <!-- Button -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody><tr><td style="padding:8px 40px 16px;" align="left">
                <div align="center">
                  <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonUrl}" style="height:54px;v-text-anchor:middle;width:260px;" arcsize="20%" stroke="f" fillcolor="#c6a43c"><w:anchorlock/><center style="color:#1a1710;"><![endif]-->
                  <a href="${buttonUrl}" target="_blank"
                     style="box-sizing:border-box;display:inline-block;text-decoration:none;text-align:center;color:#1a1710;background:#c6a43c;border-radius:8px;width:auto;max-width:100%;word-break:break-word;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-family:'Montserrat',Arial,sans-serif;">
                    <span style="display:block;padding:18px 40px;line-height:120%;">${buttonText}</span>
                  </a>
                  <!--[if mso]></center></v:roundrect><![endif]-->
                </div>
              </td></tr></tbody>
            </table>

            <!-- Disclaimer + fallback link -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody><tr><td style="padding:16px 40px 48px;" align="left">
                <div style="font-size:12px;color:#888888;line-height:1.6;font-family:Arial,sans-serif;">
                  <p style="margin:0 0 6px;">${disclaimer}</p>
                  <p style="margin:0;">Button not working? Copy this link: <span style="word-break:break-all;color:#666666;">${buttonUrl}</span></p>
                </div>
              </td></tr></tbody>
            </table>

            <!-- Wave separator -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody><tr><td style="padding:0;" align="left">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr><td style="padding:0;" align="center">
                    <img align="center" border="0" src="${img('image-3.png')}" alt="" title=""
                         style="outline:none;text-decoration:none;clear:both;display:inline-block!important;border:none;height:auto;float:none;width:100%;max-width:600px;"
                         width="600" />
                  </td></tr>
                </table>
              </td></tr></tbody>
            </table>

          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- FOOTER: dark -->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:#2f2f2f;">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;">
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;">
        <div style="height:100%;width:100%!important;">
          <div style="box-sizing:border-box;height:100%;padding:0;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
              <tbody><tr><td style="padding:28px 10px 32px;" align="left">
                <div style="font-size:13px;color:#aaaaaa;line-height:1.8;text-align:center;word-wrap:break-word;font-family:'Montserrat',Arial,sans-serif;">
                  <p style="margin:0 0 4px;">Questions? <a href="mailto:support@dendrite-notes.com" style="color:#c6a43c;text-decoration:none;">support@dendrite-notes.com</a></p>
                  <p style="margin:0;">&copy; ${year} Dendrite. All rights reserved.</p>
                </div>
              </td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

</td></tr></tbody>
</table>
</body>
</html>`;
}

export async function sendVerificationEmail(email: string, token: string) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;
  const from = process.env.SMTP_FROM || 'Dendrite <noreply@dendrite-notes.com>';

  await createTransporter().sendMail({
    from,
    to: email,
    subject: 'Dendrite – Verify your email',
    text: `Verify your email\n\nClick this link to complete your registration (valid for 24 hours):\n${verifyUrl}\n\nIf you didn't create an account, ignore this email.\n\n© ${new Date().getFullYear()} Dendrite`,
    html: buildEmail({
      frontendUrl,
      heading: 'Email Confirmation Required',
      body: `<p style="margin:0 0 16px;">Welcome to Dendrite.</p>
             <p style="margin:0;">To complete your registration, please verify your email address by clicking the button below. This link is valid for <strong>24 hours</strong>.</p>`,
      buttonText: 'Verify Email Address',
      buttonUrl: verifyUrl,
      disclaimer: "If you didn't create a Dendrite account, you can safely ignore this email.",
    }),
    headers: { 'X-Mailin-Track-Open': '0', 'X-Mailin-Track-Click': '0' },
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
  const from = process.env.SMTP_FROM || 'Dendrite <noreply@dendrite-notes.com>';

  await createTransporter().sendMail({
    from,
    to: email,
    subject: 'Dendrite – Reset your password',
    text: `Reset your password\n\nClick this link to set a new password (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.\n\n© ${new Date().getFullYear()} Dendrite`,
    html: buildEmail({
      frontendUrl,
      heading: 'Reset Your Password',
      body: `<p style="margin:0 0 16px;">We received a request to reset the password for your Dendrite account.</p>
             <p style="margin:0;">Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>`,
      buttonText: 'Reset My Password',
      buttonUrl: resetUrl,
      disclaimer: "If you didn't request a password reset, you can safely ignore this email.",
    }),
    headers: { 'X-Mailin-Track-Open': '0', 'X-Mailin-Track-Click': '0' },
  });
}
