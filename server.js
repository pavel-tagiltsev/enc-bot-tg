import dotenv from "dotenv";
import CompanyTgBot from './apps/back/CompanyTgBot/CompanyTgBot.js';

dotenv.config();

const botInstance = new CompanyTgBot(process.env.TELEGRAM_TOKEN);
await botInstance.launch();

const shutdown = async (signal) => {
  console.log(`Shutdown: ${signal}`);
  await botInstance.stop(signal);
  process.exit(0);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);
