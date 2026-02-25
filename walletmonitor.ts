import { ethers } from "ethers";

interface WalletSnapshot {
  timestamp: Date;
  address: string;
  ethBalance: string;
  usdcBalance: string;
  daiBalance: string;
  totalValueUSD: number;
  fundingStatus: "unfunded" | "pending" | "funded";
}

class WalletMonitor {
  private walletAddress: string;
  private balanceHistory: WalletSnapshot[] = [];
  private fundingAttempts: { timestamp: Date; success: boolean; amount?: string }[] = [];
  private provider: ethers.JsonRpcProvider;

  constructor(walletAddress: string) {
    this.walletAddress = walletAddress;
    this.provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
  }

  /**
   * Record wallet snapshot
   */
  async recordSnapshot(): Promise<WalletSnapshot> {
    try {
      const ethBalance = await this.provider.getBalance(this.walletAddress);
      const ethFormatted = ethers.formatEther(ethBalance);

      // Get token balances
      const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
      const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

      const ERC20_ABI = [
        "function balanceOf(address account) external view returns (uint256)",
      ];

      const usdcContract = new ethers.Contract(USDC, ERC20_ABI, this.provider);
      const daiContract = new ethers.Contract(DAI, ERC20_ABI, this.provider);

      const usdcBalance = await usdcContract.balanceOf(this.walletAddress);
      const daiBalance = await daiContract.balanceOf(this.walletAddress);

      const usdcFormatted = ethers.formatUnits(usdcBalance, 6);
      const daiFormatted = ethers.formatUnits(daiBalance, 18);

      // Estimate total value (simplified)
      const ethPrice = 2500; // Placeholder
      const totalValueUSD = Number(ethFormatted) * ethPrice + Number(usdcFormatted) + Number(daiFormatted);

      const fundingStatus = Number(ethFormatted) > 0 ? "funded" : "unfunded";

      const snapshot: WalletSnapshot = {
        timestamp: new Date(),
        address: this.walletAddress,
        ethBalance: ethFormatted,
        usdcBalance: usdcFormatted,
        daiBalance: daiFormatted,
        totalValueUSD,
        fundingStatus: fundingStatus as "unfunded" | "pending" | "funded",
      };

      this.balanceHistory.push(snapshot);

      // Keep only last 1000 snapshots
      if (this.balanceHistory.length > 1000) {
        this.balanceHistory = this.balanceHistory.slice(-1000);
      }

      console.log("[WalletMonitor] Snapshot recorded:", {
        eth: ethFormatted,
        usdc: usdcFormatted,
        dai: daiFormatted,
        totalUSD: totalValueUSD.toFixed(2),
      });

      return snapshot;
    } catch (error) {
      console.error("[WalletMonitor] Error recording snapshot:", error);
      throw error;
    }
  }

  /**
   * Record funding attempt
   */
  recordFundingAttempt(success: boolean, amount?: string): void {
    this.fundingAttempts.push({
      timestamp: new Date(),
      success,
      amount,
    });

    console.log(`[WalletMonitor] Funding attempt: ${success ? "SUCCESS" : "FAILED"}${amount ? ` (${amount})` : ""}`);
  }

  /**
   * Get wallet status
   */
  getWalletStatus(): {
    address: string;
    currentBalance: WalletSnapshot | null;
    fundingStatus: string;
    totalFundingAttempts: number;
    successfulFundings: number;
    lastSnapshot: WalletSnapshot | null;
  } {
    const lastSnapshot = this.balanceHistory[this.balanceHistory.length - 1] || null;
    const successfulFundings = this.fundingAttempts.filter((a) => a.success).length;

    return {
      address: this.walletAddress,
      currentBalance: lastSnapshot,
      fundingStatus: lastSnapshot?.fundingStatus || "unknown",
      totalFundingAttempts: this.fundingAttempts.length,
      successfulFundings,
      lastSnapshot,
    };
  }

  /**
   * Get balance history
   */
  getBalanceHistory(limit: number = 100): WalletSnapshot[] {
    return this.balanceHistory.slice(-limit);
  }

  /**
   * Get funding history
   */
  getFundingHistory(limit: number = 50): any[] {
    return this.fundingAttempts.slice(-limit);
  }

  /**
   * Get balance trend
   */
  getBalanceTrend(): {
    direction: "up" | "down" | "stable";
    percentChange: number;
    timeframe: string;
  } {
    if (this.balanceHistory.length < 2) {
      return { direction: "stable", percentChange: 0, timeframe: "N/A" };
    }

    const oldest = this.balanceHistory[0];
    const newest = this.balanceHistory[this.balanceHistory.length - 1];

    const oldValue = oldest.totalValueUSD;
    const newValue = newest.totalValueUSD;

    const percentChange = ((newValue - oldValue) / oldValue) * 100;
    const direction = percentChange > 1 ? "up" : percentChange < -1 ? "down" : "stable";

    const timeMs = newest.timestamp.getTime() - oldest.timestamp.getTime();
    const hours = Math.floor(timeMs / (1000 * 60 * 60));

    return {
      direction,
      percentChange: parseFloat(percentChange.toFixed(2)),
      timeframe: `${hours}h`,
    };
  }
}

let monitorInstance: WalletMonitor | null = null;

export function initializeWalletMonitor(walletAddress: string): WalletMonitor {
  monitorInstance = new WalletMonitor(walletAddress);
  return monitorInstance;
}

export function getWalletMonitor(): WalletMonitor | null {
  return monitorInstance;
}

export async function recordWalletSnapshot() {
  const monitor = monitorInstance;
  if (!monitor) return null;
  return monitor.recordSnapshot();
}

export function recordFundingAttempt(success: boolean, amount?: string) {
  const monitor = monitorInstance;
  if (!monitor) return;
  monitor.recordFundingAttempt(success, amount);
}

export function getWalletStatus() {
  const monitor = monitorInstance;
  if (!monitor) return null;
  return monitor.getWalletStatus();
}

export function getBalanceHistory(limit?: number) {
  const monitor = monitorInstance;
  if (!monitor) return [];
  return monitor.getBalanceHistory(limit);
}

export function getFundingHistory(limit?: number) {
  const monitor = monitorInstance;
  if (!monitor) return [];
  return monitor.getFundingHistory(limit);
}

export function getBalanceTrend() {
  const monitor = monitorInstance;
  if (!monitor) return null;
  return monitor.getBalanceTrend();
}
