import { z } from 'zod';
import {
  isSmtpConfigured,
  isWeakJwtSecret,
  smtpRequiredForProduction,
} from './env-validation.js';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z
      .string()
      .default('postgresql://postgres:postgres@localhost:5432/postgres?schema=public'),
    JWT_SECRET: z.string().optional(),
    CORS_ORIGIN: z.string().optional(),
    REDIS_URL: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z.enum(['true', 'false']).default('false'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    APP_URL: z.string().default('http://localhost:5173'),
    EXPOSE_DEBUG_TOKENS: z.enum(['true', 'false']).default('false'),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') {
      return;
    }

    if (!value.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be set when NODE_ENV=production',
      });
    } else if (isWeakJwtSecret(value.JWT_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message:
          'JWT_SECRET must be at least 32 characters and not a placeholder value',
      });
    }

    if (!value.CORS_ORIGIN?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGIN'],
        message: 'CORS_ORIGIN must be set when NODE_ENV=production',
      });
    }

    if (!process.env.APP_URL?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['APP_URL'],
        message: 'APP_URL must be set when NODE_ENV=production',
      });
    }

    if (value.EXPOSE_DEBUG_TOKENS === 'true') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['EXPOSE_DEBUG_TOKENS'],
        message: 'EXPOSE_DEBUG_TOKENS must be false in production',
      });
    }

    try {
      new URL(value.APP_URL);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['APP_URL'],
        message: 'APP_URL must be a valid URL',
      });
      return;
    }

    if (
      smtpRequiredForProduction(value.APP_URL) &&
      !isSmtpConfigured(value)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SMTP_HOST'],
        message:
          'SMTP_HOST and SMTP_FROM are required in production when APP_URL is not localhost',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const ENV = {
  ...parsed.data,
  SMTP_SECURE: parsed.data.SMTP_SECURE === 'true',
  EXPOSE_DEBUG_TOKENS: parsed.data.EXPOSE_DEBUG_TOKENS === 'true',
};
