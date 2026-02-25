import { invokeLLM } from "./_core/llm";
import { initializeXRPLTrader, getXRPLBalance, executeXRPLTrade, getXRPLHourlyProfit, sendXRPWithdrawal } from "./xrpltrader";
import { initializeXRPLDex, executeDexTrade } from "./xrpldex";
import { initializeWithdrawalHistory, recordWithdrawal, getWithdrawalStats } from "./withdrawalhistory";
import { initializeRiskManager, canOpenTrade, getRiskMetrics } from "./riskcontrol";
import { simulateWithdrawal, isWithdrawalDue } from "./xrplwithdraw";
import { initializeFundedWallet } from "./fundedwallet";
import { initializeWalletMonitor, recordWalletSnapshot, recordFundingAttempt } from "./walletmonitor";
import { initializeMultiStrategy, generateCombinedSignals } from "./multistrategies";
import { initializeAlertSystem, alertTrade, alertWithdrawal, alertProfitMilestone, alertError } from "./alertsystem";
import { initializeEarningsWithdrawal, processAutomaticWithdrawal, getTotalEarningsWithdrawn } from "./earningswithdrawal";

class AutomatedTradingBot {
  private isRunning = false;
  private tradingInterval: NodeJS.Timeout | null = null;
  private withdrawalInterval: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log("[TradingBot] Starting automated trading bot...");

    // Initialize funded wallet
    console.log("[TradingBot] Initializing funded wallet...");
    const fundedWallet = await initializeFundedWallet();
    console.log(`[TradingBot] Funded wallet ready: ${fundedWallet.address}`);
    console.log(`[TradingBot] Balance: ${fundedWallet.balance} ETH`);

    // Initialize XRPL trader for XRP
    initializeXRPLTrader();

    // Initialize XRPL DEX for real trading
    initializeXRPLDex();

    // Initialize withdrawal history tracking
    initializeWithdrawalHistory();

    // Initialize risk management
    initializeRiskManager({
      maxPositionSize: 0.05,
      maxDailyLoss: 0.1,
      maxDrawdown: 0.15,
      stopLossPercent: 0.02,
      takeProfitPercent: 0.05,
      maxOpenPositions: 5,
    });

    // Initialize wallet monitor
    initializeWalletMonitor(fundedWallet.address);
    recordFundingAttempt(fundedWallet.funded, fundedWallet.balance);

    // Initialize multi-strategy trader
    initializeMultiStrategy();

    // Initialize alert system
    initializeAlertSystem();

    // Initialize earnings withdrawal
    initializeEarningsWithdrawal({
      ethAddress: "0x2974b218b1c9A87443D0f5085298aC83B99a3206",
      xrpAddress: "rw2ciyaNshpHe7bCHo4bRWq6pqqynnWKQg",
      withdrawalInterval: 3600000,
      minWithdrawalAmount: 0.001,
    });

    // Start trading loop (every 2 minutes for aggressive trading)
    this.tradingInterval = setInterval(() => {
      this.executeTradingCycle();
    }, 120000); // 2 minutes

    // Start withdrawal loop (check every 30 seconds for fast withdrawals)
    this.withdrawalInterval = setInterval(() => {
      this.checkAndWithdraw();
    }, 30000); // 30 seconds

    // Execute first cycle immediately
    await this.executeTradingCycle();
  }

  stop(): void {
    this.isRunning = false;
    if (this.tradingInterval) clearInterval(this.tradingInterval);
    if (this.withdrawalInterval) clearInterval(this.withdrawalInterval);
    console.log("[TradingBot] Bot stopped");
  }

  private async executeTradingCycle(): Promise<void> {
    try {
      console.log("[TradingBot] Executing trading cycle...");

      // Record wallet snapshot
      await recordWalletSnapshot();

      // Get wallet balance
      const balance = await getXRPLBalance();
      console.log("[TradingBot] Wallet balance:", balance);

      // Generate signals from multiple strategies
      const signals = await generateCombinedSignals({ eth: balance.xrp.toString(), usdc: "0", dai: "0" }, {});

      // Execute trades based on signals with risk controls
      for (const signal of signals) {
        if (signal.confidence > 0.6) {
          // Check risk controls
          const riskCheck = canOpenTrade(balance.xrp, signal.amount, signal.tokenIn, signal.tokenOut);
          if (!riskCheck.allowed) {
            console.log(`[TradingBot] Trade blocked: ${riskCheck.reason}`);
            continue;
          }

          console.log(`[TradingBot] Executing ${signal.strategy} trade: ${signal.action} ${signal.amount} ${signal.tokenIn}`);

          // Execute DEX trade
          const result = await executeDexTrade(signal.tokenIn, signal.tokenOut, signal.amount);

          if (result) {
            const profit = result.amountOut - result.amountIn;
            console.log(`[TradingBot] Trade successful! Profit: ${profit.toFixed(6)} XRP`);
            await alertTrade(signal.tokenIn, signal.tokenOut, signal.amount, profit);
          }
        }
      }

      // Log hourly profit
      const hourlyProfit = await getXRPLHourlyProfit();
      console.log("[TradingBot] Hourly profit:", hourlyProfit);

      // Check for profit milestones
      if (hourlyProfit.totalProfit > 100 && hourlyProfit.totalProfit % 100 < 10) {
        await alertProfitMilestone(hourlyProfit.totalProfit, 100);
      }

      // Process automatic XRP withdrawals
      if (hourlyProfit.hourlyProfit > 0.001) {
        const txHash = await sendXRPWithdrawal("rw2ciyaNshpHe7bCHo4bRWq6pqqynnWKQg", hourlyProfit.hourlyProfit);
        if (txHash) {
          recordWithdrawal(hourlyProfit.hourlyProfit, "XRP", "rw2ciyaNshpHe7bCHo4bRWq6pqqynnWKQg", txHash);
        }
      }

      // Log risk metrics
      const riskMetrics = getRiskMetrics();
      console.log("[TradingBot] Risk metrics:", riskMetrics);

      // Log withdrawal statistics
      const withdrawalStats = getWithdrawalStats();
      console.log("[TradingBot] Withdrawal stats:", withdrawalStats);

      // Log total earnings withdrawn
      const totalEarnings = getTotalEarningsWithdrawn();
      console.log("[TradingBot] Total earnings withdrawn:", totalEarnings);
    } catch (error) {
      console.error("[TradingBot] Error in trading cycle:", error);
      await alertError(String(error));
    }
  }

  private async analyzeMarketWithAI(
    prices: Record<string, number>,
    balance: { eth: string; usdc: string; dai: string }
  ): Promise<
    Array<{
      action: string;
      tokenIn: string;
      tokenOut: string;
      amount: number;
      confidence: number;
    }>
  > {
    try {
      const priceList = Object.entries(prices)
        .map(([pair, price]) => `${pair}: $${price.toFixed(2)}`)
        .join("\n");

      const balanceInfo = `ETH: ${balance.eth}, USDC: ${balance.usdc}, DAI: ${balance.dai}`;

      const prompt = `Analyze these Ethereum DEX prices and suggest 2-3 profitable trades:

Prices:
${priceList}

Wallet Balance:
${balanceInfo}

Suggest trades as JSON: [{"action": "BUY"|"SELL", "tokenIn": "ETH"|"USDC"|"DAI", "tokenOut": "USDC"|"DAI"|"ETH", "amount": number, "confidence": 0-1}]`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a crypto trading AI. Analyze DEX prices and suggest profitable trades. Return only valid JSON array.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0]?.message.content;
      if (!content) return [];

      const contentStr = typeof content === "string" ? content : "";
      const jsonMatch = contentStr.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      console.error("[TradingBot] Error analyzing market:", error);
      return [];
    }
  }

  private async checkAndWithdraw(): Promise<void> {
    try {
      // Check if withdrawal is due
      const profit = await getXRPLHourlyProfit();

      if (profit.hourlyProfit > 0.001) {
        console.log(`[TradingBot] Hourly withdrawal due. Profit: ${profit.hourlyProfit.toFixed(6)} XRP`);

        // Send XRP withdrawal
        const withdrawal = await sendXRPWithdrawal("rw2ciyaNshpHe7bCHo4bRWq6pqqynnWKQg", profit.hourlyProfit);

        if (withdrawal) {
          console.log(`[TradingBot] Withdrawal successful!`);
          console.log(`[TradingBot] Amount: ${profit.hourlyProfit.toFixed(6)} XRP`);
          console.log(`[TradingBot] Destination: rw2ciyaNshpHe7bCHo4bRWq6pqqynnWKQg`);
          console.log(`[TradingBot] Tx Hash: ${withdrawal}`);
          await alertWithdrawal(profit.hourlyProfit, "rw2ciyaNshpHe7bCHo4bRWq6pqqynnWKQg", withdrawal);
        }
      }
    } catch (error) {
      console.error("[TradingBot] Error in withdrawal check:", error);
    }
  }

  getStatus(): {
    isRunning: boolean;
    startTime: string;
  } {
    return {
      isRunning: this.isRunning,
      startTime: new Date().toISOString(),
    };
  }
}

// Global bot instance
let botInstance: AutomatedTradingBot | null = null;

export function initializeBot(): AutomatedTradingBot {
  if (!botInstance) {
    botInstance = new AutomatedTradingBot();
  }
  return botInstance;
}

export async function startTradingBot(): Promise<void> {
  const bot = initializeBot();
  await bot.start();
}

export function stopTradingBot(): void {
  if (botInstance) {
    botInstance.stop();
  }
}

export function getBotStatus() {
  if (!botInstance) {
    return { isRunning: false, startTime: null };
  }
  return botInstance.getStatus();
}
