/**
 * Beta Signup Page — Public landing page for ConstructLine beta testers.
 * Email + password + name + company signup form.
 * After successful signup, redirects to /portal.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Crown, ArrowRight, Zap, Gauge, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BetaSignup() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    companyName: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/beta/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Signup failed");
      }

      // Redirect to portal on success
      setLocation("/portal");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-deep via-navy to-navy-deep flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-navy/80 backdrop-blur-lg border-b border-white/5 px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-ember/15 flex items-center justify-center">
            <Crown className="w-4 h-4 text-ember" />
          </div>
          <span className="font-heading text-sm font-semibold text-cream">ALP Contractor Circle</span>
        </div>
        <a
          href="/"
          className="text-cream-muted hover:text-cream text-sm transition-colors"
        >
          Back
        </a>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Beta Access
              </span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold text-cream mb-4 leading-tight">
              Try ConstructLine
            </h1>
            <p className="text-cream-muted text-lg leading-relaxed">
              Get early access to our proprietary construction tools. Quantity Takeoff and CPM Scheduler — built for contractors, by contractors.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <Gauge className="w-5 h-5 text-amber-400 mb-2" />
              <p className="text-sm font-medium text-cream">Quantity Takeoff</p>
              <p className="text-xs text-cream-muted mt-1">Fast material estimates</p>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <Layers className="w-5 h-5 text-amber-400 mb-2" />
              <p className="text-sm font-medium text-cream">CPM Scheduler</p>
              <p className="text-xs text-cream-muted mt-1">Project timelines</p>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <Label htmlFor="name" className="text-cream text-sm font-medium mb-2 block">
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50"
              />
            </div>

            <div>
              <Label htmlFor="companyName" className="text-cream text-sm font-medium mb-2 block">
                Company (Optional)
              </Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Your Construction Company"
                value={formData.companyName}
                onChange={handleChange}
                className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-cream text-sm font-medium mb-2 block">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-cream text-sm font-medium mb-2 block">
                Password
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
                className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50"
              />
              <p className="text-xs text-cream-muted mt-1">Minimum 6 characters</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-ember hover:bg-ember/90 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Creating Account..." : "Get Beta Access"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-cream-muted text-sm">
              Already have an account?{" "}
              <button
                onClick={() => setLocation("/try/login")}
                className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>

          {/* Terms & Info */}
          <div className="mt-12 p-4 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-cream-muted leading-relaxed">
              <strong>Beta Access:</strong> You'll have full access to Quantity Takeoff and CPM Scheduler. Other portal features require Contractor Circle membership. Join us to unlock everything.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
