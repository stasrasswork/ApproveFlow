import { z } from 'zod';

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
    if (value.NODE_ENV === 'production' && !value.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be set when NODE_ENV=production',
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
