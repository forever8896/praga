"use client";

// Beat 5 of the onboarding journey. After the inscription animation completes
// AND both the claim + stealth-route APIs have settled, this full-screen beat
// replaces the silent setTimeout redirect with a punctuation: the user's name
// in display caps, a single pressed wax seal, and 2-3 wax-stamp CTAs that
// branch on whether they were sealed-by an inviter.
//
//   sealed-by present → "Send <Inviter> a thank-you" (primary)
//                     + "Post your first offer"
//                     + "View your seal"
//   solo claim        → "Post your first offer" (primary)
//                     + "View your seal"
//
// All CTAs hand off to existing routes; the Reciprocate cartouche auto-mounts
// when the user lands back on their own profile, so the inviter path lands
// in the cinematic press-and-hold flow without us having to reproduce it here.
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { CropsSeal, FleurDeLis, WaxSeal } from "./ornaments";

function InviteCodeBlock({
  codes,
  kicker,
  body,
  copyLabel,
  copiedLabel,
}: {
  codes: string[];
  kicker: string;
  body: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  return (
    <div style={{ marginTop: 32, padding: "20px 18px", border: "0.5px solid var(--gilded)", background: "var(--bone)" }}>
      <div className="t-display" style={{ fontSize: 10, letterSpacing: "0.4em", color: "var(--vermilion)", textAlign: "center", marginBottom: 8 }}>
        {kicker}
      </div>
      <p className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)", textAlign: "center", marginBottom: 16, lineHeight: 1.55 }}>
        {body}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {codes.map((code) => {
          const url = `${origin}/i/${code}`;
          const isCopied = copiedCode === code;
          return (
            <div key={code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "0.5px solid var(--gilded)", background: "var(--parchment)" }}>
              <span className="t-mono" style={{ flex: 1, fontSize: 12, color: "var(--ink)", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {url}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopiedCode(code);
                    setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1800);
                  } catch {
                    /* ignore */
                  }
                }}
                className="t-display"
                style={{
                  flex: "0 0 auto",
                  fontSize: 9,
                  letterSpacing: "0.25em",
                  color: isCopied ? "var(--verdigris)" : "var(--vermilion)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 6px",
                }}
              >
                {isCopied ? copiedLabel : copyLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface InviterContext {
  ens: string;
  display: string;
}

export function SealedBeat({
  label,
  display,
  inviter,
  inviteCodes = [],
  lang = "en",
}: {
  label: string;
  display: string;
  inviter: InviterContext | null;
  inviteCodes?: string[];
  lang?: "en" | "cs";
}) {
  const router = useRouter();
  const ens = `${label}.pragueconnect.eth`;
  const profileHref = `/${ens}`;

  const copy = lang === "cs"
    ? {
        kicker: "PEČEŤ JE ZAPEČETĚNÁ",
        byHandOf: "RUKOU",
        thankYou: (firstName: string) => `Poděkovat ${firstName} →`,
        postOffer: "Vyvěsit první nabídku →",
        viewSeal: "Zobrazit svůj pergamen →",
        privacy: "soukromé · zapečetěné · vaše",
        invitesKicker: "VAŠE PEČETĚ K PŘEDÁNÍ",
        invitesBody: "Tři neotevřené pečetě. Sdílejte je s lidmi, které do cechu chcete uvést — z jejich prvního spropitného vám připadne 5 % jako nálezné.",
        copy: "kopírovat",
        copied: "zkopírováno",
      }
    : {
        kicker: "YOUR SEAL IS SEALED",
        byHandOf: "BY THE HAND OF",
        thankYou: (firstName: string) => `Send ${firstName} a thank-you →`,
        postOffer: "Post your first offer →",
        viewSeal: "View your seal →",
        privacy: "private · sealed · yours",
        invitesKicker: "YOUR SEALS TO PASS ON",
        invitesBody: "Three unopened seals. Share them with anyone you'd vouch for — when they tip, 5% returns to you as a finder's mark.",
        copy: "copy",
        copied: "copied",
      };

  const inviterFirst = inviter?.display.split(" ")[0] ?? null;

  return (
    <div role="dialog" aria-label={copy.kicker} style={pageStyle}>
      <div style={contentStyle}>
        <FleurDeLis size={28} stroke="var(--gilded)" style={{ margin: "0 auto 12px" }} />
        <div className="t-display" style={kickerStyle}>{copy.kicker}</div>
        <div style={{ display: "flex", justifyContent: "center", margin: "16px 0 12px" }}>
          <WaxSeal size={84} state="rubedo" rotate={-7} emboss="fleur" />
        </div>
        <div className="t-display" style={byHandOfStyle}>{copy.byHandOf}</div>
        <h1 style={nameStyle}>{display}</h1>
        <div className="t-mono" style={ensStyle}>{ens}</div>

        <div style={{ height: 36 }} />

        <div style={ctaColumnStyle}>
          {inviter && inviterFirst && (
            <button
              type="button"
              onClick={() => router.push(profileHref)}
              className="t-display"
              style={primaryCtaStyle}
            >
              <WaxSeal size={20} state="rubedo" rotate={-6} emboss="fleur" />
              {copy.thankYou(inviterFirst)}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/compose")}
            className="t-display"
            style={inviter ? secondaryCtaStyle : primaryCtaStyle}
          >
            {!inviter && <WaxSeal size={20} state="rubedo" rotate={-6} emboss="fleur" />}
            {copy.postOffer}
          </button>
          <Link href={profileHref} className="t-display" style={tertiaryCtaStyle}>
            {copy.viewSeal}
          </Link>
        </div>

        {inviteCodes.length > 0 && (
          <InviteCodeBlock codes={inviteCodes} kicker={copy.invitesKicker} body={copy.invitesBody} copyLabel={copy.copy} copiedLabel={copy.copied} />
        )}

        <div style={{ marginTop: 28, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
          <CropsSeal size={20} />
          <span className="t-italic" style={{ fontSize: 11, color: "var(--ink-50)", letterSpacing: "0.04em" }}>
            {copy.privacy}
          </span>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 55,
  background: "var(--parchment)",
  backgroundImage: "radial-gradient(rgba(31,26,18,0.06) 1px, transparent 1px)",
  backgroundSize: "4px 4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  animation: "pc-narration-fade 600ms cubic-bezier(0.32, 0.72, 0.24, 1)",
  overflow: "auto",
};

const contentStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 540,
  textAlign: "center",
  padding: "32px 0",
};

const kickerStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.4em",
  color: "var(--vermilion)",
  textTransform: "uppercase",
};

const byHandOfStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.4em",
  color: "var(--ink-50)",
  textTransform: "uppercase",
  marginTop: 8,
};

const nameStyle: React.CSSProperties = {
  fontFamily: "var(--display)",
  fontSize: "clamp(48px, 11vw, 72px)",
  letterSpacing: "0.04em",
  lineHeight: 1.0,
  color: "var(--ink)",
  margin: "8px 0 6px",
  fontWeight: 500,
};

const ensStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ink-70)",
  letterSpacing: "0.02em",
};

const ctaColumnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  alignItems: "stretch",
  maxWidth: 360,
  margin: "0 auto",
};

const primaryCtaStyle: React.CSSProperties = {
  padding: "14px 18px",
  background: "var(--vermilion)",
  color: "var(--parchment)",
  fontSize: 12,
  letterSpacing: "0.3em",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  textDecoration: "none",
  textAlign: "center",
};

const secondaryCtaStyle: React.CSSProperties = {
  padding: "12px 18px",
  background: "var(--ink)",
  color: "var(--parchment)",
  fontSize: 11,
  letterSpacing: "0.3em",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  textDecoration: "none",
  textAlign: "center",
};

const tertiaryCtaStyle: React.CSSProperties = {
  padding: "10px 16px",
  background: "transparent",
  color: "var(--ink-70)",
  fontSize: 11,
  letterSpacing: "0.3em",
  border: "0.5px solid var(--gilded)",
  cursor: "pointer",
  display: "block",
  textDecoration: "none",
  textAlign: "center",
};
