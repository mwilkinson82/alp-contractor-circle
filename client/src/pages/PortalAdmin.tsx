/**
 * Admin Panel — Replay Library Management
 * Only visible to members with memberRole === "admin".
 * Lets Marshall add, edit, and delete Cloudflare Stream replays without touching code.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useMember } from "@/hooks/useMember";
import { useLocation } from "wouter";
import {
  Plus,
  Trash2,
  Edit3,
  Video,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Category = "weekly_calls" | "bootcamp" | "masterclass" | "q_and_a";

const CATEGORY_LABELS: Record<Category, string> = {
  weekly_calls: "Weekly Call",
  bootcamp: "Bootcamp",
  masterclass: "Masterclass",
  q_and_a: "Q&A Session",
};

const CATEGORY_COLORS: Record<Category, string> = {
  weekly_calls: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  bootcamp: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  masterclass: "bg-ember/10 text-ember border-ember/20",
  q_and_a: "bg-green-500/10 text-green-400 border-green-500/20",
};

interface ReplayFormData {
  title: string;
  description: string;
  category: Category;
  cloudflareStreamId: string;
  duration: string;
  callDate: string;
  featured: boolean;
}

const emptyForm: ReplayFormData = {
  title: "",
  description: "",
  category: "weekly_calls",
  cloudflareStreamId: "",
  duration: "",
  callDate: new Date().toISOString().split("T")[0],
  featured: false,
};

export default function PortalAdmin() {
  const { member } = useMember();
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ReplayFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Redirect non-admins
  if (member && member.memberRole !== "admin") {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-cream mb-2">Access Denied</h2>
        <p className="text-cream-muted mb-6">This area is restricted to administrators.</p>
        <Button onClick={() => setLocation("/portal")} variant="outline" className="border-white/10 text-cream">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const utils = trpc.useUtils();

  // Fetch all replays (admin sees all including unpublished)
  const { data, isLoading } = trpc.member.replays.useQuery();
  const replays = data?.replays || [];

  const addMutation = trpc.member.addReplay.useMutation({
    onSuccess: () => {
      utils.member.replays.invalidate();
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success("Replay added! It's now live in the library.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = trpc.member.deleteReplay.useMutation({
    onSuccess: () => {
      utils.member.replays.invalidate();
      setDeleteConfirm(null);
      toast.success("Replay deleted.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.cloudflareStreamId || !form.callDate) {
      toast.error("Title, Cloudflare Stream ID, and date are required.");
      return;
    }
    addMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      category: form.category,
      cloudflareStreamId: form.cloudflareStreamId,
      duration: form.duration || undefined,
      callDate: new Date(form.callDate),
      featured: form.featured,
    });
  }

  function handleEdit(replay: typeof replays[0]) {
    setForm({
      title: replay.title,
      description: replay.description || "",
      category: replay.category as Category,
      cloudflareStreamId: replay.cloudflareStreamId,
      duration: replay.duration || "",
      callDate: new Date(replay.callDate).toISOString().split("T")[0],
      featured: replay.featured,
    });
    setEditingId(replay.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-ember" />
            <span className="text-xs font-semibold text-ember uppercase tracking-wider">Admin Panel</span>
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-cream">
            Replay Library Manager
          </h1>
          <p className="text-cream-muted mt-1 text-sm">
            Add Cloudflare Stream video IDs to publish replays to members.
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
            className="bg-ember hover:bg-ember/90 text-white shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Replay
          </Button>
        )}
      </div>

      {/* Cloudflare Workflow Guide */}
      <div className="glass-card rounded-xl p-5 border border-ember/10">
        <h3 className="font-heading text-sm font-semibold text-cream mb-3 flex items-center gap-2">
          <Video className="w-4 h-4 text-ember" />
          How to add a new replay after each Thursday call
        </h3>
        <ol className="space-y-2 text-sm text-cream-muted">
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-ember/10 text-ember text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span>Zoom sends you the recording link automatically after the call ends.</span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-ember/10 text-ember text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span>
              Open{" "}
              <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-ember hover:underline inline-flex items-center gap-1">
                Cloudflare Stream <ExternalLink className="w-3 h-3" />
              </a>
              {" "}→ Upload → "Upload via URL" → paste the Zoom recording link.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-ember/10 text-ember text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span>Once processed, copy the <strong className="text-cream">Video ID</strong> from Cloudflare Stream (it looks like: <code className="text-ember bg-ember/5 px-1 rounded text-xs">a4eXaMpLeId123</code>).</span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-ember/10 text-ember text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
            <span>Click <strong className="text-cream">"Add Replay"</strong> above, fill in the details, paste the Video ID, and hit Save. Done.</span>
          </li>
        </ol>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="glass-card rounded-2xl p-6 md:p-8 border border-ember/20">
          <h2 className="font-heading text-lg font-semibold text-cream mb-6">
            {editingId ? "Edit Replay" : "Add New Replay"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">
                  Title <span className="text-ember">*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Weekly Call: Scaling Your Estimating Process"
                  className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 focus:border-ember/50"
                  required
                />
              </div>

              {/* Cloudflare Stream ID */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">
                  Cloudflare Stream Video ID <span className="text-ember">*</span>
                </label>
                <Input
                  value={form.cloudflareStreamId}
                  onChange={e => setForm(f => ({ ...f, cloudflareStreamId: e.target.value.trim() }))}
                  placeholder="e.g. a4eXaMpLeId123abc456"
                  className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 focus:border-ember/50 font-mono text-sm"
                  required
                />
                {form.cloudflareStreamId && (
                  <p className="text-xs text-cream-muted mt-1.5">
                    Preview:{" "}
                    <a
                      href={`https://iframe.videodelivery.net/${form.cloudflareStreamId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ember hover:underline inline-flex items-center gap-1"
                    >
                      Open embed URL <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">
                  Category
                </label>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm(f => ({ ...f, category: val as Category }))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-cream focus:border-ember/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-navy border-white/10">
                    {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="text-cream focus:bg-ember/10 focus:text-ember">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Call Date */}
              <div>
                <label className="block text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">
                  Call Date <span className="text-ember">*</span>
                </label>
                <Input
                  type="date"
                  value={form.callDate}
                  onChange={e => setForm(f => ({ ...f, callDate: e.target.value }))}
                  className="bg-white/5 border-white/10 text-cream focus:border-ember/50"
                  required
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">
                  Duration
                </label>
                <Input
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  placeholder="e.g. 1h 24m"
                  className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 focus:border-ember/50"
                />
              </div>

              {/* Featured */}
              <div className="flex items-center gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, featured: !f.featured }))}
                  className={`w-10 h-6 rounded-full transition-all duration-200 relative ${form.featured ? "bg-ember" : "bg-white/10"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${form.featured ? "left-5" : "left-1"}`} />
                </button>
                <span className="text-sm text-cream-muted">Feature at top of library</span>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">
                  Description
                </label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of what was covered in this session..."
                  className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 focus:border-ember/50 resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={addMutation.isPending}
                className="bg-ember hover:bg-ember/90 text-white"
              >
                {addMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> {editingId ? "Update Replay" : "Add Replay"}</>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelForm}
                className="border-white/10 text-cream-muted hover:text-cream"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Replay List */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-cream mb-4">
          All Replays ({replays.length})
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-ember animate-spin" />
          </div>
        ) : replays.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <Video className="w-10 h-10 text-cream-muted/30 mx-auto mb-3" />
            <p className="text-cream-muted">No replays yet. Add your first one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {replays.map(replay => (
              <div
                key={replay.id}
                className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Thumbnail */}
                <div className="w-full sm:w-28 h-16 rounded-lg overflow-hidden bg-white/5 shrink-0">
                  <img
                    src={replay.thumbnailUrl}
                    alt={replay.title}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[replay.category as Category]}`}>
                      {CATEGORY_LABELS[replay.category as Category]}
                    </span>
                    {replay.featured && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        Featured
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading text-sm font-semibold text-cream truncate">{replay.title}</h3>
                  <p className="text-xs text-cream-muted mt-0.5">
                    {new Date(replay.callDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {replay.duration && ` · ${replay.duration}`}
                    {" · "}
                    <span className="font-mono text-ember/70">{replay.cloudflareStreamId}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={replay.embedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    title="Preview video"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-cream-muted" />
                  </a>
                  <button
                    onClick={() => handleEdit(replay)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-ember/10 flex items-center justify-center transition-colors"
                    title="Edit replay"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-cream-muted hover:text-ember" />
                  </button>
                  {deleteConfirm === replay.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteMutation.mutate({ id: replay.id })}
                        disabled={deleteMutation.isPending}
                        className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
                      >
                        {deleteMutation.isPending ? "..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 rounded-lg bg-white/5 text-cream-muted text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(replay.id)}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                      title="Delete replay"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-cream-muted hover:text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
