// POST /api/lookup-ens — reverse-resolve a batch of EVM addresses to their
// pragueconnect.eth subnames. Used by the letterbox so a DM peer's address
// can be rendered as their seal name + display name instead of raw hex.
//
// Body: { addresses: ["0x..."] }  (lowercased server-side, deduplicated)
// Returns: { records: { "<addrLower>": { label, ens, display, location } } }
import { NextResponse } from "next/server";
import { listSubnames } from "@/lib/resolver";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  const raw = (body as { addresses?: unknown })?.addresses;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "addresses-required" }, { status: 400 });
  }
  const wanted = new Set(
    raw
      .filter((a): a is string => typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a))
      .map((a) => a.toLowerCase()),
  );
  if (wanted.size === 0) {
    return NextResponse.json({ records: {} });
  }
  try {
    const all = await listSubnames(env.namestoneDomain, 200);
    const records: Record<
      string,
      { label: string; ens: string; display: string; location: string }
    > = {};
    for (const r of all) {
      const addr = r.address.toLowerCase();
      if (!wanted.has(addr)) continue;
      records[addr] = {
        label: r.name,
        ens: `${r.name}.${r.domain}`,
        display: r.text_records?.name ?? r.name.charAt(0).toUpperCase() + r.name.slice(1),
        location: r.text_records?.location ?? "",
      };
    }
    return NextResponse.json({ records });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "resolver-failed" },
      { status: 502 },
    );
  }
}
