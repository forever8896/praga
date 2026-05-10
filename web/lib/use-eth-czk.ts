"use client";

// ETH→fiat rate hooks. The dictionary picks CZK for the Czech UI and USD
// for the English UI, so prices render in the user's local money next to
// the on-chain ETH amount. Polls /api/eth-czk every 60s while mounted;
// falls back to demo constants until the first response lands.
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "./i18n";

const FALLBACK_KC = 90_000;
const FALLBACK_USD = 3_800;
const POLL_MS = 60_000;

interface FxState {
  kcPerEth: number;
  usdPerEth: number;
}

function useFxRates(): FxState {
  const [state, setState] = useState<FxState>({
    kcPerEth: FALLBACK_KC,
    usdPerEth: FALLBACK_USD,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/eth-czk");
        if (!res.ok) return;
        const data = (await res.json()) as { kcPerEth?: number; usdPerEth?: number };
        if (cancelled) return;
        const next: FxState = {
          kcPerEth: typeof data.kcPerEth === "number" && data.kcPerEth > 0 ? data.kcPerEth : FALLBACK_KC,
          usdPerEth: typeof data.usdPerEth === "number" && data.usdPerEth > 0 ? data.usdPerEth : FALLBACK_USD,
        };
        setState(next);
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

  return state;
}

/** Back-compat: just the CZK rate. Used by callers that haven't migrated to
 *  the language-aware {@link useFx} hook yet. */
export function useEthCzkRate(): number {
  return useFxRates().kcPerEth;
}

export interface FiatHelpers {
  /** Currency code: "CZK" for Czech UI, "USD" for English. */
  code: "CZK" | "USD";
  /** Display symbol — placed after the number for CZK ("Kč"), before for USD ("$"). */
  symbol: string;
  /** ETH amount represented as the user's local currency. */
  fromEth: (eth: number) => number;
  /** "1 234 Kč" / "$48" — number formatted with locale-aware thousands. */
  formatFromEth: (eth: number) => string;
  /** "200 Kč" / "$8" — formatted directly from a CZK price (legacy stored values).
   *  When lang=cs we just append "Kč"; when lang=en we convert via current rates. */
  formatFromKc: (kc: number) => string;
  /** "200 Kč · 0.0023 ETH" — paired display. ETH amount goes through the rates. */
  pairFromEth: (eth: number, ethDigits?: number) => string;
  /** "200 Kč · 0.0023 ETH" — same pair but starting from a CZK price. */
  pairFromKc: (kc: number, ethDigits?: number) => string;
  /** "1 ETH ≈ 90 000 Kč" — full conversion line for footers. */
  rateLine: () => string;
  /** Raw rate per ETH for callers that want to do their own math. */
  ratePerEth: number;
  kcPerEth: number;
  usdPerEth: number;
  /** Take any free-text price the user typed ("od 200 Kč / hod", "from $20 / hr",
   *  "200" with no unit) and return a locale-aware display that always pairs
   *  the local-currency figure with its ETH equivalent. Used by skill rows and
   *  feed offers where prices are stored as plain strings. */
  formatFreeTextPrice: (raw: string) => string;
}

/** Language-aware fiat formatting helpers. Use this instead of useEthCzkRate
 *  when rendering prices — automatically picks CZK or USD based on the user's
 *  i18n language and pairs every fiat number with its ETH equivalent. */
export function useFx(): FiatHelpers {
  const { lang } = useI18n();
  const { kcPerEth, usdPerEth } = useFxRates();

  return useMemo<FiatHelpers>(() => {
    const isEn = lang === "en";
    const code: "CZK" | "USD" = isEn ? "USD" : "CZK";
    const symbol = isEn ? "$" : "Kč";
    const ratePerEth = isEn ? usdPerEth : kcPerEth;
    const locale = isEn ? "en-US" : "cs-CZ";

    const numFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

    const fmt = (n: number): string => {
      const safe = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
      return isEn ? `$${numFmt.format(safe)}` : `${numFmt.format(safe)} Kč`;
    };

    const fromEth = (eth: number) => eth * ratePerEth;
    const fromKc = (kc: number) => (isEn ? (kc / kcPerEth) * usdPerEth : kc);

    const ethStr = (eth: number, digits = 4) => {
      const safe = Number.isFinite(eth) && eth > 0 ? eth : 0;
      // Trim trailing zeros so "0.0010 ETH" → "0.001 ETH"
      const trimmed = safe.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
      return `${trimmed || "0"} ETH`;
    };

    return {
      code,
      symbol,
      ratePerEth,
      kcPerEth,
      usdPerEth,
      fromEth,
      formatFromEth: (eth) => fmt(fromEth(eth)),
      formatFromKc: (kc) => fmt(fromKc(kc)),
      pairFromEth: (eth, digits = 4) => `${fmt(fromEth(eth))} · ${ethStr(eth, digits)}`,
      pairFromKc: (kc, digits = 4) => {
        const eth = kc / kcPerEth;
        return `${fmt(fromKc(kc))} · ${ethStr(eth, digits)}`;
      },
      rateLine: () =>
        isEn
          ? `1 ETH ≈ $${numFmt.format(Math.round(usdPerEth))} (live · CoinGecko)`
          : `1 ETH ≈ ${numFmt.format(Math.round(kcPerEth))} Kč (live · CoinGecko)`,
      formatFreeTextPrice: (raw: string) => {
        const trimmed = (raw ?? "").trim();
        if (!trimmed) return "—";
        // If the seller typed a USD amount, convert to Kč for cs locale; flip
        // for en. Patterns we recognise: "$20", "20 USD", "200 Kč", "200 Kc",
        // "200 CZK". Anything we can't parse passes through verbatim with an
        // ETH suffix appended only when a leading number is present.
        const usdMatch = trimmed.match(/^(?:\$|usd\s*)?\s*(\d[\d\s.,]*)\s*(?:usd|\$)?(?:\s*\/\s*(.+))?$/i);
        const kcMatch = trimmed.match(/^(?:od|from)?\s*(\d[\d\s.,]*)\s*(?:kč|kc|czk)\s*(?:\/\s*(.+))?/i);

        let kcValue: number | null = null;
        let suffix = "";
        if (kcMatch) {
          kcValue = parseInt(kcMatch[1].replace(/[\s.,]/g, ""), 10);
          suffix = kcMatch[2] ? ` / ${kcMatch[2]}` : "";
        } else if (usdMatch && /(usd|\$)/i.test(trimmed)) {
          const usdValue = parseInt(usdMatch[1].replace(/[\s.,]/g, ""), 10);
          if (Number.isFinite(usdValue) && usdPerEth > 0 && kcPerEth > 0) {
            // Convert via fx: USD → ETH → Kč
            kcValue = Math.round((usdValue / usdPerEth) * kcPerEth);
            suffix = usdMatch[2] ? ` / ${usdMatch[2]}` : "";
          }
        }

        if (kcValue !== null && Number.isFinite(kcValue) && kcValue > 0) {
          const fiat = fmt(fromKc(kcValue));
          const eth = ethStr(kcValue / kcPerEth, 4);
          return `${fiat}${suffix} · ${eth}`;
        }
        // Verbatim fallback: pass through the user's text. If a leading number
        // exists with no recognised currency, append the ETH-equivalent.
        const numMatch = trimmed.match(/^(\d[\d\s.,]*)/);
        if (numMatch) {
          const n = parseInt(numMatch[1].replace(/[\s.,]/g, ""), 10);
          if (Number.isFinite(n) && n > 0) {
            // Treat as Kč by convention (legacy storage); render with locale
            // currency and ETH alongside.
            const fiat = fmt(fromKc(n));
            const eth = ethStr(n / kcPerEth, 4);
            const after = trimmed.slice(numMatch[0].length).trim();
            const tail = after ? ` ${after}` : "";
            return `${fiat}${tail} · ${eth}`;
          }
        }
        return trimmed;
      },
    };
  }, [lang, kcPerEth, usdPerEth]);
}
