const PRESENCE_PAGE_LABELS: Array<{ prefix: string; label: string; work: string }> = [
  { prefix: "/portal/constructline", label: "ConstructLine Hub", work: "Viewing the ConstructLine command hub" },
  { prefix: "/portal/takeoff/", label: "ConstructLine Basis", work: "Working inside a Basis estimate" },
  { prefix: "/portal/takeoff", label: "Basis Bid Desk", work: "Reviewing estimating projects" },
  { prefix: "/portal/cost-library", label: "Basis Cost Library", work: "Tuning material and unit costs" },
  { prefix: "/portal/labor-library", label: "Basis Trade Rate Library", work: "Tuning trade rates and crews" },
  { prefix: "/scheduler/", label: "ConstructLine Baseline", work: "Working inside a Baseline schedule" },
  { prefix: "/portal/scheduler", label: "Baseline", work: "Reviewing Baseline schedules" },
  { prefix: "/portal/replays", label: "Replay Library", work: "Watching member training" },
  { prefix: "/portal/templates", label: "Templates", work: "Reviewing templates" },
  { prefix: "/portal/account", label: "Account", work: "Managing account settings" },
  { prefix: "/portal/admin", label: "Admin Panel", work: "Reviewing portal operations" },
  { prefix: "/portal/subscribers", label: "Subscribers", work: "Reviewing subscribers" },
  { prefix: "/portal/members", label: "Members", work: "Reviewing members" },
  { prefix: "/portal/analytics", label: "Analytics", work: "Reviewing analytics" },
  { prefix: "/portal/drip", label: "Drip Campaigns", work: "Managing drip campaigns" },
  { prefix: "/portal/feedback", label: "Feedback", work: "Reviewing feedback" },
  { prefix: "/portal/dashboard", label: "Dashboard", work: "Viewing the member dashboard" },
  { prefix: "/portal", label: "Dashboard", work: "Viewing the member dashboard" },
];

export function formatPresencePage(path: string | null | undefined): string {
  if (!path) return "Unknown page";
  const match = PRESENCE_PAGE_LABELS.find((entry) => path.startsWith(entry.prefix));
  return match?.label ?? path;
}

export function formatPresenceWork(path: string | null | undefined): string {
  if (!path) return "No page reported yet";
  const match = PRESENCE_PAGE_LABELS.find((entry) => path.startsWith(entry.prefix));
  return match?.work ?? `Viewing ${path}`;
}

export function describePresenceWindow(seconds: number): string {
  if (seconds < 60) return `seen in the last ${seconds} seconds`;
  const minutes = Math.round(seconds / 60);
  return `seen in the last ${minutes} minute${minutes === 1 ? "" : "s"}`;
}
