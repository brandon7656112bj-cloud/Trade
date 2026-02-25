interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
}

interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

class DiscordWebhookService {
  private webhookUrl: string;
  private enabled: boolean;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
    this.enabled = !!webhookUrl;
    console.log(`[DiscordWebhook] Initialized with webhook: ${webhookUrl ? "configured" : "not configured"}`);
  }

  /**
   * Send trade notification
   */
  async sendTradeNotification(strategy: string, tokenIn: string, tokenOut: string, amount: number, profit: number): Promise<boolean> {
    if (!this.enabled) return false;

    const embed: DiscordEmbed = {
      title: "🤖 Trade Executed",
      color: profit > 0 ? 0x10b981 : 0xef4444,
      fields: [
        { name: "Strategy", value: strategy, inline: true },
        { name: "Pair", value: `${tokenIn} → ${tokenOut}`, inline: true },
        { name: "Amount", value: `${amount.toFixed(6)}`, inline: true },
        { name: "Profit", value: `${profit > 0 ? "+" : ""}${profit.toFixed(6)} XRP`, inline: true },
        { name: "Time", value: new Date().toISOString(), inline: false },
      ],
      timestamp: new Date().toISOString(),
    };

    return this.sendMessage({ embeds: [embed] });
  }

  /**
   * Send withdrawal notification
   */
  async sendWithdrawalNotification(amount: number, currency: string, destination: string, txHash: string): Promise<boolean> {
    if (!this.enabled) return false;

    const embed: DiscordEmbed = {
      title: "💰 Withdrawal Processed",
      color: 0x3b82f6,
      fields: [
        { name: "Amount", value: `${amount.toFixed(6)} ${currency}`, inline: true },
        { name: "Destination", value: `${destination.slice(0, 10)}...${destination.slice(-10)}`, inline: true },
        { name: "Transaction Hash", value: `[${txHash.slice(0, 10)}...](https://xrpscan.com/tx/${txHash})`, inline: false },
        { name: "Time", value: new Date().toISOString(), inline: false },
      ],
      timestamp: new Date().toISOString(),
    };

    return this.sendMessage({ embeds: [embed] });
  }

  /**
   * Send profit milestone notification
   */
  async sendProfitMilestoneNotification(totalProfit: number, milestone: number): Promise<boolean> {
    if (!this.enabled) return false;

    const embed: DiscordEmbed = {
      title: "🎉 Profit Milestone Reached!",
      description: `Total Profit: **${totalProfit.toFixed(6)} XRP**\nMilestone: **${milestone} XRP** 🏆`,
      color: 0xf59e0b,
      timestamp: new Date().toISOString(),
    };

    return this.sendMessage({ embeds: [embed] });
  }

  /**
   * Send error notification
   */
  async sendErrorNotification(errorType: string, errorMessage: string): Promise<boolean> {
    if (!this.enabled) return false;

    const embed: DiscordEmbed = {
      title: "⚠️ Error Alert",
      color: 0xef4444,
      fields: [
        { name: "Type", value: errorType, inline: true },
        { name: "Message", value: errorMessage, inline: false },
        { name: "Time", value: new Date().toISOString(), inline: false },
      ],
      timestamp: new Date().toISOString(),
    };

    return this.sendMessage({ embeds: [embed] });
  }

  /**
   * Send daily summary notification
   */
  async sendDailySummaryNotification(trades: number, profit: number, winRate: number, sharpeRatio: number): Promise<boolean> {
    if (!this.enabled) return false;

    const embed: DiscordEmbed = {
      title: "📊 Daily Summary",
      color: 0x6366f1,
      fields: [
        { name: "Trades", value: trades.toString(), inline: true },
        { name: "Profit", value: `${profit.toFixed(6)} XRP`, inline: true },
        { name: "Win Rate", value: `${(winRate * 100).toFixed(2)}%`, inline: true },
        { name: "Sharpe Ratio", value: sharpeRatio.toFixed(2), inline: true },
        { name: "Date", value: new Date().toLocaleDateString(), inline: false },
      ],
      timestamp: new Date().toISOString(),
    };

    return this.sendMessage({ embeds: [embed] });
  }

  /**
   * Send generic message
   */
  async sendMessage(message: DiscordMessage): Promise<boolean> {
    if (!this.enabled) {
      console.log("[DiscordWebhook] Webhooks disabled, skipping message");
      return false;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...message,
          username: message.username || "PowerTrader AI",
          avatar_url: message.avatar_url || "https://cdn-icons-png.flaticon.com/512/4436/4436481.png",
        }),
      });

      if (!response.ok) {
        console.error("[DiscordWebhook] Failed to send message:", response.statusText);
        return false;
      }

      console.log("[DiscordWebhook] Message sent successfully");
      return true;
    } catch (error) {
      console.error("[DiscordWebhook] Error sending message:", error);
      return false;
    }
  }

  /**
   * Test webhook connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.enabled) {
      console.log("[DiscordWebhook] No webhook configured");
      return false;
    }

    try {
      const embed: DiscordEmbed = {
        title: "✅ PowerTrader AI Connected",
        description: "Discord webhook is working correctly!",
        color: 0x10b981,
        timestamp: new Date().toISOString(),
      };

      return this.sendMessage({ embeds: [embed] });
    } catch (error) {
      console.error("[DiscordWebhook] Connection test failed:", error);
      return false;
    }
  }

  /**
   * Update webhook URL
   */
  updateWebhookUrl(url: string): void {
    this.webhookUrl = url;
    this.enabled = !!url;
    console.log(`[DiscordWebhook] Webhook URL updated: ${url ? "configured" : "disabled"}`);
  }

  /**
   * Enable/disable webhooks
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled && !!this.webhookUrl;
    console.log(`[DiscordWebhook] Webhooks ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

let discordService: DiscordWebhookService | null = null;

export function initializeDiscordWebhook(webhookUrl: string): DiscordWebhookService {
  discordService = new DiscordWebhookService(webhookUrl);
  return discordService;
}

export function getDiscordWebhook(): DiscordWebhookService | null {
  return discordService;
}

export async function sendDiscordTradeNotification(strategy: string, tokenIn: string, tokenOut: string, amount: number, profit: number) {
  const service = discordService;
  if (!service) return false;
  return service.sendTradeNotification(strategy, tokenIn, tokenOut, amount, profit);
}

export async function sendDiscordWithdrawalNotification(amount: number, currency: string, destination: string, txHash: string) {
  const service = discordService;
  if (!service) return false;
  return service.sendWithdrawalNotification(amount, currency, destination, txHash);
}

export async function sendDiscordProfitMilestoneNotification(totalProfit: number, milestone: number) {
  const service = discordService;
  if (!service) return false;
  return service.sendProfitMilestoneNotification(totalProfit, milestone);
}

export async function sendDiscordErrorNotification(errorType: string, errorMessage: string) {
  const service = discordService;
  if (!service) return false;
  return service.sendErrorNotification(errorType, errorMessage);
}

export async function sendDiscordDailySummaryNotification(trades: number, profit: number, winRate: number, sharpeRatio: number) {
  const service = discordService;
  if (!service) return false;
  return service.sendDailySummaryNotification(trades, profit, winRate, sharpeRatio);
}
