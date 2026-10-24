import type { NextFunction, Request, Response } from 'express';
import { logEvent } from '../services/loggerService.js';
import type { AuthRequest } from '../middleware/auth.js';

/**
 * Wraps async route handlers so rejections never crash the process.
 * Every error is written to the system log ring-buffer + console.
 */
export function asyncHandler<
  Req extends Request = AuthRequest,
  Res extends Response = Response
>(
  fn: (req: Req, res: Res, next: NextFunction) => Promise<unknown>,
  label = 'handler'
) {
  return (req: Req, res: Res, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      const userId =
        (req as AuthRequest).user?.userId ??
        (req as AuthRequest).user?.id ??
        null;

      logEvent({
        level: 'error',
        category: 'api',
        message: `[${label}] ${message}`,
        statusCode: 500,
        method: req.method,
        path: req.originalUrl || req.path,
        userId: typeof userId === 'number' ? userId : null,
        meta: {
          label,
          stack: err instanceof Error ? err.stack : undefined,
        },
      });

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    });
  };
}
