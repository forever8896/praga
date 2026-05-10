// GET /api/eth-czk — ETH→fiat rates (CZK + USD), CoinGecko-backed, cached 60s.
// Public, no auth — wallet page, tip form, feed, compose all read it.
//
// Response shape includes both rates so the client can pick CZK or USD by
// the user's i18n language without a second round-trip.
import { NextResponse } from "next/server";
import { getEthFxRates } from "@/lib/eth-czk";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  const rates = await getEthFxRates();
  return NextResponse.json(
    { kcPerEth: rates.kcPerEth, usdPerEth: rates.usdPerEth, at: Date.now() },
    { headers: { "cache-control": "public, max-age=60, s-maxage=60" } },
  );
}
