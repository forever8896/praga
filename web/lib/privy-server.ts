// Server-side Privy auth. Verifies the identity token a logged-in client
// sends with authenticated API calls (the one returned by useIdentityToken on
// the React side). Returns the wallet address bound to the token.
//
// IMPORTANT: privy-io/server-auth has two distinct verifiers in v3 —
//   verifyAuthToken(token)        : for ACCESS tokens (auth header by default)
//   getUserFromIdToken(idToken)   : for IDENTITY tokens (the cookie / hook value)
// Our React side uses useIdentityToken, so we must use getUserFromIdToken.
// Mixing them up returns 401 even for valid sessions.
import { PrivyClient, type User } from "@privy-io/server-auth";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;

let client: PrivyClient | null = null;
function getClient(): PrivyClient {
  if (client) return client;
  if (!appId || !appSecret) {
    throw new Error("privy-not-configured");
  }
  client = new PrivyClient(appId, appSecret);
  return client;
}

export interface VerifiedSession {
  userId: string;
  address: `0x${string}` | null;
}

function pickEthereumWallet(user: User): `0x${string}` | null {
  for (const account of user.linkedAccounts ?? []) {
    if (
      account.type === "wallet" &&
      "address" in account &&
      typeof account.address === "string" &&
      /^0x[a-fA-F0-9]{40}$/.test(account.address) &&
      // chainType may be "ethereum" or "solana" — we only want ETH addresses.
      ((account as { chainType?: string }).chainType ?? "ethereum") === "ethereum"
    ) {
      return account.address.toLowerCase() as `0x${string}`;
    }
  }
  return null;
}

/** Verify an Authorization: Bearer <identityToken> header. Returns null if missing/invalid. */
export async function verifySession(req: Request): Promise<VerifiedSession | null> {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1];

  let user: User;
  try {
    user = await getClient().getUserFromIdToken(token);
  } catch {
    return null;
  }

  return {
    userId: user.id,
    address: pickEthereumWallet(user),
  };
}
