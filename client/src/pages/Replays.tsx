import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Replays() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const replaysQuery = trpc.replays.list.useQuery();

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
    <div className="min-h-screen bg-navy-deep text-cream">
      {/* Header */}
      <header className="border-b border-white/5 bg-navy-deep/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            onClick={() => setLocation("/portal")}
            variant="ghost"
            size="sm"
            className="text-cream-muted hover:text-cream"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-2xl font-bold font-display text-ember">ALP</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold font-display mb-2">Course Replays</h1>
          <p className="text-cream-muted">
            Watch recordings of past coaching calls and the ALP Outdoor Living Sales course.
          </p>
        </div>

        {/* Replays Grid */}
        {replaysQuery.isLoading ? (
          <div className="text-center py-12">
            <p className="text-cream-muted">Loading replays...</p>
          </div>
        ) : replaysQuery.data && replaysQuery.data.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {replaysQuery.data.map((replay) => (
              <div
                key={replay.id}
                className="bg-navy border border-white/5 rounded-xl overflow-hidden hover:border-ember/50 transition-all group"
              >
                {replay.thumbnailUrl && (
                  <div className="relative overflow-hidden bg-navy-light h-48">
                    <img
                      src={replay.thumbnailUrl}
                      alt={replay.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Play className="w-12 h-12 text-ember" />
                    </div>
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold font-display flex-1">{replay.title}</h3>
                    {replay.duration && (
                      <span className="text-xs text-cream-muted ml-2 whitespace-nowrap">
                        {replay.duration}
                      </span>
                    )}
                  </div>
                  {replay.description && (
                    <p className="text-sm text-cream-muted mb-4 line-clamp-2">
                      {replay.description}
                    </p>
                  )}
                  {replay.category && (
                    <div className="mb-4">
                      <span className="inline-block bg-ember/20 text-ember text-xs px-3 py-1 rounded-full">
                        {replay.category}
                      </span>
                    </div>
                  )}
                  <Button
                    onClick={() => window.open(replay.videoUrl || "#", "_blank")}
                    className="w-full bg-ember hover:bg-ember-light text-navy-deep font-semibold"
                  >
                    Watch Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-navy border border-white/5 rounded-xl">
            <p className="text-cream-muted mb-4">No replays available yet.</p>
            <p className="text-sm text-cream-muted">
              Check back soon for recordings of coaching calls and course content.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
