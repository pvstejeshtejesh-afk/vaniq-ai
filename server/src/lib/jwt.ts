import jwt from 'jsonwebtoken';
import { env } from '../config.js';

export interface JwtPayload {
  sub: string; // user id
  businessId: string | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env().JWT_SECRET, {
    expiresIn: env().JWT_EXPIRES_MIN * 60,
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env().JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
