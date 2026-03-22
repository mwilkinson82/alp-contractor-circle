/**
 * Calendar Integration Component
 * Allows members to add the bi-weekly Contractor Circle call to their calendar
 * with one click using Google Calendar, Apple Calendar, or Outlook.
 */
import { Calendar, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ZOOM_URL = "https://us06web.zoom.us/j/83215167292?pwd=Mtt970HFCPStqSw62btyyta2Wxo0Pr.1";

// Next bi-weekly call: Sunday March 29, 2026 at 5 PM ET
const NEXT_CALL_DATE = "2026-03-29";
const NEXT_CALL_TIME = "21:00"; // 5 PM ET = 21:00 UTC

// Calendar URLs
const GOOGLE_CALENDAR_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  "&text=The+Contractor+Circle+%E2%80%94+Bi-Weekly+Call+with+Marshall" +
  "&details=Bi-weekly+group+call+with+Marshall+Wilkinson.+Join+here%3A+" + encodeURIComponent(ZOOM_URL) +
  "&location=" + encodeURIComponent(ZOOM_URL) +
  "&recur=RRULE:FREQ%3DWEEKLY%3BINTERVAL%3D2%3BBYDAY%3DSU" +
  "&dates=20260329T210000Z/20260329T223000Z";

const APPLE_CALENDAR_URL = "https://alpcontractorcircle.com/api/calendar/circle-biweekly.ics";

const OUTLOOK_CALENDAR_URL =
  "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent" +
  "&subject=The+Contractor+Circle+%E2%80%94+Bi-Weekly+Call+with+Marshall" +
  "&body=" + encodeURIComponent("Bi-weekly Sunday group call with Marshall Wilkinson.\n\nJoin Zoom: " + ZOOM_URL) +
  "&location=" + encodeURIComponent(ZOOM_URL) +
  "&startdt=2026-03-29T21:00:00Z&enddt=2026-03-29T22:30:00Z";

export function CalendarIntegration() {
  const [addedCalendars, setAddedCalendars] = useState<Set<string>>(new Set());

  const handleAddToCalendar = (service: "google" | "apple" | "outlook") => {
    let url = "";
    let label = "";

    switch (service) {
      case "google":
        url = GOOGLE_CALENDAR_URL;
        label = "Google Calendar";
        break;
      case "apple":
        url = APPLE_CALENDAR_URL;
        label = "Apple Calendar";
        break;
      case "outlook":
        url = OUTLOOK_CALENDAR_URL;
        label = "Outlook";
        break;
    }

    // Open in new tab
    window.open(url, "_blank");

    // Show confirmation
    setAddedCalendars(prev => {
      const next = new Set(prev);
      next.add(service);
      return next;
    });
    toast.success(`Opening ${label}...`);

    // Reset after 3 seconds
    setTimeout(() => {
      setAddedCalendars(prev => {
        const next = new Set(prev);
        next.delete(service);
        return next;
      });
    }, 3000);
  };

  return (
    <div className="glass-card rounded-2xl p-6 md:p-8">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-blue-accent/10 flex items-center justify-center shrink-0">
          <Calendar className="w-6 h-6 text-blue-accent" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-semibold text-cream">
            Add to Your Calendar
          </h3>
          <p className="text-cream-muted text-sm mt-1">
            Next call: Sunday, March 29 at 5 PM ET
          </p>
        </div>
      </div>

      <p className="text-cream-muted text-sm mb-6">
        Add the bi-weekly Contractor Circle call to your calendar. It will automatically repeat every two weeks.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => handleAddToCalendar("google")}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            addedCalendars.has("google")
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-white/5 border border-white/10 text-cream hover:bg-white/10 hover:border-white/20"
          }`}
        >
          {addedCalendars.has("google") ? (
            <>
              <Check className="w-4 h-4" />
              Added
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </>
          )}
        </button>

        <button
          onClick={() => handleAddToCalendar("apple")}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            addedCalendars.has("apple")
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-white/5 border border-white/10 text-cream hover:bg-white/10 hover:border-white/20"
          }`}
        >
          {addedCalendars.has("apple") ? (
            <>
              <Check className="w-4 h-4" />
              Added
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 13.5c-.91 0-1.82.33-2.5 1.02.9.56 1.5 1.6 1.5 2.98 0 3.35-2.72 6-6.07 6-3.35 0-6.07-2.65-6.07-6 0-1.38.6-2.42 1.5-2.98-.68-.69-1.59-1.02-2.5-1.02C1.86 13.5 0 15.36 0 17.73v4.54C0 23.5 1.5 25 3.34 25h17.32c1.84 0 3.34-1.5 3.34-3.34v-4.54c0-2.37-1.86-4.23-4.95-4.23zM12 6c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
              </svg>
              Apple
            </>
          )}
        </button>

        <button
          onClick={() => handleAddToCalendar("outlook")}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            addedCalendars.has("outlook")
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-white/5 border border-white/10 text-cream hover:bg-white/10 hover:border-white/20"
          }`}
        >
          {addedCalendars.has("outlook") ? (
            <>
              <Check className="w-4 h-4" />
              Added
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.6 2H2.4C1.08 2 0 3.08 0 4.4v15.2C0 20.92 1.08 22 2.4 22h9.2c1.32 0 2.4-1.08 2.4-2.4V4.4C14 3.08 12.92 2 11.6 2zm0 17.6H2.4V4.4h9.2v15.2z" />
                <path d="M21.6 2h-9.2c-1.32 0-2.4 1.08-2.4 2.4v15.2c0 1.32 1.08 2.4 2.4 2.4h9.2c1.32 0 2.4-1.08 2.4-2.4V4.4c0-1.32-1.08-2.4-2.4-2.4zm0 17.6h-9.2V4.4h9.2v15.2z" />
              </svg>
              Outlook
            </>
          )}
        </button>
      </div>

      <p className="text-cream-muted text-xs mt-6 text-center">
        The event will be added to your calendar with the Zoom meeting link. You'll receive a reminder before each call.
      </p>
    </div>
  );
}
