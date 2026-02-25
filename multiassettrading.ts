interface AssetConfig {
  symbol: string;
  enabled: boolean;
  maxPositionSize: number; // % of balance
  maxDailyLoss: number; // % of balance
  minTradeSize: number; // Minimum trade amount
  maxTradeSize: number; // Maximum trade amount
}

interface AssetTrade {
  id: string;
  symbol: string;
  action: "buy" | "sell";
  price: number;
  amount: number;
  profit?: number;
  timestamp: Date;
  status: "pending" | "completed" | "failed";
}

interface AssetBalance {
  symbol: string;
  balance: number;
  allocated: number;
  available: number;
  unrealizedProfit: number;
}

class MultiAssetTrader {
  private assets: Map<string, AssetConfig> = new Map();
  private trades: Map<string, AssetTrade[]> = new Map();
  private balances: Map<string, AssetBalance> = new Map();
  private totalBalance = 5; // $5 initial

  constructor() {
    // Initialize default assets
    this.addAsset("XRP/USD", 0.05, 0.1, 0.01, 2.0);
    this.addAsset("XRP/EUR", 0.05, 0.1, 0.01, 2.0);
    this.addAsset("XRP/GBP", 0.05, 0.1, 0.01, 2.0);

    console.log("[MultiAssetTrader] Initialized with 3 default assets");
  }

  /**
   * Add a new trading asset
   */
  addAsset(symbol: string, maxPositionSize: number, maxDailyLoss: number, minTradeSize: number, maxTradeSize: number): void {
    const config: AssetConfig = {
      symbol,
      enabled: true,
      maxPositionSize,
      maxDailyLoss,
      minTradeSize,
      maxTradeSize,
    };

    this.assets.set(symbol, config);
    this.trades.set(symbol, []);
    this.balances.set(symbol, {
      symbol,
      balance: this.totalBalance / this.assets.size,
      allocated: 0,
      available: this.totalBalance / this.assets.size,
      unrealizedProfit: 0,
    });

    console.log(`[MultiAssetTrader] Added asset: ${symbol}`);
  }

  /**
   * Execute trade on specific asset
   */
  executeTrade(symbol: string, action: "buy" | "sell", price: number, amount: number): AssetTrade | null {
    const config = this.assets.get(symbol);
    if (!config || !config.enabled) {
      console.error(`[MultiAssetTrader] Asset ${symbol} not found or disabled`);
      return null;
    }

    const balance = this.balances.get(symbol);
    if (!balance) return null;

    // Validate trade size
    if (amount < config.minTradeSize || amount > config.maxTradeSize) {
      console.error(`[MultiAssetTrader] Trade size ${amount} outside limits [${config.minTradeSize}, ${config.maxTradeSize}]`);
      return null;
    }

    // Check available balance
    if (action === "buy" && amount > balance.available) {
      console.error(`[MultiAssetTrader] Insufficient balance for ${symbol}`);
      return null;
    }

    const trade: AssetTrade = {
      id: `trade_${symbol}_${Date.now()}`,
      symbol,
      action,
      price,
      amount,
      timestamp: new Date(),
      status: "completed",
      profit: action === "sell" ? (Math.random() * 0.1 - 0.02) * amount : undefined,
    };

    // Update balance
    if (action === "buy") {
      balance.allocated += amount;
      balance.available -= amount;
    } else {
      balance.allocated -= amount;
      balance.available += amount;
      if (trade.profit) {
        balance.balance += trade.profit;
      }
    }

    // Record trade
    const assetTrades = this.trades.get(symbol) || [];
    assetTrades.push(trade);
    this.trades.set(symbol, assetTrades);

    console.log(`[MultiAssetTrader] Trade executed on ${symbol}: ${action} ${amount} @ ${price.toFixed(6)}`);

    return trade;
  }

  /**
   * Get asset balance
   */
  getAssetBalance(symbol: string): AssetBalance | null {
    return this.balances.get(symbol) || null;
  }

  /**
   * Get all asset balances
   */
  getAllBalances(): AssetBalance[] {
    return Array.from(this.balances.values());
  }

  /**
   * Get total portfolio balance
   */
  getTotalBalance(): number {
    return Array.from(this.balances.values()).reduce((sum, b) => sum + b.balance, 0);
  }

  /**
   * Get asset trades
   */
  getAssetTrades(symbol: string, limit: number = 100): AssetTrade[] {
    const trades = this.trades.get(symbol) || [];
    return trades.slice(-limit);
  }

  /**
   * Get all trades across assets
   */
  getAllTrades(limit: number = 100): AssetTrade[] {
    const allTrades: AssetTrade[] = [];
    this.trades.forEach((trades) => {
      allTrades.push(...trades);
    });
    return allTrades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  /**
   * Get asset performance
   */
  getAssetPerformance(symbol: string): {
    totalTrades: number;
    winRate: number;
    totalProfit: number;
    averageProfit: number;
  } | null {
    const trades = this.trades.get(symbol);
    if (!trades || trades.length === 0) return null;

    const profitableTrades = trades.filter((t) => t.profit && t.profit > 0);
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);

    return {
      totalTrades: trades.length,
      winRate: profitableTrades.length / trades.length,
      totalProfit,
      averageProfit: totalProfit / trades.length,
    };
  }

  /**
   * Get portfolio performance
   */
  getPortfolioPerformance(): {
    assets: number;
    totalTrades: number;
    totalProfit: number;
    totalBalance: number;
    roi: number;
  } {
    let totalTrades = 0;
    let totalProfit = 0;

    this.trades.forEach((trades: AssetTrade[]) => {
      totalTrades += trades.length;
      totalProfit += trades.reduce((sum: number, t: AssetTrade) => sum + (t.profit || 0), 0);
    });

    const totalBalance = this.getTotalBalance();
    const roi = ((totalProfit / this.totalBalance) * 100).toFixed(2);

    return {
      assets: this.assets.size,
      totalTrades,
      totalProfit: parseFloat(totalProfit.toFixed(6)),
      totalBalance: parseFloat(totalBalance.toFixed(6)),
      roi: parseFloat(roi),
    };
  }

  /**
   * Enable/disable asset
   */
  setAssetEnabled(symbol: string, enabled: boolean): void {
    const config = this.assets.get(symbol);
    if (config) {
      config.enabled = enabled;
      console.log(`[MultiAssetTrader] Asset ${symbol} ${enabled ? "enabled" : "disabled"}`);
    }
  }

  /**
   * Update asset configuration
   */
  updateAssetConfig(symbol: string, config: Partial<AssetConfig>): void {
    const existing = this.assets.get(symbol);
    if (existing) {
      Object.assign(existing, config);
      console.log(`[MultiAssetTrader] Updated config for ${symbol}`);
    }
  }

  /**
   * Get asset list
   */
  getAssets(): AssetConfig[] {
    return Array.from(this.assets.values());
  }
}

let multiAssetTrader: MultiAssetTrader | null = null;

export function initializeMultiAssetTrader(): MultiAssetTrader {
  multiAssetTrader = new MultiAssetTrader();
  return multiAssetTrader;
}

export function getMultiAssetTrader(): MultiAssetTrader | null {
  return multiAssetTrader;
}

export function executeAssetTrade(symbol: string, action: "buy" | "sell", price: number, amount: number) {
  const trader = multiAssetTrader;
  if (!trader) return null;
  return trader.executeTrade(symbol, action, price, amount);
}

export function getAssetBalance(symbol: string) {
  const trader = multiAssetTrader;
  if (!trader) return null;
  return trader.getAssetBalance(symbol);
}

export function getPortfolioBalance() {
  const trader = multiAssetTrader;
  if (!trader) return [];
  return trader.getAllBalances();
}

export function getPortfolioPerformance() {
  const trader = multiAssetTrader;
  if (!trader) return null;
  return trader.getPortfolioPerformance();
}

export function getAssetTrades(symbol: string, limit?: number) {
  const trader = multiAssetTrader;
  if (!trader) return [];
  return trader.getAssetTrades(symbol, limit);
}
