import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ContractingCircle from "./pages/ContractingCircle";
import CircleWelcome from "./pages/CircleWelcome";
import MemberPortalLayout from "./components/MemberPortalLayout";
import PortalDashboard from "./pages/PortalDashboard";
import PortalReplays from "./pages/PortalReplays";
import PortalTemplates from "./pages/PortalTemplates";
import PortalAccount from "./pages/PortalAccount";
import PortalAdmin from "./pages/PortalAdmin";

function Router() {
  return (
    <Switch>
      {/* Public pages — Circle landing is the homepage */}
      <Route path={"/"} component={ContractingCircle} />
      <Route path={"/circle"} component={ContractingCircle} />
      <Route path={"/circle/welcome"} component={CircleWelcome} />

      {/* Member portal (Discord auth) */}
      <Route path="/portal">
        <MemberPortalLayout>
          <PortalDashboard />
        </MemberPortalLayout>
      </Route>
      <Route path="/portal/replays">
        <MemberPortalLayout>
          <PortalReplays />
        </MemberPortalLayout>
      </Route>
      <Route path="/portal/templates">
        <MemberPortalLayout>
          <PortalTemplates />
        </MemberPortalLayout>
      </Route>
      <Route path="/portal/account">
        <MemberPortalLayout>
          <PortalAccount />
        </MemberPortalLayout>
      </Route>
      <Route path="/portal/admin">
        <MemberPortalLayout>
          <PortalAdmin />
        </MemberPortalLayout>
      </Route>

      <Route path={"/404"} component={NotFound} />
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
