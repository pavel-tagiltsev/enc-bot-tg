import dotenv from 'dotenv';
import CompanyTgBot from './server/CompanyTgBot.js';

const isProduction = process.env.NODE_ENV === 'production';

dotenv.config({
  path: isProduction ? '.env.prod' : '.env.local',
});

const companyBot = new CompanyTgBot(process.env.TELEGRAM_TOKEN);

companyBot
  .launch()
  .then(() => {
    console.log(`✅ Bot started (${isProduction ? 'production' : 'local'})`);
  })
  .catch((err) => {
    console.error('❌ Bot failed to start', err);
    process.exit(1);
  });

const shutdown = async (signal) => {
  console.log(`🛑 Shutdown: ${signal}`);
  try {
    await companyBot.stop(signal);
  } finally {
    process.exit(0);
  }
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

process.on('unhandledRejection', (err) => {
  console.error('UnhandledRejection', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('UncaughtException', err);
  process.exit(1);
});
