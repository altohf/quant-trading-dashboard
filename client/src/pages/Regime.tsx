import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BarChart3, RefreshCw, TrendingUp, TrendingDown, Activity, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

export default function Regime() {
  const { data: currentRegime, isLoading: regimeLoading, refetch } = trpc.regime.current.useQuery();
  const { data: regimeHistory, isLoading: historyLoading } = trpc.regime.history.useQuery({ limit: 50 });

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case "trend_up": return "#22c55e";
      case "trend_down": return "#ef4444";
      case "high_volatility": return "#f59e0b";
      case "low_volatility": return "#3b82f6";
      case "mean_reversion": return "#8b5cf6";
      default: return "#6b7280";
    }
  };

  const getRegimeLabel = (regime: string) => {
    switch (regime) {
      case "trend_up": return "Trend Rialzista";
      case "trend_down": return "Trend Ribassista";
      case "high_volatility": return "Alta Volatilità";
      case "low_volatility": return "Bassa Volatilità";
      case "mean_reversion": return "Mean Reversion";
      default: return "Sconosciuto";
    }
  };

  const getRegimeIcon = (regime: string) => {
    switch (regime) {
      case "trend_up": return <TrendingUp className="h-6 w-6" />;
      case "trend_down": return <TrendingDown className="h-6 w-6" />;
      case "high_volatility": return <Zap className="h-6 w-6" />;
      case "low_volatility": return <Activity className="h-6 w-6" />;
      case "mean_reversion": return <BarChart3 className="h-6 w-6" />;
      default: return <BarChart3 className="h-6 w-6" />;
    }
  };

  const formatPercent = (value: string | number | null) => {
    if (value === null) return "0%";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `${(num * 100).toFixed(1)}%`;
  };

  // Prepare chart data
  const chartData = regimeHistory?.slice().reverse().map((r, idx) => ({
    index: idx,
    confidence: parseFloat(r.confidence) * 100,
    vix: parseFloat(r.vixLevel || "0"),
    gex: parseFloat(r.gexLevel || "0") / 1e9,
    regime: r.regime,
    timestamp: new Date(r.timestamp).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
  })) || [];

  // Count regime distribution
  const regimeDistribution = regimeHistory?.reduce((acc, r) => {
    acc[r.regime] = (acc[r.regime] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Regime di Mercato
          </h1>
          <p className="text-muted-foreground">Monitoraggio del regime corrente e storico transizioni</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      {/* Current Regime Card */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Regime Corrente</CardTitle>
          <CardDescription>Stato attuale del mercato rilevato dall'Hidden Markov Model</CardDescription>
        </CardHeader>
        <CardContent>
          {regimeLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ) : currentRegime ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="col-span-2">
                <div 
                  className="flex items-center gap-4 p-6 rounded-lg border-2"
                  style={{ borderColor: getRegimeColor(currentRegime.regime) }}
                >
                  <div 
                    className="p-4 rounded-full"
                    style={{ backgroundColor: `${getRegimeColor(currentRegime.regime)}20` }}
                  >
                    <span style={{ color: getRegimeColor(currentRegime.regime) }}>
                      {getRegimeIcon(currentRegime.regime)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Regime Attivo</p>
                    <p 
                      className="text-3xl font-bold"
                      style={{ color: getRegimeColor(currentRegime.regime) }}
                    >
                      {getRegimeLabel(currentRegime.regime)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Confidenza</p>
                  <p className="text-2xl font-bold tabular-nums">{formatPercent(currentRegime.confidence)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durata</p>
                  <p className="text-2xl font-bold tabular-nums">{currentRegime.duration || 0} barre</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">VIX Level</p>
                  <p className="text-2xl font-bold tabular-nums">{currentRegime.vixLevel || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GEX Level</p>
                  <p className={cn(
                    "text-2xl font-bold tabular-nums",
                    parseFloat(currentRegime.gexLevel || "0") >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {currentRegime.gexLevel ? `$${(parseFloat(currentRegime.gexLevel) / 1e9).toFixed(2)}B` : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Nessun dato regime disponibile</p>
          )}
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Confidence Over Time */}
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle>Confidenza nel Tempo</CardTitle>
            <CardDescription>Andamento della confidenza del regime</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="h-64 animate-pulse bg-muted rounded" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="timestamp" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "var(--card)", 
                      border: "1px solid var(--border)",
                      borderRadius: "8px"
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="confidence" 
                    stroke="var(--primary)" 
                    fill="var(--primary)" 
                    fillOpacity={0.2}
                    name="Confidenza %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>

        {/* VIX Over Time */}
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle>VIX nel Tempo</CardTitle>
            <CardDescription>Andamento dell'indice di volatilità</CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="h-64 animate-pulse bg-muted rounded" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="timestamp" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "var(--card)", 
                      border: "1px solid var(--border)",
                      borderRadius: "8px"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="vix" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={false}
                    name="VIX"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Regime Distribution */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Distribuzione Regimi</CardTitle>
          <CardDescription>Frequenza dei diversi regimi nelle ultime osservazioni</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {["trend_up", "trend_down", "mean_reversion", "high_volatility", "low_volatility"].map((regime) => (
              <div 
                key={regime}
                className="p-4 rounded-lg border"
                style={{ borderColor: `${getRegimeColor(regime)}50` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getRegimeColor(regime) }}
                  />
                  <span className="text-sm font-medium">{getRegimeLabel(regime)}</span>
                </div>
                <p className="text-2xl font-bold tabular-nums">
                  {regimeDistribution[regime] || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {regimeHistory?.length ? 
                    `${((regimeDistribution[regime] || 0) / regimeHistory.length * 100).toFixed(1)}%` 
                    : "0%"
                  }
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regime History Table */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Storico Transizioni</CardTitle>
          <CardDescription>Ultime transizioni di regime</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-12 bg-muted rounded" />
              ))}
            </div>
          ) : regimeHistory && regimeHistory.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {regimeHistory.map((r, idx) => (
                <div 
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-2 h-8 rounded-full"
                      style={{ backgroundColor: getRegimeColor(r.regime) }}
                    />
                    <div>
                      <p className="font-medium" style={{ color: getRegimeColor(r.regime) }}>
                        {getRegimeLabel(r.regime)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.timestamp).toLocaleString("it-IT")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-muted-foreground">Confidenza</p>
                      <p className="font-medium tabular-nums">{formatPercent(r.confidence)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Durata</p>
                      <p className="font-medium tabular-nums">{r.duration || 0} barre</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessuno storico regime disponibile</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
