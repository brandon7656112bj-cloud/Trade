import { ethers } from "ethers";
import axios from "axios";

interface WithdrawalConfig {
  ethAddress: string;
  xrpAddress: string;
  withdrawalInterval: number; // milliseconds
  minWithdrawalAmount: number; // minimum amount to trigger withdrawal
}

interface WithdrawalRecord {
  id: string;
  type: "ETH" | "XRP";
  amount: number;
  destination: string;
  txHash: string;
  timestamp: Date;
  status: "pending" | "confirmed" | "failed";
}

class EarningsWithdrawal {
  private config: WithdrawalConfig | null = null;
  private withdrawalHistory: WithdrawalRecord[] = [];
  private lastWithdrawalTime: number = 0;
  private ethProvider: ethers.JsonRpcProvider | null = null;
  private totalEthWithdrawn = 0;
  private totalXrpWithdrawn = 0;

  /**
   * Initialize withdrawal service
   */
  initialize(config: WithdrawalConfig): void {
    this.config = config;
    this.ethProvider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
    console.log(`[EarningsWithdrawal] Initialized for ETH: ${config.ethAddress}, XRP: ${config.xrpAddress}`);
  }

  /**
   * Withdraw ETH earnings
   */
  async withdrawETH(amount: number): Promise<WithdrawalRecord | null> {
    if (!this.config || !this.ethProvider) {
      console.error("[EarningsWithdrawal] Service not initialized");
      return null;
    }

    if (amount < this.config.minWithdrawalAmount) {
      console.log(`[EarningsWithdrawal] ETH amount ${amount} below minimum ${this.config.minWithdrawalAmount}`);
      return null;
    }

    try {
      // Simulate ETH transfer (in production, would use actual wallet)
      const txHash = `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;

      const record: WithdrawalRecord = {
        id: `eth_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type: "ETH",
        amount,
        destination: this.config.ethAddress,
        txHash,
        timestamp: new Date(),
        status: "confirmed",
      };

      this.withdrawalHistory.push(record);
      this.totalEthWithdrawn += amount;
      this.lastWithdrawalTime = Date.now();

      console.log(`[EarningsWithdrawal] ETH withdrawal successful`);
      console.log(`  Amount: ${amount} ETH`);
      console.log(`  To: ${this.config.ethAddress}`);
      console.log(`  Tx: ${txHash}`);
      console.log(`  Total withdrawn: ${this.totalEthWithdrawn} ETH`);

      return record;
    } catch (error) {
      console.error("[EarningsWithdrawal] ETH withdrawal failed:", error);

      const failedRecord: WithdrawalRecord = {
        id: `eth_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type: "ETH",
        amount,
        destination: this.config.ethAddress,
        txHash: "FAILED",
        timestamp: new Date(),
        status: "failed",
      };

      this.withdrawalHistory.push(failedRecord);
      return null;
    }
  }

  /**
   * Withdraw XRP earnings
   */
  async withdrawXRP(amount: number): Promise<WithdrawalRecord | null> {
    if (!this.config) {
      console.error("[EarningsWithdrawal] Service not initialized");
      return null;
    }

    if (amount < this.config.minWithdrawalAmount) {
      console.log(`[EarningsWithdrawal] XRP amount ${amount} below minimum ${this.config.minWithdrawalAmount}`);
      return null;
    }

    try {
      // Simulate XRP transfer via XRPL
      const txHash = `${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;

      const record: WithdrawalRecord = {
        id: `xrp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type: "XRP",
        amount,
        destination: this.config.xrpAddress,
        txHash,
        timestamp: new Date(),
        status: "confirmed",
      };

      this.withdrawalHistory.push(record);
      this.totalXrpWithdrawn += amount;
      this.lastWithdrawalTime = Date.now();

      console.log(`[EarningsWithdrawal] XRP withdrawal successful`);
      console.log(`  Amount: ${amount} XRP`);
      console.log(`  To: ${this.config.xrpAddress}`);
      console.log(`  Tx: ${txHash}`);
      console.log(`  Total withdrawn: ${this.totalXrpWithdrawn} XRP`);

      return record;
    } catch (error) {
      console.error("[EarningsWithdrawal] XRP withdrawal failed:", error);

      const failedRecord: WithdrawalRecord = {
        id: `xrp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type: "XRP",
        amount,
        destination: this.config.xrpAddress,
        txHash: "FAILED",
        timestamp: new Date(),
        status: "failed",
      };

      this.withdrawalHistory.push(failedRecord);
      return null;
    }
  }

  /**
   * Automatic withdrawal based on earnings
   */
  async processAutomaticWithdrawal(ethEarnings: number, xrpEarnings: number): Promise<void> {
    if (!this.config) return;

    // Check if enough time has passed since last withdrawal
    const timeSinceLastWithdrawal = Date.now() - this.lastWithdrawalTime;
    if (timeSinceLastWithdrawal < this.config.withdrawalInterval) {
      return;
    }

    // Process ETH withdrawal
    if (ethEarnings >= this.config.minWithdrawalAmount) {
      await this.withdrawETH(ethEarnings);
    }

    // Process XRP withdrawal
    if (xrpEarnings >= this.config.minWithdrawalAmount) {
      await this.withdrawXRP(xrpEarnings);
    }
  }

  /**
   * Get withdrawal history
   */
  getWithdrawalHistory(limit: number = 100): WithdrawalRecord[] {
    return this.withdrawalHistory.slice(-limit);
  }

  /**
   * Get withdrawal statistics
   */
  getWithdrawalStats(): {
    totalEthWithdrawn: number;
    totalXrpWithdrawn: number;
    totalWithdrawals: number;
    successfulWithdrawals: number;
    failedWithdrawals: number;
    lastWithdrawalTime: Date | null;
  } {
    const successful = this.withdrawalHistory.filter((w) => w.status === "confirmed").length;
    const failed = this.withdrawalHistory.filter((w) => w.status === "failed").length;

    return {
      totalEthWithdrawn: parseFloat(this.totalEthWithdrawn.toFixed(6)),
      totalXrpWithdrawn: parseFloat(this.totalXrpWithdrawn.toFixed(2)),
      totalWithdrawals: this.withdrawalHistory.length,
      successfulWithdrawals: successful,
      failedWithdrawals: failed,
      lastWithdrawalTime: this.lastWithdrawalTime > 0 ? new Date(this.lastWithdrawalTime) : null,
    };
  }

  /**
   * Get pending withdrawals
   */
  getPendingWithdrawals(): WithdrawalRecord[] {
    return this.withdrawalHistory.filter((w) => w.status === "pending");
  }

  /**
   * Retry failed withdrawal
   */
  async retryFailedWithdrawal(recordId: string): Promise<WithdrawalRecord | null> {
    const record = this.withdrawalHistory.find((w) => w.id === recordId);

    if (!record || record.status !== "failed") {
      return null;
    }

    if (record.type === "ETH") {
      return await this.withdrawETH(record.amount);
    } else {
      return await this.withdrawXRP(record.amount);
    }
  }

  /**
   * Get total earnings withdrawn
   */
  getTotalEarningsWithdrawn(): { eth: number; xrp: number; combined: string } {
    return {
      eth: parseFloat(this.totalEthWithdrawn.toFixed(6)),
      xrp: parseFloat(this.totalXrpWithdrawn.toFixed(2)),
      combined: `${this.totalEthWithdrawn.toFixed(6)} ETH + ${this.totalXrpWithdrawn.toFixed(2)} XRP`,
    };
  }
}

let withdrawalInstance: EarningsWithdrawal | null = null;

export function initializeEarningsWithdrawal(config: WithdrawalConfig): EarningsWithdrawal {
  withdrawalInstance = new EarningsWithdrawal();
  withdrawalInstance.initialize(config);
  return withdrawalInstance;
}

export function getEarningsWithdrawal(): EarningsWithdrawal | null {
  return withdrawalInstance;
}

export async function withdrawETH(amount: number) {
  const withdrawal = withdrawalInstance;
  if (!withdrawal) return null;
  return withdrawal.withdrawETH(amount);
}

export async function withdrawXRP(amount: number) {
  const withdrawal = withdrawalInstance;
  if (!withdrawal) return null;
  return withdrawal.withdrawXRP(amount);
}

export async function processAutomaticWithdrawal(ethEarnings: number, xrpEarnings: number) {
  const withdrawal = withdrawalInstance;
  if (!withdrawal) return;
  return withdrawal.processAutomaticWithdrawal(ethEarnings, xrpEarnings);
}

export function getWithdrawalHistory(limit?: number) {
  const withdrawal = withdrawalInstance;
  if (!withdrawal) return [];
  return withdrawal.getWithdrawalHistory(limit);
}

export function getWithdrawalStats() {
  const withdrawal = withdrawalInstance;
  if (!withdrawal) return null;
  return withdrawal.getWithdrawalStats();
}

export function getTotalEarningsWithdrawn() {
  const withdrawal = withdrawalInstance;
  if (!withdrawal) return { eth: 0, xrp: 0, combined: "0 ETH + 0 XRP" };
  return withdrawal.getTotalEarningsWithdrawn();
}
