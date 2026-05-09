"use client";

// Renders only when the connected Privy wallet is the owner of the profile
// being viewed. Gives a freshly-claimed user a clear list of next steps.
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useT } from "./i18n";

interface Props {
  ownerAddress: `0x${string}` | null;
  hasBio: boolean;
  hasOffers: boolean;
  hasStealth: boolean;
}

export function OwnerPanel({ ownerAddress, hasBio, hasOffers, hasStealth }: Props) {
  const { ready, authenticated, user } = usePrivy();
  const t = useT();
  if (!ready || !authenticated || !ownerAddress) return null;
  const myAddr = user?.wallet?.address;
  if (!myAddr || myAddr.toLowerCase() !== ownerAddress.toLowerCase()) return null;

  const steps: Array<{ done: boolean; href: string; label: string; sub: string }> = [
    {
      done: hasBio,
      href: "/me/edit",
      label: t("owner.step.bio.label", "Write your bio & catalogue"),
      sub: t("owner.step.bio.sub", "A paragraph about who you are and what you fix."),
    },
    {
      done: hasOffers,
      href: "/compose",
      label: t("owner.step.offer.label", "Post your first offer"),
      sub: t("owner.step.offer.sub", "Or a request — what do you need from the city?"),
    },
    {
      done: hasStealth,
      href: "/me/edit",
      label: t("owner.step.stealth.label", "Seal your private-gift route"),
      sub: t("owner.step.stealth.sub", "ERC-5564 stealth address so gifts are unlinkable."),
    },
  ];

  const remaining = steps.filter((s) => !s.done);
  if (remaining.length === 0) return null;

  return (
    <div style={{ marginTop: 18, padding: "14px 16px", border: "0.5px solid var(--gilded)", background: "var(--bone)" }}>
      <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 4 }}>
        {t("owner.kicker", "WELCOME — YOUR NEXT STEPS")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {steps.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              padding: "6px 0",
              textDecoration: "none",
              color: s.done ? "var(--ink-50)" : "var(--ink)",
              borderBottom: "0.5px dashed var(--gilded)",
            }}
          >
            <span className="t-mono" style={{ fontSize: 13, color: s.done ? "var(--verdigris)" : "var(--ink-50)" }}>
              {s.done ? "✓" : "○"}
            </span>
            <span style={{ flex: 1 }}>
              <span className="t-display" style={{ fontSize: 13, letterSpacing: "0.04em" }}>{s.label}</span>
              <span className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)", marginLeft: 8 }}>· {s.sub}</span>
            </span>
            {!s.done && <span className="t-display" style={{ fontSize: 10, letterSpacing: "0.25em", color: "var(--vermilion)" }}>GO →</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
