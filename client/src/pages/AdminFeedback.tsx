/**
 * AdminFeedback — Admin page for viewing and managing beta user feedback.
 * Shows all feedback submissions with filtering, status management, and screenshot viewing.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  MessageCircle,
  HelpCircle,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  XCircle,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

type FeedbackStatus = "new" | "reviewed" | "in_progress" | "resolved" | "wont_fix";
type FeedbackCategory = "bug" | "feature" | "general" | "other";

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; color: string; icon: any }> = {
  new: { label: "New", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: CheckCircle2 },
  in_progress: { label: "In Progress", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Loader2 },
  resolved: { label: "Resolved", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  wont_fix: { label: "Won't Fix", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
};

const CATEGORY_CONFIG: Record<FeedbackCategory, { label: string; icon: any; color: string }> = {
  bug: { label: "Bug", icon: Bug, color: "text-red-400" },
  feature: { label: "Feature", icon: Lightbulb, color: "text-amber-400" },
  general: { label: "General", icon: MessageCircle, color: "text-blue-400" },
  other: { label: "Other", icon: HelpCircle, color: "text-purple-400" },
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function AdminFeedback() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);

  const { data: feedbackList, isLoading, refetch } = trpc.feedback.list.useQuery();
  const updateStatus = trpc.feedback.updateStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Feedback status updated");
    },
  });
  const deleteFeedback = trpc.feedback.delete.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedFeedback(null);
      toast.success("Feedback deleted");
    },
  });

  const filtered = (feedbackList || []).filter((f: any) => {
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    if (filterCategory !== "all" && f.category !== filterCategory) return false;
    return true;
  });

  const statusCounts = (feedbackList || []).reduce((acc: any, f: any) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold text-cream">Beta Feedback</h1>
            <p className="text-cream-muted text-sm">
              {feedbackList?.length || 0} total submissions
            </p>
          </div>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(Object.entries(STATUS_CONFIG) as [FeedbackStatus, typeof STATUS_CONFIG[FeedbackStatus]][]).map(([key, config]) => {
          const Icon = config.icon;
          const count = statusCounts[key] || 0;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${
                filterStatus === key
                  ? config.color + " border-current"
                  : "bg-white/5 border-white/10 text-cream-muted hover:bg-white/10"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{config.label}</span>
              <span className="ml-auto font-mono text-sm font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-cream-muted" />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40 bg-navy-deep/50 border-white/10 text-cream h-8 text-xs">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="bug">Bug Reports</SelectItem>
            <SelectItem value="feature">Feature Requests</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-cream-muted text-xs">
          Showing {filtered.length} of {feedbackList?.length || 0}
        </span>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-cream-muted">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No feedback submissions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f: any) => {
            const catConfig = CATEGORY_CONFIG[f.category as FeedbackCategory] || CATEGORY_CONFIG.general;
            const statusConfig = STATUS_CONFIG[f.status as FeedbackStatus] || STATUS_CONFIG.new;
            const CatIcon = catConfig.icon;
            const StatusIcon = statusConfig.icon;
            return (
              <div
                key={f.id}
                onClick={() => {
                  setSelectedFeedback(f);
                  setAdminNotes(f.adminNotes || "");
                }}
                className="bg-navy-deep/40 border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${catConfig.color}`}>
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-cream font-medium text-sm">{f.memberName || `Member #${f.memberId}`}</span>
                      <Badge className={`text-[10px] ${statusConfig.color} border`}>
                        <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                        {statusConfig.label}
                      </Badge>
                      {f.screenshotUrl && (
                        <span title="Has screenshot"><ImageIcon className="w-3.5 h-3.5 text-cream-muted/40" /></span>
                      )}
                    </div>
                    <p className="text-cream-muted text-sm line-clamp-2">{f.message}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-cream-muted/40">
                      <span>{timeAgo(new Date(f.createdAt))}</span>
                      {f.page && <span>Page: {f.page}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="bg-navy-deep border-white/10 text-cream max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              Feedback Detail
            </DialogTitle>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              {/* Meta */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-xs ${CATEGORY_CONFIG[selectedFeedback.category as FeedbackCategory]?.color || ""} bg-white/5 border border-white/10`}>
                  {CATEGORY_CONFIG[selectedFeedback.category as FeedbackCategory]?.label || selectedFeedback.category}
                </Badge>
                <span className="text-cream-muted text-xs">from</span>
                <span className="text-cream font-medium text-sm">{selectedFeedback.memberName}</span>
                <span className="text-cream-muted/40 text-xs ml-auto">{timeAgo(new Date(selectedFeedback.createdAt))}</span>
              </div>

              {/* Message */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-cream text-sm whitespace-pre-wrap">{selectedFeedback.message}</p>
              </div>

              {/* Screenshot */}
              {selectedFeedback.screenshotUrl && (
                <div>
                  <button
                    onClick={() => setScreenshotModal(selectedFeedback.screenshotUrl)}
                    className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10 hover:border-amber-500/30 transition-colors group"
                  >
                    <img
                      src={selectedFeedback.screenshotUrl}
                      alt="Feedback screenshot"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                  </button>
                </div>
              )}

              {/* Page & User Agent */}
              <div className="text-[10px] text-cream-muted/40 space-y-0.5">
                {selectedFeedback.page && <p>Page: {selectedFeedback.page}</p>}
                {selectedFeedback.userAgent && <p className="truncate">UA: {selectedFeedback.userAgent}</p>}
              </div>

              {/* Status Update */}
              <div className="space-y-2">
                <label className="text-xs text-cream-muted uppercase tracking-wider">Status</label>
                <Select
                  value={selectedFeedback.status}
                  onValueChange={(val) => {
                    updateStatus.mutate({ id: selectedFeedback.id, status: val as FeedbackStatus, adminNotes });
                    setSelectedFeedback({ ...selectedFeedback, status: val });
                  }}
                >
                  <SelectTrigger className="bg-navy-deep/50 border-white/10 text-cream h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="wont_fix">Won't Fix</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <label className="text-xs text-cream-muted uppercase tracking-wider">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes about this feedback..."
                  rows={3}
                  className="bg-navy-deep/50 border-white/10 text-cream resize-none text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-cream-muted hover:text-cream"
                  onClick={() => {
                    updateStatus.mutate({
                      id: selectedFeedback.id,
                      status: selectedFeedback.status,
                      adminNotes,
                    });
                  }}
                  disabled={updateStatus.isPending}
                >
                  Save Notes
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => {
                if (confirm("Delete this feedback permanently?")) {
                  deleteFeedback.mutate({ id: selectedFeedback.id });
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Screenshot Full View */}
      <Dialog open={!!screenshotModal} onOpenChange={(open) => !open && setScreenshotModal(null)}>
        <DialogContent className="bg-navy-deep border-white/10 max-w-3xl p-2">
          {screenshotModal && (
            <img
              src={screenshotModal}
              alt="Feedback screenshot"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
