"use client";

// Beat 5 — celebratory finale. The user's name in display caps, a single
// pressed wax seal, primary/secondary CTAs that branch on inviter, then
// the three unopened invite seals to pass on. Uses the new design system
// (.cartouche, .kicker, .display, .btn-vermilion, .btn-ink, .btn-outline).
//
//   sealed-by present → "Send <Inviter> a thank-you" (vermilion)
//                     + "Post your first offer" (ink)
//                     + "View your seal" (outline)
//   solo claim        → "Post your first offer" (vermilion)
//                     + "View your seal" (outline)
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CropsSeal, FleurDeLis, WaxSeal } from "./ornaments";

function InviteCodeRow({
  url,
  copyLabel,
  copiedLabel,
}: {
  url: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        border: "0.5px solid var(--gilded)",
        background: "var(--parchment)",
      }}
    >
      <span
        className="mono"
        style={{
          flex: 1,
          fontSize: 12,
          color: "var(--ink)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {url}
      </span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            /* ignore */
          }
        }}
        className="copy-btn"
        style={{
          color: copied ? "var(--verdigris)" : "var(--vermilion)",
        }}
      >
        {copied ? copiedLabel : copyLabel}
      </button>
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
      <div className="container-tight" style={{ paddingTop: 24, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <FleurDeLis size={26} stroke="var(--gilded)" />
        </div>
        <div className="kicker" style={{ marginBottom: 22 }}>{copy.kicker}</div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <WaxSeal size={84} state="rubedo" rotate={-7} emboss="fleur" />
        </div>
        <h1
          className="display"
          style={{
            fontSize: "clamp(44px, 11vw, 72px)",
            color: "var(--ink)",
            margin: "0 0 8px",
            letterSpacing: "0.04em",
          }}
        >
          {display}
        </h1>
        <div className="mono" style={{ fontSize: 13, color: "var(--ink-70)", marginBottom: 36 }}>
          {ens}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxWidth: 380,
            margin: "0 auto 36px",
          }}
        >
          {inviter && inviterFirst && (
            <button
              type="button"
              onClick={() => router.push(profileHref)}
              className="btn btn-vermilion"
            >
              {copy.thankYou(inviterFirst)}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/compose")}
            className={inviter ? "btn btn-ink" : "btn btn-vermilion"}
          >
            {copy.postOffer}
          </button>
          <button
            type="button"
            onClick={() => router.push(profileHref)}
            className="btn btn-outline"
          >
            {copy.viewSeal}
          </button>
        </div>

        {inviteCodes.length > 0 && (
          <div
            className="cartouche"
            style={{ padding: 22, textAlign: "left", marginBottom: 28 }}
          >
            <div className="kicker" style={{ marginBottom: 10, textAlign: "center" }}>
              {copy.invitesKicker}
            </div>
            <p
              className="italic"
              style={{
                fontSize: 14,
                color: "var(--ink-70)",
                margin: "0 0 16px",
                textAlign: "center",
                lineHeight: 1.55,
              }}
            >
              {copy.invitesBody}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {inviteCodes.map((code) => {
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                const url = `${origin}/i/${code}`;
                return (
                  <InviteCodeRow
                    key={code}
                    url={url}
                    copyLabel={copy.copy}
                    copiedLabel={copy.copied}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            paddingBottom: 24,
          }}
        >
          <CropsSeal size={18} color="var(--gilded-soft)" />
          <span className="italic" style={{ fontSize: 12, color: "var(--ink-50)" }}>
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
  backgroundImage: "var(--grain)",
  backgroundSize: "4px 4px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "24px 0",
  animation: "pc-narration-fade 600ms cubic-bezier(0.32, 0.72, 0.24, 1)",
  overflow: "auto",
};
