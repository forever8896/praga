// Shared profile primitives used by both /[ensName] (public profile) and /me/edit (authenticated edit).
import { FleurDeLis } from "./ornaments";

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

export function ProfileHeader({ size = "desktop", name, ens }: { size?: "mobile" | "desktop"; name: string; ens: string }) {
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
