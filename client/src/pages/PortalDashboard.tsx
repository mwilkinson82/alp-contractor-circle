/**
 * Contractor Circle member dashboard.
 *
 * This is intentionally separate from the ConstructLine Hub. It routes members
 * to calls, replays, templates, account details, and question/topic submission.
 */
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMember } from "@/hooks/useMember";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock,
  ExternalLink,
  FileDown,
  LayoutGrid,
  MessageSquare,
  PlayCircle,
  Send,
  Settings,
  Sparkles,
  Video,
  X,
} from "lucide-react";

const ZOOM_CALL_LINK =
  "https://us06web.zoom.us/j/83215167292?pwd=Mtt970HFCPStqSw62btyyta2Wxo0Pr.1";
const DEFAULT_BOOTCAMP_DATE = "2026-04-26";
const DEFAULT_BOOTCAMP_TIME = "17:00";
const DEFAULT_BOOTCAMP_DAY = "Sunday";
const DEFAULT_BOOTCAMP_ZOOM =
  "https://us06web.zoom.us/j/87028206220?pwd=k2YtkNdLz7y1nnkZt0HFSe0obntSnl.1";

const LIVE_CALL_EXCEPTIONS: Record<string, { movedTo: Date; note: string }> = {
  "2026-05-10": {
    movedTo: new Date(Date.UTC(2026, 4, 9, 21, 0, 0)),
    note: "Moved to Saturday for Mother's Day weekend.",
  },
};

function getStandardNextCallDate(now = new Date()): Date {
  const anchor = new Date(Date.UTC(2025, 2, 30, 21, 0, 0));
  const daysSinceAnchor = Math.floor(
    (now.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24)
  );
  const cyclesPassed =
    daysSinceAnchor < 0 ? 0 : Math.floor(daysSinceAnchor / 14);
  const isCallDay = daysSinceAnchor >= 0 && daysSinceAnchor % 14 === 0;
  const nextCallOffset = isCallDay ? 0 : (cyclesPassed + 1) * 14;
  return new Date(anchor.getTime() + nextCallOffset * 24 * 60 * 60 * 1000);
}

function getNextCallDate(now = new Date()): Date {
  const standardDate = getStandardNextCallDate(now);
  const standardKey = standardDate.toISOString().split("T")[0];
  const exception = LIVE_CALL_EXCEPTIONS[standardKey];

  if (!exception) return standardDate;

  const exceptionWindowEnd = new Date(
    exception.movedTo.getTime() + 2 * 60 * 60 * 1000
  );

  if (now.getTime() <= exceptionWindowEnd.getTime()) {
    return exception.movedTo;
  }

  return new Date(standardDate.getTime() + 14 * 24 * 60 * 60 * 1000);
}

function getUpcomingCallDates(count: number): Date[] {
  const firstCall = getNextCallDate();
  const standardFirst = getStandardNextCallDate();
  const standardKey = standardFirst.toISOString().split("T")[0];
  const isMovedException =
    LIVE_CALL_EXCEPTIONS[standardKey]?.movedTo.getTime() ===
    firstCall.getTime();

  const dates = [firstCall];
  const nextScheduleAnchor = isMovedException ? standardFirst : firstCall;

  for (let index = 1; index < count; index += 1) {
    dates.push(
      new Date(nextScheduleAnchor.getTime() + index * 14 * 24 * 60 * 60 * 1000)
    );
  }

  return dates;
}

function getNextCallCycle(): string {
  return getNextCallDate().toISOString().split("T")[0];
}

function formatDate(value?: string | Date | null): string {
  if (!value) return "No date set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date set";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(value: Date): { month: string; day: string } {
  return {
    month: value
      .toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
      .toUpperCase(),
    day: value.toLocaleDateString("en-US", {
      day: "2-digit",
      timeZone: "UTC",
    }),
  };
}

function formatCallDetail(value: Date): string {
  const weekday = value.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  return `${weekday} at 5:00 PM ET`;
}

function formatBootcampDisplay(
  dateStr: string,
  dayLabel: string,
  timeStr: string
): string {
  const date = new Date(`${dateStr}T12:00:00Z`);
  const month = date.toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
  const [hour] = timeStr.split(":");
  const hour24 = Number.parseInt(hour, 10);
  const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
  const ampm = hour24 >= 12 ? "PM" : "AM";
  return `${dayLabel}, ${month} ${date.getUTCDate()} at ${hour12} ${ampm} ET`;
}

function buildCalendarUrl({
  title,
  details,
  start,
  durationHours = 2,
  location,
}: {
  title: string;
  details: string;
  start: Date;
  durationHours?: number;
  location: string;
}) {
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  const format = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${format(start)}/${format(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
}

function buildBootcampCalendarUrl(
  dateStr: string,
  timeStr: string,
  zoomLink: string
) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, hour + 4, minute));
  return buildCalendarUrl({
    title: "Contractor Circle Monthly Bootcamp",
    details: `Deep dive training with Contractor Circle.\n\nJoin Zoom:\n${zoomLink}`,
    start,
    durationHours: 2,
    location: zoomLink,
  });
}

function ModalShell({
  title,
  eyebrow,
  icon: Icon,
  children,
  onClose,
}: {
  title: string;
  eyebrow: string;
  icon: typeof Send;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-[#d7c7aa] bg-[#fffdf8] shadow-[0_36px_110px_rgba(41,37,28,0.28)] sm:max-w-xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eadcc4] bg-[#fffdf8]/96 px-6 py-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7c7aa] bg-[#fff4cb] text-[#8a6510]">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b58513]">
                {eyebrow}
              </p>
              <h3 className="text-lg font-semibold text-[#171714]">{title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#716855] transition-colors hover:bg-[#faf3e6] hover:text-[#171714]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

function SubmitQuestionModal({ onClose }: { onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const utils = trpc.useUtils();

  const submitQuestion = trpc.member.submitQuestion.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setQuestion("");
      setContext("");
      utils.member.myQuestions.invalidate();
    },
  });

  return (
    <ModalShell
      title="Submit a Question"
      eyebrow="Next live call"
      icon={Send}
      onClose={onClose}
    >
      {submitted ? (
        <SuccessMessage
          title="Question submitted"
          detail="Marshall will review it before the next live call."
          onClose={onClose}
        />
      ) : (
        <>
          <div className="space-y-2">
            <FieldLabel label="Your question" required />
            <textarea
              value={question}
              onChange={event => setQuestion(event.target.value)}
              placeholder="What's the most important thing you need clarity on before the next call?"
              rows={5}
              maxLength={1000}
              className="w-full resize-none rounded-xl border border-[#d7c7aa] bg-white px-4 py-3 text-sm text-[#171714] outline-none transition-colors placeholder:text-[#9d9484] focus:border-[#c48d12]"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <FieldLabel label="Context" optional />
            <textarea
              value={context}
              onChange={event => setContext(event.target.value)}
              placeholder="Project size, what you tried, what is at stake..."
              rows={3}
              maxLength={2000}
              className="w-full resize-none rounded-xl border border-[#d7c7aa] bg-white px-4 py-3 text-sm text-[#171714] outline-none transition-colors placeholder:text-[#9d9484] focus:border-[#c48d12]"
            />
          </div>
          <Button
            className="h-11 w-full rounded-xl bg-[#090b0f] text-[#f1b51d] hover:bg-[#171a20] disabled:bg-[#e7e1d6] disabled:text-[#9d9484]"
            disabled={question.trim().length < 10 || submitQuestion.isPending}
            onClick={() =>
              submitQuestion.mutate({
                question,
                context: context || undefined,
                callCycle: getNextCallCycle(),
              })
            }
          >
            <Send className="mr-2 h-4 w-4" />
            {submitQuestion.isPending ? "Submitting..." : "Submit Question"}
          </Button>
        </>
      )}
    </ModalShell>
  );
}

function SubmitTopicModal({
  onClose,
  bootcampDate,
}: {
  onClose: () => void;
  bootcampDate: string;
}) {
  const [topic, setTopic] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const utils = trpc.useUtils();

  const submitTopic = trpc.member.submitBootcampTopic.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setTopic("");
      setReason("");
      utils.member.myBootcampTopics.invalidate();
    },
  });

  return (
    <ModalShell
      title="Submit a Bootcamp Topic"
      eyebrow="Monthly bootcamp"
      icon={MessageSquare}
      onClose={onClose}
    >
      {submitted ? (
        <SuccessMessage
          title="Topic submitted"
          detail="Marshall will review submissions while shaping the bootcamp."
          onClose={onClose}
        />
      ) : (
        <>
          <div className="space-y-2">
            <FieldLabel label="Topic" required />
            <input
              value={topic}
              onChange={event => setTopic(event.target.value)}
              placeholder="e.g. Pricing change orders profitably"
              maxLength={512}
              className="h-12 w-full rounded-xl border border-[#d7c7aa] bg-white px-4 text-sm text-[#171714] outline-none transition-colors placeholder:text-[#9d9484] focus:border-[#c48d12]"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <FieldLabel label="Why this matters" optional />
            <textarea
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder="What are you trying to solve in the field or in the business?"
              rows={4}
              maxLength={2000}
              className="w-full resize-none rounded-xl border border-[#d7c7aa] bg-white px-4 py-3 text-sm text-[#171714] outline-none transition-colors placeholder:text-[#9d9484] focus:border-[#c48d12]"
            />
          </div>
          <Button
            className="h-11 w-full rounded-xl bg-[#090b0f] text-[#f1b51d] hover:bg-[#171a20] disabled:bg-[#e7e1d6] disabled:text-[#9d9484]"
            disabled={topic.trim().length < 5 || submitTopic.isPending}
            onClick={() =>
              submitTopic.mutate({
                topic,
                reason: reason || undefined,
                bootcampDate,
              })
            }
          >
            <Send className="mr-2 h-4 w-4" />
            {submitTopic.isPending ? "Submitting..." : "Submit Topic"}
          </Button>
        </>
      )}
    </ModalShell>
  );
}

function FieldLabel({
  label,
  required,
  optional,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#716855]">
      {label}
      {required && <span className="text-[#c48d12]"> *</span>}
      {optional && (
        <span className="ml-1 normal-case tracking-normal text-[#9d9484]">
          optional
        </span>
      )}
    </label>
  );
}

function SuccessMessage({
  title,
  detail,
  onClose,
}: {
  title: string;
  detail: string;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <p className="mt-4 text-lg font-semibold text-[#171714]">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-[#716855]">{detail}</p>
      <Button
        variant="outline"
        className="mt-5 rounded-xl border-[#d7c7aa] bg-white text-[#171714]"
        onClick={onClose}
      >
        Done
      </Button>
    </div>
  );
}

export default function PortalDashboard() {
  const { member, isSubscribed } = useMember();
  const [, navigate] = useLocation();
  const [questionOpen, setQuestionOpen] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);

  const { data: subscription, isLoading: subscriptionLoading } =
    trpc.member.subscription.useQuery(undefined, { retry: false });
  const { data: settingsData } = trpc.member.getSettings.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const { data: projects } = trpc.takeoff.listProjects.useQuery(undefined, {
    retry: false,
  });
  const { data: myQuestionsData } = trpc.member.myQuestions.useQuery(
    undefined,
    { retry: false }
  );
  const { data: myTopicsData } = trpc.member.myBootcampTopics.useQuery(
    undefined,
    { retry: false }
  );

  const displayName =
    member?.displayName || member?.discordUsername || "Member";
  const firstName = displayName.split(" ")[0] || "Member";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const settings = settingsData?.settings || {};
  const bootcampDate = settings.bootcamp_date || DEFAULT_BOOTCAMP_DATE;
  const bootcampTime = settings.bootcamp_time || DEFAULT_BOOTCAMP_TIME;
  const bootcampDay = settings.bootcamp_day_label || DEFAULT_BOOTCAMP_DAY;
  const bootcampZoom = settings.bootcamp_zoom_link || DEFAULT_BOOTCAMP_ZOOM;
  const bootcampDisplay = formatBootcampDisplay(
    bootcampDate,
    bootcampDay,
    bootcampTime
  );

  const nextCallDate = useMemo(() => getNextCallDate(), []);
  const callExceptionNote =
    LIVE_CALL_EXCEPTIONS[
      getStandardNextCallDate().toISOString().split("T")[0]
    ]?.movedTo.getTime() === nextCallDate.getTime()
      ? LIVE_CALL_EXCEPTIONS[
          getStandardNextCallDate().toISOString().split("T")[0]
        ]?.note
      : null;
  const callCalendarUrl = buildCalendarUrl({
    title: "Contractor Circle Live Call",
    details: `Contractor Circle live call with Marshall.\n\nJoin Zoom:\n${ZOOM_CALL_LINK}`,
    start: nextCallDate,
    durationHours: 1.5,
    location: ZOOM_CALL_LINK,
  });

  const projectCount = projects?.length ?? 0;
  const completedBids = (projects ?? []).filter(
    (project: any) => project.status === "completed"
  ).length;
  const pendingQuestions = myQuestionsData?.questions?.filter((question: any) =>
    ["pending", "selected_for_call", "selected_for_bootcamp"].includes(
      question.status
    )
  ).length;
  const submittedTopics =
    myTopicsData?.topics?.filter(
      (topic: any) => topic.bootcampDate === bootcampDate
    ).length ?? 0;

  const upcomingCallDates = getUpcomingCallDates(3);
  const upcomingCalls = [
    {
      date: upcomingCallDates[0],
      title: "Contractor Circle Live Call",
      detail: formatCallDetail(upcomingCallDates[0]),
      url: ZOOM_CALL_LINK,
    },
    {
      date: upcomingCallDates[1],
      title: "Bid Review and Q&A",
      detail: formatCallDetail(upcomingCallDates[1]),
      url: ZOOM_CALL_LINK,
    },
    {
      date: upcomingCallDates[2],
      title: "Systems and Profit Clinic",
      detail: formatCallDetail(upcomingCallDates[2]),
      url: ZOOM_CALL_LINK,
    },
  ];

  const quickActions = [
    {
      title: "Replay Library",
      detail: "Past calls and bootcamps",
      icon: PlayCircle,
      onClick: () => navigate("/portal/replays"),
    },
    {
      title: "Templates",
      detail: "Proposals and contracts",
      icon: FileDown,
      onClick: () => navigate("/portal/templates"),
    },
    {
      title: "ConstructLine",
      detail: "Basis and Baseline",
      icon: LayoutGrid,
      onClick: () => navigate("/portal/constructline"),
    },
    {
      title: "Account",
      detail: "Billing and profile",
      icon: CircleUserRound,
      onClick: () => navigate("/portal/account"),
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f5ef] text-[#171714]">
      <div className="mx-auto max-w-[1500px] space-y-6 px-6 py-6">
        {questionOpen && (
          <SubmitQuestionModal onClose={() => setQuestionOpen(false)} />
        )}
        {topicOpen && (
          <SubmitTopicModal
            bootcampDate={bootcampDate}
            onClose={() => setTopicOpen(false)}
          />
        )}

        <section className="relative overflow-hidden rounded-xl border border-[#d7c7aa] bg-[#fffdf8] shadow-[0_30px_90px_rgba(41,37,28,0.10)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_0%,rgba(241,181,29,0.16),transparent_28%),linear-gradient(135deg,#fffdf8_0%,#f8f1e7_56%,#eef5ef_100%)]" />
          <div className="absolute right-10 top-8 hidden h-52 w-52 rounded-full border border-[#eadcc4]/70 bg-white/25 blur-2xl lg:block" />
          <div className="relative grid gap-8 p-7 lg:grid-cols-[minmax(0,1fr)_370px] lg:items-center xl:p-8">
            <div className="grid gap-7 md:grid-cols-[128px_minmax(0,1fr)] md:items-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-[18px] border border-[#d7c7aa] bg-[#090b0f] p-3 shadow-[0_24px_60px_rgba(0,0,0,0.20)]">
                <img
                  src="/manus-storage/contractor-circle-icon_3f2d5240.png"
                  alt="Contractor Circle"
                  className="h-full w-full rounded-[14px] object-cover"
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b58513]">
                  Contractor Circle Portal
                </p>
                <h1 className="mt-3 text-4xl font-semibold leading-[1.03] tracking-normal text-[#11100c] lg:text-[50px]">
                  {greeting}, {firstName}{" "}
                  <span className="inline-block align-[0.04em] text-[0.82em]">
                    👋
                  </span>
                </h1>
                <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#6d6558]">
                  Build your business. Win better jobs. Create a legacy.
                </p>
                <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-xl border border-[#eadcc4] bg-white/78 px-4 py-2 text-sm text-[#5d5546] shadow-inner backdrop-blur">
                  <Sparkles className="h-4 w-4 shrink-0 text-[#b58513]" />
                  <span className="min-w-0">
                    “Discipline in the details today. Freedom in the business
                    tomorrow.”{" "}
                    <span className="font-semibold text-[#b58513]">
                      Marshall Wilkinson
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <aside className="rounded-xl border border-[#d7c7aa] bg-white/86 p-5 shadow-[0_18px_50px_rgba(41,37,28,0.10)] backdrop-blur">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#eef5ef] text-emerald-700">
                  <CircleUserRound className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-[#171714]">
                    {displayName}
                  </p>
                  <p className="text-sm text-[#716855]">
                    {member?.email ||
                      member?.discordUsername ||
                      "Contractor Circle member"}
                  </p>
                  <Badge className="mt-2 border-emerald-200 bg-emerald-50 text-emerald-800">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {isSubscribed ? "Active Member" : "Preview"}
                  </Badge>
                </div>
              </div>
              <div className="mt-5 grid gap-3 border-t border-[#eadcc4] pt-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[#716855]">Member since</span>
                  <span className="text-right font-semibold text-[#171714]">
                    {formatDate(member?.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#716855]">Membership</span>
                  <span className="font-semibold text-emerald-700">
                    {subscriptionLoading
                      ? "Checking"
                      : subscription?.status ||
                        member?.subscriptionStatus ||
                        "Active"}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-5 h-10 w-full rounded-xl border-[#d7c7aa] bg-white text-[13px] font-semibold text-[#171714] hover:bg-[#faf8f2]"
                onClick={() => navigate("/portal/account")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </Button>
            </aside>
          </div>
        </section>

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(300px,0.95fr)_minmax(380px,1.15fr)_minmax(300px,0.9fr)_270px]">
          <article className="h-fit rounded-xl border border-[#dfd0b5] bg-white p-6 shadow-[0_22px_60px_rgba(41,37,28,0.08)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fff4cb] text-[#8a6510]">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#716855]">
                  Next Live Call
                </p>
                <h2 className="mt-2 text-[22px] font-semibold leading-tight text-[#171714]">
                  Contractor Circle Live Call
                </h2>
                <p className="mt-1 text-sm text-[#716855]">
                  {formatDate(nextCallDate)} at 5:00 PM ET
                </p>
                {callExceptionNote && (
                  <p className="mt-2 inline-flex rounded-full border border-[#d7b44d] bg-[#fff4cb] px-2.5 py-1 text-[11px] font-semibold text-[#8a6510]">
                    {callExceptionNote}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href={ZOOM_CALL_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-[#090b0f] px-4 text-[13px] font-semibold text-[#f1b51d] transition-colors hover:bg-[#171a20]"
              >
                <Video className="mr-2 h-4 w-4" />
                Join on Zoom
              </a>
              <a
                href={callCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-[#d7c7aa] bg-white px-4 text-[13px] font-semibold text-[#171714] transition-colors hover:bg-[#faf8f2]"
              >
                <CalendarPlus className="mr-2 h-4 w-4 text-[#b58513]" />
                Add to Calendar
              </a>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-[#eadcc4] bg-[#faf8f2] p-3 text-center">
              {[
                ["Projects", projectCount],
                ["Completed", completedBids],
                ["Questions", pendingQuestions ?? 0],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="font-mono text-xl font-semibold text-[#171714]">
                    {value}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#716855]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="h-fit rounded-xl border border-[#dfd0b5] bg-white p-6 shadow-[0_22px_60px_rgba(41,37,28,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#716855]">
                  Upcoming Calls
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#171714]">
                  Stay on the rhythm
                </h2>
              </div>
              <Clock className="h-5 w-5 text-[#b58513]" />
            </div>
            <div className="mt-5 space-y-3">
              {upcomingCalls.map(call => {
                const short = formatShortDate(call.date);
                const calendarUrl = buildCalendarUrl({
                  title: call.title,
                  details: `Contractor Circle live session.\n\nJoin Zoom:\n${call.url}`,
                  start: call.date,
                  durationHours: 1.5,
                  location: call.url,
                });
                return (
                  <div
                    key={`${call.title}-${short.day}`}
                    className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[#eadcc4] bg-[#fffdf8] p-3.5"
                  >
                    <div className="rounded-lg border border-[#d7c7aa] bg-[#faf8f2] py-2 text-center">
                      <p className="text-[10px] font-semibold uppercase text-[#b58513]">
                        {short.month}
                      </p>
                      <p className="font-mono text-xl font-semibold text-[#171714]">
                        {short.day}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight text-[#171714]">
                        {call.title}
                      </p>
                      <p className="text-xs text-[#716855]">{call.detail}</p>
                    </div>
                    <a
                      href={calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-[#d7c7aa] bg-white px-3.5 py-2 text-xs font-semibold text-[#5d5546] transition-colors hover:bg-[#faf8f2]"
                    >
                      Add
                    </a>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="h-fit rounded-xl border border-[#dfd0b5] bg-white p-6 shadow-[0_22px_60px_rgba(41,37,28,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#716855]">
              Next Bootcamp
            </p>
            <h2 className="mt-3 text-xl font-semibold text-[#171714]">
              Monthly Bootcamp
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#716855]">
              Deep dive training with real contractor problems, live questions,
              and working sessions.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#171714]">
              {bootcampDisplay}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <a
                href={bootcampZoom}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-[#090b0f] px-3 text-[13px] font-semibold text-[#f1b51d] transition-colors hover:bg-[#171a20]"
              >
                <Video className="mr-2 h-4 w-4" />
                Join Zoom
              </a>
              <a
                href={buildBootcampCalendarUrl(
                  bootcampDate,
                  bootcampTime,
                  bootcampZoom
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-[#d7c7aa] bg-white px-3 text-[13px] font-semibold text-[#171714] transition-colors hover:bg-[#faf8f2]"
              >
                <CalendarPlus className="mr-2 h-4 w-4 text-[#b58513]" />
                Add Calendar
              </a>
            </div>
          </article>

          <article className="h-fit rounded-xl border border-[#dfd0b5] bg-white p-4 shadow-[0_22px_60px_rgba(41,37,28,0.08)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#716855]">
              Quick Actions
            </p>
            <div className="mt-4 space-y-2">
              {quickActions.map(action => (
                <QuickActionButton key={action.title} {...action} />
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
          <ActionCard
            eyebrow="Submit your question"
            title="For the next live call"
            detail="Marshall reviews every submission and answers the best questions live."
            icon={Send}
            buttonLabel="Submit Question"
            onClick={() => setQuestionOpen(true)}
            stat={`${pendingQuestions ?? 0} pending`}
          />
          <ActionCard
            eyebrow="Submit your topic"
            title="For the next bootcamp"
            detail="Shape the training. Submit what you want Marshall to work through next."
            icon={MessageSquare}
            buttonLabel="Submit Topic"
            onClick={() => setTopicOpen(true)}
            stat={`${submittedTopics} submitted`}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-xl border border-[#e4d7bf] bg-white p-5 shadow-[0_20px_55px_rgba(41,37,28,0.07)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b58513]">
                  Member rhythm
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#171714]">
                  One place for the weekly moves.
                </h2>
              </div>
              <Badge className="border-[#d7c7aa] bg-[#faf8f2] text-[#716855]">
                Calls + training + tools
              </Badge>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                [
                  "01",
                  "Show up",
                  "Join the next call or add it to your calendar.",
                ],
                [
                  "02",
                  "Ask",
                  "Send the question before it gets buried in the week.",
                ],
                [
                  "03",
                  "Apply",
                  "Use replays, templates, and ConstructLine when the work starts.",
                ],
              ].map(([number, title, detail]) => (
                <div
                  key={number}
                  className="rounded-xl border border-[#eadcc4] bg-[#fffdf8] p-4"
                >
                  <p className="font-mono text-xs font-semibold text-[#b58513]">
                    {number}
                  </p>
                  <p className="mt-3 font-semibold text-[#171714]">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#716855]">
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <a
            href="https://discord.gg/rsK5HZcF"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-[#14161b] bg-[#090b0f] p-6 text-white shadow-[0_24px_65px_rgba(41,37,28,0.16)] transition-colors hover:bg-[#171a20]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f1b51d]">
                  Community
                </p>
                <h2 className="mt-3 text-[26px] font-semibold leading-tight">
                  Discord stays the clubhouse.
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/62">
                  Project wins, field questions, and fast conversations still
                  belong where contractors already participate.
                </p>
              </div>
              <ExternalLink className="h-5 w-5 text-[#f1b51d] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </a>
        </section>
      </div>
    </div>
  );
}

function ActionCard({
  eyebrow,
  title,
  detail,
  icon: Icon,
  buttonLabel,
  onClick,
  stat,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  icon: typeof Send;
  buttonLabel: string;
  onClick: () => void;
  stat: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-[#dfd0b5] bg-white p-5 text-left shadow-[0_22px_60px_rgba(41,37,28,0.08)] transition-colors hover:bg-[#fffdf8]"
    >
      <div className="flex items-center gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fff4cb] text-[#8a6510] transition-colors group-hover:bg-[#f1b51d] group-hover:text-[#171714]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b58513]">
              {eyebrow}
            </p>
            <Badge className="border-[#d7c7aa] bg-[#faf8f2] text-[#716855]">
              {stat}
            </Badge>
          </div>
          <h3 className="mt-1.5 text-xl font-semibold text-[#171714]">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-[#716855]">{detail}</p>
        </div>
        <span className="hidden h-11 shrink-0 items-center whitespace-nowrap rounded-xl bg-[#090b0f] px-5 text-[13px] font-semibold text-[#f1b51d] transition-colors group-hover:bg-[#171a20] sm:inline-flex">
          {buttonLabel}
          <Send className="ml-2 h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

function QuickActionButton({
  title,
  detail,
  icon: Icon,
  onClick,
}: {
  title: string;
  detail: string;
  icon: typeof PlayCircle;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-[#eadcc4] bg-[#fffdf8] p-3.5 text-left transition-colors hover:bg-[#faf8f2]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d7c7aa] bg-white text-[#b58513]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[#171714]">
          {title}
        </p>
        <p className="truncate text-[12px] leading-5 text-[#716855]">
          {detail}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#b58513] transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
