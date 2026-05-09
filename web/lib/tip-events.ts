// Server-side helper: read PragueConnectTip.Tipped events from the active
// chain (Base mainnet by default; Base Sepolia for testnet) and resolve
// sender/recipient ENS labels against pragueconnect.eth subnames.
import { createPublicClient, http, parseAbiItem, type Log } from "viem";
import { base, baseSepolia } from "viem/chains";
import { env } from "./env";
import { listSubnames, type NameStoneRecord } from "./resolver";

export interface TipReceipt {
  txHash: `0x${string}`;
  blockNumber: bigint;
  from: `0x${string}`;
  stealthRecipient: `0x${string}`;
  amountWei: bigint;
  amountEth: string;
  memo: string;
  fromEns?: string;
  recipientEns?: string;
}

const TIPPED_EVENT = parseAbiItem(
  "event Tipped(address indexed from, address indexed stealthRecipient, uint256 amount, bytes ephemeralPubKey, bytes1 viewTag, string memo)",
);

interface QueryOpts {
  /** Filter by sender. */
  from?: `0x${string}`;
  /** Filter by direct (non-stealth) recipient address. */
  recipient?: `0x${string}`;
  /** Maximum events to return (newest first). */
  limit?: number;
}

export async function loadTipReceipts(opts: QueryOpts = {}): Promise<TipReceipt[]> {
  const tipAddress = env.tipAddress;
  if (!tipAddress) return [];

  const onMainnet = env.defaultChainId === base.id;
  const client = createPublicClient({
    chain: onMainnet ? base : baseSepolia,
    transport: http(onMainnet ? env.baseRpcUrl : env.baseSepoliaRpcUrl),
  });

  // PragueConnectTip was deployed on 2026-05-08. We start from a recent block.
  // For the demo dataset (tens of events) a single getLogs call is fine.
  const latest = await client.getBlockNumber();
  const fromBlock = latest > BigInt(50_000) ? latest - BigInt(50_000) : BigInt(0);

  const logs = await client.getLogs({
    address: tipAddress,
    event: TIPPED_EVENT,
    fromBlock,
    toBlock: latest,
    args: {
      from: opts.from,
      stealthRecipient: opts.recipient,
    },
  });

  // Reverse-resolve addresses to ENS labels (best effort) by listing all
  // pragueconnect.eth subnames once per request.
  let subnames: NameStoneRecord[] = [];
  try {
    subnames = await listSubnames(env.namestoneDomain, 200);
  } catch {
    /* leave empty */
  }
  const ensByAddr = new Map<string, string>();
  for (const s of subnames) {
    ensByAddr.set(s.address.toLowerCase(), `${s.name}.${s.domain}`);
  }

  const out: TipReceipt[] = (logs as Log<bigint, number, false, typeof TIPPED_EVENT>[])
    .map((log) => {
      const a = log.args;
      if (!a.from || !a.stealthRecipient || a.amount === undefined) return null;
      const amountWei = a.amount;
      return {
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        from: a.from,
        stealthRecipient: a.stealthRecipient,
        amountWei,
        amountEth: (Number(amountWei) / 1e18).toFixed(6),
        memo: a.memo ?? "",
        fromEns: ensByAddr.get(a.from.toLowerCase()),
        recipientEns: ensByAddr.get(a.stealthRecipient.toLowerCase()),
      } as TipReceipt;
    })
    .filter((x): x is TipReceipt => x !== null)
    .sort((a, b) => Number(b.blockNumber - a.blockNumber));

  if (opts.limit) return out.slice(0, opts.limit);
  return out;
}
