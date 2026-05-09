// Skol — Rudolfine ornaments
// FleurDeLis, WaxSeal, Cartouche, AlchemicalSigil, Marginalia, Quill, CategoryChip
// Ported from /design/ornaments.jsx (visual parity preserved verbatim).
import type { CSSProperties, ReactNode } from "react";

export type SigilKind =
  | "forge"
  | "mercury"
  | "sulphur"
  | "caduceus"
  | "saturn"
  | "venus"
  | "alembic";

export type WaxState = "nigredo" | "albedo" | "citrinitas" | "rubedo" | "broken";
export type WaxEmboss = "fleur" | "crescent" | "sun" | "none";

// ============== FleurDeLis ==============
// Three-petal, slightly elongated, line-art only — no fills.
export function FleurDeLis({
  size = 24,
  stroke = "var(--gilded)",
  strokeWidth = 0.8,
  style = {},
}: {
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ display: "block", ...style }}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 4 C 20 12, 20 22, 20 28" />
      <path d="M20 4 C 18.5 6, 18.5 8, 20 9 C 21.5 8, 21.5 6, 20 4 Z" />
      <path d="M20 14 C 14 14, 9 18, 8 24 C 7 28, 10 30, 13 28 C 15.5 26.5, 17 22, 20 20" />
      <path d="M20 14 C 26 14, 31 18, 32 24 C 33 28, 30 30, 27 28 C 24.5 26.5, 23 22, 20 20" />
      <path d="M11 22 C 15 21, 25 21, 29 22" />
      <path d="M14 28 C 16 30, 24 30, 26 28" />
      <path d="M16 30 L 24 30" />
      <path d="M20 28 L 20 33" />
    </svg>
  );
}

// ============== WaxSeal ==============
const WAX_PALETTES: Record<WaxState, { wax: string; edge: string; seal: string; text: string }> = {
  nigredo: { wax: "#1A1814", edge: "#0A0908", seal: "#3A332A", text: "#7B6F58" },
  albedo: { wax: "#1A1814", edge: "#0A0908", seal: "#E6DCC4", text: "#E6DCC4" },
  citrinitas: { wax: "#221F18", edge: "#100E09", seal: "#C8A24A", text: "#C8A24A" },
  rubedo: { wax: "#B23A2F", edge: "#7A2218", seal: "#C8A24A", text: "#F4ECD8" },
  broken: { wax: "#7A2218", edge: "#3A0F0A", seal: "#3A0F0A", text: "#F4ECD8" },
};

export function WaxSeal({
  size = 90,
  state = "rubedo",
  rotate = -6,
  emboss = "fleur",
  label,
  style = {},
}: {
  size?: number;
  state?: WaxState;
  rotate?: number;
  emboss?: WaxEmboss;
  label?: string;
  style?: CSSProperties;
}) {
  const p = WAX_PALETTES[state];
  const r = 50;
  const N = 36;
  const seed = state.length;
  const edgePts: string[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const noise = (Math.sin(i * 1.7 + seed) * 0.5 + Math.cos(i * 2.3 + seed * 2) * 0.5) * 1.6;
    const rad = r + noise;
    edgePts.push(`${50 + Math.cos(a) * rad},${50 + Math.sin(a) * rad}`);
  }
  const gradId = `waxgrad-${state}-${rotate}`;
  const pathId = `waxpath-${state}-${rotate}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "block", transform: `rotate(${rotate}deg)`, ...style }}
    >
      <defs>
        <radialGradient id={gradId} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={p.wax} stopOpacity="1" />
          <stop offset="60%" stopColor={p.wax} stopOpacity="1" />
          <stop offset="100%" stopColor={p.edge} stopOpacity="1" />
        </radialGradient>
      </defs>
      {state !== "broken" ? (
        <>
          <polygon
            points={edgePts.join(" ")}
            fill={`url(#${gradId})`}
            stroke={p.edge}
            strokeWidth="0.4"
          />
          <ellipse cx="38" cy="32" rx="14" ry="6" fill={p.seal} opacity="0.07" />
          <path d="M 22 50 L 30 52 L 28 55" stroke={p.edge} strokeWidth="0.3" fill="none" opacity="0.5" />
          <path d="M 78 60 L 72 62" stroke={p.edge} strokeWidth="0.3" fill="none" opacity="0.4" />
          <circle cx="50" cy="50" r="38" fill="none" stroke={p.seal} strokeWidth="0.4" opacity="0.5" />
          <circle cx="50" cy="50" r="35" fill="none" stroke={p.seal} strokeWidth="0.3" opacity="0.3" />
          <g transform="translate(50,50)">
            {emboss === "fleur" && (
              <g
                transform="translate(-14,-14)"
                stroke={p.seal}
                strokeWidth="0.7"
                fill="none"
                strokeLinecap="round"
                opacity="0.95"
              >
                <path d="M14 2 C 14 8, 14 18, 14 22" />
                <path d="M14 2 C 13 4, 13 6, 14 7 C 15 6, 15 4, 14 2 Z" />
                <path d="M14 11 C 9 11, 5 14, 4 19 C 3.2 22, 5.5 23.5, 8 22 C 10 21, 11 17.5, 14 16" />
                <path d="M14 11 C 19 11, 23 14, 24 19 C 24.8 22, 22.5 23.5, 20 22 C 18 21, 17 17.5, 14 16" />
                <path d="M7 17 C 10 16, 18 16, 21 17" />
                <path d="M9 22 C 11 24, 17 24, 19 22" />
                <path d="M11 24 L 17 24" />
              </g>
            )}
            {emboss === "crescent" && (
              <path
                d="M -10 -8 A 12 12 0 1 0 -10 8 A 9 9 0 1 1 -10 -8 Z"
                fill={p.seal}
                opacity="0.95"
              />
            )}
            {emboss === "sun" && (
              <g stroke={p.seal} strokeWidth="0.8" fill="none" opacity="0.95">
                <circle cx="0" cy="0" r="9" />
                <circle cx="0" cy="0" r="2" fill={p.seal} />
                {Array.from({ length: 12 }).map((_, i) => {
                  const a = (i / 12) * Math.PI * 2;
                  return (
                    <line
                      key={i}
                      x1={Math.cos(a) * 11}
                      y1={Math.sin(a) * 11}
                      x2={Math.cos(a) * 14}
                      y2={Math.sin(a) * 14}
                    />
                  );
                })}
              </g>
            )}
          </g>
          {label && (
            <g
              style={{
                fontFamily: "var(--display)",
                fontSize: 5,
                letterSpacing: "0.18em",
                fill: p.text,
                textTransform: "uppercase",
              }}
              opacity="0.85"
            >
              <defs>
                <path id={pathId} d="M 50 50 m -42 0 a 42 42 0 1 1 84 0 a 42 42 0 1 1 -84 0" />
              </defs>
              <text>
                <textPath href={`#${pathId}`} startOffset="25%" textAnchor="middle">
                  {label}
                </textPath>
              </text>
            </g>
          )}
        </>
      ) : (
        <>
          <g transform="translate(-3,0)">
            <polygon
              points={edgePts.slice(0, N / 2 + 2).join(" ") + " 50,50"}
              fill={`url(#${gradId})`}
              stroke={p.edge}
              strokeWidth="0.4"
            />
          </g>
          <g transform="translate(3,1)">
            <polygon
              points={edgePts.slice(N / 2).join(" ") + " 50,50"}
              fill={`url(#${gradId})`}
              stroke={p.edge}
              strokeWidth="0.4"
            />
          </g>
          <path d="M 50 8 L 47 50 L 53 50 L 50 92" stroke={p.edge} strokeWidth="0.6" fill="none" opacity="0.7" />
        </>
      )}
    </svg>
  );
}

// ============== Cartouche ==============
type CartoucheTone = "parchment" | "bone" | "ink" | string;
export function Cartouche({
  children,
  style = {},
  padding = 24,
  accent = "var(--gilded)",
  tone = "parchment",
  tight = false,
}: {
  children: ReactNode;
  style?: CSSProperties;
  padding?: number;
  accent?: string;
  tone?: CartoucheTone;
  tight?: boolean;
}) {
  const bg =
    tone === "parchment"
      ? "transparent"
      : tone === "bone"
      ? "var(--bone)"
      : tone === "ink"
      ? "var(--ink)"
      : tone;
  return (
    <div style={{ position: "relative", background: bg, padding, ...style }}>
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <rect
          x="1.5"
          y="1.5"
          width="97"
          height="97"
          fill="none"
          stroke={accent}
          strokeWidth="0.18"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          fill="none"
          stroke={accent}
          strokeWidth="0.12"
          vectorEffect="non-scaling-stroke"
          opacity="0.5"
        />
      </svg>
      {!tight && (
        <>
          <CartoucheCorner pos="tl" accent={accent} />
          <CartoucheCorner pos="tr" accent={accent} />
          <CartoucheCorner pos="bl" accent={accent} />
          <CartoucheCorner pos="br" accent={accent} />
        </>
      )}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

function CartoucheCorner({ pos, accent }: { pos: "tl" | "tr" | "bl" | "br"; accent: string }) {
  const transforms: Record<typeof pos, string> = {
    tl: "",
    tr: "translate(40,0) scale(-1,1)",
    bl: "translate(0,40) scale(1,-1)",
    br: "translate(40,40) scale(-1,-1)",
  };
  const offsets: Record<typeof pos, CSSProperties> = {
    tl: { top: 0, left: 0 },
    tr: { top: 0, right: 0 },
    bl: { bottom: 0, left: 0 },
    br: { bottom: 0, right: 0 },
  };
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 40 40"
      style={{ position: "absolute", ...offsets[pos], pointerEvents: "none" }}
    >
      <g transform={transforms[pos]} stroke={accent} strokeWidth="0.6" fill="none" strokeLinecap="round">
        <path d="M 4 14 C 8 12, 12 10, 14 4" />
        <path d="M 6 18 C 10 16, 16 12, 18 6" opacity="0.6" />
        <path d="M 4 14 C 5 16, 7 16, 8 14 C 8 12, 6 12, 6 14" />
        <path d="M 14 4 C 16 5, 16 7, 14 8 C 12 8, 12 6, 14 6" />
        <circle cx="6" cy="14" r="0.6" fill={accent} />
        <circle cx="14" cy="6" r="0.6" fill={accent} />
      </g>
    </svg>
  );
}

// ============== Alchemical Sigils (category icons) ==============
// Source: game-icons.net (Lorc, Delapouite — CC BY 3.0). One file per kind
// in /public/icons/, fill="currentColor" so the page's --ink token flows
// through. Mask-image lets us recolor with backgroundColor without losing
// SVG-cache benefits.
//
// Mapping:
//   forge    → Lorc/anvil
//   mercury  → Lorc/chemical-bolt
//   sulphur  → Delapouite/pyre
//   caduceus → Delapouite/caduceus
//   saturn   → Delapouite/planet-conquest
//   venus    → Delapouite/female (♀)
//   alembic  → Lorc/round-bottom-flask

export function AlchemicalSigil({
  kind = "forge",
  size = 40,
  frame = true,
  color = "var(--ink)",
  frameColor = "var(--gilded)",
  style = {},
}: {
  kind?: SigilKind;
  size?: number;
  frame?: boolean;
  color?: string;
  frameColor?: string;
  style?: CSSProperties;
}) {
  const inset = frame ? Math.max(4, Math.round(size * 0.16)) : 0;
  const iconUrl = `url(/icons/${kind}.svg)`;
  return (
    <span
      style={{
        display: "inline-flex",
        position: "relative",
        width: size,
        height: size,
        ...style,
      }}
    >
      {frame && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `0.5px solid ${frameColor}`,
            opacity: 0.85,
          }}
        />
      )}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: inset,
          left: inset,
          right: inset,
          bottom: inset,
          backgroundColor: color,
          maskImage: iconUrl,
          maskSize: "contain",
          maskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskImage: iconUrl,
          WebkitMaskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
        }}
      />
    </span>
  );
}

// ============== Marginalia ==============
export type MarginaliaKind =
  | "squaredcircle"
  | "constellation"
  | "astrolog"
  | "pragueMap"
  | "alembicDiagram"
  | "fleurSketch"
  | "chart";

export function Marginalia({
  kind,
  size = 80,
  style = {},
}: {
  kind: MarginaliaKind;
  size?: number;
  style?: CSSProperties;
}) {
  const stroke = "var(--ink)";
  const sw = 0.5;
  const items: Record<MarginaliaKind, ReactNode> = {
    squaredcircle: (
      <g fill="none" stroke={stroke} strokeWidth={sw} opacity="0.55">
        <rect x="10" y="10" width="80" height="80" />
        <circle cx="50" cy="50" r="38" />
        <polygon points="50,16 84,68 16,68" />
        <circle cx="50" cy="50" r="14" />
        <text x="50" y="52" textAnchor="middle" style={{ fontFamily: "var(--display)", fontSize: 7, fill: stroke }}>
          VIIIIVIII
        </text>
      </g>
    ),
    constellation: (
      <g fill={stroke} stroke={stroke} strokeWidth={sw} opacity="0.6">
        <line x1="14" y1="22" x2="34" y2="40" />
        <line x1="34" y1="40" x2="58" y2="32" />
        <line x1="58" y1="32" x2="72" y2="58" />
        <line x1="72" y1="58" x2="50" y2="78" />
        <line x1="50" y1="78" x2="22" y2="68" />
        {[
          [14, 22],
          [34, 40],
          [58, 32],
          [72, 58],
          [50, 78],
          [22, 68],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.6" fill={stroke} />
        ))}
        <text x="50" y="14" textAnchor="middle" style={{ fontFamily: "var(--display)", fontSize: 6, fill: stroke }}>
          ŽIŽKOV · KARLÍN · VINOHRADY
        </text>
      </g>
    ),
    astrolog: (
      <g fill="none" stroke={stroke} strokeWidth={sw} opacity="0.6">
        <circle cx="28" cy="30" r="8" />
        <circle cx="28" cy="30" r="1.5" fill={stroke} />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={28 + Math.cos(a) * 10}
              y1={30 + Math.sin(a) * 10}
              x2={28 + Math.cos(a) * 13}
              y2={30 + Math.sin(a) * 13}
            />
          );
        })}
        <ellipse cx="68" cy="62" rx="10" ry="3" transform="rotate(-22 68 62)" />
        <circle cx="68" cy="62" r="6" />
      </g>
    ),
    pragueMap: (
      <g fill="none" stroke={stroke} strokeWidth={sw} opacity="0.6">
        <path d="M 12 60 C 28 50, 40 70, 60 56 C 76 46, 88 60, 88 70" />
        <path d="M 12 60 C 28 70, 40 50, 60 64" opacity="0.5" />
        <path d="M 52 32 L 56 28 L 56 24 L 60 24 L 60 28 L 64 28 L 64 24 L 68 24 L 68 28 L 72 32 L 72 40 L 52 40 Z" />
        <line x1="58" y1="22" x2="58" y2="24" />
        <line x1="66" y1="22" x2="66" y2="24" />
        <circle cx="36" cy="58" r="1.5" fill="var(--vermilion)" stroke="none" />
        <text x="40" y="60" style={{ fontFamily: "var(--mono)", fontSize: 5, fill: stroke }}>
          here
        </text>
      </g>
    ),
    alembicDiagram: (
      <g fill="none" stroke={stroke} strokeWidth={sw} opacity="0.6">
        <path d="M 30 24 L 60 24 L 60 38 L 72 64 C 76 72, 70 78, 60 78 L 30 78 C 20 78, 14 72, 18 64 L 30 38 Z" />
        <line x1="26" y1="24" x2="64" y2="24" />
        <path d="M 60 38 L 86 38 L 86 60 L 80 60" />
        <path d="M 38 64 C 42 60, 50 60, 54 64" />
        <text
          x="50"
          y="92"
          textAnchor="middle"
          style={{ fontFamily: "var(--display)", fontSize: 6, fill: stroke, letterSpacing: "0.1em" }}
        >
          ALEMBICUM
        </text>
      </g>
    ),
    fleurSketch: (
      <g fill="none" stroke={stroke} strokeWidth={sw * 1.2} opacity="0.55" strokeLinecap="round">
        <path d="M 50 14 C 50 32, 50 56, 50 72" />
        <path d="M 50 14 C 46 18, 46 22, 50 24 C 54 22, 54 18, 50 14 Z" />
        <path d="M 50 36 C 36 36, 24 44, 22 60 C 20 70, 28 74, 36 70 C 42 66, 46 56, 50 50" />
        <path d="M 50 36 C 64 36, 76 44, 78 60 C 80 70, 72 74, 64 70 C 58 66, 54 56, 50 50" />
        <path d="M 28 56 C 38 54, 62 54, 72 56" />
        <path d="M 32 72 C 40 78, 60 78, 68 72" />
        <path d="M 36 76 L 64 76" />
      </g>
    ),
    chart: (
      <g fill="none" stroke={stroke} strokeWidth={sw} opacity="0.55">
        <circle cx="50" cy="50" r="38" />
        <circle cx="50" cy="50" r="28" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={50 + Math.cos(a) * 28}
              y1={50 + Math.sin(a) * 28}
              x2={50 + Math.cos(a) * 38}
              y2={50 + Math.sin(a) * 38}
            />
          );
        })}
        <line x1="12" y1="50" x2="88" y2="50" />
        <line x1="50" y1="12" x2="50" y2="88" />
        <text x="50" y="8" textAnchor="middle" style={{ fontFamily: "var(--display)", fontSize: 5, fill: stroke }}>
          ANNO MMXXVI
        </text>
      </g>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", ...style }}>
      {items[kind]}
    </svg>
  );
}

// ============== CropsSeal ==============
// Project hallmark — four lobes around a central fleur-de-lis. Each lobe holds
// an engraved glyph for one CROPS property (Censorship-resistant · Open-source ·
// Private · Secure). The letters themselves are not shown; the glyphs do the work.
// Used in every page footer, embedded in *.eth.limo static HTML, and at 96px as
// the closing demo frame.
export function CropsSeal({
  size = 32,
  color = "var(--gilded)",
  style = {},
  title = "censorship-resistant · open-source · private · secure",
}: {
  size?: number;
  color?: string;
  style?: CSSProperties;
  title?: string;
}) {
  // Stroke widths scale slightly with size so 24px doesn't look fragile and 96px doesn't look fat.
  const sw = size <= 28 ? 0.7 : size <= 48 ? 0.55 : 0.45;
  const innerSw = sw * 0.85;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "block", ...style }}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <g stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer hairline ring */}
        <circle cx="50" cy="50" r="44" />
        {/* Inner ring (lighter) */}
        <circle cx="50" cy="50" r="34" opacity="0.55" />
        {/* Four lobes — small petal-like protrusions at the cardinal points, sitting on the outer ring */}
        <path d="M 50 6 C 47 9, 47 12, 50 14 C 53 12, 53 9, 50 6 Z" />
        <path d="M 94 50 C 91 47, 88 47, 86 50 C 88 53, 91 53, 94 50 Z" />
        <path d="M 50 94 C 47 91, 47 88, 50 86 C 53 88, 53 91, 50 94 Z" />
        <path d="M 6 50 C 9 47, 12 47, 14 50 C 12 53, 9 53, 6 50 Z" />

        {/* Glyphs in each lobe quadrant — small, just inside the inner ring at 12/3/6/9 o'clock */}
        {/* TOP — broken chain (censorship-resistant) */}
        <g transform="translate(50,22)">
          <ellipse cx="-3.5" cy="0" rx="3" ry="2" />
          <ellipse cx="3.5" cy="0" rx="3" ry="2" opacity="0.5" />
          <line x1="-1" y1="-2.5" x2="1" y2="2.5" strokeWidth={innerSw * 1.5} />
        </g>

        {/* RIGHT — unfolded scroll (open-source) */}
        <g transform="translate(78,50)">
          <rect x="-5" y="-4" width="10" height="8" rx="0.6" />
          <line x1="-5" y1="-1.5" x2="5" y2="-1.5" opacity="0.55" />
          <line x1="-5" y1="0.5" x2="5" y2="0.5" opacity="0.55" />
          <line x1="-5" y1="2.5" x2="5" y2="2.5" opacity="0.55" />
        </g>

        {/* BOTTOM — sealed envelope (private) */}
        <g transform="translate(50,78)">
          <rect x="-5" y="-3" width="10" height="6" />
          <path d="M -5 -3 L 0 1 L 5 -3" />
          <circle cx="0" cy="2" r="1.1" fill={color} stroke="none" />
        </g>

        {/* LEFT — key (secure) */}
        <g transform="translate(22,50)">
          <circle cx="-2.2" cy="0" r="2.4" />
          <line x1="0.2" y1="0" x2="5" y2="0" />
          <line x1="3" y1="0" x2="3" y2="2" />
          <line x1="4.5" y1="0" x2="4.5" y2="1.5" />
        </g>

        {/* Central fleur-de-lis — smaller variant of FleurDeLis paths */}
        <g transform="translate(50,50)">
          <path d="M 0 -10 C 0 -5, 0 4, 0 8" strokeWidth={innerSw * 1.2} />
          <path d="M 0 -10 C -1.5 -8, -1.5 -6, 0 -5 C 1.5 -6, 1.5 -8, 0 -10 Z" strokeWidth={innerSw * 1.2} />
          <path d="M 0 -3 C -5 -3, -8 0, -9 4 C -9.5 7, -7.5 8, -5.5 6.5 C -3.5 5.5, -2 2, 0 1" strokeWidth={innerSw * 1.2} />
          <path d="M 0 -3 C 5 -3, 8 0, 9 4 C 9.5 7, 7.5 8, 5.5 6.5 C 3.5 5.5, 2 2, 0 1" strokeWidth={innerSw * 1.2} />
          <path d="M -7 1 C -3 0, 3 0, 7 1" strokeWidth={innerSw} />
          <path d="M -5 6 C -3 8, 3 8, 5 6" strokeWidth={innerSw} />
        </g>
      </g>
    </svg>
  );
}

// CropsSeal as a static HTML string — used by lib/swarm.ts so *.eth.limo profiles
// carry the same hallmark. Pure SVG, no React.
export const CROPS_SEAL_SVG = (size = 28, color = "#B79F4E"): string => `
<svg width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="censorship-resistant · open-source · private · secure" style="display:block">
  <title>censorship-resistant · open-source · private · secure</title>
  <g stroke="${color}" stroke-width="0.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="50" cy="50" r="44"/>
    <circle cx="50" cy="50" r="34" opacity="0.55"/>
    <path d="M 50 6 C 47 9, 47 12, 50 14 C 53 12, 53 9, 50 6 Z"/>
    <path d="M 94 50 C 91 47, 88 47, 86 50 C 88 53, 91 53, 94 50 Z"/>
    <path d="M 50 94 C 47 91, 47 88, 50 86 C 53 88, 53 91, 50 94 Z"/>
    <path d="M 6 50 C 9 47, 12 47, 14 50 C 12 53, 9 53, 6 50 Z"/>
    <g transform="translate(50,22)"><ellipse cx="-3.5" cy="0" rx="3" ry="2"/><ellipse cx="3.5" cy="0" rx="3" ry="2" opacity="0.5"/><line x1="-1" y1="-2.5" x2="1" y2="2.5" stroke-width="0.9"/></g>
    <g transform="translate(78,50)"><rect x="-5" y="-4" width="10" height="8" rx="0.6"/><line x1="-5" y1="-1.5" x2="5" y2="-1.5" opacity="0.55"/><line x1="-5" y1="0.5" x2="5" y2="0.5" opacity="0.55"/><line x1="-5" y1="2.5" x2="5" y2="2.5" opacity="0.55"/></g>
    <g transform="translate(50,78)"><rect x="-5" y="-3" width="10" height="6"/><path d="M -5 -3 L 0 1 L 5 -3"/><circle cx="0" cy="2" r="1.1" fill="${color}" stroke="none"/></g>
    <g transform="translate(22,50)"><circle cx="-2.2" cy="0" r="2.4"/><line x1="0.2" y1="0" x2="5" y2="0"/><line x1="3" y1="0" x2="3" y2="2"/><line x1="4.5" y1="0" x2="4.5" y2="1.5"/></g>
    <g transform="translate(50,50)">
      <path d="M 0 -10 C 0 -5, 0 4, 0 8" stroke-width="0.7"/>
      <path d="M 0 -10 C -1.5 -8, -1.5 -6, 0 -5 C 1.5 -6, 1.5 -8, 0 -10 Z" stroke-width="0.7"/>
      <path d="M 0 -3 C -5 -3, -8 0, -9 4 C -9.5 7, -7.5 8, -5.5 6.5 C -3.5 5.5, -2 2, 0 1" stroke-width="0.7"/>
      <path d="M 0 -3 C 5 -3, 8 0, 9 4 C 9.5 7, 7.5 8, 5.5 6.5 C 3.5 5.5, 2 2, 0 1" stroke-width="0.7"/>
      <path d="M -7 1 C -3 0, 3 0, 7 1" stroke-width="0.5"/>
      <path d="M -5 6 C -3 8, 3 8, 5 6" stroke-width="0.5"/>
    </g>
  </g>
</svg>`;

// ============== Quill ==============
export function Quill({ size = 16, color = "var(--gilded)" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M 3 17 L 14 6 C 16 4, 17 4, 17 6 C 17 8, 15 9, 13 11 L 4 18 Z" />
      <line x1="3" y1="17" x2="6" y2="14" />
      <path d="M 11 8 L 13 10" />
    </svg>
  );
}

// ============== CategoryChip ==============
export function CategoryChip({
  kind,
  label,
  active = false,
}: {
  kind: SigilKind;
  label: string;
  active?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: active ? "var(--ink)" : "transparent",
        color: active ? "var(--parchment)" : "var(--ink)",
        border: "0.5px solid var(--gilded)",
        borderRadius: 999,
        fontFamily: "var(--display)",
        fontSize: 11,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        fontWeight: 500,
      }}
    >
      <AlchemicalSigil
        kind={kind}
        size={16}
        frame={false}
        color={active ? "var(--parchment)" : "var(--ink)"}
      />
      {label}
    </span>
  );
}

// ============== FilterChip ==============
export function FilterChip({
  kind,
  label,
  active = false,
}: {
  kind?: SigilKind;
  label: string;
  active?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        background: active ? "var(--vermilion)" : "var(--bone)",
        color: active ? "var(--parchment)" : "var(--ink)",
        border: "0.5px solid var(--gilded)",
        borderRadius: 999,
        fontFamily: "var(--display)",
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        cursor: "pointer",
        flex: "0 0 auto",
      }}
    >
      {kind && (
        <AlchemicalSigil
          kind={kind}
          size={16}
          frame={false}
          color={active ? "var(--parchment)" : "var(--ink)"}
        />
      )}
      {label}
    </span>
  );
}
