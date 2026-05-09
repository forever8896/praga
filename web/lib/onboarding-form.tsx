"use client";

// The interactive part of the onboarding screen — Privy login, name claim, redirect.
// Per the Claude Design handoff: the LivePreviewParchment IS the name field.
// There is no duplicate input above; the status sits in mono-caps beneath the
// parchment, and a single SEAL button anchors the bottom.

import { usePrivy, useSignMessage, useIdentityToken } from "@privy-io/react-auth";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { derivePragueConnectKeys, PRAGUECONNECT_STEALTH_MESSAGE } from "./stealth";
import { readInviter, clearInviter } from "./inheritance-tab";

/** Read the `pc_invite` cookie. Returns null if absent. */
function readInviteCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)pc_invite=([A-Z2-9]{8})/);
  return m ? m[1] : null;
}

/** Write the pc_invite cookie client-side (server components can't set
 *  cookies in Next 15+, so /i/<code> hands the code over via ?inv=). */
function writeInviteCookie(code: string): void {
  if (typeof document === "undefined") return;
  const day = 60 * 60 * 24;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `pc_invite=${code}; Max-Age=${day}; Path=/; SameSite=Lax${secure}`;
}
import { useT, useI18n } from "./i18n";
import {
  InscriptionStage,
  inscriptionRemaining,
  type InscriptionState,
} from "./inscription-stage";
import { SealedBeat } from "./sealed-beat";
import { PromiseCard } from "./promise-card";
import { LivePreviewParchment } from "./live-preview-parchment";

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

interface ClaimedInviter {
  ens: string;
  display: string;
}

export function OnboardingForm({ size: _size }: { size?: "mobile" | "desktop" }) {
  const { login, authenticated, user, ready, logout } = usePrivy();
  const { signMessage } = useSignMessage();
  const { identityToken } = useIdentityToken();
  const t = useT();
  const { lang } = useI18n();
  const [name, setName] = useState("");
  const [claimState, setClaimState] = useState<ClaimState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPromise, setShowPromise] = useState(false);
  const [claimedInviter, setClaimedInviter] = useState<ClaimedInviter | null>(null);
  const [claimedCodes, setClaimedCodes] = useState<string[]>([]);
  const [showSealedBeat, setShowSealedBeat] = useState(false);
  const [authDebug, setAuthDebug] = useState<string>("");
  const router = useRouter();
  const checkAbort = useRef<AbortController | null>(null);
  const inscriptionStartRef = useRef<number | null>(null);

  void _size;

  // Capture an invite handed off from /i/<code>?inv=ABCD2345 into the
  // pc_invite cookie, then drop the query so the URL stays clean.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const inv = url.searchParams.get("inv");
    if (!inv) return;
    if (/^[A-Z2-9]{8}$/.test(inv.toUpperCase())) {
      writeInviteCookie(inv.toUpperCase());
    }
    url.searchParams.delete("inv");
    window.history.replaceState({}, "", url.pathname + (url.search || ""));
  }, []);

  // If the signed-in user already owns a name, the gate is closed for them —
  // skip the claim flow and send them straight to their seal. Without this,
  // a page refresh after claiming would re-render the inscription input as if
  // they were a fresh visitor.
  useEffect(() => {
    setAuthDebug(`ready=${ready} auth=${authenticated} idTok=${identityToken ? "yes" : "no"}`);
    if (!ready) return;
    if (!authenticated) return;
    if (showSealedBeat) return;
    if (!identityToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/my-name", {
          headers: { Authorization: `Bearer ${identityToken}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.claimed && typeof data.ens === "string") {
          setAuthDebug(`claimed → /${data.ens} (replacing)`);
          router.replace(`/${data.ens}`);
        } else {
          const summary = res.ok
            ? `claimed=false addr=${data?.debug?.lookupAddress ?? "?"} known=${(data?.debug?.knownAddresses ?? []).length}`
            : `${res.status} ${data?.error ?? ""} ${data?.reason ?? ""}`;
          setAuthDebug(summary);
        }
      } catch (e) {
        setAuthDebug(`fetch-error: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, identityToken, router, showSealedBeat]);

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
    // Beat 3 — surface the promise card before Privy's modal opens. Once the
    // user presses CONTINUE on the card we'll re-enter onSeal with auth in
    // flight; the second entry skips the card.
    if (!authenticated) {
      if (!showPromise) {
        setShowPromise(true);
        return;
      }
      setShowPromise(false);
      login();
      return;
    }
    const claimAddress = user?.wallet?.address;
    if (!claimAddress) {
      setErrorMsg("Privy is creating your account — try again in a second.");
      return;
    }

    setClaimState("claiming");
    inscriptionStartRef.current = Date.now();
    const invitedBy = readInviter();
    const inviteCode = readInviteCookie();
    try {
      const res = await fetch("/api/claim-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address: claimAddress, invitedBy, inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "name-taken") {
          setClaimState("taken");
          return;
        }
        if (data.error === "invite-required") {
          setClaimState("error");
          setErrorMsg("You need an invite code. Ask a member of the guild for one.");
          return;
        }
        if (data.error === "invite-invalid") {
          setClaimState("error");
          setErrorMsg("This invite has already been opened. Ask for a fresh one.");
          return;
        }
        setClaimState("error");
        setErrorMsg(data.error ?? "Something went wrong sealing the name.");
        return;
      }
      setClaimState("claimed");
      if (data.inviter && typeof data.inviter === "object") {
        setClaimedInviter({
          ens: String(data.inviter.ens ?? ""),
          display: String(data.inviter.display ?? ""),
        });
      }
      if (Array.isArray(data.inviteCodes)) {
        setClaimedCodes(data.inviteCodes.filter((c: unknown): c is string => typeof c === "string"));
      }
      clearInviter();

      try {
        setClaimState("sealing-stealth");
        const { signature } = await signMessage({ message: PRAGUECONNECT_STEALTH_MESSAGE });
        const keys = derivePragueConnectKeys(signature as `0x${string}`);
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
        setClaimState("fully-sealed");
      }
      const wait = Math.max(600, inscriptionRemaining(inscriptionStartRef.current));
      setTimeout(() => setShowSealedBeat(true), wait);
    } catch (e) {
      setClaimState("error");
      setErrorMsg(e instanceof Error ? e.message : "The line to Prague was busy.");
    }
  };

  const filled = claimState === "available";
  const claimInFlight =
    claimState === "claiming" ||
    claimState === "sealing-stealth";
  const showStage = claimInFlight || claimState === "claimed" || claimState === "fully-sealed" || claimState === "error";

  const statusLine = !ready
    ? "…"
    : !name
    ? t("onboard.choose")
    : claimState === "checking"
    ? t("onboard.checking")
    : claimState === "claiming"
    ? "INSCRIBING…"
    : claimState === "claimed" || claimState === "fully-sealed"
    ? `✓ ${name}.pragueconnect.eth`
    : claimState === "sealing-stealth"
    ? "SEALING THE GIFT ROUTE…"
    : claimState === "taken"
    ? `${name}.pragueconnect.eth · ${t("onboard.taken")}`
    : claimState === "available"
    ? `${name}.pragueconnect.eth · ${t("onboard.available")}`
    : "";

  const statusColor =
    claimState === "taken"
      ? "var(--vermilion)"
      : claimState === "available" || claimState === "claimed" || claimState === "fully-sealed"
      ? "var(--verdigris)"
      : "var(--ink-50)";

  const sealLabel = !authenticated
    ? t("onboard.button.seal")
    : claimState === "fully-sealed"
    ? "✓"
    : claimState === "sealing-stealth"
    ? "SEALING…"
    : claimState === "claimed" || claimState === "claiming"
    ? "INSCRIBING…"
    : !name
    ? t("onboard.button.seal")
    : t("onboard.button.seal");

  return (
    <div style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
      {authDebug && (
        <div
          style={{
            background: "var(--vermilion-wash, #f5e8e4)",
            border: "0.5px solid var(--vermilion)",
            color: "var(--vermilion)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            padding: "6px 10px",
            marginBottom: 12,
            textAlign: "center",
            wordBreak: "break-all",
          }}
        >
          [auth] {authDebug}
        </div>
      )}
      <div style={{ marginBottom: 18, display: "flex", justifyContent: "center" }}>
        <LivePreviewParchment
          name={name}
          filled={filled}
          onChange={(e) => {
            setName(
              e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20),
            );
            setErrorMsg(null);
          }}
        />
      </div>

      <div
        className="mono-caps"
        style={{
          color: statusColor,
          textAlign: "center",
          marginBottom: 24,
          minHeight: 14,
          letterSpacing: "0.18em",
        }}
      >
        {statusLine}
      </div>

      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <button
          type="button"
          onClick={onSeal}
          disabled={
            claimInFlight ||
            claimState === "taken" ||
            !ready ||
            !name
          }
          className="btn btn-ink btn-block btn-lg"
          style={{
            opacity: !ready || !name || claimState === "taken" ? 0.55 : 1,
            cursor: claimInFlight ? "wait" : !name || claimState === "taken" ? "not-allowed" : "pointer",
          }}
        >
          {sealLabel}
        </button>
        <p
          className="italic"
          style={{
            fontSize: 14,
            color: "var(--ink-70)",
            marginTop: 14,
            marginBottom: 0,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {!authenticated ? t("onboard.help.signedout") : t("onboard.help.signedin")}
        </p>
      </div>

      {errorMsg && (
        <div
          className="italic"
          style={{
            fontSize: 13,
            color: "var(--vermilion)",
            marginTop: 14,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          {errorMsg}
        </div>
      )}

      {authenticated && (
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button type="button" onClick={logout} className="btn btn-text">
            sign out
          </button>
        </div>
      )}

      {showStage && !showSealedBeat && (
        <InscriptionStage
          name={name}
          state={mapToInscription(claimState)}
          errorMsg={errorMsg}
          lang={lang}
        />
      )}

      {showPromise && (
        <PromiseCard
          onContinue={() => {
            setShowPromise(false);
            login();
          }}
          onCancel={() => setShowPromise(false)}
          lang={lang}
        />
      )}

      {showSealedBeat && claimState === "fully-sealed" && (
        <SealedBeat
          label={name}
          display={name.charAt(0).toUpperCase() + name.slice(1)}
          inviter={claimedInviter}
          inviteCodes={claimedCodes}
          lang={lang}
        />
      )}
    </div>
  );
}

function mapToInscription(state: ClaimState): InscriptionState {
  if (state === "claiming" || state === "claimed") return "carving";
  if (state === "sealing-stealth") return "sealing";
  if (state === "fully-sealed") return "done";
  return "error";
}
