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
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
    :root { color-scheme: light only; }
    @media only screen and (min-width: 620px) {
      .u-row { width: 600px !important; }
      .u-row .u-col { vertical-align: top; }
      .u-row .u-col-100 { width: 600px !important; }
    }
    @media only screen and (max-width: 620px) {
      .u-row-container { max-width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
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

<!-- ═══ HEADER: dark + logo ═══ -->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:#2f3031;">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;background-color:#2f3031;">
      <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;background-color:#2f3031;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#2f3031"><tr style="background-color:#2f3031;"><![endif]-->
      <!--[if (mso)|(IE)]><td align="center" width="600" style="width:600px;border:0;border-radius:0;" valign="top"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;"><![endif]-->
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;">
        <div style="height:100%;width:100%!important;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing:border-box;height:100%;padding:0;border:0;"><!--<![endif]-->
          <table id="u_content_image_1" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0" bgcolor="#2f3031">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:30px 10px 34px;font-family:arial,helvetica,sans-serif;" align="left">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:0;" align="center">
                  <a href="${frontendUrl}" target="_blank" style="color:#fdc71b;text-decoration:underline;line-height:inherit;">
                    <img align="center" border="0" src="${img('image-1.png')}" alt="Logo" title="Logo"
                         style="outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;clear:both;display:inline-block!important;border:none;height:auto;float:none;width:18%;max-width:104.4px;"
                         width="104.4" height="104" />
                  </a>
                </td></tr>
              </table>
            </td></tr></tbody>
          </table>
          <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
        </div>
      </div>
      <!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]-->
    </div>
  </div>
</div>

<!-- ═══ HERO IMAGE ═══ -->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:#2f3031;">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;background-color:transparent;">
      <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;background-color:transparent;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr style="background-color:transparent;"><![endif]-->
      <!--[if (mso)|(IE)]><td align="center" width="600" style="width:600px;border:0;border-radius:0;" valign="top"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;"><![endif]-->
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;">
        <div style="height:100%;width:100%!important;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing:border-box;height:100%;padding:0;border:0;"><!--<![endif]-->
          <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:0;font-family:arial,helvetica,sans-serif;font-size:0;line-height:0;" align="left">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:0;font-size:0;line-height:0;" align="center">
                  <img align="center" border="0" src="${img('image-2.webp')}" alt="Hero Image" title="Hero Image"
                       style="outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;clear:both;display:block!important;border:none;height:auto;float:none;width:100%;max-width:600px;"
                       width="600" />
                </td></tr>
              </table>
            </td></tr></tbody>
          </table>
          <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
        </div>
      </div>
      <!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]-->
    </div>
  </div>
</div>

<!-- ═══ HEADING: dark ═══ -->
<!--[if gte mso 9]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"><tr><td valign="top"><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;"><v:fill type="frame" src="" /><v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0"><![endif]-->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:#2f3031;">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;background-color:transparent;">
      <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;background-color:transparent;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#2f3031"><tr style="background-color:#2f3031;"><![endif]-->
      <!--[if (mso)|(IE)]><td align="center" width="600" style="width:600px;border:0;border-radius:0;" valign="top"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;"><![endif]-->
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;">
        <div style="height:100%;width:100%!important;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing:border-box;height:100%;padding:0;border:0;"><!--<![endif]-->
          <table id="u_content_heading_1" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:30px 10px;font-family:arial,helvetica,sans-serif;" align="left">
              <!--[if mso]><table role="presentation" width="100%"><tr><td><![endif]-->
              <h1 style="margin:0;color:#ffffff;line-height:140%;text-align:center;word-wrap:break-word;font-family:'Montserrat',sans-serif;font-size:31px;font-weight:400;"><strong>${heading}</strong></h1>
              <!--[if mso]></td></tr></table><![endif]-->
            </td></tr></tbody>
          </table>
          <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
        </div>
      </div>
      <!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]-->
    </div>
  </div>
</div>
<!--[if gte mso 9]></v:textbox></v:rect></td></tr></table><![endif]-->

<!-- ═══ CONTENT: light ═══ -->
<div class="u-row-container" style="padding:0;background-color:#fbfbfb;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:#fbfbfb;">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;background-color:#fbfbfb;">
      <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;background-color:#fbfbfb;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#fbfbfb"><tr style="background-color:#fbfbfb;"><![endif]-->
      <!--[if (mso)|(IE)]><td align="center" width="600" style="width:600px;border:0;border-radius:0;background-color:#fbfbfb;" bgcolor="#fbfbfb" valign="top"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;background-color:#fbfbfb;" bgcolor="#fbfbfb"><![endif]-->
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;background-color:#fbfbfb;">
        <div style="height:100%;width:100%!important;background-color:#fbfbfb;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing:border-box;height:100%;padding:0;border:0;background-color:#fbfbfb;"><!--<![endif]-->

          <!-- Body text -->
          <table id="u_content_text_1" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0" bgcolor="#fbfbfb">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:50px 40px 10px;font-family:arial,helvetica,sans-serif;background-color:#fbfbfb;" bgcolor="#fbfbfb" align="left">
              <div style="font-size:16px;color:#111111;line-height:180%;text-align:left;word-wrap:break-word;font-family:'EB Garamond','Garamond',Georgia,serif;">
                ${body}
              </div>
            </td></tr></tbody>
          </table>

          <!-- Disclaimer -->
          <table id="u_content_text_2" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0" bgcolor="#fbfbfb">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:8px 40px 16px;font-family:arial,helvetica,sans-serif;background-color:#fbfbfb;" bgcolor="#fbfbfb" align="left">
              <div style="font-size:14px;color:#555555;line-height:180%;text-align:left;word-wrap:break-word;font-family:'Montserrat',sans-serif;">
                <p style="line-height:180%;margin:0;">${disclaimer}</p>
              </div>
            </td></tr></tbody>
          </table>

          <!-- Button -->
          <table id="u_content_button_1" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0" bgcolor="#fbfbfb">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:10px 10px 20px;font-family:arial,helvetica,sans-serif;background-color:#fbfbfb;" bgcolor="#fbfbfb" align="left">
              <!--[if mso]><style>.v-button {background:transparent!important;}</style><![endif]-->
              <div align="center">
                <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonUrl}" style="height:62px;v-text-anchor:middle;width:278px;" arcsize="35.5%" stroke="f" fillcolor="#c6a43c"><w:anchorlock/><center style="color:#ffffff;"><![endif]-->
                <a href="${buttonUrl}" target="_blank"
                   style="box-sizing:border-box;display:inline-block;text-decoration:none;text-size-adjust:none;text-align:center;color:#ffffff;background:#c6a43c;border-radius:22px;width:48%;max-width:100%;word-break:break-word;overflow-wrap:break-word;font-size:14px;line-height:inherit;">
                  <span style="display:block;padding:23px 30px 22px;line-height:120%;"><strong><span style="font-size:14px;line-height:16.8px;font-family:'Montserrat',sans-serif;">${buttonText}</span></strong></span>
                </a>
                <!--[if mso]></center></v:roundrect><![endif]-->
              </div>
            </td></tr></tbody>
          </table>

          <!-- Fallback link -->
          <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0" bgcolor="#fbfbfb">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:0 40px 24px;font-family:arial,helvetica,sans-serif;background-color:#fbfbfb;" bgcolor="#fbfbfb" align="left">
              <div style="font-size:11px;color:#999999;line-height:160%;font-family:arial,helvetica,sans-serif;">
                <p style="margin:0;">Button not working? Copy this link: <span style="word-break:break-all;">${buttonUrl}</span></p>
              </div>
            </td></tr></tbody>
          </table>

          <!-- Wave separator -->
          <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:0;font-family:arial,helvetica,sans-serif;font-size:0;line-height:0;" align="left">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:0;font-size:0;line-height:0;" align="center">
                  <img align="center" border="0" src="${img('image-3.png')}" alt="border" title="border"
                       style="outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;clear:both;display:block!important;border:none;height:auto;float:none;width:100%;max-width:600px;"
                       width="600" height="142" />
                </td></tr>
              </table>
            </td></tr></tbody>
          </table>

          <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
        </div>
      </div>
      <!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]-->
    </div>
  </div>
</div>

<!-- ═══ FOOTER: dark + social icons ═══ -->
<!--[if gte mso 9]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"><tr><td valign="top"><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;"><v:fill type="frame" src="" /><v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0"><![endif]-->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:#2f2f2f;">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;background-color:transparent;">
      <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;background-color:transparent;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#2f2f2f"><tr style="background-color:#2f2f2f;"><![endif]-->
      <!--[if (mso)|(IE)]><td align="center" width="600" style="width:600px;border:0;border-radius:0;" valign="top"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;"><![endif]-->
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;">
        <div style="height:100%;width:100%!important;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing:border-box;height:100%;padding:0;border:0;"><!--<![endif]-->

          <!-- Social icons -->
          <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:0 10px 20px;font-family:arial,helvetica,sans-serif;" align="left">
              <div align="center" style="direction:ltr;">
                <div style="display:table;max-width:161px;">
                  <!--[if (mso)|(IE)]><table role="presentation" width="161" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-collapse:collapse;" align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:161px;"><tr><![endif]-->
                  <!--[if (mso)|(IE)]><td width="32" style="width:32px;padding-right:11px;" valign="top"><![endif]-->
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="width:32px!important;height:32px!important;display:inline-block;border-collapse:collapse;table-layout:fixed;border-spacing:0;vertical-align:top;margin-right:11px">
                    <tbody><tr style="vertical-align:top"><td valign="middle" style="word-break:break-word;border-collapse:collapse!important;vertical-align:top">
                      <a href="${frontendUrl}" title="Twitter" target="_blank" style="color:#fdc71b;text-decoration:underline;line-height:inherit;">
                        <img src="${img('image-4.png')}" alt="Twitter" title="Twitter" width="32" style="outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important">
                      </a>
                    </td></tr></tbody>
                  </table>
                  <!--[if (mso)|(IE)]></td><td width="32" style="width:32px;padding-right:11px;" valign="top"><![endif]-->
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="width:32px!important;height:32px!important;display:inline-block;border-collapse:collapse;table-layout:fixed;border-spacing:0;vertical-align:top;margin-right:11px">
                    <tbody><tr style="vertical-align:top"><td valign="middle" style="word-break:break-word;border-collapse:collapse!important;vertical-align:top">
                      <a href="${frontendUrl}" title="LinkedIn" target="_blank" style="color:#fdc71b;text-decoration:underline;line-height:inherit;">
                        <img src="${img('image-5.png')}" alt="LinkedIn" title="LinkedIn" width="32" style="outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important">
                      </a>
                    </td></tr></tbody>
                  </table>
                  <!--[if (mso)|(IE)]></td><td width="32" style="width:32px;padding-right:11px;" valign="top"><![endif]-->
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="width:32px!important;height:32px!important;display:inline-block;border-collapse:collapse;table-layout:fixed;border-spacing:0;vertical-align:top;margin-right:11px">
                    <tbody><tr style="vertical-align:top"><td valign="middle" style="word-break:break-word;border-collapse:collapse!important;vertical-align:top">
                      <a href="mailto:support@dendrite-notes.com" title="Email" target="_blank" style="color:#fdc71b;text-decoration:underline;line-height:inherit;">
                        <img src="${img('image-6.png')}" alt="Email" title="Email" width="32" style="outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important">
                      </a>
                    </td></tr></tbody>
                  </table>
                  <!--[if (mso)|(IE)]></td><td width="32" style="width:32px;padding-right:0;" valign="top"><![endif]-->
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="width:32px!important;height:32px!important;display:inline-block;border-collapse:collapse;table-layout:fixed;border-spacing:0;vertical-align:top;margin-right:0">
                    <tbody><tr style="vertical-align:top"><td valign="middle" style="word-break:break-word;border-collapse:collapse!important;vertical-align:top">
                      <a href="${frontendUrl}" title="Instagram" target="_blank" style="color:#fdc71b;text-decoration:underline;line-height:inherit;">
                        <img src="${img('image-7.png')}" alt="Instagram" title="Instagram" width="32" style="outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important">
                      </a>
                    </td></tr></tbody>
                  </table>
                  <!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]-->
                </div>
              </div>
            </td></tr></tbody>
          </table>

          <!-- Footer text -->
          <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:10px 10px 50px;font-family:arial,helvetica,sans-serif;" align="left">
              <div style="font-size:14px;color:#ffffff;line-height:190%;text-align:center;word-wrap:break-word;">
                <p style="font-size:14px;line-height:190%;margin:0;">
                  <span style="font-family:'Montserrat',sans-serif;font-size:14px;font-weight:300;line-height:26.6px;">If you have any questions, feel free message us at <a href="mailto:support@dendrite-notes.com" target="_blank" style="color:#fdc71b;text-decoration:underline;line-height:inherit;"><span style="text-decoration:underline;font-size:14px;line-height:26.6px;">support@dendrite-notes.com</span></a>.&nbsp;</span><br>
                  <span style="font-family:'Montserrat',sans-serif;font-size:14px;font-weight:300;line-height:26.6px;">All right reserved. Update email preferences or unsubscribe.</span><br>
                  <span style="font-family:'Montserrat',sans-serif;font-size:14px;font-weight:300;line-height:26.6px;">123-456-7890</span><br>
                  <span style="font-family:'Montserrat',sans-serif;font-size:14px;font-weight:300;line-height:26.6px;">San Francisco, CA. United States</span><br>
                  <span style="font-family:'Montserrat',sans-serif;font-size:14px;font-weight:300;line-height:26.6px;">Terms of use | Privacy Policy</span>
                </p>
              </div>
            </td></tr></tbody>
          </table>

          <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
        </div>
      </div>
      <!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]-->
    </div>
  </div>
</div>
<!--[if gte mso 9]></v:textbox></v:rect></td></tr></table><![endif]-->

<!-- ═══ COPYRIGHT ═══ -->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:transparent;">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;background-color:transparent;">
      <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;background-color:transparent;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr style="background-color:transparent;"><![endif]-->
      <!--[if (mso)|(IE)]><td align="center" width="600" style="width:600px;border:0;border-radius:0;" valign="top"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;"><![endif]-->
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;">
        <div style="height:100%;width:100%!important;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing:border-box;height:100%;padding:0;border:0;"><!--<![endif]-->
          <table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:20px 10px;font-family:arial,helvetica,sans-serif;" align="left">
              <div style="font-size:14px;color:#6f7a7a;line-height:140%;text-align:center;word-wrap:break-word;">
                <p style="font-size:14px;line-height:140%;margin:0;">
                  <span style="font-size:12px;line-height:16.8px;font-family:'Montserrat',sans-serif;">&copy; ${year} Dendrite. All Rights Reserved.</span>
                </p>
              </div>
            </td></tr></tbody>
          </table>
          <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
        </div>
      </div>
      <!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]-->
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
      body: `<p style="font-size:18px;line-height:180%;margin:0 0 12px;">Welcome to Dendrite.</p>
             <p style="font-size:16px;line-height:180%;margin:0;">To complete your registration, please verify your email address by clicking the button below. The link is valid for <strong>24 hours</strong>.</p>`,
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
      body: `<p style="font-size:18px;line-height:180%;margin:0 0 12px;">We received a request to reset the password for your Dendrite account.</p>
             <p style="font-size:16px;line-height:180%;margin:0;">Click the button below to set a new password. The link is valid for <strong>1 hour</strong>.</p>`,
      buttonText: 'Reset My Password',
      buttonUrl: resetUrl,
      disclaimer: "If you didn't request a password reset, you can safely ignore this email.",
    }),
    headers: { 'X-Mailin-Track-Open': '0', 'X-Mailin-Track-Click': '0' },
  });
}
