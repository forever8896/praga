// GET /api/eth-czk — Kč per 1 ETH, fetched from CoinGecko and cached 60s.
// Public, no auth — both the wallet page and the tip form read it.
import { NextResponse } from "next/server";
import { getEthCzkRate } from "@/lib/eth-czk";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  const rate = await getEthCzkRate();
  return NextResponse.json(
    { kcPerEth: rate, at: Date.now() },
    { headers: { "cache-control": "public, max-age=60, s-maxage=60" } },
  );
}
