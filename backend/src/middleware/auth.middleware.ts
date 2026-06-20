import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  // SSE (EventSource) can't send an Authorization header — accept ?token= for it.
  const token =
    (authHeader && authHeader.split(' ')[1]) ||
    (typeof req.query.token === 'string' ? req.query.token : undefined);

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    return next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
