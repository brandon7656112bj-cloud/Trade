import axios from "axios";

const XRPL_RPC = "https://xrpl.ws";
const XRPL_ADDRESS = "rw2ciyaNshpHe7bCHo4bRWq6pqqynnWKQg";

interface XrplTransaction {
  Account: string;
  Destination: string;
  Amount: string;
  Fee: string;
  Sequence: number;
  TransactionType: "Payment";
  SigningPubKey: string;
}

class XrplWithdrawalService {
  private lastWithdrawalTime: number = 0;
  private withdrawalHistory: any[] = [];

  /**
   * Check if hourly withdrawal is due
   */
  isWithdrawalDue(): boolean {
    const now = Date.now();
    const oneHourInMs = 3600000;
    return now - this.lastWithdrawalTime >= oneHourInMs;
  }

  /**
   * Get XRPL account info
   */
  async getAccountInfo(address: string): Promise<any> {
    try {
      const response = await axios.post(XRPL_RPC, {
        jsonrpc: "2.0",
        id: 1,
        method: "account_info",
        params: {
          account: address,
          ledger_index: "validated",
        },
      });

      return response.data.result?.account_data || null;
    } catch (error) {
      console.error("[XRPL] Error getting account info:", error);
      return null;
    }
  }

  /**
   * Prepare withdrawal transaction
   */
  async prepareWithdrawal(
    sourceAddress: string,
    destinationAddress: string,
    amountXrp: number
  ): Promise<{ transactionJson: XrplTransaction; estimatedFee: string }> {
    try {
      // Get account info for sequence number
      const accountInfo = await this.getAccountInfo(sourceAddress);

      if (!accountInfo) {
        throw new Error("Failed to get account info");
      }

      const sequence = accountInfo.Sequence || 1;
      const amountDrops = (amountXrp * 1000000).toString(); // Convert XRP to drops
      const baseFee = "12"; // Base fee in drops

      const transaction: XrplTransaction = {
        Account: sourceAddress,
        Destination: destinationAddress,
        Amount: amountDrops,
        Fee: baseFee,
        Sequence: sequence,
        TransactionType: "Payment",
        SigningPubKey: "", // Will be filled by signer
      };

      return {
        transactionJson: transaction,
        estimatedFee: baseFee,
      };
    } catch (error) {
      console.error("[XRPL] Error preparing withdrawal:", error);
      throw error;
    }
  }

  /**
   * Submit transaction to XRPL
   */
  async submitTransaction(signedTransaction: string): Promise<{ success: boolean; txHash: string; error?: string }> {
    try {
      const response = await axios.post(XRPL_RPC, {
        jsonrpc: "2.0",
        id: 1,
        method: "submit",
        params: {
          tx_blob: signedTransaction,
        },
      });

      const result = response.data.result;

      if (result.engine_result === "tesSUCCESS") {
        const txHash = result.tx_json?.hash || "unknown";
        this.lastWithdrawalTime = Date.now();

        this.withdrawalHistory.push({
          timestamp: new Date(),
          txHash,
          amount: result.tx_json?.Amount,
          destination: result.tx_json?.Destination,
        });

        console.log(`[XRPL] Withdrawal successful: ${txHash}`);
        return { success: true, txHash };
      } else {
        return {
          success: false,
          txHash: "",
          error: result.engine_result,
        };
      }
    } catch (error) {
      console.error("[XRPL] Error submitting transaction:", error);
      return {
        success: false,
        txHash: "",
        error: String(error),
      };
    }
  }

  /**
   * Simulate withdrawal (for demo without signing key)
   */
  async simulateWithdrawal(amountXrp: number): Promise<{
    success: boolean;
    txHash: string;
    amount: number;
    destination: string;
    timestamp: string;
  }> {
    try {
      const txHash = `${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;

      this.lastWithdrawalTime = Date.now();

      const withdrawal = {
        success: true,
        txHash,
        amount: amountXrp,
        destination: XRPL_ADDRESS,
        timestamp: new Date().toISOString(),
      };

      this.withdrawalHistory.push(withdrawal);

      console.log(`[XRPL] Withdrawal simulated: ${amountXrp} XRP to ${XRPL_ADDRESS}`);
      console.log(`[XRPL] Transaction hash: ${txHash}`);

      return withdrawal;
    } catch (error) {
      console.error("[XRPL] Error simulating withdrawal:", error);
      return {
        success: false,
        txHash: "",
        amount: 0,
        destination: XRPL_ADDRESS,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get withdrawal history
   */
  getWithdrawalHistory(limit: number = 24): any[] {
    return this.withdrawalHistory.slice(-limit);
  }

  /**
   * Get total withdrawn
   */
  getTotalWithdrawn(): number {
    return this.withdrawalHistory.reduce((sum, w) => sum + (w.amount || 0), 0);
  }

  /**
   * Get last withdrawal time
   */
  getLastWithdrawalTime(): Date {
    return new Date(this.lastWithdrawalTime);
  }
}

// Global instance
const xrplService = new XrplWithdrawalService();

export async function prepareWithdrawal(sourceAddress: string, amountXrp: number) {
  return xrplService.prepareWithdrawal(sourceAddress, XRPL_ADDRESS, amountXrp);
}

export async function simulateWithdrawal(amountXrp: number) {
  return xrplService.simulateWithdrawal(amountXrp);
}

export function isWithdrawalDue(): boolean {
  return xrplService.isWithdrawalDue();
}

export function getWithdrawalHistory(limit?: number) {
  return xrplService.getWithdrawalHistory(limit);
}

export function getTotalWithdrawn(): number {
  return xrplService.getTotalWithdrawn();
}

export function getLastWithdrawalTime(): Date {
  return xrplService.getLastWithdrawalTime();
}

export default xrplService;
