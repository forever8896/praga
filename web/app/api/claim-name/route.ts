// POST /api/claim-name — issues a `<name>.praga.eth` subname via NameStone.
// Server-only because the NameStone API key must not leak to the browser.
import { NextResponse } from "next/server";
import { getSubname, setSubname } from "@/lib/namestone";
import { env } from "@/lib/env";

export const runtime = "nodejs";

interface Body {
  name?: string;
  address?: string;
}

export async function POST(req: Request) {
  if (!process.env.NAMESTONE_API_KEY) {
    return NextResponse.json({ error: "namestone-not-configured" }, { status: 500 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const name = (body.name ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const address = body.address;

  if (!name || name.length < 1 || name.length > 20) {
    return NextResponse.json({ error: "invalid-name" }, { status: 400 });
  }
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid-address" }, { status: 400 });
  }

  // Treat NameStone's existence-check as the uniqueness check.
  const existing = await getSubname(env.namestoneDomain, name);
  if (existing) {
    // If this address already owns the name, that's fine (idempotent re-claim).
    if (existing.address.toLowerCase() === address.toLowerCase()) {
      return NextResponse.json({ ok: true, idempotent: true });
    }
    return NextResponse.json({ error: "name-taken" }, { status: 409 });
  }

  try {
    await setSubname(
      {
        domain: env.namestoneDomain,
        name,
        address: address as `0x${string}`,
        text_records: {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          location: "Praha",
          url: `https://praga-azure.vercel.app/${name}.praga.eth`,
        },
      },
      process.env.NAMESTONE_API_KEY,
    );
    return NextResponse.json({ ok: true, ens: `${name}.praga.eth` });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "namestone-failed" },
      { status: 502 },
    );
  }
}
