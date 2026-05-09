// Invite-code system. Hard gate on claims: no code, no name. Each user who
// claims gets N codes minted into KV that they can share — sharing creates the
// `sealed-by` chain that drives the 5% finder's-mark on tipWithReferral.
//
// KV schema:
//   pc:invite:<code>   → { owner: ens|null, used: bool, usedBy: ens|null,
//                           createdAt: ms, role: "bootstrap"|"user" }
//   pc:invites:<ens>   → string[]  (codes minted for this user)
//
// Codes are 8-char base32 (no I/O/0/1) for readability — ~10^12 keyspace.
// Bootstrap codes are seeded by /api/admin/seed-invites with a shared secret.
import { kv } from "@vercel/kv";

export interface InviteRecord {
  code: string;
  owner: string | null;          // ENS of the user who minted this code (null for bootstrap)
  used: boolean;
  usedBy: string | null;          // ENS of the claimer
  createdAt: number;
  role: "bootstrap" | "user";
}

const KV_AVAILABLE = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN,
);

// In-memory fallback for dev. Resets on lambda recycle — fine for local.
const memInvites = new Map<string, InviteRecord>();
const memMintedFor = new Map<string, string[]>();

export const CODES_PER_USER = 3;
export const CODE_LENGTH = 8;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(): string {
  const a = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

function inviteKey(code: string): string {
  return `pc:invite:${code.toUpperCase()}`;
}

function mintedKey(ens: string): string {
  return `pc:invites:${ens.toLowerCase()}`;
}

export async function getInvite(code: string): Promise<InviteRecord | null> {
  const k = inviteKey(code);
  if (KV_AVAILABLE) {
    try {
      const r = await kv.get<InviteRecord>(k);
      if (r) return r;
    } catch (e) {
      console.warn("[invite-codes] KV get failed:", e instanceof Error ? e.message : e);
    }
  }
  return memInvites.get(k) ?? null;
}

async function putInvite(rec: InviteRecord): Promise<void> {
  const k = inviteKey(rec.code);
  if (KV_AVAILABLE) {
    try {
      await kv.set(k, rec);
    } catch (e) {
      console.warn("[invite-codes] KV put failed:", e instanceof Error ? e.message : e);
    }
  }
  memInvites.set(k, rec);
}

/** Validate a code is unused and well-formed. Returns the record if valid. */
export async function validateInvite(code: string): Promise<InviteRecord | null> {
  if (!code || !/^[A-Z2-9]{8}$/.test(code.toUpperCase())) return null;
  const rec = await getInvite(code);
  if (!rec || rec.used) return null;
  return rec;
}

/** Mark a code as used. Idempotent: if already used by the same ENS, no-op. */
export async function consumeInvite(code: string, byEns: string): Promise<{ ok: true; inviter: string | null } | { ok: false; error: string }> {
  const rec = await getInvite(code);
  if (!rec) return { ok: false, error: "invite-not-found" };
  if (rec.used) {
    if (rec.usedBy?.toLowerCase() === byEns.toLowerCase()) return { ok: true, inviter: rec.owner };
    return { ok: false, error: "invite-already-used" };
  }
  const updated: InviteRecord = { ...rec, used: true, usedBy: byEns.toLowerCase() };
  await putInvite(updated);
  return { ok: true, inviter: rec.owner };
}

/** Mint N invite codes for a user. Stores both the codes and the back-pointer. */
export async function mintCodesForUser(ens: string, count = CODES_PER_USER): Promise<string[]> {
  const owner = ens.toLowerCase();
  const existing = await getMintedCodes(owner);
  if (existing.length >= count) return existing;

  const need = count - existing.length;
  const fresh: string[] = [];
  for (let i = 0; i < need; i++) {
    let code = generateCode();
    // Re-roll on collision (vanishingly rare).
    while (await getInvite(code)) code = generateCode();
    const rec: InviteRecord = {
      code,
      owner,
      used: false,
      usedBy: null,
      createdAt: Date.now(),
      role: "user",
    };
    await putInvite(rec);
    fresh.push(code);
  }
  const merged = [...existing, ...fresh];
  await setMintedCodes(owner, merged);
  return merged;
}

async function getMintedCodes(ens: string): Promise<string[]> {
  const k = mintedKey(ens);
  if (KV_AVAILABLE) {
    try {
      const r = await kv.get<string[]>(k);
      if (r) return r;
    } catch (e) {
      console.warn("[invite-codes] KV minted-get failed:", e instanceof Error ? e.message : e);
    }
  }
  return memMintedFor.get(k) ?? [];
}

async function setMintedCodes(ens: string, codes: string[]): Promise<void> {
  const k = mintedKey(ens);
  if (KV_AVAILABLE) {
    try {
      await kv.set(k, codes);
    } catch (e) {
      console.warn("[invite-codes] KV minted-set failed:", e instanceof Error ? e.message : e);
    }
  }
  memMintedFor.set(k, codes);
}

/** List a user's codes with their current state. */
export async function listInvitesForUser(ens: string): Promise<InviteRecord[]> {
  const codes = await getMintedCodes(ens.toLowerCase());
  const out: InviteRecord[] = [];
  for (const code of codes) {
    const rec = await getInvite(code);
    if (rec) out.push(rec);
  }
  return out;
}

/** Seed bootstrap codes (called from a privileged admin route). */
export async function seedBootstrapCodes(count: number): Promise<string[]> {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let code = generateCode();
    while (await getInvite(code)) code = generateCode();
    const rec: InviteRecord = {
      code,
      owner: null,
      used: false,
      usedBy: null,
      createdAt: Date.now(),
      role: "bootstrap",
    };
    await putInvite(rec);
    codes.push(code);
  }
  return codes;
}

// Default OFF: deploy ships without breaking existing flow. Operator flips
// on in Vercel env (`INVITE_REQUIRED=true`) after seeding bootstrap codes.
export const INVITE_REQUIRED = process.env.INVITE_REQUIRED === "true";
