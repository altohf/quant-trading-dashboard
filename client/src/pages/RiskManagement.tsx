import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Shield, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Target, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RiskManagement() {
  const { data: todayStats, isLoading: statsLoading, refetch } = trpc.stats.today.useQuery();
  const { data: openPositions, isLoading: positionsLoading } = trpc.positions.open.useQuery();
  const { data: closedPositions, isLoading: closedLoading } = trpc.positions.list.useQuery({ limit: 20, status: "closed" });
  const { data: systemStatus } = trpc.systemStatus.get.useQuery();

  const formatPnl = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatPercent = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "0%";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `${(num * 100).toFixed(1)}%`;
  };

  // Calculate risk metrics
  const maxDailyLoss = 2000; // From config
  const currentDrawdown = parseFloat(systemStatus?.maxDrawdown || "0");
  const drawdownPercent = (currentDrawdown / maxDailyLoss) * 100;
  const dailyPnl = parseFloat(systemStatus?.todayPnl || "0");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Risk Management
          </h1>
          <p className="text-muted-foreground">Gestione del rischio e monitoraggio posizioni</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      {/* Risk Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Daily P&L */}
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">P&L Giornaliero</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold tabular-nums",
              dailyPnl >= 0 ? "text-profit" : "text-loss"
            )}>
              {formatPnl(dailyPnl)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: $400/giorno
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
              {formatPercent(todayStats?.winRate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayStats?.winningTrades || 0}W / {todayStats?.losingTrades || 0}L
            </p>
          </CardContent>
        </Card>

        {/* Total Trades */}
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trade Oggi</CardTitle>
            <Target className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {todayStats?.totalTrades || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Limite: 10 trade/giorno
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
              {formatPnl(currentDrawdown)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Limite: $2,000
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Drawdown Progress */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className={cn(
              "h-5 w-5",
              drawdownPercent > 75 ? "text-loss" : drawdownPercent > 50 ? "text-warning" : "text-muted-foreground"
            )} />
            Utilizzo Limite Drawdown
          </CardTitle>
          <CardDescription>Percentuale del limite giornaliero di perdita utilizzato</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Drawdown Corrente</span>
              <span className="tabular-nums">{formatPnl(currentDrawdown)} / {formatPnl(maxDailyLoss)}</span>
            </div>
            <Progress 
              value={Math.min(drawdownPercent, 100)} 
              className={cn(
                "h-3",
                drawdownPercent > 75 ? "[&>div]:bg-loss" : drawdownPercent > 50 ? "[&>div]:bg-warning" : ""
              )}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className={cn(
                "font-medium",
                drawdownPercent > 75 ? "text-loss" : drawdownPercent > 50 ? "text-warning" : ""
              )}>
                {drawdownPercent.toFixed(1)}% utilizzato
              </span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Open Positions */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Posizioni Aperte ({openPositions?.length || 0})</CardTitle>
          <CardDescription>Posizioni attualmente in corso</CardDescription>
        </CardHeader>
        <CardContent>
          {positionsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-12 bg-muted rounded" />
              ))}
            </div>
          ) : openPositions && openPositions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direzione</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>SL</TableHead>
                  <TableHead>TP</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>Apertura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openPositions.map((pos) => (
                  <TableRow key={pos.id}>
                    <TableCell>
                      <Badge className={pos.direction === "long" ? "bg-profit" : "bg-loss"}>
                        {pos.direction.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{pos.entryPrice}</TableCell>
                    <TableCell className="tabular-nums">{pos.quantity}</TableCell>
                    <TableCell className="tabular-nums text-loss">{pos.stopLoss}</TableCell>
                    <TableCell className="tabular-nums text-profit">{pos.takeProfit}</TableCell>
                    <TableCell className={cn(
                      "tabular-nums font-medium",
                      parseFloat(pos.pnl || "0") >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {formatPnl(pos.pnl)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(pos.openedAt).toLocaleTimeString("it-IT")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessuna posizione aperta</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Win/Loss Stats */}
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle>Statistiche Trade</CardTitle>
            <CardDescription>Performance dei trade di oggi</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ) : todayStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Media Vincita</p>
                    <p className="text-xl font-bold text-profit tabular-nums">
                      {formatPnl(todayStats.avgWin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Media Perdita</p>
                    <p className="text-xl font-bold text-loss tabular-nums">
                      {formatPnl(todayStats.avgLoss)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Miglior Trade</p>
                    <p className="text-xl font-bold text-profit tabular-nums">
                      {formatPnl(todayStats.largestWin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Peggior Trade</p>
                    <p className="text-xl font-bold text-loss tabular-nums">
                      {formatPnl(todayStats.largestLoss)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Nessuna statistica disponibile</p>
            )}
          </CardContent>
        </Card>

        {/* Risk Limits */}
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle>Limiti di Rischio</CardTitle>
            <CardDescription>Parametri di gestione del rischio attivi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Max Perdita Giornaliera</p>
                  <p className="text-sm text-muted-foreground">Limite assoluto per giorno</p>
                </div>
                <p className="text-xl font-bold tabular-nums">$2,000</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Max Trade Giornalieri</p>
                  <p className="text-sm text-muted-foreground">Numero massimo di operazioni</p>
                </div>
                <p className="text-xl font-bold tabular-nums">10</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Max Position Size</p>
                  <p className="text-sm text-muted-foreground">Contratti per posizione</p>
                </div>
                <p className="text-xl font-bold tabular-nums">5</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Rischio per Trade</p>
                  <p className="text-sm text-muted-foreground">Percentuale del capitale</p>
                </div>
                <p className="text-xl font-bold tabular-nums">1%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Closed Positions */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Trade Recenti Chiusi</CardTitle>
          <CardDescription>Ultime posizioni chiuse</CardDescription>
        </CardHeader>
        <CardContent>
          {closedLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-12 bg-muted rounded" />
              ))}
            </div>
          ) : closedPositions && closedPositions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direzione</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Chiusura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedPositions.map((pos) => (
                  <TableRow key={pos.id}>
                    <TableCell>
                      <Badge variant="outline" className={pos.direction === "long" ? "border-profit text-profit" : "border-loss text-loss"}>
                        {pos.direction.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{pos.entryPrice}</TableCell>
                    <TableCell className="tabular-nums">{pos.exitPrice || "-"}</TableCell>
                    <TableCell className="tabular-nums">{pos.quantity}</TableCell>
                    <TableCell className={cn(
                      "tabular-nums font-medium",
                      parseFloat(pos.pnl || "0") >= 0 ? "text-profit" : "text-loss"
                    )}>
                      {formatPnl(pos.pnl)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        pos.closeReason === "tp_hit" ? "border-profit text-profit" :
                        pos.closeReason === "sl_hit" ? "border-loss text-loss" :
                        "border-muted-foreground"
                      }>
                        {pos.closeReason?.toUpperCase() || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {pos.closedAt ? new Date(pos.closedAt).toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun trade chiuso recente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
