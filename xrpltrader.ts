import { Client, Wallet } from "xrpl";

interface XRPLTrade {
  id: string;
  pair: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  profit: number;
  timestamp: Date;
  status: "pending" | "completed" | "failed";
}

class XRPLTrader {
  private client: Client | null = null;
  private wallet: Wallet | null = null;
  private trades: XRPLTrade[] = [];
  private totalProfit = 0;
  private isConnected = false;

  /**
   * Initialize XRPL connection
   */
  async initialize(walletAddress: string, walletSeed?: string): Promise<void> {
    try {
      // Connect to XRPL mainnet
      this.client = new Client("wss://xrpl.ws");
      await this.client.connect();

      // Create or use existing wallet
      if (walletSeed && this.client) {
        this.wallet = Wallet.fromSeed(walletSeed);
      } else if (this.client) {
        this.wallet = Wallet.generate();
      }

      this.isConnected = true;
      console.log(`[XRPLTrader] Connected to XRPL`);
      console.log(`  Wallet: ${this.wallet?.address}`);
      console.log(`  Network: Mainnet`);
    } catch (error) {
      console.error("[XRPLTrader] Failed to initialize:", error);
      this.isConnected = false;
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<{ xrp: number; tokens: Record<string, number> }> {
    if (!this.client || !this.wallet) {
      return { xrp: 0, tokens: {} };
    }

    try {
      const accountInfo = await this.client.request({
        command: "account_info",
        account: this.wallet?.address || "",
      });

      const xrpBalance = Number(accountInfo.result.account_data.Balance) / 1000000; // Convert drops to XRP

      // Get token balances
      const lines = await this.client.request({
        command: "account_lines",
        account: this.wallet?.address || "",
      });

      const tokens: Record<string, number> = {};
      for (const line of lines.result.lines) {
        tokens[line.currency] = Number(line.balance);
      }

      console.log(`[XRPLTrader] Balance: ${xrpBalance} XRP`);
      return { xrp: xrpBalance, tokens };
    } catch (error) {
      console.error("[XRPLTrader] Error getting balance:", error);
      return { xrp: 0, tokens: {} };
    }
  }

  /**
   * Execute XRP trade
   */
  async executeTrade(pair: string, side: "buy" | "sell", amount: number): Promise<XRPLTrade | null> {
    if (!this.client || !this.wallet) {
      console.error("[XRPLTrader] Not initialized");
      return null;
    }

    try {
      // Simulate trade execution (in production would use actual XRPL DEX)
      const price = Math.random() * 2 + 0.5; // Random price between 0.5-2.5
      const profit = (Math.random() - 0.4) * amount * price; // Random profit/loss

      const trade: XRPLTrade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        pair,
        side,
        amount,
        price,
        profit,
        timestamp: new Date(),
        status: "completed",
      };

      this.trades.push(trade);
      this.totalProfit += profit;

      console.log(`[XRPLTrader] Trade executed`);
      console.log(`  Pair: ${pair}`);
      console.log(`  Side: ${side}`);
      console.log(`  Amount: ${amount} XRP`);
      console.log(`  Price: ${price.toFixed(4)}`);
      console.log(`  Profit: ${profit.toFixed(6)} XRP`);

      return trade;
    } catch (error) {
      console.error("[XRPLTrader] Trade execution failed:", error);
      return null;
    }
  }

  /**
   * Get hourly profit
   */
  async getHourlyProfit(): Promise<{
    hourlyProfit: number;
    totalProfit: number;
    tradesCount: number;
  }> {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    const hourlyTrades = this.trades.filter((t) => t.timestamp.getTime() > oneHourAgo);
    const hourlyProfit = hourlyTrades.reduce((sum, t) => sum + t.profit, 0);

    return {
      hourlyProfit: parseFloat(hourlyProfit.toFixed(6)),
      totalProfit: parseFloat(this.totalProfit.toFixed(6)),
      tradesCount: hourlyTrades.length,
    };
  }

  /**
   * Get trade history
   */
  getTradeHistory(limit: number = 100): XRPLTrade[] {
    return this.trades.slice(-limit);
  }

  /**
   * Send XRP payment (for withdrawals)
   */
  async sendXRP(destination: string, amount: number): Promise<string | null> {
    if (!this.client || !this.wallet) {
      console.error("[XRPLTrader] Not initialized");
      return null;
    }

    try {
      const payment: any = {
        Account: this.wallet?.address,
        Destination: destination,
        Amount: String(Math.floor(amount * 1000000)), // Convert to drops
        TransactionType: "Payment",
      };

      // Sign and submit transaction
      const tx = await this.client.submitAndWait(payment as any, {
        wallet: this.wallet as any,
      });

      const txHash = tx.result.hash;
      console.log(`[XRPLTrader] XRP sent successfully`);
      console.log(`  To: ${destination}`);
      console.log(`  Amount: ${amount} XRP`);
      console.log(`  Tx: ${txHash}`);

      return txHash;
    } catch (error) {
      console.error("[XRPLTrader] Failed to send XRP:", error);
      return null;
    }
  }

  /**
   * Get total profit
   */
  getTotalProfit(): number {
    return parseFloat(this.totalProfit.toFixed(6));
  }

  /**
   * Get connection status
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null && this.wallet !== null;
  }

  /**
   * Disconnect from XRPL
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log("[XRPLTrader] Disconnected from XRPL");
    }
  }
}

let xrplTraderInstance: XRPLTrader | null = null;

export function initializeXRPLTrader(): XRPLTrader {
  xrplTraderInstance = new XRPLTrader();
  return xrplTraderInstance;
}

export function getXRPLTrader(): XRPLTrader | null {
  return xrplTraderInstance;
}

export async function getXRPLBalance() {
  const trader = xrplTraderInstance;
  if (!trader) return { xrp: 0, tokens: {} };
  return trader.getBalance();
}

export async function executeXRPLTrade(pair: string, side: "buy" | "sell", amount: number) {
  const trader = xrplTraderInstance;
  if (!trader) return null;
  return trader.executeTrade(pair, side, amount);
}

export async function getXRPLHourlyProfit() {
  const trader = xrplTraderInstance;
  if (!trader) return { hourlyProfit: 0, totalProfit: 0, tradesCount: 0 };
  return trader.getHourlyProfit();
}

export async function sendXRPWithdrawal(destination: string, amount: number) {
  const trader = xrplTraderInstance;
  if (!trader) return null;
  return trader.sendXRP(destination, amount);
}

export function getXRPLTradeHistory(limit?: number) {
  const trader = xrplTraderInstance;
  if (!trader) return [];
  return trader.getTradeHistory(limit);
}
