// PragueConnect resolver store — drop-in replacement for the NameStone client.
//
// Reads:  baseline JSON (web/data/subnames.json, bundled at build) ∪ Vercel KV
//         hash (production) ∪ in-memory overlay (dev / fallback).
//         If KV_REST_API_URL + KV_REST_API_TOKEN are set, KV is the source of
//         truth for live writes; otherwise we fall back to a module-scoped Map
//         which only survives the lambda's warm life.
// Writes: setSubname() merges into KV (if available) and the in-memory overlay
//         (always, so warm-lambda reads stay fast).
//
// KV schema:
//   key: `pc:subnames:<domain>`  (one Redis hash per parent domain)
//   field: lowercase subname label (e.g. "alice")
//   value: JSON-serialized SubnameRecord
//
// CROPS · Censorship-Resistant: every byte in the resolution path is in this
// repo. KV is just a key/value cache; the data schema and gateway code are ours.
import { namehash as viemNamehash } from "viem/ens";
import { kv } from "@vercel/kv";
import baseline from "../data/subnames.json";

export interface SubnameRecord {
  name: string;
  domain: string;
  address: `0x${string}`;
  text_records?: Record<string, string>;
  coin_types?: Record<string, string>;
  contenthash?: string | null;
}

export interface SetNameRequest {
  domain: string;
  name: string;
  address: `0x${string}`;
  text_records?: Record<string, string>;
  coin_types?: Record<string, string>;
  contenthash?: string;
}

export const PARENT_DOMAIN = "pragueconnect.eth";

const KV_AVAILABLE = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN,
);

const baseMap = new Map<string, SubnameRecord>();
for (const r of baseline as unknown as SubnameRecord[]) {
  baseMap.set(`${r.domain}:${r.name}`.toLowerCase(), r);
}

// In-memory overlay survives warm-lambda life; primary store in dev / fallback.
const memoryOverlay = new Map<string, SubnameRecord>();

function key(domain: string, name: string): string {
  return `${domain}:${name}`.toLowerCase();
}

function hashKey(domain: string): string {
  return `pc:subnames:${domain.toLowerCase()}`;
}

async function kvGet(domain: string, name: string): Promise<SubnameRecord | null> {
  if (!KV_AVAILABLE) return null;
  try {
    const rec = await kv.hget<SubnameRecord>(hashKey(domain), name.toLowerCase());
    return rec ?? null;
  } catch (e) {
    console.warn("[resolver-store] KV hget failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

async function kvAll(domain: string): Promise<SubnameRecord[]> {
  if (!KV_AVAILABLE) return [];
  try {
    const all = await kv.hgetall<Record<string, SubnameRecord>>(hashKey(domain));
    return all ? Object.values(all) : [];
  } catch (e) {
    console.warn("[resolver-store] KV hgetall failed:", e instanceof Error ? e.message : e);
    return [];
  }
}

async function kvSet(rec: SubnameRecord): Promise<void> {
  if (!KV_AVAILABLE) return;
  try {
    await kv.hset(hashKey(rec.domain), { [rec.name.toLowerCase()]: rec });
  } catch (e) {
    console.warn("[resolver-store] KV hset failed:", e instanceof Error ? e.message : e);
  }
}

export async function getSubname(domain: string, name: string): Promise<SubnameRecord | null> {
  const k = key(domain, name);
  // KV takes precedence over baseline so live edits override seed data.
  const kvRec = await kvGet(domain, name);
  if (kvRec) return kvRec;
  return memoryOverlay.get(k) ?? baseMap.get(k) ?? null;
}

export async function listSubnames(domain: string, limit = 200): Promise<SubnameRecord[]> {
  const out: SubnameRecord[] = [];
  const seen = new Set<string>();
  const want = domain.toLowerCase();

  for (const rec of await kvAll(domain)) {
    if (rec.domain.toLowerCase() !== want) continue;
    out.push(rec);
    seen.add(rec.name.toLowerCase());
  }
  for (const [, rec] of memoryOverlay) {
    if (rec.domain.toLowerCase() === want && !seen.has(rec.name.toLowerCase())) {
      out.push(rec);
      seen.add(rec.name.toLowerCase());
    }
  }
  for (const [, rec] of baseMap) {
    if (rec.domain.toLowerCase() === want && !seen.has(rec.name.toLowerCase())) {
      out.push(rec);
    }
  }
  return out.slice(0, limit);
}

export async function setSubname(req: SetNameRequest): Promise<{ success: true }> {
  const existing = await getSubname(req.domain, req.name);
  const merged: SubnameRecord = {
    name: req.name,
    domain: req.domain,
    address: req.address,
    text_records: { ...(existing?.text_records ?? {}), ...(req.text_records ?? {}) },
    coin_types: { ...(existing?.coin_types ?? {}), ...(req.coin_types ?? {}) },
    contenthash: req.contenthash !== undefined ? req.contenthash : existing?.contenthash ?? null,
  };
  await kvSet(merged);
  memoryOverlay.set(key(req.domain, req.name), merged);
  return { success: true };
}

export async function setTextRecord(
  domain: string,
  name: string,
  k: string,
  value: string,
): Promise<{ success: true }> {
  const existing = await getSubname(domain, name);
  if (!existing) {
    throw new Error(`subname ${name}.${domain} does not exist`);
  }
  return setSubname({
    domain,
    name,
    address: existing.address,
    text_records: { [k]: value },
  });
}

export const namehash = viemNamehash;

/** Find a subname record by namehash. Used by the gateway when ENS clients
 *  pass us a `bytes32 node` rather than a label. We compare against the
 *  precomputed namehash of every record across all sources. */
export async function findByNamehash(node: `0x${string}`): Promise<SubnameRecord | null> {
  const target = node.toLowerCase();
  for (const rec of await allRecords()) {
    if (viemNamehash(`${rec.name}.${rec.domain}`).toLowerCase() === target) return rec;
  }
  return null;
}

async function allRecords(): Promise<SubnameRecord[]> {
  const out: SubnameRecord[] = [];
  const seen = new Set<string>();

  // Currently single-parent. To support multi-city forks, iterate the set of
  // known parents — see README "Forking PragueConnect for another city".
  for (const rec of await kvAll(PARENT_DOMAIN)) {
    const k = `${rec.domain}:${rec.name}`.toLowerCase();
    out.push(rec);
    seen.add(k);
  }
  for (const [, rec] of memoryOverlay) {
    const k = `${rec.domain}:${rec.name}`.toLowerCase();
    if (!seen.has(k)) {
      out.push(rec);
      seen.add(k);
    }
  }
  for (const [, rec] of baseMap) {
    const k = `${rec.domain}:${rec.name}`.toLowerCase();
    if (!seen.has(k)) out.push(rec);
  }
  return out;
}

export const __test = { KV_AVAILABLE };
