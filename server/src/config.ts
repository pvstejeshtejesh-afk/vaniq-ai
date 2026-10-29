import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  STORAGE: z.enum(['memory', 'mongo']).default('memory'),
  MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().min(16).default('dev-only-insecure-jwt-secret-change-me'),
  JWT_EXPIRES_MIN: z.coerce.number().default(60 * 24 * 7),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // Providers (all optional — mocked when absent)
  LLM_PROVIDER: z.string().default('mock'),
  LLM_API_KEY: z.string().optional(),
  TELEPHONY_PROVIDER: z.string().default('mock'),
  TELEPHONY_API_KEY: z.string().optional(),
  STT_PROVIDER: z.string().default('mock'),
  TTS_PROVIDER: z.string().default('mock'),
  // Safety switches
  OUTBOUND_CALLING_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  // Payments
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  // Business defaults (paise)
  DEFAULT_STANDARD_RATE_PAISE: z.coerce.number().default(350), // ₹3.50/min
  DEFAULT_PREMIUM_RATE_PAISE: z.coerce.number().default(550), // ₹5.50/min
  DEFAULT_MIN_BALANCE_PAISE: z.coerce.number().default(50000), // ₹500
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;
export function env(): Env {
  if (!cached) cached = EnvSchema.parse(process.env);
  return cached;
}
// For tests that mutate process.env before import
export function resetEnvCache() {
  cached = null;
}
