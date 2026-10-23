import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
export declare function listBoards(req: AuthRequest, res: Response): Promise<void>;
export declare function getBoard(req: AuthRequest, res: Response): Promise<void>;
export declare function createBoard(req: AuthRequest, res: Response): Promise<void>;
export declare function updateBoard(req: AuthRequest, res: Response): Promise<void>;
export declare function deleteBoard(req: AuthRequest, res: Response): Promise<void>;
