// POST /api/claim-name — issues a `<name>.pragueconnect.eth` subname through
// PragueConnect's own resolver store (no third-party SaaS in the path).
import { NextResponse } from "next/server";
import { getSubname, setSubname } from "@/lib/resolver";
import { env } from "@/lib/env";

export const runtime = "nodejs";

interface Body {
  name?: string;
  address?: string;
  invitedBy?: string | null;
}

export async function POST(req: Request) {
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

  // Inviter is best-effort: validate shape, confirm the inviter actually has a
  // subname under our parent, and only then record it as a sealed-by trail.
  // A bad/missing inviter must NOT block the claim.
  let sealedBy: string | null = null;
  if (body.invitedBy && typeof body.invitedBy === "string") {
    const inviter = body.invitedBy.toLowerCase().trim();
    if (/^[a-z0-9-]{1,32}$/.test(inviter) && inviter !== name) {
      const inviterRecord = await getSubname(env.namestoneDomain, inviter).catch(() => null);
      if (inviterRecord) {
        sealedBy = `${inviter}.${env.namestoneDomain}`;
      }
    }
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
    const text_records: Record<string, string> = {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      location: "Praha",
      url: `https://pragueconnect-azure.vercel.app/${name}.pragueconnect.eth`,
    };
    if (sealedBy) text_records["sealed-by"] = sealedBy;
    await setSubname({
      domain: env.namestoneDomain,
      name,
      address: address as `0x${string}`,
      text_records,
    });
    return NextResponse.json({ ok: true, ens: `${name}.pragueconnect.eth`, sealedBy });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "resolver-failed" },
      { status: 502 },
    );
  }
}
