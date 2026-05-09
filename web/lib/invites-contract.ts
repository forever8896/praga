// Server-side helper for the PragueConnectInvites contract on Base mainnet.
// Wraps `claim(codeHash, recipient)` — the operator-only function that releases
// any attached funds when an invitee successfully claims their subname.
//
// codeHash is keccak256(utf8 plaintext code), matching the Solidity:
//   bytes32 codeHash = keccak256(abi.encodePacked(string code))
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  formatEther,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { env } from "./env";

const INVITES_ABI = [
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "codeHash", type: "bytes32" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "amountFor",
    stateMutability: "view",
    inputs: [{ name: "codeHash", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "isClaimable",
    stateMutability: "view",
    inputs: [{ name: "codeHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export function codeHashFor(plaintext: string): Hex {
  return keccak256(toBytes(plaintext.toUpperCase()));
}

function chainAndRpc() {
  if (env.defaultChainId === base.id) {
    return { chain: base, rpc: env.baseRpcUrl };
  }
  return { chain: baseSepolia, rpc: env.baseSepoliaRpcUrl };
}

export async function getAttachedAmount(plaintextCode: string): Promise<bigint> {
  if (!env.invitesAddress) return BigInt(0);
  const { chain, rpc } = chainAndRpc();
  const client = createPublicClient({ chain, transport: http(rpc) });
  try {
    return await client.readContract({
      address: env.invitesAddress as Address,
      abi: INVITES_ABI,
      functionName: "amountFor",
      args: [codeHashFor(plaintextCode)],
    });
  } catch {
    return BigInt(0);
  }
}

/** Settle a funded invite: call Invites.claim(codeHash, recipient) from the
 *  operator EOA. Returns the tx hash and the amount released, or null if the
 *  contract isn't configured / the invite has nothing attached. */
export async function settleFundedInvite(
  plaintextCode: string,
  recipient: Address,
): Promise<{ txHash: Hex; amount: string } | null> {
  if (!env.invitesAddress) return null;
  const operatorKey = process.env.PC_FAUCET_KEY;
  if (!operatorKey) return null;

  const { chain, rpc } = chainAndRpc();
  const publicClient = createPublicClient({ chain, transport: http(rpc) });
  const codeHash = codeHashFor(plaintextCode);

  // Pre-flight: is there anything attached and not yet claimed?
  let attached: bigint;
  try {
    attached = await publicClient.readContract({
      address: env.invitesAddress as Address,
      abi: INVITES_ABI,
      functionName: "amountFor",
      args: [codeHash],
    });
  } catch {
    return null;
  }
  if (attached === BigInt(0)) return null;

  const account = privateKeyToAccount(operatorKey as Hex);
  const walletClient = createWalletClient({ account, chain, transport: http(rpc) });

  let txHash: Hex;
  try {
    txHash = await walletClient.writeContract({
      address: env.invitesAddress as Address,
      abi: INVITES_ABI,
      functionName: "claim",
      args: [codeHash, recipient],
    });
  } catch (e) {
    console.warn("[invites] claim() failed:", e instanceof Error ? e.message : e);
    return null;
  }

  // Don't block the response on confirmation — best-effort.
  publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 }).catch(() => {});

  return { txHash, amount: formatEther(attached) };
}
