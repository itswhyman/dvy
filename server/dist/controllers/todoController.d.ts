import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
export declare function listTodos(req: AuthRequest, res: Response): Promise<void>;
export declare function createTodo(req: AuthRequest, res: Response): Promise<void>;
export declare function updateTodo(req: AuthRequest, res: Response): Promise<void>;
export declare function deleteTodo(req: AuthRequest, res: Response): Promise<void>;
export declare function reorderTodos(req: AuthRequest, res: Response): Promise<void>;
export declare function rateWithAi(req: AuthRequest, res: Response): Promise<void>;
