import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../uploads');

function safeDeleteUpload(avatarUrl: string) {
  const filename = avatarUrl.split('/uploads/')[1];
  if (!filename) return;
  const resolved = path.resolve(uploadsDir, filename);
  if (!resolved.startsWith(uploadsDir + path.sep) && resolved !== uploadsDir) return;
  if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
}

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  plan: true,
  twoFactorEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        verificationToken,
        verificationTokenExpiresAt,
      },
    });

    await sendVerificationEmail(email, verificationToken);

    return res.status(201).json({ message: 'Registration successful. Please verify your email address.' });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email address first.' });
    }

    const JWT_SECRET = process.env.JWT_SECRET!;
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign({ userId: user.id, twoFactor: true }, JWT_SECRET, { expiresIn: '10m' });
      return res.json({ requiresTwoFactor: true, tempToken });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });

    return res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, createdAt: user.createdAt },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name: name ?? null },
      select: USER_SELECT,
    });
    return res.json({ user });
  } catch (error) {
    console.error('UpdateProfile error:', error);
    return res.status(500).json({ error: 'Could not update profile' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.password) return res.status(400).json({ error: 'This account uses social login. Password cannot be changed.' });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } });

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('ChangePassword error:', error);
    return res.status(500).json({ error: 'Could not change password' });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.userId } });
    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('DeleteAccount error:', error);
    return res.status(500).json({ error: 'Could not delete account' });
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const existing = await prisma.user.findUnique({ where: { id: req.userId }, select: { avatarUrl: true } });
    if (existing?.avatarUrl) safeDeleteUpload(existing.avatarUrl);

    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl },
      select: USER_SELECT,
    });
    return res.json({ user });
  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    console.error('UploadAvatar error:', error);
    return res.status(500).json({ error: 'Could not upload avatar' });
  }
};

export const deleteAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.userId }, select: { avatarUrl: true } });
    if (existing?.avatarUrl) safeDeleteUpload(existing.avatarUrl);
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl: null },
      select: USER_SELECT,
    });
    return res.json({ user });
  } catch (error) {
    console.error('DeleteAvatar error:', error);
    return res.status(500).json({ error: 'Could not delete avatar' });
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.isVerified) {
      return res.json({ message: 'If the email exists and is not yet verified, a new email has been sent.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationTokenExpiresAt },
    });

    await sendVerificationEmail(email, verificationToken);

    return res.json({ message: 'If the email exists and is not yet verified, a new email has been sent.' });
  } catch (error) {
    console.error('ResendVerification error:', error);
    return res.status(500).json({ error: 'Could not send email' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.query as { token?: string };
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!token) {
    return res.redirect(`${frontendUrl}/login?verified=error`);
  }

  try {
    const user = await prisma.user.findUnique({ where: { verificationToken: token } });

    if (!user || !user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
      return res.redirect(`${frontendUrl}/login?verified=expired`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null, verificationTokenExpiresAt: null },
    });

    return res.redirect(`${frontendUrl}/login?verified=true`);
  } catch (error) {
    console.error('VerifyEmail error:', error);
    return res.redirect(`${frontendUrl}/login?verified=error`);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.isVerified) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: resetToken, passwordResetTokenExpiresAt: resetTokenExpiresAt },
      });

      await sendPasswordResetEmail(email, resetToken);
    }

    // Always return 200 to prevent email enumeration
    return res.json({ message: 'If the email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('ForgotPassword error:', error);
    return res.status(500).json({ error: 'Could not send reset email' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const user = await prisma.user.findUnique({ where: { passwordResetToken: token } });

    if (!user || !user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, passwordResetToken: null, passwordResetTokenExpiresAt: null },
    });

    return res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('ResetPassword error:', error);
    return res.status(500).json({ error: 'Could not reset password' });
  }
};

export const setup2FA = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.twoFactorEnabled) return res.status(400).json({ error: '2FA is already enabled' });

    const secret = speakeasy.generateSecret({ name: `Dendrite (${user.email})`, length: 20 });

    await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret.base32 } });

    const otpauthUrl = secret.otpauth_url!;
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    return res.json({ secret: secret.base32, qrCode: qrCodeDataUrl });
  } catch (error) {
    console.error('Setup2FA error:', error);
    return res.status(500).json({ error: 'Could not setup 2FA' });
  }
};

export const enable2FA = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !user.twoFactorSecret) return res.status(400).json({ error: '2FA not set up' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) return res.status(400).json({ error: 'Invalid code' });

    await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });

    return res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    console.error('Enable2FA error:', error);
    return res.status(500).json({ error: 'Could not enable 2FA' });
  }
};

export const disable2FA = async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.password) return res.status(400).json({ error: 'This account uses social login.' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Incorrect password' });

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    return res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error('Disable2FA error:', error);
    return res.status(500).json({ error: 'Could not disable 2FA' });
  }
};

export const verify2FA = async (req: Request, res: Response) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ error: 'Token and code are required' });

    const JWT_SECRET = process.env.JWT_SECRET!;
    let payload: any;
    try {
      payload = jwt.verify(tempToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    if (!payload.twoFactor) return res.status(400).json({ error: 'Invalid token type' });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.twoFactorSecret) return res.status(400).json({ error: 'User not found' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) return res.status(400).json({ error: 'Invalid code' });

    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });

    return res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, createdAt: user.createdAt },
      token,
    });
  } catch (error) {
    console.error('Verify2FA error:', error);
    return res.status(500).json({ error: 'Could not verify 2FA' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: USER_SELECT,
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ error: 'Could not fetch user data' });
  }
};
