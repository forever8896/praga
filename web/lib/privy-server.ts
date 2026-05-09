// Server-side Privy: verify the access token a logged-in client sends with
// authenticated API calls. Returns the wallet address bound to the token.
import { PrivyClient } from "@privy-io/server-auth";

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

/** Verify an Authorization: Bearer <token> header. Returns null if missing/invalid. */
export async function verifySession(req: Request): Promise<VerifiedSession | null> {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1];

  let claims: Awaited<ReturnType<PrivyClient["verifyAuthToken"]>>;
  try {
    claims = await getClient().verifyAuthToken(token);
  } catch {
    return null;
  }

  const userId = claims.userId;
  let address: `0x${string}` | null = null;
  try {
    const user = await getClient().getUserById(userId);
    const wallet = user.linkedAccounts.find(
      (a): a is typeof a & { address: string } =>
        a.type === "wallet" && "address" in a && typeof a.address === "string",
    );
    if (wallet?.address && /^0x[a-fA-F0-9]{40}$/.test(wallet.address)) {
      address = wallet.address.toLowerCase() as `0x${string}`;
    }
  } catch {
    /* leave address null — caller can decide to 403 */
  }

  return { userId, address };
}
