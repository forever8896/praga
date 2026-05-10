"use client";

// Three stacked panels in /wallet:
//
//   1. Private receipts — auth-gated bulletin lookup, balance check at every
//      stealth address the gateway has minted for this user, sweep button.
//      Sweeps go from stealth -> vault by default (so the on-chain trail
//      doesn't terminate at the user's main EOA).
//
//   2. Vault — deterministic in-browser EOA derived from a PRAGUECONNECT_VAULT
//      signature. Address is displayed, balance pulled, accumulated sweeps
//      land here. Address itself is published nowhere on-chain or in any text
//      record; it only enters the chain when funds first arrive.
//
//   3. Key custody — for Privy-embedded users a button surfaces Privy's
//      exportWallet() so they can take their stealth keys self-custodial.
//      External-wallet users get a confirmation copy instead.
import { useEffect, useMemo, useState } from "react";
import { usePrivy, useSignMessage, useWallets } from "@privy-io/react-auth";
import { useAccessToken } from "./use-access-token";
import { Cartouche, FleurDeLis, AlchemicalSigil } from "./ornaments";
import { env } from "./env";
import {
  PRAGUECONNECT_STEALTH_MESSAGE,
  PRAGUECONNECT_VAULT_MESSAGE,
  derivePragueConnectKeys,
  deriveStealthSpendingKey,
  deriveVaultKey,
} from "./stealth";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseGwei,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

interface BulletinEntry {
  stealthAddress: `0x${string}`;
  ephemeralPubKey: `0x${string}`;
  viewTag: `0x${string}`;
  ts: number;
  swept?: boolean;
  anchored?: boolean;
  anchorTxHash?: `0x${string}`;
}

interface BulletinResponse {
  domain?: string;
  name?: string;
  rotating?: boolean;
  entries?: BulletinEntry[];
  error?: string;
}

interface ScannedEntry extends BulletinEntry {
  balanceWei: bigint;
}

const SWEEP_GAS_BUFFER_WEI = BigInt(50_000) * BigInt(parseGwei("0.5"));

export function StealthInbox({ ensLabel, mainAddress }: { ensLabel: string | null; mainAddress: `0x${string}` | null }) {
  const { authenticated } = usePrivy();
  const { accessToken } = useAccessToken();
  const { signMessage } = useSignMessage();
  const { wallets } = useWallets();

  const [entries, setEntries] = useState<BulletinEntry[] | null>(null);
  const [scanned, setScanned] = useState<ScannedEntry[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanErr, setScanErr] = useState<string | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [sweepErr, setSweepErr] = useState<string | null>(null);
  const [sweepResults, setSweepResults] = useState<{ stealthAddress: string; hash: string }[]>([]);
  const [vault, setVault] = useState<{ address: `0x${string}`; privateKey: `0x${string}` } | null>(null);
  const [vaultBalance, setVaultBalance] = useState<bigint | null>(null);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [anchorErr, setAnchorErr] = useState<string | null>(null);
  const [anchorResults, setAnchorResults] = useState<{ stealthAddress: string; txHash: string }[]>([]);

  const onMainnet = env.defaultChainId === base.id;
  const chain = onMainnet ? base : baseSepolia;
  const rpcUrl = onMainnet ? env.baseRpcUrl : env.baseSepoliaRpcUrl;

  // --- bulletin fetch -----------------------------------------------------
  useEffect(() => {
    if (!authenticated || !accessToken || !ensLabel) {
      setEntries(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/stealth/bulletin?label=${encodeURIComponent(ensLabel)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = (await res.json()) as BulletinResponse;
        if (cancelled) return;
        if (!res.ok) {
          setScanErr(data.error ?? "bulletin-failed");
          return;
        }
        setEntries(data.entries ?? []);
      } catch (e) {
        if (!cancelled) setScanErr(e instanceof Error ? e.message : "bulletin-failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, accessToken, ensLabel]);

  // --- vault loading ------------------------------------------------------
  const loadVaultBalance = async (address: `0x${string}`) => {
    setVaultLoading(true);
    try {
      const reader = createPublicClient({ chain, transport: http(rpcUrl) });
      const bal = await reader.getBalance({ address });
      setVaultBalance(bal);
    } catch {
      setVaultBalance(null);
    } finally {
      setVaultLoading(false);
    }
  };

  const onUnlockVault = async () => {
    try {
      const { signature } = await signMessage({ message: PRAGUECONNECT_VAULT_MESSAGE });
      const { privateKey, address } = deriveVaultKey(signature as `0x${string}`);
      setVault({ privateKey, address });
      await loadVaultBalance(address);
    } catch (e) {
      setSweepErr(e instanceof Error ? e.message : "vault-derive-failed");
    }
  };

  // --- scan: balance check at every bulletin entry ------------------------
  const onScan = async () => {
    if (!entries || entries.length === 0) {
      setScanned([]);
      return;
    }
    setScanning(true);
    setScanErr(null);
    try {
      const reader = createPublicClient({ chain, transport: http(rpcUrl) });
      const balances = await Promise.all(
        entries.map(async (e) => {
          try {
            const wei = await reader.getBalance({ address: e.stealthAddress });
            return { ...e, balanceWei: wei };
          } catch {
            return { ...e, balanceWei: BigInt(0) };
          }
        }),
      );
      setScanned(balances);
    } catch (e) {
      setScanErr(e instanceof Error ? e.message : "scan-failed");
    } finally {
      setScanning(false);
    }
  };

  // --- sweep --------------------------------------------------------------
  const onSweep = async () => {
    if (!scanned || !vault) {
      setSweepErr("scan and unlock vault first");
      return;
    }
    const nonEmpty = scanned.filter((e) => !e.swept && e.balanceWei > SWEEP_GAS_BUFFER_WEI);
    if (nonEmpty.length === 0) {
      setSweepErr("no swept-able stealth balances");
      return;
    }
    setSweeping(true);
    setSweepErr(null);
    setSweepResults([]);
    try {
      // One signature unlocks the user's stealth spending+viewing privkeys.
      // From there we re-derive the per-stealth-address privkey for each
      // bulletin entry and broadcast a sweep tx from each one in parallel.
      const { signature } = await signMessage({ message: PRAGUECONNECT_STEALTH_MESSAGE });
      const keys = derivePragueConnectKeys(signature as `0x${string}`);

      const results: { stealthAddress: string; hash: string }[] = [];
      for (const entry of nonEmpty) {
        try {
          const stealthPriv = deriveStealthSpendingKey(
            keys.spendingPrivateKey,
            keys.viewingPrivateKey,
            entry.ephemeralPubKey,
          );
          const stealthAccount = privateKeyToAccount(stealthPriv);
          if (stealthAccount.address.toLowerCase() !== entry.stealthAddress.toLowerCase()) {
            // Derivation mismatch — skip silently. Means this entry was
            // generated for a different meta-address (e.g. user re-sealed
            // their stealth key after the entry landed).
            continue;
          }
          const wallet = createWalletClient({ account: stealthAccount, chain, transport: http(rpcUrl) });
          const value = entry.balanceWei - SWEEP_GAS_BUFFER_WEI;
          const hash = await wallet.sendTransaction({
            to: vault.address,
            value,
          });
          results.push({ stealthAddress: entry.stealthAddress, hash });
        } catch (e) {
          console.warn("sweep failed for", entry.stealthAddress, e);
        }
      }
      setSweepResults(results);
      // Refresh vault balance so the new total appears.
      await loadVaultBalance(vault.address);
    } catch (e) {
      setSweepErr(e instanceof Error ? e.message : "sweep-failed");
    } finally {
      setSweeping(false);
    }
  };

  // --- anchor on-chain ----------------------------------------------------
  const onAnchor = async () => {
    if (!ensLabel || !accessToken) return;
    setAnchoring(true);
    setAnchorErr(null);
    setAnchorResults([]);
    try {
      const res = await fetch(`/api/stealth/anchor?label=${encodeURIComponent(ensLabel)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnchorErr(data.error ?? "anchor-failed");
        return;
      }
      setAnchorResults(data.anchored ?? []);
      // Refresh the bulletin so the panel reflects new `anchored` flags.
      const re = await fetch(`/api/stealth/bulletin?label=${encodeURIComponent(ensLabel)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const reData = (await re.json()) as BulletinResponse;
      if (re.ok && reData.entries) setEntries(reData.entries);
    } catch (e) {
      setAnchorErr(e instanceof Error ? e.message : "anchor-failed");
    } finally {
      setAnchoring(false);
    }
  };

  // --- key custody --------------------------------------------------------
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const isEmbedded = !!embeddedWallet;

  const onExport = async () => {
    if (!embeddedWallet) return;
    setExporting(true);
    try {
      // Privy v3 exposes export via wallet.exportWallet?.() in some builds
      // and at the Privy hooks level otherwise. The Privy modal handles UX.
      const w = embeddedWallet as unknown as { exportWallet?: () => Promise<void> };
      if (typeof w.exportWallet === "function") {
        await w.exportWallet();
      } else {
        window.open("https://privy.io/account", "_blank");
      }
    } finally {
      setExporting(false);
    }
  };

  // --- render -------------------------------------------------------------
  const totalUnsweptWei = useMemo(
    () => scanned?.filter((e) => !e.swept).reduce((sum, e) => sum + e.balanceWei, BigInt(0)) ?? BigInt(0),
    [scanned],
  );

  if (!authenticated) return null;
  if (!ensLabel) {
    return (
      <Cartouche padding={20} style={{ marginTop: 28 }}>
        <Kicker>PRIVATE RECEIPTS</Kicker>
        <p className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", lineHeight: 1.55, margin: "4px 0 0" }}>
          Claim a name first — your private receipts are keyed off your seal.
        </p>
      </Cartouche>
    );
  }

  const numEntries = entries?.length ?? null;
  const hasNonEmpty = (scanned ?? []).some((e) => !e.swept && e.balanceWei > SWEEP_GAS_BUFFER_WEI);
  const anchoredCount = entries?.filter((e) => e.anchored).length ?? 0;
  const unanchoredCount = entries?.filter((e) => !e.anchored).length ?? 0;

  return (
    <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 18 }}>
      <Cartouche padding={24}>
        <Kicker>PRIVATE RECEIPTS</Kicker>
        <Title>The hidden ledger</Title>
        <p className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", lineHeight: 1.55, margin: "4px 0 14px" }}>
          Every time someone resolved {ensLabel}.{env.namestoneDomain} through ENS, the gateway minted a fresh stealth address and recorded the ephemeral key here. Only you can see this list — only you can sweep what landed.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onScan} disabled={scanning || numEntries === null} style={btn("var(--ink)")}>
            {scanning ? "scanning…" : `scan ${numEntries ?? "—"} stealth address${numEntries === 1 ? "" : "es"}`}
          </button>
          {scanned && (
            <span className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)" }}>
              · unswept total: {(Number(totalUnsweptWei) / 1e18).toFixed(5)} ETH
            </span>
          )}
        </div>
        {scanErr && (
          <div className="t-italic" style={{ fontSize: 12, color: "var(--vermilion)", marginTop: 8 }}>{scanErr}</div>
        )}
        {scanned && scanned.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
            {scanned
              .filter((e) => e.balanceWei > BigInt(0) || !e.swept)
              .slice(0, 8)
              .map((e) => (
                <div key={e.stealthAddress + e.ts} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, padding: "8px 0", borderBottom: "0.5px solid var(--gilded)", alignItems: "center" }}>
                  <AlchemicalSigil kind={e.balanceWei > BigInt(0) ? "venus" : "alembic"} size={20} frame={false} />
                  <div className="t-mono" style={{ fontSize: 12, color: e.balanceWei > BigInt(0) ? "var(--ink)" : "var(--ink-50)", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.stealthAddress.slice(0, 8)}…{e.stealthAddress.slice(-6)}
                  </div>
                  <div className="t-mono" style={{ fontSize: 12, color: e.balanceWei > BigInt(0) ? "var(--verdigris)" : "var(--ink-50)" }}>
                    {(Number(e.balanceWei) / 1e18).toFixed(5)} ETH
                  </div>
                </div>
              ))}
          </div>
        )}
      </Cartouche>

      <Cartouche padding={24}>
        <Kicker>VAULT</Kicker>
        <Title>Your private aggregator</Title>
        <p className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", lineHeight: 1.55, margin: "4px 0 14px" }}>
          A deterministic address derived from your wallet — never published in any ENS text record, never on-chain until funds arrive. This is where sweeps land. The link from {ensLabel}.{env.namestoneDomain} to this address exists only inside your session.
        </p>
        {!vault ? (
          <button onClick={onUnlockVault} style={btn("var(--ink)")}>
            UNLOCK VAULT
          </button>
        ) : (
          <>
            <div style={{ padding: "12px 14px", border: "0.5px solid var(--gilded)", background: "var(--bone)" }}>
              <div className="t-mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--verdigris)", marginBottom: 4 }}>VAULT ADDRESS</div>
              <div className="t-mono" style={{ fontSize: 12, color: "var(--ink)", wordBreak: "break-all" }}>{vault.address}</div>
              <div className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)", marginTop: 6 }}>
                {vaultLoading ? "…" : vaultBalance !== null ? `${(Number(vaultBalance) / 1e18).toFixed(5)} ETH` : "balance unknown"}
              </div>
            </div>
            {hasNonEmpty && (
              <div style={{ marginTop: 14 }}>
                <button onClick={onSweep} disabled={sweeping} style={btn("var(--vermilion)")}>
                  {sweeping ? "sweeping…" : `SWEEP ${(Number(totalUnsweptWei) / 1e18).toFixed(4)} ETH TO VAULT`}
                </button>
              </div>
            )}
            {sweepErr && (
              <div className="t-italic" style={{ fontSize: 12, color: "var(--vermilion)", marginTop: 8 }}>{sweepErr}</div>
            )}
            {sweepResults.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                <div className="t-display" style={{ fontSize: 9, letterSpacing: "0.3em", color: "var(--verdigris)" }}>SWEPT</div>
                {sweepResults.map((r) => (
                  <a key={r.hash} href={`${onMainnet ? "https://basescan.org" : "https://sepolia.basescan.org"}/tx/${r.hash}`} target="_blank" rel="noreferrer" className="t-mono" style={{ fontSize: 11, color: "var(--ink-70)", textDecoration: "none" }}>
                    {r.stealthAddress.slice(0, 10)}… → vault · {r.hash.slice(0, 10)}↗
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </Cartouche>

      <Cartouche padding={24}>
        <Kicker>ANCHOR ON-CHAIN</Kicker>
        <Title>Survive the gateway</Title>
        <p className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", lineHeight: 1.55, margin: "4px 0 14px" }}>
          Push your bulletin entries to the canonical ERC-5564 announcer on Base. Once anchored, any standard stealth scanner — FluidKey, ScopeLift, anyone — can rebuild your sweep list from on-chain logs. Your privacy stops depending on us being here.
        </p>
        <div className="t-mono" style={{ fontSize: 11, color: "var(--ink-70)", marginBottom: 10 }}>
          {entries === null
            ? "loading bulletin…"
            : `${anchoredCount} anchored · ${unanchoredCount} pending`}
        </div>
        <button
          onClick={onAnchor}
          disabled={anchoring || unanchoredCount === 0}
          style={btn(unanchoredCount === 0 ? "var(--ink-50)" : "var(--ink)")}
        >
          {anchoring
            ? "anchoring…"
            : unanchoredCount === 0
            ? "ALL ANCHORED"
            : `ANCHOR ${unanchoredCount} ENTR${unanchoredCount === 1 ? "Y" : "IES"}`}
        </button>
        {anchorErr && (
          <div className="t-italic" style={{ fontSize: 12, color: "var(--vermilion)", marginTop: 8 }}>{anchorErr}</div>
        )}
        {anchorResults.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="t-display" style={{ fontSize: 9, letterSpacing: "0.3em", color: "var(--verdigris)" }}>ANCHORED</div>
            {anchorResults.map((r) => (
              <a
                key={r.txHash}
                href={`${onMainnet ? "https://basescan.org" : "https://sepolia.basescan.org"}/tx/${r.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="t-mono"
                style={{ fontSize: 11, color: "var(--ink-70)", textDecoration: "none" }}
              >
                {r.stealthAddress.slice(0, 10)}… → ERC-5564 · {r.txHash.slice(0, 10)}↗
              </a>
            ))}
          </div>
        )}
        <p className="t-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--ink-50)", marginTop: 12 }}>
          announcer · {env.erc5564Announcer.slice(0, 6)}…{env.erc5564Announcer.slice(-4)} · gas paid by relayer
        </p>
      </Cartouche>

      <Cartouche padding={24}>
        <Kicker>KEY CUSTODY</Kicker>
        <Title>{isEmbedded ? "Your keys live with Privy — for now" : "You're already self-custodied"}</Title>
        <p className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", lineHeight: 1.55, margin: "4px 0 14px" }}>
          {isEmbedded
            ? "Your stealth keys are derived from a deterministic signature by your embedded wallet. Privy holds that wallet, gated by your email. Export it to any external wallet and the entire decryption chain becomes self-custodial — your privacy stops depending on us or Privy."
            : `You signed in with ${wallets[0]?.walletClientType ?? "an external wallet"}. Your stealth keys derive from a signature only your wallet can produce — not us, not Privy. Nothing to export.`}
        </p>
        {isEmbedded && (
          <button onClick={onExport} disabled={exporting} style={btn("var(--ink)")}>
            {exporting ? "…" : "EXPORT EMBEDDED WALLET"}
          </button>
        )}
        {!isEmbedded && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "0.5px solid var(--gilded)", background: "var(--bone)" }}>
            <FleurDeLis size={16} />
            <span className="t-display" style={{ fontSize: 10, letterSpacing: "0.3em", color: "var(--verdigris)" }}>SELF-CUSTODIED</span>
          </div>
        )}
      </Cartouche>

      <p className="t-mono" style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--ink-50)", textAlign: "center", marginTop: 4 }}>
        {mainAddress ? `main · ${mainAddress.slice(0, 6)}…${mainAddress.slice(-4)}` : ""}
        {mainAddress && vault ? " · " : ""}
        {vault ? `vault · ${vault.address.slice(0, 6)}…${vault.address.slice(-4)}` : ""}
      </p>
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 4 }}>{children}</div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <div className="t-display" style={{ fontSize: 22, letterSpacing: "0.04em" }}>{children}</div>;
}

function btn(bg: string): React.CSSProperties {
  return {
    padding: "10px 16px",
    background: bg,
    color: "var(--parchment)",
    fontFamily: "var(--display)",
    fontSize: 11,
    letterSpacing: "0.3em",
    border: "none",
    cursor: "pointer",
  };
}
