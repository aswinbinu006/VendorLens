import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url().default('postgresql://vrm_app:vrm_secure_password@localhost:5432/vrm'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default('super_secret_jwt_key_at_least_32_characters_long_12345'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  ADMIN_PASSWORD: z.string().min(8).default('AdminStrongPass!2026'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // E11: TRUST_PROXY defaults to false; or number of hops (e.g. 1) or boolean
  TRUST_PROXY: z
    .string()
    .optional()
    .default('false')
    .transform((val) => {
      const lower = val.trim().toLowerCase();
      if (lower === 'false' || lower === '0' || lower === '') return false;
      if (lower === 'true') return true;
      const num = parseInt(lower, 10);
      if (!isNaN(num) && num > 0) return num;
      return false;
    }),
  OPENFDA_API_KEY: z.string().optional().default(''),
  INGEST_CRON: z.string().default('0 */6 * * *'),
  NEWS_ENABLED: z
    .string()
    .optional()
    .default('true')
    .transform((val) => val === 'true'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  ALERT_EMAIL_TO: z.string().optional().default(''),
  MATCH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.60),
  ALERT_RECENCY_DAYS: z.coerce.number().int().min(1).default(30),
});

export type EnvConfig = z.infer<typeof envSchema>;

import fs from 'node:fs';
import path from 'node:path';

function readEnvFile(): Record<string, string> {
  const envMap: Record<string, string> = {};
  const paths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '../.env'),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (!envMap[key]) {
            envMap[key] = val;
          }
        }
      }
    }
  }
  return envMap;
}

export function loadEnv(override?: Record<string, string | undefined>): EnvConfig {
  const fileEnv = readEnvFile();
  const source = {
    ...fileEnv,
    ...process.env,
    ...override,
  };
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.format());
    throw new Error('Environment configuration validation failed');
  }
  return parsed.data;
}

export const env = loadEnv();
