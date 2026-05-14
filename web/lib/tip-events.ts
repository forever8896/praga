// Server-side helper: read PragueConnectTip.Tipped events and the escrow
// contracts' Funded/Accepted/Released events from the active chain
// (Base mainnet by default; Base Sepolia for testnet) and resolve
// sender/recipient ENS labels against pragueconnect.eth subnames.
import { createPublicClient, http, parseAbiItem, type Log } from "viem";
import { base, baseSepolia } from "viem/chains";
import { env } from "./env";
import { listSubnames, type NameStoneRecord } from "./resolver";
import { listBulletin } from "./stealth-bulletin";

export type ReceiptKind = "tip" | "escrow";

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
  /** "tip" for PragueConnectTip.Tipped, "escrow" for an escrow Released event. */
  kind: ReceiptKind;
  /** Set on escrow receipts; the bytes32 task identifier. */
  taskId?: `0x${string}`;
  /** Set on escrow receipts; 1–5 stars on release. */
  rating?: number;
}

// v2 (2026-05-10): memo is now a bytes32 keccak commitment, not the plaintext.
// The plaintext lives off-chain (XMTP, recipient's bulletin) so an analyst
// can't read sender-supplied descriptions paired with the sender's EOA.
const TIPPED_EVENT = parseAbiItem(
  "event Tipped(address indexed from, address indexed stealthRecipient, uint256 amount, bytes ephemeralPubKey, bytes1 viewTag, bytes32 memoHash)",
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
        memo: "", // plaintext lives off-chain now; on-chain is bytes32 commitment
        fromEns: ensByAddr.get(a.from.toLowerCase()),
        recipientEns: ensByAddr.get(a.stealthRecipient.toLowerCase()),
        kind: "tip",
      } as TipReceipt;
    })
    .filter((x): x is TipReceipt => x !== null)
    .sort((a, b) => Number(b.blockNumber - a.blockNumber));

  if (opts.limit) return out.slice(0, opts.limit);
  return out;
}

// ---------------------------------------------------------------------------
// Escrow receipts
//
// V1 (PragueConnectEscrow) indexes TaskFunded by the worker's MAIN EOA, so
// "received" can filter on the user's connected address directly.
//
// V2 (PragueConnectEscrowV2) indexes TaskFunded by `workerKey` — the
// stealth-spending-key-derived address, NOT the main EOA. The server can't
// know that address from the user's session alone. Workaround: walk
// TaskAccepted events and keep the ones whose `stealthRecipient` is in the
// user's bulletin (auth-gated to the label owner). This is also why escrow
// receipts only become visible after the worker has accepted at least one
// task post-bulletin-glue (or after a from-task backfill).

const ESCROW_FUNDED_V1 = parseAbiItem(
  "event TaskFunded(bytes32 indexed taskId, address indexed funder, address indexed worker, uint96 amount)",
);
const ESCROW_FUNDED_V2 = parseAbiItem(
  "event TaskFunded(bytes32 indexed taskId, address indexed funder, address indexed workerKey, uint96 amount)",
);
const ESCROW_ACCEPTED = parseAbiItem(
  "event TaskAccepted(bytes32 indexed taskId, address stealthRecipient)",
);
const ESCROW_RELEASED = parseAbiItem(
  "event TaskReleased(bytes32 indexed taskId, uint8 rating, bytes32 reputationCommitment)",
);

interface EscrowOpts {
  /** Filter by funder's main EOA (sent side). */
  funder?: `0x${string}`;
  /** Filter by worker's main EOA (V1 received side only). */
  worker?: `0x${string}`;
  /** ENS label of the caller — used to cross-reference V2 stealth recipients
   *  against the caller's bulletin. Required for V2 received receipts. */
  bulletinLabel?: string;
  /** Newest-first cap on the returned list. */
  limit?: number;
}

/** Walk a window in reverse-chronological chunks. Public Base RPCs cap
 *  getLogs at 10k blocks per query; chunking at 9.5k lands well under.
 *  The caller passes a thunk that issues the actual `client.getLogs` call
 *  for a given (fromBlock, toBlock) — that keeps viem's heavily-overloaded
 *  generic types out of this helper. Returns whatever could be fetched;
 *  transient RPC errors silently skip the slice rather than 500 the panel. */
async function chunkedLogs<L>(
  latest: bigint,
  fetchSlice: (fromBlock: bigint, toBlock: bigint) => Promise<L[]>,
  totalLookback = BigInt(300_000),
  chunkSize = BigInt(9_500),
): Promise<L[]> {
  const earliest = latest > totalLookback ? latest - totalLookback : BigInt(0);
  const all: L[] = [];
  let toBlock = latest;
  while (toBlock > earliest) {
    const fromBlock = toBlock - chunkSize > earliest ? toBlock - chunkSize : earliest;
    try {
      all.push(...(await fetchSlice(fromBlock, toBlock)));
    } catch {
      // RPC blip — skip this slice.
    }
    if (fromBlock === earliest) break;
    toBlock = fromBlock - BigInt(1);
  }
  return all;
}

export async function loadEscrowReceipts(opts: EscrowOpts = {}): Promise<TipReceipt[]> {
  const v1 = env.escrowAddress as `0x${string}` | "";
  const v2 = env.escrowV2Address as `0x${string}` | "";
  if (!v1 && !v2) return [];

  const onMainnet = env.defaultChainId === base.id;
  const client = createPublicClient({
    chain: onMainnet ? base : baseSepolia,
    transport: http(onMainnet ? env.baseRpcUrl : env.baseSepoliaRpcUrl),
  });
  const latestBlock = await client.getBlockNumber();

  // Bulletin lookup (V2 received side). Best-effort — without it we just skip
  // V2 received receipts; V1 still works via the indexed `worker` filter.
  const bulletinAddrs = new Set<string>();
  if (opts.bulletinLabel && opts.worker) {
    try {
      const entries = await listBulletin(env.namestoneDomain, opts.bulletinLabel);
      for (const e of entries) bulletinAddrs.add(e.stealthAddress.toLowerCase());
    } catch {
      /* leave empty */
    }
  }

  const fundedLogs: { taskId: `0x${string}`; funder: `0x${string}`; worker: `0x${string}`; amount: bigint; address: `0x${string}` }[] = [];

  // V1: filter by funder OR worker = main EOA (worker IS main EOA on V1).
  if (v1) {
    if (opts.funder) {
      const logs = await chunkedLogs(latestBlock, (fromBlock, toBlock) =>
        client.getLogs({ address: v1, event: ESCROW_FUNDED_V1, args: { funder: opts.funder }, fromBlock, toBlock }),
      );
      for (const log of logs) {
        const a = log.args;
        if (!a.taskId || !a.funder || !a.worker || a.amount === undefined) continue;
        fundedLogs.push({ taskId: a.taskId, funder: a.funder, worker: a.worker, amount: a.amount, address: v1 });
      }
    }
    if (opts.worker) {
      const logs = await chunkedLogs(latestBlock, (fromBlock, toBlock) =>
        client.getLogs({ address: v1, event: ESCROW_FUNDED_V1, args: { worker: opts.worker }, fromBlock, toBlock }),
      );
      for (const log of logs) {
        const a = log.args;
        if (!a.taskId || !a.funder || !a.worker || a.amount === undefined) continue;
        fundedLogs.push({ taskId: a.taskId, funder: a.funder, worker: a.worker, amount: a.amount, address: v1 });
      }
    }
  }

  // V2 funder-side: indexed funder = main EOA. Worker-side: index is the
  // worker's spending-key address, so we walk TaskAccepted instead and
  // cross-reference stealthRecipient ∈ bulletin.
  if (v2) {
    if (opts.funder) {
      const logs = await chunkedLogs(latestBlock, (fromBlock, toBlock) =>
        client.getLogs({ address: v2, event: ESCROW_FUNDED_V2, args: { funder: opts.funder }, fromBlock, toBlock }),
      );
      for (const log of logs) {
        const a = log.args;
        if (!a.taskId || !a.funder || !a.workerKey || a.amount === undefined) continue;
        fundedLogs.push({ taskId: a.taskId, funder: a.funder, worker: a.workerKey, amount: a.amount, address: v2 });
      }
    }
    if (bulletinAddrs.size > 0) {
      // Pull every TaskAccepted in the window and keep matches.
      const accepted = await chunkedLogs(latestBlock, (fromBlock, toBlock) =>
        client.getLogs({ address: v2, event: ESCROW_ACCEPTED, fromBlock, toBlock }),
      );
      const matchedSet = new Set<string>();
      for (const log of accepted) {
        const a = log.args;
        if (!a.taskId || !a.stealthRecipient) continue;
        if (bulletinAddrs.has(a.stealthRecipient.toLowerCase())) matchedSet.add(a.taskId.toLowerCase());
      }
      if (matchedSet.size > 0) {
        // Then load the corresponding TaskFunded events to get funder + amount.
        const funded = await chunkedLogs(latestBlock, (fromBlock, toBlock) =>
          client.getLogs({ address: v2, event: ESCROW_FUNDED_V2, fromBlock, toBlock }),
        );
        for (const log of funded) {
          const a = log.args;
          if (!a.taskId || !a.funder || !a.workerKey || a.amount === undefined) continue;
          if (!matchedSet.has(a.taskId.toLowerCase())) continue;
          fundedLogs.push({ taskId: a.taskId, funder: a.funder, worker: a.workerKey, amount: a.amount, address: v2 });
        }
      }
    }
  }

  if (fundedLogs.length === 0) return [];

  // Walk TaskAccepted (per-contract) to learn each task's stealthRecipient.
  const acceptedByTask = new Map<string, `0x${string}`>();
  // Walk TaskReleased (per-contract) to learn release tx + rating.
  const releasedByTask = new Map<string, { txHash: `0x${string}`; blockNumber: bigint; rating: number }>();
  const fundedTaskIds = new Set(fundedLogs.map((f) => f.taskId.toLowerCase()));
  const escrowAddrs = Array.from(new Set(fundedLogs.map((f) => f.address)));
  for (const addr of escrowAddrs) {
    const accepted = await chunkedLogs(latestBlock, (fromBlock, toBlock) =>
      client.getLogs({ address: addr, event: ESCROW_ACCEPTED, fromBlock, toBlock }),
    );
    for (const log of accepted) {
      const a = log.args;
      if (!a.taskId || !a.stealthRecipient) continue;
      if (!fundedTaskIds.has(a.taskId.toLowerCase())) continue;
      acceptedByTask.set(a.taskId.toLowerCase(), a.stealthRecipient);
    }
    const released = await chunkedLogs(latestBlock, (fromBlock, toBlock) =>
      client.getLogs({ address: addr, event: ESCROW_RELEASED, fromBlock, toBlock }),
    );
    for (const log of released) {
      const a = log.args;
      if (!a.taskId || a.rating === undefined) continue;
      if (!fundedTaskIds.has(a.taskId.toLowerCase())) continue;
      releasedByTask.set(a.taskId.toLowerCase(), {
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        rating: a.rating,
      });
    }
  }

  // ENS label hints — same listSubnames cache as loadTipReceipts.
  const ensByAddr = new Map<string, string>();
  try {
    const subnames = await listSubnames(env.namestoneDomain, 200);
    for (const s of subnames) ensByAddr.set(s.address.toLowerCase(), `${s.name}.${s.domain}`);
  } catch {
    /* leave empty */
  }

  // Emit a receipt only for tasks that actually released — pending escrows
  // belong on the thread UI, not in the receipts ledger.
  const out: TipReceipt[] = [];
  for (const f of fundedLogs) {
    const released = releasedByTask.get(f.taskId.toLowerCase());
    if (!released) continue;
    const stealthRecipient = acceptedByTask.get(f.taskId.toLowerCase()) ?? f.worker;
    out.push({
      kind: "escrow",
      taskId: f.taskId,
      rating: released.rating,
      txHash: released.txHash,
      blockNumber: released.blockNumber,
      from: f.funder,
      stealthRecipient,
      amountWei: f.amount,
      amountEth: (Number(f.amount) / 1e18).toFixed(6),
      memo: "",
      fromEns: ensByAddr.get(f.funder.toLowerCase()),
      recipientEns: ensByAddr.get(stealthRecipient.toLowerCase()),
    });
  }

  out.sort((a, b) => Number(b.blockNumber - a.blockNumber));
  if (opts.limit) return out.slice(0, opts.limit);
  return out;
}
