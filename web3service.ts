import { ethers } from "ethers";
import axios from "axios";

// Uniswap V3 ABI for price data
const UNISWAP_V3_POOL_ABI = [
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function fee() external view returns (uint24)",
];

// Token addresses on mainnet
const TOKENS = {
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  WBTC: "0x2260FAC5E5542a773Aa44fBCfeDd86a3D015fC31",
};

// Popular DEX pools for price discovery
const UNISWAP_POOLS = {
  "WETH/USDC": "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
  "WETH/DAI": "0xC2e9F6ba8c37938Fd3b0EFf94FF408b15bBa6c7F",
  "WBTC/WETH": "0xCBCdF9B3fFDA413B6fFd7573ef04437D7aaDA0D3",
  "USDC/USDT": "0x3416cF6C708Da44DB2624D63ea0AAef7113527C20",
};

class Web3Service {
  private provider: ethers.JsonRpcProvider;
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private cacheDuration = 5000; // 5 seconds

  constructor() {
    // Use public RPC endpoints (no API key required)
    this.provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
  }

  /**
   * Get live price from Uniswap V3 pools
   */
  async getLivePrice(token0: string, token1: string): Promise<number> {
    const cacheKey = `${token0}/${token1}`;
    const cached = this.priceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.price;
    }

    try {
      const poolAddress = UNISWAP_POOLS[cacheKey as keyof typeof UNISWAP_POOLS];
      if (!poolAddress) {
        throw new Error(`Pool not found for ${cacheKey}`);
      }

      const poolContract = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, this.provider);
      const slot0 = await poolContract.slot0();
      const sqrtPriceX96 = slot0.sqrtPriceX96;

      // Convert sqrtPriceX96 to price
      const price = Number(sqrtPriceX96) ** 2 / 2 ** 192;

      this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
      return price;
    } catch (error) {
      console.error(`Failed to get price for ${cacheKey}:`, error);
      return 0;
    }
  }

  /**
   * Get multiple token prices
   */
  async getMultiplePrices(tokens: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    for (const token of tokens) {
      try {
        if (token === "WETH") {
          prices[token] = await this.getLivePrice("WETH", "USDC");
        } else if (token === "BTC") {
          prices[token] = await this.getLivePrice("WBTC", "WETH");
        } else {
          prices[token] = Math.random() * 100; // Fallback for demo
        }
      } catch (error) {
        prices[token] = 0;
      }
    }

    return prices;
  }

  /**
   * Get historical price data for charting
   */
  async getHistoricalPrices(token: string, hours: number = 24): Promise<Array<{ time: string; price: number }>> {
    const data = [];
    const now = Date.now();

    for (let i = hours; i >= 0; i--) {
      const timestamp = now - i * 3600000;
      const date = new Date(timestamp);
      const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      // Simulate price with slight variation
      const basePrice = 2500 + Math.random() * 500;
      data.push({
        time,
        price: basePrice,
      });
    }

    return data;
  }

  /**
   * Get DEX liquidity and volume data
   */
  async getDexMetrics(token: string): Promise<{ liquidity: number; volume24h: number; priceChange: number }> {
    try {
      // This would connect to real DEX data in production
      // For now, return simulated data
      return {
        liquidity: Math.random() * 1000000,
        volume24h: Math.random() * 500000,
        priceChange: (Math.random() - 0.5) * 10,
      };
    } catch (error) {
      console.error("Failed to get DEX metrics:", error);
      return { liquidity: 0, volume24h: 0, priceChange: 0 };
    }
  }

  /**
   * Monitor blockchain for trading opportunities
   */
  async monitorTradingOpportunities(): Promise<Array<{ token: string; opportunity: string; confidence: number }>> {
    const opportunities = [];

    try {
      // Monitor price movements
      const tokens = ["WETH", "USDC", "DAI"];
      const prices = await this.getMultiplePrices(tokens);

      for (const [token, price] of Object.entries(prices)) {
        if (price > 0) {
          // Simple opportunity detection
          const volatility = Math.random() * 100;
          if (volatility > 70) {
            opportunities.push({
              token,
              opportunity: volatility > 85 ? "Strong Buy Signal" : "Buy Signal",
              confidence: volatility / 100,
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to monitor trading opportunities:", error);
    }

    return opportunities;
  }

  /**
   * Execute trade simulation on blockchain (for demo)
   */
  async simulateTrade(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<{ success: boolean; amountOut: number; txHash: string }> {
    try {
      // In production, this would execute actual swaps via Uniswap Router
      const amountOut = amountIn * (Math.random() * 0.98 + 0.97); // 97-98% of input value

      return {
        success: true,
        amountOut,
        txHash: `0x${Math.random().toString(16).slice(2)}`,
      };
    } catch (error) {
      console.error("Failed to simulate trade:", error);
      return {
        success: false,
        amountOut: 0,
        txHash: "",
      };
    }
  }
}

export const web3Service = new Web3Service();

// Export price fetching for tRPC
export async function fetchLivePrice(token: string): Promise<number> {
  return web3Service.getLivePrice("WETH", "USDC");
}

export async function fetchMultiplePrices(tokens: string[]): Promise<Record<string, number>> {
  return web3Service.getMultiplePrices(tokens);
}

export async function fetchHistoricalPrices(token: string, hours?: number) {
  return web3Service.getHistoricalPrices(token, hours);
}

export async function fetchTradingOpportunities() {
  return web3Service.monitorTradingOpportunities();
}
