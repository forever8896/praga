// Screen 11 — System spec sheet (one illuminated leaf). Dev/reference route.
// Ported from /design/screen-spec.jsx.
import type { ReactNode } from "react";
import { AlchemicalSigil, Cartouche, FleurDeLis, Marginalia, WaxSeal, type SigilKind } from "@/lib/ornaments";

const PIGMENTS = [
  { name: "Ink", hex: "#0F0E0C", role: "Text · primary surface in dark" },
  { name: "Parchment", hex: "#F4ECD8", role: "Primary background" },
  { name: "Bone", hex: "#E6DCC4", role: "Card lift on parchment" },
  { name: "Vermilion", hex: "#B23A2F", role: "Bohemian seal red · primary accent" },
  { name: "Lapis", hex: "#1F3A6E", role: "Royal blue · links" },
  { name: "Gilded", hex: "#C8A24A", role: "Hairlines · hallmarks · fleur" },
  { name: "Verdigris", hex: "#3E6B5A", role: "Bohemian crystal · success" },
];

const TRADES: [SigilKind, string, string][] = [
  ["forge", "Repair · the Forge", "♂"],
  ["mercury", "Language · Mercury", "☿"],
  ["sulphur", "Cooking · Sulphur", "🜍"],
  ["caduceus", "Rides · Caduceus", "⚕"],
  ["saturn", "Tutoring · Saturn", "♄"],
  ["venus", "Gifts · Venus", "♀"],
  ["alembic", "Errands · Alembic", "⚗"],
];

function SpecBlock({ number, title, sub, children }: { number: string; title: string; sub: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 40, paddingTop: 24, borderTop: "0.5px solid var(--gilded)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div className="t-display" style={{ fontSize: 13, letterSpacing: "0.3em", color: "var(--vermilion)" }}>§ {number}</div>
        <div className="t-display" style={{ fontSize: 24, letterSpacing: "0.04em" }}>{title}</div>
        <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", marginLeft: "auto", textAlign: "right", maxWidth: 460 }}>{sub}</div>
      </div>
      {children}
    </section>
  );
}

function SpecTypeRow({ label, role, children }: { label: string; role: string; children: ReactNode }) {
  return (
    <div>
      <div className="t-mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--ink-70)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "0.5px solid var(--gilded)", minHeight: 110 }}>{children}</div>
      <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)", marginTop: 10 }}>{role}</div>
    </div>
  );
}

export default function SpecPage() {
  return (
    <div className="parchment-surface" style={{ width: "100%", minHeight: "100vh", padding: "64px 80px", position: "relative", fontFamily: "var(--body)", color: "var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div className="t-mono" style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--ink-50)" }}>PRAGA · ANNO MMXXVI · PRAGUE</div>
        <div className="t-mono" style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--ink-50)" }}>SYSTEM · SPEC · LEAF I</div>
      </div>
      <div className="hr-double" style={{ marginBottom: 24 }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, gap: 32 }}>
        <div style={{ flex: 1 }}>
          <div className="t-display" style={{ fontSize: 13, letterSpacing: "0.4em", color: "var(--vermilion)", marginBottom: 6 }}>The Rudolfine Workshop</div>
          <div className="t-display" style={{ fontSize: 64, letterSpacing: "0.04em", lineHeight: 0.95 }}>System Spec</div>
          <div className="t-italic" style={{ fontSize: 17, color: "var(--ink-70)", marginTop: 8, maxWidth: 560 }}>
            Pigments, type, sigils, ornaments, seals — every part the craftsman keeps within reach.
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <FleurDeLis size={56} />
          <WaxSeal size={88} state="rubedo" rotate={-8} emboss="fleur" label="PRAGA · VERIFIED ·" />
        </div>
      </div>

      <SpecBlock number="I" title="Pigments — not light" sub="No gradients. No neon. Color comes from the workshop, not the screen.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 18 }}>
          {PIGMENTS.map((p) => (
            <div key={p.name}>
              <div style={{ width: "100%", aspectRatio: "1 / 1.2", background: p.hex, border: "0.5px solid var(--gilded)", position: "relative" }}>
                <div style={{ position: "absolute", inset: 4, border: "0.4px solid", borderColor: "rgba(244,236,216,0.2)" }} />
              </div>
              <div className="t-display" style={{ fontSize: 13, letterSpacing: "0.16em", marginTop: 10 }}>{p.name}</div>
              <div className="t-mono" style={{ fontSize: 10, color: "var(--ink-70)", marginTop: 2 }}>{p.hex}</div>
              <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)", marginTop: 4, lineHeight: 1.3 }}>{p.role}</div>
            </div>
          ))}
        </div>
      </SpecBlock>

      <SpecBlock number="II" title="Type — the chiseled, the hand, the metal" sub="Four registers. Each does typographic work or is removed.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <SpecTypeRow label="Display · Cormorant SC" role="Section titles · ENS on profile · 'chiseled inscription'">
            <div className="t-display" style={{ fontSize: 56, letterSpacing: "0.05em", lineHeight: 1 }}>Kilian Praga</div>
            <div className="t-display" style={{ fontSize: 22, letterSpacing: "0.16em", marginTop: 8, color: "var(--ink-70)" }}>BY THIS RECEIPT</div>
          </SpecTypeRow>
          <SpecTypeRow label="Body · EB Garamond" role="All human-written copy · italic real, descenders long">
            <div className="t-body" style={{ fontSize: 22, lineHeight: 1.4 }}>I will fix your bicycle in Žižkov by sundown.</div>
            <div className="t-italic" style={{ fontSize: 18, lineHeight: 1.5, marginTop: 8, color: "var(--ink-70)" }}>
              Bring it past the church on Krásova; the door is the green one with the brass bell.
            </div>
          </SpecTypeRow>
          <SpecTypeRow label="Ceremonial · UnifrakturCook" role="One or two moments per screen · masthead, wax seal verification">
            <div className="t-cer" style={{ fontSize: 38, lineHeight: 1.05 }}>Verus Sigillum</div>
            <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)", marginTop: 6 }}>Never for anything that has to be read fast.</div>
          </SpecTypeRow>
          <SpecTypeRow label="Data · JetBrains Mono" role="ENS strings · attestation hashes · 'the metal'">
            <div className="t-mono" style={{ fontSize: 18 }}>kilian.praga.eth</div>
            <div className="t-mono" style={{ fontSize: 13, color: "var(--ink-70)", marginTop: 6 }}>attest · 0x9af3…b21c · sealed at 14:22 CET</div>
          </SpecTypeRow>
        </div>
      </SpecBlock>

      <SpecBlock number="III" title="Alchemical sigils — the seven trades" sub="Engraved line glyphs in gilded hairline frames. Never filled.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {TRADES.map(([kind, name, gly]) => (
            <div key={kind} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, border: "0.5px solid var(--gilded)" }}>
              <AlchemicalSigil kind={kind} size={56} />
              <div>
                <div className="t-display" style={{ fontSize: 14, letterSpacing: "0.18em" }}>{name}</div>
                <div className="t-mono" style={{ fontSize: 11, color: "var(--ink-70)", marginTop: 4 }}>{gly}</div>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, border: "0.5px dashed var(--gilded)", opacity: 0.5 }}>
            <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)" }}>The eighth slot is reserved for the pigment that has not yet been ground.</div>
          </div>
        </div>
      </SpecBlock>

      <SpecBlock number="IV" title="Fleur-de-lis — four variants, no wallpaper" sub="Maximum two per screen on mobile. Four on desktop. If it isn't earning its place, remove it.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {[
            ["Standard", "var(--gilded)", "transparent"],
            ["Inverted", "var(--parchment)", "var(--ink)"],
            ["Vermilion", "var(--vermilion)", "transparent"],
            ["Verified", "var(--gilded)", "var(--vermilion)"],
          ].map(([n, fg, bg]) => (
            <div key={n} style={{ aspectRatio: "1.4 / 1", background: bg, border: "0.5px solid var(--gilded)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 12 }}>
              <FleurDeLis size={48} stroke={fg} />
              <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.2em", color: bg === "transparent" ? "var(--ink)" : "var(--parchment)" }}>{n}</div>
            </div>
          ))}
        </div>
      </SpecBlock>

      <SpecBlock number="V" title="The Magnum Opus — escrow as alchemical work" sub="The four phases of the Great Work map onto escrow states. This is the showpiece.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {([
            ["Funded", "Nigredo · the blackening", "nigredo", "crescent", "Dark wax circle, unbroken."],
            ["In progress", "Albedo · the whitening", "albedo", "crescent", "Lunar crescent inside the wax."],
            ["Delivered", "Citrinitas · the yellowing", "citrinitas", "sun", "Solar disc inside the wax."],
            ["Released", "Rubedo · the reddening", "rubedo", "fleur", "Final stamped seal — fleur pressed in."],
          ] as const).map(([state, phase, k, em, desc], i) => (
            <div key={k} style={{ background: "var(--bone)", padding: 24, border: "0.5px solid var(--gilded)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <WaxSeal size={140} state={k} rotate={[-8, -3, 5, -6][i]} emboss={em} label={`${state.toUpperCase()} · PRAGA ·`} />
              <div className="t-display" style={{ fontSize: 16, letterSpacing: "0.2em", marginTop: 16 }}>{state}</div>
              <div className="t-mono" style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--ink-70)", marginTop: 6 }}>{phase.toUpperCase()}</div>
              <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)", marginTop: 10, lineHeight: 1.4 }}>{desc}</div>
            </div>
          ))}
        </div>
      </SpecBlock>

      <SpecBlock number="VI" title="Cartouche & marginalia" sub="Cartouches frame profile cards and reputation receipts. Marginalia ride only the desktop margins.">
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 28 }}>
          <Cartouche tone="bone" style={{ minHeight: 240 }} padding={36}>
            <div className="t-display" style={{ fontSize: 12, letterSpacing: "0.3em", color: "var(--vermilion)" }}>Cartouche · example</div>
            <div className="t-display" style={{ fontSize: 28, letterSpacing: "0.05em", marginTop: 6 }}>Kilian Praga</div>
            <div className="t-mono" style={{ fontSize: 13, marginTop: 4, color: "var(--ink-70)" }}>kilian.praga.eth</div>
            <div className="t-italic" style={{ fontSize: 14, marginTop: 14, lineHeight: 1.5, maxWidth: 420, color: "var(--ink-70)" }}>
              The asymmetric scrollwork is engraved in 0.5pt gilded hairline. The frame should look chiseled into the page, not stickered onto it.
            </div>
          </Cartouche>
          <div style={{ background: "var(--bone)", border: "0.5px solid var(--gilded)", padding: 24, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, alignItems: "center" }}>
            <Marginalia kind="squaredcircle" size={84} />
            <Marginalia kind="constellation" size={84} />
            <Marginalia kind="astrolog" size={84} />
            <Marginalia kind="alembicDiagram" size={84} />
            <Marginalia kind="pragueMap" size={84} />
            <Marginalia kind="chart" size={84} />
          </div>
        </div>
      </SpecBlock>

      <div className="hr-double" style={{ marginTop: 40 }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, gap: 24 }}>
        <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)" }}>
          Banned in copy:{" "}
          <span className="t-mono" style={{ fontSize: 12 }}>wallet · gas · nonce · tx · hash · mint · revert · network · chain · address</span>.
          Replace with: account, fee (sponsored), receipt, attestation, sealed, returned, ledger, name.
        </div>
        <FleurDeLis size={20} />
      </div>
    </div>
  );
}
