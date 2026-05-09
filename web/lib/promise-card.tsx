"use client";

// Beat 3 of the onboarding journey. Shown after the user presses SEAL but
// before Privy's modal opens, so the modal feels invited instead of
// interrupting. Two-line script: what's about to be asked, what it costs.
import { FleurDeLis, WaxSeal } from "./ornaments";

export function PromiseCard({
  onContinue,
  onCancel,
  lang = "en",
}: {
  onContinue: () => void;
  onCancel: () => void;
  lang?: "en" | "cs";
}) {
  const copy = lang === "cs"
    ? {
        kicker: "DVĚ POSTAVENÍ — OBĚ ZDARMA",
        line1: "Vaši e-mailovou adresu, abychom k vám pečeť přiřadili.",
        line2: "Jeden podpis, abychom odvodili soukromou trasu darů.",
        free: "Poplatek za první rok je na nás.",
        continue: "POKRAČOVAT",
        cancel: "ne teď",
      }
    : {
        kicker: "TWO SIGNATURES — BOTH FREE",
        line1: "Your email so we can seal the name to you.",
        line2: "One autograph so we can derive your private gift route.",
        free: "The fee for the first year is on us.",
        continue: "CONTINUE",
        cancel: "not now",
      };

  return (
    <div role="dialog" aria-label={copy.kicker} style={overlayStyle}>
      <div style={cardStyle}>
        <FleurDeLis size={26} stroke="var(--gilded)" style={{ margin: "0 auto 8px" }} />
        <div className="t-display" style={kickerStyle}>{copy.kicker}</div>
        <div className="hr-gilded" style={{ width: 60, margin: "10px auto 16px" }} />

        <ol style={listStyle}>
          <li style={lineStyle}>
            <Marker n={1} />
            <span style={lineTextStyle}>{copy.line1}</span>
          </li>
          <li style={lineStyle}>
            <Marker n={2} />
            <span style={lineTextStyle}>{copy.line2}</span>
          </li>
        </ol>

        <p className="t-italic" style={freeStyle}>{copy.free}</p>

        <button
          type="button"
          onClick={onContinue}
          className="t-display"
          style={continueStyle}
        >
          <WaxSeal size={20} state="rubedo" rotate={-7} emboss="fleur" />
          {copy.continue}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="t-display"
          style={cancelStyle}
        >
          {copy.cancel}
        </button>
      </div>
    </div>
  );
}

function Marker({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      className="t-display"
      style={{
        flex: "0 0 auto",
        width: 22,
        height: 22,
        borderRadius: "50%",
        border: "0.5px solid var(--gilded)",
        background: "rgba(184, 158, 78, 0.10)",
        color: "var(--vermilion)",
        fontSize: 11,
        letterSpacing: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {n}
    </span>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 65,
  background: "rgba(31,26,18,0.42)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  animation: "pc-narration-fade 280ms ease-out",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 380,
  background: "var(--parchment)",
  border: "0.5px solid var(--gilded)",
  padding: "26px 24px 20px",
  textAlign: "center",
  boxShadow: "0 30px 60px -20px rgba(31,26,18,0.40)",
};

const kickerStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.4em",
  color: "var(--vermilion)",
  textTransform: "uppercase",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: "0 0 18px",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  textAlign: "left",
};

const lineStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
};

const lineTextStyle: React.CSSProperties = {
  flex: 1,
  fontFamily: "var(--body)",
  fontStyle: "italic",
  fontSize: 14,
  lineHeight: 1.5,
  color: "var(--ink)",
};

const freeStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ink-70)",
  marginBottom: 18,
  lineHeight: 1.45,
};

const continueStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 18px",
  background: "var(--ink)",
  color: "var(--parchment)",
  fontSize: 12,
  letterSpacing: "0.3em",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
};

const cancelStyle: React.CSSProperties = {
  display: "block",
  margin: "10px auto 0",
  background: "transparent",
  color: "var(--ink-50)",
  fontSize: 10,
  letterSpacing: "0.3em",
  border: "none",
  cursor: "pointer",
  padding: 6,
};
