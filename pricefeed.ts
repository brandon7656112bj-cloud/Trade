interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: Date;
}

class PriceFeedService {
  private prices: Map<string, PriceData> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializePrices();
    console.log("[PriceFeed] Service initialized");
  }

  private initializePrices(): void {
    const symbols = ["XRP/USD", "XRP/EUR", "XRP/GBP"];
    const basePrice = 2.5;

    symbols.forEach((symbol) => {
      const price = basePrice + (Math.random() * 0.5 - 0.25);
      this.prices.set(symbol, {
        symbol,
        price,
        change24h: Math.random() * 0.2 - 0.1,
        changePercent24h: Math.random() * 10 - 5,
        high24h: price * 1.05,
        low24h: price * 0.95,
        volume24h: Math.random() * 1000000,
        timestamp: new Date(),
      });
    });
  }

  startUpdates(intervalMs: number = 5000): void {
    if (this.updateInterval) {
      console.log("[PriceFeed] Updates already running");
      return;
    }

    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, intervalMs);

    console.log(`[PriceFeed] Started price updates every ${intervalMs}ms`);
  }

  stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log("[PriceFeed] Stopped price updates");
    }
  }

  private updatePrices(): void {
    this.prices.forEach((data: PriceData, symbol: string) => {
      const change = (Math.random() - 0.5) * 0.02;
      const newPrice = data.price * (1 + change);
      const change24h = newPrice - data.price;
      const changePercent24h = (change24h / data.price) * 100;

      this.prices.set(symbol, {
        symbol,
        price: parseFloat(newPrice.toFixed(6)),
        change24h: parseFloat(change24h.toFixed(6)),
        changePercent24h: parseFloat(changePercent24h.toFixed(2)),
        high24h: Math.max(data.high24h, newPrice),
        low24h: Math.min(data.low24h, newPrice),
        volume24h: data.volume24h + Math.random() * 10000,
        timestamp: new Date(),
      });
    });
  }

  getPrice(symbol: string): PriceData | null {
    return this.prices.get(symbol) || null;
  }

  getAllPrices(): PriceData[] {
    const result: PriceData[] = [];
    this.prices.forEach((price: PriceData) => {
      result.push(price);
    });
    return result;
  }

  getPriceHistory(symbol: string, candles: number = 24): PriceData[] {
    const history: PriceData[] = [];
    const basePrice = this.prices.get(symbol)?.price || 2.5;

    for (let i = candles; i > 0; i--) {
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - i);

      const price = basePrice + (Math.random() * 0.3 - 0.15);
      history.push({
        symbol,
        price: parseFloat(price.toFixed(6)),
        change24h: 0,
        changePercent24h: 0,
        high24h: price * 1.02,
        low24h: price * 0.98,
        volume24h: Math.random() * 500000,
        timestamp,
      });
    }

    return history;
  }

  subscribe(symbol: string, callback: (price: PriceData) => void): () => void {
    const interval = setInterval(() => {
      const price = this.getPrice(symbol);
      if (price) {
        callback(price);
      }
    }, 1000);

    return () => clearInterval(interval);
  }

  checkPriceAlert(symbol: string, targetPrice: number, direction: "above" | "below"): boolean {
    const current = this.getPrice(symbol);
    if (!current) return false;

    if (direction === "above") {
      return current.price > targetPrice;
    } else {
      return current.price < targetPrice;
    }
  }

  calculateMA(symbol: string, period: number = 20): number | null {
    const history = this.getPriceHistory(symbol, period);
    if (history.length === 0) return null;

    const sum = history.reduce((acc: number, candle: PriceData) => acc + candle.price, 0);
    return parseFloat((sum / history.length).toFixed(6));
  }

  calculateRSI(symbol: string, period: number = 14): number | null {
    const history = this.getPriceHistory(symbol, period + 1);
    if (history.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < history.length; i++) {
      const change = history[i].price - history[i - 1].price;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return parseFloat(rsi.toFixed(2));
  }

  getMarketSentiment(): { overall: "bullish" | "neutral" | "bearish"; confidence: number } {
    const prices = this.getAllPrices();
    const avgChange = prices.reduce((sum: number, p: PriceData) => sum + p.changePercent24h, 0) / prices.length;

    if (avgChange > 2) {
      return { overall: "bullish", confidence: Math.min(avgChange / 10, 1) };
    } else if (avgChange < -2) {
      return { overall: "bearish", confidence: Math.min(Math.abs(avgChange) / 10, 1) };
    } else {
      return { overall: "neutral", confidence: 0.5 };
    }
  }
}

let priceFeedService: PriceFeedService | null = null;

export function initializePriceFeed(): PriceFeedService {
  priceFeedService = new PriceFeedService();
  priceFeedService.startUpdates(5000);
  return priceFeedService;
}

export function getPriceFeed(): PriceFeedService | null {
  return priceFeedService;
}

export function getCurrentPrice(symbol: string) {
  const feed = priceFeedService;
  if (!feed) return null;
  return feed.getPrice(symbol);
}

export function getAllCurrentPrices() {
  const feed = priceFeedService;
  if (!feed) return [];
  return feed.getAllPrices();
}

export function getPriceHistory(symbol: string, candles?: number) {
  const feed = priceFeedService;
  if (!feed) return [];
  return feed.getPriceHistory(symbol, candles);
}

export function getMarketSentiment() {
  const feed = priceFeedService;
  if (!feed) return null;
  return feed.getMarketSentiment();
}

export function calculateMA(symbol: string, period?: number) {
  const feed = priceFeedService;
  if (!feed) return null;
  return feed.calculateMA(symbol, period);
}

export function calculateRSI(symbol: string, period?: number) {
  const feed = priceFeedService;
  if (!feed) return null;
  return feed.calculateRSI(symbol, period);
}
