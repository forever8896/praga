// POST /api/update-profile — update text records on the caller's pragueconnect.eth subname.
// Authenticated via Privy access token. Caller can only edit a subname whose
// `address` field on NameStone matches their verified wallet.
import { NextResponse } from "next/server";
import { getSubname, setSubname } from "@/lib/resolver";
import { verifySession } from "@/lib/privy-server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

interface Body {
  label?: string;
  fields?: Record<string, string>;
}

const ALLOWED_FIELDS = new Set([
  "name",
  "description",
  "avatar",
  "location",
  "url",
  "skills",
  "offers",
  "stealth-meta-address",
  // ENSIP-25 agent delegation: a JSON attestation describing an authorised
  // agent (the "familiar") and what scopes it may act on the human's behalf.
  "agent-registration",
]);

export async function POST(req: Request) {
  const session = await verifySession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.address) {
    return NextResponse.json({ error: "no-wallet" }, { status: 400 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const label = (body.label ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!label || label.length > 20) {
    return NextResponse.json({ error: "invalid-label" }, { status: 400 });
  }

  const record = await getSubname(env.namestoneDomain, label);
  if (!record) {
    return NextResponse.json({ error: "name-not-found" }, { status: 404 });
  }
  if (record.address.toLowerCase() !== session.address.toLowerCase()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const incoming = body.fields ?? {};
  const merged: Record<string, string> = { ...(record.text_records ?? {}) };
  for (const [k, v] of Object.entries(incoming)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    if (typeof v !== "string") continue;
    if (v.length > 4000) continue; // NameStone cap is generous; we cap at 4kB
    merged[k] = v;
  }

  try {
    await setSubname({
      domain: env.namestoneDomain,
      name: label,
      address: record.address,
      text_records: merged,
    });
    return NextResponse.json({ ok: true, ens: `${label}.${env.namestoneDomain}` });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "resolver-failed" },
      { status: 502 },
    );
  }
}
