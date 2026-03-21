import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import {
  Calendar,
  Video,
  FolderOpen,
  PlayCircle,
  MessageCircle,
  ExternalLink,
  LogOut,
  CalendarPlus,
  Loader2,
  Clock,
  Users,
  Crown,
  ChevronRight,
  Lock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/alp-logo-fq5LCYroVDcGusnAEJCFnV.webp";

const ZOOM_LINK = "https://us06web.zoom.us/j/83215167292?pwd=Mtt970HFCPStqSw62btyyta2Wxo0Pr.1";
const DRIVE_LINK = "https://drive.google.com/drive/folders/1Rf6kphpQtXyMXUm_TNJb-ng8dPm1J068";
const DISCORD_LINK = "https://discord.gg/jnwDPTY6D3";

// Generate ICS calendar event
function generateICS() {
  const now = new Date();
  // Next Thursday at 7pm EST
  const nextThursday = new Date(now);
  const dayOfWeek = nextThursday.getDay();
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7;
  nextThursday.setDate(nextThursday.getDate() + daysUntilThursday);
  nextThursday.setHours(19, 0, 0, 0);

  const endTime = new Date(nextThursday);
  endTime.setHours(20, 0, 0, 0);

  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ALP Contractor Circle//EN
BEGIN:VEVENT
DTSTART:${formatDate(nextThursday)}
DTEND:${formatDate(endTime)}
RRULE:FREQ=WEEKLY;BYDAY=TH
SUMMARY:ALP Contractor Circle - Weekly Session
DESCRIPTION:Join the weekly ALP Contractor Circle coaching session.\\n\\nZoom Link: ${ZOOM_LINK}
URL:${ZOOM_LINK}
LOCATION:Zoom
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'alp-contractor-circle.ics';
  a.click();
  URL.revokeObjectURL(url);
}

// Get next session date
function getNextSession() {
  const now = new Date();
  const nextThursday = new Date(now);
  const dayOfWeek = nextThursday.getDay();
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7;
  nextThursday.setDate(nextThursday.getDate() + daysUntilThursday);
  nextThursday.setHours(19, 0, 0, 0);

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  };

  return nextThursday.toLocaleDateString('en-US', options);
}

// Replay placeholder data
const replays = [
  { title: "Outdoor Living Sales Masterclass", status: "coming-soon", duration: "Full Course" },
  { title: "Closing High-Ticket Contracts", status: "coming-soon", duration: "Module 1" },
  { title: "Client Objection Handling", status: "coming-soon", duration: "Module 2" },
  { title: "Proposal & Pricing Strategy", status: "coming-soon", duration: "Module 3" },
];

export default function Dashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0D1B2A' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#C9A84C' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const firstName = user?.name?.split(' ')[0] || 'Member';
  const greeting = currentTime.getHours() < 12 ? 'Good morning' : currentTime.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0D1B2A' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: 'rgba(13,27,42,0.95)', borderColor: 'rgba(201,168,76,0.15)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <img src={LOGO_URL} alt="ALP" className="h-8 w-auto" />
              <div className="hidden sm:block h-6 w-px" style={{ backgroundColor: 'rgba(201,168,76,0.2)' }} />
              <span className="hidden sm:block text-xs font-medium tracking-widest uppercase" style={{ color: 'rgba(201,168,76,0.6)' }}>
                Member Portal
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'M'}
                </div>
                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {user?.name || 'Member'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => { await logout(); setLocation('/'); }}
                className="text-xs hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Welcome Section */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-4 w-4" style={{ color: '#C9A84C' }} />
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: '#C9A84C' }}>
              Contractor Circle
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: '"Playfair Display", Georgia, serif', color: '#ffffff' }}>
            {greeting}, <span className="text-gold-gradient">{firstName}</span>
          </h1>
          <p className="text-base" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Welcome to your exclusive member portal. Here&apos;s everything you need.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Calendar Card */}
          <div className="card-premium rounded-xl p-6 md:p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(201,168,76,0.1)' }}>
                  <Calendar className="h-5 w-5" style={{ color: '#C9A84C' }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>Upcoming Sessions</h2>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Weekly coaching calls</p>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(74,111,165,0.15)', color: '#7BA3D4' }}>
                Live
              </div>
            </div>

            {/* Next Session */}
            <div className="rounded-lg p-4 mb-5" style={{ backgroundColor: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3.5 w-3.5" style={{ color: '#C9A84C' }} />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#C9A84C' }}>Next Session</span>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
                ALP Contractor Circle Weekly Call
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {getNextSession()}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => window.open(ZOOM_LINK, '_blank')}
                className="flex-1 font-semibold"
                style={{ backgroundColor: '#C9A84C', color: '#0D1B2A' }}
              >
                <Video className="h-4 w-4 mr-2" />
                Join Zoom Session
              </Button>
              <Button
                variant="outline"
                onClick={generateICS}
                className="flex-1 border-white/10 hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                Add to Calendar
              </Button>
            </div>
          </div>

          {/* Templates & Resources Card */}
          <div className="card-premium rounded-xl p-6 md:p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(201,168,76,0.1)' }}>
                  <FolderOpen className="h-5 w-5" style={{ color: '#C9A84C' }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>Templates & Resources</h2>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Premium contractor toolkit</p>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>
                Premium
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { label: "Sales Scripts & Templates", desc: "Proven closing frameworks" },
                { label: "Proposal Templates", desc: "Professional bid documents" },
                { label: "Contract Templates", desc: "Legal-ready agreements" },
                { label: "Business SOPs", desc: "Standard operating procedures" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4" style={{ color: 'rgba(201,168,76,0.4)' }} />
                </div>
              ))}
            </div>

            <Button
              onClick={() => window.open(DRIVE_LINK, '_blank')}
              className="w-full font-semibold"
              style={{ backgroundColor: '#C9A84C', color: '#0D1B2A' }}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Open Template Library
              <ExternalLink className="h-3.5 w-3.5 ml-2" />
            </Button>
          </div>

          {/* Replays Card */}
          <div className="card-premium rounded-xl p-6 md:p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(201,168,76,0.1)' }}>
                  <PlayCircle className="h-5 w-5" style={{ color: '#C9A84C' }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>Course Replays</h2>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>ALP Outdoor Living Sales</p>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(160,120,48,0.15)', color: '#D4A84C' }}>
                Coming Soon
              </div>
            </div>

            <div className="space-y-3">
              {replays.map((replay, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 py-3 px-4 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(201,168,76,0.08)' }}>
                    <Lock className="h-4 w-4" style={{ color: 'rgba(201,168,76,0.4)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{replay.title}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{replay.duration}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>
                    Soon
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 p-3 rounded-lg text-center" style={{ backgroundColor: 'rgba(201,168,76,0.05)', border: '1px dashed rgba(201,168,76,0.15)' }}>
              <p className="text-xs" style={{ color: 'rgba(201,168,76,0.6)' }}>
                Course replays will be available here soon. Stay tuned.
              </p>
            </div>
          </div>

          {/* Discord Community Card */}
          <div className="card-premium rounded-xl p-6 md:p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(88,101,242,0.1)' }}>
                  <MessageCircle className="h-5 w-5" style={{ color: '#5865F2' }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>Discord Community</h2>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Connect with fellow contractors</p>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(88,101,242,0.15)', color: '#7B8AF7' }}>
                Active
              </div>
            </div>

            <div className="rounded-lg p-5 mb-6" style={{ backgroundColor: 'rgba(88,101,242,0.06)', border: '1px solid rgba(88,101,242,0.12)' }}>
              <div className="flex items-center gap-3 mb-3">
                <Users className="h-5 w-5" style={{ color: '#5865F2' }} />
                <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  ALP Contractor Circle
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Join the conversation with elite contractors. Share wins, ask questions, get real-time support from Marshall and the community.
              </p>
            </div>

            <div className="space-y-2 mb-6">
              {[
                { label: "Weekly Q&A Sessions", icon: "💬" },
                { label: "Deal Review Channel", icon: "📊" },
                { label: "Networking & Referrals", icon: "🤝" },
                { label: "Exclusive Announcements", icon: "📢" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => window.open(DISCORD_LINK, '_blank')}
              className="w-full font-semibold"
              style={{ backgroundColor: '#5865F2', color: '#ffffff' }}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
              </svg>
              Open Discord Server
              <ExternalLink className="h-3.5 w-3.5 ml-2" />
            </Button>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="mt-10 rounded-xl p-6 md:p-8 text-center" style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(13,27,42,0.95) 50%, rgba(74,111,165,0.08) 100%)',
          border: '1px solid rgba(201,168,76,0.1)'
        }}>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#C9A84C' }}>
            Led by Marshall Wilkinson
          </p>
          <p className="text-lg font-semibold mb-1" style={{ fontFamily: '"Playfair Display", Georgia, serif', color: 'rgba(255,255,255,0.9)' }}>
            43 Years of Construction Excellence
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            $2.5 Billion in projects completed. World-class sales and business consulting.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-8" style={{ borderColor: 'rgba(201,168,76,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            &copy; {new Date().getFullYear()} ALP — Altitude Logic Pressure. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
