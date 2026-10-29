import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

/** Validate and replace req.body with the parsed (stripped) value. */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body ?? {});
    next();
  };
}
