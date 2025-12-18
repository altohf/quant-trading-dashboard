import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Target,
  Percent,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: systemStatus, isLoading: statusLoading, refetch: refetchStatus } = trpc.systemStatus.get.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  const { data: latestSignal, isLoading: signalLoading } = trpc.signals.latest.useQuery(undefined, {
    refetchInterval: 30000,
  });
  
  const { data: latestRegime, isLoading: regimeLoading } = trpc.regime.current.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const formatPnl = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(num);
    return formatted;
  };

  const formatPercent = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "0%";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `${(num * 100).toFixed(1)}%`;
  };

  const getRegimeColor = (regime: string | undefined) => {
    switch (regime) {
      case "trend_up": return "text-profit";
      case "trend_down": return "text-loss";
      case "high_volatility": return "text-warning";
      case "mean_reversion": return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  const getRegimeLabel = (regime: string | undefined) => {
    switch (regime) {
      case "trend_up": return "Trend Rialzista";
      case "trend_down": return "Trend Ribassista";
      case "high_volatility": return "Alta Volatilità";
      case "low_volatility": return "Bassa Volatilità";
      case "mean_reversion": return "Mean Reversion";
      default: return "Sconosciuto";
    }
  };

  const getSignalColor = (signalType: string | undefined) => {
    switch (signalType) {
      case "strong_buy": return "bg-profit text-white";
      case "buy": return "bg-profit/70 text-white";
      case "strong_sell": return "bg-loss text-white";
      case "sell": return "bg-loss/70 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSignalLabel = (signalType: string | undefined) => {
    switch (signalType) {
      case "strong_buy": return "STRONG BUY";
      case "buy": return "BUY";
      case "strong_sell": return "STRONG SELL";
      case "sell": return "SELL";
      case "hold": return "HOLD";
      default: return "N/A";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Panoramica del sistema di trading AI</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchStatus()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      {/* System Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* System Status */}
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stato Sistema</CardTitle>
            {systemStatus?.isOnline ? (
              <CheckCircle2 className="h-5 w-5 text-profit" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-warning" />
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-3 w-3 rounded-full",
                systemStatus?.isOnline ? "bg-profit pulse-live" : "bg-warning"
              )} />
              <span className="text-2xl font-bold">
                {systemStatus?.isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {systemStatus?.isTradingHours ? "Orario di trading attivo" : "Fuori orario di trading"}
            </p>
          </CardContent>
        </Card>

        {/* Today's P&L */}
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">P&L Giornaliero</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold tabular-nums",
              parseFloat(systemStatus?.todayPnl || "0") >= 0 ? "text-profit" : "text-loss"
            )}>
              {formatPnl(systemStatus?.todayPnl)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {systemStatus?.todayTrades || 0} trade oggi
            </p>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Percent className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatPercent(systemStatus?.todayWinRate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Oggi
            </p>
          </CardContent>
        </Card>

        {/* Max Drawdown */}
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-loss">
              {formatPnl(systemStatus?.maxDrawdown)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {systemStatus?.openPositionsCount || 0} posizioni aperte
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Latest Signal */}
        <Card className="bg-card/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Ultimo Segnale
              </CardTitle>
              {latestSignal && (
                <Badge className={getSignalColor(latestSignal.signalType)}>
                  {getSignalLabel(latestSignal.signalType)}
                </Badge>
              )}
            </div>
            <CardDescription>
              Segnale più recente generato dal sistema AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signalLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ) : latestSignal ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Confidenza</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatPercent(latestSignal.confidence)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Regime</p>
                    <p className={cn("text-lg font-semibold", getRegimeColor(latestSignal.regime))}>
                      {getRegimeLabel(latestSignal.regime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Take Profit</p>
                    <p className="text-lg font-semibold tabular-nums text-profit">
                      {latestSignal.suggestedTp} ticks
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stop Loss</p>
                    <p className="text-lg font-semibold tabular-nums text-loss">
                      {latestSignal.suggestedSl} ticks
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(latestSignal.timestamp).toLocaleString("it-IT")}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Nessun segnale disponibile</p>
            )}
          </CardContent>
        </Card>

        {/* Current Regime */}
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Regime di Mercato
            </CardTitle>
            <CardDescription>
              Stato attuale del mercato rilevato dall'HMM
            </CardDescription>
          </CardHeader>
          <CardContent>
            {regimeLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-8 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            ) : latestRegime ? (
              <div className="space-y-4">
                <div className={cn("text-3xl font-bold", getRegimeColor(latestRegime.regime))}>
                  {getRegimeLabel(latestRegime.regime)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Confidenza</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatPercent(latestRegime.confidence)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Durata</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {latestRegime.duration || 0} barre
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">VIX</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {latestRegime.vixLevel || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">GEX</p>
                    <p className={cn(
                      "text-lg font-semibold tabular-nums",
                      parseFloat(latestRegime.gexLevel || "0") >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {latestRegime.gexLevel ? `$${(parseFloat(latestRegime.gexLevel) / 1e9).toFixed(2)}B` : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Ultimo aggiornamento: {new Date(latestRegime.timestamp).toLocaleString("it-IT")}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Nessun dato regime disponibile</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Azioni Rapide</CardTitle>
          <CardDescription>Accesso veloce alle funzionalità principali</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <a href="/signals">
                <Activity className="h-6 w-6 text-primary" />
                <span>Storico Segnali</span>
              </a>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <a href="/optimization">
                <Target className="h-6 w-6 text-primary" />
                <span>Ottimizzazione 3D</span>
              </a>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <a href="/risk">
                <TrendingUp className="h-6 w-6 text-primary" />
                <span>Risk Management</span>
              </a>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
              <a href="/performance">
                <BarChart3 className="h-6 w-6 text-primary" />
                <span>Performance</span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
