// GET /api/my-name — return the caller's pragueconnect.eth subname (if any),
// its current text records, and (when present) the inviter's public context
// so the tip flow can route a 5% finder's mark via tipWithReferral.
import { NextResponse } from "next/server";
import { getSubname, listSubnames } from "@/lib/resolver";
import { verifySession } from "@/lib/privy-server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: Request) {
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

    // If the user was inscribed under an inviter, surface the inviter's public
    // stealth context so the tip form can use tipWithReferral. Best-effort —
    // the inviter may have been deleted; tip flows fall back to plain tip().
    let inviter: {
      label: string;
      ens: string;
      display: string;
      stealthMeta: string;
    } | null = null;
    const sealedBy = mine.text_records?.["sealed-by"];
    if (sealedBy) {
      const inviterLabel = sealedBy.split(".")[0]?.toLowerCase().trim();
      if (inviterLabel && /^[a-z0-9-]{1,32}$/.test(inviterLabel) && inviterLabel !== mine.name) {
        const inviterRecord = await getSubname(env.namestoneDomain, inviterLabel).catch(() => null);
        if (inviterRecord) {
          inviter = {
            label: inviterRecord.name,
            ens: `${inviterRecord.name}.${inviterRecord.domain}`,
            display: inviterRecord.text_records?.name ?? inviterRecord.name,
            stealthMeta: inviterRecord.text_records?.["stealth-meta-address"] ?? "",
          };
        }
      }
    }

    return NextResponse.json({
      ok: true,
      claimed: true,
      label: mine.name,
      ens: `${mine.name}.${mine.domain}`,
      address: mine.address,
      text_records: mine.text_records ?? {},
      inviter,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "resolver-failed" },
      { status: 502 },
    );
  }
}
