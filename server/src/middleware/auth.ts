import type { NextFunction, Request, Response } from 'express';
import { env } from '../config.js';
import { ApiError, unauthorized } from '../lib/errors.js';
import { verifyToken } from '../lib/jwt.js';
import type { Store } from '../store/store.js';

export interface AuthedRequest extends Request {
  userId?: string;
  businessId?: string;
  store?: Store;
}

/** Reads the session cookie, verifies JWT, and attaches user + business scope. */
export function requireAuth(store: Store) {
  return async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    const token = req.cookies?.vaniq_token;
    if (!token) return next(unauthorized());
    const payload = verifyToken(token);
    if (!payload) return next(unauthorized('Invalid or expired session'));
    const user = await store.getUserById(payload.sub);
    if (!user) return next(unauthorized('User no longer exists'));
    req.userId = user.id;
    req.businessId = user.businessId ?? undefined;
    req.store = store;
    next();
  };
}

/** Guard for routes that require an onboarded business. */
export function requireBusiness(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (!req.businessId) {
    return next(new ApiError(403, 'no_business', 'Complete business onboarding first'));
  }
  next();
}
