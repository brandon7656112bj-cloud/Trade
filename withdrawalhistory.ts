interface WithdrawalRecord {
  id: string;
  amount: number;
  currency: "XRP" | "ETH";
  destination: string;
  txHash: string;
  timestamp: Date;
  status: "pending" | "completed" | "failed";
  fee?: number;
  confirmations?: number;
}

class WithdrawalHistory {
  private withdrawals: WithdrawalRecord[] = [];
  private totalWithdrawn = 0;

  /**
   * Record a withdrawal
   */
  recordWithdrawal(
    amount: number,
    currency: "XRP" | "ETH",
    destination: string,
    txHash: string,
    fee?: number
  ): WithdrawalRecord {
    const withdrawal: WithdrawalRecord = {
      id: `wd_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      amount,
      currency,
      destination,
      txHash,
      timestamp: new Date(),
      status: "pending",
      fee,
      confirmations: 0,
    };

    this.withdrawals.push(withdrawal);
    this.totalWithdrawn += amount;

    console.log(`[WithdrawalHistory] Recorded withdrawal`);
    console.log(`  Amount: ${amount} ${currency}`);
    console.log(`  Destination: ${destination}`);
    console.log(`  Tx: ${txHash}`);

    return withdrawal;
  }

  /**
   * Update withdrawal status
   */
  updateWithdrawalStatus(txHash: string, status: "pending" | "completed" | "failed", confirmations?: number): boolean {
    const withdrawal = this.withdrawals.find((w) => w.txHash === txHash);
    if (!withdrawal) return false;

    withdrawal.status = status;
    if (confirmations !== undefined) {
      withdrawal.confirmations = confirmations;
    }

    console.log(`[WithdrawalHistory] Updated withdrawal ${txHash} to ${status}`);
    return true;
  }

  /**
   * Get withdrawal history
   */
  getHistory(limit: number = 100, currency?: "XRP" | "ETH"): WithdrawalRecord[] {
    let history = this.withdrawals.slice(-limit);

    if (currency) {
      history = history.filter((w) => w.currency === currency);
    }

    return history;
  }

  /**
   * Get total withdrawn
   */
  getTotalWithdrawn(): number {
    return parseFloat(this.totalWithdrawn.toFixed(6));
  }

  /**
   * Get withdrawal by transaction hash
   */
  getWithdrawalByTxHash(txHash: string): WithdrawalRecord | undefined {
    return this.withdrawals.find((w) => w.txHash === txHash);
  }

  /**
   * Get withdrawals by date range
   */
  getWithdrawalsByDateRange(startDate: Date, endDate: Date): WithdrawalRecord[] {
    return this.withdrawals.filter((w) => w.timestamp >= startDate && w.timestamp <= endDate);
  }

  /**
   * Get withdrawal statistics
   */
  getStatistics(): {
    totalWithdrawals: number;
    totalAmount: number;
    averageAmount: number;
    successCount: number;
    failureCount: number;
    pendingCount: number;
    lastWithdrawal?: WithdrawalRecord;
  } {
    const successful = this.withdrawals.filter((w) => w.status === "completed");
    const failed = this.withdrawals.filter((w) => w.status === "failed");
    const pending = this.withdrawals.filter((w) => w.status === "pending");

    return {
      totalWithdrawals: this.withdrawals.length,
      totalAmount: this.getTotalWithdrawn(),
      averageAmount: this.withdrawals.length > 0 ? this.getTotalWithdrawn() / this.withdrawals.length : 0,
      successCount: successful.length,
      failureCount: failed.length,
      pendingCount: pending.length,
      lastWithdrawal: this.withdrawals[this.withdrawals.length - 1],
    };
  }

  /**
   * Export history as JSON
   */
  exportAsJSON(): string {
    return JSON.stringify(
      {
        withdrawals: this.withdrawals,
        statistics: this.getStatistics(),
        exportDate: new Date(),
      },
      null,
      2
    );
  }

  /**
   * Export history as CSV
   */
  exportAsCSV(): string {
    const headers = ["ID", "Amount", "Currency", "Destination", "Tx Hash", "Timestamp", "Status", "Fee", "Confirmations"];
    const rows = this.withdrawals.map((w) => [
      w.id,
      w.amount.toString(),
      w.currency,
      w.destination,
      w.txHash,
      w.timestamp.toISOString(),
      w.status,
      w.fee?.toString() || "N/A",
      w.confirmations?.toString() || "0",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    return csv;
  }
}

let withdrawalHistoryInstance: WithdrawalHistory | null = null;

export function initializeWithdrawalHistory(): WithdrawalHistory {
  withdrawalHistoryInstance = new WithdrawalHistory();
  console.log("[WithdrawalHistory] Initialized");
  return withdrawalHistoryInstance;
}

export function getWithdrawalHistory(): WithdrawalHistory | null {
  return withdrawalHistoryInstance;
}

export function recordWithdrawal(amount: number, currency: "XRP" | "ETH", destination: string, txHash: string, fee?: number) {
  const history = withdrawalHistoryInstance;
  if (!history) return null;
  return history.recordWithdrawal(amount, currency, destination, txHash, fee);
}

export function getWithdrawalsByHistory(limit?: number, currency?: "XRP" | "ETH") {
  const history = withdrawalHistoryInstance;
  if (!history) return [];
  return history.getHistory(limit, currency);
}

export function getWithdrawalStats() {
  const history = withdrawalHistoryInstance;
  if (!history)
    return {
      totalWithdrawals: 0,
      totalAmount: 0,
      averageAmount: 0,
      successCount: 0,
      failureCount: 0,
      pendingCount: 0,
    };
  return history.getStatistics();
}

export function exportWithdrawalHistory(format: "json" | "csv" = "json"): string {
  const history = withdrawalHistoryInstance;
  if (!history) return format === "json" ? "{}" : "";

  if (format === "json") {
    return history.exportAsJSON();
  } else {
    return history.exportAsCSV();
  }
}
