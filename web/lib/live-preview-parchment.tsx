"use client";

// Beat 2 of the onboarding journey. A tiny live-preview parchment that sits
// below the inscription input and updates as the user types — gives them a
// glimpse of the seal they're about to inscribe. Subtly tilts and shifts as
// the name changes, so the act of typing feels like calligraphy.
import { CropsSeal, FleurDeLis } from "./ornaments";

export function LivePreviewParchment({
  name,
  available,
}: {
  name: string;
  available: boolean;
}) {
  const display = name ? name.charAt(0).toUpperCase() + name.slice(1) : "your name";
  const ens = name ? `${name}.pragueconnect.eth` : "···.pragueconnect.eth";
  const dim = !name;

  return (
    <div
      style={{
        position: "relative",
        margin: "0 auto",
        maxWidth: 280,
        padding: 0,
        opacity: dim ? 0.55 : 1,
        transform: `rotate(${dim ? -1.5 : -0.6}deg) scale(${dim ? 0.97 : 1})`,
        transition: "opacity 240ms ease, transform 320ms cubic-bezier(0.32, 0.72, 0.24, 1)",
      }}
    >
      <div
        style={{
          position: "relative",
          padding: "18px 16px 14px",
          background: available && !dim ? "rgba(244, 236, 216, 1)" : "var(--bone)",
          border: "0.5px solid var(--gilded)",
          boxShadow: dim
            ? "none"
            : "0 12px 32px -16px rgba(31,26,18,0.20), 0 1px 0 rgba(184,158,78,0.40)",
          textAlign: "center",
        }}
      >
        {/* Top fleur */}
        <FleurDeLis size={14} stroke="var(--gilded)" style={{ margin: "0 auto 4px" }} />

        {/* Kicker */}
        <div
          className="t-display"
          style={{
            fontSize: 7,
            letterSpacing: "0.4em",
            color: "var(--vermilion)",
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          BY THE HAND OF
        </div>

        {/* The name in display caps — the hero of the preview */}
        <div
          className="t-display"
          style={{
            fontSize: 26,
            letterSpacing: "0.04em",
            lineHeight: 1.0,
            color: "var(--ink)",
            margin: "2px 0 4px",
            fontWeight: 500,
            // Avoid awkward orphan when name is short
            wordBreak: "break-word",
          }}
        >
          {display}
        </div>

        {/* ENS line */}
        <div
          className="t-mono"
          style={{
            fontSize: 9,
            color: "var(--ink-70)",
            letterSpacing: 0,
            marginBottom: 6,
          }}
        >
          {ens}
        </div>

        {/* Engraved double rule */}
        <div
          aria-hidden
          style={{
            height: 3,
            width: 36,
            margin: "4px auto 6px",
            borderTop: "0.5px solid var(--gilded)",
            borderBottom: "0.5px solid var(--gilded)",
          }}
        />

        {/* Status line */}
        <div
          className="t-mono"
          style={{
            fontSize: 8,
            letterSpacing: "0.18em",
            color: dim
              ? "var(--ink-50)"
              : available
              ? "var(--verdigris)"
              : "var(--vermilion)",
            textTransform: "uppercase",
          }}
        >
          {dim ? "AWAITING THE QUILL" : available ? "AVAILABLE TO SEAL" : "ALREADY TAKEN"}
        </div>

        {/* CROPS hallmark in the corner — small but present */}
        <div
          style={{
            position: "absolute",
            bottom: 6,
            right: 8,
            opacity: 0.7,
            lineHeight: 0,
          }}
        >
          <CropsSeal size={14} />
        </div>
      </div>

      {/* Caption below */}
      <div
        className="t-italic"
        style={{
          fontSize: 11,
          color: "var(--ink-50)",
          textAlign: "center",
          marginTop: 8,
          lineHeight: 1.4,
        }}
      >
        a glimpse of your future seal
      </div>
    </div>
  );
}
