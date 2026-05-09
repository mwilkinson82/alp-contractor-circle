/**
 * CallTonightPopup — Full-screen image popup reminding members about tonight's call.
 * Shows once per session on portal load. Dismiss with click or X button.
 * Uses sessionStorage so it reappears on next visit today but not repeatedly in same session.
 */
import { useState, useEffect } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "alp-call-tonight-dismissed-20260509";
const CALL_TONIGHT_IMAGE = "/manus-storage/call-tonight-popup_386f58dd.png";

export function useCallTonightPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  return { show, dismiss };
}

export function CallTonightPopup({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/80 border border-white/20 text-white/80 hover:text-white hover:bg-black transition-colors shadow-lg"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Image */}
        <img
          src={CALL_TONIGHT_IMAGE}
          alt="Call Tonight at 5:00 PM EST — Contractor Circle"
          className="w-full rounded-xl shadow-2xl border border-white/10"
        />

        {/* Dismiss text */}
        <p className="text-center text-white/50 text-xs mt-3">
          Click anywhere to dismiss
        </p>
      </div>
    </div>
  );
}
