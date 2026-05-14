// SealPortrait — a wax-seal-shaped identicon deterministically derived from a
// wallet address. Replaces the generic PortraitRoundel sketch so every user
// gets a distinct visual without uploading anything. If they DO set an
// `avatar` text record (URL), that image takes over inside the same wax frame.
//
// Determinism: the address's first three bytes pick the sigil, the wax state
// and a rotation in roughly [-12°, +12°]. So two visits to the same name
// always see the same seal, but different names look different.
import {
  AlchemicalSigil,
  type SigilKind,
  type WaxState,
} from "./ornaments";

const SIGIL_KINDS: SigilKind[] = [
  "forge",
  "alembic",
  "venus",
  "mercury",
  "saturn",
  "caduceus",
  "sulphur",
];

// "broken" is reserved for the error state of WaxSeal — never assigned by the
// identicon. The four kept states map onto the Magnum Opus phases for
// thematic continuity with the escrow panel.
const WAX_STATES: WaxState[] = ["rubedo", "citrinitas", "albedo", "nigredo"];

const WAX_PALETTES: Record<WaxState, { wax: string; edge: string; sigil: string }> = {
  rubedo: { wax: "#B23A2F", edge: "#7A2218", sigil: "#F4ECD8" },
  citrinitas: { wax: "#221F18", edge: "#100E09", sigil: "#C8A24A" },
  albedo: { wax: "#1A1814", edge: "#0A0908", sigil: "#E6DCC4" },
  nigredo: { wax: "#1A1814", edge: "#0A0908", sigil: "#7B6F58" },
  broken: { wax: "#7A2218", edge: "#3A0F0A", sigil: "#F4ECD8" },
};

function pick<T>(arr: T[], n: number): T {
  return arr[Math.abs(n) % arr.length];
}

function addressBytes(addr: string): number[] {
  const hex = addr.replace(/^0x/i, "").toLowerCase();
  const out: number[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) {
    out.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

export interface IdenticonChoice {
  sigil: SigilKind;
  state: WaxState;
  rotate: number;
  seed: number;
}

export function identiconFromAddress(
  address: string | null | undefined,
): IdenticonChoice {
  if (!address || !/^0x[0-9a-fA-F]+$/.test(address)) {
    return { sigil: "forge", state: "rubedo", rotate: 0, seed: 7 };
  }
  const b = addressBytes(address);
  return {
    sigil: pick(SIGIL_KINDS, b[0] ?? 0),
    state: pick(WAX_STATES, b[1] ?? 0),
    rotate: ((b[2] ?? 0) % 25) - 12,
    seed: ((b[3] ?? 0) * 256 + (b[4] ?? 0)) || 7,
  };
}

/** A wavy wax-seal polygon, seeded so each address gets its own edge texture
 *  but the same name always lands at the same polygon. */
function wavyEdgePoints(seed: number, N = 36, r = 50, jitter = 1.6): string {
  const pts: string[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const noise =
      (Math.sin(i * 1.7 + seed) * 0.5 +
        Math.cos(i * 2.3 + seed * 2) * 0.5) *
      jitter;
    const rad = r + noise;
    pts.push(`${50 + Math.cos(a) * rad},${50 + Math.sin(a) * rad}`);
  }
  return pts.join(" ");
}

export function SealPortrait({
  address,
  avatarUrl,
  size = 200,
  label,
}: {
  address: string | null | undefined;
  avatarUrl?: string | null;
  size?: number;
  label?: string;
}) {
  const id = identiconFromAddress(address);
  const palette = WAX_PALETTES[id.state];
  const edge = wavyEdgePoints(id.seed);
  const gradId = `seal-grad-${(address ?? "x").slice(-6)}-${id.state}`;
  const pathId = `seal-path-${(address ?? "x").slice(-6)}`;
  const clipId = `seal-clip-${(address ?? "x").slice(-6)}`;
  const sigilFrac = label ? 0.42 : 0.5;
  const sigilSize = Math.round(size * sigilFrac);

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "inline-block",
      }}
      role="img"
      aria-label={
        label ??
        (address
          ? `seal portrait derived from ${address.slice(0, 6)}…${address.slice(
              -4,
            )}`
          : "seal portrait")
      }
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        style={{ display: "block", transform: `rotate(${id.rotate}deg)` }}
      >
        <defs>
          <radialGradient id={gradId} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor={palette.wax} stopOpacity="1" />
            <stop offset="60%" stopColor={palette.wax} stopOpacity="1" />
            <stop offset="100%" stopColor={palette.edge} stopOpacity="1" />
          </radialGradient>
          <clipPath id={clipId}>
            <polygon points={edge} />
          </clipPath>
          {label && (
            <path
              id={pathId}
              d="M 50 50 m -42 0 a 42 42 0 1 1 84 0 a 42 42 0 1 1 -84 0"
            />
          )}
        </defs>

        {/* The wax body */}
        <polygon
          points={edge}
          fill={`url(#${gradId})`}
          stroke={palette.edge}
          strokeWidth="0.4"
        />

        {/* Highlight blob in upper-left for that warm-wax feel */}
        <ellipse
          cx="38"
          cy="32"
          rx="14"
          ry="6"
          fill={palette.sigil}
          opacity="0.06"
        />

        {/* Two faint concentric rings for the engraved-stamp look */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={palette.sigil}
          strokeWidth="0.5"
          opacity="0.45"
        />
        <circle
          cx="50"
          cy="50"
          r="36"
          fill="none"
          stroke={palette.sigil}
          strokeWidth="0.3"
          opacity="0.28"
        />

        {/* Optional circular label running around the edge */}
        {label && (
          <g
            style={{
              fontFamily: "var(--display)",
              fontSize: 5,
              letterSpacing: "0.22em",
              fill: palette.sigil,
              textTransform: "uppercase",
            }}
            opacity="0.85"
          >
            <text>
              <textPath
                href={`#${pathId}`}
                startOffset="25%"
                textAnchor="middle"
              >
                {label}
              </textPath>
            </text>
          </g>
        )}

        {/* User-provided avatar image, clipped to the wavy seal shape */}
        {avatarUrl && (
          <image
            href={avatarUrl}
            x="6"
            y="6"
            width="88"
            height="88"
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
        )}
      </svg>

      {/* Sigil emboss — overlaid as an HTML span so the AlchemicalSigil's
       *  CSS mask-image stays sharp. Hidden when a user avatar is shown. */}
      {!avatarUrl && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `rotate(${id.rotate}deg)`,
            pointerEvents: "none",
          }}
        >
          <AlchemicalSigil
            kind={id.sigil}
            size={sigilSize}
            frame={false}
            color={palette.sigil}
          />
        </span>
      )}
    </div>
  );
}
