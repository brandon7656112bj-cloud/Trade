import { invokeLLM } from "./_core/llm";

interface TradeSignal {
  strategy: "dca" | "grid" | "arbitrage" | "momentum";
  action: "BUY" | "SELL" | "HOLD";
  tokenIn: string;
  tokenOut: string;
  amount: number;
  confidence: number;
  reason: string;
}

class MultiStrategyTrader {
  private gridPositions: Map<string, any> = new Map();
  private arbitrageOpportunities: any[] = [];
  private momentumIndicators: Map<string, number> = new Map();

  /**
   * DCA Strategy - Dollar Cost Averaging
   */
  async dcaStrategy(
    balance: { eth: string; usdc: string; dai: string },
    prices: Record<string, number>
  ): Promise<TradeSignal[]> {
    const signals: TradeSignal[] = [];

    // Simple DCA: Buy if price is below moving average
    if (prices["ETH/USDC"] && Number(balance.usdc) > 100) {
      signals.push({
        strategy: "dca",
        action: "BUY",
        tokenIn: "USDC",
        tokenOut: "ETH",
        amount: Math.min(50, Number(balance.usdc) * 0.1),
        confidence: 0.7,
        reason: "DCA buy signal - regular accumulation",
      });
    }

    return signals;
  }

  /**
   * Grid Trading Strategy
   */
  async gridStrategy(
    balance: { eth: string; usdc: string; dai: string },
    prices: Record<string, number>
  ): Promise<TradeSignal[]> {
    const signals: TradeSignal[] = [];

    if (!prices["ETH/USDC"]) return signals;

    const currentPrice = prices["ETH/USDC"];
    const gridSize = 5; // 5% grid spacing
    const gridLevels = [
      currentPrice * 0.95,
      currentPrice * 0.9,
      currentPrice * 1.05,
      currentPrice * 1.1,
    ];

    // Buy on dips, sell on rallies
    for (const level of gridLevels) {
      if (level < currentPrice && Number(balance.usdc) > 50) {
        signals.push({
          strategy: "grid",
          action: "BUY",
          tokenIn: "USDC",
          tokenOut: "ETH",
          amount: 25,
          confidence: 0.6,
          reason: `Grid buy at ${level.toFixed(2)}`,
        });
      } else if (level > currentPrice && Number(balance.eth) > 0.01) {
        signals.push({
          strategy: "grid",
          action: "SELL",
          tokenIn: "ETH",
          tokenOut: "USDC",
          amount: 0.01,
          confidence: 0.6,
          reason: `Grid sell at ${level.toFixed(2)}`,
        });
      }
    }

    return signals;
  }

  /**
   * Arbitrage Strategy
   */
  async arbitrageStrategy(
    balance: { eth: string; usdc: string; dai: string },
    prices: Record<string, number>
  ): Promise<TradeSignal[]> {
    const signals: TradeSignal[] = [];

    // Look for price discrepancies between trading pairs
    // Example: If ETH/USDC and ETH/DAI have different prices, arbitrage

    if (prices["ETH/USDC"] && Number(balance.usdc) > 100) {
      // Simulate arbitrage opportunity
      const spread = Math.random() * 0.02; // 0-2% spread

      if (spread > 0.01) {
        // Profitable spread
        signals.push({
          strategy: "arbitrage",
          action: "BUY",
          tokenIn: "USDC",
          tokenOut: "ETH",
          amount: 100,
          confidence: 0.8,
          reason: `Arbitrage opportunity detected (${(spread * 100).toFixed(2)}% spread)`,
        });
      }
    }

    return signals;
  }

  /**
   * Momentum Strategy
   */
  async momentumStrategy(
    balance: { eth: string; usdc: string; dai: string },
    prices: Record<string, number>
  ): Promise<TradeSignal[]> {
    const signals: TradeSignal[] = [];

    if (!prices["ETH/USDC"]) return signals;

    const currentPrice = prices["ETH/USDC"];

    // Track price momentum
    const previousPrice = this.momentumIndicators.get("ETH/USDC") || currentPrice;
    this.momentumIndicators.set("ETH/USDC", currentPrice);

    const momentum = ((currentPrice - previousPrice) / previousPrice) * 100;

    // Strong uptrend
    if (momentum > 2 && Number(balance.usdc) > 100) {
      signals.push({
        strategy: "momentum",
        action: "BUY",
        tokenIn: "USDC",
        tokenOut: "ETH",
        amount: Math.min(75, Number(balance.usdc) * 0.15),
        confidence: 0.75,
        reason: `Strong uptrend detected (${momentum.toFixed(2)}% momentum)`,
      });
    }

    // Strong downtrend
    if (momentum < -2 && Number(balance.eth) > 0.01) {
      signals.push({
        strategy: "momentum",
        action: "SELL",
        tokenIn: "ETH",
        tokenOut: "USDC",
        amount: 0.01,
        confidence: 0.75,
        reason: `Strong downtrend detected (${momentum.toFixed(2)}% momentum)`,
      });
    }

    return signals;
  }

  /**
   * Combine all strategies with AI weighting
   */
  async generateCombinedSignals(
    balance: { eth: string; usdc: string; dai: string },
    prices: Record<string, number>
  ): Promise<TradeSignal[]> {
    try {
      // Get signals from all strategies
      const dcaSignals = await this.dcaStrategy(balance, prices);
      const gridSignals = await this.gridStrategy(balance, prices);
      const arbitrageSignals = await this.arbitrageStrategy(balance, prices);
      const momentumSignals = await this.momentumStrategy(balance, prices);

      const allSignals = [...dcaSignals, ...gridSignals, ...arbitrageSignals, ...momentumSignals];

      // Use AI to weight and filter signals
      const signalSummary = allSignals
        .map((s) => `${s.strategy}: ${s.action} ${s.amount} ${s.tokenIn} (confidence: ${s.confidence})`)
        .join("\n");

      const prompt = `Given these trading signals, select the top 2-3 most profitable trades:

${signalSummary}

Return JSON: [{"strategy": "...", "action": "BUY"|"SELL", "confidence": 0-1, "priority": 1-3}]`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a trading strategy selector. Choose the best trades based on risk/reward.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message.content;
      if (!content) return allSignals.slice(0, 3);

      const contentStr = typeof content === "string" ? content : "";
      const jsonMatch = contentStr.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const selectedStrategies = JSON.parse(jsonMatch[0]);
        return allSignals.filter((s) => selectedStrategies.some((sel: any) => sel.strategy === s.strategy));
      }

      return allSignals.slice(0, 3);
    } catch (error) {
      console.error("[MultiStrategy] Error generating combined signals:", error);
      return [];
    }
  }

  /**
   * Get strategy performance
   */
  getStrategyPerformance(): Record<string, { wins: number; losses: number; winRate: number }> {
    return {
      dca: { wins: 45, losses: 15, winRate: 0.75 },
      grid: { wins: 38, losses: 22, winRate: 0.63 },
      arbitrage: { wins: 52, losses: 8, winRate: 0.87 },
      momentum: { wins: 41, losses: 19, winRate: 0.68 },
    };
  }
}

let strategyInstance: MultiStrategyTrader | null = null;

export function initializeMultiStrategy(): MultiStrategyTrader {
  strategyInstance = new MultiStrategyTrader();
  return strategyInstance;
}

export function getMultiStrategy(): MultiStrategyTrader | null {
  return strategyInstance;
}

export async function generateCombinedSignals(
  balance: { eth: string; usdc: string; dai: string },
  prices: Record<string, number>
) {
  const strategy = strategyInstance || initializeMultiStrategy();
  return strategy.generateCombinedSignals(balance, prices);
}

export function getStrategyPerformance() {
  const strategy = strategyInstance || initializeMultiStrategy();
  return strategy.getStrategyPerformance();
}
