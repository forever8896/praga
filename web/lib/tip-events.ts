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

  // Public Base RPCs cap eth_getLogs at 10,000 blocks per request. Walk a
  // recent window in chunks newest-to-oldest and stop early once we have
  // enough events. PragueConnectTip was deployed 2026-05-08; covering ~7 days
  // (~300k blocks @ 2s) is plenty for the demo.
  const latest = await client.getBlockNumber();
  const TOTAL_LOOKBACK = BigInt(300_000);
  const CHUNK = BigInt(9_500); // safe under the 10k cap
  const earliest = latest > TOTAL_LOOKBACK ? latest - TOTAL_LOOKBACK : BigInt(0);
  const target = opts.limit ?? 100;

  const allLogs: Log<bigint, number, false, typeof TIPPED_EVENT>[] = [];
  let toBlock = latest;
  while (toBlock > earliest && allLogs.length < target) {
    const fromBlock = toBlock - CHUNK > earliest ? toBlock - CHUNK : earliest;
    try {
      const chunk = await client.getLogs({
        address: tipAddress,
        event: TIPPED_EVENT,
        fromBlock,
        toBlock,
        args: {
          from: opts.from,
          stealthRecipient: opts.recipient,
        },
      });
      allLogs.push(...(chunk as Log<bigint, number, false, typeof TIPPED_EVENT>[]));
    } catch {
      // RPC blip on this slice — keep walking; the missing window can be
      // backfilled by a subgraph later. Better to surface what we have than
      // 500 the whole receipts panel.
    }
    if (fromBlock === earliest) break;
    toBlock = fromBlock - BigInt(1);
  }
  const logs = allLogs;

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
