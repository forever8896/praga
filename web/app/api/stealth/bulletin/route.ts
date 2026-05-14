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
import { appendBulletin, listBulletin } from "@/lib/stealth-bulletin";
import { getSubname } from "@/lib/resolver-store";
import { verifySession } from "@/lib/privy-server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

function isHex(s: unknown, len?: number): s is `0x${string}` {
  if (typeof s !== "string" || !s.startsWith("0x")) return false;
  if (len !== undefined && s.length !== len) return false;
  return /^0x[0-9a-fA-F]*$/.test(s);
}

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

// POST /api/stealth/bulletin
//
// Append a single bulletin entry: { label, stealthAddress, ephemeralPubKey,
// viewTag }. Used by escrow-panel after the worker derives a fresh stealth
// recipient on accept — the entry must land in the worker's bulletin so the
// wallet's StealthInbox finds the funds when the task releases.
//
// Same auth gate as GET: only the label owner can write to their own
// bulletin (a foreign writer can't poison the inbox with junk).
export async function POST(req: Request) {
  const session = await verifySession(req);
  if (!session?.address) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: {
    label?: string;
    stealthAddress?: string;
    ephemeralPubKey?: string;
    viewTag?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  const { label, stealthAddress, ephemeralPubKey, viewTag } = body;
  if (!label || typeof label !== "string") {
    return NextResponse.json({ error: "label-required" }, { status: 400 });
  }
  if (!isHex(stealthAddress, 42) || !isHex(ephemeralPubKey) || !isHex(viewTag, 4)) {
    return NextResponse.json({ error: "bad-args" }, { status: 400 });
  }
  const rec = await getSubname(env.namestoneDomain, label);
  if (!rec) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (rec.address.toLowerCase() !== session.address.toLowerCase()) {
    return NextResponse.json({ error: "not-owner" }, { status: 403 });
  }
  await appendBulletin(rec.domain, rec.name, {
    stealthAddress,
    ephemeralPubKey,
    viewTag,
    ts: Date.now(),
    coinType: 60,
  });
  return NextResponse.json({ ok: true });
}
