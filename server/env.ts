import dotenv from 'dotenv';
import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';
const envPath = isProduction ? '.env.prod' : '.env.local';

dotenv.config({ path: envPath });

const envSchema = z.object({
  TELEGRAM_TOKEN: z.string().min(1),
  MOY_KLASS_API_KEY: z.string().min(1),
  DEVELOPER_CHAT_ID: z.string().min(1),
  ADMIN_CHAT_ID: z.string().min(1),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    `❌ Invalid environment variables in ${envPath}:`,
    parsedEnv.error.flatten().fieldErrors,
  );
  throw new Error('Invalid environment variables.');
}

export const env = parsedEnv.data;
