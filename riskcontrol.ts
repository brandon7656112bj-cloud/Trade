interface RiskConfig {
  maxPositionSize: number; // Max % of balance per trade
  maxDailyLoss: number; // Max % loss per day
  maxDrawdown: number; // Max % drawdown from peak
  stopLossPercent: number; // Stop loss % per trade
  takeProfitPercent: number; // Take profit % per trade
  maxOpenPositions: number; // Max simultaneous trades
  riskRewardRatio: number; // Min risk:reward ratio
}

interface Position {
  id: string;
  tokenIn: string;
  tokenOut: string;
  entryPrice: number;
  amount: number;
  stopLoss: number;
  takeProfit: number;
  openTime: Date;
  status: "open" | "closed" | "stopped";
  profit?: number;
}

class RiskManager {
  private config: RiskConfig;
  private positions: Position[] = [];
  private dailyLoss = 0;
  private peakBalance = 0;
  private currentBalance = 0;

  constructor(config: Partial<RiskConfig> = {}) {
    this.config = {
      maxPositionSize: config.maxPositionSize || 0.05, // 5% per trade
      maxDailyLoss: config.maxDailyLoss || 0.1, // 10% per day
      maxDrawdown: config.maxDrawdown || 0.15, // 15% max drawdown
      stopLossPercent: config.stopLossPercent || 0.02, // 2% stop loss
      takeProfitPercent: config.takeProfitPercent || 0.05, // 5% take profit
      maxOpenPositions: config.maxOpenPositions || 5,
      riskRewardRatio: config.riskRewardRatio || 1.5,
    };

    console.log("[RiskManager] Initialized with config:", this.config);
  }

  /**
   * Check if trade is allowed based on risk parameters
   */
  canOpenPosition(balance: number, tradeAmount: number, tokenIn: string, tokenOut: string): { allowed: boolean; reason?: string } {
    // Check max position size
    const maxSize = balance * this.config.maxPositionSize;
    if (tradeAmount > maxSize) {
      return { allowed: false, reason: `Trade size ${tradeAmount} exceeds max position ${maxSize.toFixed(6)}` };
    }

    // Check max open positions
    const openCount = this.positions.filter((p) => p.status === "open").length;
    if (openCount >= this.config.maxOpenPositions) {
      return { allowed: false, reason: `Max open positions (${this.config.maxOpenPositions}) reached` };
    }

    // Check daily loss limit
    if (this.dailyLoss > balance * this.config.maxDailyLoss) {
      return { allowed: false, reason: `Daily loss limit exceeded` };
    }

    // Check drawdown
    const drawdown = (this.peakBalance - balance) / this.peakBalance;
    if (drawdown > this.config.maxDrawdown) {
      return { allowed: false, reason: `Drawdown ${(drawdown * 100).toFixed(2)}% exceeds max ${(this.config.maxDrawdown * 100).toFixed(2)}%` };
    }

    return { allowed: true };
  }

  /**
   * Open a new position with risk controls
   */
  openPosition(
    tokenIn: string,
    tokenOut: string,
    entryPrice: number,
    amount: number
  ): { position: Position | null; reason?: string } {
    const position: Position = {
      id: `pos_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      tokenIn,
      tokenOut,
      entryPrice,
      amount,
      stopLoss: entryPrice * (1 - this.config.stopLossPercent),
      takeProfit: entryPrice * (1 + this.config.takeProfitPercent),
      openTime: new Date(),
      status: "open",
    };

    this.positions.push(position);

    console.log(`[RiskManager] Position opened`);
    console.log(`  Token: ${tokenIn} -> ${tokenOut}`);
    console.log(`  Entry: ${entryPrice.toFixed(6)}`);
    console.log(`  Stop Loss: ${position.stopLoss.toFixed(6)}`);
    console.log(`  Take Profit: ${position.takeProfit.toFixed(6)}`);

    return { position };
  }

  /**
   * Close a position
   */
  closePosition(positionId: string, exitPrice: number): { profit: number; reason?: string } | null {
    const position = this.positions.find((p) => p.id === positionId);
    if (!position) return null;

    const profit = (exitPrice - position.entryPrice) * position.amount;
    position.profit = profit;
    position.status = "closed";

    if (profit < 0) {
      this.dailyLoss += Math.abs(profit);
    }

    console.log(`[RiskManager] Position closed`);
    console.log(`  Exit: ${exitPrice.toFixed(6)}`);
    console.log(`  Profit: ${profit.toFixed(6)}`);

    return { profit };
  }

  /**
   * Check if position should be stopped out
   */
  checkStopLoss(positionId: string, currentPrice: number): { shouldClose: boolean; reason?: string } {
    const position = this.positions.find((p) => p.id === positionId && p.status === "open");
    if (!position) return { shouldClose: false };

    if (currentPrice <= position.stopLoss) {
      return { shouldClose: true, reason: "Stop loss triggered" };
    }

    if (currentPrice >= position.takeProfit) {
      return { shouldClose: true, reason: "Take profit triggered" };
    }

    return { shouldClose: false };
  }

  /**
   * Update current balance for drawdown calculation
   */
  updateBalance(balance: number): void {
    this.currentBalance = balance;
    if (balance > this.peakBalance) {
      this.peakBalance = balance;
    }
  }

  /**
   * Get open positions
   */
  getOpenPositions(): Position[] {
    return this.positions.filter((p) => p.status === "open");
  }

  /**
   * Get position history
   */
  getPositionHistory(limit: number = 100): Position[] {
    return this.positions.slice(-limit);
  }

  /**
   * Get risk metrics
   */
  getRiskMetrics(): {
    openPositions: number;
    totalProfit: number;
    dailyLoss: number;
    drawdown: number;
    maxPositionSize: number;
    riskRewardRatio: number;
  } {
    const openPositions = this.positions.filter((p) => p.status === "open");
    const totalProfit = this.positions.reduce((sum, p) => sum + (p.profit || 0), 0);
    const drawdown = this.peakBalance > 0 ? (this.peakBalance - this.currentBalance) / this.peakBalance : 0;

    return {
      openPositions: openPositions.length,
      totalProfit,
      dailyLoss: this.dailyLoss,
      drawdown,
      maxPositionSize: this.config.maxPositionSize,
      riskRewardRatio: this.config.riskRewardRatio,
    };
  }

  /**
   * Update risk configuration
   */
  updateConfig(newConfig: Partial<RiskConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("[RiskManager] Config updated:", this.config);
  }

  /**
   * Reset daily loss counter
   */
  resetDailyLoss(): void {
    this.dailyLoss = 0;
    console.log("[RiskManager] Daily loss counter reset");
  }
}

let riskManagerInstance: RiskManager | null = null;

export function initializeRiskManager(config?: Partial<RiskConfig>): RiskManager {
  riskManagerInstance = new RiskManager(config);
  return riskManagerInstance;
}

export function getRiskManager(): RiskManager | null {
  return riskManagerInstance;
}

export function canOpenTrade(balance: number, amount: number, tokenIn: string, tokenOut: string) {
  const manager = riskManagerInstance;
  if (!manager) return { allowed: false, reason: "Risk manager not initialized" };
  return manager.canOpenPosition(balance, amount, tokenIn, tokenOut);
}

export function openRiskControlledPosition(tokenIn: string, tokenOut: string, entryPrice: number, amount: number) {
  const manager = riskManagerInstance;
  if (!manager) return { position: null, reason: "Risk manager not initialized" };
  return manager.openPosition(tokenIn, tokenOut, entryPrice, amount);
}

export function checkPositionStopLoss(positionId: string, currentPrice: number) {
  const manager = riskManagerInstance;
  if (!manager) return { shouldClose: false };
  return manager.checkStopLoss(positionId, currentPrice);
}

export function getRiskMetrics() {
  const manager = riskManagerInstance;
  if (!manager)
    return {
      openPositions: 0,
      totalProfit: 0,
      dailyLoss: 0,
      drawdown: 0,
      maxPositionSize: 0,
      riskRewardRatio: 0,
    };
  return manager.getRiskMetrics();
}
