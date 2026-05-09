// Live ETH/CZK rate via CoinGecko, with a 60s in-memory cache so we don't
// hammer their public API. The fallback constant is what the demo used to
// hardcode — it's only consulted if CoinGecko is reachable but garbled, or
// the network blips on a fresh lambda.

const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=czk";
const FALLBACK_KC_PER_ETH = 90_000;
const TTL_MS = 60_000;

let cached: { rate: number; at: number } | null = null;
let inflight: Promise<number> | null = null;

async function fetchFromCoinGecko(): Promise<number> {
  const res = await fetch(COINGECKO_URL, {
    headers: { accept: "application/json" },
    // Vercel Data Cache: 60s freshness across edges.
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`coingecko-${res.status}`);
  const data = (await res.json()) as { ethereum?: { czk?: number } };
  const rate = data?.ethereum?.czk;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("coingecko-shape");
  }
  return rate;
}

/** Returns Kč per 1 ETH. Cached 60s in-process; falls back to a constant on
 *  network failure so the UI always has a number. */
export async function getEthCzkRate(): Promise<number> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.rate;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const rate = await fetchFromCoinGecko();
      cached = { rate, at: Date.now() };
      return rate;
    } catch {
      const stale = cached?.rate ?? FALLBACK_KC_PER_ETH;
      cached = { rate: stale, at: Date.now() }; // brief negative-cache
      return stale;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export const ETH_CZK_FALLBACK = FALLBACK_KC_PER_ETH;
