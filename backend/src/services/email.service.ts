import nodemailer from 'nodemailer';
import { buildEmail } from './emailTemplate';

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
      body: `<p style="font-size:18px;line-height:178%;margin:0 0 12px;">Welcome to Dendrite.</p>
             <p style="font-size:17px;line-height:178%;margin:0;">To complete your registration, please verify your email address by clicking the button below. The link is valid for <strong>24 hours</strong>.</p>`,
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
      body: `<p style="font-size:18px;line-height:178%;margin:0 0 12px;">We received a request to reset the password for your Dendrite account.</p>
             <p style="font-size:17px;line-height:178%;margin:0;">Click the button below to set a new password. The link is valid for <strong>1 hour</strong>.</p>`,
      buttonText: 'Reset My Password',
      buttonUrl: resetUrl,
      disclaimer: "If you didn't request a password reset, you can safely ignore this email.",
    }),
    headers: { 'X-Mailin-Track-Open': '0', 'X-Mailin-Track-Click': '0' },
  });
}
