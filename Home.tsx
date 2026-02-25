import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

const SUGGESTED_SETTINGS = {
  coins: "BTC,ETH,XRP,BNB,SOL,DOGE,ADA,BCH,LINK,XLM,LTC,AVAX,UNI",
  tradeStartLevel: 3,
  startAllocation: 0.114,
  dcaLevels: [-2.5, -5.0, -10, -20.0, -30.0, -40.0, -50.0],
  dcaMultiplier: 10,
  maxDcaBuys: 2,
  trailingPmStart: 3.0,
  trailingPmWithDca: 1.5,
  trailingGap: 0.25,
};

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [settings, setSettings] = useState(SUGGESTED_SETTINGS);
  const [priceData, setPriceData] = useState<Array<{ time: string; BTC: number; ETH: number; XRP: number }>>([]);
  const [totalProfit, setTotalProfit] = useState("0.00");
  const [tradesCount, setTradesCount] = useState(0);

  // Simulate price data for charts
  useEffect(() => {
    const generatePriceData = () => {
      const data = [];
      for (let i = 0; i < 24; i++) {
        data.push({
          time: `${i}:00`,
          BTC: 45000 + Math.random() * 5000,
          ETH: 2500 + Math.random() * 300,
          XRP: 2.5 + Math.random() * 0.3,
        });
      }
      setPriceData(data);
    };

    generatePriceData();
    const interval = setInterval(generatePriceData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-start bot on load
  useEffect(() => {
    if (isAuthenticated && !isRunning) {
      handleAutoStart();
    }
  }, [isAuthenticated]);

  const handleAutoStart = async () => {
    try {
      setIsRunning(true);
      toast.success("Bot auto-started with suggested settings");
      // Simulate profit updates
      const interval = setInterval(() => {
        setTotalProfit((prev) => (parseFloat(prev) + Math.random() * 10).toFixed(2));
        setTradesCount((prev) => prev + (Math.random() > 0.7 ? 1 : 0));
      }, 5000);
      return () => clearInterval(interval);
    } catch (error) {
      toast.error("Failed to start bot");
    }
  };

  const handleStartBot = async () => {
    try {
      setIsRunning(!isRunning);
      toast.success(isRunning ? "Bot stopped" : "Bot started with settings");
    } catch (error) {
      toast.error("Failed to control bot");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
          <CardHeader>
            <CardTitle>PowerTrader AI</CardTitle>
            <CardDescription className="text-slate-400">Automated Crypto Trading Bot</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 mb-4">Sign in to start trading with AI-powered strategies.</p>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
              <a href="/api/oauth/login">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">PowerTrader AI</h1>
        <p className="text-slate-400">Automated Crypto Trading Dashboard - {isRunning ? "🟢 ACTIVE" : "🔴 IDLE"}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">${totalProfit}</div>
            <p className="text-xs text-slate-500 mt-1">All time earnings</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Hourly Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">${(Math.random() * 100).toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">Last hour</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Bot Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${isRunning ? "text-green-400" : "text-red-400"}`}>
              {isRunning ? "ACTIVE" : "IDLE"}
            </div>
            <p className="text-xs text-slate-500 mt-1">Current state</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-400">{tradesCount}</div>
            <p className="text-xs text-slate-500 mt-1">Executed</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="trading" className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="trading">Trading</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Trading Tab */}
        <TabsContent value="trading" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Price Charts */}
            <Card className="lg:col-span-2 bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle>Live Price Data</CardTitle>
                <CardDescription className="text-slate-400">24h price movements</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={priceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155" }} />
                    <Line type="monotone" dataKey="BTC" stroke="#00FF66" dot={false} />
                    <Line type="monotone" dataKey="ETH" stroke="#00E5FF" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Control Panel */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg">Control Panel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-300">DCA Multiplier</Label>
                  <div className="text-2xl font-bold text-cyan-400 mt-2">{settings.dcaMultiplier}x</div>
                  <Slider
                    value={[settings.dcaMultiplier]}
                    onValueChange={(value) => setSettings({ ...settings, dcaMultiplier: value[0] })}
                    min={1}
                    max={20}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Trade Start Level</Label>
                  <div className="text-2xl font-bold text-cyan-400 mt-2">{settings.tradeStartLevel}</div>
                  <Slider
                    value={[settings.tradeStartLevel]}
                    onValueChange={(value) => setSettings({ ...settings, tradeStartLevel: value[0] })}
                    min={1}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <Button
                    onClick={handleStartBot}
                    className={`w-full ${isRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
                  >
                    {isRunning ? "Stop Bot" : "Start Bot"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profit Chart */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle>Profit Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={priceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155" }} />
                  <Area type="monotone" dataKey="BTC" fill="#00FF66" stroke="#00FF66" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle>Bot Configuration</CardTitle>
              <CardDescription className="text-slate-400">Suggested settings for optimal trading</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-slate-300">Trading Coins</Label>
                <Input
                  value={settings.coins}
                  onChange={(e) => setSettings({ ...settings, coins: e.target.value })}
                  className="mt-2 bg-slate-700 border-slate-600 text-white"
                  placeholder="BTC,ETH,XRP..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Start Allocation %</Label>
                  <Input
                    type="number"
                    value={settings.startAllocation}
                    onChange={(e) => setSettings({ ...settings, startAllocation: parseFloat(e.target.value) })}
                    className="mt-2 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Trailing PM Start %</Label>
                  <Input
                    type="number"
                    value={settings.trailingPmStart}
                    onChange={(e) => setSettings({ ...settings, trailingPmStart: parseFloat(e.target.value) })}
                    className="mt-2 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Trailing PM with DCA %</Label>
                  <Input
                    type="number"
                    value={settings.trailingPmWithDca}
                    onChange={(e) => setSettings({ ...settings, trailingPmWithDca: parseFloat(e.target.value) })}
                    className="mt-2 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Trailing Gap %</Label>
                  <Input
                    type="number"
                    value={settings.trailingGap}
                    onChange={(e) => setSettings({ ...settings, trailingGap: parseFloat(e.target.value) })}
                    className="mt-2 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleStartBot}>
                Save & Apply Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
