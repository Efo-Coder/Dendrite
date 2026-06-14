// Dev-only: renders the transactional email template to static HTML so the look
// can be reviewed in a browser. Run from backend/: npx tsx ../testing/preview-email.ts
import { writeFileSync } from 'fs';
import { join } from 'path';
import { buildEmail } from '../backend/src/services/emailTemplate';

const frontendUrl = 'https://www.dendrite-notes.com'; // hosted /email assets (matches FRONTEND_URL)

const verify = buildEmail({
  frontendUrl,
  heading: 'Email Confirmation Required',
  body: `<p style="font-size:18px;line-height:178%;margin:0 0 12px;">Welcome to Dendrite.</p>
         <p style="font-size:17px;line-height:178%;margin:0;">To complete your registration, please verify your email address by clicking the button below. The link is valid for <strong>24 hours</strong>.</p>`,
  buttonText: 'Verify Email Address',
  buttonUrl: 'https://dendrite-notes.com/api/auth/verify-email?token=PREVIEW_TOKEN',
  disclaimer: "If you didn't create a Dendrite account, you can safely ignore this email.",
});

const reset = buildEmail({
  frontendUrl,
  heading: 'Reset Your Password',
  body: `<p style="font-size:18px;line-height:178%;margin:0 0 12px;">We received a request to reset the password for your Dendrite account.</p>
         <p style="font-size:17px;line-height:178%;margin:0;">Click the button below to set a new password. The link is valid for <strong>1 hour</strong>.</p>`,
  buttonText: 'Reset My Password',
  buttonUrl: 'https://dendrite-notes.com/reset-password?token=PREVIEW_TOKEN',
  disclaimer: "If you didn't request a password reset, you can safely ignore this email.",
});

writeFileSync(join(__dirname, 'email-verify.html'), verify);
writeFileSync(join(__dirname, 'email-reset.html'), reset);
console.log('Wrote email-verify.html and email-reset.html to testing/');
