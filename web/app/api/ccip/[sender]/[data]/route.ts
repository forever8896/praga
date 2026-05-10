// PragueConnect's CCIP-Read gateway. ENS clients hit this URL whenever they
// resolve any subname under `pragueconnect.eth`, because the on-chain resolver
// (PragueConnectResolver.sol) returns an OffchainLookup pointing here.
//
// Protocol (EIP-3668 + ENSIP-10):
//   GET  /api/ccip/{sender}/{data}.json
//   POST /api/ccip/{sender}/{data}.json   (body { sender, data })
//
//   sender = the resolver contract address (hex)
//   data   = ABI-encoded call to IResolverService.resolve(name, callData)
//
//   We decode `callData` (one of: addr(node), addr(node,coin), text(node,key),
//   contenthash(node)), look up the answer in our store, and return:
//     { data: hex( abi.encode(result, expires, sig) ) }
//
//   The resolver verifies our signature (signed with PC_RESOLVER_SIGNER_KEY)
//   against the registered signer set in the contract. If valid, the result
//   propagates back to the ENS-aware caller.
import {
  decodeAbiParameters,
  encodeAbiParameters,
  encodePacked,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { findByNamehash, type SubnameRecord } from "@/lib/resolver-store";
import { paymentAddress } from "@/lib/stealth";
import { appendBulletin } from "@/lib/stealth-bulletin";

export const runtime = "nodejs";

const SIGNER_KEY = process.env.PC_RESOLVER_SIGNER_KEY ?? "";

const SELECTORS = {
  addr: "0x3b3b57de",
  addrMulticoin: "0xf1cb7e06",
  text: "0x59d1d43c",
  contenthash: "0xbc1c58d1",
} as const;

// Resolution-cache TTL doubles as the rotation cadence: clients re-fetching
// inside this window get the same signed answer; outside it, the gateway
// mints a new stealth address. 120s is short enough for a live demo refresh
// to produce visibly different addresses, long enough that a single send
// flow's pre-flight checks reuse one stealth address.
const TTL_SECONDS = 120;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/** If the record opted in to stealth rotation and has a valid meta-address,
 *  derive a fresh stealth address and append the ephemeral pubkey to the
 *  bulletin. Returns the static EOA otherwise so existing users are unaffected. */
async function resolveAddrForRecord(
  rec: SubnameRecord | null,
  coinType: number,
): Promise<`0x${string}`> {
  if (!rec) return ZERO_ADDRESS;
  if (coinType !== 60) {
    // Multichain coin types just look up the static record. Rotation only
    // applies to Ethereum addresses for now.
    const fromMulti = rec.coin_types?.[String(coinType)];
    if (fromMulti) {
      return (fromMulti.startsWith("0x") ? fromMulti : `0x${fromMulti}`) as `0x${string}`;
    }
    return "0x" as `0x${string}`;
  }

  const rotate = rec.text_records?.["stealth-rotate-addr"] === "true";
  const meta = rec.text_records?.["stealth-meta-address"] ?? "";
  if (!rotate || !meta.startsWith("st:eth:")) {
    return rec.address;
  }
  try {
    const out = paymentAddress(meta);
    // Await the bulletin write so we never hand out a stealth address whose
    // ephemeral key is unrecorded — the recipient must be able to scan and
    // sweep, otherwise funds land at an unsweepable address.
    await appendBulletin(rec.domain, rec.name, {
      stealthAddress: out.stealthAddress,
      ephemeralPubKey: out.ephemeralPublicKey,
      viewTag: out.viewTag,
      ts: Date.now(),
      coinType: 60,
    });
    return out.stealthAddress;
  } catch (e) {
    console.warn(
      `[ccip] stealth rotation failed for ${rec.name}.${rec.domain}; falling back to static addr:`,
      e instanceof Error ? e.message : e,
    );
    return rec.address;
  }
}

interface CCIPRequest {
  sender: `0x${string}`;
  data: `0x${string}`;
}

export async function GET(req: Request, ctx: { params: Promise<{ sender: string; data: string }> }) {
  const { sender, data } = await ctx.params;
  const cleaned = data.replace(/\.json$/, "");
  return handle({ sender: sender as `0x${string}`, data: cleaned as `0x${string}` });
}

export async function POST(req: Request) {
  let body: CCIPRequest;
  try {
    body = (await req.json()) as CCIPRequest;
  } catch {
    return jsonError("invalid-json", 400);
  }
  return handle(body);
}

async function handle({ sender, data }: CCIPRequest): Promise<Response> {
  if (!SIGNER_KEY) return jsonError("gateway-not-configured", 503);
  if (!sender || !data) return jsonError("missing-params", 400);

  // The outer `data` is the abi-encoded call to IResolverService.resolve(name, callData).
  // Selector occupies the first 4 bytes; we ignore it and decode the params.
  let outerName: `0x${string}`;
  let inner: `0x${string}`;
  try {
    const params = decodeAbiParameters(
      [
        { name: "name", type: "bytes" },
        { name: "data", type: "bytes" },
      ],
      `0x${data.slice(10)}` as `0x${string}`,
    );
    outerName = params[0] as `0x${string}`;
    inner = params[1] as `0x${string}`;
  } catch (e) {
    return jsonError(`decode-outer-failed: ${e instanceof Error ? e.message : String(e)}`, 400);
  }
  void outerName; // we use the namehash from `inner` for lookup; outerName is informational

  const innerSelector = inner.slice(0, 10).toLowerCase();
  let result: `0x${string}`;
  try {
    if (innerSelector === SELECTORS.addr) {
      const [node] = decodeAbiParameters([{ name: "node", type: "bytes32" }], `0x${inner.slice(10)}`);
      const rec = await findByNamehash(node as `0x${string}`);
      const addr = await resolveAddrForRecord(rec, 60);
      result = encodeAbiParameters([{ type: "address" }], [addr]);
    } else if (innerSelector === SELECTORS.addrMulticoin) {
      const [node, coinType] = decodeAbiParameters(
        [
          { name: "node", type: "bytes32" },
          { name: "coinType", type: "uint256" },
        ],
        `0x${inner.slice(10)}`,
      );
      const rec = await findByNamehash(node as `0x${string}`);
      // ENS multichain spec: addr() with cointype=60 must equal addr(node).
      // Both branches go through resolveAddrForRecord so rotation behaves
      // identically whether the client asked via the legacy addr() or the
      // multicoin variant.
      const ct = Number(coinType as bigint);
      const addr = await resolveAddrForRecord(rec, ct);
      const addrBytes = (addr === ZERO_ADDRESS && ct !== 60 ? "0x" : addr) as `0x${string}`;
      result = encodeAbiParameters([{ type: "bytes" }], [addrBytes]);
    } else if (innerSelector === SELECTORS.text) {
      const [node, key] = decodeAbiParameters(
        [
          { name: "node", type: "bytes32" },
          { name: "key", type: "string" },
        ],
        `0x${inner.slice(10)}`,
      );
      const rec = await findByNamehash(node as `0x${string}`);
      const value = rec?.text_records?.[key as string] ?? "";
      result = encodeAbiParameters([{ type: "string" }], [value]);
    } else if (innerSelector === SELECTORS.contenthash) {
      const [node] = decodeAbiParameters([{ name: "node", type: "bytes32" }], `0x${inner.slice(10)}`);
      const rec = await findByNamehash(node as `0x${string}`);
      const ch = rec?.contenthash;
      const hexCh = (ch && ch.length > 0 ? (ch.startsWith("0x") ? ch : `0x${ch}`) : "0x") as `0x${string}`;
      result = encodeAbiParameters([{ type: "bytes" }], [hexCh]);
    } else {
      // Unknown selector — return empty bytes so the resolver doesn't blow up.
      result = "0x";
    }
  } catch (e) {
    return jsonError(`decode-inner-failed: ${e instanceof Error ? e.message : String(e)}`, 400);
  }

  // Sign over (target, expires, request, result) per ensdomains/offchain-resolver.
  const expires = BigInt(Math.floor(Date.now() / 1000) + TTL_SECONDS);
  const digest = keccak256(
    encodePacked(
      ["bytes2", "address", "uint64", "bytes32", "bytes32"],
      ["0x1900", sender, expires, keccak256(data), keccak256(result)],
    ),
  );
  let sig: `0x${string}`;
  try {
    const account = privateKeyToAccount(SIGNER_KEY as `0x${string}`);
    sig = await account.sign({ hash: digest });
  } catch (e) {
    return jsonError(`sign-failed: ${e instanceof Error ? e.message : String(e)}`, 500);
  }

  const responseBytes = encodeAbiParameters(
    [{ type: "bytes" }, { type: "uint64" }, { type: "bytes" }],
    [result, expires, sig],
  );

  return Response.json({ data: responseBytes });
}

function jsonError(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

// Suppress static optimisation; we read env at request time.
export const dynamic = "force-dynamic";

// Helper exposed for testing — not used by handlers above.
export const __test = { SELECTORS, TTL_SECONDS, toHex };
