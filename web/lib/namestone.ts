// NameStone client — issues `username.pragueconnect.eth` subnames via NameStone's hosted offchain resolver.
// Docs: https://namestone.com/docs · SDK: https://github.com/namestonehq/namestone-sdk
//
// Mainnet base:  https://namestone.com/api/public_v1
// Sepolia base:  https://namestone.com/api/public_v1_sepolia   ← what we use for the hackathon demo
//
// Subname text records used by PragueConnect:
//   name                   → display name
//   description            → bio (markdown)
//   avatar                 → portrait URL
//   url                    → personal site
//   location               → neighbourhood (e.g. "Žižkov, Praha")
//   skills                 → JSON array of {kind, name, price}
//   stealth-meta-address   → ERC-5564 stealth meta-address (st:eth:0x…)
//   agent-registration     → ENSIP-25 agent attestation (cf. ERC-8004)
//   contenthash            → IPNS pointer for personal site at *.pragueconnect.eth.limo
import { env } from "./env";

const MAINNET_BASE = "https://namestone.com/api/public_v1";
const SEPOLIA_BASE = "https://namestone.com/api/public_v1_sepolia";

/** Pick the right NameStone base URL for the current chain. */
export function namestoneBase(): string {
  // Chain IDs that imply we should use NameStone's mainnet path.
  // Anything else (Sepolia, Base Sepolia for the demo) goes to the Sepolia path,
  // because that's where pragueconnect.eth is registered.
  return env.defaultChainId === 1 ? MAINNET_BASE : SEPOLIA_BASE;
}

export interface NameStoneSetNameRequest {
  domain: string; // e.g. "pragueconnect.eth"
  name: string; // label, e.g. "kilian"
  address: `0x${string}`;
  text_records?: Record<string, string>;
  coin_types?: Record<string, string>;
  contenthash?: string;
}

export interface NameStoneRecord {
  name: string;
  domain: string;
  address: `0x${string}`;
  text_records?: Record<string, string>;
  coin_types?: Record<string, string>;
  contenthash?: string | null;
}

async function ns<T>(method: "GET" | "POST", path: string, body?: unknown, apiKey?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = apiKey;
  const res = await fetch(`${namestoneBase()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`NameStone ${method} ${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/** Issue or update a `<label>.pragueconnect.eth` subname. Server-only — needs API key. */
export async function setSubname(req: NameStoneSetNameRequest, apiKey: string): Promise<{ success: boolean }> {
  return ns("POST", "/set-name", req, apiKey);
}

/** Look up a single subname's records.
 *  On NameStone Sepolia (the hackathon path), `search-names` is gated and
 *  `get-names` ignores its `name=` filter, so we fetch the parent's subnames
 *  with auth and match client-side. The list is small (tens of names). */
export async function getSubname(domain: string, name: string): Promise<NameStoneRecord | null> {
  const apiKey = process.env.NAMESTONE_API_KEY;
  if (!apiKey) return null;
  try {
    const records = await ns<NameStoneRecord[]>(
      "GET",
      `/get-names?domain=${domain}&limit=200`,
      undefined,
      apiKey,
    );
    return records.find((r) => r.name === name) ?? null;
  } catch {
    return null;
  }
}

/** List all subnames issued under a parent. Useful for /feed populated from real data. */
export async function listSubnames(domain: string, limit = 50): Promise<NameStoneRecord[]> {
  const apiKey = process.env.NAMESTONE_API_KEY;
  return ns<NameStoneRecord[]>("GET", `/get-names?domain=${domain}&limit=${limit}`, undefined, apiKey);
}

/** Set a single text record on an existing subname. */
export async function setTextRecord(
  domain: string,
  name: string,
  key: string,
  value: string,
  apiKey: string,
): Promise<{ success: boolean }> {
  return ns("POST", "/set-name", { domain, name, text_records: { [key]: value } }, apiKey);
}
