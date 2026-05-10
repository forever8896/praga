// Live ETH→fiat rates via CoinGecko (CZK + USD), with a 60s in-memory cache
// so we don't hammer their public API. Fallback constants are used only if
// CoinGecko is reachable but garbled, or the network blips on a fresh lambda.

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=czk,usd";
const FALLBACK_KC_PER_ETH = 90_000;
const FALLBACK_USD_PER_ETH = 3_800;
const TTL_MS = 60_000;

export interface FxRates {
  kcPerEth: number;
  usdPerEth: number;
}

let cached: { rates: FxRates; at: number } | null = null;
let inflight: Promise<FxRates> | null = null;

async function fetchFromCoinGecko(): Promise<FxRates> {
  const res = await fetch(COINGECKO_URL, {
    headers: { accept: "application/json" },
    // Vercel Data Cache: 60s freshness across edges.
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`coingecko-${res.status}`);
  const data = (await res.json()) as { ethereum?: { czk?: number; usd?: number } };
  const kc = data?.ethereum?.czk;
  const usd = data?.ethereum?.usd;
  if (typeof kc !== "number" || !Number.isFinite(kc) || kc <= 0) throw new Error("coingecko-shape-kc");
  if (typeof usd !== "number" || !Number.isFinite(usd) || usd <= 0) throw new Error("coingecko-shape-usd");
  return { kcPerEth: kc, usdPerEth: usd };
}

/** Returns the latest ETH→fiat rates. Cached 60s in-process; falls back to
 *  constants on network failure so the UI always has numbers. */
export async function getEthFxRates(): Promise<FxRates> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.rates;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const rates = await fetchFromCoinGecko();
      cached = { rates, at: Date.now() };
      return rates;
    } catch {
      const stale = cached?.rates ?? { kcPerEth: FALLBACK_KC_PER_ETH, usdPerEth: FALLBACK_USD_PER_ETH };
      cached = { rates: stale, at: Date.now() }; // brief negative-cache
      return stale;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Back-compat shim — older callers still ask for just the CZK rate. */
export async function getEthCzkRate(): Promise<number> {
  const r = await getEthFxRates();
  return r.kcPerEth;
}

export const ETH_CZK_FALLBACK = FALLBACK_KC_PER_ETH;
export const ETH_USD_FALLBACK = FALLBACK_USD_PER_ETH;
