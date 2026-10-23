import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
export declare function listNotes(req: AuthRequest, res: Response): Promise<void>;
export declare function createNote(req: AuthRequest, res: Response): Promise<void>;
export declare function updateNote(req: AuthRequest, res: Response): Promise<void>;
export declare function deleteNote(req: AuthRequest, res: Response): Promise<void>;
export declare function summarize(req: AuthRequest, res: Response): Promise<void>;
