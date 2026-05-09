"use client";

// Pull-tab that slides up from the foot of any public profile page. The visitor
// is told they were led to this seal by the profile owner; tapping carries the
// inviter label through to the homepage as ?invitedBy=<label>, where it's
// stashed in localStorage and consumed by the claim flow.
//
// Hidden when the visitor is signed in (any signed-in user already has a name
// or is in the middle of claiming their own; an invitation is no longer useful).
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { useT } from "./i18n";
import { FleurDeLis } from "./ornaments";

const INVITER_KEY = "pc:invitedBy";
const INVITER_TTL_MS = 10 * 24 * 60 * 60 * 1000; // 10 days

interface StoredInviter {
  label: string;
  capturedAt: number;
}

/// Read `?invitedBy=` from URL on mount and stash it in localStorage with a 10-day TTL.
/// Use on any page where an invitation might be carried in (notably the homepage).
export function InviterCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("invitedBy");
      if (!raw) return;
      // Normalise + sanity-check: lowercase ASCII label, no dots.
      const label = raw.toLowerCase().trim();
      if (!/^[a-z0-9-]{1,32}$/.test(label)) return;
      const payload: StoredInviter = { label, capturedAt: Date.now() };
      localStorage.setItem(INVITER_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, []);
  return null;
}

/// Read the persisted inviter label, returning null if missing or stale.
export function readInviter(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(INVITER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredInviter;
    if (!parsed?.label) return null;
    if (Date.now() - (parsed.capturedAt ?? 0) > INVITER_TTL_MS) {
      localStorage.removeItem(INVITER_KEY);
      return null;
    }
    return parsed.label;
  } catch {
    return null;
  }
}

export function clearInviter() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(INVITER_KEY);
  } catch {}
}

export function InheritanceTab({
  inviterLabel,
  inviterDisplay,
}: {
  inviterLabel: string;
  inviterDisplay: string;
}) {
  const { authenticated, ready } = usePrivy();
  const t = useT();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(`pc:inherit:dismissed:${inviterLabel}`) === "1") {
        setDismissed(true);
      }
    } catch {}
  }, [inviterLabel]);

  if (!ready) return null;
  if (authenticated) return null;
  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(`pc:inherit:dismissed:${inviterLabel}`, "1");
    } catch {}
  };

  const firstName = inviterDisplay.split(" ")[0];

  return (
    <div
      role="dialog"
      aria-label={t("inherit.kicker")}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        display: "flex",
        justifyContent: "center",
        padding: "0 12px 12px",
        pointerEvents: "none",
        animation: "pc-inherit-slide-up 600ms cubic-bezier(0.32, 0.72, 0.24, 1)",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: 540,
          background: "var(--bone)",
          border: "0.5px solid var(--gilded)",
          padding: "16px 18px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: "0 -10px 24px -10px rgba(31,26,18,0.18)",
        }}
      >
        <FleurDeLis size={26} style={{ flex: "0 0 auto" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="t-display"
            style={{
              fontSize: 10,
              letterSpacing: "0.35em",
              color: "var(--vermilion)",
              textTransform: "uppercase",
            }}
          >
            {t("inherit.kicker")}
          </div>
          <div
            className="t-italic"
            style={{
              fontSize: 14,
              lineHeight: 1.45,
              color: "var(--ink)",
              marginTop: 2,
            }}
          >
            {t("inherit.youWereLed")} <strong style={{ fontStyle: "normal" }}>{firstName}</strong>.
          </div>
        </div>
        <Link
          href={`/?invitedBy=${encodeURIComponent(inviterLabel)}`}
          className="t-display"
          style={{
            flex: "0 0 auto",
            padding: "10px 14px",
            background: "var(--ink)",
            color: "var(--parchment)",
            fontSize: 10,
            letterSpacing: "0.3em",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          {t("inherit.cta")}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="dismiss"
          className="t-mono"
          style={{
            flex: "0 0 auto",
            background: "transparent",
            border: "none",
            color: "var(--ink-50)",
            fontSize: 16,
            cursor: "pointer",
            padding: "4px 6px",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
