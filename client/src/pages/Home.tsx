import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/alp-logo-fq5LCYroVDcGusnAEJCFnV.webp";
const HERO_BG_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/hero-bg-XvsAfQ3VFZfXnkCzMRJx8b.webp";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0D1B2A' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#C9A84C' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0D1B2A' }}>
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${HERO_BG_URL})` }}
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at center, rgba(13,27,42,0.4) 0%, rgba(13,27,42,0.95) 70%)'
      }} />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="w-full py-6 px-6 md:px-12">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <img
              src={LOGO_URL}
              alt="ALP Contractor Circle"
              className="h-10 md:h-12 w-auto"
            />
            <div className="hidden md:flex items-center gap-2 text-xs tracking-widest uppercase" style={{ color: 'rgba(201,168,76,0.6)' }}>
              <Shield className="h-3.5 w-3.5" />
              Members Only
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-2xl w-full text-center">
            {/* Gold accent line */}
            <div className="w-16 h-px mx-auto mb-8" style={{ backgroundColor: '#C9A84C' }} />

            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              <span className="text-gold-gradient">Contractor Circle</span>
            </h1>

            <p className="text-lg md:text-xl mb-3 font-light" style={{ color: 'rgba(255,255,255,0.85)' }}>
              The Premier Community for Elite Contractors
            </p>

            <p className="text-sm md:text-base mb-12 max-w-lg mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Access exclusive coaching sessions, premium templates, and a network of top-performing contractors. Sign in to your member portal.
            </p>

            {/* Sign In Button */}
            <div className="flex flex-col items-center gap-6">
              <Button
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
                size="lg"
                className="group relative overflow-hidden px-10 py-6 text-base font-semibold tracking-wide rounded-lg transition-all duration-300"
                style={{
                  backgroundColor: '#C9A84C',
                  color: '#0D1B2A',
                }}
              >
                <span className="relative z-10 flex items-center gap-3">
                  Sign In to Member Portal
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>

              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Exclusive access for ALP Contractor Circle members
              </p>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold" style={{ color: '#C9A84C' }}>$2.5B+</div>
                <div className="text-xs mt-1 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>In Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold" style={{ color: '#C9A84C' }}>43</div>
                <div className="text-xs mt-1 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Years Exp.</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold" style={{ color: '#C9A84C' }}>Elite</div>
                <div className="text-xs mt-1 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Network</div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-6 text-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            &copy; {new Date().getFullYear()} ALP — Altitude Logic Pressure. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
