import "dotenv/config";
import { startTradingBot } from "./tradingbot";

async function main() {
  console.log("Starting PowerTrader AI Trading Bot...");
  try {
    await startTradingBot();
    console.log("Bot is now running. Press Ctrl+C to stop.");
  } catch (error) {
    console.error("Failed to start trading bot:", error);
  }
}

main();
