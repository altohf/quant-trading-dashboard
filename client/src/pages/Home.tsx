import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { 
  Activity, 
  BarChart3, 
  Brain, 
  ChevronRight, 
  LineChart, 
  Shield, 
  Zap,
  TrendingUp,
  Settings,
  Bell
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold gradient-text">QuantAI</span>
          </div>
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button>
                  Dashboard
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button>
                  Accedi
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
              <Zap className="h-4 w-4" />
              Sistema di Trading AI Istituzionale
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Trading Quantitativo
              <span className="block gradient-text">Potenziato dall'AI</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              Monitora e controlla il tuo sistema di trading algoritmico con una dashboard professionale. 
              Regime detection, ottimizzazione 3D, risk management e molto altro.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="lg" className="glow-primary">
                    Vai alla Dashboard
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="glow-primary">
                    Inizia Ora
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              )}
              <Button size="lg" variant="outline">
                Scopri di più
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Funzionalità Principali</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tutto ciò di cui hai bisogno per monitorare e ottimizzare le tue strategie di trading algoritmico
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Activity className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Segnali Real-Time</CardTitle>
                <CardDescription>
                  Visualizza i segnali di trading generati dall'AI con confidenza, regime e parametri suggeriti
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Brain className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Regime Detection</CardTitle>
                <CardDescription>
                  Monitora il regime di mercato corrente con Hidden Markov Models e adatta la strategia
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <BarChart3 className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Grafici 3D Interattivi</CardTitle>
                <CardDescription>
                  Esplora le superfici di ottimizzazione TP/SL con visualizzazioni 3D rotabili e zoomabili
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Risk Management</CardTitle>
                <CardDescription>
                  Gestione del rischio professionale con limiti giornalieri, position sizing e trailing drawdown
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <LineChart className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>
                  Analisi dettagliata delle performance con equity curve, win rate e metriche aggregate
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Feature Importance</CardTitle>
                <CardDescription>
                  Scopri quali feature guidano le decisioni del modello AI per migliorare la strategia
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">44+</div>
              <div className="text-muted-foreground">Feature Analizzate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">3</div>
              <div className="text-muted-foreground">Modelli Ensemble</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">4</div>
              <div className="text-muted-foreground">Regimi di Mercato</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Monitoraggio</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-card/50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold mb-4">Pronto a iniziare?</h2>
            <p className="text-muted-foreground mb-8">
              Accedi alla dashboard e inizia a monitorare il tuo sistema di trading AI
            </p>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg" className="glow-primary">
                  Vai alla Dashboard
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="lg" className="glow-primary">
                  Accedi Ora
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <span className="font-semibold">QuantAI Dashboard</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Sistema di Trading Quantitativo AI di Livello Istituzionale
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
