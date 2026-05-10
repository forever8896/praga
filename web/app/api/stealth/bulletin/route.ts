// GET /api/stealth/bulletin?label=<label>
//
// Returns the full per-name bulletin: every fresh stealth address the gateway
// minted, along with the ephemeral pubkey + viewTag the recipient needs to
// derive the spending privkey and sweep funds.
//
// HARD AUTH GATE: only the human bound to <label>.<parent> can read this.
// If anyone else could, the rotation property collapses — they'd see every
// stealth landing tied to the meta-address. Enforcement: the requester's
// Privy session must own a wallet whose address matches the resolver
// record's `address` field for that label.
import { NextResponse } from "next/server";
import { listBulletin } from "@/lib/stealth-bulletin";
import { getSubname } from "@/lib/resolver-store";
import { verifySession } from "@/lib/privy-server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const label = url.searchParams.get("label") ?? "";
  if (!label) {
    return NextResponse.json({ error: "label-required" }, { status: 400 });
  }
  const session = await verifySession(req);
  if (!session?.address) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rec = await getSubname(env.namestoneDomain, label);
  if (!rec) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (rec.address.toLowerCase() !== session.address.toLowerCase()) {
    return NextResponse.json({ error: "not-owner" }, { status: 403 });
  }
  const entries = await listBulletin(rec.domain, rec.name);
  return NextResponse.json({
    domain: rec.domain,
    name: rec.name,
    rotating: rec.text_records?.["stealth-rotate-addr"] === "true",
    entries,
  });
}
