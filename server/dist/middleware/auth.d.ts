import { Request, Response, NextFunction } from 'express';
import type { JwtPayload, UserRole } from '../types/index.js';
export interface AuthRequest extends Request {
    user?: JwtPayload;
}
export declare function signToken(payload: JwtPayload): string;
export declare function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: UserRole[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void;
