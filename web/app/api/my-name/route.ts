// GET /api/my-name — return the caller's praga.eth subname (if any) and its
// current text records, so the edit form can pre-populate.
import { NextResponse } from "next/server";
import { listSubnames } from "@/lib/namestone";
import { verifySession } from "@/lib/privy-server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!process.env.NAMESTONE_API_KEY) {
    return NextResponse.json({ error: "namestone-not-configured" }, { status: 500 });
  }

  const session = await verifySession(req);
  if (!session?.address) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const all = await listSubnames(env.namestoneDomain, 200);
    const mine = all.find(
      (r) => r.address.toLowerCase() === session.address!.toLowerCase(),
    );
    if (!mine) {
      return NextResponse.json({ ok: true, claimed: false });
    }
    return NextResponse.json({
      ok: true,
      claimed: true,
      label: mine.name,
      ens: `${mine.name}.${mine.domain}`,
      address: mine.address,
      text_records: mine.text_records ?? {},
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "namestone-failed" },
      { status: 502 },
    );
  }
}
