import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
export declare function listPosts(req: AuthRequest, res: Response): Promise<void>;
export declare function createPost(req: AuthRequest, res: Response): Promise<void>;
export declare function toggleLike(req: AuthRequest, res: Response): Promise<void>;
export declare function addComment(req: AuthRequest, res: Response): Promise<void>;
export declare function listComments(req: AuthRequest, res: Response): Promise<void>;
