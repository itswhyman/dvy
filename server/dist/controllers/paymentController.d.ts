import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
export declare function getSubscription(req: AuthRequest, res: Response): Promise<void>;
export declare function createCheckout(req: AuthRequest, res: Response): Promise<void>;
export declare function webhook(req: AuthRequest, res: Response): Promise<void>;
