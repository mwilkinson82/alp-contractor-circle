/**
 * completionChime.ts — Play a pleasant completion chime using Web Audio API.
 * No external audio files needed — generates a multi-tone chime programmatically.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Play a pleasant 3-note ascending chime to signal completion.
 * Uses sine waves with a gentle envelope for a professional sound.
 */
export function playCompletionChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(ctx.destination);

  // Three ascending notes: C5, E5, G5 (major chord)
  const notes = [
    { freq: 523.25, start: 0, duration: 0.25 },    // C5
    { freq: 659.25, start: 0.12, duration: 0.25 },  // E5
    { freq: 783.99, start: 0.24, duration: 0.4 },   // G5 (longer for resolution)
  ];

  notes.forEach(({ freq, start, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    // Gentle envelope: quick attack, sustain, smooth release
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.6, now + start + 0.03);
    gain.gain.setValueAtTime(0.6, now + start + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now + start);
    osc.stop(now + start + duration + 0.05);
  });
}

/**
 * Also send a browser notification if permissions allow.
 */
export function sendCompletionNotification(projectName: string): void {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification("ConstructLine Analysis Complete", {
      body: `Quantity takeoff for "${projectName}" is ready to review.`,
      icon: "/favicon.ico",
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("ConstructLine Analysis Complete", {
          body: `Quantity takeoff for "${projectName}" is ready to review.`,
          icon: "/favicon.ico",
        });
      }
    });
  }
}
