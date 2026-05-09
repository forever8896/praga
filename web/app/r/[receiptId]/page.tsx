// Screen 6 — Reputation receipt. The receiptId is a tx hash for tip flows.
// Reads the on-chain receipt + announcer event server-side; renders the
// stealth recipient, amount, memo, and links to the explorer.
import { Cartouche, FleurDeLis } from "@/lib/ornaments";
import { env } from "@/lib/env";
import { createPublicClient, http, decodeEventLog } from "viem";
import { baseSepolia } from "viem/chains";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TIP_EVENT_ABI = [
  {
    type: "event",
    name: "Tipped",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "stealthRecipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "ephemeralPubKey", type: "bytes", indexed: false },
      { name: "viewTag", type: "bytes1", indexed: false },
      { name: "memo", type: "string", indexed: false },
    ],
  },
] as const;

interface ReceiptData {
  txHash: `0x${string}` | null;
  status: "pending" | "confirmed" | "missing";
  from?: `0x${string}`;
  stealth?: `0x${string}`;
  amountEth?: string;
  memo?: string;
  blockNumber?: bigint;
}

async function loadReceipt(id: string): Promise<ReceiptData> {
  if (!/^0x[a-fA-F0-9]{64}$/.test(id)) {
    return { txHash: null, status: "missing" };
  }
  const txHash = id as `0x${string}`;
  const client = createPublicClient({ chain: baseSepolia, transport: http(env.baseSepoliaRpcUrl) });
  try {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (!receipt) return { txHash, status: "pending" };
    for (const log of receipt.logs) {
      try {
        const parsed = decodeEventLog({ abi: TIP_EVENT_ABI, data: log.data, topics: log.topics });
        if (parsed.eventName === "Tipped") {
          const a = parsed.args as {
            from: `0x${string}`;
            stealthRecipient: `0x${string}`;
            amount: bigint;
            memo: string;
          };
          return {
            txHash,
            status: "confirmed",
            from: a.from,
            stealth: a.stealthRecipient,
            amountEth: (Number(a.amount) / 1e18).toFixed(6),
            memo: a.memo,
            blockNumber: receipt.blockNumber,
          };
        }
      } catch {
        /* not the tip event */
      }
    }
    return { txHash, status: "confirmed", blockNumber: receipt.blockNumber };
  } catch {
    return { txHash, status: "pending" };
  }
}

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ receiptId: string }>;
  searchParams: Promise<{ stealth?: string }>;
}) {
  const { receiptId } = await params;
  const sp = await searchParams;
  const data = await loadReceipt(receiptId);
  const fallbackStealth = sp.stealth && /^0x[a-fA-F0-9]{40}$/.test(sp.stealth) ? (sp.stealth as `0x${string}`) : undefined;
  const stealth = data.stealth ?? fallbackStealth;

  return (
    <div className="parchment-surface" style={{ width: "100%", minHeight: "100vh", padding: "32px 20px 48px", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 720, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <FleurDeLis size={28} style={{ margin: "0 auto 8px" }} />
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.45em", color: "var(--vermilion)" }}>By this receipt</div>
          <div className="t-cer" style={{ fontSize: 36, color: "var(--ink)", marginTop: 8 }}>
            {data.status === "missing" ? "No such receipt" : data.status === "pending" ? "Pending the seal" : "Sealed gift recorded"}
          </div>
          <div className="hr-double" style={{ width: 80, margin: "12px auto" }} />
        </div>

        <Cartouche padding={28}>
          {data.status === "missing" && (
            <div className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", textAlign: "center", lineHeight: 1.55 }}>
              The receipt id <code className="t-mono">{receiptId}</code> doesn't look like a Base Sepolia transaction hash.
            </div>
          )}

          {data.status === "pending" && (
            <div style={{ textAlign: "center" }}>
              <div className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", lineHeight: 1.55, marginBottom: 12 }}>
                Waiting for the gift to land in a block. Refresh in a moment.
              </div>
              <a
                href={`https://sepolia.basescan.org/tx/${receiptId}`}
                target="_blank"
                rel="noreferrer"
                className="t-mono"
                style={{ fontSize: 11, color: "var(--ink-70)" }}
              >
                {receiptId.slice(0, 10)}…{receiptId.slice(-8)} ↗ basescan
              </a>
            </div>
          )}

          {data.status === "confirmed" && (
            <>
              <Row label="FROM" value={data.from ?? "?"} mono />
              <Row label="STEALTH RECIPIENT" value={stealth ?? "(not in this receipt)"} mono accent="var(--verdigris)" />
              <Row label="AMOUNT" value={`${data.amountEth ?? "?"} ETH`} accent="var(--vermilion)" />
              {data.memo && <Row label="WORD WITH IT" value={data.memo} italic />}
              {data.blockNumber !== undefined && <Row label="BLOCK" value={data.blockNumber.toString()} mono />}

              <div className="hr-gilded" style={{ margin: "18px 0" }} />

              <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", lineHeight: 1.55 }}>
                The recipient's ENS name does not appear in the on-chain trail. Their scanner picks up the announcement via ScopeLift's canonical ERC-5564 announcer (
                <code className="t-mono">{env.erc5564Announcer.slice(0, 10)}…{env.erc5564Announcer.slice(-4)}</code>) and finds the funds at the stealth address above.
              </div>

              <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a
                  href={`https://sepolia.basescan.org/tx/${data.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="t-display"
                  style={{ flex: 1, padding: "10px 14px", background: "var(--ink)", color: "var(--parchment)", fontSize: 11, letterSpacing: "0.3em", textAlign: "center", textDecoration: "none" }}
                >
                  VIEW ON BASESCAN ↗
                </a>
                {stealth && (
                  <a
                    href={`https://sepolia.basescan.org/address/${stealth}`}
                    target="_blank"
                    rel="noreferrer"
                    className="t-display"
                    style={{ flex: 1, padding: "10px 14px", background: "transparent", border: "0.5px solid var(--gilded)", color: "var(--ink)", fontSize: 11, letterSpacing: "0.3em", textAlign: "center", textDecoration: "none" }}
                  >
                    STEALTH ADDRESS ↗
                  </a>
                )}
              </div>
            </>
          )}
        </Cartouche>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/feed" className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)" }}>← back to the town square</Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, italic, accent }: { label: string; value: string; mono?: boolean; italic?: boolean; accent?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 0", borderBottom: "0.5px solid var(--gilded)", gap: 12 }}>
      <span className="t-mono" style={{ fontSize: 9, letterSpacing: "0.25em", color: "var(--gilded-soft)", flexShrink: 0 }}>{label}</span>
      <span
        className={mono ? "t-mono" : italic ? "t-italic" : "t-display"}
        style={{
          fontSize: mono ? 12 : italic ? 15 : 14,
          color: accent ?? "var(--ink)",
          textAlign: "right",
          wordBreak: "break-all",
          letterSpacing: mono ? "-0.01em" : "0.04em",
        }}
      >
        {value}
      </span>
    </div>
  );
}
