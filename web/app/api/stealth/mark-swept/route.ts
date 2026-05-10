// POST /api/stealth/mark-swept?label=<label>
//
// Persist the `swept: true` flag on bulletin entries the caller has just
// drained. Without this the wallet view re-runs the same sweep candidates
// every session — UI relies on a coarse "balance == 0" heuristic, which
// breaks the moment a new tip lands at the same stealth address before
// the next scan (it would re-show as sweepable, inviting a double-sweep).
//
// Auth: Privy session must own the resolver record for <label>.<parent>.
// Same gate as /api/stealth/bulletin — without it any caller could mark
// arbitrary names' entries as swept and force the rightful owner to lose
// their sweep targets in the UI.
//
// Body: { stealthAddresses: `0x${string}`[] } — at most 200 entries per call.
// Response: { ok, marked: number }
import { NextResponse } from "next/server";
import { markSwept } from "@/lib/stealth-bulletin";
import { getSubname } from "@/lib/resolver-store";
import { verifySession } from "@/lib/privy-server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const BATCH_CAP = 200;

export async function POST(req: Request) {
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

  let body: { stealthAddresses?: unknown };
  try {
    body = (await req.json()) as { stealthAddresses?: unknown };
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const raw = Array.isArray(body.stealthAddresses) ? body.stealthAddresses : [];
  const targets: `0x${string}`[] = [];
  for (const a of raw) {
    if (typeof a !== "string") continue;
    if (!/^0x[a-fA-F0-9]{40}$/.test(a)) continue;
    targets.push(a as `0x${string}`);
    if (targets.length >= BATCH_CAP) break;
  }
  if (targets.length === 0) {
    return NextResponse.json({ ok: true, marked: 0 });
  }

  for (const a of targets) {
    await markSwept(rec.domain, rec.name, a);
  }
  return NextResponse.json({ ok: true, marked: targets.length });
}
