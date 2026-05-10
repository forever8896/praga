// GET /api/stealth/peek?label=<label>  →  { address, rotating, ts }
//
// Demo-friendly read of the *current* address the CCIP gateway would return
// for `<label>.<parent>`. Throttled to one fresh derivation per
// PEEK_INTERVAL_MS so a profile-page widget polling every few seconds
// doesn't fill the bulletin with disposable entries — instead, repeated
// hits inside the window read the most recent bulletin entry, and only
// roll over when the window expires. Mirrors the TTL_SECONDS rotation
// cadence of the gateway from the outside.
//
// Public read. Returns only the latest stealth address (which will become
// a public on-chain artifact the moment funds land at it anyway). The full
// bulletin — including ephemeral pubkeys needed to sweep — is auth-gated
// in /api/stealth/bulletin (Phase 3b).
import { NextResponse } from "next/server";
import { getSubname } from "@/lib/resolver-store";
import { paymentAddress } from "@/lib/stealth";
import { appendBulletin, listBulletin } from "@/lib/stealth-bulletin";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const PEEK_INTERVAL_MS = 5000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const label = url.searchParams.get("label") ?? "";
  if (!label) {
    return NextResponse.json({ error: "label-required" }, { status: 400 });
  }
  const rec = await getSubname(env.namestoneDomain, label);
  if (!rec) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  const rotate = rec.text_records?.["stealth-rotate-addr"] === "true";
  const meta = rec.text_records?.["stealth-meta-address"] ?? "";
  if (!rotate || !meta.startsWith("st:eth:")) {
    return NextResponse.json({ address: rec.address, rotating: false });
  }

  const recent = await listBulletin(rec.domain, rec.name, 1);
  if (recent[0] && recent[0].ts > Date.now() - PEEK_INTERVAL_MS) {
    return NextResponse.json({
      address: recent[0].stealthAddress,
      rotating: true,
      ts: recent[0].ts,
    });
  }

  try {
    const out = paymentAddress(meta);
    const ts = Date.now();
    await appendBulletin(rec.domain, rec.name, {
      stealthAddress: out.stealthAddress,
      ephemeralPubKey: out.ephemeralPublicKey,
      viewTag: out.viewTag,
      ts,
      coinType: 60,
    });
    return NextResponse.json({ address: out.stealthAddress, rotating: true, ts });
  } catch (e) {
    return NextResponse.json({
      address: rec.address,
      rotating: false,
      error: e instanceof Error ? e.message : "derivation-failed",
    });
  }
}
