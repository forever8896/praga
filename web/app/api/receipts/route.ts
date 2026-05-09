// GET /api/receipts?address=0x... — returns Tipped events involving this address
// (either as sender or as direct, non-stealth recipient). Stealth-recipient
// matches are deliberately not resolvable from a public address — by design.
import { NextResponse } from "next/server";
import { loadTipReceipts, type TipReceipt } from "@/lib/tip-events";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address");
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid-address" }, { status: 400 });
  }
  const addr = address as `0x${string}`;

  try {
    const [sent, received] = await Promise.all([
      loadTipReceipts({ from: addr, limit: 50 }),
      loadTipReceipts({ recipient: addr, limit: 50 }),
    ]);
    return NextResponse.json({
      ok: true,
      sent: sent.map(serialize),
      received: received.map(serialize),
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
