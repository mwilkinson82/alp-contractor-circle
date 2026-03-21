import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Calendar, BookOpen, Play, Users, LogOut, User, Settings, Shield, ExternalLink, CalendarPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

const ZOOM_LINK = "https://us06web.zoom.us/j/83215167292?pwd=Mtt970HFCPStqSw62btyyta2Wxo0Pr.1";
const TEMPLATES_URL = "https://drive.google.com/drive/folders/1Rf6kphpQtXyMXUm_TNJb-ng8dPm1J068";
const DISCORD_LINK = "https://discord.gg/jnwDPTY6D3";

function getNextThursday(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysUntilThursday = (4 - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilThursday);
  next.setHours(19, 0, 0, 0);
  return next;
}

function generateICS(): string {
  const next = getNextThursday();
  const end = new Date(next);
  end.setHours(20, 30, 0, 0);

  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ALP//Contractor Circle//EN
BEGIN:VEVENT
DTSTART:${fmt(next)}
DTEND:${fmt(end)}
RRULE:FREQ=WEEKLY;BYDAY=TH
SUMMARY:ALP Contractor Circle - Weekly Coaching Call
DESCRIPTION:Join the weekly coaching call with Marshall Wilkinson and the Contractor Circle community.\\n\\nZoom Link: ${ZOOM_LINK}
LOCATION:${ZOOM_LINK}
END:VEVENT
END:VCALENDAR`;
}

export default function Portal() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const memberQuery = trpc.member.me.useQuery();

  const nextCallDate = useMemo(() => {
    const d = getNextThursday();
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-deep flex items-center justify-center">
        <div className="animate-pulse text-ember font-display text-2xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    window.location.href = "/circle";
    return null;
  }

  const member = memberQuery.data;
  const displayName = member?.displayName || user.name || "Member";
  const isAdmin = user.role === "admin" || member?.memberRole === "admin";

  const handleLogout = async () => {
    await logout();
    window.location.href = "/circle";
  };

  const handleAddToCalendar = () => {
    const ics = generateICS();
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alp-contractor-circle-call.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-navy-deep text-cream">
      {/* Header */}
      <header className="border-b border-white/5 bg-navy-deep/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-2xl font-bold font-display text-ember">ALP</span>
            <nav className="hidden md:flex items-center gap-1">
              <NavLink active label="Dashboard" onClick={() => setLocation("/portal")} />
              <NavLink label="Templates" onClick={() => setLocation("/portal/templates")} />
              <NavLink label="Replays" onClick={() => setLocation("/portal/replays")} />
              <NavLink label="Account" onClick={() => setLocation("/portal/account")} />
              {isAdmin && <NavLink label="Admin" onClick={() => setLocation("/portal/admin")} />}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3">
              {member?.avatarUrl ? (
                <img src={member.avatarUrl} alt="" className="w-8 h-8 rounded-full border border-ember/30" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-ember/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-ember" />
                </div>
              )}
              <span className="text-sm text-cream-muted">{displayName}</span>
            </div>
            <Button onClick={handleLogout} variant="ghost" size="sm" className="text-cream-muted hover:text-cream">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden border-b border-white/5 bg-navy/50 overflow-x-auto no-scrollbar">
        <div className="flex px-4 py-2 gap-1">
          <MobileNavLink active label="Dashboard" onClick={() => setLocation("/portal")} />
          <MobileNavLink label="Templates" onClick={() => setLocation("/portal/templates")} />
          <MobileNavLink label="Replays" onClick={() => setLocation("/portal/replays")} />
          <MobileNavLink label="Account" onClick={() => setLocation("/portal/account")} />
          {isAdmin && <MobileNavLink label="Admin" onClick={() => setLocation("/portal/admin")} />}
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-10">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold font-display mb-2">
            Welcome back, <span className="text-ember">{displayName}</span>
          </h1>
          <p className="text-cream-muted">Your Contractor Circle dashboard</p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Calendar Card */}
          <div className="bg-navy border border-white/5 rounded-xl p-8 ember-glow hover:border-ember/40 transition-all col-span-1 md:col-span-2">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-ember/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-ember" />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display">Weekly Coaching Call</h3>
                  <p className="text-cream-muted text-sm">Every Thursday at 7:00 PM EST</p>
                </div>
              </div>
            </div>
            <p className="text-cream-muted mb-2">Next call: <span className="text-cream font-semibold">{nextCallDate}</span></p>
            <p className="text-cream-muted mb-6 text-sm">Live Q&A with Marshall Wilkinson. Bring your deals, challenges, and questions.</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => window.open(ZOOM_LINK, "_blank")} className="bg-ember hover:bg-ember-light text-navy-deep font-semibold">
                Join Zoom Call
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
              <Button onClick={handleAddToCalendar} variant="outline" className="border-ember/50 text-ember hover:bg-ember/10">
                <CalendarPlus className="w-4 h-4 mr-2" />
                Add to Calendar
              </Button>
            </div>
          </div>

          {/* Templates Card */}
          <div className="bg-navy border border-white/5 rounded-xl p-8 ember-glow hover:border-ember/40 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-ember/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-ember" />
              </div>
              <h3 className="text-xl font-bold font-display">Templates & Resources</h3>
            </div>
            <p className="text-cream-muted mb-6 text-sm">Sales scripts, deal frameworks, and operational systems used to close $2.5B+ in deals.</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => window.open(TEMPLATES_URL, "_blank")} className="bg-ember hover:bg-ember-light text-navy-deep font-semibold">
                Open Library
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
              <Button onClick={() => setLocation("/portal/templates")} variant="outline" className="border-ember/50 text-ember hover:bg-ember/10">
                Browse Categories
              </Button>
            </div>
          </div>

          {/* Replays Card */}
          <div className="bg-navy border border-white/5 rounded-xl p-8 ember-glow hover:border-ember/40 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-ember/20 flex items-center justify-center">
                <Play className="w-5 h-5 text-ember" />
              </div>
              <h3 className="text-xl font-bold font-display">Course Replays</h3>
            </div>
            <p className="text-cream-muted mb-6 text-sm">Watch recordings of past coaching calls and the ALP Outdoor Living Sales course.</p>
            <Button onClick={() => setLocation("/portal/replays")} className="bg-ember hover:bg-ember-light text-navy-deep font-semibold">
              View Replays
            </Button>
          </div>

          {/* Discord Card */}
          <div className="bg-navy border border-white/5 rounded-xl p-8 ember-glow hover:border-ember/40 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-ember/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-ember" />
              </div>
              <h3 className="text-xl font-bold font-display">Discord Community</h3>
            </div>
            <p className="text-cream-muted mb-6 text-sm">Connect with 100+ serious contractors. Share deals, ask questions, and build relationships.</p>
            <Button onClick={() => window.open(DISCORD_LINK, "_blank")} className="bg-ember hover:bg-ember-light text-navy-deep font-semibold">
              Join Discord
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Account Card */}
          <div className="bg-navy border border-white/5 rounded-xl p-8 hover:border-white/10 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                <Settings className="w-5 h-5 text-cream-muted" />
              </div>
              <h3 className="text-xl font-bold font-display">Account & Billing</h3>
            </div>
            <p className="text-cream-muted mb-6 text-sm">Manage your profile, subscription, and billing information.</p>
            <Button onClick={() => setLocation("/portal/account")} variant="outline" className="border-white/10 text-cream hover:bg-white/5">
              Manage Account
            </Button>
          </div>

          {/* Admin Card (if admin) */}
          {isAdmin && (
            <div className="bg-navy border border-ember/20 rounded-xl p-8 hover:border-ember/40 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-ember/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-ember" />
                </div>
                <h3 className="text-xl font-bold font-display">Admin Panel</h3>
              </div>
              <p className="text-cream-muted mb-6 text-sm">Manage replays, members, and portal content.</p>
              <Button onClick={() => setLocation("/portal/admin")} className="bg-ember/20 hover:bg-ember/30 text-ember font-semibold border border-ember/30">
                Open Admin
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavLink({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-ember/20 text-ember" : "text-cream-muted hover:text-cream hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );
}

function MobileNavLink({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
        active ? "bg-ember/20 text-ember" : "text-cream-muted hover:text-cream"
      }`}
    >
      {label}
    </button>
  );
}
