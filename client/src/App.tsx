import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ContractorCircle from "./pages/ContractorCircle";
import CircleWelcome from "./pages/CircleWelcome";
import MemberPortalLayout from "./components/MemberPortalLayout";
import PortalDashboard from "./pages/PortalDashboard";
import PortalReplays from "./pages/PortalReplays";
import PortalTemplates from "./pages/PortalTemplates";
import PortalAccount from "./pages/PortalAccount";
import PortalAdmin from "./pages/PortalAdmin";
import PortalSubscribers from "./pages/PortalSubscribers";
import AdminMembers from "./pages/AdminMembers";
import AdminAnalytics from "./pages/AdminAnalytics";
import DripDashboard from "./pages/DripDashboard";
import ScheduleList from "./pages/ScheduleList";
import Scheduler from "./pages/Scheduler";
import ScheduleReports from "./pages/ScheduleReports";
import ScheduleComparison from "./pages/ScheduleComparison";
import Q2LeadMagnet from "./pages/Q2LeadMagnet";
import Q2ThankYou from "./pages/Q2ThankYou";
import EstimatingChecklist from "./pages/EstimatingChecklist";
import EstimatingThankYou from "./pages/EstimatingThankYou";
import ThreeSilos from "./pages/ThreeSilos";
import ThreeSilosThankYou from "./pages/ThreeSilosThankYou";
import TakeoffList from "./pages/TakeoffList";
import TakeoffDetail from "./pages/TakeoffDetail";
import CostLibrary from "./pages/CostLibrary";
import LaborLibrary from "./pages/LaborLibrary";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import AdminFeedback from "./pages/AdminFeedback";
import BetaLogin from "./pages/BetaLogin";
import BetaPasswordReset from "./pages/BetaPasswordReset";
import ConstructLineLanding from "./pages/ConstructLineLanding";
import ConstructLineHub from "./pages/ConstructLineHub";
import JoinPage from "./pages/JoinPage";

function Router() {
  const constructLineOnly = import.meta.env.VITE_CONSTRUCTLINE_ONLY === "true";

  return (
    <Switch>
      {/* Public pages — Circle landing is the homepage */}
      <Route path={"/"}>
        {() => {
          if (constructLineOnly) {
            window.location.href = "/constructline/login";
            return null;
          }
          return <ContractorCircle />;
        }}
      </Route>
      <Route path={"/circle"} component={ContractorCircle} />
      <Route path={"/join"} component={JoinPage} />
      <Route path={"/circle/welcome"} component={CircleWelcome} />
      <Route path={"/q2"} component={Q2LeadMagnet} />
      <Route path={"/q2/thank-you"} component={Q2ThankYou} />
      <Route path={"/estimating"} component={EstimatingChecklist} />
      <Route path={"/estimating/thank-you"} component={EstimatingThankYou} />
      <Route path={"/silos"} component={ThreeSilos} />
      <Route path={"/silos/thank-you"} component={ThreeSilosThankYou} />

      {/* ConstructLine landing page + beta signup/login (public) */}
      <Route
        path={"/constructline/reset-password"}
        component={BetaPasswordReset}
      />
      <Route path={"/constructline"} component={ConstructLineLanding} />
      <Route path={"/constructline/login"} component={BetaLogin} />
      {/* Legacy /try redirects */}
      <Route path={"/try"}>
        {() => {
          window.location.href = "/constructline";
          return null;
        }}
      </Route>
      <Route path={"/try/login"}>
        {() => {
          window.location.href = "/constructline/login";
          return null;
        }}
      </Route>

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
      <Route path="/portal/subscribers">
        <MemberPortalLayout>
          <PortalSubscribers />
        </MemberPortalLayout>
      </Route>
      <Route path="/portal/members">
        <MemberPortalLayout>
          <AdminMembers />
        </MemberPortalLayout>
      </Route>
      <Route path="/portal/analytics">
        <MemberPortalLayout>
          <AdminAnalytics />
        </MemberPortalLayout>
      </Route>
      <Route path="/portal/drip">
        <MemberPortalLayout>
          <DripDashboard />
        </MemberPortalLayout>
      </Route>

      {/* CPM Schedule Builder */}
      <Route path="/portal/scheduler">
        <MemberPortalLayout>
          <ScheduleList />
        </MemberPortalLayout>
      </Route>
      <Route path="/scheduler/:id" component={Scheduler} />
      <Route path="/scheduler/:id/reports" component={ScheduleReports} />
      <Route path="/scheduler/:id/compare" component={ScheduleComparison} />

      {/* ConstructLine Hub */}
      <Route path="/portal/constructline">
        <MemberPortalLayout>
          <ConstructLineHub />
        </MemberPortalLayout>
      </Route>

      {/* ConstructLine Takeoff */}
      <Route path="/portal/takeoff">
        <MemberPortalLayout>
          <TakeoffList />
        </MemberPortalLayout>
      </Route>
      <Route path="/takeoff/:id" component={TakeoffDetail} />

      {/* ConstructLine Cost Library */}
      <Route path="/portal/cost-library">
        <MemberPortalLayout hideSidebar>
          <CostLibrary />
        </MemberPortalLayout>
      </Route>

      {/* ConstructLine Labor Library */}
      <Route path="/portal/labor-library">
        <MemberPortalLayout hideSidebar>
          <LaborLibrary />
        </MemberPortalLayout>
      </Route>

      {/* Admin Feedback */}
      <Route path="/portal/feedback">
        <MemberPortalLayout>
          <AdminFeedback />
        </MemberPortalLayout>
      </Route>

      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  usePresenceHeartbeat();
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
