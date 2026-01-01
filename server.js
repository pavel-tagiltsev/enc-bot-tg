import dotenv from "dotenv";
import CompanyTgBot from './apps/back/CompanyTgBot/CompanyTgBot.js';

dotenv.config();

const botInstance = new CompanyTgBot(process.env.TELEGRAM_TOKEN);
await botInstance.launch();
