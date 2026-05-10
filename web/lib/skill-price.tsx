"use client";

// Tiny client-side wrapper that takes a free-text price string ("from 200 Kč
// / hr", "$25", "200 Kč") and renders it with the viewer's locale currency
// + a paired ETH-equivalent. Sits inside server-rendered SkillRow / OfferCard
// components so language switches reflow prices without a server round-trip.
import { useFx } from "./use-eth-czk";

export function SkillPrice({ raw, italic = true, fontSize }: { raw: string; italic?: boolean; fontSize?: number }) {
  const fx = useFx();
  const text = fx.formatFreeTextPrice(raw);
  return (
    <span
      className={italic ? "t-italic" : "t-mono"}
      style={{
        fontSize: fontSize ?? 13,
        color: "var(--ink-70)",
      }}
    >
      {text}
    </span>
  );
}
