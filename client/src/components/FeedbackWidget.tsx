/**
 * FeedbackWidget — Floating feedback button (bottom-right) with modal.
 * Captures user message, category, optional screenshot, and submits via tRPC.
 * Only visible on ConstructLine / Takeoff pages.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { MessageSquarePlus, Camera, X, Send, Loader2, Bug, Lightbulb, MessageCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Category = "bug" | "feature" | "general" | "other";

const CATEGORIES: { value: Category; label: string; icon: any; color: string }[] = [
  { value: "bug", label: "Bug Report", icon: Bug, color: "text-red-400 bg-red-500/10 border-red-500/30 hover:bg-red-500/20" },
  { value: "feature", label: "Feature Request", icon: Lightbulb, color: "text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20" },
  { value: "general", label: "General Feedback", icon: MessageCircle, color: "text-blue-400 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20" },
  { value: "other", label: "Other", icon: HelpCircle, color: "text-purple-400 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20" },
];

export function FeedbackWidget() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const submitMutation = trpc.feedback.submit.useMutation();

  const captureScreenshot = async () => {
    setIsCapturing(true);
    // Temporarily hide the widget so it doesn't appear in the screenshot
    setIsOpen(false);
    try {
      await new Promise((r) => setTimeout(r, 500)); // Wait for modal to close

      // Dynamically import html2canvas to avoid issues if it fails to load
      const html2canvas = (await import("html2canvas")).default;

      // Clone the body to avoid modifying the actual DOM
      const clonedBody = document.body.cloneNode(true) as HTMLElement;

      // Remove problematic elements from the clone
      const elementsToRemove = clonedBody.querySelectorAll(
        ".feedback-widget, iframe, script, noscript, [role='tooltip'], [role='dialog'], .joyride-*"
      );
      elementsToRemove.forEach((el) => el.remove());

      // Create a temporary container with the cloned body
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "-9999px";
      tempContainer.style.width = document.body.offsetWidth + "px";
      tempContainer.style.height = document.body.offsetHeight + "px";
      tempContainer.appendChild(clonedBody);
      document.body.appendChild(tempContainer);

      try {
        const canvas = await html2canvas(clonedBody, {
          scale: 0.4, // Lower scale for faster capture and smaller payload
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#0a0e1a",
          width: document.body.offsetWidth,
          height: document.body.offsetHeight,
          // Ignore canvas and SVG elements that cause rendering issues
          ignoreElements: (el) => {
            const tag = el.tagName?.toLowerCase();
            return (
              tag === "canvas" ||
              tag === "svg" ||
              tag === "iframe" ||
              el.classList?.contains("feedback-widget") ||
              el.classList?.contains("joyride-")
            );
          },
        });

        const dataUrl = canvas.toDataURL("image/jpeg", 0.6); // JPEG for smaller file size
        setScreenshot(dataUrl);
        setIsOpen(true);
        toast.success("Screenshot captured!");
      } finally {
        document.body.removeChild(tempContainer);
      }
    } catch (err) {
      console.error("[Feedback] Screenshot capture failed:", err);
      setIsOpen(true);
      toast.error("Screenshot capture failed — you can still submit feedback without one");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    try {
      await submitMutation.mutateAsync({
        message: message.trim(),
        category,
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        screenshotBase64: screenshot || undefined,
      });
      toast.success("Thank you! Your feedback has been submitted.");
      setMessage("");
      setCategory("general");
      setScreenshot(null);
      setIsOpen(false);
    } catch (err: any) {
      console.error("[Feedback] Submit failed:", err);
      const msg = err?.message || err?.data?.message || "Unknown error";
      if (msg.includes("UNAUTHORIZED") || msg.includes("logged in")) {
        toast.error("You need to be logged in to submit feedback");
      } else {
        toast.error("Failed to submit feedback. Please try again.");
      }
    }
  };

  // Only show on ConstructLine / Takeoff pages
  const isConstructLinePage = location.startsWith("/portal/constructline") || location.startsWith("/portal/takeoff") || location.startsWith("/takeoff/") || location.startsWith("/portal/cost-library");
  if (!isConstructLinePage) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="feedback-widget fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-navy-deep font-semibold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-105 transition-all duration-200"
        title="Send us feedback"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="feedback-widget fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-navy-deep border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-cream font-semibold text-lg">Send Feedback</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-cream-muted/60 hover:text-cream hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Beta notice */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <p className="text-amber-400 text-xs">
                  You're using a beta version of ConstructLine. Your feedback helps us improve — thank you!
                </p>
              </div>

              {/* Category selector */}
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        isActive
                          ? cat.color + " border-current"
                          : "text-cream-muted/60 bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Message */}
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind — bugs, ideas, or anything else..."
                rows={4}
                className="bg-navy-deep/50 border-white/10 text-cream placeholder:text-cream-muted/40 resize-none"
                maxLength={5000}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-cream-muted/40">{message.length}/5000</span>
              </div>

              {/* Screenshot */}
              {screenshot ? (
                <div className="relative">
                  <img
                    src={screenshot}
                    alt="Screenshot preview"
                    className="w-full h-32 object-cover rounded-lg border border-white/10"
                  />
                  <button
                    onClick={() => setScreenshot(null)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <span className="absolute bottom-1 left-2 text-[10px] text-white/60 bg-black/40 px-1.5 py-0.5 rounded">
                    Screenshot attached
                  </span>
                </div>
              ) : (
                <button
                  onClick={captureScreenshot}
                  disabled={isCapturing}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/20 text-cream-muted/60 hover:text-cream-muted hover:border-white/30 hover:bg-white/5 transition-all text-xs w-full justify-center"
                >
                  {isCapturing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                  {isCapturing ? "Capturing..." : "Attach Screenshot (optional)"}
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-cream-muted/40">
                Page: {window.location.pathname}
              </span>
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending || !message.trim()}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-navy-deep font-semibold hover:from-amber-400 hover:to-orange-400 gap-2"
                size="sm"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
