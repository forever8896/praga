// POST /api/groups/[label]/request-join — push a join request onto a
// group room's pending list. The group's owner sees the list on /g/[label]
// and approves with a single XMTP addMembers call from the browser.
//
// We don't write to XMTP here because that needs the owner's signature.
// This is just the bulletin layer: durable "X knocked on the door".
//
// Idempotent — re-requesting just updates the note + timestamp.
import { NextResponse } from "next/server";
import { getSubname, setSubname, listSubnames } from "@/lib/resolver";
import { verifySession } from "@/lib/privy-server";
import { env } from "@/lib/env";
import { isGroupRecord, type PendingRequest } from "@/lib/group";

export const runtime = "nodejs";

const MAX_PENDING = 50;
const MAX_NOTE = 200;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ label: string }> },
) {
  const { label: rawLabel } = await ctx.params;
  const label = (rawLabel ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!label) return NextResponse.json({ error: "invalid-label" }, { status: 400 });

  const session = await verifySession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.address) {
    return NextResponse.json({ error: "no-wallet" }, { status: 400 });
  }

  let body: { note?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const note = (body.note ?? "").toString().trim().slice(0, MAX_NOTE);

  const record = await getSubname(env.namestoneDomain, label);
  if (!record || !isGroupRecord(record.text_records)) {
    return NextResponse.json({ error: "not-a-group" }, { status: 404 });
  }

  // The owner doesn't need to "request to join" — they're already in.
  if (record.address.toLowerCase() === session.address.toLowerCase()) {
    return NextResponse.json({ error: "you-own-this-group" }, { status: 400 });
  }

  // Reverse-resolve the requester's ENS so the owner sees a friendly name
  // in the pending list, not 0x… hex.
  const all = await listSubnames(env.namestoneDomain, 200).catch(() => []);
  const mine = all.find(
    (r) => r.address.toLowerCase() === session.address!.toLowerCase(),
  );
  const requesterEns = mine ? `${mine.name}.${mine.domain}` : "";

  const tr = { ...(record.text_records ?? {}) };
  const pending: PendingRequest[] = (() => {
    try {
      const arr = JSON.parse(tr["pc.group.pending"] ?? "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  })();

  // Replace any existing entry for this address (re-request resets timestamp + note).
  const filtered = pending.filter(
    (p) => p.address?.toLowerCase() !== session.address!.toLowerCase(),
  );
  if (filtered.length >= MAX_PENDING) {
    return NextResponse.json({ error: "pending-full" }, { status: 429 });
  }
  filtered.push({
    ens: requesterEns,
    address: session.address as `0x${string}`,
    note,
    requestedAt: Math.floor(Date.now() / 1000),
  });

  tr["pc.group.pending"] = JSON.stringify(filtered);

  try {
    await setSubname({
      domain: env.namestoneDomain,
      name: label,
      address: record.address,
      text_records: tr,
    });
    return NextResponse.json({ ok: true, pendingCount: filtered.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "resolver-failed" },
      { status: 502 },
    );
  }
}
