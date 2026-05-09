// Screen 12 — Empty / error / loading vignettes (showcase). Dev-only route.
// Ported from /design/screen-states.jsx.
import type { ReactNode } from "react";
import { FleurDeLis, Marginalia, WaxSeal } from "@/lib/ornaments";

function VignetteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="parchment-surface" style={{ width: "100%", minHeight: 680, display: "flex", alignItems: "center", justifyContent: "center", padding: 56, border: "0.5px solid var(--gilded)" }}>
      <div style={{ textAlign: "center", maxWidth: 520 }}>{children}</div>
    </div>
  );
}

function StateEmpty() {
  return (
    <VignetteFrame>
      <FleurDeLis size={36} style={{ margin: "0 auto" }} />
      <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.4em", color: "var(--vermilion)", marginTop: 18 }}>THE TOWN SQUARE · TODAY</div>
      <div className="t-display" style={{ fontSize: 36, letterSpacing: "0.04em", lineHeight: 1.1, marginTop: 12 }}>No offers in your part of Prague yet</div>
      <div className="t-italic" style={{ fontSize: 18, color: "var(--ink-70)", marginTop: 14, lineHeight: 1.5 }}>Be the first. The square fills as the day fills.</div>
      <div className="hr-gilded" style={{ width: 80, margin: "24px auto" }} />
      <button style={{ padding: "14px 24px", background: "var(--ink)", color: "var(--parchment)", fontFamily: "var(--display)", fontSize: 12, letterSpacing: "0.3em", cursor: "pointer" }}>POST THE FIRST NOTICE</button>
      <div style={{ marginTop: 24 }}>
        <Marginalia kind="constellation" size={120} style={{ margin: "0 auto", opacity: 0.5 }} />
      </div>
    </VignetteFrame>
  );
}

function StateError() {
  return (
    <VignetteFrame>
      <WaxSeal size={150} state="broken" rotate={-7} emboss="none" style={{ margin: "0 auto" }} />
      <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.4em", color: "var(--vermilion)", marginTop: 22 }}>THE SEAL DID NOT SET</div>
      <div className="t-display" style={{ fontSize: 32, letterSpacing: "0.04em", lineHeight: 1.15, marginTop: 10 }}>Pečeť se nezatvrdila</div>
      <div className="t-italic" style={{ fontSize: 17, color: "var(--ink)", marginTop: 14, lineHeight: 1.55 }}>
        The funds did not move. Nothing was lost. The line to Prague was busy for a moment.
      </div>
      <div className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", marginTop: 8, lineHeight: 1.55 }}>
        Prostředky nebyly převedeny. Nic se neztratilo. Linka do Prahy byla na okamžik plná.
      </div>
      <div className="hr-gilded" style={{ width: 80, margin: "20px auto" }} />
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button style={{ padding: "12px 20px", background: "var(--ink)", color: "var(--parchment)", fontFamily: "var(--display)", fontSize: 11, letterSpacing: "0.3em", cursor: "pointer" }}>TRY THE SEAL AGAIN</button>
        <button style={{ padding: "12px 20px", background: "transparent", color: "var(--ink)", border: "0.5px solid var(--gilded)", fontFamily: "var(--display)", fontSize: 11, letterSpacing: "0.3em", cursor: "pointer" }}>RETURN</button>
      </div>
    </VignetteFrame>
  );
}

function DrawingFleur({ size = 120 }: { size?: number }) {
  // Animated fleur: each path strokes over 2.4s, infinite loop. Pure SVG, no JS.
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke="var(--gilded)" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
      <style>{`
        @keyframes drawpath { from { stroke-dashoffset: var(--len); } to { stroke-dashoffset: 0; } }
        .lf-p { stroke-dasharray: var(--len); stroke-dashoffset: var(--len); animation: drawpath 2.4s linear infinite; }
      `}</style>
      <path className="lf-p" style={{ ["--len" as string]: "70px" } as React.CSSProperties} d="M50 14 C 50 30, 50 56, 50 72" />
      <path className="lf-p" style={{ ["--len" as string]: "40px", animationDelay: "0.2s" } as React.CSSProperties} d="M50 14 C 46 18, 46 22, 50 24 C 54 22, 54 18, 50 14 Z" />
      <path className="lf-p" style={{ ["--len" as string]: "90px", animationDelay: "0.4s" } as React.CSSProperties} d="M50 36 C 36 36, 24 44, 22 60 C 20 70, 28 74, 36 70 C 42 66, 46 56, 50 50" />
      <path className="lf-p" style={{ ["--len" as string]: "90px", animationDelay: "0.4s" } as React.CSSProperties} d="M50 36 C 64 36, 76 44, 78 60 C 80 70, 72 74, 64 70 C 58 66, 54 56, 50 50" />
      <path className="lf-p" style={{ ["--len" as string]: "60px", animationDelay: "0.8s" } as React.CSSProperties} d="M28 56 C 38 54, 62 54, 72 56" />
      <path className="lf-p" style={{ ["--len" as string]: "50px", animationDelay: "1s" } as React.CSSProperties} d="M32 72 C 40 78, 60 78, 68 72" />
      <path className="lf-p" style={{ ["--len" as string]: "40px", animationDelay: "1.2s" } as React.CSSProperties} d="M36 76 L 64 76" />
    </svg>
  );
}

function StateLoading() {
  return (
    <VignetteFrame>
      <DrawingFleur size={140} />
      <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.4em", color: "var(--vermilion)", marginTop: 24 }}>SETTING THE SEAL</div>
      <div className="t-italic" style={{ fontSize: 19, color: "var(--ink)", marginTop: 12, lineHeight: 1.55 }}>The wax is warming. The fleur is being drawn.</div>
      <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", marginTop: 6 }}>this should take only a breath</div>
    </VignetteFrame>
  );
}

export default function StatesPage() {
  return (
    <div className="parchment-surface" style={{ minHeight: "100vh", padding: 32 }}>
      <div className="t-display" style={{ fontSize: 18, letterSpacing: "0.4em", marginBottom: 18 }}>STATES · DEV PREVIEW</div>
      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr", maxWidth: 1200 }}>
        <StateEmpty />
        <StateError />
        <StateLoading />
      </div>
    </div>
  );
}
