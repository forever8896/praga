// Server-side Privy auth. Verifies the JWT a logged-in client sends in the
// Authorization header. Privy v3 issues two distinct JWTs:
//   - access token  → verified via verifyAuthToken(t) → returns claims (userId)
//   - identity token → verified via getUserFromIdToken(t) → returns User
// The React side may give us either depending on which hook was used
// (useIdentityToken / useAccessToken / getAccessToken). To avoid lock-in to a
// single hook choice, we accept both: try identity-token first (richer payload,
// no extra round-trip), fall back to access-token verification + getUserById.
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
      ((account as { chainType?: string }).chainType ?? "ethereum") === "ethereum"
    ) {
      return account.address.toLowerCase() as `0x${string}`;
    }
  }
  return null;
}

/** Verify an Authorization: Bearer <token> header. Accepts either Privy
 *  identity tokens (preferred) or access tokens (fallback). Returns null if
 *  the token is missing or fails both verifiers. */
export async function verifySession(req: Request): Promise<VerifiedSession | null> {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1];

  const c = getClient();

  // Path 1 — identity token (the one returned by useIdentityToken).
  try {
    const user = await c.getUserFromIdToken(token);
    return { userId: user.id, address: pickEthereumWallet(user) };
  } catch {
    /* fall through to access-token path */
  }

  // Path 2 — access token (the one returned by getAccessToken / useAccessToken).
  try {
    const claims = await c.verifyAuthToken(token);
    const user = await c.getUserById(claims.userId);
    return { userId: claims.userId, address: pickEthereumWallet(user) };
  } catch {
    return null;
  }
}
