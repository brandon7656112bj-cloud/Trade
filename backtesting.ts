interface HistoricalPrice {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface BacktestTrade {
  timestamp: Date;
  strategy: string;
  action: "buy" | "sell";
  price: number;
  amount: number;
  profit?: number;
}

interface BacktestResult {
  strategy: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  maxDrawdown: number;
  sharpeRatio: number;
  roi: number;
  trades: BacktestTrade[];
}

class BacktestingEngine {
  private historicalData: Map<string, HistoricalPrice[]> = new Map();
  private results: Map<string, BacktestResult> = new Map();

  /**
   * Load historical price data
   */
  loadHistoricalData(symbol: string, prices: HistoricalPrice[]): void {
    this.historicalData.set(symbol, prices);
    console.log(`[Backtesting] Loaded ${prices.length} candles for ${symbol}`);
  }

  /**
   * Generate mock historical data for testing
   */
  generateMockData(symbol: string, days: number = 30): HistoricalPrice[] {
    const prices: HistoricalPrice[] = [];
    let currentPrice = 50; // Start at $50

    for (let i = 0; i < days * 24; i++) {
      // Hourly candles
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - (days * 24 - i));

      const change = (Math.random() - 0.5) * 2; // Random change -1 to +1
      const open = currentPrice;
      const close = currentPrice + change;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.random() * 1000000;

      prices.push({ timestamp, open, high, low, close, volume });
      currentPrice = close;
    }

    this.historicalData.set(symbol, prices);
    console.log(`[Backtesting] Generated ${prices.length} mock candles for ${symbol}`);
    return prices;
  }

  /**
   * Backtest DCA strategy
   */
  backtestDCA(symbol: string, initialCapital: number = 5, dcaMultiplier: number = 10): BacktestResult {
    const prices = this.historicalData.get(symbol);
    if (!prices) {
      throw new Error(`No historical data for ${symbol}`);
    }

    const trades: BacktestTrade[] = [];
    let balance = initialCapital;
    let position = 0;
    let entryPrice = 0;
    let buyCount = 0;

    for (let i = 1; i < prices.length; i++) {
      const currentPrice = prices[i].close;
      const previousPrice = prices[i - 1].close;

      // DCA buy signal: price drops
      if (previousPrice > currentPrice && balance > 0) {
        const buyAmount = (initialCapital / 10) * (1 + buyCount * (dcaMultiplier - 1) / 10);
        if (buyAmount <= balance) {
          const quantity = buyAmount / currentPrice;
          position += quantity;
          balance -= buyAmount;
          entryPrice = currentPrice;
          buyCount++;

          trades.push({
            timestamp: prices[i].timestamp,
            strategy: "DCA",
            action: "buy",
            price: currentPrice,
            amount: buyAmount,
          });
        }
      }

      // Sell signal: price rises 5% or more
      if (position > 0 && currentPrice >= entryPrice * 1.05) {
        const sellAmount = position * currentPrice;
        const profit = sellAmount - (initialCapital * buyCount);

        trades.push({
          timestamp: prices[i].timestamp,
          strategy: "DCA",
          action: "sell",
          price: currentPrice,
          amount: sellAmount,
          profit,
        });

        balance += sellAmount;
        position = 0;
        buyCount = 0;
      }
    }

    // Calculate metrics
    const winningTrades = trades.filter((t) => t.profit && t.profit > 0);
    const losingTrades = trades.filter((t) => t.profit && t.profit < 0);

    const totalProfit = winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0));

    const result: BacktestResult = {
      strategy: "DCA",
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? winningTrades.length / trades.length : 0,
      totalProfit,
      totalLoss,
      netProfit: totalProfit - totalLoss,
      maxDrawdown: this.calculateMaxDrawdown(trades),
      sharpeRatio: this.calculateSharpeRatio(trades),
      roi: ((totalProfit - totalLoss) / initialCapital) * 100,
      trades,
    };

    this.results.set("DCA", result);
    console.log(`[Backtesting] DCA backtest complete: ${result.netProfit.toFixed(6)} XRP profit`);

    return result;
  }

  /**
   * Backtest momentum strategy
   */
  backtestMomentum(symbol: string, initialCapital: number = 5, threshold: number = 0.02): BacktestResult {
    const prices = this.historicalData.get(symbol);
    if (!prices) {
      throw new Error(`No historical data for ${symbol}`);
    }

    const trades: BacktestTrade[] = [];
    let balance = initialCapital;
    let position = 0;
    let entryPrice = 0;

    for (let i = 20; i < prices.length; i++) {
      const currentPrice = prices[i].close;

      // Calculate momentum (20-period)
      let sumChange = 0;
      for (let j = i - 20; j < i; j++) {
        sumChange += (prices[j].close - prices[j].open) / prices[j].open;
      }
      const momentum = sumChange / 20;

      // Buy signal: positive momentum
      if (momentum > threshold && balance > 0 && position === 0) {
        const buyAmount = initialCapital * 0.5;
        const quantity = buyAmount / currentPrice;
        position = quantity;
        balance -= buyAmount;
        entryPrice = currentPrice;

        trades.push({
          timestamp: prices[i].timestamp,
          strategy: "Momentum",
          action: "buy",
          price: currentPrice,
          amount: buyAmount,
        });
      }

      // Sell signal: negative momentum or 3% profit
      if (position > 0 && (momentum < -threshold || currentPrice >= entryPrice * 1.03)) {
        const sellAmount = position * currentPrice;
        const profit = sellAmount - (initialCapital * 0.5);

        trades.push({
          timestamp: prices[i].timestamp,
          strategy: "Momentum",
          action: "sell",
          price: currentPrice,
          amount: sellAmount,
          profit,
        });

        balance += sellAmount;
        position = 0;
      }
    }

    // Calculate metrics
    const winningTrades = trades.filter((t) => t.profit && t.profit > 0);
    const losingTrades = trades.filter((t) => t.profit && t.profit < 0);

    const totalProfit = winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0));

    const result: BacktestResult = {
      strategy: "Momentum",
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? winningTrades.length / trades.length : 0,
      totalProfit,
      totalLoss,
      netProfit: totalProfit - totalLoss,
      maxDrawdown: this.calculateMaxDrawdown(trades),
      sharpeRatio: this.calculateSharpeRatio(trades),
      roi: ((totalProfit - totalLoss) / initialCapital) * 100,
      trades,
    };

    this.results.set("Momentum", result);
    console.log(`[Backtesting] Momentum backtest complete: ${result.netProfit.toFixed(6)} XRP profit`);

    return result;
  }

  /**
   * Calculate max drawdown
   */
  private calculateMaxDrawdown(trades: BacktestTrade[]): number {
    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;

    for (const trade of trades) {
      if (trade.profit) {
        cumulative += trade.profit;
        if (cumulative > peak) {
          peak = cumulative;
        }
        const drawdown = (peak - cumulative) / peak;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }

    return parseFloat((maxDrawdown * 100).toFixed(2));
  }

  /**
   * Calculate Sharpe Ratio
   */
  private calculateSharpeRatio(trades: BacktestTrade[]): number {
    const returns = trades.filter((t) => t.profit).map((t) => t.profit || 0);
    if (returns.length < 2) return 0;

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    const sharpeRatio = (avgReturn / stdDev) * Math.sqrt(252); // Annualized
    return parseFloat(sharpeRatio.toFixed(2));
  }

  /**
   * Get backtest results
   */
  getResults(strategy?: string): BacktestResult | BacktestResult[] {
    if (strategy) {
      return this.results.get(strategy) || ({} as BacktestResult);
    }
    return Array.from(this.results.values());
  }

  /**
   * Compare strategies
   */
  compareStrategies(): { best: string; results: BacktestResult[] } {
    const results = Array.from(this.results.values());
    const best = results.reduce((prev, current) => (prev.roi > current.roi ? prev : current));

    return {
      best: best.strategy,
      results,
    };
  }
}

let backtestingEngine: BacktestingEngine | null = null;

export function initializeBacktesting(): BacktestingEngine {
  backtestingEngine = new BacktestingEngine();
  console.log("[Backtesting] Engine initialized");
  return backtestingEngine;
}

export function getBacktestingEngine(): BacktestingEngine | null {
  return backtestingEngine;
}

export function runDCABacktest(symbol: string, initialCapital?: number, dcaMultiplier?: number) {
  const engine = backtestingEngine;
  if (!engine) return null;

  // Generate mock data if not loaded
  if (!engine["historicalData"].has(symbol)) {
    engine.generateMockData(symbol, 30);
  }

  return engine.backtestDCA(symbol, initialCapital, dcaMultiplier);
}

export function runMomentumBacktest(symbol: string, initialCapital?: number, threshold?: number) {
  const engine = backtestingEngine;
  if (!engine) return null;

  // Generate mock data if not loaded
  if (!engine["historicalData"].has(symbol)) {
    engine.generateMockData(symbol, 30);
  }

  return engine.backtestMomentum(symbol, initialCapital, threshold);
}

export function compareBacktestStrategies() {
  const engine = backtestingEngine;
  if (!engine) return null;
  return engine.compareStrategies();
}
