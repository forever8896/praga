// Shared profile primitives used by both /[ensName] (public profile) and /me/edit (authenticated edit).
import { AlchemicalSigil, FleurDeLis, WaxSeal, type SigilKind } from "./ornaments";
import type { Receipt } from "./data";

export function PortraitRoundel({ size = 220 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, position: "relative", display: "inline-block" }}>
      <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%", display: "block" }}>
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="var(--ink)" strokeWidth="0.6" opacity="0.55" />
          </pattern>
          <clipPath id="roundel">
            <circle cx="100" cy="100" r="95" />
          </clipPath>
        </defs>
        <circle cx="100" cy="100" r="98" fill="var(--bone)" stroke="var(--gilded)" strokeWidth="0.8" />
        <circle cx="100" cy="100" r="93" fill="none" stroke="var(--gilded)" strokeWidth="0.4" opacity="0.5" />
        <g clipPath="url(#roundel)">
          <rect x="0" y="0" width="200" height="200" fill="url(#hatch)" />
          <ellipse cx="100" cy="80" rx="38" ry="44" fill="var(--bone)" stroke="var(--ink)" strokeWidth="1" />
          <path d="M 40 200 C 40 150, 60 130, 100 130 C 140 130, 160 150, 160 200 Z" fill="var(--bone)" stroke="var(--ink)" strokeWidth="1" />
          <path d="M 80 70 C 84 66, 90 66, 92 70" stroke="var(--ink)" strokeWidth="0.8" fill="none" />
          <path d="M 108 70 C 112 66, 118 66, 120 70" stroke="var(--ink)" strokeWidth="0.8" fill="none" />
          <path d="M 90 92 C 95 96, 105 96, 110 92" stroke="var(--ink)" strokeWidth="0.8" fill="none" />
          <path d="M 100 78 L 100 88 L 96 90" stroke="var(--ink)" strokeWidth="0.8" fill="none" />
          <path d="M 50 200 C 60 170, 80 160, 100 160" stroke="var(--ink)" strokeWidth="0.4" fill="none" opacity="0.5" />
          <path d="M 150 200 C 140 170, 120 160, 100 160" stroke="var(--ink)" strokeWidth="0.4" fill="none" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

export function StarRating({ rating = 5, size = 14 }: { rating?: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 16 16">
          {i < rating ? (
            <g>
              <circle cx="8" cy="8" r="3" fill="var(--vermilion)" />
              <circle cx="8" cy="8" r="5" fill="none" stroke="var(--vermilion)" strokeWidth="0.6" />
              {Array.from({ length: 8 }).map((_, j) => {
                const a = (j / 8) * Math.PI * 2;
                return (
                  <line
                    key={j}
                    x1={8 + Math.cos(a) * 5.5}
                    y1={8 + Math.sin(a) * 5.5}
                    x2={8 + Math.cos(a) * 7}
                    y2={8 + Math.sin(a) * 7}
                    stroke="var(--vermilion)"
                    strokeWidth="0.6"
                  />
                );
              })}
            </g>
          ) : (
            <circle cx="8" cy="8" r="5" fill="none" stroke="var(--ink-30)" strokeWidth="0.5" />
          )}
        </svg>
      ))}
    </span>
  );
}

export function ReceiptStrip({ r }: { r: Receipt }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 0", borderBottom: "0.5px solid var(--gilded)" }}>
      <WaxSeal size={48} state="rubedo" rotate={(r.task.length % 12) - 6} emboss="fleur" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-body" style={{ fontSize: 15, color: "var(--ink)", lineHeight: 1.35 }}>{r.task}</div>
        <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)", marginTop: 2 }}>
          for <span className="t-mono" style={{ fontSize: 12, fontStyle: "normal" }}>{r.from}</span> · {r.date}
        </div>
      </div>
      <StarRating rating={r.stars} />
    </div>
  );
}

export function ProfileHeader({ size = "desktop", name = "Kilian PragueConnect", ens = "kilian.skol.eth" }: { size?: "mobile" | "desktop"; name?: string; ens?: string }) {
  const display = size === "mobile" ? 36 : 96;
  const sub = size === "mobile" ? 12 : 16;
  return (
    <div style={{ position: "relative", textAlign: "center", padding: size === "mobile" ? "24px 0 12px" : "40px 0 28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: size === "mobile" ? 14 : 32 }}>
        <FleurDeLis size={size === "mobile" ? 22 : 36} />
        <div className="t-display" style={{ fontSize: sub, letterSpacing: "0.4em", color: "var(--vermilion)" }}>By the hand of</div>
        <FleurDeLis size={size === "mobile" ? 22 : 36} />
      </div>
      <div className="t-display" style={{ fontSize: display, letterSpacing: "0.04em", lineHeight: 1, marginTop: size === "mobile" ? 6 : 14 }}>{name}</div>
      <div className="t-mono" style={{ fontSize: size === "mobile" ? 12 : 15, color: "var(--ink-70)", marginTop: size === "mobile" ? 6 : 12 }}>{ens}</div>
      <div className="hr-double" style={{ width: size === "mobile" ? 80 : 180, margin: size === "mobile" ? "14px auto 0" : "20px auto 0" }} />
    </div>
  );
}

export interface SkillRow {
  kind: SigilKind;
  name: string;
  price: string;
}

export const DEFAULT_SKILLS: SkillRow[] = [
  { kind: "forge", name: "Bicycles, knives, small electrics", price: "from 200 Kč" },
  { kind: "forge", name: "Hanging shelves, simple plumbing", price: "from 350 Kč" },
  { kind: "alembic", name: "Standing in queues for you", price: "120 Kč / hr" },
  { kind: "venus", name: "Coffee on Saturday mornings", price: "free · gift" },
];

export function ProfileSkillsCatalogue({ compact = false, skills = DEFAULT_SKILLS }: { compact?: boolean; skills?: SkillRow[] }) {
  return (
    <div>
      <div className="t-display" style={{ fontSize: 12, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 4 }}>The catalogue</div>
      <div className="t-display" style={{ fontSize: compact ? 22 : 32, letterSpacing: "0.04em", marginBottom: 16 }}>Skills offered</div>
      {skills.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderTop: i === 0 ? "0.5px solid var(--gilded)" : "none", borderBottom: "0.5px solid var(--gilded)" }}>
          <AlchemicalSigil kind={s.kind} size={compact ? 36 : 44} />
          <div style={{ flex: 1 }}>
            <div className="t-body" style={{ fontSize: compact ? 15 : 17, color: "var(--ink)" }}>{s.name}</div>
          </div>
          <div className="t-display" style={{ fontSize: compact ? 13 : 15, letterSpacing: "0.15em", color: "var(--ink-70)" }}>{s.price}</div>
        </div>
      ))}
    </div>
  );
}
