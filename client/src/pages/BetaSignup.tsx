/**
 * ConstructLine Free Access Signup — Public landing page for ConstructLine free access.
 * Email + password + name + company signup form.
 * After successful signup, redirects to /portal and sends welcome email.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import {
  Crown,
  ArrowRight,
  Gauge,
  Layers,
  CheckCircle2,
  HardHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ConstructLineSignup() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    companyName: "",
    inviteCode: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const res = await fetch("/api/beta/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorCode(data.code || null);
        throw new Error(data.error || "Signup failed");
      }

      // Show success briefly then redirect
      setSuccess(true);
      setTimeout(() => setLocation("/portal/constructline"), 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-deep via-navy to-navy-deep flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-cream mb-2">
            You're in.
          </h2>
          <p className="text-cream-muted text-sm">
            Taking you to ConstructLine now…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-deep via-navy to-navy-deep flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-navy/80 backdrop-blur-lg border-b border-white/5 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-ember/15 flex items-center justify-center">
            <Crown className="w-3.5 h-3.5 text-ember" />
          </div>
          <span className="font-heading text-sm font-semibold text-cream">
            Construct<span className="text-amber-400">Line</span>
          </span>
        </div>
        <a
          href="/"
          className="text-cream-muted hover:text-cream text-sm transition-colors"
        >
          Learn More
        </a>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-start sm:items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Hero */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-5">
              <HardHat className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                Professional Construction Tools
              </span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-cream mb-3 leading-tight">
              Access ConstructLine
            </h1>
            <p className="text-cream-muted text-base leading-relaxed">
              Contractor Circle's proprietary construction software, powered by
              ALP. Professional-grade tools built by construction professionals.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mb-7">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <Gauge className="w-4.5 h-4.5 text-amber-400 mb-2" />
              <p className="text-sm font-semibold text-cream">
                Quantity Takeoff
              </p>
              <p className="text-xs text-cream-muted mt-0.5">
                AI-powered material estimates from drawings
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <Layers className="w-4.5 h-4.5 text-amber-400 mb-2" />
              <p className="text-sm font-semibold text-cream">CPM Scheduler</p>
              <p className="text-xs text-cream-muted mt-0.5">
                Critical path scheduling & Gantt charts
              </p>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
                {errorCode === "ACCOUNT_EXISTS" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setLocation("/constructline/login")}
                      className="rounded-md border border-red-400/25 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/10"
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const email = formData.email.trim();
                        setLocation(
                          email
                            ? `/constructline/reset-password?email=${encodeURIComponent(email)}`
                            : "/constructline/reset-password"
                        );
                      }}
                      className="rounded-md border border-red-400/25 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/10"
                    >
                      Reset password
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="name"
                  className="text-cream text-sm font-medium mb-1.5 block"
                >
                  Full Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                  className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50 h-11"
                />
              </div>
              <div>
                <Label
                  htmlFor="companyName"
                  className="text-cream text-sm font-medium mb-1.5 block"
                >
                  Company
                </Label>
                <Input
                  id="companyName"
                  name="companyName"
                  type="text"
                  placeholder="Your Company"
                  value={formData.companyName}
                  onChange={handleChange}
                  autoComplete="organization"
                  className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50 h-11"
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="email"
                className="text-cream text-sm font-medium mb-1.5 block"
              >
                Email Address <span className="text-red-400">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50 h-11"
              />
            </div>

            <div>
              <Label
                htmlFor="password"
                className="text-cream text-sm font-medium mb-1.5 block"
              >
                Password <span className="text-red-400">*</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete="new-password"
                className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50 h-11"
              />
              <p className="text-xs text-cream-muted/60 mt-1">
                You'll receive your login credentials by email.
              </p>
            </div>

            <div>
              <Label
                htmlFor="inviteCode"
                className="text-cream text-sm font-medium mb-1.5 block"
              >
                Invite Code
              </Label>
              <Input
                id="inviteCode"
                name="inviteCode"
                type="text"
                placeholder="Enter your client access code"
                value={formData.inviteCode}
                onChange={handleChange}
                autoComplete="off"
                className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50 h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-ember hover:bg-ember/90 text-white font-semibold h-12 rounded-xl transition-all flex items-center justify-center gap-2 text-base mt-2"
            >
              {loading
                ? "Creating your account…"
                : "Get Access to ConstructLine"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-5">
            <p className="text-cream-muted text-sm">
              Already have an account?{" "}
              <button
                onClick={() => setLocation("/constructline/login")}
                className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>

          {/* Footer note */}
          <div className="mt-6 p-4 rounded-xl bg-white/3 border border-white/8">
            <p className="text-xs text-cream-muted/70 leading-relaxed text-center">
              ConstructLine is part of the Contractor Circle membership by ALP.
              Free access includes Quantity Takeoff and CPM Scheduler.{" "}
              <a
                href="/"
                className="text-amber-400/80 hover:text-amber-400 underline underline-offset-2"
              >
                Learn about full membership →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
