import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { LineChart, RefreshCw, TrendingUp, BarChart3, Percent, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart
} from "recharts";

export default function Performance() {
  const { data: statsHistory, isLoading: historyLoading, refetch } = trpc.stats.history.useQuery({ days: 30 });
  const { data: performanceMetrics, isLoading: metricsLoading } = trpc.stats.performance.useQuery({ days: 30 });
  const { data: featureImportance, isLoading: featuresLoading } = trpc.features.importance.useQuery();

  const formatPnl = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Calculate equity curve
  const equityCurve = statsHistory?.slice().reverse().reduce((acc, stat, idx) => {
    const prevEquity = idx > 0 ? acc[idx - 1].equity : 10000; // Starting equity
    const pnl = parseFloat(stat.netPnl || "0");
    acc.push({
      date: new Date(stat.date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }),
      equity: prevEquity + pnl,
      pnl: pnl,
      winRate: parseFloat(stat.winRate || "0") * 100,
      trades: stat.totalTrades,
    });
    return acc;
  }, [] as { date: string; equity: number; pnl: number; winRate: number; trades: number }[]) || [];

  // Calculate summary metrics
  const totalPnl = statsHistory?.reduce((sum, s) => sum + parseFloat(s.netPnl || "0"), 0) || 0;
  const avgWinRate = statsHistory?.length 
    ? statsHistory.reduce((sum, s) => sum + parseFloat(s.winRate || "0"), 0) / statsHistory.length * 100
    : 0;
  const totalTrades = statsHistory?.reduce((sum, s) => sum + (s.totalTrades || 0), 0) || 0;
  const profitableDays = statsHistory?.filter(s => parseFloat(s.netPnl || "0") > 0).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LineChart className="h-8 w-8 text-primary" />
            Performance
          </h1>
          <p className="text-muted-foreground">Analisi delle performance e metriche aggregate</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">P&L Totale (30g)</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold tabular-nums",
              totalPnl >= 0 ? "text-profit" : "text-loss"
            )}>
              {formatPnl(totalPnl)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ultimi 30 giorni
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Win Rate Medio</CardTitle>
            <Percent className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {avgWinRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Media su 30 giorni
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trade Totali</CardTitle>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {totalTrades}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ultimi 30 giorni
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Giorni Profittevoli</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {profitableDays}/{statsHistory?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {statsHistory?.length ? ((profitableDays / statsHistory.length) * 100).toFixed(0) : 0}% dei giorni
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Equity Curve */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
          <CardDescription>Andamento del capitale nel tempo</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="h-80 animate-pulse bg-muted rounded" />
          ) : equityCurve.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis 
                  stroke="var(--muted-foreground)" 
                  fontSize={12}
                  tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "var(--card)", 
                    border: "1px solid var(--border)",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => [formatPnl(value), "Equity"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="equity" 
                  stroke="var(--primary)" 
                  fill="url(#equityGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              Nessun dato disponibile
            </div>
          )}
        </CardContent>
      </Card>

      {/* P&L Distribution and Win Rate */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily P&L */}
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle>P&L Giornaliero</CardTitle>
            <CardDescription>Distribuzione dei profitti/perdite giornalieri</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="h-64 animate-pulse bg-muted rounded" />
            ) : equityCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} />
                  <YAxis 
                    stroke="var(--muted-foreground)" 
                    fontSize={12}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "var(--card)", 
                      border: "1px solid var(--border)",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [formatPnl(value), "P&L"]}
                  />
                  <Bar 
                    dataKey="pnl" 
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>

        {/* Win Rate Over Time */}
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle>Win Rate nel Tempo</CardTitle>
            <CardDescription>Andamento del win rate giornaliero</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="h-64 animate-pulse bg-muted rounded" />
            ) : equityCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsLineChart data={equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} />
                  <YAxis 
                    stroke="var(--muted-foreground)" 
                    fontSize={12}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "var(--card)", 
                      border: "1px solid var(--border)",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Win Rate"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="winRate" 
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Importance */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Feature Importance</CardTitle>
          <CardDescription>Le feature più rilevanti per le decisioni del modello AI</CardDescription>
        </CardHeader>
        <CardContent>
          {featuresLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="animate-pulse h-8 bg-muted rounded" />
              ))}
            </div>
          ) : featureImportance && featureImportance.length > 0 ? (
            <div className="space-y-3">
              {featureImportance.slice(0, 10).map((feature, idx) => {
                const importance = parseFloat(feature.importance) * 100;
                const maxImportance = parseFloat(featureImportance[0].importance) * 100;
                const barWidth = (importance / maxImportance) * 100;
                
                return (
                  <div key={feature.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-5">{idx + 1}.</span>
                        <span className="font-medium">{feature.featureName}</span>
                        <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                          {feature.category}
                        </span>
                      </div>
                      <span className="tabular-nums font-medium">{importance.toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun dato feature importance disponibile</p>
              <p className="text-sm">Genera dati demo dalla sezione Settings</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics Table */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Metriche Dettagliate</CardTitle>
          <CardDescription>Statistiche giornaliere degli ultimi 30 giorni</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-12 bg-muted rounded" />
              ))}
            </div>
          ) : statsHistory && statsHistory.length > 0 ? (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2">Data</th>
                    <th className="text-right py-2 px-2">Trade</th>
                    <th className="text-right py-2 px-2">Win</th>
                    <th className="text-right py-2 px-2">Loss</th>
                    <th className="text-right py-2 px-2">Win Rate</th>
                    <th className="text-right py-2 px-2">P&L Netto</th>
                    <th className="text-right py-2 px-2">Max DD</th>
                  </tr>
                </thead>
                <tbody>
                  {statsHistory.map((stat) => (
                    <tr key={stat.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2">
                        {new Date(stat.date).toLocaleDateString("it-IT", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums">{stat.totalTrades}</td>
                      <td className="text-right py-2 px-2 tabular-nums text-profit">{stat.winningTrades}</td>
                      <td className="text-right py-2 px-2 tabular-nums text-loss">{stat.losingTrades}</td>
                      <td className="text-right py-2 px-2 tabular-nums">
                        {(parseFloat(stat.winRate || "0") * 100).toFixed(0)}%
                      </td>
                      <td className={cn(
                        "text-right py-2 px-2 tabular-nums font-medium",
                        parseFloat(stat.netPnl || "0") >= 0 ? "text-profit" : "text-loss"
                      )}>
                        {formatPnl(parseFloat(stat.netPnl || "0"))}
                      </td>
                      <td className="text-right py-2 px-2 tabular-nums text-loss">
                        {formatPnl(parseFloat(stat.maxDrawdown || "0"))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <LineChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessuna statistica disponibile</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
