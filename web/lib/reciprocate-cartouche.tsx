"use client";

// PRD 5 — Reciprocate. After a sealed-by user lands on their own profile for
// the first time, slide up a cartouche prompting them to send a thank-you tip
// to the inviter. The press-and-hold gesture triggers tipWithReferral with
// recipient = inviter, inviter = inviter (both legs route to the same person);
// the dual-receipt animation educates the user about the mechanic that runs
// for every subsequent tip they make.
//
// Visibility gates (all must be true):
//   • viewer is signed in
//   • viewer's address matches the profile's address
//   • viewer's NameStone record carries `sealed-by`
//   • viewer has not yet reciprocated to this inviter on this device
//
// Persistence: a localStorage key per inviter so the cartouche doesn't reappear.
import {
  usePrivy,
  useSendTransaction,
  useWallets,
  useIdentityToken,
} from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { encodeFunctionData, parseEther } from "viem";
import { FleurDeLis, WaxSeal } from "./ornaments";
import { paymentAddress } from "./stealth";
import { env } from "./env";

interface InviterContext {
  label: string;
  ens: string;
  display: string;
  stealthMeta: string;
}

const TIP_REFERRAL_ABI = [
  {
    type: "function",
    name: "tipWithReferral",
    stateMutability: "payable",
    inputs: [
      { name: "recipientStealth", type: "address" },
      { name: "recipientEphPubKey", type: "bytes" },
      { name: "recipientViewTag", type: "bytes1" },
      { name: "inviterStealth", type: "address" },
      { name: "inviterEphPubKey", type: "bytes" },
      { name: "inviterViewTag", type: "bytes1" },
      { name: "memo", type: "string" },
    ],
    outputs: [],
  },
] as const;

const RECIPROCATE_AMOUNT_ETH = "0.0005"; // ~symbolic thank-you on testnet
const PRESS_HOLD_MS = 900;
const DISMISS_KEY = (label: string) => `pc:reciprocated:${label}`;

type Phase = "hidden" | "ready" | "pressing" | "sending" | "sent" | "error" | "dismissed";

export function ReciprocateCartouche({ profileAddress }: { profileAddress: `0x${string}` | null }) {
  const { authenticated, ready, user } = usePrivy();
  const { identityToken } = useIdentityToken();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("hidden");
  const [inviter, setInviter] = useState<InviterContext | null>(null);
  const [pressProgress, setPressProgress] = useState(0);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const myAddress = user?.wallet?.address as `0x${string}` | undefined;
  const isOwner =
    !!myAddress && !!profileAddress && myAddress.toLowerCase() === profileAddress.toLowerCase();

  // Resolve inviter from /api/my-name when viewer is the profile owner.
  useEffect(() => {
    if (!ready || !authenticated || !identityToken || !isOwner) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/my-name", {
          headers: { Authorization: `Bearer ${identityToken}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { inviter?: InviterContext | null };
        if (cancelled) return;
        if (data.inviter && data.inviter.stealthMeta.startsWith("st:eth:")) {
          if (localStorage.getItem(DISMISS_KEY(data.inviter.label)) === "1") {
            setPhase("dismissed");
            return;
          }
          setInviter(data.inviter);
          setPhase("ready");
        }
      } catch {
        /* leave hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, identityToken, isOwner]);

  if (!isOwner) return null;
  if (phase === "hidden" || phase === "dismissed" || !inviter) return null;

  const dismiss = () => {
    if (inviter) localStorage.setItem(DISMISS_KEY(inviter.label), "1");
    setPhase("dismissed");
  };

  const onPressStart = () => {
    if (phase !== "ready" || !inviter) return;
    setPhase("pressing");
    setPressProgress(0);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(1, elapsed / PRESS_HOLD_MS);
      setPressProgress(pct);
      if (pct >= 1) {
        clearInterval(interval);
        triggerTip();
      }
    }, 30);
    // Bail-out if pointer lifts early.
    const cancel = () => {
      clearInterval(interval);
      if (Date.now() - start < PRESS_HOLD_MS) {
        setPressProgress(0);
        setPhase("ready");
      }
      window.removeEventListener("pointerup", cancel);
      window.removeEventListener("pointercancel", cancel);
    };
    window.addEventListener("pointerup", cancel, { once: true });
    window.addEventListener("pointercancel", cancel, { once: true });
  };

  const triggerTip = async () => {
    if (!inviter || !env.tipAddress) {
      setErrMsg("tip-contract-not-configured");
      setPhase("error");
      return;
    }
    setPhase("sending");
    try {
      // Both legs route to the same person (the inviter is also the recipient
      // of the thank-you). The dual-receipt animation is pedagogical — for any
      // subsequent third-party tip the same mechanic puts 5% here.
      const recipient = paymentAddress(inviter.stealthMeta);
      const inviterLeg = paymentAddress(inviter.stealthMeta);
      const data = encodeFunctionData({
        abi: TIP_REFERRAL_ABI,
        functionName: "tipWithReferral",
        args: [
          recipient.stealthAddress,
          recipient.ephemeralPublicKey,
          recipient.viewTag,
          inviterLeg.stealthAddress,
          inviterLeg.ephemeralPublicKey,
          inviterLeg.viewTag,
          "díky za úvod · thanks for the intro",
        ],
      });
      const value = parseEther(RECIPROCATE_AMOUNT_ETH);

      const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
      if (wallet) {
        try {
          await wallet.switchChain(env.defaultChainId);
        } catch {
          /* ignore */
        }
      }
      const result = await sendTransaction({
        to: env.tipAddress as `0x${string}`,
        value,
        data,
        chainId: env.defaultChainId,
      });
      setTxHash(result.hash);
      setPhase("sent");
      if (inviter) localStorage.setItem(DISMISS_KEY(inviter.label), "1");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "tip-failed");
      setPhase("error");
    }
  };

  if (phase === "sent") {
    return (
      <div style={overlayStyle}>
        <div style={cartoucheStyle}>
          <FleurDeLis size={28} stroke="var(--vermilion)" style={{ margin: "0 auto 6px" }} />
          <div className="t-display" style={kickerStyle}>BY THIS GIFT</div>
          <div className="hr-gilded" style={{ width: 60, margin: "8px auto" }} />
          <div className="t-italic" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink)", textAlign: "center", margin: "8px 0 12px" }}>
            sealed · zapečetěno
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <DualReceiptStub />
            <a
              href={txHash ? `/r/${txHash}` : "#"}
              className="t-mono"
              style={{ fontSize: 11, color: "var(--ink-70)", textDecoration: "none", borderBottom: "0.5px dotted var(--gilded)", marginTop: 8 }}
            >
              view receipt ↗
            </a>
          </div>
          <button
            type="button"
            onClick={() => {
              setPhase("dismissed");
              if (txHash) router.push(`/r/${txHash}`);
            }}
            style={{ ...closeButtonStyle, marginTop: 16 }}
          >
            close
          </button>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div style={overlayStyle}>
        <div style={cartoucheStyle}>
          <WaxSeal size={64} state="broken" rotate={-8} emboss="none" style={{ margin: "0 auto 8px" }} />
          <div className="t-display" style={kickerStyle}>the seal would not take</div>
          <p className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)", lineHeight: 1.5, textAlign: "center", marginTop: 6 }}>
            {errMsg ?? "Something went wrong. The thank-you can be sent later from /tip/" + inviter.ens}
          </p>
          <button type="button" onClick={() => setPhase("ready")} style={closeButtonStyle}>try again</button>
          <button type="button" onClick={dismiss} style={{ ...closeButtonStyle, color: "var(--ink-50)" }}>later</button>
        </div>
      </div>
    );
  }

  // ready / pressing / sending
  const inviterFirstName = inviter.display.split(" ")[0];
  const sealing = phase === "pressing" || phase === "sending";
  const pct = phase === "sending" ? 1 : pressProgress;

  return (
    <div style={overlayStyle}>
      <div style={cartoucheStyle}>
        <FleurDeLis size={24} style={{ margin: "0 auto 4px" }} />
        <div className="t-display" style={kickerStyle}>AN INTRODUCTION REPAID</div>
        <div className="hr-gilded" style={{ width: 60, margin: "8px auto" }} />
        <p className="t-italic" style={{ fontSize: 16, color: "var(--ink)", textAlign: "center", lineHeight: 1.55, margin: "10px 0 6px" }}>
          <strong style={{ fontStyle: "normal" }}>{inviterFirstName}</strong> led you to this seal.
          <br />Send a thank-you?
        </p>
        <p className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)", textAlign: "center", margin: "4px 0 14px" }}>
          {RECIPROCATE_AMOUNT_ETH} ETH · routed privately to {inviter.ens}
        </p>

        {/* Press-and-hold wax stamp */}
        <button
          type="button"
          onPointerDown={onPressStart}
          disabled={phase !== "ready"}
          aria-label={`Press and hold to send a thank-you to ${inviter.ens}`}
          style={{
            position: "relative",
            width: 220,
            margin: "0 auto",
            padding: 0,
            background: "transparent",
            border: "none",
            cursor: phase === "ready" ? "pointer" : "default",
            display: "block",
          }}
        >
          <div
            style={{
              position: "relative",
              padding: "14px 22px",
              background: "var(--vermilion)",
              color: "var(--parchment)",
              fontFamily: "var(--display)",
              fontSize: 12,
              letterSpacing: "0.3em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              transform: sealing ? `scale(${1 - pct * 0.04})` : "scale(1)",
              transition: "transform 80ms ease-out",
              overflow: "hidden",
            }}
          >
            <WaxSeal size={20} state="rubedo" rotate={-7} emboss="fleur" />
            {phase === "sending" ? "SEALING…" : phase === "pressing" ? "HOLD…" : "PRESS & HOLD"}
            {/* Progress fill */}
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${pct * 100}%`,
                background: "rgba(31, 26, 18, 0.16)",
                pointerEvents: "none",
                transition: "width 30ms linear",
              }}
            />
          </div>
        </button>

        <p className="t-italic" style={{ fontSize: 11, color: "var(--ink-50)", textAlign: "center", margin: "10px 0 0" }}>
          Both legs land at fresh stealth addresses unrelated to the names. That&apos;s by design.
        </p>

        <button type="button" onClick={dismiss} style={{ ...closeButtonStyle, marginTop: 12 }}>later</button>
      </div>
    </div>
  );
}

function DualReceiptStub() {
  return (
    <div style={{ display: "flex", gap: 14, justifyContent: "center", margin: "6px 0" }}>
      {[
        { label: "thank-you", state: "rubedo" as const },
        { label: "finder’s mark", state: "citrinitas" as const },
      ].map((leg) => (
        <div key={leg.label} style={{ textAlign: "center" }}>
          <WaxSeal size={44} state={leg.state} rotate={-6} emboss="fleur" />
          <div className="t-display" style={{ fontSize: 8, letterSpacing: "0.3em", color: "var(--ink-50)", marginTop: 4, textTransform: "uppercase" }}>
            {leg.label}
          </div>
        </div>
      ))}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  background: "rgba(31, 26, 18, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  animation: "pc-narration-fade 280ms ease-out",
};

const cartoucheStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "var(--parchment)",
  border: "0.5px solid var(--gilded)",
  padding: "22px 22px 18px",
  textAlign: "center",
  boxShadow: "0 30px 60px -20px rgba(31,26,18,0.35)",
};

const kickerStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.4em",
  color: "var(--vermilion)",
  textTransform: "uppercase",
};

const closeButtonStyle: React.CSSProperties = {
  display: "block",
  margin: "8px auto 0",
  background: "transparent",
  color: "var(--ink-70)",
  fontFamily: "var(--display)",
  fontSize: 10,
  letterSpacing: "0.3em",
  border: "none",
  cursor: "pointer",
  padding: 6,
};
