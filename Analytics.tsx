import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, TrendingUp, TrendingDown, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  roi: number;
  cumulativeReturn: number;
}

interface DailyPerformance {
  date: string;
  profit: number;
  trades: number;
  winRate: number;
}

interface StrategyPerformance {
  strategy: string;
  trades: number;
  winRate: number;
  totalProfit: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export default function Analytics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [dailyData, setDailyData] = useState<DailyPerformance[]>([]);
  const [strategyData, setStrategyData] = useState<StrategyPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching analytics data
    const mockMetrics: PerformanceMetrics = {
      totalTrades: 24,
      winningTrades: 18,
      losingTrades: 6,
      winRate: 0.75,
      totalProfit: 2.45,
      totalLoss: 0.62,
      netProfit: 1.83,
      averageWin: 0.136,
      averageLoss: 0.103,
      profitFactor: 3.95,
      sharpeRatio: 2.34,
      maxDrawdown: 8.5,
      roi: 36.6,
      cumulativeReturn: 1.83,
    };

    const mockDaily: DailyPerformance[] = [
      { date: "Day 1", profit: 0.25, trades: 3, winRate: 0.67 },
      { date: "Day 2", profit: 0.18, trades: 2, winRate: 1.0 },
      { date: "Day 3", profit: -0.12, trades: 2, winRate: 0.5 },
      { date: "Day 4", profit: 0.42, trades: 4, winRate: 0.75 },
      { date: "Day 5", profit: 0.35, trades: 3, winRate: 0.67 },
      { date: "Day 6", profit: 0.28, trades: 5, winRate: 0.8 },
      { date: "Day 7", profit: 0.47, trades: 5, winRate: 0.8 },
    ];

    const mockStrategies: StrategyPerformance[] = [
      { strategy: "DCA", trades: 12, winRate: 0.83, totalProfit: 1.2, sharpeRatio: 2.8, maxDrawdown: 5.2 },
      { strategy: "Momentum", trades: 8, winRate: 0.63, totalProfit: 0.5, sharpeRatio: 1.5, maxDrawdown: 12.1 },
      { strategy: "Grid", trades: 4, winRate: 0.75, totalProfit: 0.13, sharpeRatio: 1.2, maxDrawdown: 3.8 },
    ];

    setMetrics(mockMetrics);
    setDailyData(mockDaily);
    setStrategyData(mockStrategies);
    setLoading(false);
  }, []);

  const handleExportJSON = () => {
    const data = { metrics, dailyData, strategyData, exportDate: new Date() };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Profit", "Trades", "Win Rate"];
    const rows = dailyData.map((d) => [d.date, d.profit.toFixed(6), d.trades, (d.winRate * 100).toFixed(2) + "%"]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="p-8 text-center">Loading analytics...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Analytics</h1>
          <p className="text-gray-400 mt-2">Comprehensive trading metrics and strategy analysis</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportJSON} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{((metrics?.winRate || 0) * 100).toFixed(1)}%</div>
            <p className="text-xs text-gray-500 mt-1">{metrics?.winningTrades} wins / {metrics?.totalTrades} trades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Sharpe Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{metrics?.sharpeRatio.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Risk-adjusted returns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Max Drawdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{metrics?.maxDrawdown.toFixed(2)}%</div>
            <p className="text-xs text-gray-500 mt-1">Peak to trough decline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{metrics?.roi.toFixed(2)}%</div>
            <p className="text-xs text-gray-500 mt-1">Return on investment</p>
          </CardContent>
        </Card>
      </div>

      {/* Profit/Loss Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              {metrics?.totalProfit.toFixed(6)} XRP
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500 flex items-center gap-2">
              <TrendingDown className="w-6 h-6" />
              {metrics?.totalLoss.toFixed(6)} XRP
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-500 flex items-center gap-2">
              <Zap className="w-6 h-6" />
              {metrics?.netProfit.toFixed(6)} XRP
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Performance</CardTitle>
          <CardDescription>7-day profit and loss breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="profit" fill="#10b981" name="Daily Profit (XRP)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cumulative Profit Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cumulative Returns</CardTitle>
          <CardDescription>Total profit accumulation over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={dailyData.map((d, i) => ({
                ...d,
                cumulative: dailyData.slice(0, i + 1).reduce((sum, x) => sum + x.profit, 0),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cumulative" stroke="#3b82f6" name="Cumulative Profit (XRP)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Strategy Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy Performance</CardTitle>
          <CardDescription>Comparison of different trading strategies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-4">Strategy</th>
                  <th className="text-center py-2 px-4">Trades</th>
                  <th className="text-center py-2 px-4">Win Rate</th>
                  <th className="text-center py-2 px-4">Profit</th>
                  <th className="text-center py-2 px-4">Sharpe</th>
                  <th className="text-center py-2 px-4">Max DD</th>
                </tr>
              </thead>
              <tbody>
                {strategyData.map((strategy) => (
                  <tr key={strategy.strategy} className="border-b border-gray-800 hover:bg-gray-900">
                    <td className="py-3 px-4 font-medium">{strategy.strategy}</td>
                    <td className="text-center py-3 px-4">{strategy.trades}</td>
                    <td className="text-center py-3 px-4 text-green-500">{(strategy.winRate * 100).toFixed(1)}%</td>
                    <td className="text-center py-3 px-4 text-blue-500">{strategy.totalProfit.toFixed(6)} XRP</td>
                    <td className="text-center py-3 px-4 text-purple-500">{strategy.sharpeRatio.toFixed(2)}</td>
                    <td className="text-center py-3 px-4 text-red-500">{strategy.maxDrawdown.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy Distribution</CardTitle>
          <CardDescription>Trades by strategy</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={strategyData}
                dataKey="trades"
                nameKey="strategy"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                <Cell fill="#3b82f6" />
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
