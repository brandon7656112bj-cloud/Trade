import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, Zap } from "lucide-react";

export default function ManualTradePanel() {
  const [selectedAsset, setSelectedAsset] = useState("XRP/USD");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [executing, setExecuting] = useState(false);
  const [lastTrade, setLastTrade] = useState<{ type: string; success: boolean; message: string } | null>(null);

  const handleExecuteTrade = async () => {
    if (!amount || !price) {
      alert("Please fill in all fields");
      return;
    }

    setExecuting(true);

    try {
      // Simulate trade execution
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const success = Math.random() > 0.1; // 90% success rate

      setLastTrade({
        type: `${tradeType.toUpperCase()} ${amount} ${selectedAsset}`,
        success,
        message: success ? "Trade executed successfully!" : "Trade failed - insufficient balance",
      });

      if (success) {
        setAmount("");
        setPrice("");
      }
    } catch (error) {
      setLastTrade({
        type: "Error",
        success: false,
        message: "Failed to execute trade",
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Manual Trade Override</h2>
        <p className="text-gray-400">Execute manual trades without stopping the bot</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Execute Trade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Asset Pair</label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XRP/USD">XRP/USD</SelectItem>
                <SelectItem value="XRP/EUR">XRP/EUR</SelectItem>
                <SelectItem value="XRP/GBP">XRP/GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Trade Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Trade Type</label>
              <Select value={tradeType} onValueChange={(v) => setTradeType(v as "buy" | "sell")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Amount (XRP)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium mb-2">Price</label>
            <Input
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              step="0.0001"
              min="0"
            />
          </div>

          {/* Execute Button */}
          <Button
            onClick={handleExecuteTrade}
            disabled={executing || !amount || !price}
            className={`w-full ${tradeType === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
          >
            {executing ? "Executing..." : `${tradeType.toUpperCase()} ${amount || "0"} ${selectedAsset}`}
          </Button>

          {/* Last Trade Result */}
          {lastTrade && (
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${lastTrade.success ? "bg-green-900/30 border border-green-600" : "bg-red-900/30 border border-red-600"}`}
            >
              {lastTrade.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className={`font-semibold ${lastTrade.success ? "text-green-400" : "text-red-400"}`}>{lastTrade.type}</div>
                <div className="text-sm text-gray-300">{lastTrade.message}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Manual Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Manual Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-gray-800 rounded">
              <div>
                <div className="font-semibold text-green-400">BUY 0.5 XRP/USD</div>
                <div className="text-xs text-gray-500">2 minutes ago @ $2.45</div>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-semibold">+$0.12</div>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-800 rounded">
              <div>
                <div className="font-semibold text-red-400">SELL 0.3 XRP/EUR</div>
                <div className="text-xs text-gray-500">15 minutes ago @ €2.28</div>
              </div>
              <div className="text-right">
                <div className="text-red-400 font-semibold">-€0.05</div>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-800 rounded">
              <div>
                <div className="font-semibold text-green-400">BUY 0.8 XRP/GBP</div>
                <div className="text-xs text-gray-500">1 hour ago @ £1.95</div>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-semibold">+£0.08</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bot Status */}
      <Card className="bg-blue-900/20 border border-blue-600">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold">Bot Status: ACTIVE</span>
          </div>
          <p className="text-xs text-gray-400">
            The bot continues trading autonomously while you execute manual trades. Both systems work in parallel without interference.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
