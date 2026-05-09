// Drop-in replacement for the NameStone client. Same surface, same types — but
// reads/writes go to PragueConnect's own resolver store (lib/resolver-store.ts)
// instead of NameStone's hosted SaaS. The on-chain resolver is
// PragueConnectResolver.sol, the gateway is /api/ccip, and the data lives in
// web/data/subnames.json + an in-memory overlay.
//
// We keep the legacy NameStoneRecord export name so existing app imports keep
// working through a one-line change ("from ./namestone" → "from ./resolver").
import {
  getSubname as storeGet,
  listSubnames as storeList,
  setSubname as storeSet,
  setTextRecord as storeSetText,
  type SubnameRecord,
} from "./resolver-store";

export type NameStoneRecord = SubnameRecord;

export interface NameStoneSetNameRequest {
  domain: string;
  name: string;
  address: `0x${string}`;
  text_records?: Record<string, string>;
  coin_types?: Record<string, string>;
  contenthash?: string;
}

export async function getSubname(domain: string, name: string): Promise<NameStoneRecord | null> {
  return storeGet(domain, name);
}

export async function listSubnames(domain: string, limit = 50): Promise<NameStoneRecord[]> {
  return storeList(domain, limit);
}

export async function setSubname(
  req: NameStoneSetNameRequest,
  _apiKey?: string,
): Promise<{ success: boolean }> {
  await storeSet(req);
  return { success: true };
}

export async function setTextRecord(
  domain: string,
  name: string,
  key: string,
  value: string,
  _apiKey?: string,
): Promise<{ success: boolean }> {
  await storeSetText(domain, name, key, value);
  return { success: true };
}
