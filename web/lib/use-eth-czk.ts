"use client";

// Tiny hook: keeps a fresh ETH→CZK rate in state. Polls /api/eth-czk every
// 60s while the component is mounted. Falls back to the demo constant until
// the first response lands so the UI never shows NaN.
import { useEffect, useState } from "react";

const FALLBACK = 90_000;
const POLL_MS = 60_000;

export function useEthCzkRate(): number {
  const [rate, setRate] = useState<number>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/eth-czk");
        if (!res.ok) return;
        const data = (await res.json()) as { kcPerEth?: number };
        if (cancelled) return;
        if (typeof data.kcPerEth === "number" && data.kcPerEth > 0) {
          setRate(data.kcPerEth);
        }
      } catch {
        /* keep last value */
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return rate;
}
