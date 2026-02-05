import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().default('postgresql://ihms:ihms@localhost:5433/ihms'),

  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6380'),

  // JWT
  JWT_SECRET: z.string().min(32).default('your-super-secret-jwt-key-change-in-production'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32)
    .default('your-super-secret-refresh-key-change-in-production'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Server
  PORT: z.coerce.number().default(3011),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // CORS
  CORS_ORIGIN: z.string().refine(
    (val) => val !== '*' && !val.includes('*'),
    { message: 'CORS_ORIGIN cannot be a wildcard - specify exact origin(s)' }
  ).default('http://localhost:3010'),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().default('quotes@ihms.app'),
  EMAIL_FROM_NAME: z.string().default('IHMS Quotes'),

  // Workiz Integration
  WORKIZ_API_KEY: z.string().optional(),
  WORKIZ_API_URL: z.string().url().default('https://api.workiz.com/api/v1'),
  WORKIZ_ENABLED: z.coerce.boolean().default(false),

  // Quote Expiration
  QUOTE_EXPIRATION_DAYS: z.coerce.number().int().positive().default(14),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export const env = validateEnv();
