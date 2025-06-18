import dotenv from 'dotenv';
dotenv.config();


import { z } from 'zod';
// Define and validate environment variables schema
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
    REDIS_URL: z.string().optional().default('redis://localhost:6379'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    JWT_EXPIRES_IN: z.string().min(1, 'JWT_EXPIRES_IN is required'),
});

// Parse and validate process.env
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    console.error('❌ Invalid environment variables:', parsedEnv.error.format());
    process.exit(1);
}

// Export validated and typed config
export const env = parsedEnv.data;
