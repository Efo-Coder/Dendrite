import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendVerificationEmail } from '../services/email.service';

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
  createdAt: true,
  updatedAt: true,
} as const;

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Password sind erforderlich' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Das Passwort muss mindestens 8 Zeichen lang sein' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email bereits registriert' });
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

    return res.status(201).json({ message: 'Registrierung erfolgreich. Bitte bestätige deine E-Mail-Adresse.' });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Fehler bei der Registrierung' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Password sind erforderlich' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Bitte bestätige zuerst deine E-Mail-Adresse.' });
    }

    const JWT_SECRET = process.env.JWT_SECRET!;
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });

    return res.json({
      message: 'Login erfolgreich',
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, createdAt: user.createdAt },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Fehler beim Login' });
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
    return res.status(500).json({ error: 'Profil konnte nicht aktualisiert werden' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Das neue Passwort muss mindestens 8 Zeichen lang sein' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } });

    return res.json({ message: 'Passwort erfolgreich geändert' });
  } catch (error) {
    console.error('ChangePassword error:', error);
    return res.status(500).json({ error: 'Passwort konnte nicht geändert werden' });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.userId } });
    return res.json({ message: 'Konto erfolgreich gelöscht' });
  } catch (error) {
    console.error('DeleteAccount error:', error);
    return res.status(500).json({ error: 'Konto konnte nicht gelöscht werden' });
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Kein Bild hochgeladen' });

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
    return res.status(500).json({ error: 'Avatar konnte nicht hochgeladen werden' });
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
    return res.status(500).json({ error: 'Avatar konnte nicht gelöscht werden' });
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-Mail ist erforderlich' });

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.isVerified) {
      return res.json({ message: 'Falls die E-Mail existiert und noch nicht bestätigt ist, wurde eine neue E-Mail gesendet.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken, verificationTokenExpiresAt },
    });

    await sendVerificationEmail(email, verificationToken);

    return res.json({ message: 'Falls die E-Mail existiert und noch nicht bestätigt ist, wurde eine neue E-Mail gesendet.' });
  } catch (error) {
    console.error('ResendVerification error:', error);
    return res.status(500).json({ error: 'E-Mail konnte nicht gesendet werden' });
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

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: USER_SELECT,
    });

    if (!user) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen der User-Daten' });
  }
};
