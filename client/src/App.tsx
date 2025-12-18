import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Signals from "./pages/Signals";
import Regime from "./pages/Regime";
import Optimization from "./pages/Optimization";
import RiskManagement from "./pages/RiskManagement";
import Performance from "./pages/Performance";
import Settings from "./pages/Settings";
import DashboardLayout from "./components/DashboardLayout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard">
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      <Route path="/signals">
        <DashboardLayout>
          <Signals />
        </DashboardLayout>
      </Route>
      <Route path="/regime">
        <DashboardLayout>
          <Regime />
        </DashboardLayout>
      </Route>
      <Route path="/optimization">
        <DashboardLayout>
          <Optimization />
        </DashboardLayout>
      </Route>
      <Route path="/risk">
        <DashboardLayout>
          <RiskManagement />
        </DashboardLayout>
      </Route>
      <Route path="/performance">
        <DashboardLayout>
          <Performance />
        </DashboardLayout>
      </Route>
      <Route path="/settings">
        <DashboardLayout>
          <Settings />
        </DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
