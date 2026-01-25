import CompanyTgBot from './server/CompanyTgBot.js';
import { env } from './server/env.js';

const isProduction = process.env.NODE_ENV === 'production';

const companyBot: CompanyTgBot = new CompanyTgBot(env.TELEGRAM_TOKEN);

companyBot
  .launch()
  .then(() => {
    console.log(`✅ Bot started (${isProduction ? 'production' : 'local'})`);
  })
  .catch((err: Error) => {
    console.error('❌ Bot failed to start', err);
    process.exit(1);
  });

const shutdown = async (signal: string): Promise<void> => {
  console.log(`🛑 Shutdown: ${signal}`);
  try {
    await companyBot.stop(signal);
  } finally {
    process.exit(0);
  }
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

process.on('unhandledRejection', (err: Error) => {
  console.error('UnhandledRejection', err);
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  console.error('UncaughtException', err);
  process.exit(1);
});