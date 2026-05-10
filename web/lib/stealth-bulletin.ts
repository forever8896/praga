// Stealth bulletin — append-only ledger of every fresh stealth address the CCIP
// gateway minted for a given subname. Written when `addr()` rotates; read by
// the recipient's wallet to discover and sweep landed funds.
//
// Storage: Vercel KV list at key `pc:stealth:<domain>:<name>`, capped at
//          BULLETIN_CAP entries via LPUSH + LTRIM. In-memory fallback for
//          dev / when KV isn't configured (warm-lambda life only).
//
// Privacy property the bulletin upholds:
//   - Reads MUST be auth-gated to the name's owner. If anyone could read
//     Alice's bulletin, they'd see every stealth address tied to her meta —
//     defeating the rotation. The read-side enforcement lives in the route
//     handler at /api/stealth/bulletin (added in Phase 3b). This module is
//     trust-blind: it just stores and returns entries.
import { kv } from "@vercel/kv";

export interface BulletinEntry {
  stealthAddress: `0x${string}`;
  ephemeralPubKey: `0x${string}`;
  viewTag: `0x${string}`;
  ts: number;        // unix ms
  coinType?: number; // 60 = ETH (default). Future: other ENSIP-9 chains.
  swept?: boolean;   // set true once the wallet view confirms a sweep tx.
  anchored?: boolean; // set true once Phase-4 has pushed this entry to the
                      // on-chain ERC-5564 announcer. After anchoring, the
                      // user can sweep without trusting our bulletin storage.
  anchorTxHash?: `0x${string}`;
}

const KV_AVAILABLE = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN,
);

const BULLETIN_CAP = 200;

const memBulletins = new Map<string, BulletinEntry[]>();

function bulletinKey(domain: string, name: string): string {
  return `pc:stealth:${domain.toLowerCase()}:${name.toLowerCase()}`;
}

export async function appendBulletin(
  domain: string,
  name: string,
  entry: BulletinEntry,
): Promise<void> {
  const k = bulletinKey(domain, name);
  if (KV_AVAILABLE) {
    try {
      // LPUSH adds to head; LTRIM keeps newest BULLETIN_CAP entries.
      await kv.lpush(k, entry);
      await kv.ltrim(k, 0, BULLETIN_CAP - 1);
      return;
    } catch (e) {
      console.warn("[bulletin] KV write failed:", e instanceof Error ? e.message : e);
    }
  }
  const existing = memBulletins.get(k) ?? [];
  existing.unshift(entry);
  if (existing.length > BULLETIN_CAP) existing.length = BULLETIN_CAP;
  memBulletins.set(k, existing);
}

export async function listBulletin(
  domain: string,
  name: string,
  limit = BULLETIN_CAP,
): Promise<BulletinEntry[]> {
  const k = bulletinKey(domain, name);
  if (KV_AVAILABLE) {
    try {
      const raw = await kv.lrange(k, 0, limit - 1);
      // @vercel/kv auto-deserializes objects pushed as objects. Defensively
      // accept either JSON-string entries (legacy) or already-parsed records.
      return raw.map((r) => (typeof r === "string" ? (JSON.parse(r) as BulletinEntry) : (r as BulletinEntry)));
    } catch (e) {
      console.warn("[bulletin] KV read failed:", e instanceof Error ? e.message : e);
    }
  }
  return (memBulletins.get(k) ?? []).slice(0, limit);
}

/** Mark a single bulletin entry as swept by stealthAddress match. Idempotent. */
export async function markSwept(
  domain: string,
  name: string,
  stealthAddress: `0x${string}`,
): Promise<void> {
  const k = bulletinKey(domain, name);
  const target = stealthAddress.toLowerCase();
  if (KV_AVAILABLE) {
    try {
      const all = await kv.lrange(k, 0, BULLETIN_CAP - 1);
      const updated = all.map((r) => {
        const e = typeof r === "string" ? (JSON.parse(r) as BulletinEntry) : (r as BulletinEntry);
        if (e.stealthAddress.toLowerCase() === target) e.swept = true;
        return e;
      });
      // Atomic-ish: delete + push reversed (lpush newest-first → reverse to preserve order).
      await kv.del(k);
      if (updated.length) await kv.lpush(k, ...[...updated].reverse());
      return;
    } catch (e) {
      console.warn("[bulletin] KV markSwept failed:", e instanceof Error ? e.message : e);
    }
  }
  const list = memBulletins.get(k) ?? [];
  for (const e of list) {
    if (e.stealthAddress.toLowerCase() === target) e.swept = true;
  }
}

/** Mark a bulletin entry as anchored on the ERC-5564 announcer. Stores the
 *  anchor tx hash so the wallet view can link out to a block explorer. */
export async function markAnchored(
  domain: string,
  name: string,
  stealthAddress: `0x${string}`,
  txHash: `0x${string}`,
): Promise<void> {
  const k = bulletinKey(domain, name);
  const target = stealthAddress.toLowerCase();
  if (KV_AVAILABLE) {
    try {
      const all = await kv.lrange(k, 0, BULLETIN_CAP - 1);
      const updated = all.map((r) => {
        const e = typeof r === "string" ? (JSON.parse(r) as BulletinEntry) : (r as BulletinEntry);
        if (e.stealthAddress.toLowerCase() === target) {
          e.anchored = true;
          e.anchorTxHash = txHash;
        }
        return e;
      });
      await kv.del(k);
      if (updated.length) await kv.lpush(k, ...[...updated].reverse());
      return;
    } catch (e) {
      console.warn("[bulletin] KV markAnchored failed:", e instanceof Error ? e.message : e);
    }
  }
  const list = memBulletins.get(k) ?? [];
  for (const e of list) {
    if (e.stealthAddress.toLowerCase() === target) {
      e.anchored = true;
      e.anchorTxHash = txHash;
    }
  }
}

export const BULLETIN_LIMITS = { cap: BULLETIN_CAP } as const;
