/**
 * ConstructLine Login Page — Login for returning ConstructLine users.
 * Email + password login form.
 * After successful login, redirects to /portal/constructline.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BetaLogin() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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
      const res = await fetch("/api/beta/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      setLocation("/portal/constructline");
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
        <div className="w-full max-w-md">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="font-heading text-4xl sm:text-5xl font-bold text-cream mb-4 leading-tight">
              Welcome Back
            </h1>
            <p className="text-cream-muted text-lg">
              Sign in to your ConstructLine account
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

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
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-ember hover:bg-ember/90 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Signing In..." : "Sign In"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          {/* Signup Link */}
          <div className="text-center">
            <p className="text-cream-muted text-sm">
              Don't have an account?{" "}
              <button
                onClick={() => setLocation("/constructline")}
                className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
              >
                Create a free account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
