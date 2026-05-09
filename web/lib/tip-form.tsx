"use client";

// The tip flow: read recipient's ERC-5564 meta-address, derive a fresh stealth
// address client-side, send ETH via PragueConnectTip on Base Sepolia. Single tx —
// transfer + announce atomically.
import { usePrivy, useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cartouche, FleurDeLis, WaxSeal } from "./ornaments";
import { PortraitRoundel } from "./profile-shared";
import { paymentAddress } from "./stealth";
import { env } from "./env";
import { encodeFunctionData, parseEther, type Hex } from "viem";
import { useT } from "./i18n";

interface Recipient {
  ens: string;
  label: string;
  display: string;
  address: `0x${string}` | null;
  stealthMeta: string;
  location: string;
}

const TIP_ABI = [
  {
    type: "function",
    name: "tip",
    stateMutability: "payable",
    inputs: [
      { name: "stealthRecipient", type: "address" },
      { name: "ephemeralPubKey", type: "bytes" },
      { name: "viewTag", type: "bytes1" },
      { name: "memo", type: "string" },
    ],
    outputs: [],
  },
] as const;

export function TipForm({ recipient }: { recipient: Recipient }) {
  const { ready, authenticated, login, user } = usePrivy();
  const t = useT();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const router = useRouter();

  const [amountEth, setAmountEth] = useState("0.001");
  const [memo, setMemo] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [balanceEth, setBalanceEth] = useState<number | null>(null);

  const myAddress = user?.wallet?.address as `0x${string}` | undefined;
  const tipAddr = env.tipAddress;
  const hasStealth = recipient.stealthMeta.startsWith("st:eth:");

  useEffect(() => {
    if (!authenticated || !myAddress) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://sepolia.base.org", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [myAddress, "latest"] }),
        }).then((r) => r.json());
        if (cancelled) return;
        if (res.result) {
          setBalanceEth(Number(BigInt(res.result)) / 1e18);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, myAddress]);

  const requiredEth = Number.parseFloat(amountEth || "0") + 0.0001; // amount + tiny gas buffer
  const insufficientFunds = balanceEth !== null && balanceEth < requiredEth;
  const canTip = ready && authenticated && hasStealth && !sending && tipAddr && !insufficientFunds;

  const onSend = async () => {
    if (!recipient.address || !tipAddr) return;
    setSending(true);
    setErr(null);
    try {
      // 1. Derive a fresh stealth address from the recipient's meta-address.
      let stealthRecipient: `0x${string}`;
      let ephemeralPubKey: `0x${string}`;
      let viewTag: `0x${string}`;
      let usingStealth = false;

      if (hasStealth) {
        const out = paymentAddress(recipient.stealthMeta);
        stealthRecipient = out.stealthAddress;
        ephemeralPubKey = out.ephemeralPublicKey;
        viewTag = out.viewTag;
        usingStealth = true;
      } else {
        // Fallback: tip directly to the recipient's known address. No privacy.
        stealthRecipient = recipient.address;
        ephemeralPubKey = "0x" as Hex;
        viewTag = "0x00" as Hex;
      }
      void usingStealth;

      // 2. Encode PragueConnectTip.tip(stealth, ephem, viewTag, memo) call.
      const data = encodeFunctionData({
        abi: TIP_ABI,
        functionName: "tip",
        args: [stealthRecipient, ephemeralPubKey, viewTag, memo.slice(0, 80)],
      });

      const value = parseEther(amountEth || "0");
      if (value === BigInt(0)) {
        setErr("amount must be > 0");
        return;
      }

      // Active wallet — the embedded Privy wallet for this hackathon.
      const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
      if (wallet) {
        try {
          await wallet.switchChain(env.defaultChainId);
        } catch {
          /* ignore — Privy may auto-switch */
        }
      }

      const result = await sendTransaction({
        to: tipAddr as `0x${string}`,
        value,
        data,
        chainId: env.defaultChainId,
      });

      router.push(`/r/${result.hash}?stealth=${stealthRecipient}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "tip-failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="parchment-surface" style={{ width: "100%", minHeight: "100vh", padding: "32px 20px 48px", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 560, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <FleurDeLis size={28} style={{ margin: "0 auto 8px" }} />
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.4em", color: "var(--vermilion)", marginBottom: 4 }}>{t("tip.kicker")}</div>
          <div className="t-display" style={{ fontSize: 28, letterSpacing: "0.04em" }}>{recipient.display}</div>
          <div className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)" }}>{recipient.ens}</div>
        </div>

        <Cartouche padding={28} style={{ width: "100%" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
            <PortraitRoundel size={80} />
            <div style={{ flex: 1 }}>
              <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", lineHeight: 1.55 }}>
                {hasStealth
                  ? `Funds will land at a fresh stealth address derived just for this transaction. ${recipient.display.split(" ")[0]}'s ENS name and main wallet will not appear in the on-chain trail.`
                  : `${recipient.display.split(" ")[0]} hasn't yet sealed a private-gift route. The tip will go to their known address — no privacy.`}
              </div>
            </div>
          </div>

          {!tipAddr && (
            <div className="t-italic" style={{ fontSize: 13, color: "var(--vermilion)", padding: "10px 14px", background: "var(--bone)", border: "0.5px solid var(--vermilion)", marginBottom: 14 }}>
              The tip contract isn't deployed yet on this network. Once <code className="t-mono">NEXT_PUBLIC_PRAGUECONNECT_TIP_ADDRESS</code> is set, this flow becomes a single transaction.
            </div>
          )}

          {authenticated && myAddress && balanceEth !== null && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: insufficientFunds ? "rgba(178,58,47,0.06)" : "var(--bone)", border: `0.5px solid ${insufficientFunds ? "var(--vermilion)" : "var(--gilded)"}`, marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
              <div className="t-mono" style={{ fontSize: 11, color: insufficientFunds ? "var(--vermilion)" : "var(--ink-70)" }}>
                {`${balanceEth.toFixed(5)} ETH`}
                {insufficientFunds && <span style={{ marginLeft: 6 }}>· {t("tip.notEnough")} {amountEth} ETH {t("tip.gasBuffer")}</span>}
              </div>
              {insufficientFunds && (
                <a href="https://www.alchemy.com/faucets/base-sepolia" target="_blank" rel="noreferrer" className="t-display" style={{ fontSize: 10, letterSpacing: "0.25em", color: "var(--vermilion)", textDecoration: "none", borderBottom: "0.5px solid var(--vermilion)", paddingBottom: 1 }}>
                  {t("tip.faucet")}
                </a>
              )}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div className="t-mono" style={{ fontSize: 9, letterSpacing: "0.25em", color: "var(--gilded-soft)", marginBottom: 4 }}>{t("tip.amount")}</div>
            <input
              type="number"
              step="0.0001"
              min="0"
              max="1"
              value={amountEth}
              onChange={(e) => setAmountEth(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", background: "transparent", border: "0.5px solid var(--gilded)", fontFamily: "var(--mono)", fontSize: 18, color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
            />
            <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)", marginTop: 4 }}>
              {t("tip.amountHint")}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div className="t-mono" style={{ fontSize: 9, letterSpacing: "0.25em", color: "var(--gilded-soft)", marginBottom: 4 }}>{t("tip.memo")}</div>
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value.slice(0, 80))}
              placeholder={t("tip.memoPlaceholder")}
              style={{ width: "100%", padding: "10px 12px", background: "transparent", border: "0.5px solid var(--gilded)", fontFamily: "var(--body)", fontStyle: "italic", fontSize: 14, color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {err && (
            <div className="t-italic" style={{ fontSize: 13, color: "var(--vermilion)", textAlign: "center", marginBottom: 12 }}>
              {err}
            </div>
          )}

          {!authenticated ? (
            <button onClick={login} style={{ width: "100%", padding: "14px 22px", background: "var(--ink)", color: "var(--parchment)", fontFamily: "var(--display)", fontSize: 12, letterSpacing: "0.3em", border: "none", cursor: "pointer" }}>
              {t("tip.button.sign")}
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canTip}
              style={{
                width: "100%",
                padding: "14px 22px",
                background: "var(--vermilion)",
                color: "var(--parchment)",
                fontFamily: "var(--display)",
                fontSize: 12,
                letterSpacing: "0.3em",
                border: "none",
                cursor: canTip ? "pointer" : "not-allowed",
                opacity: canTip ? 1 : 0.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
              }}
            >
              <WaxSeal size={20} state="rubedo" rotate={-7} emboss="fleur" />
              {sending ? "…" : t("tip.button.send")}
            </button>
          )}

          <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)", textAlign: "center", marginTop: 10 }}>
            {hasStealth ? t("tip.successHint") : t("tip.fallbackHint")}
          </div>
        </Cartouche>
      </div>
    </div>
  );
}
