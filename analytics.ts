interface TradeMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  roi: number;
  trades: any[];
}

interface StrategyMetrics {
  strategy: string;
  totalTrades: number;
  winRate: number;
  avgProfit: number;
  roi: number;
  sharpeRatio: number;
}

class AnalyticsEngine {
  private tradeHistory: any[] = [];
  private dailySnapshots: any[] = [];
  private riskFreeRate = 0.02; // 2% annual risk-free rate

  /**
   * Record trade for analytics
   */
  recordTrade(trade: {
    strategy: string;
    tokenIn: string;
    tokenOut: string;
    amount: number;
    profit: number;
    timestamp: Date;
  }): void {
    this.tradeHistory.push(trade);
    console.log(`[Analytics] Trade recorded: ${trade.strategy} - Profit: $${trade.profit.toFixed(2)}`);
  }

  /**
   * Calculate comprehensive trade metrics
   */
  calculateTradeMetrics(): TradeMetrics {
    if (this.tradeHistory.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalProfit: 0,
        totalLoss: 0,
        netProfit: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        roi: 0,
        trades: [],
      };
    }

    const totalTrades = this.tradeHistory.length;
    const winningTrades = this.tradeHistory.filter((t) => t.profit > 0).length;
    const losingTrades = this.tradeHistory.filter((t) => t.profit < 0).length;
    const winRate = (winningTrades / totalTrades) * 100;

    const totalProfit = this.tradeHistory.filter((t) => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
    const totalLoss = Math.abs(
      this.tradeHistory.filter((t) => t.profit < 0).reduce((sum, t) => sum + t.profit, 0)
    );

    const netProfit = totalProfit - totalLoss;
    const averageWin = winningTrades > 0 ? totalProfit / winningTrades : 0;
    const averageLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let runningProfit = 0;

    for (const trade of this.tradeHistory) {
      runningProfit += trade.profit;
      if (runningProfit > peak) {
        peak = runningProfit;
      }
      const drawdown = peak - runningProfit;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate Sharpe Ratio
    const returns = this.tradeHistory.map((t) => t.profit);
    const avgReturn = returns.reduce((a: number, b: number) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((sum: number, r: number) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn - this.riskFreeRate / 252) / stdDev : 0; // 252 trading days

    // Calculate ROI
    const roi = totalTrades > 0 ? (netProfit / (totalTrades * 100)) * 100 : 0; // Assuming $100 per trade

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: parseFloat(winRate.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      totalLoss: parseFloat(totalLoss.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      averageWin: parseFloat(averageWin.toFixed(2)),
      averageLoss: parseFloat(averageLoss.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      roi: parseFloat(roi.toFixed(2)),
      trades: this.tradeHistory.slice(-100), // Return last 100 trades
    };
  }

  /**
   * Calculate metrics by strategy
   */
  calculateStrategyMetrics(): StrategyMetrics[] {
    const strategies = new Map<string, any[]>();

    for (const trade of this.tradeHistory) {
      if (!strategies.has(trade.strategy)) {
        strategies.set(trade.strategy, []);
      }
      strategies.get(trade.strategy)!.push(trade);
    }

    const metrics: StrategyMetrics[] = [];

    strategies.forEach((trades: any[], strategy: string) => {
      const totalTrades = trades.length;
      const winningTrades = trades.filter((t: any) => t.profit > 0).length;
      const winRate = (winningTrades / totalTrades) * 100;

      const totalProfit = trades.filter((t: any) => t.profit > 0).reduce((sum: number, t: any) => sum + t.profit, 0);
      const totalLoss = Math.abs(
        trades.filter((t: any) => t.profit < 0).reduce((sum: number, t: any) => sum + t.profit, 0)
      );

      const avgProfit = (totalProfit - totalLoss) / totalTrades;

      // Calculate Sharpe for strategy
      const returns = trades.map((t: any) => t.profit);
      const avgReturn = returns.reduce((a: number, b: number) => a + b, 0) / returns.length;
      const variance =
        returns.reduce((sum: number, r: number) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      const sharpeRatio = stdDev > 0 ? (avgReturn - this.riskFreeRate / 252) / stdDev : 0;

      const roi = ((totalProfit - totalLoss) / (totalTrades * 100)) * 100;

      metrics.push({
        strategy,
        totalTrades,
        winRate: parseFloat(winRate.toFixed(2)),
        avgProfit: parseFloat(avgProfit.toFixed(2)),
        roi: parseFloat(roi.toFixed(2)),
        sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      });
    });

    return metrics;
  }

  /**
   * Get daily performance
   */
  getDailyPerformance(days: number = 30): any[] {
    const dailyData: Map<string, number> = new Map();

    for (const trade of this.tradeHistory) {
      const date = new Date(trade.timestamp).toISOString().split("T")[0];
      const current = dailyData.get(date) || 0;
      dailyData.set(date, current + trade.profit);
    }

    const result = Array.from(dailyData.entries())
      .map(([date, profit]) => ({ date, profit: parseFloat(profit.toFixed(2)) }))
      .slice(-days);

    return result;
  }

  /**
   * Get monthly performance
   */
  getMonthlyPerformance(months: number = 12): any[] {
    const monthlyData: Map<string, number> = new Map();

    for (const trade of this.tradeHistory) {
      const date = new Date(trade.timestamp);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const current = monthlyData.get(month) || 0;
      monthlyData.set(month, current + trade.profit);
    }

    const result = Array.from(monthlyData.entries())
      .map(([month, profit]) => ({ month, profit: parseFloat(profit.toFixed(2)) }))
      .slice(-months);

    return result;
  }

  /**
   * Get cumulative profit
   */
  getCumulativeProfit(): any[] {
    let cumulative = 0;
    return this.tradeHistory.map((trade) => {
      cumulative += trade.profit;
      return {
        timestamp: trade.timestamp,
        cumulativeProfit: parseFloat(cumulative.toFixed(2)),
      };
    });
  }

  /**
   * Get drawdown chart data
   */
  getDrawdownData(): any[] {
    let peak = 0;
    let runningProfit = 0;

    return this.tradeHistory.map((trade) => {
      runningProfit += trade.profit;
      if (runningProfit > peak) {
        peak = runningProfit;
      }
      const drawdown = peak - runningProfit;

      return {
        timestamp: trade.timestamp,
        drawdown: parseFloat(drawdown.toFixed(2)),
      };
    });
  }

  /**
   * Get trade distribution
   */
  getTradeDistribution(): { profitRanges: any[] } {
    const ranges = [
      { min: -Infinity, max: -100, label: "Loss > $100", count: 0 },
      { min: -100, max: -50, label: "-$100 to -$50", count: 0 },
      { min: -50, max: 0, label: "-$50 to $0", count: 0 },
      { min: 0, max: 50, label: "$0 to $50", count: 0 },
      { min: 50, max: 100, label: "$50 to $100", count: 0 },
      { min: 100, max: Infinity, label: "Profit > $100", count: 0 },
    ];

    for (const trade of this.tradeHistory) {
      for (const range of ranges) {
        if (trade.profit >= range.min && trade.profit < range.max) {
          range.count++;
          break;
        }
      }
    }

    return { profitRanges: ranges };
  }
}

let analyticsInstance: AnalyticsEngine | null = null;

export function initializeAnalytics(): AnalyticsEngine {
  analyticsInstance = new AnalyticsEngine();
  return analyticsInstance;
}

export function getAnalytics(): AnalyticsEngine | null {
  return analyticsInstance;
}

export function recordTrade(trade: {
  strategy: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  profit: number;
  timestamp: Date;
}) {
  const analytics = analyticsInstance || initializeAnalytics();
  analytics.recordTrade(trade);
}

export function calculateTradeMetrics() {
  const analytics = analyticsInstance || initializeAnalytics();
  return analytics.calculateTradeMetrics();
}

export function calculateStrategyMetrics() {
  const analytics = analyticsInstance || initializeAnalytics();
  return analytics.calculateStrategyMetrics();
}

export function getDailyPerformance(days?: number) {
  const analytics = analyticsInstance || initializeAnalytics();
  return analytics.getDailyPerformance(days);
}

export function getMonthlyPerformance(months?: number) {
  const analytics = analyticsInstance || initializeAnalytics();
  return analytics.getMonthlyPerformance(months);
}

export function getCumulativeProfit() {
  const analytics = analyticsInstance || initializeAnalytics();
  return analytics.getCumulativeProfit();
}

export function getDrawdownData() {
  const analytics = analyticsInstance || initializeAnalytics();
  return analytics.getDrawdownData();
}

export function getTradeDistribution() {
  const analytics = analyticsInstance || initializeAnalytics();
  return analytics.getTradeDistribution();
}
