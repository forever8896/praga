"use client";

// Real wallet view: reads the connected Privy wallet's balance on Base
// Sepolia, and pulls Tipped events involving that address (sent + received,
// excluding the stealth-recipient blind spot — by design).
import { usePrivy } from "@privy-io/react-auth";
import { useAccessToken } from "./use-access-token";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlchemicalSigil,
  Cartouche,
  FleurDeLis,
  WaxSeal,
} from "./ornaments";
import { useT } from "./i18n";
import { env } from "./env";

function chainLabel(chainId: number): string {
  if (chainId === 8453) return "base mainnet";
  if (chainId === 84532) return "base sepolia";
  if (chainId === 1) return "ethereum mainnet";
  return `chain ${chainId}`;
}

interface RawReceipt {
  txHash: `0x${string}`;
  blockNumber: string;
  from: `0x${string}`;
  stealthRecipient: `0x${string}`;
  amountWei: string;
  amountEth: string;
  memo: string;
  fromEns?: string;
  recipientEns?: string;
}

interface ReceiptsResponse {
  ok?: boolean;
  sent?: RawReceipt[];
  received?: RawReceipt[];
  error?: string;
}

interface MyName {
  claimed: boolean;
  ens?: string;
  text_records?: Record<string, string>;
}

const KC_PER_ETH = 90_000; // hackathon-rough conversion: 1 ETH ≈ 90,000 Kč

function ethToKc(ethStr: string): number {
  const eth = Number.parseFloat(ethStr);
  if (!Number.isFinite(eth)) return 0;
  return Math.round(eth * KC_PER_ETH);
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function WalletView() {
  const { ready, authenticated, login, user } = usePrivy();
  const { accessToken: identityToken } = useAccessToken();
  const t = useT();

  const address = user?.wallet?.address as `0x${string}` | undefined;

  const [balanceWei, setBalanceWei] = useState<bigint | null>(null);
  const [sent, setSent] = useState<RawReceipt[]>([]);
  const [received, setReceived] = useState<RawReceipt[]>([]);
  const [myName, setMyName] = useState<MyName | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !address) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [balRes, recRes, mineRes] = await Promise.all([
          fetch(env.defaultChainId === 8453 ? env.baseRpcUrl : env.baseSepoliaRpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
          }).then((r) => r.json()),
          fetch(`/api/receipts?address=${address}`).then((r) => r.json()),
          identityToken
            ? fetch(`/api/my-name`, { headers: { Authorization: `Bearer ${identityToken}` } }).then((r) => r.json())
            : Promise.resolve(null),
        ]);
        if (cancelled) return;

        if (balRes.result) setBalanceWei(BigInt(balRes.result));
        const data = recRes as ReceiptsResponse;
        if (data.ok) {
          setSent(data.sent ?? []);
          setReceived(data.received ?? []);
        } else if (data.error) {
          setErr(data.error);
        }
        if (mineRes && mineRes.ok) setMyName(mineRes);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "load-failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, address, identityToken]);

  const balanceEth = useMemo(() => {
    if (balanceWei === null) return null;
    return Number(balanceWei) / 1e18;
  }, [balanceWei]);

  const balanceKc = balanceEth !== null ? Math.round(balanceEth * KC_PER_ETH) : null;

  const totalReceivedKc = received.reduce((sum, r) => sum + ethToKc(r.amountEth), 0);
  const totalSentKc = sent.reduce((sum, r) => sum + ethToKc(r.amountEth), 0);
  const hasStealth = !!myName?.text_records?.["stealth-meta-address"];

  if (!ready) {
    return <Shell><Loader>preparing the wax…</Loader></Shell>;
  }
  if (!authenticated) {
    return (
      <Shell>
        <Cartouche padding={32} style={{ textAlign: "center", maxWidth: 420 }}>
          <FleurDeLis size={28} style={{ margin: "0 auto 12px" }} />
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 8 }}>SIGNED OUT</div>
          <div className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", marginBottom: 18, lineHeight: 1.55 }}>
            Sign in to open your leather-bound ledger.
          </div>
          <button onClick={login} style={btnDark}>SIGN IN</button>
        </Cartouche>
      </Shell>
    );
  }

  return (
    <div className="parchment-surface" style={{ width: "100%", minHeight: "100vh", padding: "24px 20px 48px", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 980, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <FleurDeLis size={22} />
          <span className="t-display" style={{ fontSize: 11, letterSpacing: "0.4em", color: "var(--vermilion)" }}>{t("wallet.kicker")}</span>
          {myName?.ens && <span className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)", marginLeft: 8 }}>· {myName.ens}</span>}
        </div>
        <div className="hr-double" style={{ margin: "12px 0 24px" }} />

        {loading ? (
          <Loader>opening the book…</Loader>
        ) : (
          <>
            <Cartouche padding={28}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24 }}>
                <Stat
                  label={t("wallet.balance")}
                  amount={balanceEth !== null ? balanceEth.toFixed(5) : "—"}
                  unit="ETH"
                  sub={balanceKc !== null ? `≈ ${balanceKc.toLocaleString("cs-CZ")} Kč` : ""}
                />
                <Stat
                  label={t("wallet.received")}
                  amount={totalReceivedKc.toLocaleString("cs-CZ")}
                  unit="Kč"
                  sub={`${received.length} ${t("profile.wallSealed")}`}
                  accent="var(--verdigris)"
                />
                <Stat
                  label={t("wallet.given")}
                  amount={totalSentKc.toLocaleString("cs-CZ")}
                  unit="Kč"
                  sub={`${sent.length} ${t("profile.wallSealed")}`}
                  accent="var(--vermilion)"
                />
              </div>
              <div className="hr-gilded" style={{ margin: "20px 0 12px" }} />
              <div className="t-mono" style={{ fontSize: 11, color: "var(--ink-70)" }}>
                {address && <>account · <code>{shortAddr(address)}</code></>} · {chainLabel(env.defaultChainId)} · 1 ETH ≈ {KC_PER_ETH.toLocaleString("cs-CZ")} Kč (demo rate)
              </div>
              {hasStealth && (
                <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)", marginTop: 6, lineHeight: 1.5 }}>
                  {t("wallet.privacyNote")}
                </div>
              )}
              {!hasStealth && (
                <div className="t-italic" style={{ fontSize: 12, color: "var(--vermilion)", marginTop: 6, lineHeight: 1.5 }}>
                  {t("wallet.noStealth")} <Link href="/me/edit" style={{ color: "var(--vermilion)" }}>{t("wallet.sealOne")}</Link>
                </div>
              )}
            </Cartouche>

            {/* Receive-at-seal pill — gives the user something to paste into any external wallet */}
            {myName?.ens && address && (
              <ReceivePill ens={myName.ens} address={address} chainId={env.defaultChainId} />
            )}

            {err && (
              <div className="t-italic" style={{ fontSize: 13, color: "var(--vermilion)", textAlign: "center", marginTop: 14 }}>
                {err}
              </div>
            )}

            <div style={{ marginTop: 28 }}>
              <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 4 }}>{t("wallet.recent")}</div>
              <div className="t-display" style={{ fontSize: 28, letterSpacing: "0.04em", marginBottom: 12 }}>{t("wallet.recentTitle")}</div>

              {received.length === 0 && sent.length === 0 ? (
                <div style={{ padding: "24px", border: "0.5px dashed var(--gilded)", textAlign: "center" }}>
                  <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--ink-50)" }}>{t("wallet.blankBook")}</div>
                  <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", marginTop: 8, lineHeight: 1.55 }}>
                    {t("wallet.blankBody")}
                  </div>
                </div>
              ) : (
                <div>
                  {[...received.map((r) => ({ r, kind: "received" as const })), ...sent.map((r) => ({ r, kind: "sent" as const }))]
                    .sort((a, b) => Number(BigInt(b.r.blockNumber) - BigInt(a.r.blockNumber)))
                    .map(({ r, kind }) => (
                      <LedgerRow key={`${kind}:${r.txHash}`} r={r} kind={kind} />
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LedgerRow({ r, kind }: { r: RawReceipt; kind: "sent" | "received" }) {
  const counterparty = kind === "sent" ? r.recipientEns ?? shortAddr(r.stealthRecipient) : r.fromEns ?? shortAddr(r.from);
  const sigilKind = kind === "sent" ? "venus" : "caduceus";
  const sign = kind === "received" ? "+" : "−";
  const accent = kind === "received" ? "var(--verdigris)" : "var(--vermilion)";
  return (
    <Link href={`/r/${r.txHash}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "0.5px solid var(--gilded)" }}>
        <WaxSeal size={42} state="rubedo" rotate={(r.txHash.length % 12) - 6} emboss="fleur" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <AlchemicalSigil kind={sigilKind} size={18} frame={false} />
            <span className="t-display" style={{ fontSize: 9, letterSpacing: "0.3em", color: accent }}>
              {kind === "received" ? "GIFT RECEIVED" : "GIFT GIVEN"}
            </span>
          </div>
          <div className="t-italic" style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>
            {kind === "sent" ? "to" : "from"}{" "}
            <span className="t-mono" style={{ fontSize: 12 }}>{counterparty}</span>
            {r.memo && <span style={{ color: "var(--ink-70)", marginLeft: 8 }}>· {r.memo}</span>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="t-display" style={{ fontSize: 16, color: accent, letterSpacing: "0.04em" }}>
            {sign} {ethToKc(r.amountEth).toLocaleString("cs-CZ")} Kč
          </div>
          <div className="t-mono" style={{ fontSize: 10, color: "var(--ink-70)" }}>{r.amountEth} ETH</div>
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, amount, unit, sub, accent }: { label: string; amount: string; unit: string; sub?: string; accent?: string }) {
  return (
    <div>
      <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--ink-70)", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="t-display" style={{ fontSize: 38, letterSpacing: "0.02em", color: accent ?? "var(--ink)" }}>{amount}</span>
        <span className="t-display" style={{ fontSize: 14, letterSpacing: "0.1em", color: "var(--ink-70)" }}>{unit}</span>
      </div>
      {sub && <div className="t-mono" style={{ fontSize: 11, color: "var(--ink-70)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="parchment-surface" style={{ width: "100%", minHeight: "100vh", padding: "32px 20px 48px", display: "flex", justifyContent: "center" }}>
      {children}
    </div>
  );
}

function Loader({ children }: { children: React.ReactNode }) {
  return (
    <div className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)", textAlign: "center", padding: "60px 0", letterSpacing: "0.1em" }}>
      {children}
    </div>
  );
}

const btnDark: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 22px",
  background: "var(--ink)",
  color: "var(--parchment)",
  fontFamily: "var(--display)",
  fontSize: 12,
  letterSpacing: "0.3em",
  border: "none",
  cursor: "pointer",
  textDecoration: "none",
};

/** Receive-at-seal pill. Two copy targets: the ENS name (preferred — works in
 *  any wallet that resolves ENS), and the raw 0x address (fallback for older
 *  tools). Both deposit to the same on-chain wallet on the configured chain. */
function ReceivePill({ ens, address, chainId }: { ens: string; address: `0x${string}`; chainId: number }) {
  const [copied, setCopied] = useState<"ens" | "addr" | null>(null);
  const network = chainLabel(chainId);
  const copy = async (val: string, which: "ens" | "addr") => {
    try {
      await navigator.clipboard.writeText(val);
      setCopied(which);
      setTimeout(() => setCopied((c) => (c === which ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <div style={{ marginTop: 18, padding: "16px 18px", border: "0.5px solid var(--gilded)", background: "var(--bone)" }}>
      <div className="t-display" style={{ fontSize: 10, letterSpacing: "0.4em", color: "var(--vermilion)", marginBottom: 4 }}>
        RECEIVE AT THIS SEAL
      </div>
      <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)", marginBottom: 12, lineHeight: 1.5 }}>
        Send funds from any wallet on <strong style={{ fontStyle: "normal", color: "var(--ink)" }}>{network}</strong> to either of these. They both land here.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <PillRow label={ens} kind="ENS" copied={copied === "ens"} onCopy={() => copy(ens, "ens")} />
        <PillRow label={address} kind="0x" copied={copied === "addr"} onCopy={() => copy(address, "addr")} />
      </div>
      <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-50)", marginTop: 10, lineHeight: 1.5 }}>
        For a private gift, ask the sender to use your /tip page instead — that derives a fresh stealth address per payment, breaking the link to your wallet.
      </div>
    </div>
  );
}

function PillRow({ label, kind, copied, onCopy }: { label: string; kind: "ENS" | "0x"; copied: boolean; onCopy: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--parchment)", border: "0.5px solid var(--gilded)" }}>
      <span className="t-display" style={{ fontSize: 9, letterSpacing: "0.3em", color: "var(--ink-50)", flex: "0 0 auto", minWidth: 28 }}>
        {kind}
      </span>
      <code className="t-mono" style={{ flex: 1, fontSize: 12, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="t-display"
        style={{ flex: "0 0 auto", fontSize: 9, letterSpacing: "0.25em", color: copied ? "var(--verdigris)" : "var(--vermilion)", background: "transparent", border: "none", cursor: "pointer", padding: "4px 6px" }}
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}
