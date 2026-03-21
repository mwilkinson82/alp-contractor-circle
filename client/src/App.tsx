import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Circle from "./pages/Circle";
import Portal from "./pages/Portal";
import Replays from "./pages/Replays";
import Welcome from "./pages/Welcome";
import Admin from "./pages/Admin";
import Account from "./pages/Account";
import Templates from "./pages/Templates";

function Router() {
  return (
    <Switch>
      <Route path={"/circle"} component={Circle} />
      <Route path={"/circle/welcome"} component={Welcome} />
      <Route path={"/portal"} component={Portal} />
      <Route path={"/portal/replays"} component={Replays} />
      <Route path={"/portal/templates"} component={Templates} />
      <Route path={"/portal/account"} component={Account} />
      <Route path={"/portal/admin"} component={Admin} />
      <Route path={"/404"} component={NotFound} />
      {/* Default redirect to circle landing */}
      <Route path={"/"} component={Circle} />
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
