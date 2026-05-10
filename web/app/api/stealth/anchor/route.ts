// POST /api/stealth/anchor?label=<label>
//
// Anchors unanchored bulletin entries on the ScopeLift ERC-5564 announcer
// (canonical address 0x55649E01B5Df198D18D95b5cc5051630cfD45564 on Base +
// 8 other chains). After anchoring, the user's sweepability survives even
// if our gateway's bulletin storage is wiped — any standard stealth scanner
// (FluidKey, ScopeLift) can rebuild the entry list from on-chain logs.
//
// Auth gate: only the name's owner can trigger anchoring. We don't want a
// random caller to be able to push announcements that correlate with a
// stranger's name (it'd help an analyst cluster anomalies into a profile).
//
// Submitter: PC_RELAYER_KEY ?? PC_FAUCET_KEY. The relayer pays gas on
// behalf of the user. ~50k gas per anchor on Base, fractions of a cent.
//
// Body (optional): { limit?: number }  cap on entries to anchor in this call.
//
// Response: { ok, anchored: [{ stealthAddress, txHash }], skipped: number }
import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  encodePacked,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { listBulletin, markAnchored } from "@/lib/stealth-bulletin";
import { getSubname } from "@/lib/resolver-store";
import { verifySession } from "@/lib/privy-server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const RELAYER_KEY = (process.env.PC_RELAYER_KEY ?? process.env.PC_FAUCET_KEY ?? "") as Hex | "";

// Cap per request so a single click can't drain the relayer wallet — even
// at $0.0005/tx, 200 sequential txs would block the API for a long time.
const ANCHOR_BATCH_CAP = 25;

const ANNOUNCER_ABI = [
  {
    type: "function",
    name: "announce",
    stateMutability: "nonpayable",
    inputs: [
      { name: "schemeId", type: "uint256" },
      { name: "stealthAddress", type: "address" },
      { name: "ephemeralPubKey", type: "bytes" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export async function POST(req: Request) {
  if (!RELAYER_KEY) {
    return NextResponse.json({ error: "relayer-not-configured" }, { status: 503 });
  }
  const url = new URL(req.url);
  const label = url.searchParams.get("label") ?? "";
  if (!label) {
    return NextResponse.json({ error: "label-required" }, { status: 400 });
  }
  const session = await verifySession(req);
  if (!session?.address) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rec = await getSubname(env.namestoneDomain, label);
  if (!rec) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (rec.address.toLowerCase() !== session.address.toLowerCase()) {
    return NextResponse.json({ error: "not-owner" }, { status: 403 });
  }

  let limit = ANCHOR_BATCH_CAP;
  try {
    const body = (await req.json().catch(() => ({}))) as { limit?: number };
    if (typeof body.limit === "number" && body.limit > 0 && body.limit < ANCHOR_BATCH_CAP) {
      limit = body.limit;
    }
  } catch {
    /* default cap */
  }

  const entries = await listBulletin(rec.domain, rec.name);
  const targets = entries.filter((e) => !e.anchored).slice(0, limit);
  if (targets.length === 0) {
    return NextResponse.json({ ok: true, anchored: [], skipped: entries.length });
  }

  const onMainnet = env.defaultChainId === base.id;
  const chain = onMainnet ? base : baseSepolia;
  const transport = http(onMainnet ? env.baseRpcUrl : env.baseSepoliaRpcUrl);
  const account = privateKeyToAccount(RELAYER_KEY as Hex);
  const wallet = createWalletClient({ account, chain, transport });
  const reader = createPublicClient({ chain, transport });

  const anchored: { stealthAddress: string; txHash: string }[] = [];
  const failures: { stealthAddress: string; error: string }[] = [];

  for (const entry of targets) {
    try {
      // ERC-5564 §3: metadata is opaque; standard scanners read the first
      // byte as the viewTag. We pass just the viewTag (no payment amount,
      // no escrow context — this is a "rotation anchor", not a payment).
      const metadata = encodePacked(["bytes1"], [entry.viewTag]);
      const data = encodeFunctionData({
        abi: ANNOUNCER_ABI,
        functionName: "announce",
        args: [BigInt(1), entry.stealthAddress, entry.ephemeralPubKey, metadata],
      });
      const hash = await wallet.sendTransaction({
        to: env.erc5564Announcer as `0x${string}`,
        data,
        value: BigInt(0),
      });
      anchored.push({ stealthAddress: entry.stealthAddress, txHash: hash });
      // Mark in storage so subsequent anchor calls don't re-publish.
      // We don't wait for confirmation — if the tx ever fails we'll have a
      // ghost-anchored entry, but worst case the user re-runs once we
      // detect the missing receipt (out of scope for this call).
      await markAnchored(rec.domain, rec.name, entry.stealthAddress, hash);
    } catch (e) {
      failures.push({
        stealthAddress: entry.stealthAddress,
        error: e instanceof Error ? e.message : "submit-failed",
      });
    }
  }

  // Best-effort: confirm at least the last tx so the UI can refresh with
  // confidence. Tight timeout so we don't block the API.
  if (anchored.length > 0) {
    try {
      await reader.waitForTransactionReceipt({
        hash: anchored[anchored.length - 1].txHash as `0x${string}`,
        timeout: 15_000,
      });
    } catch {
      /* still return — receipts visible via block explorer */
    }
  }

  return NextResponse.json({
    ok: true,
    anchored,
    failures,
    skippedAlreadyAnchored: entries.length - targets.length,
  });
}
