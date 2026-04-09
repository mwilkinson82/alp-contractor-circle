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
import Q2LeadMagnet from "./pages/Q2LeadMagnet";
import Q2ThankYou from "./pages/Q2ThankYou";
import EstimatingChecklist from "./pages/EstimatingChecklist";
import EstimatingThankYou from "./pages/EstimatingThankYou";

function Router() {
  return (
    <Switch>
      {/* Public pages — Circle landing is the homepage */}
      <Route path={"/"} component={ContractorCircle} />
       <Route path={"circle"} component={ContractorCircle} />
      <Route path={"/circle/welcome"} component={CircleWelcome} />
      <Route path={"/q2"} component={Q2LeadMagnet} />
      <Route path={"/q2/thank-you"} component={Q2ThankYou} />
      <Route path={"/estimating"} component={EstimatingChecklist} />
      <Route path={"/estimating/thank-you"} component={EstimatingThankYou} />

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
