"use client";

// Beat 3 — shown after SEAL is pressed but before Privy's modal opens. Two
// numbered promises, each in a small circle marker. CONTINUE is the only
// primary action; "not now" sits beneath as btn-text. Uses .cartouche
// (parchment variant), .kicker, .hr-gilded, .btn-ink+.btn-block, .btn-text.
import { FleurDeLis } from "./ornaments";

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
        kicker: "DVA PODPISY — OBA ZDARMA",
        line1: "Vaši e-mailovou adresu, abychom k vám pečeť přiřadili.",
        line2: "Jeden podpis, abychom odvodili soukromou trasu darů.",
        free: "Poplatek za první rok je na nás.",
        continue: "Pokračovat",
        cancel: "ne teď",
      }
    : {
        kicker: "TWO SIGNATURES — BOTH FREE",
        line1: "Your email so we can seal the name to you.",
        line2: "One autograph so we can derive your private gift route.",
        free: "The fee for the first year is on us.",
        continue: "Continue",
        cancel: "not now",
      };

  return (
    <div role="dialog" aria-label={copy.kicker} style={overlayStyle}>
      <div style={cardWrapStyle}>
        <div className="cartouche-parchment" style={{ padding: 28 }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <FleurDeLis size={22} stroke="var(--gilded)" />
          </div>
          <div className="kicker" style={{ textAlign: "center", marginBottom: 12 }}>
            {copy.kicker}
          </div>
          <hr className="hr-gilded" style={{ marginBottom: 18 }} />

          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {[copy.line1, copy.line2].map((line, i) => (
              <li
                key={i}
                style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "0.5px solid var(--gilded)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--vermilion)",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink)" }}>
                  {line}
                </span>
              </li>
            ))}
          </ol>

          <p
            className="italic"
            style={{
              fontSize: 14,
              color: "var(--ink-70)",
              margin: "20px 0 22px",
              textAlign: "center",
            }}
          >
            {copy.free}
          </p>

          <button
            type="button"
            onClick={onContinue}
            className="btn btn-ink btn-block"
          >
            {copy.continue}
          </button>

          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-text"
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
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
  animation: "pc-fade-in 200ms ease-out both",
};

const cardWrapStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 400,
  animation: "pc-modal-in 280ms cubic-bezier(0.32,0.72,0.24,1) both",
};
