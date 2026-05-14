// POST /api/groups/[label]/resolve-request — owner-only. Either approve
// or decline a pending join request. Approval just clears the bulletin
// entry and bumps member_count; the actual XMTP addMember call is done
// by the owner's browser BEFORE this is hit, because adding a member to
// an MLS group requires the owner's signature.
//
// Body: { address, decision: "approve" | "decline" }
//
// Idempotent — resolving a non-existent request returns ok with no change.
import { NextResponse } from "next/server";
import { getSubname, setSubname } from "@/lib/resolver";
import { verifySession } from "@/lib/privy-server";
import { env } from "@/lib/env";
import { isGroupRecord, type PendingRequest } from "@/lib/group";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ label: string }> },
) {
  const { label: rawLabel } = await ctx.params;
  const label = (rawLabel ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!label) return NextResponse.json({ error: "invalid-label" }, { status: 400 });

  const session = await verifySession(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!session.address) return NextResponse.json({ error: "no-wallet" }, { status: 400 });

  let body: { address?: string; decision?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const targetAddress = (body.address ?? "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(targetAddress)) {
    return NextResponse.json({ error: "invalid-address" }, { status: 400 });
  }
  const decision = body.decision === "decline" ? "decline" : "approve";

  const record = await getSubname(env.namestoneDomain, label);
  if (!record || !isGroupRecord(record.text_records)) {
    return NextResponse.json({ error: "not-a-group" }, { status: 404 });
  }
  if (record.address.toLowerCase() !== session.address.toLowerCase()) {
    return NextResponse.json({ error: "not-the-owner" }, { status: 403 });
  }

  const tr = { ...(record.text_records ?? {}) };
  const pending: PendingRequest[] = (() => {
    try {
      const arr = JSON.parse(tr["pc.group.pending"] ?? "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  })();

  const remaining = pending.filter(
    (p) => p.address?.toLowerCase() !== targetAddress,
  );
  tr["pc.group.pending"] = JSON.stringify(remaining);

  if (decision === "approve") {
    const next = (parseInt(tr["pc.group.member_count"] ?? "1", 10) || 1) + 1;
    tr["pc.group.member_count"] = String(next);
  }

  try {
    await setSubname({
      domain: env.namestoneDomain,
      name: label,
      address: record.address,
      text_records: tr,
    });
    return NextResponse.json({
      ok: true,
      decision,
      pendingCount: remaining.length,
      memberCount: parseInt(tr["pc.group.member_count"] ?? "1", 10) || 1,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "resolver-failed" },
      { status: 502 },
    );
  }
}
