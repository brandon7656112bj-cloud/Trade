import { invokeLLM } from "./_core/llm";
import { web3Service } from "./web3service";

interface TradeSignal {
  token: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reason: string;
  amount: number;
}

interface BotConfig {
  coins: string[];
  dcaMultiplier: number;
  tradeStartLevel: number;
  startAllocation: number;
  dcaLevels: number[];
  trailingPmStart: number;
  trailingPmWithDca: number;
  trailingGap: number;
}

class AITrader {
  private config: BotConfig;
  private isRunning = false;
  private tradeHistory: TradeSignal[] = [];

  constructor(config: BotConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("[AITrader] Starting bot with config:", this.config);
    this.tradingLoop();
  }

  stop(): void {
    this.isRunning = false;
    console.log("[AITrader] Bot stopped");
  }

  private async tradingLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const prices = await web3Service.getMultiplePrices(this.config.coins);
        const opportunities = await web3Service.monitorTradingOpportunities();
        const signals = await this.analyzeMarket(prices, opportunities);

        for (const signal of signals) {
          if (signal.confidence > 0.7) {
            await this.executeTrade(signal);
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 60000));
      } catch (error) {
        console.error("[AITrader] Error in trading loop:", error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async analyzeMarket(
    prices: Record<string, number>,
    opportunities: Array<{ token: string; opportunity: string; confidence: number }>
  ): Promise<TradeSignal[]> {
    try {
      const priceList = Object.entries(prices)
        .map(([token, price]) => `${token}: $${price.toFixed(2)}`)
        .join("\n");

      const oppList = opportunities
        .map((o) => `${o.token}: ${o.opportunity} (${(o.confidence * 100).toFixed(0)}% confidence)`)
        .join("\n");

      const marketContext = `Current Prices:\n${priceList}\n\nOpportunities:\n${oppList}\n\nConfig: DCA ${this.config.dcaMultiplier}x, Start Level ${this.config.tradeStartLevel}`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a crypto trading AI. Provide 2-3 trade signals as JSON: [{token, action: BUY|SELL|HOLD, confidence: 0-1, reason, amount}]",
          },
          {
            role: "user",
            content: `Analyze and provide signals:\n${marketContext}`,
          },
        ],
      });

      const content = response.choices[0]?.message.content;
      if (!content) return [];

      const contentStr = typeof content === "string" ? content : "";
      try {
        const jsonMatch = contentStr.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Failed to parse signals:", e);
      }

      return [];
    } catch (error) {
      console.error("[AITrader] Error analyzing market:", error);
      return [];
    }
  }

  private async executeTrade(signal: TradeSignal): Promise<void> {
    try {
      console.log(`[AITrader] Executing ${signal.action} for ${signal.token}:`, signal);

      const result = await web3Service.simulateTrade(signal.token, "USDC", signal.amount);

      if (result.success) {
        this.tradeHistory.push(signal);
        console.log(`[AITrader] Trade executed. Tx: ${result.txHash}`);
      }
    } catch (error) {
      console.error("[AITrader] Error executing trade:", error);
    }
  }

  getTradeHistory(): TradeSignal[] {
    return this.tradeHistory;
  }

  getStatus(): { isRunning: boolean; tradesExecuted: number; config: BotConfig } {
    return {
      isRunning: this.isRunning,
      tradesExecuted: this.tradeHistory.length,
      config: this.config,
    };
  }
}

let botInstance: AITrader | null = null;

export function initializeBot(config: BotConfig): AITrader {
  botInstance = new AITrader(config);
  return botInstance;
}

export function getBot(): AITrader | null {
  return botInstance;
}

export async function startBot(config: BotConfig): Promise<void> {
  const bot = initializeBot(config);
  await bot.start();
}

export function stopBot(): void {
  if (botInstance) {
    botInstance.stop();
  }
}

export function getBotStatus() {
  if (!botInstance) {
    return { isRunning: false, tradesExecuted: 0, config: null };
  }
  return botInstance.getStatus();
}
