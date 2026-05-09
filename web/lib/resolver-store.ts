// PragueConnect resolver store — drop-in replacement for the NameStone client.
//
// Reads:  baseline JSON (web/data/subnames.json, bundled at build) ∪ in-memory
//         overlay (writes during the lambda's warm life). The overlay is
//         ephemeral; profile edits during a demo session survive on the same
//         instance and reset on cold start. For production, swap the overlay
//         for Vercel KV or Postgres.
// Writes: setSubname() merges into the overlay map. Reads always merge.
//
// The point: every byte in this file is ours. NameStone's hosted gateway is
// no longer in the resolution path. CROPS · Censorship-Resistant, made literal.
import { namehash as viemNamehash } from "viem/ens";
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

const baseMap = new Map<string, SubnameRecord>();
for (const r of baseline as unknown as SubnameRecord[]) {
  baseMap.set(`${r.domain}:${r.name}`.toLowerCase(), r);
}

// Module-scoped overlay survives across requests on the same warm lambda.
const overlay = new Map<string, SubnameRecord>();

function key(domain: string, name: string): string {
  return `${domain}:${name}`.toLowerCase();
}

export function getSubname(domain: string, name: string): SubnameRecord | null {
  const k = key(domain, name);
  return overlay.get(k) ?? baseMap.get(k) ?? null;
}

export function listSubnames(domain: string, limit = 200): SubnameRecord[] {
  const out: SubnameRecord[] = [];
  const seen = new Set<string>();
  const want = domain.toLowerCase();
  for (const [, rec] of overlay) {
    if (rec.domain.toLowerCase() === want) {
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

export function setSubname(req: SetNameRequest): { success: true } {
  const existing = getSubname(req.domain, req.name);
  const merged: SubnameRecord = {
    name: req.name,
    domain: req.domain,
    address: req.address,
    text_records: { ...(existing?.text_records ?? {}), ...(req.text_records ?? {}) },
    coin_types: { ...(existing?.coin_types ?? {}), ...(req.coin_types ?? {}) },
    contenthash: req.contenthash !== undefined ? req.contenthash : existing?.contenthash ?? null,
  };
  overlay.set(key(req.domain, req.name), merged);
  return { success: true };
}

export function setTextRecord(domain: string, name: string, k: string, value: string): { success: true } {
  const existing = getSubname(domain, name);
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
 *  precomputed namehash of every record in our store. */
export function findByNamehash(node: `0x${string}`): SubnameRecord | null {
  const target = node.toLowerCase();
  for (const rec of allRecords()) {
    if (viemNamehash(`${rec.name}.${rec.domain}`).toLowerCase() === target) return rec;
  }
  return null;
}

function allRecords(): SubnameRecord[] {
  const out: SubnameRecord[] = [];
  const seen = new Set<string>();
  for (const [, rec] of overlay) {
    out.push(rec);
    seen.add(`${rec.domain}:${rec.name}`.toLowerCase());
  }
  for (const [, rec] of baseMap) {
    if (!seen.has(`${rec.domain}:${rec.name}`.toLowerCase())) out.push(rec);
  }
  return out;
}

export const PARENT_DOMAIN = "pragueconnect.eth";
