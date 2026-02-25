import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function PriceTicker() {
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching price data
    const mockPrices: PriceData[] = [
      {
        symbol: "XRP/USD",
        price: 2.45,
        change24h: 0.12,
        changePercent24h: 5.15,
        high24h: 2.51,
        low24h: 2.32,
        volume24h: 850000,
        timestamp: new Date(),
      },
      {
        symbol: "XRP/EUR",
        price: 2.28,
        change24h: 0.08,
        changePercent24h: 3.62,
        high24h: 2.35,
        low24h: 2.18,
        volume24h: 620000,
        timestamp: new Date(),
      },
      {
        symbol: "XRP/GBP",
        price: 1.95,
        change24h: -0.05,
        changePercent24h: -2.50,
        high24h: 2.02,
        low24h: 1.88,
        volume24h: 440000,
        timestamp: new Date(),
      },
    ];

    setPrices(mockPrices);
    setLoading(false);

    // Simulate real-time updates
    const interval = setInterval(() => {
      setPrices((prev) =>
        prev.map((p) => ({
          ...p,
          price: p.price + (Math.random() - 0.5) * 0.05,
          changePercent24h: p.changePercent24h + (Math.random() - 0.5) * 0.5,
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading prices...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-4">Live Price Feed</h2>
        <p className="text-gray-400 mb-4">Real-time XRP pair prices with 24h statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {prices.map((price) => (
          <Card key={price.symbol} className="bg-gradient-to-br from-gray-900 to-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{price.symbol}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Price */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Current Price</span>
                <span className="text-2xl font-bold text-cyan-400">${price.price.toFixed(4)}</span>
              </div>

              {/* 24h Change */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">24h Change</span>
                <div className={`flex items-center gap-1 ${price.changePercent24h > 0 ? "text-green-500" : "text-red-500"}`}>
                  {price.changePercent24h > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="font-semibold">
                    {price.changePercent24h > 0 ? "+" : ""}
                    {price.changePercent24h.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* High/Low */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-800 p-2 rounded">
                  <span className="text-gray-500 text-xs">24h High</span>
                  <div className="text-green-400 font-semibold">${price.high24h.toFixed(4)}</div>
                </div>
                <div className="bg-gray-800 p-2 rounded">
                  <span className="text-gray-500 text-xs">24h Low</span>
                  <div className="text-red-400 font-semibold">${price.low24h.toFixed(4)}</div>
                </div>
              </div>

              {/* Volume */}
              <div className="bg-gray-800 p-2 rounded">
                <span className="text-gray-500 text-xs">24h Volume</span>
                <div className="text-blue-400 font-semibold">${(price.volume24h / 1000000).toFixed(2)}M</div>
              </div>

              {/* Price Bar */}
              <div className="mt-4">
                <div className="bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${price.changePercent24h > 0 ? "bg-green-500" : "bg-red-500"}`}
                    style={{
                      width: `${Math.min(Math.abs(price.changePercent24h) * 10, 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Last Updated */}
              <div className="text-xs text-gray-500 text-center mt-2">
                Updated: {price.timestamp.toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Market Sentiment */}
      <Card className="bg-gradient-to-r from-blue-900 to-purple-900">
        <CardHeader>
          <CardTitle>Market Sentiment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-green-400">↑</div>
              <div className="text-sm text-gray-300">Bullish</div>
              <div className="text-xs text-gray-500">67%</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-400">→</div>
              <div className="text-sm text-gray-300">Neutral</div>
              <div className="text-xs text-gray-500">20%</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-400">↓</div>
              <div className="text-sm text-gray-300">Bearish</div>
              <div className="text-xs text-gray-500">13%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
