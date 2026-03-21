/**
 * Member Portal Layout — Midnight Ember themed sidebar navigation.
 * Uses Discord auth (useMember) instead of Manus auth (useAuth).
 */
import { useMember } from "@/hooks/useMember";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  PlayCircle,
  FileDown,
  Settings,
  LogOut,
  Menu,
  X,
  Crown,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/portal", adminOnly: false },
  { icon: PlayCircle, label: "Replay Library", path: "/portal/replays", adminOnly: false },
  { icon: FileDown, label: "Templates", path: "/portal/templates", adminOnly: false },
  { icon: Settings, label: "Account", path: "/portal/account", adminOnly: false },
  { icon: ShieldCheck, label: "Admin Panel", path: "/portal/admin", adminOnly: true },
];

function MemberPortalSkeleton() {
  return (
    <div className="min-h-screen bg-navy-deep flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-ember border-t-transparent animate-spin" />
        <p className="text-cream-muted text-sm font-sans">Loading your portal...</p>
      </div>
    </div>
  );
}

function MemberLoginPrompt({ getLoginUrl }: { getLoginUrl: (path?: string) => string }) {
  return (
    <div className="min-h-screen bg-navy-deep flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-ember/10 flex items-center justify-center mx-auto mb-6">
          <Crown className="w-10 h-10 text-ember" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-cream mb-3">
          Member Portal
        </h1>
        <p className="text-cream-muted mb-8 leading-relaxed">
          Sign in with your Discord account to access The Contracting Circle member area.
        </p>
        <a
          href={getLoginUrl("/portal")}
          className="inline-flex items-center gap-3 px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-[#5865F2]/20"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
          Sign in with Discord
        </a>
        <p className="text-cream-muted/50 text-xs mt-6">
          Only available to Contracting Circle members
        </p>
      </div>
    </div>
  );
}

export default function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { member, loading, isAuthenticated, logout, getLoginUrl } = useMember();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) return <MemberPortalSkeleton />;
  if (!isAuthenticated) return <MemberLoginPrompt getLoginUrl={getLoginUrl} />;

  const avatarUrl = member?.avatarUrl;
  const displayName = member?.displayName || member?.discordUsername || "Member";
  const memberRole = member?.memberRole || "member";

  const roleLabel =
    memberRole === "founding_member"
      ? "Founding Member"
      : memberRole === "admin"
        ? "Admin"
        : "Member";

  const isAdmin = member?.memberRole === "admin";
  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  const activeItem = visibleMenuItems.find(item =>
    location === item.path || (item.path !== "/portal" && location.startsWith(item.path))
  ) || visibleMenuItems[0];

  return (
    <div className="min-h-screen bg-navy-deep flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 bg-navy border-r border-white/5 flex flex-col shrink-0 sticky top-0 h-screen">
          {/* Logo / Brand */}
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-ember/15 flex items-center justify-center">
                <Crown className="w-5 h-5 text-ember" />
              </div>
              <div>
                <h2 className="font-heading text-sm font-semibold text-cream tracking-tight">
                  The Circle
                </h2>
                <p className="text-[10px] text-cream-muted uppercase tracking-widest">
                  Member Portal
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {visibleMenuItems.map(item => {
              const isActive = location === item.path || (item.path !== "/portal" && location.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-ember/10 text-ember font-medium"
                      : "text-cream-muted hover:text-cream hover:bg-white/5"
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? "text-ember" : ""}`} />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto text-ember/50" />}
                </button>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="p-3 border-t border-white/5">
            <div className="flex items-center gap-3 px-3 py-2">
              <img
                src={avatarUrl || ""}
                alt={displayName}
                className="w-9 h-9 rounded-full border border-white/10"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-cream truncate">{displayName}</p>
                <p className="text-[10px] text-ember uppercase tracking-wider">{roleLabel}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-sm text-cream-muted hover:text-red-400 hover:bg-red-500/5 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        {isMobile && (
          <header className="sticky top-0 z-50 bg-navy/95 backdrop-blur-lg border-b border-white/5 px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center"
              >
                {mobileMenuOpen ? <X className="w-4 h-4 text-cream" /> : <Menu className="w-4 h-4 text-cream" />}
              </button>
              <span className="font-heading text-sm font-semibold text-cream">
                {activeItem?.label || "Portal"}
              </span>
            </div>
            <img
              src={avatarUrl || ""}
              alt={displayName}
              className="w-8 h-8 rounded-full border border-white/10"
            />
          </header>
        )}

        {/* Mobile Menu Overlay */}
        {isMobile && mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-navy-deep/95 backdrop-blur-lg pt-14">
            <nav className="p-4 space-y-2">
              {visibleMenuItems.map(item => {
                const isActive = location === item.path || (item.path !== "/portal" && location.startsWith(item.path));
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      setLocation(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-base transition-all ${
                      isActive
                        ? "bg-ember/10 text-ember font-medium"
                        : "text-cream-muted hover:text-cream hover:bg-white/5"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? "text-ember" : ""}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <div className="border-t border-white/5 pt-4 mt-4">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-base text-cream-muted hover:text-red-400"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
