"use client";

// The interactive part of the onboarding screen — Privy login, name claim, redirect.
// Per the Claude Design handoff: the LivePreviewParchment IS the name field.
// There is no duplicate input above; the status sits in mono-caps beneath the
// parchment, and a single SEAL button anchors the bottom.

import { usePrivy, useSignMessage, getAccessToken } from "@privy-io/react-auth";
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

// SessionStorage keys for surviving a Privy OAuth redirect. Some auth methods
// (mobile OAuth in particular) navigate the tab away, then back — destroying
// React state. We stash the in-flight name + intent so the form re-hydrates and
// auto-resumes the claim once the user returns authenticated.
const PENDING_NAME_KEY = "pc_pending_name";
const PENDING_SEAL_KEY = "pc_pending_seal";

function savePendingClaim(name: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_NAME_KEY, name);
    sessionStorage.setItem(PENDING_SEAL_KEY, "1");
  } catch {
    /* sessionStorage may be blocked (private mode, hostile browser); in that
     *  case we accept the regression to typing the name twice. */
  }
}

function clearPendingClaim(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_NAME_KEY);
    sessionStorage.removeItem(PENDING_SEAL_KEY);
  } catch {}
}

function readPendingName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(PENDING_NAME_KEY);
  } catch {
    return null;
  }
}

function readPendingSeal(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(PENDING_SEAL_KEY) === "1";
  } catch {
    return false;
  }
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
import { ActivationCard } from "./activation-card";

type ClaimState =
  | "idle"
  | "checking"
  | "available"
  | "claiming"
  | "claimed"
  | "sealing-stealth"
  | "stealth-failed"
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
  const t = useT();
  const { lang } = useI18n();
  const [name, setName] = useState("");
  const [claimState, setClaimState] = useState<ClaimState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPromise, setShowPromise] = useState(false);
  const [claimedInviter, setClaimedInviter] = useState<ClaimedInviter | null>(null);
  const [claimedCodes, setClaimedCodes] = useState<string[]>([]);
  const [showSealedBeat, setShowSealedBeat] = useState(false);
  const [showActivation, setShowActivation] = useState(false);
  const [identityToken, setIdentityToken] = useState<string | null>(null);
  const router = useRouter();
  const checkAbort = useRef<AbortController | null>(null);
  const inscriptionStartRef = useRef<number | null>(null);

  void _size;

  // Track whether we're resuming a claim across a Privy auth redirect. Set on
  // mount if sessionStorage flagged a pending seal; consumed once when the
  // post-auth auto-claim fires so we don't loop.
  const pendingSealRef = useRef<boolean>(false);

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

  // Restore an in-flight name from before a Privy auth redirect. Runs once on
  // mount so the parchment re-fills before the availability check fires; the
  // auto-claim effect below then continues the flow without the user having to
  // retype or re-press SEAL.
  useEffect(() => {
    const restored = readPendingName();
    if (restored) {
      setName(restored);
      pendingSealRef.current = readPendingSeal();
    }
  }, []);

  // If the signed-in user already owns a name, the gate is closed for them —
  // skip the claim flow and send them straight to their seal. Without this,
  // a page refresh after claiming would re-render the inscription input as if
  // they were a fresh visitor.
  useEffect(() => {
    if (!ready || !authenticated || showSealedBeat) return;
    let cancelled = false;
    (async () => {
      try {
        const tok = await getAccessToken();
        if (cancelled || !tok) return;
        const res = await fetch("/api/my-name", {
          headers: { Authorization: `Bearer ${tok}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.claimed && typeof data.ens === "string") {
          clearPendingClaim();
          pendingSealRef.current = false;
          router.replace(`/${data.ens}`);
        }
      } catch {
        /* leave the form in idle state */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, router, showSealedBeat]);

  // After a Privy auth round-trip that restored the name from sessionStorage,
  // re-fire the claim once the availability check resolves to "available". This
  // is what makes the cross-redirect flow feel continuous: the user pressed
  // SEAL once, signed in, and the name lands without a second click.
  useEffect(() => {
    if (!ready || !authenticated) return;
    if (!pendingSealRef.current) return;
    if (claimState !== "available") return;
    pendingSealRef.current = false;
    clearPendingClaim();
    onSeal();
    // onSeal closes over the latest `name`; we intentionally re-run only on
    // ready/authenticated/claimState transitions, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, claimState]);

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

  // Wraps Privy's login() with a sessionStorage stash of the in-flight name +
  // intent, so an OAuth redirect that nukes React state can be recovered on
  // return without the user retyping or re-pressing SEAL.
  const triggerLoginFor = (pendingName: string) => {
    savePendingClaim(pendingName);
    login();
  };

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
      triggerLoginFor(name);
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
      // Claim succeeded — drop the redirect-recovery breadcrumbs.
      pendingSealRef.current = false;
      clearPendingClaim();

      // Stealth seal is its own beat: it requires a SECOND signature, so it
      // can fail independently of the name claim. Two of eight first-week
      // users hit this exact failure mode (wallet popup closed / signature
      // rejected) and ended up with a half-claimed name. Now we surface it
      // and let them retry instead of pretending success.
      let stealthOk = false;
      let stealthErr: string | null = null;
      try {
        setClaimState("sealing-stealth");
        const { signature } = await signMessage({ message: PRAGUECONNECT_STEALTH_MESSAGE });
        const keys = derivePragueConnectKeys(signature as `0x${string}`);
        const token = await getAccessToken();
        setIdentityToken(token ?? null);
        if (token) {
          const sr = await fetch("/api/update-profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              label: name,
              fields: {
                "stealth-meta-address": keys.metaAddress,
                // Default new users to rotating addr() — they're already
                // setting up stealth, they want privacy. Toggle visible on /me/edit.
                "stealth-rotate-addr": "true",
              },
            }),
          });
          if (sr.ok) stealthOk = true;
          else {
            const j = await sr.json().catch(() => ({}));
            stealthErr = j.error ?? "stealth-save-failed";
          }
        } else {
          stealthErr = "no-session";
        }
      } catch (e) {
        stealthErr = e instanceof Error ? e.message : "signature-rejected";
      }

      if (!stealthOk) {
        // Keep the inscription overlay closed; surface the retry card.
        setClaimState("stealth-failed");
        setErrorMsg(stealthErr);
        return;
      }

      setClaimState("fully-sealed");
      const wait = Math.max(600, inscriptionRemaining(inscriptionStartRef.current));
      setTimeout(() => setShowActivation(true), wait);
    } catch (e) {
      setClaimState("error");
      setErrorMsg(e instanceof Error ? e.message : "The line to Prague was busy.");
    }
  };

  // Retry the stealth signature when the user lands on the half-claimed
  // state. The name is already in the resolver store — we just need the
  // meta-address field. On success we slide straight into the activation
  // card so the moment stays continuous.
  const onRetryStealth = async () => {
    if (!name) return;
    setErrorMsg(null);
    let stealthOk = false;
    let stealthErr: string | null = null;
    try {
      setClaimState("sealing-stealth");
      const { signature } = await signMessage({ message: PRAGUECONNECT_STEALTH_MESSAGE });
      const keys = derivePragueConnectKeys(signature as `0x${string}`);
      const token = await getAccessToken();
      setIdentityToken(token ?? null);
      if (token) {
        const sr = await fetch("/api/update-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            label: name,
            fields: {
              "stealth-meta-address": keys.metaAddress,
              "stealth-rotate-addr": "true",
            },
          }),
        });
        if (sr.ok) stealthOk = true;
        else {
          const j = await sr.json().catch(() => ({}));
          stealthErr = j.error ?? "stealth-save-failed";
        }
      } else {
        stealthErr = "no-session";
      }
    } catch (e) {
      stealthErr = e instanceof Error ? e.message : "signature-rejected";
    }
    if (!stealthOk) {
      setClaimState("stealth-failed");
      setErrorMsg(stealthErr);
      return;
    }
    setClaimState("fully-sealed");
    setShowActivation(true);
  };

  // Allow the user to bail on stealth and finish onboarding without it. The
  // recovery banner in the root layout will offer to seal it later, every
  // time they come back, until they do.
  const onSkipStealth = async () => {
    // Pre-fetch the identity token so the activation card can save fields.
    try {
      const tok = await getAccessToken();
      setIdentityToken(tok ?? null);
    } catch {
      setIdentityToken(null);
    }
    setClaimState("fully-sealed");
    setShowActivation(true);
  };

  const filled = claimState === "available";
  const claimInFlight =
    claimState === "claiming" ||
    claimState === "sealing-stealth";
  // Keep the inscription overlay up while sealing AND during the brief window
  // between stealth success and the activation card appearing — avoids a
  // flash back to the bare seal form.
  const showStage =
    claimInFlight ||
    claimState === "claimed" ||
    claimState === "error" ||
    (claimState === "fully-sealed" && !showActivation && !showSealedBeat);

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
          <button
            type="button"
            onClick={() => {
              clearPendingClaim();
              logout();
            }}
            className="btn btn-text"
          >
            sign out
          </button>
        </div>
      )}

      {showStage && !showSealedBeat && !showActivation && (
        <InscriptionStage
          name={name}
          state={mapToInscription(claimState)}
          errorMsg={errorMsg}
          lang={lang}
        />
      )}

      {claimState === "stealth-failed" && (
        <StealthRetryOverlay
          name={name}
          errorMsg={errorMsg}
          lang={lang}
          onRetry={onRetryStealth}
          onSkip={onSkipStealth}
        />
      )}

      {showActivation && claimState === "fully-sealed" && (
        <ActivationCard
          label={name}
          address={user?.wallet?.address ?? null}
          identityToken={identityToken}
          lang={lang}
          onDone={() => {
            setShowActivation(false);
            setShowSealedBeat(true);
          }}
        />
      )}

      {showPromise && (
        <PromiseCard
          onContinue={() => {
            setShowPromise(false);
            triggerLoginFor(name);
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

// StealthRetryOverlay — actionable replacement for the "broken seal" error
// vignette. Inscription succeeded, only the stealth signature failed; users
// need a clear retry path AND a way to escape if their wallet is misbehaving.
function StealthRetryOverlay({
  name,
  errorMsg,
  lang,
  onRetry,
  onSkip,
}: {
  name: string;
  errorMsg: string | null;
  lang: "en" | "cs";
  onRetry: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}) {
  const cs = lang === "cs";
  const copy = cs
    ? {
        kicker: "PEČEŤ ZAPSÁNA · TRASA DARŮ NE",
        title: `${name}.pragueconnect.eth`,
        body:
          "Jméno je zapečetěné. Trasa soukromých darů ale ne — k tomu potřebujeme ještě jeden podpis. Stačí vteřina.",
        retry: "Dokončit podpisem",
        skip: "Přeskočit, vyřídím později",
        hint: errorMsg ? `chyba: ${errorMsg}` : undefined,
      }
    : {
        kicker: "NAME SEALED · PRIVATE ROUTE NOT YET",
        title: `${name}.pragueconnect.eth`,
        body:
          "Your name is sealed in the ledger. The private gift route isn't — for that we need one more signature. It takes a second.",
        retry: "Finish with one signature",
        skip: "Skip — I'll do it later",
        hint: errorMsg ? `error: ${errorMsg}` : undefined,
      };
  return (
    <div
      role="alertdialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 52,
        background: "var(--parchment)",
        backgroundImage: "var(--grain)",
        backgroundSize: "4px 4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "pc-fade-in 280ms ease-out",
      }}
    >
      <div style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
        <div className="kicker" style={{ color: "var(--vermilion)", marginBottom: 16 }}>
          {copy.kicker}
        </div>
        <div
          className="display"
          style={{
            fontSize: "clamp(28px, 7vw, 38px)",
            color: "var(--ink)",
            letterSpacing: "0.02em",
            margin: "0 0 14px",
            wordBreak: "break-all",
          }}
        >
          {copy.title}
        </div>
        <p
          className="italic"
          style={{
            fontSize: 16,
            color: "var(--ink-70)",
            lineHeight: 1.55,
            margin: "0 auto 24px",
            maxWidth: 380,
          }}
        >
          {copy.body}
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            maxWidth: 360,
            margin: "0 auto",
          }}
        >
          <button
            type="button"
            onClick={() => {
              void onRetry();
            }}
            className="btn btn-ink btn-block"
          >
            {copy.retry}
          </button>
          <button
            type="button"
            onClick={() => {
              void onSkip();
            }}
            className="btn btn-text"
            style={{
              fontFamily: "var(--display)",
              fontSize: 12,
              letterSpacing: "0.25em",
              color: "var(--ink-70)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "8px 0",
            }}
          >
            {copy.skip}
          </button>
        </div>
        {copy.hint && (
          <p
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-50)",
              marginTop: 22,
              letterSpacing: "0.05em",
            }}
          >
            {copy.hint}
          </p>
        )}
      </div>
    </div>
  );
}

function mapToInscription(state: ClaimState): InscriptionState {
  if (state === "claiming" || state === "claimed") return "carving";
  if (state === "sealing-stealth") return "sealing";
  if (state === "fully-sealed") return "done";
  return "error";
}
