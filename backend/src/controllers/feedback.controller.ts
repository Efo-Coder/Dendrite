import { Response } from 'express';
import nodemailer from 'nodemailer';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

export const submitRating = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { rating, comment } = req.body;

  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    const feedback = await prisma.feedback.upsert({
      where: { userId },
      update: { rating, comment: comment?.trim() || null },
      create: { userId, rating, comment: comment?.trim() || null },
    });
    return res.json(feedback);
  } catch (err) {
    console.error('submitRating error:', err);
    return res.status(500).json({ error: 'Failed to submit rating' });
  }
};

export const submitBugReport = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { title, description } = req.body;

  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  try {
    const report = await prisma.bugReport.create({
      data: { userId, title: title.trim(), description: description.trim() },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'Dendrite <noreply@dendrite-notes.com>',
        to: 'support@dendrite-notes.com',
        subject: `[Bug Report] ${title.trim()}`,
        text: [
          `Von: ${user?.name || 'Unbekannt'} <${user?.email}>`,
          `Report ID: ${report.id}`,
          '',
          title.trim(),
          '',
          description.trim(),
        ].join('\n'),
      });
    } catch {
      // Email-Fehler ist nicht fatal – Report ist bereits gespeichert
    }

    return res.json(report);
  } catch (err) {
    console.error('submitBugReport error:', err);
    return res.status(500).json({ error: 'Failed to submit bug report' });
  }
};
