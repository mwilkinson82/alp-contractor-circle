/**
 * ConstructLine password recovery.
 * Request mode sends a reset link; token mode sets a new password and signs in.
 */
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Crown, KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BetaPasswordReset() {
  const [, setLocation] = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  );
  const token = searchParams.get("token") || "";
  const emailParam = searchParams.get("email") || "";
  const isConfirming = Boolean(token);

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/beta/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to send reset email.");
      }

      setSuccess(
        data.message ||
          "If that account exists, a reset link is on the way. Check spam if it does not show up in a minute or two."
      );
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setLoading(false);
      setError("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("/api/beta/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to reset password.");
      }

      setSuccess("Password reset. Taking you back into ConstructLine...");
      window.setTimeout(() => setLocation("/portal/constructline"), 900);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-deep via-navy to-navy-deep flex flex-col">
      <header className="sticky top-0 z-50 bg-navy/80 backdrop-blur-lg border-b border-white/5 px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-ember/15 flex items-center justify-center">
            <Crown className="w-4 h-4 text-ember" />
          </div>
          <span className="font-heading text-sm font-semibold text-cream">
            ALP Contractor Circle
          </span>
        </div>
        <button
          onClick={() => setLocation("/constructline/login")}
          className="text-cream-muted hover:text-cream text-sm transition-colors"
        >
          Back to login
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="mx-auto mb-5 w-12 h-12 rounded-2xl bg-ember/15 flex items-center justify-center">
              {isConfirming ? (
                <KeyRound className="w-6 h-6 text-ember" />
              ) : (
                <Mail className="w-6 h-6 text-ember" />
              )}
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold text-cream mb-4 leading-tight">
              {isConfirming ? "Set New Password" : "Reset Password"}
            </h1>
            <p className="text-cream-muted text-lg">
              {isConfirming
                ? "Choose a new ConstructLine password."
                : "Send a reset link to your ConstructLine email."}
            </p>
          </div>

          <form
            onSubmit={isConfirming ? handleConfirm : handleRequest}
            className="space-y-4 mb-8"
          >
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-emerald-300">{success}</p>
              </div>
            )}

            {!isConfirming ? (
              <div>
                <Label
                  htmlFor="email"
                  className="text-cream text-sm font-medium mb-2 block"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50"
                />
              </div>
            ) : (
              <>
                <div>
                  <Label
                    htmlFor="password"
                    className="text-cream text-sm font-medium mb-2 block"
                  >
                    New Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter a new password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={6}
                    required
                    className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="confirmPassword"
                    className="text-cream text-sm font-medium mb-2 block"
                  >
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Re-enter the new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                    className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50"
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-ember hover:bg-ember/90 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading
                ? "Working..."
                : isConfirming
                  ? "Reset Password"
                  : "Send Reset Link"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setLocation("/constructline/login")}
              className="text-amber-400 hover:text-amber-300 text-sm font-semibold transition-colors"
            >
              Return to sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
