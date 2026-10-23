import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload, UserRole } from '../types/index.js';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }
  try {
    const token = header.slice(7);
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions.' });
      return;
    }
    next();
  };
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
      req.user = jwt.verify(header.slice(7), secret) as JwtPayload;
    } catch {
      /* ignore */
    }
  }
  next();
}
