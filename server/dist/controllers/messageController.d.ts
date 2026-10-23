import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
export declare function listDm(req: AuthRequest, res: Response): Promise<void>;
export declare function listContacts(req: AuthRequest, res: Response): Promise<void>;
export declare function presence(_req: AuthRequest, res: Response): Promise<void>;
