import dotenv from 'dotenv';
dotenv.config();


import { z } from 'zod';
// Define and validate environment variables schema
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),

    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),

    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    JWT_EXPIRES_IN: z.string().min(1, 'JWT_EXPIRES_IN is required'),

    // Stripe
    PUB: z.string().min(1, 'PUB (publishable key) is required'),
    STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
    STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
    STRIPE_SUCCESS_URL: z.string().url('Must be a valid URL'),
    STRIPE_CANCEL_URL: z.string().url('Must be a valid URL'),

    // CORS origins
    LOCAL_SITE_ORIGIN: z.string().url().default('http://localhost:5173'),
    DEV_SITE_ORIGIN: z.string().url().default('http://localhost:5173'),
    LOCAL_ADMIN_ORIGIN: z.string().url().default('http://localhost:5174'),
    DEV_ADMIN_ORIGIN: z.string().url().default('https://maynies-admin.onrender.com'),
});



// Parse and validate process.env
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    console.error('❌ Invalid environment variables:', parsedEnv.error.format());
    process.exit(1);
}

// Export validated and typed config
export const env = parsedEnv.data;
