interface PerformanceMetrics {
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
  sharpeRatio: number;
  maxDrawdown: number;
  roi: number;
  cumulativeReturn: number;
}

interface DailyPerformance {
  date: Date;
  trades: number;
  profit: number;
  loss: number;
  netProfit: number;
  winRate: number;
}

interface StrategyPerformance {
  strategy: string;
  trades: number;
  winRate: number;
  totalProfit: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

class PerformanceAnalytics {
  private trades: any[] = [];
  private dailyPerformance: Map<string, DailyPerformance> = new Map();
  private strategyPerformance: Map<string, StrategyPerformance> = new Map();
  private riskFreeRate = 0.02; // 2% annual risk-free rate

  /**
   * Add trade to analytics
   */
  addTrade(strategy: string, profit: number, timestamp: Date = new Date()): void {
    const trade = {
      strategy,
      profit,
      timestamp,
      isWin: profit > 0,
    };

    this.trades.push(trade);

    // Update daily performance
    const dateKey = timestamp.toISOString().split("T")[0];
    const daily = this.dailyPerformance.get(dateKey) || {
      date: timestamp,
      trades: 0,
      profit: 0,
      loss: 0,
      netProfit: 0,
      winRate: 0,
    };

    daily.trades += 1;
    if (profit > 0) {
      daily.profit += profit;
    } else {
      daily.loss += Math.abs(profit);
    }
    daily.netProfit = daily.profit - daily.loss;
    daily.winRate = daily.trades > 0 ? (daily.trades - daily.loss) / daily.trades : 0;

    this.dailyPerformance.set(dateKey, daily);

    // Update strategy performance
    const strategyKey = strategy;
    const strat = this.strategyPerformance.get(strategyKey) || {
      strategy,
      trades: 0,
      winRate: 0,
      totalProfit: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
    };

    strat.trades += 1;
    strat.totalProfit += profit;
    strat.winRate = this.calculateWinRate(strategy);
    strat.sharpeRatio = this.calculateSharpeRatio(strategy);
    strat.maxDrawdown = this.calculateMaxDrawdown(strategy);

    this.strategyPerformance.set(strategyKey, strat);

    console.log(`[PerformanceAnalytics] Trade recorded: ${strategy} +${profit.toFixed(6)}`);
  }

  /**
   * Calculate overall performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const winningTrades = this.trades.filter((t) => t.profit > 0);
    const losingTrades = this.trades.filter((t) => t.profit < 0);

    const totalProfit = winningTrades.reduce((sum, t) => sum + t.profit, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0));

    const averageWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;

    const profitFactor = averageLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

    const netProfit = totalProfit - totalLoss;
    const winRate = this.trades.length > 0 ? winningTrades.length / this.trades.length : 0;

    return {
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalProfit: parseFloat(totalProfit.toFixed(6)),
      totalLoss: parseFloat(totalLoss.toFixed(6)),
      netProfit: parseFloat(netProfit.toFixed(6)),
      averageWin: parseFloat(averageWin.toFixed(6)),
      averageLoss: parseFloat(averageLoss.toFixed(6)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      sharpeRatio: this.calculateGlobalSharpeRatio(),
      maxDrawdown: this.calculateGlobalMaxDrawdown(),
      roi: this.calculateROI(),
      cumulativeReturn: netProfit,
    };
  }

  /**
   * Calculate Sharpe Ratio
   */
  private calculateGlobalSharpeRatio(): number {
    if (this.trades.length < 2) return 0;

    const returns = this.trades.map((t) => t.profit);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    const sharpeRatio = ((avgReturn - this.riskFreeRate / 365) / stdDev) * Math.sqrt(365);
    return parseFloat(sharpeRatio.toFixed(2));
  }

  /**
   * Calculate Sharpe Ratio for strategy
   */
  private calculateSharpeRatio(strategy: string): number {
    const strategyTrades = this.trades.filter((t) => t.strategy === strategy);
    if (strategyTrades.length < 2) return 0;

    const returns = strategyTrades.map((t) => t.profit);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    const sharpeRatio = ((avgReturn - this.riskFreeRate / 365) / stdDev) * Math.sqrt(365);
    return parseFloat(sharpeRatio.toFixed(2));
  }

  /**
   * Calculate Win Rate for strategy
   */
  private calculateWinRate(strategy: string): number {
    const strategyTrades = this.trades.filter((t) => t.strategy === strategy);
    if (strategyTrades.length === 0) return 0;

    const wins = strategyTrades.filter((t) => t.profit > 0).length;
    return wins / strategyTrades.length;
  }

  /**
   * Calculate Max Drawdown globally
   */
  private calculateGlobalMaxDrawdown(): number {
    if (this.trades.length === 0) return 0;

    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;

    for (const trade of this.trades) {
      cumulative += trade.profit;
      if (cumulative > peak) {
        peak = cumulative;
      }
      const drawdown = (peak - cumulative) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return parseFloat((maxDrawdown * 100).toFixed(2));
  }

  /**
   * Calculate Max Drawdown for strategy
   */
  private calculateMaxDrawdown(strategy: string): number {
    const strategyTrades = this.trades.filter((t) => t.strategy === strategy);
    if (strategyTrades.length === 0) return 0;

    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;

    for (const trade of strategyTrades) {
      cumulative += trade.profit;
      if (cumulative > peak) {
        peak = cumulative;
      }
      const drawdown = (peak - cumulative) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return parseFloat((maxDrawdown * 100).toFixed(2));
  }

  /**
   * Calculate ROI
   */
  private calculateROI(): number {
    const totalProfit = this.trades.reduce((sum, t) => sum + t.profit, 0);
    const initialCapital = 5; // $5 initial investment
    const roi = (totalProfit / initialCapital) * 100;
    return parseFloat(roi.toFixed(2));
  }

  /**
   * Get daily performance
   */
  getDailyPerformance(limit: number = 30): DailyPerformance[] {
    const dates = Array.from(this.dailyPerformance.keys()).sort().slice(-limit);
    return dates.map((date) => this.dailyPerformance.get(date)!);
  }

  /**
   * Get strategy performance
   */
  getStrategyPerformance(): StrategyPerformance[] {
    return Array.from(this.strategyPerformance.values());
  }

  /**
   * Get trade history
   */
  getTradeHistory(limit: number = 100): any[] {
    return this.trades.slice(-limit);
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify(
      {
        metrics: this.getMetrics(),
        dailyPerformance: this.getDailyPerformance(),
        strategyPerformance: this.getStrategyPerformance(),
        exportDate: new Date(),
      },
      null,
      2
    );
  }
}

let analyticsInstance: PerformanceAnalytics | null = null;

export function initializePerformanceAnalytics(): PerformanceAnalytics {
  analyticsInstance = new PerformanceAnalytics();
  console.log("[PerformanceAnalytics] Initialized");
  return analyticsInstance;
}

export function getPerformanceAnalytics(): PerformanceAnalytics | null {
  return analyticsInstance;
}

export function recordTrade(strategy: string, profit: number, timestamp?: Date) {
  const analytics = analyticsInstance;
  if (!analytics) return;
  analytics.addTrade(strategy, profit, timestamp);
}

export function getPerformanceMetrics() {
  const analytics = analyticsInstance;
  if (!analytics)
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
      sharpeRatio: 0,
      maxDrawdown: 0,
      roi: 0,
      cumulativeReturn: 0,
    };
  return analytics.getMetrics();
}

export function getDailyPerformanceData(limit?: number) {
  const analytics = analyticsInstance;
  if (!analytics) return [];
  return analytics.getDailyPerformance(limit);
}

export function getStrategyPerformanceData() {
  const analytics = analyticsInstance;
  if (!analytics) return [];
  return analytics.getStrategyPerformance();
}
