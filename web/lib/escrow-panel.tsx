"use client";

// The Magnum Opus widget: shown above the thread message stream. Reads the
// on-chain task for this conversation pair and exposes phase-specific actions.
//
// Phases:
//   1 Nigredo  · Funded — the funder has staked ETH
//   2 Albedo   · In progress — worker has accepted and committed a stealth recipient
//   3 Citrinitas · Delivered — worker has marked done; funder has 24h to release
//   4 Rubedo   · Released — funds paid to stealth address + announced
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy, useSendTransaction, useSignMessage } from "@privy-io/react-auth";
import { encodeFunctionData, parseEther } from "viem";
import { ESCROW_ABI, deriveTaskId, loadTask, type OnchainTask, type Phase, PHASE_LABELS } from "./escrow";
import { env } from "./env";
import { paymentAddress, derivePragueConnectKeys, PRAGUECONNECT_STEALTH_MESSAGE } from "./stealth";
import { WaxSeal, FleurDeLis } from "./ornaments";
import { useT } from "./i18n";

interface Props {
  myAddress: `0x${string}` | null;
  peerAddress: `0x${string}` | null;
  peerEns: string;
  peerStealthMeta: string; // empty if not set
  onSystemMessage?: (text: string) => Promise<void>;
}

const PHASE_EMBOSS: Record<Phase, "crescent" | "sun" | "fleur" | "none"> = {
  0: "none",
  1: "crescent",
  2: "crescent",
  3: "sun",
  4: "fleur",
  5: "none",
};

export function EscrowPanel({ myAddress, peerAddress, peerEns, peerStealthMeta, onSystemMessage }: Props) {
  const { authenticated } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const { signMessage } = useSignMessage();
  const t = useT();

  const taskId = useMemo(() => {
    if (!myAddress || !peerAddress) return null;
    return deriveTaskId(myAddress, peerAddress);
  }, [myAddress, peerAddress]);

  const [task, setTask] = useState<OnchainTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [amountEth, setAmountEth] = useState("0.001");
  const [balanceEth, setBalanceEth] = useState<number | null>(null);

  useEffect(() => {
    if (!myAddress) return;
    let cancelled = false;
    (async () => {
      try {
        const rpc = env.defaultChainId === 8453 ? env.baseRpcUrl : env.baseSepoliaRpcUrl;
        const res = await fetch(rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [myAddress, "latest"] }),
        }).then((r) => r.json());
        if (!cancelled && res.result) setBalanceEth(Number(BigInt(res.result)) / 1e18);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [myAddress]);

  const refresh = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    const t = await loadTask(taskId);
    setTask(t);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!myAddress || !peerAddress || !taskId) return null;
  if (!env.escrowAddress) return null;

  const phase: Phase = (task?.phase ?? 0) as Phase;
  const isFunder = task && task.funder.toLowerCase() === myAddress.toLowerCase();
  const isWorker = task && task.worker.toLowerCase() === myAddress.toLowerCase();

  const sendTx = async (data: `0x${string}`, value: bigint = BigInt(0)) => {
    return sendTransaction({
      to: env.escrowAddress as `0x${string}`,
      value,
      data,
      chainId: env.defaultChainId,
    });
  };

  const onFund = async () => {
    setErr(null);
    setActing("fund");
    try {
      const value = parseEther(amountEth || "0");
      if (value === BigInt(0)) {
        setErr("amount must be > 0");
        return;
      }
      const data = encodeFunctionData({
        abi: ESCROW_ABI,
        functionName: "fund",
        args: [taskId, peerAddress],
      });
      await sendTx(data, value);
      await onSystemMessage?.(`📜 Funded ${amountEth} ETH for ${peerEns} — Nigredo phase opened.`);
      setTimeout(refresh, 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "fund-failed");
    } finally {
      setActing(null);
    }
  };

  const onAccept = async () => {
    setErr(null);
    setActing("accept");
    try {
      // Worker derives a fresh stealth address from their own meta-address.
      // For self-signed paths, we re-sign and derive on the spot. This means
      // the worker's gift-route signature is reused — same as on /me/edit.
      let stealthAddr: `0x${string}`;
      let ephemeralPubKey: `0x${string}`;
      let viewTag: `0x${string}`;

      if (peerStealthMeta && peerStealthMeta.startsWith("st:eth:")) {
        // We're the worker; the recipient (us) is described by *our* meta-address
        // which, in this thread context, is what the peer has stored about *us* — but
        // we don't have access to it directly. So we re-derive from a signature.
        const { signature } = await signMessage({ message: PRAGUECONNECT_STEALTH_MESSAGE });
        const keys = derivePragueConnectKeys(signature as `0x${string}`);
        const out = paymentAddress(keys.metaAddress);
        stealthAddr = out.stealthAddress;
        ephemeralPubKey = out.ephemeralPublicKey;
        viewTag = out.viewTag;
      } else {
        // No stealth route — fall back to the worker's known address.
        stealthAddr = myAddress;
        ephemeralPubKey = "0x" as `0x${string}`;
        viewTag = "0x00" as `0x${string}`;
      }

      const data = encodeFunctionData({
        abi: ESCROW_ABI,
        functionName: "accept",
        args: [taskId, stealthAddr, ephemeralPubKey, viewTag],
      });
      await sendTx(data);
      await onSystemMessage?.(`🌒 Accepted the work — Albedo phase opened. Stealth recipient committed.`);
      setTimeout(refresh, 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "accept-failed");
    } finally {
      setActing(null);
    }
  };

  const onDeliver = async () => {
    setErr(null);
    setActing("deliver");
    try {
      const data = encodeFunctionData({ abi: ESCROW_ABI, functionName: "deliver", args: [taskId] });
      await sendTx(data);
      await onSystemMessage?.(`☀️ Delivered. Awaiting release — Citrinitas phase opened.`);
      setTimeout(refresh, 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "deliver-failed");
    } finally {
      setActing(null);
    }
  };

  const onRelease = async () => {
    setErr(null);
    setActing("release");
    try {
      const data = encodeFunctionData({ abi: ESCROW_ABI, functionName: "release", args: [taskId, 5] });
      await sendTx(data);
      await onSystemMessage?.(`⚜️ Released with five seals. Rubedo phase reached — funds at the stealth address.`);
      setTimeout(refresh, 2500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "release-failed");
    } finally {
      setActing(null);
    }
  };

  if (!authenticated) {
    return null;
  }

  // Decide which action to show
  let action: React.ReactNode = null;
  if (phase === 0) {
    action = (
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-70)" }}>{t("opus.amount")}</span>
        <input
          type="number"
          step="0.0001"
          min="0"
          max="1"
          value={amountEth}
          onChange={(e) => setAmountEth(e.target.value)}
          style={{ width: 110, padding: "8px 10px", border: "0.5px solid var(--gilded)", background: "transparent", fontFamily: "var(--mono)", fontSize: 14, outline: "none" }}
        />
        <button onClick={onFund} disabled={acting === "fund"} style={btn("var(--ink)")}>
          {acting === "fund" ? "…" : t("opus.fund")}
        </button>
      </div>
    );
  } else if (phase === 1 && isWorker) {
    action = <button onClick={onAccept} disabled={acting === "accept"} style={btn("var(--ink)")}>{acting === "accept" ? "…" : t("opus.accept")}</button>;
  } else if (phase === 1 && isFunder) {
    action = <span className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)" }}>{peerEns} · {t("opus.waitingAccept")}</span>;
  } else if (phase === 2 && isWorker) {
    action = <button onClick={onDeliver} disabled={acting === "deliver"} style={btn("var(--ink)")}>{acting === "deliver" ? "…" : t("opus.deliver")}</button>;
  } else if (phase === 2 && isFunder) {
    action = <span className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)" }}>{peerEns} {t("opus.atWork")}</span>;
  } else if (phase === 3 && isFunder) {
    action = <button onClick={onRelease} disabled={acting === "release"} style={btn("var(--vermilion)")}>{acting === "release" ? "…" : t("opus.release")}</button>;
  } else if (phase === 3 && isWorker) {
    action = <span className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)" }}>{t("opus.deliveredWaiting")}</span>;
  } else if (phase === 4) {
    action = <span className="t-italic" style={{ fontSize: 13, color: "var(--verdigris)" }}>{t("opus.released")}</span>;
  }

  return (
    <div style={{ border: "0.5px solid var(--gilded)", padding: 14, background: "var(--bone)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <WaxSeal size={32} state={phase === 4 ? "rubedo" : phase === 3 ? "citrinitas" : phase >= 1 ? "albedo" : "nigredo"} rotate={-7} emboss={PHASE_EMBOSS[phase]} />
          <div>
            <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)" }}>{t("opus.kicker")}</div>
            <div className="t-display" style={{ fontSize: 16, letterSpacing: "0.04em" }}>{PHASE_LABELS[phase] ?? "—"}</div>
          </div>
        </div>
        <FleurDeLis size={20} />
      </div>

      {task && task.amount > BigInt(0) && (
        <div className="t-mono" style={{ fontSize: 11, color: "var(--ink-70)", marginBottom: 8 }}>
          {(Number(task.amount) / 1e18).toFixed(5)} ETH · {isFunder ? t("opus.youFunded") : isWorker ? t("opus.youAreWorker") : t("opus.between")}
        </div>
      )}

      {loading ? (
        <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-50)" }}>reading the seal…</span>
      ) : (
        action
      )}

      {err && (
        <div className="t-italic" style={{ fontSize: 12, color: "var(--vermilion)", marginTop: 6 }}>{err}</div>
      )}

      {balanceEth !== null && phase === 0 && balanceEth < Number.parseFloat(amountEth || "0") + 0.0001 && (
        <div className="t-italic" style={{ fontSize: 11, color: "var(--vermilion)", marginTop: 8 }}>
          your wallet has {balanceEth.toFixed(5)} ETH — top up to fund this seal.
        </div>
      )}

      <div className="t-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--ink-50)", marginTop: 8 }}>
        ESCROW · {env.escrowAddress?.slice(0, 6)}…{env.escrowAddress?.slice(-4)} · {env.defaultChainId === 8453 ? "BASE" : "BASE SEPOLIA"}
      </div>
    </div>
  );
}

const btn = (bg: string): React.CSSProperties => ({
  padding: "10px 16px",
  background: bg,
  color: "var(--parchment)",
  fontFamily: "var(--display)",
  fontSize: 11,
  letterSpacing: "0.3em",
  border: "none",
  cursor: "pointer",
});
