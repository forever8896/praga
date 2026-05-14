"use client";

// XMTP V3 / MLS — sealed thread between two ENS names. Uses the user's Privy
// embedded wallet to sign the one-time installation key, then conversations
// are end-to-end encrypted on XMTP's network.
import { Client, type Signer, IdentifierKind, type Conversation, type DecodedMessage } from "@xmtp/browser-sdk";

const ENV: "production" | "dev" = "dev"; // dev XMTP network for the hackathon

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedClient: Client<any> | null = null;
let cachedClientAddress: string | null = null;

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

interface BuildClientOpts {
  address: `0x${string}`;
  signMessage: (message: string) => Promise<string>;
}

/** Get or create an XMTP client for the given Privy embedded wallet.
 *  Cached at module level so we don't re-sign on every page navigation. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getXmtpClient({ address, signMessage }: BuildClientOpts): Promise<Client<any>> {
  if (cachedClient && cachedClientAddress === address.toLowerCase()) {
    return cachedClient;
  }
  const signer: Signer = {
    type: "EOA",
    getIdentifier: () => ({ identifier: address.toLowerCase(), identifierKind: IdentifierKind.Ethereum }),
    signMessage: async (message: string) => hexToBytes(await signMessage(message)),
  };
  const client = await Client.create(signer, { env: ENV } as Parameters<typeof Client.create>[1]);
  cachedClient = client;
  cachedClientAddress = address.toLowerCase();
  return client;
}

/** Open (or create) a DM with `recipientAddress`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function openDm(client: Client<any>, recipientAddress: `0x${string}`): Promise<Conversation<any>> {
  return client.conversations.createDmWithIdentifier({
    identifier: recipientAddress.toLowerCase(),
    identifierKind: IdentifierKind.Ethereum,
  });
}

/** Create a new MLS group room. The signing wallet becomes the only member
 *  (and the implicit admin) — additional members are added later via
 *  `addMemberToGroup`. We pass the room's topic/description into XMTP's own
 *  group metadata so an XMTP-native client also sees a sensible name. */
export async function createGroupRoom(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: Client<any>,
  meta: { topic: string; description?: string; imageUrl?: string },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Conversation<any>> {
  // Optimistic = the group exists locally before any sync — fine because we
  // immediately publish messages from inside the room.
  return client.conversations.createGroupOptimistic({
    groupName: meta.topic.slice(0, 140),
    groupDescription: (meta.description ?? "").slice(0, 1200),
    groupImageUrlSquare: meta.imageUrl,
  });
}

/** Open an existing group conversation by ID — used when joining a room
 *  from `/g/[label]` where the XMTP id is in the resolver record. */
export async function openGroupById(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: Client<any>,
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Conversation<any> | null> {
  await client.conversations.sync().catch(() => {});
  const conv = await client.conversations.getConversationById(id);
  return conv ?? null;
}

/** Add a member to an MLS group by their wallet address. The signing
 *  wallet must already be a member (and admin) of `group`. */
export async function addMemberToGroup(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  group: Conversation<any>,
  address: `0x${string}`,
): Promise<void> {
  // Conversation in the SDK is actually a Group when it has an MLS state —
  // the runtime objects share the addMembersByIdentifiers method.
  const g = group as unknown as {
    addMembersByIdentifiers: (ids: Array<{ identifier: string; identifierKind: IdentifierKind }>) => Promise<void>;
  };
  await g.addMembersByIdentifiers([
    { identifier: address.toLowerCase(), identifierKind: IdentifierKind.Ethereum },
  ]);
}

export type { Client as XmtpClient, Conversation as XmtpConversation, DecodedMessage as XmtpMessage };
