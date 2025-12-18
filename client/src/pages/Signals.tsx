import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Activity, Filter, Search, RefreshCw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Signals() {
  const [signalTypeFilter, setSignalTypeFilter] = useState<string>("all");
  const [minConfidence, setMinConfidence] = useState<string>("");
  
  const { data: signals, isLoading, refetch } = trpc.signals.list.useQuery({
    limit: 100,
    signalType: signalTypeFilter !== "all" ? signalTypeFilter : undefined,
    minConfidence: minConfidence ? parseFloat(minConfidence) / 100 : undefined,
  });

  const getSignalColor = (signalType: string) => {
    switch (signalType) {
      case "strong_buy": return "bg-profit text-white";
      case "buy": return "bg-profit/70 text-white";
      case "strong_sell": return "bg-loss text-white";
      case "sell": return "bg-loss/70 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getSignalLabel = (signalType: string) => {
    switch (signalType) {
      case "strong_buy": return "STRONG BUY";
      case "buy": return "BUY";
      case "strong_sell": return "STRONG SELL";
      case "sell": return "SELL";
      case "hold": return "HOLD";
      default: return signalType;
    }
  };

  const getRegimeLabel = (regime: string) => {
    switch (regime) {
      case "trend_up": return "Trend ↑";
      case "trend_down": return "Trend ↓";
      case "high_volatility": return "High Vol";
      case "low_volatility": return "Low Vol";
      case "mean_reversion": return "Mean Rev";
      default: return regime;
    }
  };

  const formatPercent = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `${(num * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Storico Segnali
          </h1>
          <p className="text-muted-foreground">Tutti i segnali generati dal sistema AI</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <label className="text-sm text-muted-foreground mb-1 block">Tipo Segnale</label>
              <Select value={signalTypeFilter} onValueChange={setSignalTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="strong_buy">Strong Buy</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="hold">Hold</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="strong_sell">Strong Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <label className="text-sm text-muted-foreground mb-1 block">Confidenza Min (%)</label>
              <Input
                type="number"
                placeholder="es. 70"
                value={minConfidence}
                onChange={(e) => setMinConfidence(e.target.value)}
                min={0}
                max={100}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signals Table */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Segnali ({signals?.length || 0})</CardTitle>
          <CardDescription>Ultimi 100 segnali generati</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-12 bg-muted rounded" />
              ))}
            </div>
          ) : signals && signals.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Ora</TableHead>
                    <TableHead>Segnale</TableHead>
                    <TableHead>Confidenza</TableHead>
                    <TableHead>Regime</TableHead>
                    <TableHead>TP</TableHead>
                    <TableHead>SL</TableHead>
                    <TableHead>Prezzo</TableHead>
                    <TableHead>Eseguito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals.map((signal) => (
                    <TableRow key={signal.id}>
                      <TableCell className="tabular-nums text-sm">
                        {new Date(signal.timestamp).toLocaleString("it-IT", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge className={getSignalColor(signal.signalType)}>
                          {getSignalLabel(signal.signalType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {formatPercent(signal.confidence)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getRegimeLabel(signal.regime)}
                      </TableCell>
                      <TableCell className="tabular-nums text-profit">
                        {signal.suggestedTp}
                      </TableCell>
                      <TableCell className="tabular-nums text-loss">
                        {signal.suggestedSl}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {signal.entryPrice || "-"}
                      </TableCell>
                      <TableCell>
                        {signal.executed ? (
                          <Badge variant="outline" className="border-profit text-profit">Sì</Badge>
                        ) : (
                          <Badge variant="outline" className="border-muted-foreground">No</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun segnale trovato</p>
              <p className="text-sm">I segnali appariranno qui quando il sistema li genererà</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
