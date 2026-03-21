import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Users, BookOpen, Zap, ArrowRight, Star } from "lucide-react";

const MARSHALL_HERO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/marshall_hero_6156d00c.webp";

export default function Circle() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/portal");
    }
  }, [isAuthenticated, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-deep flex items-center justify-center">
        <div className="animate-pulse text-ember font-display text-2xl">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) return null;

  const handleLogin = () => {
    const origin = window.location.origin;
    window.location.href = `/api/discord/login?origin=${encodeURIComponent(origin)}&returnPath=/portal`;
  };

  const handleJoinNow = () => {
    const origin = window.location.origin;
    window.location.href = `/api/discord/login?origin=${encodeURIComponent(origin)}&returnPath=/circle/welcome`;
  };

  return (
    <div className="min-h-screen bg-navy-deep text-cream grain-overlay">
      {/* Header */}
      <header className="border-b border-white/5 sticky top-0 z-50 bg-navy-deep/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between relative z-10">
          <div className="text-2xl font-bold font-display text-ember tracking-tight">ALP</div>
          <div className="flex items-center gap-3">
            <Button onClick={handleLogin} variant="ghost" className="text-cream-muted hover:text-cream text-sm">
              Sign In
            </Button>
            <Button onClick={handleJoinNow} className="bg-ember hover:bg-ember-light text-navy-deep font-semibold">
              Join Now
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section — Split layout with Marshall's image */}
      <section className="relative min-h-[90vh] flex items-center border-b border-white/5 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/95 to-navy-deep/60 z-10" />
        {/* Hero image — full bleed right side */}
        <div className="absolute inset-0">
          <img
            src={MARSHALL_HERO_URL}
            alt="Marshall Wilkinson speaking at a conference"
            className="w-full h-full object-cover object-center"
            style={{ objectPosition: "60% center" }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-20">
          <div className="max-w-2xl">
            <div className="inline-block bg-ember/10 border border-ember/30 text-ember text-sm font-medium px-4 py-1.5 rounded-full mb-8">
              Premium Contractor Coaching
            </div>
            <h1 className="text-5xl md:text-7xl font-bold font-display mb-6 leading-[1.05] tracking-tight">
              The <span className="text-ember">Contractor</span><br />Circle
            </h1>
            <p className="text-xl md:text-2xl text-cream-muted mb-4 leading-relaxed max-w-xl">
              Weekly coaching calls, premium templates, and direct access to 43 years of construction expertise.
            </p>
            <div className="flex items-center gap-2 mb-10">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-ember text-ember" />
              ))}
              <span className="text-cream-muted text-sm ml-1">Trusted by 100+ serious contractors</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleJoinNow}
                size="lg"
                className="bg-ember hover:bg-ember-light text-navy-deep font-bold text-lg px-8 py-6"
              >
                Join for $497/month
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                onClick={handleLogin}
                variant="outline"
                size="lg"
                className="border-ember/50 text-ember hover:bg-ember/10 py-6"
              >
                Member Sign In
              </Button>
            </div>
          </div>
        </div>

        {/* Ember gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-deep to-transparent z-20" />
      </section>

      {/* Social proof bar */}
      <section className="border-b border-white/5 py-6 bg-navy/50">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-center">
            <StatItem value="$2.5B+" label="In Construction" />
            <StatItem value="43 Years" label="Experience" />
            <StatItem value="100+" label="Active Members" />
            <StatItem value="Weekly" label="Live Coaching" />
          </div>
        </div>
      </section>

      {/* About Marshall — with image on right */}
      <section className="py-24 md:py-32 border-b border-white/5">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center max-w-5xl mx-auto">
            <div>
              <div className="inline-block bg-ember/10 border border-ember/30 text-ember text-sm font-medium px-4 py-1.5 rounded-full mb-6">
                Your Coach
              </div>
              <h2 className="text-4xl md:text-5xl font-bold font-display mb-8">
                Meet <span className="text-ember">Marshall</span>
              </h2>
              <div className="space-y-5 text-lg text-cream-muted leading-relaxed">
                <p>
                  Marshall Wilkinson is the founder of ALP (Altitude Logic Pressure) and a world-class sales and
                  business consultant with{" "}
                  <span className="text-cream font-semibold">43 years of construction experience</span>.
                </p>
                <p>
                  Throughout his career, Marshall has been involved in over{" "}
                  <span className="text-ember font-semibold">$2.5 billion</span> in construction projects. He's built
                  multiple 7-figure businesses, scaled teams from 0 to 100+, and developed systems that generate
                  consistent revenue.
                </p>
                <p>
                  The Contractor Circle is his way of giving back — teaching serious contractors how to scale their
                  businesses, close bigger deals, and build sustainable operations.
                </p>
              </div>
            </div>
            {/* Image panel */}
            <div className="relative">
              <div className="absolute -inset-4 bg-ember/10 rounded-2xl blur-2xl" />
              <div className="relative rounded-2xl overflow-hidden border border-ember/20 shadow-2xl">
                <img
                  src={MARSHALL_HERO_URL}
                  alt="Marshall Wilkinson on stage"
                  className="w-full h-80 md:h-96 object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-sm font-semibold text-cream">Marshall Wilkinson</p>
                  <p className="text-xs text-cream-muted">Founder, ALP — $2.5B in Construction</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-24 md:py-32 border-b border-white/5">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold font-display mb-4">What You Get</h2>
            <p className="text-cream-muted text-lg">Everything you need to scale your contracting business</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <FeatureCard
              icon={<Zap className="w-7 h-7 text-ember" />}
              title="Weekly Coaching Calls"
              description="Live Thursday evening calls with Marshall and the community. Get direct feedback on your deals, challenges, and growth strategies."
            />
            <FeatureCard
              icon={<BookOpen className="w-7 h-7 text-ember" />}
              title="Premium Template Library"
              description="Exclusive templates, scripts, and systems used to close $2.5B+ in construction deals. Everything you need to scale."
            />
            <FeatureCard
              icon={<Users className="w-7 h-7 text-ember" />}
              title="Private Community"
              description="Connect with 100+ serious contractors in our Discord community. Share deals, ask questions, and build real relationships."
            />
            <FeatureCard
              icon={<CheckCircle2 className="w-7 h-7 text-ember" />}
              title="Course Replays"
              description="Access recordings of all past calls and the ALP Outdoor Living Sales course. Learn at your own pace, anytime."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 md:py-32 border-b border-white/5">
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold font-display text-center mb-16">Membership</h2>
          <div className="max-w-md mx-auto">
            <div className="bg-navy border border-ember/30 rounded-2xl p-10 text-center ember-glow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-ember to-transparent" />
              <h3 className="text-2xl font-bold font-display mb-2">Contractor Circle</h3>
              <p className="text-cream-muted mb-8">Everything you need to scale</p>
              <div className="mb-8">
                <span className="text-6xl font-bold text-ember font-display">$497</span>
                <span className="text-cream-muted text-lg">/month</span>
              </div>
              <ul className="space-y-4 mb-10 text-left">
                {[
                  "Weekly coaching calls with Marshall",
                  "Premium template library",
                  "Private Discord community",
                  "Course replays & recordings",
                  "Direct access to Marshall",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-ember flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={handleJoinNow}
                className="w-full bg-ember hover:bg-ember-light text-navy-deep font-bold text-lg py-6"
              >
                Join Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold font-display mb-6">Ready to Scale?</h2>
          <p className="text-xl text-cream-muted mb-10 max-w-2xl mx-auto">
            Join the Contractor Circle today and get direct access to Marshall and 100+ serious contractors committed
            to growth.
          </p>
          <Button
            onClick={handleJoinNow}
            size="lg"
            className="bg-ember hover:bg-ember-light text-navy-deep font-bold text-lg px-8 py-6"
          >
            Join for $497/month
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-cream-muted text-sm relative z-10">
        <p>&copy; {new Date().getFullYear()} Altitude Logic Pressure. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-navy border border-white/5 rounded-xl p-8 hover:border-ember/30 transition-all ember-glow">
      <div className="w-12 h-12 rounded-lg bg-ember/10 flex items-center justify-center mb-5">{icon}</div>
      <h3 className="text-xl font-bold font-display mb-3">{title}</h3>
      <p className="text-cream-muted leading-relaxed">{description}</p>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl md:text-3xl font-bold font-display text-ember">{value}</div>
      <div className="text-sm text-cream-muted mt-1">{label}</div>
    </div>
  );
}
