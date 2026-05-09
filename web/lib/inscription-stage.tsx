"use client";

// Inscription overlay — shown while /api/claim-name is in flight.
// Replaces the spinner with a chiseling-letters ceremony:
//   1) the chosen name carves into parchment letter-by-letter (~1.7s)
//   2) three lines of italic narration fade in below, in order
//   3) on success, parent navigates after a minimum cinematic dwell
//   4) on error, dissolve to a broken-seal vignette
//
// All timing is CSS-driven; this component owns no animation engine.
import { useEffect, useRef, useState } from "react";
import { FleurDeLis, WaxSeal } from "./ornaments";

const PER_LETTER_MS = 60;
const LETTER_DRAW_MS = 250;
const NARRATION_GAP_1_MS = 200;
const NARRATION_GAP_2_MS = 700;
const NARRATION_GAP_3_MS = 1200;

export const INSCRIPTION_MIN_DWELL_MS = 2400;

export type InscriptionState = "carving" | "sealing" | "done" | "error";

const NARRATIONS_EN = [
  "the parchment receives the name…",
  "the seal is being cut in PragueConnect's ledger…",
  "a place on Swarm is being prepared for your hand…",
] as const;

const NARRATIONS_CS = [
  "pergamen přijímá jméno…",
  "pečeť se vyrývá do knihy PragueConnect…",
  "místo na Swarmu se připravuje pro vaši ruku…",
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
  const fullText = `${name}.pragueconnect.eth`;
  const letters = fullText.split("");
  const carveCompleteAt = letters.length * PER_LETTER_MS + LETTER_DRAW_MS;
  const lines = lang === "cs" ? NARRATIONS_CS : NARRATIONS_EN;

  if (state === "error") {
    return <ErrorVignette message={errorMsg} />;
  }

  return (
    <div
      role="dialog"
      aria-label="Inscribing name"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "var(--parchment)",
        backgroundImage: "radial-gradient(rgba(31,26,18,0.06) 1px, transparent 1px)",
        backgroundSize: "4px 4px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        animation: "pc-narration-fade 280ms ease-out",
      }}
    >
      <FleurDeLis size={32} style={{ marginBottom: 28, opacity: 0.75 }} />

      {/* The chiseled inscription */}
      <div
        style={{
          fontFamily: "var(--display)",
          fontSize: "clamp(28px, 7vw, 56px)",
          letterSpacing: "0.04em",
          color: "var(--ink)",
          textAlign: "center",
          lineHeight: 1.05,
          marginBottom: 8,
          maxWidth: "92vw",
          wordBreak: "break-word",
        }}
        aria-label={fullText}
      >
        {letters.map((ch, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: 0,
              animation: `pc-letter-draw ${LETTER_DRAW_MS}ms cubic-bezier(0.32, 0.72, 0.24, 1) ${
                i * PER_LETTER_MS
              }ms forwards`,
            }}
          >
            {ch === " " ? " " : ch}
          </span>
        ))}
      </div>

      {/* A faint hairline below — the inscription line */}
      <div
        style={{
          width: "min(420px, 80vw)",
          borderTop: "0.5px solid var(--gilded)",
          opacity: 0,
          animation: `pc-narration-fade 600ms ease-out ${carveCompleteAt}ms forwards`,
          marginBottom: 36,
        }}
      />

      {/* Three narration lines — fade in sequentially */}
      <div style={{ textAlign: "center", maxWidth: 520, padding: "0 12px" }}>
        {lines.map((line, idx) => {
          const delay =
            carveCompleteAt +
            (idx === 0
              ? NARRATION_GAP_1_MS
              : idx === 1
              ? NARRATION_GAP_1_MS + NARRATION_GAP_2_MS
              : NARRATION_GAP_1_MS + NARRATION_GAP_2_MS + NARRATION_GAP_3_MS);
          return (
            <p
              key={idx}
              className="t-italic"
              style={{
                fontSize: 16,
                lineHeight: 1.5,
                color: "var(--ink-70)",
                margin: "10px 0",
                opacity: 0,
                animation: `pc-narration-fade 700ms ease-out ${delay}ms forwards`,
              }}
            >
              {line}
            </p>
          );
        })}
      </div>

      {/* Tiny status footer — what the system is actually doing right now */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <span
          className="t-mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.25em",
            color: "var(--ink-50)",
            textTransform: "uppercase",
          }}
        >
          {state === "carving"
            ? lang === "cs"
              ? "ZAPEČEŤUJI"
              : "INSCRIBING"
            : state === "sealing"
            ? lang === "cs"
              ? "TRASA SOUKROMÝCH DARŮ"
              : "SEALING THE GIFT ROUTE"
            : lang === "cs"
            ? "HOTOVO"
            : "SEALED"}
        </span>
      </div>
    </div>
  );
}

function ErrorVignette({ message }: { message?: string | null }) {
  return (
    <div
      role="alertdialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "var(--parchment)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        animation: "pc-narration-fade 280ms ease-out",
      }}
    >
      <WaxSeal size={120} state="broken" rotate={-8} emboss="none" />
      <div
        className="t-display"
        style={{
          fontSize: 11,
          letterSpacing: "0.4em",
          color: "var(--vermilion)",
          marginTop: 24,
          textTransform: "uppercase",
        }}
      >
        the seal would not take
      </div>
      <p
        className="t-italic"
        style={{
          fontSize: 16,
          color: "var(--ink-70)",
          textAlign: "center",
          marginTop: 12,
          maxWidth: 420,
          lineHeight: 1.5,
        }}
      >
        {message ?? "The line to Prague was busy. The name has not been claimed — try again."}
      </p>
    </div>
  );
}

/// Helper used by the parent to ensure the animation gets at least its dwell time.
/// Returns ms remaining until the inscription's natural completion point, given the
/// timestamp the carving started.
export function inscriptionRemaining(startMs: number | null): number {
  if (!startMs) return 0;
  const elapsed = Date.now() - startMs;
  return Math.max(0, INSCRIPTION_MIN_DWELL_MS - elapsed);
}
