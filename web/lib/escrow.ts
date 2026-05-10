// PragueConnectEscrow client helpers — derive a deterministic taskId from a thread
// pair, read on-chain task state, and expose an ABI for fund/accept/deliver/
// release calls.
//
// Two contract versions:
//   v1 (ESCROW_ABI):  msg.sender-based auth on accept/deliver/release.
//                     Worker's main EOA appears in 3 events per task. Kept
//                     for back-compat but new flows use v2.
//   v2 (ESCROW_V2_ABI): EIP-712 sig-based auth. Worker signs intents with
//                       their stealth spending key; anyone submits the tx.
//                       Worker's main EOA never appears.
import { createPublicClient, http, keccak256, encodePacked } from "viem";
import { base, baseSepolia } from "viem/chains";
import { env } from "./env";

export const ESCROW_ABI = [
  { type: "function", name: "fund", stateMutability: "payable", inputs: [{ name: "taskId", type: "bytes32" }, { name: "worker", type: "address" }], outputs: [] },
  { type: "function", name: "accept", stateMutability: "nonpayable", inputs: [{ name: "taskId", type: "bytes32" }, { name: "stealthRecipient", type: "address" }, { name: "ephemeralPubKey", type: "bytes" }, { name: "viewTag", type: "bytes1" }], outputs: [] },
  { type: "function", name: "deliver", stateMutability: "nonpayable", inputs: [{ name: "taskId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "release", stateMutability: "nonpayable", inputs: [{ name: "taskId", type: "bytes32" }, { name: "rating", type: "uint8" }], outputs: [] },
  { type: "function", name: "refund", stateMutability: "nonpayable", inputs: [{ name: "taskId", type: "bytes32" }], outputs: [] },
  {
    type: "function",
    name: "tasks",
    stateMutability: "view",
    inputs: [{ name: "taskId", type: "bytes32" }],
    outputs: [
      { name: "funder", type: "address" },
      { name: "worker", type: "address" },
      { name: "amount", type: "uint96" },
      { name: "deliveredAt", type: "uint40" },
      { name: "phase", type: "uint8" },
      { name: "stealthRecipient", type: "address" },
      { name: "ephemeralPubKey", type: "bytes" },
      { name: "viewTag", type: "bytes1" },
    ],
  },
] as const;

export const ESCROW_V2_ABI = [
  { type: "function", name: "fund", stateMutability: "payable", inputs: [{ name: "taskId", type: "bytes32" }, { name: "workerKey", type: "address" }], outputs: [] },
  { type: "function", name: "acceptWithSig", stateMutability: "nonpayable", inputs: [{ name: "taskId", type: "bytes32" }, { name: "stealthRecipient", type: "address" }, { name: "ephemeralPubKey", type: "bytes" }, { name: "viewTag", type: "bytes1" }, { name: "workerSig", type: "bytes" }], outputs: [] },
  { type: "function", name: "deliverWithSig", stateMutability: "nonpayable", inputs: [{ name: "taskId", type: "bytes32" }, { name: "workerSig", type: "bytes" }], outputs: [] },
  { type: "function", name: "releaseWithSig", stateMutability: "nonpayable", inputs: [{ name: "taskId", type: "bytes32" }, { name: "rating", type: "uint8" }, { name: "sig", type: "bytes" }], outputs: [] },
  { type: "function", name: "releaseAsFunder", stateMutability: "nonpayable", inputs: [{ name: "taskId", type: "bytes32" }, { name: "rating", type: "uint8" }], outputs: [] },
  { type: "function", name: "refund", stateMutability: "nonpayable", inputs: [{ name: "taskId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "cancelByFunder", stateMutability: "nonpayable", inputs: [{ name: "taskId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "ACCEPT_TO_DELIVER_GRACE", stateMutability: "view", inputs: [], outputs: [{ type: "uint40" }] },
  {
    type: "function",
    name: "tasks",
    stateMutability: "view",
    inputs: [{ name: "taskId", type: "bytes32" }],
    outputs: [
      { name: "funder", type: "address" },
      { name: "workerKey", type: "address" },
      { name: "amount", type: "uint96" },
      { name: "deliveredAt", type: "uint40" },
      { name: "acceptedAt", type: "uint40" },
      { name: "phase", type: "uint8" },
      { name: "stealthRecipient", type: "address" },
      { name: "ephemeralPubKey", type: "bytes" },
      { name: "viewTag", type: "bytes1" },
    ],
  },
] as const;

/** EIP-712 typed-data envelope for v2 escrow signatures. The worker (or
 *  funder, on release) signs one of these with their spending privkey;
 *  anyone submits the resulting tx. */
export const ESCROW_V2_TYPES = {
  Accept: [
    { name: "taskId", type: "bytes32" },
    { name: "stealthRecipient", type: "address" },
    { name: "ephemeralPubKey", type: "bytes" },
    { name: "viewTag", type: "bytes1" },
  ],
  Deliver: [
    { name: "taskId", type: "bytes32" },
  ],
  Release: [
    { name: "taskId", type: "bytes32" },
    { name: "rating", type: "uint8" },
  ],
} as const;

export function escrowV2Domain(chainId: number, verifyingContract: `0x${string}`) {
  return {
    name: "PragueConnectEscrowV2",
    version: "1",
    chainId,
    verifyingContract,
  } as const;
}

export type Phase = 0 | 1 | 2 | 3 | 4 | 5;
/** Phase labels for the escrow widget. The plain-language headline comes
 *  first; the alchemical name is preserved as a stylistic suffix only.
 *  See PHASE_HINTS below for the one-line "what's happening right now"
 *  copy that we render under each headline. */
export const PHASE_LABELS: Record<Phase, string> = {
  0: "Not funded yet",
  1: "Funds locked · awaiting acceptance",
  2: "Work in progress",
  3: "Delivered · awaiting release",
  4: "Released · paid",
  5: "Cancelled · refunded",
};

/** Short "what is the escrow doing right now" line, shown under the
 *  headline phase label. Copy is plain English; no alchemy. */
export const PHASE_HINTS: Record<Phase, string> = {
  0: "Buyer locks funds in the escrow contract on Base. The worker can then accept and start.",
  1: "Buyer's ETH is held by the contract. The worker accepts to start the work — they sign with their stealth key, no main wallet on chain.",
  2: "Funds remain locked. When the worker is done, they mark Delivered to start the buyer's review window.",
  3: "Worker has marked the task delivered. Buyer reviews and releases. Worker can self-release after 24 hours if buyer is silent.",
  4: "Buyer signed off. Funds were paid out to the worker's stealth address; their main wallet stays unlinked.",
  5: "Funds returned to the buyer. The task is closed.",
};

export interface OnchainTask {
  funder: `0x${string}`;
  worker: `0x${string}`;
  amount: bigint;
  deliveredAt: number;
  /** Set when worker accepts (Albedo). Used by funder's cancel-grace path
   *  to compute when ACCEPT_TO_DELIVER_GRACE has elapsed. v2-only field —
   *  reads against v1 contracts return 0 here. */
  acceptedAt: number;
  phase: Phase;
  stealthRecipient: `0x${string}`;
  ephemeralPubKey: `0x${string}`;
  viewTag: `0x${string}`;
}

/** Deterministic taskId for a thread between two parties.
 *
 *  Privacy: the inputs MUST be each party's stealth-spending-key-derived
 *  address (`metaAddressToWorkerKey(meta)`) when available, NOT their main
 *  EOAs. Reason: TaskFunded already commits the worker's spending-key address
 *  publicly; using the same value here adds no new on-chain link. Hashing the
 *  worker's main EOA into the taskId would let an analyst confirm a guessed
 *  sender↔worker pair by re-computing the hash — undoing the v2 sig-auth
 *  privacy property.
 *
 *  Callers in `escrow-panel.tsx` derive both keys via `metaAddressToWorkerKey`
 *  and only fall back to EOA when a party hasn't published a meta-address.
 *  Sorting keeps the taskId stable regardless of who funds. */
export function deriveTaskId(keyA: `0x${string}`, keyB: `0x${string}`, salt = "pragueconnect.thread.v2"): `0x${string}` {
  const [first, second] = [keyA.toLowerCase() as `0x${string}`, keyB.toLowerCase() as `0x${string}`].sort();
  return keccak256(encodePacked(["address", "address", "string"], [first, second, salt]));
}

const escrowClient = () => {
  const onMainnet = env.defaultChainId === base.id;
  return createPublicClient({
    chain: onMainnet ? base : baseSepolia,
    transport: http(onMainnet ? env.baseRpcUrl : env.baseSepoliaRpcUrl),
  });
};

export async function loadTask(taskId: `0x${string}`): Promise<OnchainTask | null> {
  // Prefer v2 if deployed; v1 read kept for tasks created on the older contract.
  const v2 = env.escrowV2Address;
  const v1 = env.escrowAddress;
  const target = v2 || v1;
  const abi = v2 ? ESCROW_V2_ABI : ESCROW_ABI;
  if (!target) return null;
  try {
    const result = await escrowClient().readContract({
      address: target as `0x${string}`,
      abi,
      functionName: "tasks",
      args: [taskId],
    });
    if (v2) {
      const [funder, worker, amount, deliveredAt, acceptedAt, phase, stealthRecipient, ephemeralPubKey, viewTag] =
        result as readonly [
          `0x${string}`, `0x${string}`, bigint, number, number, number, `0x${string}`, `0x${string}`, `0x${string}`,
        ];
      return {
        funder, worker, amount, deliveredAt, acceptedAt,
        phase: phase as Phase, stealthRecipient, ephemeralPubKey, viewTag,
      };
    }
    // v1 has no acceptedAt slot.
    const [funder, worker, amount, deliveredAt, phase, stealthRecipient, ephemeralPubKey, viewTag] = result as readonly [
      `0x${string}`, `0x${string}`, bigint, number, number, `0x${string}`, `0x${string}`, `0x${string}`,
    ];
    return {
      funder, worker, amount, deliveredAt, acceptedAt: 0,
      phase: phase as Phase, stealthRecipient, ephemeralPubKey, viewTag,
    };
  } catch {
    return null;
  }
}

/** Returns the active escrow contract address (v2 if available, else v1). */
export function activeEscrowAddress(): `0x${string}` | null {
  const v2 = env.escrowV2Address;
  if (v2) return v2 as `0x${string}`;
  const v1 = env.escrowAddress;
  return v1 ? (v1 as `0x${string}`) : null;
}

export function isV2Active(): boolean {
  return Boolean(env.escrowV2Address);
}
