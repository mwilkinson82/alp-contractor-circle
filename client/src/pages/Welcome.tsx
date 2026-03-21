import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function Welcome() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionId(params.get("session_id"));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-deep flex items-center justify-center">
        <div className="text-cream">Loading...</div>
      </div>
    );
  }

  if (!user) {
    setLocation("/circle");
    return null;
  }

  return (
    <div className="min-h-screen bg-navy-deep text-cream flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-navy border border-ember/30 rounded-2xl p-12 text-center ember-glow">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-ember/20 rounded-full blur-xl"></div>
              <CheckCircle2 className="w-20 h-20 text-ember relative" />
            </div>
          </div>

          <h1 className="text-4xl font-bold font-display mb-4">Welcome to Contractor Circle!</h1>
          <p className="text-xl text-cream-muted mb-8 leading-relaxed">
            Your membership is active. You now have access to all premium content, the private community, and weekly coaching calls with Marshall.
          </p>

          <div className="bg-navy-light border border-white/5 rounded-xl p-8 mb-8 text-left">
            <h2 className="text-lg font-bold font-display mb-6">Here's what you get:</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-ember flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Weekly Coaching Calls</p>
                  <p className="text-sm text-cream-muted">Every Thursday at 7:00 PM EST with Marshall and the community</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-ember flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Premium Template Library</p>
                  <p className="text-sm text-cream-muted">Sales scripts, deal frameworks, and operational systems</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-ember flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Course Replays</p>
                  <p className="text-sm text-cream-muted">Access all past calls and the ALP Outdoor Living Sales course</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-ember flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Private Discord Community</p>
                  <p className="text-sm text-cream-muted">Connect with 100+ serious contractors and Marshall directly</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => setLocation("/portal")}
              className="w-full bg-ember hover:bg-ember-light text-navy-deep font-bold text-lg py-6"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              onClick={() => window.open("https://discord.gg/jnwDPTY6D3", "_blank")}
              variant="outline"
              className="w-full border-ember/50 text-ember hover:bg-ember/10"
            >
              Join Discord Community
            </Button>
          </div>

          <p className="text-sm text-cream-muted mt-8">
            {sessionId && <span>Confirmation ID: {sessionId.slice(0, 8)}...</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
