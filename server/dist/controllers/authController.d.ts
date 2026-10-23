import { Response } from 'express';
import { type AuthRequest } from '../middleware/auth.js';
export declare const registerValidators: import("express-validator").ValidationChain[];
export declare const loginValidators: import("express-validator").ValidationChain[];
export declare function register(req: AuthRequest, res: Response): Promise<void>;
export declare function login(req: AuthRequest, res: Response): Promise<void>;
export declare function me(req: AuthRequest, res: Response): Promise<void>;
export declare function updateProfile(req: AuthRequest, res: Response): Promise<void>;
export declare function changePassword(req: AuthRequest, res: Response): Promise<void>;
