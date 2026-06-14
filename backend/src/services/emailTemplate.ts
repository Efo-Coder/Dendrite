// Transactional email template — mirrors the app's look: warm dark canvas,
// Cormorant-italic headlines, gold-gradient action button. Pure string builder
// (no I/O) so it can be rendered by the preview script without side effects.

// ─── Brand palette (sRGB Hex of the app's oklch tokens — email clients can't do oklch) ───
const CARD = '#15110e'; // warm dark surface (panel-bg)
const CANVAS = '#0c0a08'; // page behind the 600px card (bg-deep)
const GOLD = '#d8b260'; // --accent
const GOLD_DEEP = '#93690d'; // --accent-deep
const GOLD_HI = '#f8ca65'; // --accent-hi
const ON_GOLD = '#16110a'; // dark ink that sits on gold (btn text)
const INK = '#efeae2'; // --ink
const INK_MID = '#bbb7b0'; // --ink-mid
const INK_LOW = '#7d7a74'; // --ink-low
const INK_DIM = '#504d47'; // --ink-dim

// Cambria sits after the webfonts: modern clients load Cormorant/EB Garamond, but Outlook
// (no webfont support) falls back to Cambria — far more elegant than Georgia.
const DISPLAY = "'Cormorant Garamond','Cambria','Garamond','EB Garamond',Georgia,serif";
const BODY = "'EB Garamond','Cormorant Garamond','Cambria','Garamond',Georgia,serif";

export function buildEmail(opts: {
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
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
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
<body style="margin:0;padding:0;background-color:${CANVAS};color:${INK};">
<table role="presentation" style="border-collapse:collapse;table-layout:fixed;border-spacing:0;vertical-align:top;min-width:320px;margin:0 auto;background-color:${CANVAS};width:100%;" cellpadding="0" cellspacing="0">
<tbody><tr style="vertical-align:top"><td style="word-break:break-word;border-collapse:collapse!important;vertical-align:top;">

<!-- ═══ HEADER: logo on dark ═══ -->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:${CARD};">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;background-color:${CARD};">
      <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;background-color:${CARD};"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${CARD}"><tr style="background-color:${CARD};"><![endif]-->
      <!--[if (mso)|(IE)]><td align="center" width="600" style="width:600px;border:0;border-radius:0;" valign="top"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;"><![endif]-->
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;">
        <div style="height:100%;width:100%!important;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing:border-box;height:100%;padding:0;border:0;"><!--<![endif]-->
          <table style="font-family:${BODY};" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0" bgcolor="${CARD}">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:32px 10px 12px;font-family:${BODY};" align="left">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:0;" align="center">
                  <a href="${frontendUrl}" target="_blank" style="color:${GOLD};text-decoration:none;line-height:inherit;">
                    <img align="center" border="0" src="${img('logo.png')}" alt="Dendrite" title="Dendrite"
                         style="outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;clear:both;display:inline-block!important;border:none;height:auto;float:none;width:16%;max-width:92px;"
                         width="92" />
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

<!-- ═══ HEADING: Cormorant italic ═══ -->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:${CARD};">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;background-color:transparent;">
      <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;background-color:transparent;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${CARD}"><tr style="background-color:${CARD};"><![endif]-->
      <!--[if (mso)|(IE)]><td align="center" width="600" style="width:600px;border:0;border-radius:0;" valign="top"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;"><![endif]-->
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;">
        <div style="height:100%;width:100%!important;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing:border-box;height:100%;padding:0;border:0;"><!--<![endif]-->
          <table style="font-family:${DISPLAY};" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:14px 24px 6px;font-family:${DISPLAY};" align="center">
              <h1 style="margin:0;color:${INK};line-height:128%;text-align:center;word-wrap:break-word;font-family:${DISPLAY};font-size:38px;font-style:italic;font-weight:500;">${heading}</h1>
            </td></tr></tbody>
          </table>
          <!-- gold divider -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody><tr><td style="padding:18px 0 0;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:46px;height:1px;background-color:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr></table>
            </td></tr></tbody>
          </table>
          <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
        </div>
      </div>
      <!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]-->
    </div>
  </div>
</div>

<!-- ═══ CONTENT ═══ -->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:${CARD};">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;background-color:${CARD};">
      <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;background-color:${CARD};"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${CARD}"><tr style="background-color:${CARD};"><![endif]-->
      <!--[if (mso)|(IE)]><td align="center" width="600" style="width:600px;border:0;border-radius:0;background-color:${CARD};" bgcolor="${CARD}" valign="top"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;background-color:${CARD};" bgcolor="${CARD}"><![endif]-->
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;background-color:${CARD};">
        <div style="height:100%;width:100%!important;background-color:${CARD};">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing:border-box;height:100%;padding:0;border:0;background-color:${CARD};"><!--<![endif]-->

          <!-- Body text -->
          <table style="font-family:${BODY};" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0" bgcolor="${CARD}">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:30px 40px 10px;font-family:${BODY};background-color:${CARD};" bgcolor="${CARD}" align="left">
              <div style="font-size:17px;color:${INK};line-height:178%;text-align:center;word-wrap:break-word;font-family:${BODY};">
                ${body}
              </div>
            </td></tr></tbody>
          </table>

          <!-- Disclaimer -->
          <table style="font-family:${BODY};" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0" bgcolor="${CARD}">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:6px 40px 14px;font-family:${BODY};background-color:${CARD};" bgcolor="${CARD}" align="center">
              <div style="font-size:14px;color:${INK_LOW};line-height:170%;text-align:center;word-wrap:break-word;font-family:${BODY};font-style:italic;">
                <p style="line-height:170%;margin:0;">${disclaimer}</p>
              </div>
            </td></tr></tbody>
          </table>

          <!-- Button -->
          <table style="font-family:${BODY};" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0" bgcolor="${CARD}">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:12px 10px 24px;font-family:${BODY};background-color:${CARD};" bgcolor="${CARD}" align="left">
              <!--[if mso]><style>.v-button {background:transparent!important;}</style><![endif]-->
              <div align="center">
                <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonUrl}" style="height:58px;v-text-anchor:middle;width:270px;" arcsize="17%" stroke="f" fillcolor="${GOLD}"><v:fill type="gradient" color="${GOLD}" color2="${GOLD_DEEP}" method="linear sigma" angle="-90"/><w:anchorlock/><center style="color:${ON_GOLD};font-family:${DISPLAY};font-size:17px;font-weight:bold;"><![endif]-->
                <a href="${buttonUrl}" target="_blank"
                   style="box-sizing:border-box;display:inline-block;text-decoration:none;text-size-adjust:none;text-align:center;color:${ON_GOLD};background:${GOLD};background:linear-gradient(180deg,${GOLD} 0%,${GOLD_DEEP} 100%);border-radius:10px;box-shadow:inset 0 1px 0 ${GOLD_HI};width:auto;max-width:100%;word-break:break-word;overflow-wrap:break-word;font-size:17px;line-height:inherit;">
                  <span style="display:block;padding:19px 44px 18px;line-height:120%;"><span style="font-size:17px;line-height:18px;font-family:${DISPLAY};font-weight:600;letter-spacing:0.03em;color:${ON_GOLD};">${buttonText}</span></span>
                </a>
                <!--[if mso]></center></v:roundrect><![endif]-->
              </div>
            </td></tr></tbody>
          </table>

          <!-- Fallback link -->
          <table style="font-family:${BODY};" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0" bgcolor="${CARD}">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:0 40px 30px;font-family:${BODY};background-color:${CARD};" bgcolor="${CARD}" align="center">
              <div style="font-size:12px;color:${INK_DIM};line-height:165%;font-family:${BODY};text-align:center;">
                <p style="margin:0;">If the button doesn't work, use this link:<br><a href="${buttonUrl}" target="_blank" style="color:${GOLD};text-decoration:underline;word-break:break-all;line-height:inherit;">${buttonUrl}</a></p>
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

<!-- ═══ FOOTER: hairline + social + meta ═══ -->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:${CARD};">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;background-color:transparent;">
      <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;background-color:${CARD};"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${CARD}"><tr style="background-color:${CARD};"><![endif]-->
      <!--[if (mso)|(IE)]><td align="center" width="600" style="width:600px;border:0;border-radius:0;" valign="top"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;"><![endif]-->
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:middle;">
        <div style="height:100%;width:100%!important;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing:border-box;height:100%;padding:0;border:0;"><!--<![endif]-->

          <!-- hairline -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0" bgcolor="${CARD}">
            <tbody><tr><td style="padding:0 40px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0"><tr><td style="height:1px;background-color:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr></table>
            </td></tr></tbody>
          </table>

          <!-- Social icons -->
          <table style="font-family:${BODY};" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0" bgcolor="${CARD}">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:26px 10px 12px;font-family:${BODY};" align="left">
              <div align="center" style="direction:ltr;">
                <div style="display:table;max-width:161px;">
                  <!--[if (mso)|(IE)]><table role="presentation" width="161" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-collapse:collapse;" align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:161px;"><tr><![endif]-->
                  <!--[if (mso)|(IE)]><td width="32" style="width:32px;padding-right:11px;" valign="top"><![endif]-->
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="width:32px!important;height:32px!important;display:inline-block;border-collapse:collapse;table-layout:fixed;border-spacing:0;vertical-align:top;margin-right:11px">
                    <tbody><tr style="vertical-align:top"><td valign="middle" style="word-break:break-word;border-collapse:collapse!important;vertical-align:top">
                      <a href="${frontendUrl}" title="Twitter" target="_blank" style="color:${GOLD};text-decoration:none;line-height:inherit;">
                        <img src="${img('social/twitter-gold.png')}" alt="Twitter" title="Twitter" width="32" style="outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important;">
                      </a>
                    </td></tr></tbody>
                  </table>
                  <!--[if (mso)|(IE)]></td><td width="32" style="width:32px;padding-right:11px;" valign="top"><![endif]-->
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="width:32px!important;height:32px!important;display:inline-block;border-collapse:collapse;table-layout:fixed;border-spacing:0;vertical-align:top;margin-right:11px">
                    <tbody><tr style="vertical-align:top"><td valign="middle" style="word-break:break-word;border-collapse:collapse!important;vertical-align:top">
                      <a href="${frontendUrl}" title="LinkedIn" target="_blank" style="color:${GOLD};text-decoration:none;line-height:inherit;">
                        <img src="${img('social/linkedin-gold.png')}" alt="LinkedIn" title="LinkedIn" width="32" style="outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important;">
                      </a>
                    </td></tr></tbody>
                  </table>
                  <!--[if (mso)|(IE)]></td><td width="32" style="width:32px;padding-right:11px;" valign="top"><![endif]-->
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="width:32px!important;height:32px!important;display:inline-block;border-collapse:collapse;table-layout:fixed;border-spacing:0;vertical-align:top;margin-right:11px">
                    <tbody><tr style="vertical-align:top"><td valign="middle" style="word-break:break-word;border-collapse:collapse!important;vertical-align:top">
                      <a href="mailto:support@dendrite-notes.com" title="Email" target="_blank" style="color:${GOLD};text-decoration:none;line-height:inherit;">
                        <img src="${img('social/mail-gold.png')}" alt="Email" title="Email" width="32" style="outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important;">
                      </a>
                    </td></tr></tbody>
                  </table>
                  <!--[if (mso)|(IE)]></td><td width="32" style="width:32px;padding-right:0;" valign="top"><![endif]-->
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="32" height="32" style="width:32px!important;height:32px!important;display:inline-block;border-collapse:collapse;table-layout:fixed;border-spacing:0;vertical-align:top;margin-right:0">
                    <tbody><tr style="vertical-align:top"><td valign="middle" style="word-break:break-word;border-collapse:collapse!important;vertical-align:top">
                      <a href="${frontendUrl}" title="Instagram" target="_blank" style="color:${GOLD};text-decoration:none;line-height:inherit;">
                        <img src="${img('social/instagram-gold.png')}" alt="Instagram" title="Instagram" width="32" style="outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;clear:both;display:block!important;border:none;height:auto;float:none;max-width:32px!important;">
                      </a>
                    </td></tr></tbody>
                  </table>
                  <!--[if (mso)|(IE)]></td></tr></table></td></tr></table><![endif]-->
                </div>
              </div>
            </td></tr></tbody>
          </table>

          <!-- Footer text -->
          <table style="font-family:${BODY};" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0" bgcolor="${CARD}">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:8px 30px 28px;font-family:${BODY};" align="center">
              <div style="font-size:14px;color:${INK_LOW};line-height:185%;text-align:center;word-wrap:break-word;font-family:${BODY};">
                <p style="font-size:14px;line-height:185%;margin:0;">
                  <span style="font-family:${BODY};font-size:14px;line-height:26px;">If you have any questions, feel free message us at <a href="mailto:support@dendrite-notes.com" target="_blank" style="color:${GOLD};text-decoration:underline;line-height:inherit;">support@dendrite-notes.com</a>.&nbsp;</span><br>
                  <span style="font-family:${BODY};font-size:14px;line-height:26px;">All right reserved. Update email preferences or unsubscribe.</span><br>
                  <span style="font-family:${BODY};font-size:14px;line-height:26px;">San Francisco, CA. United States</span><br>
                  <a href="${frontendUrl}/terms" target="_blank" style="color:${INK_MID};text-decoration:underline;font-family:${BODY};font-size:14px;line-height:26px;">Terms of use</a><span style="font-family:${BODY};font-size:14px;line-height:26px;"> | </span><a href="${frontendUrl}/privacy" target="_blank" style="color:${INK_MID};text-decoration:underline;font-family:${BODY};font-size:14px;line-height:26px;">Privacy Policy</a>
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

<!-- ═══ COPYRIGHT ═══ -->
<div class="u-row-container" style="padding:0;background-color:transparent;">
  <div class="u-row" style="margin:0 auto;min-width:320px;max-width:600px;background-color:transparent;">
    <div style="border-collapse:collapse;display:table;width:100%;height:100%;background-color:transparent;">
      <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;background-color:transparent;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr style="background-color:transparent;"><![endif]-->
      <!--[if (mso)|(IE)]><td align="center" width="600" style="width:600px;border:0;border-radius:0;" valign="top"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0;"><![endif]-->
      <div class="u-col u-col-100" style="max-width:320px;min-width:600px;display:table-cell;vertical-align:top;">
        <div style="height:100%;width:100%!important;">
          <!--[if (!mso)&(!IE)]><!--><div style="box-sizing:border-box;height:100%;padding:0;border:0;"><!--<![endif]-->
          <table style="font-family:${BODY};" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
            <tbody><tr><td style="overflow-wrap:break-word;word-break:break-word;padding:20px 10px;font-family:${BODY};" align="center">
              <div style="font-size:12px;color:${INK_DIM};line-height:140%;text-align:center;word-wrap:break-word;font-family:${BODY};">
                <p style="font-size:12px;line-height:140%;margin:0;">&copy; ${year} Dendrite. All Rights Reserved.</p>
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
