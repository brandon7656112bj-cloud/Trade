interface Position {
  id: string;
  tokenIn: string;
  tokenOut: string;
  entryPrice: number;
  amount: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: Date;
  status: "open" | "closed";
}

interface RiskMetrics {
  maxPositionSize: number;
  portfolioRisk: number;
  maxDrawdownAllowed: number;
  positionSizingMethod: "fixed" | "kelly" | "volatility";
  currentExposure: number;
  riskRewardRatio: number;
}

class RiskManager {
  private positions: Position[] = [];
  private portfolioValue = 1000; // Starting portfolio value
  private maxRiskPerTrade = 0.02; // 2% risk per trade
  private maxPositions = 5;
  private maxDrawdown = 0.1; // 10% max drawdown
  private currentDrawdown = 0;

  /**
   * Calculate position size based on risk
   */
  calculatePositionSize(
    entryPrice: number,
    stopLossPrice: number,
    accountBalance: number
  ): number {
    const riskAmount = accountBalance * this.maxRiskPerTrade;
    const priceRisk = Math.abs(entryPrice - stopLossPrice);

    if (priceRisk === 0) return 0;

    const positionSize = riskAmount / priceRisk;
    return Math.max(0, positionSize);
  }

  /**
   * Calculate Kelly Criterion position sizing
   */
  calculateKellyPositionSize(winRate: number, avgWin: number, avgLoss: number): number {
    if (avgLoss === 0) return 0;

    const winProbability = winRate / 100;
    const lossProbability = 1 - winProbability;
    const winLossRatio = avgWin / avgLoss;

    // Kelly Criterion: f = (bp - q) / b
    // where b = win/loss ratio, p = win probability, q = loss probability
    const kelly = (winLossRatio * winProbability - lossProbability) / winLossRatio;

    // Use 25% of Kelly (fractional Kelly) for safety
    const fractionalKelly = kelly * 0.25;

    return Math.max(0, Math.min(fractionalKelly, 0.1)); // Cap at 10%
  }

  /**
   * Calculate volatility-based position sizing
   */
  calculateVolatilityPositionSize(volatility: number): number {
    // Higher volatility = smaller position
    const baseSize = 0.05; // 5% base
    const adjustedSize = baseSize / (1 + volatility);
    return Math.max(0.01, Math.min(adjustedSize, 0.1));
  }

  /**
   * Open a new position
   */
  openPosition(
    tokenIn: string,
    tokenOut: string,
    entryPrice: number,
    amount: number,
    stopLossPercent: number = 2,
    takeProfitPercent: number = 5
  ): Position | null {
    // Check if max positions reached
    const openPositions = this.positions.filter((p) => p.status === "open").length;
    if (openPositions >= this.maxPositions) {
      console.log("[RiskManager] Maximum positions reached");
      return null;
    }

    // Calculate stop loss and take profit
    const stopLoss = entryPrice * (1 - stopLossPercent / 100);
    const takeProfit = entryPrice * (1 + takeProfitPercent / 100);

    const position: Position = {
      id: `pos_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      tokenIn,
      tokenOut,
      entryPrice,
      amount,
      stopLoss,
      takeProfit,
      timestamp: new Date(),
      status: "open",
    };

    this.positions.push(position);
    console.log(`[RiskManager] Position opened: ${position.id}`);
    console.log(`  Entry: $${entryPrice.toFixed(2)}, SL: $${stopLoss.toFixed(2)}, TP: $${takeProfit.toFixed(2)}`);

    return position;
  }

  /**
   * Close a position
   */
  closePosition(positionId: string, exitPrice: number): { profit: number; profitPercent: number } | null {
    const position = this.positions.find((p) => p.id === positionId);

    if (!position || position.status === "closed") {
      return null;
    }

    const profit = (exitPrice - position.entryPrice) * position.amount;
    const profitPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;

    position.status = "closed";

    // Update portfolio value and drawdown
    this.portfolioValue += profit;
    if (profit < 0) {
      this.currentDrawdown = Math.min(this.currentDrawdown + Math.abs(profit / this.portfolioValue), this.maxDrawdown);
    }

    console.log(`[RiskManager] Position closed: ${positionId}`);
    console.log(`  Profit: $${profit.toFixed(2)} (${profitPercent.toFixed(2)}%)`);

    return { profit, profitPercent };
  }

  /**
   * Check if position should be closed (stop loss or take profit)
   */
  checkPositionLevels(positionId: string, currentPrice: number): "stop_loss" | "take_profit" | null {
    const position = this.positions.find((p) => p.id === positionId && p.status === "open");

    if (!position) return null;

    if (currentPrice <= position.stopLoss) {
      return "stop_loss";
    }

    if (currentPrice >= position.takeProfit) {
      return "take_profit";
    }

    return null;
  }

  /**
   * Get current risk metrics
   */
  getRiskMetrics(): RiskMetrics {
    const openPositions = this.positions.filter((p) => p.status === "open");
    const currentExposure = openPositions.reduce((sum, p) => sum + p.amount * p.entryPrice, 0);

    return {
      maxPositionSize: this.portfolioValue * 0.1, // 10% max per position
      portfolioRisk: this.maxRiskPerTrade * 100,
      maxDrawdownAllowed: this.maxDrawdown * 100,
      positionSizingMethod: "kelly",
      currentExposure: currentExposure,
      riskRewardRatio: 1.5, // Average risk/reward ratio
    };
  }

  /**
   * Get all positions
   */
  getPositions(status?: "open" | "closed"): Position[] {
    if (status) {
      return this.positions.filter((p) => p.status === status);
    }
    return this.positions;
  }

  /**
   * Get position by ID
   */
  getPosition(positionId: string): Position | null {
    return this.positions.find((p) => p.id === positionId) || null;
  }

  /**
   * Calculate portfolio heat (total risk exposure)
   */
  getPortfolioHeat(): number {
    const openPositions = this.positions.filter((p) => p.status === "open");
    let totalRisk = 0;

    for (const position of openPositions) {
      const riskPerPosition = Math.abs(position.entryPrice - position.stopLoss) * position.amount;
      totalRisk += riskPerPosition;
    }

    return totalRisk;
  }

  /**
   * Check if portfolio risk is exceeded
   */
  isPortfolioRiskExceeded(): boolean {
    const portfolioHeat = this.getPortfolioHeat();
    const maxRisk = this.portfolioValue * this.maxRiskPerTrade;
    return portfolioHeat > maxRisk;
  }

  /**
   * Get drawdown percentage
   */
  getDrawdownPercent(): number {
    return this.currentDrawdown * 100;
  }

  /**
   * Reset drawdown (after recovery)
   */
  resetDrawdown(): void {
    this.currentDrawdown = 0;
  }

  /**
   * Update portfolio value
   */
  updatePortfolioValue(newValue: number): void {
    this.portfolioValue = newValue;
  }

  /**
   * Get portfolio statistics
   */
  getPortfolioStats(): {
    totalValue: number;
    openPositions: number;
    closedPositions: number;
    totalProfit: number;
    winRate: number;
    currentDrawdown: number;
  } {
    const openPositions = this.positions.filter((p) => p.status === "open");
    const closedPositions = this.positions.filter((p) => p.status === "closed");

    let totalProfit = 0;
    let winningTrades = 0;

    for (const position of closedPositions) {
      const profit = (position.entryPrice - position.stopLoss) * position.amount; // Simplified
      totalProfit += profit;
      if (profit > 0) winningTrades++;
    }

    const winRate = closedPositions.length > 0 ? (winningTrades / closedPositions.length) * 100 : 0;

    return {
      totalValue: this.portfolioValue,
      openPositions: openPositions.length,
      closedPositions: closedPositions.length,
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      winRate: parseFloat(winRate.toFixed(2)),
      currentDrawdown: parseFloat(this.currentDrawdown.toFixed(4)),
    };
  }
}

let riskInstance: RiskManager | null = null;

export function initializeRiskManager(): RiskManager {
  riskInstance = new RiskManager();
  return riskInstance;
}

export function getRiskManager(): RiskManager | null {
  return riskInstance;
}

export function calculatePositionSize(entryPrice: number, stopLossPrice: number, accountBalance: number) {
  const manager = riskInstance || initializeRiskManager();
  return manager.calculatePositionSize(entryPrice, stopLossPrice, accountBalance);
}

export function calculateKellyPositionSize(winRate: number, avgWin: number, avgLoss: number) {
  const manager = riskInstance || initializeRiskManager();
  return manager.calculateKellyPositionSize(winRate, avgWin, avgLoss);
}

export function openPosition(
  tokenIn: string,
  tokenOut: string,
  entryPrice: number,
  amount: number,
  stopLossPercent?: number,
  takeProfitPercent?: number
) {
  const manager = riskInstance || initializeRiskManager();
  return manager.openPosition(tokenIn, tokenOut, entryPrice, amount, stopLossPercent, takeProfitPercent);
}

export function closePosition(positionId: string, exitPrice: number) {
  const manager = riskInstance || initializeRiskManager();
  return manager.closePosition(positionId, exitPrice);
}

export function checkPositionLevels(positionId: string, currentPrice: number) {
  const manager = riskInstance || initializeRiskManager();
  return manager.checkPositionLevels(positionId, currentPrice);
}

export function getRiskMetrics() {
  const manager = riskInstance || initializeRiskManager();
  return manager.getRiskMetrics();
}

export function getPortfolioStats() {
  const manager = riskInstance || initializeRiskManager();
  return manager.getPortfolioStats();
}
