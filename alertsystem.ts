import axios from "axios";

interface Alert {
  id: string;
  type: "trade" | "withdrawal" | "profit" | "error" | "milestone";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  timestamp: Date;
  sent: boolean;
}

class AlertSystem {
  private alerts: Alert[] = [];
  private emailConfig: { enabled: boolean; recipient?: string } = { enabled: false };
  private telegramConfig: { enabled: boolean; botToken?: string; chatId?: string } = { enabled: false };

  /**
   * Initialize email alerts
   */
  initializeEmail(recipient: string): void {
    this.emailConfig = { enabled: true, recipient };
    console.log(`[AlertSystem] Email alerts enabled for ${recipient}`);
  }

  /**
   * Initialize Telegram alerts
   */
  initializeTelegram(botToken: string, chatId: string): void {
    this.telegramConfig = { enabled: true, botToken, chatId };
    console.log(`[AlertSystem] Telegram alerts enabled`);
  }

  /**
   * Create and send alert
   */
  async createAlert(
    type: "trade" | "withdrawal" | "profit" | "error" | "milestone",
    title: string,
    message: string,
    severity: "info" | "warning" | "critical" = "info"
  ): Promise<Alert> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      title,
      message,
      severity,
      timestamp: new Date(),
      sent: false,
    };

    this.alerts.push(alert);

    // Send notifications
    await this.sendNotifications(alert);

    console.log(`[AlertSystem] Alert created: ${title}`);

    return alert;
  }

  /**
   * Send notifications via all enabled channels
   */
  private async sendNotifications(alert: Alert): Promise<void> {
    const promises: Promise<boolean>[] = [];

    if (this.emailConfig.enabled && this.emailConfig.recipient) {
      promises.push(this.sendEmailAlert(alert));
    }

    if (this.telegramConfig.enabled && this.telegramConfig.botToken && this.telegramConfig.chatId) {
      promises.push(this.sendTelegramAlert(alert));
    }

    const results = await Promise.all(promises);

    if (results.some((r) => r)) {
      alert.sent = true;
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert): Promise<boolean> {
    try {
      // Placeholder for email service (SendGrid, Mailgun, etc.)
      console.log(`[AlertSystem] Email sent to ${this.emailConfig.recipient}`);
      console.log(`  Subject: ${alert.title}`);
      console.log(`  Message: ${alert.message}`);

      // In production, integrate with email service:
      // await sendgrid.send({
      //   to: this.emailConfig.recipient,
      //   from: 'alerts@powertrader.ai',
      //   subject: alert.title,
      //   html: this.formatEmailBody(alert),
      // });

      return true;
    } catch (error) {
      console.error("[AlertSystem] Failed to send email:", error);
      return false;
    }
  }

  /**
   * Send Telegram alert
   */
  private async sendTelegramAlert(alert: Alert): Promise<boolean> {
    try {
      const telegramUrl = `https://api.telegram.org/bot${this.telegramConfig.botToken}/sendMessage`;

      const message = `
🤖 *PowerTrader AI Alert*

*${alert.title}*
${alert.message}

Severity: ${alert.severity.toUpperCase()}
Time: ${alert.timestamp.toISOString()}
      `.trim();

      const response = await axios.post(telegramUrl, {
        chat_id: this.telegramConfig.chatId,
        text: message,
        parse_mode: "Markdown",
      });

      console.log(`[AlertSystem] Telegram message sent successfully`);
      return response.status === 200;
    } catch (error) {
      console.error("[AlertSystem] Failed to send Telegram alert:", error);
      return false;
    }
  }

  /**
   * Alert on trade execution
   */
  async alertTrade(tokenIn: string, tokenOut: string, amount: number, profit: number): Promise<void> {
    await this.createAlert(
      "trade",
      "Trade Executed",
      `Traded ${amount} ${tokenIn} for ${tokenOut}. Profit: $${profit.toFixed(2)}`,
      "info"
    );
  }

  /**
   * Alert on withdrawal
   */
  async alertWithdrawal(amount: number, destination: string, txHash: string): Promise<void> {
    await this.createAlert(
      "withdrawal",
      "Profit Withdrawal",
      `Withdrew ${amount} XRP to ${destination}\nTx: ${txHash}`,
      "info"
    );
  }

  /**
   * Alert on profit milestone
   */
  async alertProfitMilestone(totalProfit: number, milestone: number): Promise<void> {
    await this.createAlert(
      "milestone",
      `🎉 Profit Milestone Reached!`,
      `Total profit has reached $${totalProfit.toFixed(2)}! 🚀`,
      "warning"
    );
  }

  /**
   * Alert on error
   */
  async alertError(errorMessage: string): Promise<void> {
    await this.createAlert("error", "Trading Bot Error", errorMessage, "critical");
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(type: string, limit: number = 50): Alert[] {
    return this.alerts.filter((a) => a.type === type).slice(-limit);
  }

  /**
   * Get unsent alerts
   */
  getUnsentAlerts(): Alert[] {
    return this.alerts.filter((a) => !a.sent);
  }

  /**
   * Format email body
   */
  private formatEmailBody(alert: Alert): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>${alert.title}</h2>
          <p>${alert.message}</p>
          <p>
            <strong>Type:</strong> ${alert.type}<br>
            <strong>Severity:</strong> ${alert.severity}<br>
            <strong>Time:</strong> ${alert.timestamp.toISOString()}
          </p>
          <hr>
          <p><small>PowerTrader AI Alerts</small></p>
        </body>
      </html>
    `;
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    sent: number;
    unsent: number;
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const alert of this.alerts) {
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
    }

    return {
      total: this.alerts.length,
      byType,
      bySeverity,
      sent: this.alerts.filter((a) => a.sent).length,
      unsent: this.alerts.filter((a) => !a.sent).length,
    };
  }
}

let alertInstance: AlertSystem | null = null;

export function initializeAlertSystem(): AlertSystem {
  alertInstance = new AlertSystem();
  return alertInstance;
}

export function getAlertSystem(): AlertSystem | null {
  return alertInstance;
}

export function initializeEmail(recipient: string): void {
  const system = alertInstance || initializeAlertSystem();
  system.initializeEmail(recipient);
}

export function initializeTelegram(botToken: string, chatId: string): void {
  const system = alertInstance || initializeAlertSystem();
  system.initializeTelegram(botToken, chatId);
}

export async function alertTrade(tokenIn: string, tokenOut: string, amount: number, profit: number): Promise<void> {
  const system = alertInstance || initializeAlertSystem();
  await system.alertTrade(tokenIn, tokenOut, amount, profit);
}

export async function alertWithdrawal(amount: number, destination: string, txHash: string): Promise<void> {
  const system = alertInstance || initializeAlertSystem();
  await system.alertWithdrawal(amount, destination, txHash);
}

export async function alertProfitMilestone(totalProfit: number, milestone: number): Promise<void> {
  const system = alertInstance || initializeAlertSystem();
  await system.alertProfitMilestone(totalProfit, milestone);
}

export async function alertError(errorMessage: string): Promise<void> {
  const system = alertInstance || initializeAlertSystem();
  await system.alertError(errorMessage);
}

export function getAlertHistory(limit?: number) {
  const system = alertInstance || initializeAlertSystem();
  return system.getAlertHistory(limit);
}

export function getAlertStats() {
  const system = alertInstance || initializeAlertSystem();
  return system.getAlertStats();
}
