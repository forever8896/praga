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

export type { Client as XmtpClient, Conversation as XmtpConversation, DecodedMessage as XmtpMessage };
