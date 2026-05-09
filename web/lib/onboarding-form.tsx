"use client";

// The interactive part of the onboarding screen — Privy login, name claim, redirect.
// The static parts (Prague silhouette, hero copy, layout) stay server-rendered.

import { usePrivy, useSignMessage, useIdentityToken } from "@privy-io/react-auth";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FleurDeLis } from "./ornaments";
import { derivePragueConnectKeys, PRAGUECONNECT_STEALTH_MESSAGE } from "./stealth";
import { useT } from "./i18n";

type ClaimState =
  | "idle"
  | "checking"
  | "available"
  | "claiming"
  | "claimed"
  | "sealing-stealth"
  | "fully-sealed"
  | "taken"
  | "error";

export function OnboardingForm({ size }: { size: "mobile" | "desktop" }) {
  const { login, authenticated, user, ready, logout } = usePrivy();
  const { signMessage } = useSignMessage();
  const { identityToken } = useIdentityToken();
  const t = useT();
  const [name, setName] = useState("");
  const [claimState, setClaimState] = useState<ClaimState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const checkAbort = useRef<AbortController | null>(null);

  const isMobile = size === "mobile";
  const titleSize = isMobile ? 36 : 42;

  const address = user?.wallet?.address;
  void address;

  // Debounced availability check via NameStone whenever `name` changes.
  useEffect(() => {
    if (!name) {
      setClaimState("idle");
      return;
    }
    if (claimState === "claiming" || claimState === "claimed") return;
    setClaimState("checking");
    const t = setTimeout(async () => {
      checkAbort.current?.abort();
      const ac = new AbortController();
      checkAbort.current = ac;
      try {
        const res = await fetch(`/api/check-name?name=${encodeURIComponent(name)}`, { signal: ac.signal });
        const data = await res.json();
        if (ac.signal.aborted) return;
        if (data.available) {
          setClaimState("available");
        } else {
          setClaimState("taken");
        }
      } catch {
        // network blip — leave state as checking; user can still try to claim
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const onSeal = async () => {
    setErrorMsg(null);
    if (!name) return;
    if (!authenticated) {
      login();
      return;
    }
    const claimAddress = user?.wallet?.address;
    if (!claimAddress) {
      setErrorMsg("Privy is creating your account — try again in a second.");
      return;
    }

    setClaimState("claiming");
    try {
      const res = await fetch("/api/claim-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address: claimAddress }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "name-taken") {
          setClaimState("taken");
          return;
        }
        setClaimState("error");
        setErrorMsg(data.error ?? "Something went wrong sealing the name.");
        return;
      }
      setClaimState("claimed");

      // Auto-generate the stealth gift route. If the user cancels the second
      // signature we still complete the flow — they can seal it later from
      // /me/edit. This makes private gifts work out of the box for new users.
      try {
        setClaimState("sealing-stealth");
        const { signature } = await signMessage({ message: PRAGUECONNECT_STEALTH_MESSAGE });
        const keys = derivePragueConnectKeys(signature as `0x${string}`);
        // identityToken may not be present immediately after first login; wait briefly.
        let token = identityToken;
        for (let i = 0; i < 8 && !token; i++) {
          await new Promise((r) => setTimeout(r, 300));
          token = identityToken;
        }
        if (token) {
          await fetch("/api/update-profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              label: name,
              fields: { "stealth-meta-address": keys.metaAddress },
            }),
          }).catch(() => {});
        }
        setClaimState("fully-sealed");
      } catch {
        // user cancelled the stealth signature — still ship them to their profile
        setClaimState("fully-sealed");
      }
      // Brief pause for the seal-press feel, then visit the new personal site.
      setTimeout(() => router.push(`/${name}.pragueconnect.eth`), 600);
    } catch (e) {
      setClaimState("error");
      setErrorMsg(e instanceof Error ? e.message : "The line to Prague was busy.");
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: isMobile ? 320 : "none" }}>
      {/* ENS inscription input */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          fontFamily: "var(--mono)",
          fontSize: titleSize,
          color: "var(--ink)",
          letterSpacing: "-0.01em",
          fontWeight: 400,
          marginBottom: 8,
        }}
      >
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20));
            setErrorMsg(null);
          }}
          placeholder="name"
          style={{
            font: "inherit",
            color: name ? "var(--ink)" : "var(--ink-30)",
            border: "none",
            borderBottom: "0.5px solid var(--gilded)",
            background: "transparent",
            outline: "none",
            minWidth: isMobile ? 160 : 180,
            textAlign: "right",
            paddingRight: 6,
            paddingBottom: 4,
            letterSpacing: "-0.01em",
          }}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <span style={{ color: "var(--ink-50)" }}>.pragueconnect.eth</span>
      </div>
      <div
        className="t-mono"
        style={{
          fontSize: 11,
          color:
            claimState === "taken"
              ? "var(--vermilion)"
              : claimState === "checking"
              ? "var(--ink-50)"
              : "var(--verdigris)",
          letterSpacing: "0.06em",
          textAlign: "center",
          marginBottom: 28,
          minHeight: 14,
        }}
      >
        {!ready
          ? "…"
          : !name
          ? t("onboard.choose")
          : claimState === "checking"
          ? t("onboard.checking")
          : claimState === "claiming"
          ? "…"
          : claimState === "claimed"
          ? `✓ ${name}.pragueconnect.eth ✓`
          : claimState === "sealing-stealth"
          ? "…"
          : claimState === "fully-sealed"
          ? `✓ ${name}.pragueconnect.eth ✓`
          : claimState === "taken"
          ? `${name}.pragueconnect.eth ${t("onboard.taken")}`
          : claimState === "available"
          ? `✓ ${name}.pragueconnect.eth ${t("onboard.available")}`
          : ""}
      </div>

      <button
        type="button"
        onClick={onSeal}
        disabled={
          claimState === "claiming" ||
          claimState === "sealing-stealth" ||
          claimState === "taken" ||
          !ready ||
          !name
        }
        style={{
          width: "100%",
          padding: isMobile ? 16 : 18,
          background: claimState === "claimed" ? "var(--verdigris)" : "var(--ink)",
          color: "var(--parchment)",
          fontFamily: "var(--display)",
          fontSize: isMobile ? 13 : 14,
          letterSpacing: "0.3em",
          cursor:
            claimState === "claiming" || claimState === "sealing-stealth"
              ? "wait"
              : claimState === "taken" || !name
              ? "not-allowed"
              : "pointer",
          opacity: !ready || !name || claimState === "taken" ? 0.5 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
        }}
      >
        {!authenticated ? (
          t("onboard.button.seal")
        ) : claimState === "fully-sealed" ? (
          <>
            <FleurDeLis size={16} stroke="var(--parchment)" /> ✓
          </>
        ) : claimState === "sealing-stealth" ? (
          "…"
        ) : claimState === "claimed" ? (
          "…"
        ) : claimState === "claiming" ? (
          "…"
        ) : !name ? (
          t("onboard.button.seal")
        ) : (
          `${t("onboard.button.claim")} ${name.toUpperCase()}.PRAGUECONNECT.ETH`
        )}
      </button>

      {errorMsg && (
        <div
          className="t-italic"
          style={{
            fontSize: 12,
            color: "var(--vermilion)",
            marginTop: 10,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {errorMsg}
        </div>
      )}

      <div
        className="t-italic"
        style={{
          fontSize: 12,
          color: "var(--ink-70)",
          marginTop: 14,
          lineHeight: 1.5,
          textAlign: "center",
        }}
      >
        {!authenticated ? t("onboard.help.signedout") : t("onboard.help.signedin")}
      </div>

      {authenticated && (
        <button
          type="button"
          onClick={logout}
          style={{
            display: "block",
            margin: "16px auto 0",
            background: "transparent",
            color: "var(--ink-50)",
            fontFamily: "var(--display)",
            fontSize: 10,
            letterSpacing: "0.3em",
          }}
        >
          sign out
        </button>
      )}
    </div>
  );
}
