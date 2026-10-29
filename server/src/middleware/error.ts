import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../lib/errors.js';

/** Central error handler. Returns a consistent envelope; never leaks secrets. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details ?? undefined },
    });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'Invalid input',
        details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
      },
    });
  }
  // Malformed JSON body (body-parser SyntaxError) — client's fault, not ours.
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    return res.status(400).json({
      error: { code: 'bad_request', message: 'Malformed JSON body' },
    });
  }
  // Unknown error — log generically, never expose internals.
  console.error('[error]', err instanceof Error ? err.message : err);
  return res.status(500).json({
    error: { code: 'internal_error', message: 'Something went wrong' },
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
}

/** Wrap async route handlers so rejections reach the error handler. */
export function asyncHandler<
  T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
