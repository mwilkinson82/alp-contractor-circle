import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export default function Admin() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const replaysQuery = trpc.replays.all.useQuery(undefined, { retry: false });
  const createReplayMutation = trpc.replays.create.useMutation();
  const deleteReplayMutation = trpc.replays.delete.useMutation();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    duration: "",
    category: "general",
  });

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

  const handleCreateReplay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createReplayMutation.mutateAsync(formData);
      toast.success("Replay created successfully");
      setFormData({ title: "", description: "", videoUrl: "", thumbnailUrl: "", duration: "", category: "general" });
      setShowForm(false);
      replaysQuery.refetch();
    } catch (error) {
      toast.error("Failed to create replay");
    }
  };

  const handleDeleteReplay = async (id: number) => {
    if (!confirm("Are you sure you want to delete this replay?")) return;
    try {
      await deleteReplayMutation.mutateAsync({ id });
      toast.success("Replay deleted");
      replaysQuery.refetch();
    } catch (error) {
      toast.error("Failed to delete replay");
    }
  };

  return (
    <div className="min-h-screen bg-navy-deep text-cream">
      <header className="border-b border-white/5 bg-navy-deep/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => setLocation("/portal")} variant="ghost" size="sm" className="text-cream-muted hover:text-cream">
              <ArrowLeft className="w-4 h-4 mr-2" />Back
            </Button>
            <h1 className="text-2xl font-bold font-display">Admin Panel</h1>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-ember hover:bg-ember-light text-navy-deep font-semibold">
            <Plus className="w-4 h-4 mr-2" />Add Replay
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {showForm && (
          <div className="bg-navy border border-white/5 rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-bold font-display mb-6">Add New Replay</h2>
            <form onSubmit={handleCreateReplay} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Title *</label>
                <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-navy-light border border-white/10 rounded-lg px-4 py-3 text-cream placeholder-cream-muted focus:outline-none focus:border-ember" placeholder="e.g., Coaching Call - March 2026" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-navy-light border border-white/10 rounded-lg px-4 py-3 text-cream placeholder-cream-muted focus:outline-none focus:border-ember" placeholder="What's this replay about?" rows={3} />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Video URL</label>
                  <input type="url" value={formData.videoUrl} onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })} className="w-full bg-navy-light border border-white/10 rounded-lg px-4 py-3 text-cream placeholder-cream-muted focus:outline-none focus:border-ember" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Thumbnail URL</label>
                  <input type="url" value={formData.thumbnailUrl} onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })} className="w-full bg-navy-light border border-white/10 rounded-lg px-4 py-3 text-cream placeholder-cream-muted focus:outline-none focus:border-ember" placeholder="https://..." />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Duration</label>
                  <input type="text" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="w-full bg-navy-light border border-white/10 rounded-lg px-4 py-3 text-cream placeholder-cream-muted focus:outline-none focus:border-ember" placeholder="e.g., 1h 23m" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-navy-light border border-white/10 rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-ember">
                    <option value="general">General</option>
                    <option value="coaching">Coaching Call</option>
                    <option value="course">Course</option>
                    <option value="sales">Sales Training</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <Button type="submit" disabled={createReplayMutation.isPending} className="bg-ember hover:bg-ember-light text-navy-deep font-semibold">
                  {createReplayMutation.isPending ? "Creating..." : "Create Replay"}
                </Button>
                <Button type="button" onClick={() => setShowForm(false)} variant="outline" className="border-white/10 text-cream hover:bg-white/5">Cancel</Button>
              </div>
            </form>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold font-display mb-6">All Replays ({replaysQuery.data?.length || 0})</h2>
          {replaysQuery.isLoading ? (
            <div className="text-center py-12"><p className="text-cream-muted">Loading replays...</p></div>
          ) : replaysQuery.data && replaysQuery.data.length > 0 ? (
            <div className="space-y-4">
              {replaysQuery.data.map((replay) => (
                <div key={replay.id} className="bg-navy border border-white/5 rounded-lg p-6 flex items-start justify-between hover:border-white/10 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-bold font-display mb-1">{replay.title}</h3>
                    {replay.description && <p className="text-sm text-cream-muted mb-2 line-clamp-1">{replay.description}</p>}
                    <div className="flex gap-3 text-xs text-cream-muted">
                      {replay.category && <span>Category: {replay.category}</span>}
                      {replay.duration && <span>Duration: {replay.duration}</span>}
                    </div>
                  </div>
                  <Button onClick={() => handleDeleteReplay(replay.id)} disabled={deleteReplayMutation.isPending} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-navy border border-white/5 rounded-lg">
              <p className="text-cream-muted">No replays yet. Click "Add Replay" to create one.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
