/**
 * Admin Subscriber Dashboard
 * View, search, and export all email subscribers from the homepage capture form.
 * Only accessible to admin members.
 */
import { useMember } from "@/hooks/useMember";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Mail, Download, Search, Loader2, AlertCircle, Filter } from "lucide-react";

/** Human-readable labels for subscriber source tags */
const SOURCE_LABELS: Record<string, string> = {
  homepage_capture: "Homepage",
  "estimating-checklist": "Estimating Checklist",
  "lead_magnet_estimating-checklist": "Estimating Checklist",
  "q1-q2-framework": "Q1/Q2 Framework",
  "lead_magnet_q1-q2-framework": "Q1/Q2 Framework",
  "three-silos-framework": "Three Silos Framework",
  "lead_magnet_three-silos-framework": "Three Silos Framework",
  constructline_beta: "ConstructLine Beta",
  "contractor-circle-subscribe": "Circle Subscriber",
};

/** Color classes for source badges */
const SOURCE_COLORS: Record<string, string> = {
  homepage_capture: "bg-blue-500/10 text-blue-400",
  "estimating-checklist": "bg-purple-500/10 text-purple-400",
  "lead_magnet_estimating-checklist": "bg-purple-500/10 text-purple-400",
  "q1-q2-framework": "bg-teal-500/10 text-teal-400",
  "lead_magnet_q1-q2-framework": "bg-teal-500/10 text-teal-400",
  "three-silos-framework": "bg-amber-500/10 text-amber-400",
  "lead_magnet_three-silos-framework": "bg-amber-500/10 text-amber-400",
  constructline_beta: "bg-emerald-500/10 text-emerald-400",
  "contractor-circle-subscribe": "bg-orange-500/10 text-orange-400",
};

/** Normalize source to a canonical key for grouping (strip lead_magnet_ prefix) */
function normalizeSource(source: string | null | undefined): string {
  const s = source || "homepage_capture";
  return s.replace(/^lead_magnet_/, "");
}

function getSourceLabel(source: string | null | undefined): string {
  const s = source || "homepage_capture";
  return SOURCE_LABELS[s] || SOURCE_LABELS[normalizeSource(s)] || s.replace(/^lead_magnet_/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getSourceColor(source: string | null | undefined): string {
  const s = source || "homepage_capture";
  return SOURCE_COLORS[s] || SOURCE_COLORS[normalizeSource(s)] || "bg-white/5 text-cream-muted";
}

export default function PortalSubscribers() {
  const { member } = useMember();
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  // Check admin access
  if (member?.memberRole !== "admin") {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-2xl p-8 border border-red-500/20 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="font-heading text-xl font-bold text-cream mb-2">Access Denied</h2>
          <p className="text-cream-muted">Only administrators can view the subscriber dashboard.</p>
        </div>
      </div>
    );
  }

  // Fetch all subscribers
  const { data: subscribersData, isLoading, error } = trpc.member.adminSubscribers.useQuery();

  // Get unique sources for filter dropdown (grouped by normalized source)
  const uniqueSources = useMemo(() => {
    if (!subscribersData?.subscribers) return [];
    const sourceCounts = new Map<string, number>();
    subscribersData.subscribers.forEach((sub: any) => {
      const normalized = normalizeSource(sub.source);
      sourceCounts.set(normalized, (sourceCounts.get(normalized) || 0) + 1);
    });
    return Array.from(sourceCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([source, count]) => ({ source, count }));
  }, [subscribersData]);

  // Filter subscribers based on search query and source filter
  const filteredSubscribers = useMemo(() => {
    if (!subscribersData?.subscribers) return [];
    let result = subscribersData.subscribers;

    // Apply source filter (match by normalized source)
    if (sourceFilter !== "all") {
      result = result.filter((sub: any) => normalizeSource(sub.source) === sourceFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((sub: any) =>
        sub.email.toLowerCase().includes(query)
      );
    }

    return result;
  }, [subscribersData, searchQuery, sourceFilter]);

  // Export to CSV
  const handleExport = () => {
    if (!subscribersData?.subscribers) return;

    setIsExporting(true);
    try {
      const headers = ["Email", "Source", "Verified", "Signup Date"];
      const rows = subscribersData.subscribers.map((sub: any) => [
        sub.email,
        getSourceLabel(sub.source),
        sub.verified ? "Yes" : "No",
        new Date(sub.createdAt).toLocaleDateString("en-US"),
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subscribers-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-cream">Email Subscribers</h1>
          <p className="text-cream-muted mt-1">
            Manage all email subscribers from the homepage capture form
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isLoading || isExporting || !subscribersData?.subscribers?.length}
          className="inline-flex items-center gap-2 px-6 py-3 bg-ember hover:bg-ember/90 text-white font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export CSV
            </>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cream-muted" />
        <input
          type="text"
          placeholder="Search by email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-cream-muted/50 focus:outline-none focus:border-ember/40"
        />
      </div>

      {/* Stats */}
      {subscribersData && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card rounded-xl p-4">
              <p className="text-cream-muted text-sm">Total Subscribers</p>
              <p className="font-heading text-2xl font-bold text-cream mt-1">
                {subscribersData.subscribers.length}
              </p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <p className="text-cream-muted text-sm">Verified</p>
              <p className="font-heading text-2xl font-bold text-green-400 mt-1">
                {subscribersData.subscribers.filter((s: any) => s.verified).length}
              </p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <p className="text-cream-muted text-sm">Unverified</p>
              <p className="font-heading text-2xl font-bold text-yellow-400 mt-1">
                {subscribersData.subscribers.filter((s: any) => !s.verified).length}
              </p>
            </div>
          </div>

          {/* Source Breakdown */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSourceFilter("all")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sourceFilter === "all"
                  ? "bg-ember/20 text-ember border border-ember/30"
                  : "bg-white/5 text-cream-muted border border-white/10 hover:bg-white/10"
              }`}
            >
              All ({subscribersData.subscribers.length})
            </button>
            {uniqueSources.map(({ source, count }) => (
              <button
                key={source}
                onClick={() => setSourceFilter(source)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sourceFilter === source
                    ? "bg-ember/20 text-ember border border-ember/30"
                    : `${getSourceColor(source)} border border-white/10 hover:border-white/20`
                }`}
              >
                {getSourceLabel(source)} ({count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Subscribers Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-ember animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-cream-muted">Failed to load subscribers</p>
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="w-8 h-8 text-cream-muted/50 mx-auto mb-3" />
            <p className="text-cream-muted">
              {searchQuery ? "No subscribers match your search" : "No subscribers yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-cream-muted uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-cream-muted uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-cream-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-cream-muted uppercase tracking-wider">
                    Signup Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSubscribers.map((subscriber: any) => (
                  <tr key={subscriber.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <a
                        href={`mailto:${subscriber.email}`}
                        className="text-cream hover:text-ember transition-colors break-all"
                      >
                        {subscriber.email}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getSourceColor(subscriber.source)}`}>
                        {getSourceLabel(subscriber.source)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          subscriber.verified
                            ? "bg-green-500/10 text-green-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {subscriber.verified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-cream-muted text-sm">
                      {new Date(subscriber.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results info */}
      {filteredSubscribers.length > 0 && (
        <p className="text-cream-muted text-sm text-center">
          Showing {filteredSubscribers.length} of {subscribersData?.subscribers.length} subscribers
        </p>
      )}
    </div>
  );
}
