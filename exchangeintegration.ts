import axios from "axios";
import crypto from "crypto";

interface ExchangeConfig {
  exchange: "kucoin" | "binance";
  apiKey: string;
  apiSecret: string;
  apiPassphrase?: string; // KuCoin only
  sandbox?: boolean;
}

interface OrderResult {
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  status: "pending" | "filled" | "cancelled";
  timestamp: Date;
}

class ExchangeIntegration {
  private config: ExchangeConfig | null = null;
  private baseUrl: string = "";
  private orders: OrderResult[] = [];

  /**
   * Initialize exchange connection
   */
  initialize(config: ExchangeConfig): void {
    this.config = config;

    if (config.exchange === "kucoin") {
      this.baseUrl = config.sandbox ? "https://api.sandbox.kucoin.com" : "https://api.kucoin.com";
    } else if (config.exchange === "binance") {
      this.baseUrl = config.sandbox ? "https://testnet.binance.vision/api" : "https://api.binance.com/api";
    }

    console.log(`[ExchangeIntegration] Initialized ${config.exchange} (${config.sandbox ? "sandbox" : "live"})`);
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<Record<string, number>> {
    if (!this.config) {
      throw new Error("Exchange not initialized");
    }

    try {
      if (this.config.exchange === "kucoin") {
        return await this.getKuCoinBalance();
      } else if (this.config.exchange === "binance") {
        return await this.getBinanceBalance();
      }
    } catch (error) {
      console.error("[ExchangeIntegration] Error getting balance:", error);
      throw error;
    }

    return {};
  }

  /**
   * Get KuCoin balance
   */
  private async getKuCoinBalance(): Promise<Record<string, number>> {
    const endpoint = "/api/v1/accounts";
    const timestamp = Date.now();
    const signature = this.generateKuCoinSignature("GET", endpoint, "", timestamp);

    const response = await axios.get(`${this.baseUrl}${endpoint}`, {
      headers: {
        "KC-API-KEY": this.config!.apiKey,
        "KC-API-SIGN": signature,
        "KC-API-TIMESTAMP": timestamp,
        "KC-API-PASSPHRASE": this.config!.apiPassphrase || "",
      },
    });

    const balances: Record<string, number> = {};

    for (const account of response.data.data) {
      if (account.type === "trade") {
        balances[account.currency] = parseFloat(account.balance);
      }
    }

    return balances;
  }

  /**
   * Get Binance balance
   */
  private async getBinanceBalance(): Promise<Record<string, number>> {
    const endpoint = "/v3/account";
    const timestamp = Date.now();
    const signature = this.generateBinanceSignature("", timestamp);

    const response = await axios.get(`${this.baseUrl}${endpoint}`, {
      params: { timestamp },
      headers: {
        "X-MBX-APIKEY": this.config!.apiKey,
        "X-MBX-SIGNATURE": signature,
      },
    });

    const balances: Record<string, number> = {};

    for (const balance of response.data.balances) {
      const free = parseFloat(balance.free);
      if (free > 0) {
        balances[balance.asset] = free;
      }
    }

    return balances;
  }

  /**
   * Place market order
   */
  async placeMarketOrder(
    symbol: string,
    side: "BUY" | "SELL",
    quantity: number
  ): Promise<OrderResult> {
    if (!this.config) {
      throw new Error("Exchange not initialized");
    }

    try {
      if (this.config.exchange === "kucoin") {
        return await this.placeKuCoinOrder(symbol, side, quantity);
      } else if (this.config.exchange === "binance") {
        return await this.placeBinanceOrder(symbol, side, quantity);
      }
    } catch (error) {
      console.error("[ExchangeIntegration] Error placing order:", error);
      throw error;
    }

    throw new Error("Exchange not supported");
  }

  /**
   * Place KuCoin market order
   */
  private async placeKuCoinOrder(symbol: string, side: "BUY" | "SELL", quantity: number): Promise<OrderResult> {
    const endpoint = "/api/v1/orders";
    const timestamp = Date.now();

    const body = {
      clientOid: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      side: side.toLowerCase(),
      symbol: symbol,
      type: "market",
      size: quantity.toString(),
    };

    const signature = this.generateKuCoinSignature("POST", endpoint, JSON.stringify(body), timestamp);

    const response = await axios.post(`${this.baseUrl}${endpoint}`, body, {
      headers: {
        "KC-API-KEY": this.config!.apiKey,
        "KC-API-SIGN": signature,
        "KC-API-TIMESTAMP": timestamp,
        "KC-API-PASSPHRASE": this.config!.apiPassphrase || "",
        "Content-Type": "application/json",
      },
    });

    const order: OrderResult = {
      orderId: response.data.data.orderId,
      symbol,
      side,
      quantity,
      price: 0, // Market order
      status: "pending",
      timestamp: new Date(),
    };

    this.orders.push(order);
    console.log(`[ExchangeIntegration] KuCoin order placed: ${order.orderId}`);

    return order;
  }

  /**
   * Place Binance market order
   */
  private async placeBinanceOrder(symbol: string, side: "BUY" | "SELL", quantity: number): Promise<OrderResult> {
    const endpoint = "/v3/order";
    const timestamp = Date.now();

    const params = {
      symbol: symbol.replace("/", ""),
      side: side.toUpperCase(),
      type: "MARKET",
      quantity: quantity.toString(),
      timestamp,
    };

    const signature = this.generateBinanceSignature(
      `symbol=${params.symbol}&side=${params.side}&type=${params.type}&quantity=${params.quantity}&timestamp=${timestamp}`,
      timestamp
    );

    const response = await axios.post(`${this.baseUrl}${endpoint}`, null, {
      params: { ...params, signature },
      headers: {
        "X-MBX-APIKEY": this.config!.apiKey,
      },
    });

    const order: OrderResult = {
      orderId: response.data.orderId.toString(),
      symbol,
      side,
      quantity,
      price: 0,
      status: response.data.status.toLowerCase() as "pending" | "filled" | "cancelled",
      timestamp: new Date(),
    };

    this.orders.push(order);
    console.log(`[ExchangeIntegration] Binance order placed: ${order.orderId}`);

    return order;
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<OrderResult | null> {
    const order = this.orders.find((o) => o.orderId === orderId);
    return order || null;
  }

  /**
   * Get trading pairs
   */
  async getTradingPairs(): Promise<string[]> {
    try {
      if (this.config?.exchange === "kucoin") {
        const response = await axios.get(`${this.baseUrl}/api/v1/symbols`);
        return response.data.data.map((p: any) => p.symbol);
      } else if (this.config?.exchange === "binance") {
        const response = await axios.get(`${this.baseUrl}/v3/exchangeInfo`);
        return response.data.symbols.map((p: any) => p.symbol);
      }
    } catch (error) {
      console.error("[ExchangeIntegration] Error getting trading pairs:", error);
    }

    return [];
  }

  /**
   * Get order history
   */
  getOrderHistory(limit: number = 100): OrderResult[] {
    return this.orders.slice(-limit);
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const order = this.orders.find((o) => o.orderId === orderId);
      if (order) {
        order.status = "cancelled";
        console.log(`[ExchangeIntegration] Order cancelled: ${orderId}`);
        return true;
      }
    } catch (error) {
      console.error("[ExchangeIntegration] Error cancelling order:", error);
    }

    return false;
  }

  /**
   * Generate KuCoin signature
   */
  private generateKuCoinSignature(method: string, endpoint: string, body: string, timestamp: number): string {
    const message = `${timestamp}${method}${endpoint}${body}`;
    return crypto.createHmac("sha256", this.config!.apiSecret).update(message).digest("base64");
  }

  /**
   * Generate Binance signature
   */
  private generateBinanceSignature(queryString: string, timestamp: number): string {
    const message = `${queryString}${queryString ? "&" : ""}timestamp=${timestamp}`;
    return crypto.createHmac("sha256", this.config!.apiSecret).update(message).digest("hex");
  }
}

let exchangeInstance: ExchangeIntegration | null = null;

export function initializeExchange(config: ExchangeConfig): ExchangeIntegration {
  exchangeInstance = new ExchangeIntegration();
  exchangeInstance.initialize(config);
  return exchangeInstance;
}

export function getExchange(): ExchangeIntegration | null {
  return exchangeInstance;
}

export async function getBalance() {
  const exchange = exchangeInstance;
  if (!exchange) return {};
  return exchange.getBalance();
}

export async function placeMarketOrder(symbol: string, side: "BUY" | "SELL", quantity: number) {
  const exchange = exchangeInstance;
  if (!exchange) throw new Error("Exchange not initialized");
  return exchange.placeMarketOrder(symbol, side, quantity);
}

export async function getTradingPairs() {
  const exchange = exchangeInstance;
  if (!exchange) return [];
  return exchange.getTradingPairs();
}

export function getOrderHistory(limit?: number) {
  const exchange = exchangeInstance;
  if (!exchange) return [];
  return exchange.getOrderHistory(limit);
}
