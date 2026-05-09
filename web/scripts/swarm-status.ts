// Inspect a local Bee node — health, peer count, postage batches.
//
// Usage: SWARM_BEE_URL=http://localhost:1633 bun web/scripts/swarm-status.ts
//
// Useful before running swarm-publish.ts to confirm the node is reachable
// and at least one postage batch is funded.
export {};

const beeUrl = (process.env.SWARM_BEE_URL ?? "http://localhost:1633").replace(/\/$/, "");

async function get<T>(path: string): Promise<T | { error: string }> {
  try {
    const res = await fetch(`${beeUrl}${path}`);
    if (!res.ok) return { error: `${res.status} ${res.statusText}` };
    return (await res.json()) as T;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "fetch-failed" };
  }
}

console.log(`bee at ${beeUrl}\n`);

const health = await get<{ status: string; version: string }>("/health");
console.log(`/health:`, health);

const topology = await get<{ connected: number; population: number }>("/topology");
console.log(`/topology:`, topology);

interface Stamp {
  batchID: string;
  utilization: number;
  usable: boolean;
  label?: string;
  depth: number;
  amount: string;
  bucketDepth: number;
  blockNumber: number;
  immutableFlag: boolean;
  exists: boolean;
  batchTTL: number;
}
const stamps = await get<{ stamps: Stamp[] }>("/stamps");
if ("error" in stamps) {
  console.log(`/stamps:`, stamps);
} else {
  console.log(`\n${stamps.stamps?.length ?? 0} postage batches:`);
  for (const s of stamps.stamps ?? []) {
    const ttlDays = s.batchTTL > 0 ? Math.floor(s.batchTTL / 86400) : 0;
    const ttlHours = s.batchTTL > 0 ? Math.floor((s.batchTTL % 86400) / 3600) : 0;
    console.log(
      `  ${s.batchID.slice(0, 16)}…  usable=${s.usable}  depth=${s.depth}  ttl=${ttlDays}d${ttlHours}h  utilization=${(s.utilization * 100).toFixed(1)}%${s.label ? `  "${s.label}"` : ""}`,
    );
  }
  const usable = stamps.stamps?.filter((s) => s.usable && s.batchTTL > 86400 * 7) ?? [];
  if (usable.length) {
    console.log(`\nrecommended SWARM_POSTAGE_BATCH_ID: ${usable[0].batchID}`);
  } else if ((stamps.stamps?.length ?? 0) === 0) {
    console.log(`\nno postage batches. Buy one in the Swarm Desktop UI before publishing.`);
  } else {
    console.log(`\nno usable batches with > 7d TTL. Top up an existing batch or buy a new one.`);
  }
}
