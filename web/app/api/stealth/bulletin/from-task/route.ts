// POST /api/stealth/bulletin/from-task
//
// Backfill helper: given a `taskId` for an already-accepted escrow task,
// reads the on-chain Task struct (`stealthRecipient`, `ephemeralPubKey`,
// `viewTag`) and appends it to the caller's bulletin. Used to import jobs
// that were accepted before the live escrow→bulletin glue existed, so
// historical funds become visible in the wallet's StealthInbox scan.
//
// Auth: the caller's Privy session must own `<label>.<parent>` — same gate
// as the rest of /api/stealth/*. Without it, anyone could pollute another
// user's bulletin with arbitrary on-chain stealth recipients.
import { NextResponse } from "next/server";
import { appendBulletin } from "@/lib/stealth-bulletin";
import { getSubname } from "@/lib/resolver-store";
import { verifySession } from "@/lib/privy-server";
import { loadTask } from "@/lib/escrow";

// Phase enum literal values (matches contracts/src/PragueConnectEscrowV2.sol).
// `Phase` from lib/escrow is a type alias only.
const PHASE_NONE = 0;
const PHASE_NIGREDO = 1;
import { env } from "@/lib/env";

export const runtime = "nodejs";

function isHex(s: unknown, len?: number): s is `0x${string}` {
  if (typeof s !== "string" || !s.startsWith("0x")) return false;
  if (len !== undefined && s.length !== len) return false;
  return /^0x[0-9a-fA-F]*$/.test(s);
}

export async function POST(req: Request) {
  const session = await verifySession(req);
  if (!session?.address) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { label?: string; taskId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  const { label, taskId } = body;
  if (!label || typeof label !== "string") {
    return NextResponse.json({ error: "label-required" }, { status: 400 });
  }
  if (!isHex(taskId, 66)) {
    return NextResponse.json({ error: "bad-task-id" }, { status: 400 });
  }
  const rec = await getSubname(env.namestoneDomain, label);
  if (!rec) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (rec.address.toLowerCase() !== session.address.toLowerCase()) {
    return NextResponse.json({ error: "not-owner" }, { status: 403 });
  }

  const task = await loadTask(taskId);
  if (!task) {
    return NextResponse.json({ error: "task-not-found" }, { status: 404 });
  }
  // Pre-accept tasks have stealthRecipient = address(0) — nothing to record.
  if (task.phase === PHASE_NONE || task.phase === PHASE_NIGREDO) {
    return NextResponse.json({ error: "task-not-accepted-yet" }, { status: 409 });
  }
  if (task.stealthRecipient === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json({ error: "no-stealth-recipient" }, { status: 409 });
  }

  await appendBulletin(rec.domain, rec.name, {
    stealthAddress: task.stealthRecipient,
    ephemeralPubKey: task.ephemeralPubKey,
    viewTag: task.viewTag,
    ts: Date.now(),
    coinType: 60,
  });

  return NextResponse.json({
    ok: true,
    stealthAddress: task.stealthRecipient,
    phase: task.phase,
    amount: task.amount.toString(),
  });
}
