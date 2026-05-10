// POST /api/escrow-relay — submits a v2-escrow signed-intent on behalf of the
// worker. The worker signs EIP-712 typed data with their stealth spending
// privkey in the browser; this endpoint pays gas and broadcasts the tx via
// a hosted EOA (PC_RELAYER_KEY, falls back to PC_FAUCET_KEY).
//
// Privacy property: the worker's main EOA never appears anywhere in the tx
// chain. The block explorer sees `relayer_eoa → escrow → ...`. The link
// from the relayer to the worker's identity exists only off-chain (the sig
// payload carries `taskId`; nothing identifies the human signer).
//
// Body:
//   { method: "accept", taskId, stealthRecipient, ephemeralPubKey, viewTag, sig }
//   { method: "deliver", taskId, sig }
//   { method: "release", taskId, rating, sig }
//
// All fields hex-strings (`0x…`). The endpoint validates phase + ABI shape;
// the contract validates the signature.
import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, encodeFunctionData, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { ESCROW_V2_ABI } from "@/lib/escrow";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const RELAYER_KEY = (process.env.PC_RELAYER_KEY ?? process.env.PC_FAUCET_KEY ?? "") as Hex | "";

interface AcceptBody {
  method: "accept";
  taskId: Hex;
  stealthRecipient: Hex;
  ephemeralPubKey: Hex;
  viewTag: Hex;
  sig: Hex;
}
interface DeliverBody {
  method: "deliver";
  taskId: Hex;
  sig: Hex;
}
interface ReleaseBody {
  method: "release";
  taskId: Hex;
  rating: number;
  sig: Hex;
}
type RelayBody = AcceptBody | DeliverBody | ReleaseBody;

function isHex(s: unknown, len?: number): s is Hex {
  if (typeof s !== "string" || !s.startsWith("0x")) return false;
  if (len !== undefined && s.length !== len) return false;
  return /^0x[0-9a-fA-F]*$/.test(s);
}

export async function POST(req: Request) {
  if (!RELAYER_KEY) {
    return NextResponse.json({ error: "relayer-not-configured" }, { status: 503 });
  }
  if (!env.escrowV2Address) {
    return NextResponse.json({ error: "escrow-v2-not-deployed" }, { status: 503 });
  }
  let body: RelayBody;
  try {
    body = (await req.json()) as RelayBody;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  let data: Hex;
  try {
    if (body.method === "accept") {
      if (!isHex(body.taskId, 66) || !isHex(body.stealthRecipient, 42) || !isHex(body.ephemeralPubKey) || !isHex(body.viewTag, 4) || !isHex(body.sig, 132)) {
        return NextResponse.json({ error: "bad-accept-args" }, { status: 400 });
      }
      data = encodeFunctionData({
        abi: ESCROW_V2_ABI,
        functionName: "acceptWithSig",
        args: [body.taskId, body.stealthRecipient, body.ephemeralPubKey, body.viewTag, body.sig],
      });
    } else if (body.method === "deliver") {
      if (!isHex(body.taskId, 66) || !isHex(body.sig, 132)) {
        return NextResponse.json({ error: "bad-deliver-args" }, { status: 400 });
      }
      data = encodeFunctionData({
        abi: ESCROW_V2_ABI,
        functionName: "deliverWithSig",
        args: [body.taskId, body.sig],
      });
    } else if (body.method === "release") {
      if (!isHex(body.taskId, 66) || !isHex(body.sig, 132) || typeof body.rating !== "number" || body.rating < 1 || body.rating > 5) {
        return NextResponse.json({ error: "bad-release-args" }, { status: 400 });
      }
      data = encodeFunctionData({
        abi: ESCROW_V2_ABI,
        functionName: "releaseWithSig",
        args: [body.taskId, body.rating, body.sig],
      });
    } else {
      return NextResponse.json({ error: "unknown-method" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "encode-failed" }, { status: 400 });
  }

  const onMainnet = env.defaultChainId === base.id;
  const chain = onMainnet ? base : baseSepolia;
  const transport = http(onMainnet ? env.baseRpcUrl : env.baseSepoliaRpcUrl);
  const account = privateKeyToAccount(RELAYER_KEY as Hex);
  const wallet = createWalletClient({ account, chain, transport });
  const reader = createPublicClient({ chain, transport });

  try {
    const hash = await wallet.sendTransaction({
      to: env.escrowV2Address as `0x${string}`,
      data,
      value: BigInt(0),
    });
    // Wait for inclusion so the UI can refresh confidently. Tight timeout
    // (15s) keeps the route from blocking when the network is slow — the
    // tx is still broadcast either way.
    try {
      await reader.waitForTransactionReceipt({ hash, timeout: 15000 });
    } catch {
      /* still return the hash */
    }
    return NextResponse.json({ ok: true, hash });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "submit-failed" },
      { status: 502 },
    );
  }
}
