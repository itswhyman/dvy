import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
export declare function listTeams(_req: AuthRequest, res: Response): Promise<void>;
export declare function getTeam(req: AuthRequest, res: Response): Promise<void>;
export declare function createTeam(req: AuthRequest, res: Response): Promise<void>;
export declare function analytics(_req: AuthRequest, res: Response): Promise<void>;
