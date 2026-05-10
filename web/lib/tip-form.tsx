"use client";

// The tip flow: read recipient's ERC-5564 meta-address, derive a fresh stealth
// address client-side, send ETH via PragueConnectTip on Base Sepolia. Single tx —
// transfer + announce atomically.
//
// If the sender has an inviter (their own NameStone record carries a
// `sealed-by` text record pointing at another subname), the tip routes through
// `tipWithReferral` instead: 95% to the recipient's stealth address, 5% to the
// inviter's stealth address as a finder's mark. Both legs ERC-5564-announced
// in the same tx. The inviter's address is derived from their public
// stealth-meta-address text record. No on-chain link to either name.
import { usePrivy, useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useAccessToken } from "./use-access-token";
import { useFx } from "./use-eth-czk";
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

interface InviterContext {
  label: string;
  ens: string;
  display: string;
  stealthMeta: string;
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

export function TipForm({ recipient }: { recipient: Recipient }) {
  const { ready, authenticated, login, user } = usePrivy();
  const { accessToken: identityToken } = useAccessToken();
  const fx = useFx();
  const t = useT();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const router = useRouter();

  const [amountEth, setAmountEth] = useState("0.001");
  const [memo, setMemo] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [balanceEth, setBalanceEth] = useState<number | null>(null);
  const [inviter, setInviter] = useState<InviterContext | null>(null);
  const [dripping, setDripping] = useState(false);
  const [dripErr, setDripErr] = useState<string | null>(null);

  const myAddress = user?.wallet?.address as `0x${string}` | undefined;
  const tipAddr = env.tipAddress;
  const hasStealth = recipient.stealthMeta.startsWith("st:eth:");
  const inviterUsable = !!inviter && inviter.stealthMeta.startsWith("st:eth:") && inviter.label !== recipient.label;

  useEffect(() => {
    if (!authenticated || !myAddress) return;
    let cancelled = false;
    (async () => {
      try {
        const rpc = env.defaultChainId === 8453 ? env.baseRpcUrl : env.baseSepoliaRpcUrl;
        const res = await fetch(rpc, {
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

  // Fetch sender's inviter context once authenticated. The 5% finder's mark
  // routes there if it exists and the inviter has a stealth route.
  useEffect(() => {
    if (!authenticated || !identityToken) {
      setInviter(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/my-name", {
          headers: { Authorization: `Bearer ${identityToken}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { inviter?: InviterContext | null };
        if (!cancelled && data.inviter) setInviter(data.inviter);
      } catch {
        /* leave null */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, identityToken]);

  const requiredEth = Number.parseFloat(amountEth || "0") + 0.0001; // amount + tiny gas buffer
  const insufficientFunds = balanceEth !== null && balanceEth < requiredEth;
  const canTip = ready && authenticated && hasStealth && !sending && tipAddr && !insufficientFunds;

  const onDrip = async () => {
    if (!identityToken || !myAddress) return;
    setDripping(true);
    setDripErr(null);
    try {
      const res = await fetch("/api/faucet-drip", {
        method: "POST",
        headers: { Authorization: `Bearer ${identityToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "rate-limited") {
          setDripErr(`Already topped up. Try again in ${Math.ceil((data.retryAfterSeconds ?? 3600) / 3600)}h or use the public faucet.`);
        } else if (data.error === "faucet-not-configured") {
          setDripErr("Drip wallet not configured — use the public faucet link.");
        } else if (data.error === "faucet-low") {
          setDripErr("Project drip wallet is empty — use the public faucet link.");
        } else {
          setDripErr(data.error ?? "Top-up failed.");
        }
        return;
      }
      // Re-poll balance — drip should already have been confirmed server-side.
      const rpc = env.defaultChainId === 8453 ? env.baseRpcUrl : env.baseSepoliaRpcUrl;
      const balRes = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [myAddress, "latest"] }),
      }).then((r) => r.json());
      if (balRes.result) setBalanceEth(Number(BigInt(balRes.result)) / 1e18);
    } catch (e) {
      setDripErr(e instanceof Error ? e.message : "Top-up failed.");
    } finally {
      setDripping(false);
    }
  };

  const onSend = async () => {
    if (!recipient.address || !tipAddr) return;
    setSending(true);
    setErr(null);
    try {
      // 1. Derive a fresh stealth address from the recipient's meta-address.
      let stealthRecipient: `0x${string}`;
      let ephemeralPubKey: `0x${string}`;
      let viewTag: `0x${string}`;

      if (hasStealth) {
        const out = paymentAddress(recipient.stealthMeta);
        stealthRecipient = out.stealthAddress;
        ephemeralPubKey = out.ephemeralPublicKey;
        viewTag = out.viewTag;
      } else {
        // Fallback: tip directly to the recipient's known address. No privacy.
        stealthRecipient = recipient.address;
        ephemeralPubKey = "0x" as Hex;
        viewTag = "0x00" as Hex;
      }

      // 2. Encode the contract call. If the sender has an inviter, atomic 95/5
      //    split via tipWithReferral; else single-leg tip. The inviter's
      //    stealth address is derived independently from their public meta.
      const memoTrim = memo.slice(0, 80);
      const useReferral = inviterUsable && hasStealth;
      let data: `0x${string}`;
      if (useReferral && inviter) {
        const inv = paymentAddress(inviter.stealthMeta);
        data = encodeFunctionData({
          abi: TIP_ABI,
          functionName: "tipWithReferral",
          args: [
            stealthRecipient,
            ephemeralPubKey,
            viewTag,
            inv.stealthAddress,
            inv.ephemeralPublicKey,
            inv.viewTag,
            memoTrim,
          ],
        });
      } else {
        data = encodeFunctionData({
          abi: TIP_ABI,
          functionName: "tip",
          args: [stealthRecipient, ephemeralPubKey, viewTag, memoTrim],
        });
      }

      const value = parseEther(amountEth || "0");
      if (value === BigInt(0)) {
        setErr("amount must be > 0");
        return;
      }

      // Pick the wallet matching the user's primary address — embedded for
      // email/google logins, MetaMask/Rainbow/etc for self-custody logins.
      // Privy's `useSendTransaction` is embedded-only ("No embedded or
      // connected wallet found for address"), so for externals we drop down
      // to the wallet's EIP-1193 provider.
      const wallet =
        wallets.find((w) => myAddress && w.address.toLowerCase() === myAddress.toLowerCase()) ??
        wallets.find((w) => w.walletClientType === "privy") ??
        wallets[0];
      if (!wallet) {
        setErr("no wallet connected");
        return;
      }
      try {
        await wallet.switchChain(env.defaultChainId);
      } catch {
        /* ignore — Privy may auto-switch */
      }

      let txHash: `0x${string}`;
      if (wallet.walletClientType === "privy") {
        const result = await sendTransaction({
          to: tipAddr as `0x${string}`,
          value,
          data,
          chainId: env.defaultChainId,
        });
        txHash = result.hash;
      } else {
        const provider = await wallet.getEthereumProvider();
        txHash = (await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: wallet.address,
              to: tipAddr,
              value: `0x${value.toString(16)}`,
              data,
            },
          ],
        })) as `0x${string}`;
      }

      router.push(`/r/${txHash}?stealth=${stealthRecipient}`);
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
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <PortraitRoundel size={80} />
            <div style={{ flex: 1 }}>
              <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", lineHeight: 1.55 }}>
                {hasStealth
                  ? `Funds will land at a fresh stealth address derived just for this transaction. ${recipient.display.split(" ")[0]}'s ENS name and main wallet will not appear in the on-chain trail.`
                  : `${recipient.display.split(" ")[0]} hasn't yet sealed a private-gift route. The tip will go to their known address — no privacy.`}
              </div>
            </div>
          </div>

          {inviterUsable && inviter && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                marginBottom: 16,
                background: "rgba(184, 158, 78, 0.10)",
                border: "0.5px solid var(--gilded)",
                borderLeft: "2px solid var(--vermilion)",
              }}
            >
              <FleurDeLis size={18} stroke="var(--vermilion)" style={{ flex: "0 0 auto", marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="t-display" style={{ fontSize: 9, letterSpacing: "0.3em", color: "var(--vermilion)", textTransform: "uppercase" }}>
                  Finder&apos;s mark · 5%
                </div>
                <div className="t-italic" style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5, marginTop: 2 }}>
                  A small share returns to <span className="t-mono" style={{ fontSize: 12 }}>{inviter.ens}</span> — the seal that introduced you here. Both legs route to fresh stealth addresses, atomic in one tx.
                </div>
              </div>
            </div>
          )}

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
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={onDrip}
                    disabled={dripping}
                    className="t-display"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.25em",
                      background: "var(--vermilion)",
                      color: "var(--parchment)",
                      border: "none",
                      padding: "6px 12px",
                      cursor: dripping ? "wait" : "pointer",
                      opacity: dripping ? 0.6 : 1,
                    }}
                  >
                    {dripping ? "…" : "TOP ME UP"}
                  </button>
                  <a href="https://www.alchemy.com/faucets/base-sepolia" target="_blank" rel="noreferrer" className="t-display" style={{ fontSize: 10, letterSpacing: "0.25em", color: "var(--vermilion)", textDecoration: "none", borderBottom: "0.5px solid var(--vermilion)", paddingBottom: 1 }}>
                    {t("tip.faucet")}
                  </a>
                </div>
              )}
            </div>
          )}
          {dripErr && (
            <div className="t-italic" style={{ fontSize: 12, color: "var(--vermilion)", marginBottom: 10, lineHeight: 1.5 }}>
              {dripErr}
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
              ≈ {fx.formatFromEth(Number.parseFloat(amountEth || "0"))} {t("tip.amountHint")}
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
