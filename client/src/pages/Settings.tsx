import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Settings as SettingsIcon, Save, RefreshCw, Database, Bell, Clock, Shield, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user, isAuthenticated } = useAuth();
  const { data: config, isLoading, refetch } = trpc.config.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const updateConfig = trpc.config.update.useMutation({
    onSuccess: () => {
      toast.success("Configurazione salvata con successo");
      refetch();
    },
    onError: (error) => {
      toast.error("Errore nel salvataggio: " + error.message);
    },
  });

  const seedDemo = trpc.demo.seedData.useMutation({
    onSuccess: () => {
      toast.success("Dati demo generati con successo!");
    },
    onError: (error) => {
      toast.error("Errore nella generazione: " + error.message);
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    maxDailyLoss: "2000",
    maxPositionSize: 5,
    maxDailyTrades: 10,
    tradingStartTime: "15:30",
    tradingEndTime: "22:00",
    defaultTp: 8,
    defaultSl: 5,
    notificationsEnabled: true,
    telegramEnabled: false,
    autoTradeEnabled: false,
    riskPerTrade: "1",
  });

  // Update form when config loads
  useEffect(() => {
    if (config) {
      setFormData({
        maxDailyLoss: config.maxDailyLoss || "2000",
        maxPositionSize: config.maxPositionSize || 5,
        maxDailyTrades: config.maxDailyTrades || 10,
        tradingStartTime: config.tradingStartTime || "15:30",
        tradingEndTime: config.tradingEndTime || "22:00",
        defaultTp: config.defaultTp || 8,
        defaultSl: config.defaultSl || 5,
        notificationsEnabled: config.notificationsEnabled ?? true,
        telegramEnabled: config.telegramEnabled ?? false,
        autoTradeEnabled: config.autoTradeEnabled ?? false,
        riskPerTrade: config.riskPerTrade || "1",
      });
    }
  }, [config]);

  const handleSave = () => {
    updateConfig.mutate(formData);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="bg-card/50 max-w-md">
          <CardHeader>
            <CardTitle>Accesso Richiesto</CardTitle>
            <CardDescription>
              Devi effettuare l'accesso per modificare le impostazioni
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-primary" />
            Impostazioni
          </h1>
          <p className="text-muted-foreground">Configurazione del sistema di trading</p>
        </div>
        <Button onClick={handleSave} disabled={updateConfig.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateConfig.isPending ? "Salvataggio..." : "Salva Modifiche"}
        </Button>
      </div>

      {/* Risk Management Settings */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Gestione del Rischio
          </CardTitle>
          <CardDescription>Parametri di risk management e limiti operativi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxDailyLoss">Max Perdita Giornaliera ($)</Label>
              <Input
                id="maxDailyLoss"
                type="number"
                value={formData.maxDailyLoss}
                onChange={(e) => setFormData({ ...formData, maxDailyLoss: e.target.value })}
                placeholder="2000"
              />
              <p className="text-xs text-muted-foreground">
                Limite massimo di perdita giornaliera prima dello stop automatico
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskPerTrade">Rischio per Trade (%)</Label>
              <Input
                id="riskPerTrade"
                type="number"
                step="0.1"
                value={formData.riskPerTrade}
                onChange={(e) => setFormData({ ...formData, riskPerTrade: e.target.value })}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">
                Percentuale del capitale rischiata per singolo trade
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPositionSize">Max Position Size (contratti)</Label>
              <Input
                id="maxPositionSize"
                type="number"
                value={formData.maxPositionSize}
                onChange={(e) => setFormData({ ...formData, maxPositionSize: parseInt(e.target.value) || 0 })}
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground">
                Numero massimo di contratti per singola posizione
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDailyTrades">Max Trade Giornalieri</Label>
              <Input
                id="maxDailyTrades"
                type="number"
                value={formData.maxDailyTrades}
                onChange={(e) => setFormData({ ...formData, maxDailyTrades: parseInt(e.target.value) || 0 })}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Numero massimo di operazioni al giorno
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Parameters */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Parametri di Trading
          </CardTitle>
          <CardDescription>Impostazioni predefinite per TP e SL</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultTp">Take Profit Default (ticks)</Label>
              <Input
                id="defaultTp"
                type="number"
                value={formData.defaultTp}
                onChange={(e) => setFormData({ ...formData, defaultTp: parseInt(e.target.value) || 0 })}
                placeholder="8"
              />
              <p className="text-xs text-muted-foreground">
                Valore predefinito di take profit in ticks
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultSl">Stop Loss Default (ticks)</Label>
              <Input
                id="defaultSl"
                type="number"
                value={formData.defaultSl}
                onChange={(e) => setFormData({ ...formData, defaultSl: parseInt(e.target.value) || 0 })}
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground">
                Valore predefinito di stop loss in ticks
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Hours */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Orari di Trading
          </CardTitle>
          <CardDescription>Finestra temporale per l'operatività</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tradingStartTime">Inizio Trading (CET)</Label>
              <Input
                id="tradingStartTime"
                type="time"
                value={formData.tradingStartTime}
                onChange={(e) => setFormData({ ...formData, tradingStartTime: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Orario di inizio operatività
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tradingEndTime">Fine Trading (CET)</Label>
              <Input
                id="tradingEndTime"
                type="time"
                value={formData.tradingEndTime}
                onChange={(e) => setFormData({ ...formData, tradingEndTime: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Orario di fine operatività
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifiche
          </CardTitle>
          <CardDescription>Configurazione delle notifiche e alert</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notifiche In-App</Label>
              <p className="text-sm text-muted-foreground">
                Ricevi notifiche all'interno della dashboard
              </p>
            </div>
            <Switch
              checked={formData.notificationsEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, notificationsEnabled: checked })}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notifiche Telegram</Label>
              <p className="text-sm text-muted-foreground">
                Ricevi alert su Telegram per segnali e eventi importanti
              </p>
            </div>
            <Switch
              checked={formData.telegramEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, telegramEnabled: checked })}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Trading</Label>
              <p className="text-sm text-muted-foreground">
                Esegui automaticamente i segnali generati (richiede integrazione broker)
              </p>
            </div>
            <Switch
              checked={formData.autoTradeEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, autoTradeEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Demo Data */}
      <Card className="bg-card/50 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Dati Demo
          </CardTitle>
          <CardDescription>Genera dati di esempio per testare la dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Genera Dati Demo</p>
              <p className="text-sm text-muted-foreground">
                Popola il database con segnali, regimi, statistiche e dati di ottimizzazione di esempio
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => seedDemo.mutate()}
              disabled={seedDemo.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${seedDemo.isPending ? "animate-spin" : ""}`} />
              {seedDemo.isPending ? "Generazione..." : "Genera Dati"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Info */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Informazioni Account</CardTitle>
          <CardDescription>Dettagli del tuo account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nome</span>
              <span className="font-medium">{user?.name || "N/A"}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email || "N/A"}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ruolo</span>
              <span className="font-medium capitalize">{user?.role || "user"}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ultimo Accesso</span>
              <span className="font-medium">
                {user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleString("it-IT") : "N/A"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
