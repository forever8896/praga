// GET /api/check-name?name=<label> — is this `<label>.pragueconnect.eth` already taken?
// Public endpoint, no auth required (NameStone read is public).
import { NextResponse } from "next/server";
import { getSubname } from "@/lib/resolver";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("name") ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");

  if (!raw || raw.length < 1 || raw.length > 20) {
    return NextResponse.json({ available: false, error: "invalid-name" }, { status: 400 });
  }

  const existing = await getSubname(env.namestoneDomain, raw);
  if (!existing) {
    return NextResponse.json({ available: true, name: `${raw}.pragueconnect.eth` });
  }
  return NextResponse.json({
    available: false,
    name: `${raw}.pragueconnect.eth`,
    address: existing.address,
    display: existing.text_records?.name ?? raw.charAt(0).toUpperCase() + raw.slice(1),
    record: { text_records: existing.text_records ?? {} },
  });
}
