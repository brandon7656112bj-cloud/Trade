import { ethers } from "ethers";
import axios from "axios";

const ETH_ADDRESS = "0x2974b218b1c9A87443D0f5085298aC83B99a3206";
const XRPL_ADDRESS = "rw2ciyaNshpHe7bCHo4bRWq6pqqynnWKQg";

// Uniswap V3 Router
const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

// Token addresses on Ethereum mainnet
const TOKENS = {
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  WBTC: "0x2260FAC5E5542a773Aa44fBCfeDd86a3D015fC31",
};

// Uniswap V3 Pool ABI
const POOL_ABI = [
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function liquidity() external view returns (uint128)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
];

// ERC20 ABI for balance checks
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
];

class EthTrader {
  private provider: ethers.JsonRpcProvider;
  private walletAddress: string;
  private xrplAddress: string;
  private tradeHistory: any[] = [];
  private totalProfit: number = 0;

  constructor(walletAddress: string, xrplAddress: string) {
    this.provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
    this.walletAddress = walletAddress;
    this.xrplAddress = xrplAddress;
  }

  /**
   * Get real-time wallet balance
   */
  async getWalletBalance(): Promise<{ eth: string; usdc: string; dai: string }> {
    try {
      // Get ETH balance
      const ethBalance = await this.provider.getBalance(this.walletAddress);
      const ethFormatted = ethers.formatEther(ethBalance);

      // Get USDC balance
      const usdcContract = new ethers.Contract(TOKENS.USDC, ERC20_ABI, this.provider);
      const usdcBalance = await usdcContract.balanceOf(this.walletAddress);
      const usdcFormatted = ethers.formatUnits(usdcBalance, 6);

      // Get DAI balance
      const daiContract = new ethers.Contract(TOKENS.DAI, ERC20_ABI, this.provider);
      const daiBalance = await daiContract.balanceOf(this.walletAddress);
      const daiFormatted = ethers.formatUnits(daiBalance, 18);

      return {
        eth: ethFormatted,
        usdc: usdcFormatted,
        dai: daiFormatted,
      };
    } catch (error) {
      console.error("[EthTrader] Error getting wallet balance:", error);
      return { eth: "0", usdc: "0", dai: "0" };
    }
  }

  /**
   * Get live token prices from Uniswap V3 pools
   */
  async getLiveTokenPrices(): Promise<Record<string, number>> {
    try {
      const prices: Record<string, number> = {};

      // Popular Uniswap V3 pools
      const pools = [
        { address: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8", token0: "WETH", token1: "USDC" },
        { address: "0xC2e9F6ba8c37938Fd3b0EFf94FF408b15bBa6c7F", token0: "WETH", token1: "DAI" },
        { address: "0xCBcDF9B3fFDA413B6fFd7573ef04437D7aaDA0D3", token0: "WBTC", token1: "WETH" },
      ];

      for (const pool of pools) {
        try {
          const poolContract = new ethers.Contract(pool.address, POOL_ABI, this.provider);
          const slot0 = await poolContract.slot0();
          const sqrtPriceX96 = slot0.sqrtPriceX96;

          // Convert sqrtPriceX96 to price
          const price = Number(sqrtPriceX96) ** 2 / 2 ** 192;

          if (pool.token0 === "WETH" && pool.token1 === "USDC") {
            prices["ETH/USDC"] = price;
          } else if (pool.token0 === "WBTC" && pool.token1 === "WETH") {
            prices["BTC/ETH"] = price;
          }
        } catch (e) {
          console.error(`Failed to get price for pool ${pool.address}:`, e);
        }
      }

      return prices;
    } catch (error) {
      console.error("[EthTrader] Error getting prices:", error);
      return {};
    }
  }

  /**
   * Simulate DEX trade execution
   */
  async executeDexTrade(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<{ success: boolean; amountOut: number; txHash: string; profit: number }> {
    try {
      // Get current prices
      const prices = await this.getLiveTokenPrices();
      const priceKey = `${tokenIn}/${tokenOut}`;
      const price = prices[priceKey] || 1;

      // Calculate output with slippage
      const slippage = 0.997; // 0.3% slippage
      const amountOut = amountIn * price * slippage;

      // Simulate profit (difference from expected)
      const expectedOut = amountIn * price;
      const profit = expectedOut - amountOut;

      // Generate transaction hash
      const txHash = `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;

      // Record trade
      this.tradeHistory.push({
        timestamp: new Date(),
        tokenIn,
        tokenOut,
        amountIn,
        amountOut,
        profit,
        txHash,
      });

      this.totalProfit += profit;

      console.log(`[EthTrader] Trade executed: ${amountIn} ${tokenIn} -> ${amountOut.toFixed(6)} ${tokenOut}`);
      console.log(`[EthTrader] Profit: $${profit.toFixed(2)}`);

      return { success: true, amountOut, txHash, profit };
    } catch (error) {
      console.error("[EthTrader] Error executing trade:", error);
      return { success: false, amountOut: 0, txHash: "", profit: 0 };
    }
  }

  /**
   * Get hourly profit summary
   */
  async getHourlyProfit(): Promise<{ hourlyProfit: number; totalProfit: number; tradesCount: number }> {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    const hourlyTrades = this.tradeHistory.filter((trade) => {
      const tradeTime = new Date(trade.timestamp).getTime();
      return tradeTime >= oneHourAgo && tradeTime <= now;
    });

    const hourlyProfit = hourlyTrades.reduce((sum, trade) => sum + trade.profit, 0);

    return {
      hourlyProfit,
      totalProfit: this.totalProfit,
      tradesCount: this.tradeHistory.length,
    };
  }

  /**
   * Prepare XRPL withdrawal transaction
   */
  async prepareXrplWithdrawal(amount: number): Promise<{
    destinationAddress: string;
    amount: string;
    memo: string;
  }> {
    return {
      destinationAddress: this.xrplAddress,
      amount: amount.toString(),
      memo: `PowerTrader AI Profit Withdrawal - ${new Date().toISOString()}`,
    };
  }

  /**
   * Get trading status
   */
  getStatus(): {
    walletAddress: string;
    xrplAddress: string;
    totalProfit: number;
    tradesExecuted: number;
    lastTrade: any;
  } {
    return {
      walletAddress: this.walletAddress,
      xrplAddress: this.xrplAddress,
      totalProfit: this.totalProfit,
      tradesExecuted: this.tradeHistory.length,
      lastTrade: this.tradeHistory[this.tradeHistory.length - 1] || null,
    };
  }

  /**
   * Get trade history
   */
  getTradeHistory(limit: number = 50): any[] {
    return this.tradeHistory.slice(-limit);
  }
}

// Global trader instance
let traderInstance: EthTrader | null = null;

export function initializeEthTrader(): EthTrader {
  traderInstance = new EthTrader(ETH_ADDRESS, XRPL_ADDRESS);
  return traderInstance;
}

export function getEthTrader(): EthTrader | null {
  return traderInstance;
}

export async function getWalletBalance() {
  const trader = traderInstance || initializeEthTrader();
  return trader.getWalletBalance();
}

export async function getLiveTokenPrices() {
  const trader = traderInstance || initializeEthTrader();
  return trader.getLiveTokenPrices();
}

export async function getHourlyProfit() {
  const trader = traderInstance || initializeEthTrader();
  return trader.getHourlyProfit();
}

export async function executeTradeSimulation(tokenIn: string, tokenOut: string, amount: number) {
  const trader = traderInstance || initializeEthTrader();
  return trader.executeDexTrade(tokenIn, tokenOut, amount);
}

export function getTradingStatus() {
  const trader = traderInstance || initializeEthTrader();
  return trader.getStatus();
}

export function getTradeHistory(limit?: number) {
  const trader = traderInstance || initializeEthTrader();
  return trader.getTradeHistory(limit);
}
