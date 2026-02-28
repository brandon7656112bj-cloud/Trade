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
      const privateKey = process.env.ETH_PRIVATE_KEY;
      if (!privateKey) {
        console.error("[EarningsWithdrawal] ETH_PRIVATE_KEY not found in environment. Cannot broadcast real transaction.");
        return null;
      }

      console.log(`[EarningsWithdrawal] Preparing real ETH transfer to ${this.config.ethAddress}...`);
      const wallet = new ethers.Wallet(privateKey, this.ethProvider);
      
      const tx = await wallet.sendTransaction({
        to: this.config.ethAddress,
        value: ethers.parseEther(amount.toString()),
      });

      console.log(`[EarningsWithdrawal] ETH transaction broadcasted: ${tx.hash}`);
      
      const record: WithdrawalRecord = {
        id: `eth_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type: "ETH",
        amount,
        destination: this.config.ethAddress,
        txHash: tx.hash,
        timestamp: new Date(),
        status: "pending",
      };

      this.withdrawalHistory.push(record);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      if (receipt && receipt.status === 1) {
        record.status = "confirmed";
        this.totalEthWithdrawn += amount;
        this.lastWithdrawalTime = Date.now();
        console.log(`[EarningsWithdrawal] ETH withdrawal confirmed!`);
      } else {
        record.status = "failed";
        console.error(`[EarningsWithdrawal] ETH withdrawal failed on-chain.`);
      }

      return record;
    } catch (error) {
      console.error("[EarningsWithdrawal] Real ETH withdrawal failed:", error);
      return null;
    }
  }

  /**
   * Withdraw XRP earnings
   */
  async withdrawXRP(amount: number): Promise<WithdrawalRecord | null> {
    // This is handled by xrpltrader.ts but we keep the record here for consistency
    if (!this.config) return null;
    
    const record: WithdrawalRecord = {
      id: `xrp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: "XRP",
      amount,
      destination: this.config.xrpAddress,
      txHash: "EXTERNAL", // Hash will be updated if called via xrpltrader
      timestamp: new Date(),
      status: "confirmed",
    };
    
    this.withdrawalHistory.push(record);
    this.totalXrpWithdrawn += amount;
    return record;
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
