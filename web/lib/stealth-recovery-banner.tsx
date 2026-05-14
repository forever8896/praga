"use client";

// StealthRecoveryBanner — surfaces when an authenticated user has a claimed
// name but no stealth-meta-address. That happens when the onboarding flow's
// second signature is rejected, the tab is closed mid-claim, or the browser
// kills the wallet popup. 2/8 users in the demo week's KV dump ended up in
// this half-claimed state with no way to know.
//
// One tap → re-derive the stealth keys → write the meta-address → banner
// self-dismisses. No new state on the server: the banner is purely a
// signal-and-fix surface for an existing schema field.
//
// Renders globally in the root layout. Hidden on the onboarding/invite
// pages (those flows seal stealth themselves) and on profile pages (the
// existing owner-panel has its own setup nudge).

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePrivy, useSignMessage } from "@privy-io/react-auth";
import { useAccessToken } from "./use-access-token";
import { derivePragueConnectKeys, PRAGUECONNECT_STEALTH_MESSAGE } from "./stealth";
import { useT } from "./i18n";

const DISMISS_SESSION_KEY = "pc_stealth_banner_dismissed";

function isExcludedPath(p: string): boolean {
  // Routes that already include the stealth-setup affordance themselves, or
  // where this banner would visually clash with an onboarding overlay.
  if (p === "/") return true; // landing / onboarding
  if (p.startsWith("/i/")) return true; // invite landing
  if (p.startsWith("/me/edit")) return true; // edit form has its own button
  return false;
}

export function StealthRecoveryBanner() {
  const pathname = usePathname();
  const { ready, authenticated } = usePrivy();
  const { accessToken: identityToken } = useAccessToken();
  const { signMessage } = useSignMessage();
  const t = useT();

  const [show, setShow] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [sealing, setSealing] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Detect "claimed name, no stealth meta-address" by reading /api/my-name.
  // Re-runs on auth changes and route changes (so navigating after a fix
  // doesn't flash the banner).
  useEffect(() => {
    if (!ready || !authenticated || !identityToken) {
      setShow(false);
      return;
    }
    if (isExcludedPath(pathname)) {
      setShow(false);
      return;
    }
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_SESSION_KEY) === "1";
    } catch {}
    if (dismissed) {
      setShow(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/my-name", {
          headers: { Authorization: `Bearer ${identityToken}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.claimed) {
          setShow(false);
          return;
        }
        const records: Record<string, string> = data.text_records ?? {};
        if (records["stealth-meta-address"]) {
          setShow(false);
          return;
        }
        setLabel(typeof data.label === "string" ? data.label : null);
        setShow(true);
      } catch {
        setShow(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, identityToken, pathname]);

  const onSeal = async () => {
    if (!label || !identityToken) return;
    setSealing(true);
    setErr(null);
    try {
      const { signature } = await signMessage({
        message: PRAGUECONNECT_STEALTH_MESSAGE,
      });
      const keys = derivePragueConnectKeys(signature as `0x${string}`);
      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${identityToken}`,
        },
        body: JSON.stringify({
          label,
          fields: {
            "stealth-meta-address": keys.metaAddress,
            "stealth-rotate-addr": "true",
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? "save-failed");
        return;
      }
      setDone(true);
      // Auto-hide a beat later so the user notices it succeeded.
      setTimeout(() => setShow(false), 1800);
    } catch (e) {
      // Includes the wallet-popup "user rejected" case — leave the banner
      // visible so they can try again.
      const msg = e instanceof Error ? e.message : "signature-failed";
      setErr(msg.length > 80 ? msg.slice(0, 80) + "…" : msg);
    } finally {
      setSealing(false);
    }
  };

  const onDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_SESSION_KEY, "1");
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  const headline = t("stealth.banner.headline");
  const body = t("stealth.banner.body");
  const cta = sealing ? "…" : t("stealth.banner.cta");
  const dismissLabel = t("stealth.banner.dismiss");
  const doneLabel = t("stealth.banner.done");

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 28,
        background: done ? "rgba(82, 114, 96, 0.14)" : "rgba(178, 58, 47, 0.08)",
        borderBottom: `0.5px solid ${
          done ? "var(--verdigris)" : "var(--vermilion)"
        }`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.3em",
            color: done ? "var(--verdigris)" : "var(--vermilion)",
            flex: "0 0 auto",
          }}
        >
          {done ? doneLabel : headline}
        </div>
        {!done && (
          <div
            className="italic"
            style={{
              fontSize: 13,
              color: "var(--ink-70)",
              flex: "1 1 240px",
              minWidth: 200,
              lineHeight: 1.4,
            }}
          >
            {body}
            {err && (
              <span style={{ color: "var(--vermilion)", marginLeft: 8 }}>
                · {err}
              </span>
            )}
          </div>
        )}
        {!done && (
          <div style={{ display: "flex", gap: 12, marginLeft: "auto" }}>
            <button
              type="button"
              onClick={onSeal}
              disabled={sealing}
              className="display"
              style={{
                padding: "6px 14px",
                background: "var(--ink)",
                color: "var(--parchment)",
                border: "none",
                fontFamily: "var(--display)",
                fontSize: 11,
                letterSpacing: "0.25em",
                cursor: sealing ? "wait" : "pointer",
                opacity: sealing ? 0.6 : 1,
              }}
            >
              {cta}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="italic"
              style={{
                background: "transparent",
                border: "none",
                fontFamily: "var(--body)",
                fontStyle: "italic",
                fontSize: 12,
                color: "var(--ink-70)",
                cursor: "pointer",
                padding: "6px 4px",
              }}
            >
              {dismissLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
