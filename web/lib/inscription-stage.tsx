"use client";

// Beat 4 — inscription overlay shown while /api/claim-name is in flight.
// Letter-by-letter carving via pc-letter-draw, three lines of narration that
// fade in sequentially, status in mono-caps at the bottom. Error path falls
// to a broken WaxSeal vignette. Uses .kicker, .italic, .mono-caps, .display.
import { FleurDeLis, WaxSeal } from "./ornaments";

const PER_LETTER_MS = 60;
const LETTER_DRAW_MS = 250;
const NARRATION_DELAY_BASE_MS = 200;
const NARRATION_STEP_MS = 350;

export const INSCRIPTION_MIN_DWELL_MS = 2400;

export type InscriptionState = "carving" | "sealing" | "done" | "error";

const NARRATIONS_EN = [
  "the parchment receives the name…",
  "the seal is being cut in PragueConnect's ledger…",
  "a place on IPFS is being prepared for your hand…",
] as const;

const NARRATIONS_CS = [
  "pergamen přijímá jméno…",
  "pečeť se vyrývá do knihy PragueConnect…",
  "místo na IPFS se připravuje pro vaši ruku…",
] as const;

export function InscriptionStage({
  name,
  state,
  errorMsg,
  lang = "en",
}: {
  name: string;
  state: InscriptionState;
  errorMsg?: string | null;
  lang?: "en" | "cs";
}) {
  const carved = name || (lang === "cs" ? "vašejméno" : "yourname");
  const letters = carved.split("");
  const carveCompleteAt = letters.length * PER_LETTER_MS + LETTER_DRAW_MS;
  const lines = lang === "cs" ? NARRATIONS_CS : NARRATIONS_EN;

  if (state === "error") {
    return <ErrorVignette message={errorMsg} lang={lang} />;
  }

  const phaseLabel =
    state === "carving"
      ? lang === "cs"
        ? "ZAPEČEŤUJI"
        : "INSCRIBING"
      : state === "sealing"
      ? lang === "cs"
        ? "TRASA SOUKROMÝCH DARŮ"
        : "SEALING THE GIFT ROUTE"
      : lang === "cs"
      ? "ZAPEČETĚNO"
      : "SEALED";

  return (
    <div
      role="dialog"
      aria-label="Inscribing name"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "var(--parchment)",
        backgroundImage: "var(--grain)",
        backgroundSize: "4px 4px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        animation: "pc-fade-in 280ms ease-out",
      }}
    >
      <FleurDeLis size={32} stroke="var(--gilded)" />
      <div style={{ height: 28 }} />

      <div
        className="display"
        style={{
          fontSize: "clamp(36px, 9vw, 64px)",
          color: "var(--ink)",
          textAlign: "center",
          letterSpacing: "0.02em",
          maxWidth: "92vw",
          wordBreak: "break-word",
        }}
        aria-label={carved}
      >
        {letters.map((ch, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: 0,
              animation: `pc-letter-draw ${LETTER_DRAW_MS}ms cubic-bezier(0.32,0.72,0.24,1) ${
                i * PER_LETTER_MS
              }ms forwards`,
            }}
          >
            {ch === " " ? " " : ch}
          </span>
        ))}
      </div>

      <div style={{ height: 16 }} />

      <hr
        className="hr-gilded"
        style={{
          width: 80,
          opacity: 0,
          animation: `pc-fade-in 400ms ease-out ${carveCompleteAt}ms forwards`,
        }}
      />

      <div style={{ height: 28 }} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          textAlign: "center",
          maxWidth: 360,
          padding: "0 12px",
        }}
      >
        {lines.map((line, idx) => (
          <p
            key={idx}
            className="italic"
            style={{
              fontSize: 15,
              color: "var(--ink-70)",
              margin: 0,
              lineHeight: 1.5,
              opacity: 0,
              animation: `pc-narration-fade 280ms ease-out ${
                carveCompleteAt + NARRATION_DELAY_BASE_MS + idx * NARRATION_STEP_MS
              }ms forwards`,
            }}
          >
            {line}
          </p>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <span
          className="mono-caps"
          style={{ color: "var(--ink)", fontSize: 11, letterSpacing: "0.25em" }}
        >
          {phaseLabel}
        </span>
      </div>
    </div>
  );
}

function ErrorVignette({
  message,
  lang,
}: {
  message?: string | null;
  lang: "en" | "cs";
}) {
  const headline = lang === "cs" ? "PEČEŤ SE NEPOVEDLA" : "THE SEAL WOULD NOT TAKE";
  const fallback =
    lang === "cs"
      ? "Spojení s Prahou bylo přerušeno. Jméno nebylo zapečetěno — zkuste to znovu."
      : "The line to Prague was busy. The name has not been claimed — try again.";

  return (
    <div
      role="alertdialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "var(--parchment)",
        backgroundImage: "var(--grain)",
        backgroundSize: "4px 4px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        animation: "pc-fade-in 280ms ease-out",
      }}
    >
      <WaxSeal size={120} state="broken" rotate={-8} emboss="none" />
      <div style={{ height: 24 }} />
      <div className="kicker" style={{ fontSize: 12 }}>{headline}</div>
      <p
        className="italic"
        style={{
          fontSize: 15,
          color: "var(--ink-70)",
          textAlign: "center",
          marginTop: 12,
          maxWidth: 420,
          lineHeight: 1.55,
        }}
      >
        {message ?? fallback}
      </p>
      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <span
          className="mono-caps"
          style={{ color: "var(--vermilion)", fontSize: 11 }}
        >
          {lang === "cs" ? "PEČEŤ ROZBITA" : "SEAL BROKEN"}
        </span>
      </div>
    </div>
  );
}

/// Helper for the parent to ensure the animation runs for at least its dwell time.
export function inscriptionRemaining(startMs: number | null): number {
  if (!startMs) return 0;
  const elapsed = Date.now() - startMs;
  return Math.max(0, INSCRIPTION_MIN_DWELL_MS - elapsed);
}
