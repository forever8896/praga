// GET /api/receipts?address=0x...[&label=...]
//
// Returns Tipped events involving this address (either as sender or as
// direct, non-stealth recipient) and — when the caller authenticates with a
// matching `label` — also includes escrow TaskReleased events for the same
// EOA.
//
// Stealth-recipient matches on Tipped are deliberately not resolvable from
// a public address — by design. Escrow receipts are surfaced via the
// caller's bulletin (V2) or via the indexed `worker` field (V1).
import { NextResponse } from "next/server";
import { loadTipReceipts, loadEscrowReceipts, type TipReceipt } from "@/lib/tip-events";
import { verifySession } from "@/lib/privy-server";
import { getSubname } from "@/lib/resolver";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address");
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid-address" }, { status: 400 });
  }
  const addr = address as `0x${string}`;
  const label = url.searchParams.get("label") ?? "";

  // Optional: caller authenticates and provides a label they own → unlock
  // escrow receipts (V1 by indexed worker, V2 via bulletin cross-ref).
  let allowEscrow = false;
  if (label) {
    const session = await verifySession(req);
    if (session?.address && session.address.toLowerCase() === addr.toLowerCase()) {
      const rec = await getSubname(env.namestoneDomain, label).catch(() => null);
      if (rec && rec.address.toLowerCase() === addr.toLowerCase()) {
        allowEscrow = true;
      }
    }
  }

  try {
    const [tipsSent, tipsReceived, escrows] = await Promise.all([
      loadTipReceipts({ from: addr, limit: 50 }),
      loadTipReceipts({ recipient: addr, limit: 50 }),
      allowEscrow
        ? loadEscrowReceipts({ funder: addr, worker: addr, bulletinLabel: label, limit: 50 })
        : Promise.resolve([] as TipReceipt[]),
    ]);

    // Split escrow receipts into sent (caller=funder) vs received (anything
    // else — landing at a stealth address that is either the caller's
    // worker EOA on V1, or matches their bulletin on V2).
    const escrowsSent = escrows.filter((r) => r.from.toLowerCase() === addr.toLowerCase());
    const escrowsReceived = escrows.filter((r) => r.from.toLowerCase() !== addr.toLowerCase());

    const sent = [...tipsSent, ...escrowsSent].sort((a, b) => Number(b.blockNumber - a.blockNumber));
    const received = [...tipsReceived, ...escrowsReceived].sort((a, b) => Number(b.blockNumber - a.blockNumber));

    return NextResponse.json({
      ok: true,
      sent: sent.map(serialize),
      received: received.map(serialize),
      escrowEnabled: allowEscrow,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "indexer-failed" },
      { status: 502 },
    );
  }
}

function serialize(r: TipReceipt) {
  return {
    ...r,
    blockNumber: r.blockNumber.toString(),
    amountWei: r.amountWei.toString(),
  };
}
