/**
 * Admin Subscriber Dashboard
 * View, search, and export all email subscribers from the homepage capture form.
 * Only accessible to admin members.
 */
import { useMember } from "@/hooks/useMember";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Mail, Download, Search, Loader2, AlertCircle } from "lucide-react";

export default function PortalSubscribers() {
  const { member } = useMember();
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);

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

  // Filter subscribers based on search query
  const filteredSubscribers = useMemo(() => {
    if (!subscribersData?.subscribers) return [];
    if (!searchQuery.trim()) return subscribersData.subscribers;

    const query = searchQuery.toLowerCase();
    return subscribersData.subscribers.filter((sub: any) =>
      sub.email.toLowerCase().includes(query)
    );
  }, [subscribersData, searchQuery]);

  // Export to CSV
  const handleExport = () => {
    if (!subscribersData?.subscribers) return;

    setIsExporting(true);
    try {
      const headers = ["Email", "Source", "Verified", "Signup Date"];
      const rows = subscribersData.subscribers.map((sub: any) => [
        sub.email,
        sub.source || "homepage_capture",
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
                      <span className="text-cream-muted text-sm">
                        {subscriber.source || "homepage_capture"}
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
