// POST /api/faucet-drip — pragmatic gasless onboarding.
//
// New users land with 0 ETH on Base Sepolia and the first thing the demo asks
// them to do is send a tip. Rather than detour through a public faucet, we
// keep a project-funded EOA hot and drip ~0.005 ETH (enough for ~50 tips at
// typical Base Sepolia gas) the first time an authenticated user asks.
//
// Auth: Privy identity token (Bearer). Address is taken from Privy, not from
//       the request body — clients can't drip arbitrary addresses.
// Rate-limit: one drip per address per 24h via KV (key `pc:drip:<addr>`).
// No-op if the address already has > DRIP_THRESHOLD_WEI on chain.
//
// If PC_FAUCET_KEY isn't configured, the route returns 503 and the client
// falls back to the existing Alchemy faucet link.
import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { kv } from "@vercel/kv";
import { verifySession } from "@/lib/privy-server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

// Drip amounts tuned per chain. Base mainnet gas is so cheap (~0.006 gwei) that
// 0.0001 ETH covers thousands of tip transactions; 0.005 ETH would be wildly
// excessive. Base Sepolia is left at the historical 0.005 ETH for testnet runs.
const DRIP_AMOUNT_BY_CHAIN: Record<number, bigint> = {
  [base.id]: parseEther("0.0001"),
  [baseSepolia.id]: parseEther("0.005"),
};
const DRIP_THRESHOLD_BY_CHAIN: Record<number, bigint> = {
  [base.id]: parseEther("0.00005"),
  [baseSepolia.id]: parseEther("0.001"),
};
const COOLDOWN_SECONDS = 60 * 60 * 24; // one drip per address per day

const KV_AVAILABLE = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN,
);

export async function POST(req: Request) {
  const faucetKey = process.env.PC_FAUCET_KEY;
  if (!faucetKey) {
    return NextResponse.json({ error: "faucet-not-configured" }, { status: 503 });
  }
  const chain = env.defaultChainId === base.id ? base : baseSepolia;
  const dripAmount = DRIP_AMOUNT_BY_CHAIN[env.defaultChainId];
  const dripThreshold = DRIP_THRESHOLD_BY_CHAIN[env.defaultChainId];
  if (!dripAmount || !dripThreshold) {
    return NextResponse.json({ error: "wrong-chain" }, { status: 400 });
  }
  const rpcUrl = env.defaultChainId === base.id ? env.baseRpcUrl : env.baseSepoliaRpcUrl;

  const session = await verifySession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.address) {
    return NextResponse.json({ error: "no-address-bound" }, { status: 400 });
  }
  const recipient = session.address;

  // Rate-limit per recipient address.
  if (KV_AVAILABLE) {
    const lockKey = `pc:drip:${recipient.toLowerCase()}`;
    const last = await kv.get<number>(lockKey);
    if (last && Date.now() - last < COOLDOWN_SECONDS * 1000) {
      const retrySec = Math.ceil((last + COOLDOWN_SECONDS * 1000 - Date.now()) / 1000);
      return NextResponse.json(
        { error: "rate-limited", retryAfterSeconds: retrySec },
        { status: 429 },
      );
    }
  }

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

  // Skip if user already has enough.
  const balance = await publicClient.getBalance({ address: recipient }).catch(() => BigInt(0));
  if (balance >= dripThreshold) {
    return NextResponse.json({
      ok: true,
      skipped: "already-funded",
      balance: formatEther(balance),
    });
  }

  const account = privateKeyToAccount(faucetKey as `0x${string}`);
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  // Double-check faucet balance — surface a clear error if dry rather than a
  // generic "insufficient funds" from the RPC.
  const faucetBal = await publicClient.getBalance({ address: account.address }).catch(() => BigInt(0));
  if (faucetBal < dripAmount * BigInt(2)) {
    return NextResponse.json(
      {
        error: "faucet-low",
        faucet: account.address,
        faucetBalance: formatEther(faucetBal),
      },
      { status: 503 },
    );
  }

  let txHash: `0x${string}`;
  try {
    txHash = await walletClient.sendTransaction({
      to: recipient,
      value: dripAmount,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "drip-failed" },
      { status: 502 },
    );
  }

  // Wait for inclusion before returning so the client can immediately tx.
  try {
    await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 30_000 });
  } catch {
    // Drip went out but didn't confirm in 30s — still return success; client
    // can poll. Don't lock the cooldown if we never confirmed.
    return NextResponse.json({ ok: true, txHash, pending: true });
  }

  // Lock the cooldown only after a confirmed drip.
  if (KV_AVAILABLE) {
    await kv.set(`pc:drip:${recipient.toLowerCase()}`, Date.now(), { ex: COOLDOWN_SECONDS });
  }

  return NextResponse.json({
    ok: true,
    txHash,
    amount: formatEther(dripAmount),
    recipient,
  });
}
