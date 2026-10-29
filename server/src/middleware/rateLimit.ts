import rateLimit from 'express-rate-limit';

/** General API rate limiter. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many requests' } },
});

/** Stricter limiter for auth endpoints to slow brute-force attempts. */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many attempts, try again shortly' } },
});
