import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import Scan from "./pages/Scan";
import Result from "./pages/Result";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import PortalLanding from "./pages/PortalLanding";
import GovernmentDashboard from "./pages/GovernmentDashboard";
import FarmerHub from "./pages/FarmerHub";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={PortalLanding} />
        <Route path="/home" component={Home} />
        <Route path="/government-dashboard" component={GovernmentDashboard} />
        <Route path="/farmer-hub" component={FarmerHub} />
        <Route path="/scan" component={Scan} />
        <Route path="/result/:id" component={Result} />
        <Route path="/history" component={History} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/profile" component={Profile} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
