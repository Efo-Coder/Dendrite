import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

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

    // Validierung
    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Password sind erforderlich' });
    }

    // Prüfe ob User bereits existiert
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email bereits registriert' });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Erstelle User
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name: name || null },
      select: USER_SELECT,
    });

    // Erstelle JWT Token
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.status(201).json({
      message: 'User erfolgreich registriert',
      user,
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Fehler bei der Registrierung' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validierung
    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Password sind erforderlich' });
    }

    // Finde User
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    // Prüfe Password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    // Erstelle JWT Token
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.json({
      message: 'Login erfolgreich',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Fehler beim Login' });
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
    res.json({ user });
  } catch (error) {
    console.error('UpdateProfile error:', error);
    res.status(500).json({ error: 'Profil konnte nicht aktualisiert werden' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Das neue Passwort muss mindestens 6 Zeichen lang sein' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } });

    res.json({ message: 'Passwort erfolgreich geändert' });
  } catch (error) {
    console.error('ChangePassword error:', error);
    res.status(500).json({ error: 'Passwort konnte nicht geändert werden' });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.userId } });
    res.json({ message: 'Konto erfolgreich gelöscht' });
  } catch (error) {
    console.error('DeleteAccount error:', error);
    res.status(500).json({ error: 'Konto konnte nicht gelöscht werden' });
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Kein Bild hochgeladen' });

    const existing = await prisma.user.findUnique({ where: { id: req.userId }, select: { avatarUrl: true } });
    if (existing?.avatarUrl) {
      const oldPath = `${__dirname}/../../uploads/${existing.avatarUrl.split('/uploads/')[1]}`;
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl },
      select: USER_SELECT,
    });
    res.json({ user });
  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    console.error('UploadAvatar error:', error);
    res.status(500).json({ error: 'Avatar konnte nicht hochgeladen werden' });
  }
};

export const deleteAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.userId }, select: { avatarUrl: true } });
    if (existing?.avatarUrl) {
      const oldPath = `${__dirname}/../../uploads/${existing.avatarUrl.split('/uploads/')[1]}`;
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl: null },
      select: USER_SELECT,
    });
    res.json({ user });
  } catch (error) {
    console.error('DeleteAvatar error:', error);
    res.status(500).json({ error: 'Avatar konnte nicht gelöscht werden' });
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

    res.json({ user });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der User-Daten' });
  }
};
