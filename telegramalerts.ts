interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

class TelegramAlertService {
  private config: TelegramConfig;
  private apiUrl = "https://api.telegram.org";

  constructor(config: TelegramConfig) {
    this.config = config;
    console.log("[TelegramAlerts] Initialized with bot token:", config.botToken.slice(0, 10) + "...");
  }

  /**
   * Send trade alert
   */
  async sendTradeAlert(strategy: string, tokenIn: string, tokenOut: string, amount: number, profit: number): Promise<boolean> {
    if (!this.config.enabled) return false;

    const message = `
🤖 *Trade Executed*
Strategy: ${strategy}
Pair: ${tokenIn} → ${tokenOut}
Amount: ${amount.toFixed(6)}
Profit: ${profit > 0 ? "+" : ""}${profit.toFixed(6)} XRP
Time: ${new Date().toISOString()}
    `.trim();

    return this.sendMessage(message);
  }

  /**
   * Send withdrawal alert
   */
  async sendWithdrawalAlert(amount: number, currency: string, destination: string, txHash: string): Promise<boolean> {
    if (!this.config.enabled) return false;

    const message = `
💰 *Withdrawal Processed*
Amount: ${amount.toFixed(6)} ${currency}
Destination: ${destination.slice(0, 10)}...${destination.slice(-10)}
Tx Hash: ${txHash}
Time: ${new Date().toISOString()}
    `.trim();

    return this.sendMessage(message);
  }

  /**
   * Send profit milestone alert
   */
  async sendProfitMilestoneAlert(totalProfit: number, milestone: number): Promise<boolean> {
    if (!this.config.enabled) return false;

    const message = `
🎉 *Profit Milestone Reached!*
Total Profit: ${totalProfit.toFixed(6)} XRP
Milestone: ${milestone} XRP
Achievement Unlocked! 🏆
Time: ${new Date().toISOString()}
    `.trim();

    return this.sendMessage(message);
  }

  /**
   * Send error alert
   */
  async sendErrorAlert(errorType: string, errorMessage: string): Promise<boolean> {
    if (!this.config.enabled) return false;

    const message = `
⚠️ *Error Alert*
Type: ${errorType}
Message: ${errorMessage}
Time: ${new Date().toISOString()}
    `.trim();

    return this.sendMessage(message);
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(trades: number, profit: number, winRate: number, sharpeRatio: number): Promise<boolean> {
    if (!this.config.enabled) return false;

    const message = `
📊 *Daily Summary*
Trades: ${trades}
Profit: ${profit.toFixed(6)} XRP
Win Rate: ${(winRate * 100).toFixed(2)}%
Sharpe Ratio: ${sharpeRatio.toFixed(2)}
Time: ${new Date().toISOString()}
    `.trim();

    return this.sendMessage(message);
  }

  /**
   * Send generic message
   */
  async sendMessage(text: string): Promise<boolean> {
    if (!this.config.enabled) {
      console.log("[TelegramAlerts] Alerts disabled, skipping message");
      return false;
    }

    try {
      const url = `${this.apiUrl}/bot${this.config.botToken}/sendMessage`;
      const payload = {
        chat_id: this.config.chatId,
        text,
        parse_mode: "Markdown",
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("[TelegramAlerts] Failed to send message:", response.statusText);
        return false;
      }

      console.log("[TelegramAlerts] Message sent successfully");
      return true;
    } catch (error) {
      console.error("[TelegramAlerts] Error sending message:", error);
      return false;
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.apiUrl}/bot${this.config.botToken}/getMe`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error("[TelegramAlerts] Connection test failed");
        return false;
      }

      console.log("[TelegramAlerts] Connection test successful");
      return true;
    } catch (error) {
      console.error("[TelegramAlerts] Connection test error:", error);
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TelegramConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("[TelegramAlerts] Configuration updated");
  }

  /**
   * Enable/disable alerts
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`[TelegramAlerts] Alerts ${enabled ? "enabled" : "disabled"}`);
  }
}

let telegramService: TelegramAlertService | null = null;

export function initializeTelegramAlerts(config: TelegramConfig): TelegramAlertService {
  telegramService = new TelegramAlertService(config);
  return telegramService;
}

export function getTelegramService(): TelegramAlertService | null {
  return telegramService;
}

export async function sendTradeAlert(strategy: string, tokenIn: string, tokenOut: string, amount: number, profit: number) {
  const service = telegramService;
  if (!service) return false;
  return service.sendTradeAlert(strategy, tokenIn, tokenOut, amount, profit);
}

export async function sendWithdrawalAlert(amount: number, currency: string, destination: string, txHash: string) {
  const service = telegramService;
  if (!service) return false;
  return service.sendWithdrawalAlert(amount, currency, destination, txHash);
}

export async function sendProfitMilestoneAlert(totalProfit: number, milestone: number) {
  const service = telegramService;
  if (!service) return false;
  return service.sendProfitMilestoneAlert(totalProfit, milestone);
}

export async function sendErrorAlert(errorType: string, errorMessage: string) {
  const service = telegramService;
  if (!service) return false;
  return service.sendErrorAlert(errorType, errorMessage);
}

export async function sendDailySummary(trades: number, profit: number, winRate: number, sharpeRatio: number) {
  const service = telegramService;
  if (!service) return false;
  return service.sendDailySummary(trades, profit, winRate, sharpeRatio);
}
