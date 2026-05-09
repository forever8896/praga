// Letterbox notification helpers — a soft chime when a sealed letter arrives,
// plus a tiny pub-sub for the unread count so the navbar can show a dot
// without having to mount the inbox view itself. Both are best-effort: audio
// can be blocked by the browser before any user gesture, and localStorage can
// throw in private windows. Failures stay silent.

const UNREAD_COUNT_KEY = "pragueconnect.inbox.unreadCount";
const UNREAD_EVENT = "pragueconnect:unread-changed";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Play a brief two-tone chime (E5 → G5) using a pure sine oscillator.
 *  Total duration ~0.3s. No audio file shipped — generated on the fly. */
export function playMessagePing() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const tones: Array<{ freq: number; start: number; dur: number }> = [
      { freq: 659.25, start: 0, dur: 0.16 },
      { freq: 987.77, start: 0.09, dur: 0.22 },
    ];
    for (const t of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = t.freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, now + t.start);
      gain.gain.linearRampToValueAtTime(0.14, now + t.start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);
      osc.start(now + t.start);
      osc.stop(now + t.start + t.dur + 0.05);
    }
  } catch {
    /* audio is best-effort */
  }
}

export function setGlobalUnreadCount(n: number) {
  if (typeof window === "undefined") return;
  try {
    const safe = Math.max(0, Math.floor(n));
    localStorage.setItem(UNREAD_COUNT_KEY, String(safe));
    window.dispatchEvent(new CustomEvent(UNREAD_EVENT, { detail: safe }));
  } catch {
    /* localStorage may be unavailable — surface 0 by default */
  }
}

export function getGlobalUnreadCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(UNREAD_COUNT_KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Subscribe to unread-count changes. Fires on:
 *   1. Same-tab updates via the custom event (see setGlobalUnreadCount)
 *   2. Cross-tab updates via the storage event */
export function subscribeUnreadCount(cb: (n: number) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onCustom = (e: Event) => {
    const n = (e as CustomEvent<number>).detail;
    cb(typeof n === "number" ? n : getGlobalUnreadCount());
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === UNREAD_COUNT_KEY) cb(getGlobalUnreadCount());
  };
  window.addEventListener(UNREAD_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(UNREAD_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
