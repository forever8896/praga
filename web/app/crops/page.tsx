"use client";

// /crops — the four-marks explainer. Single mobile-first page, opened from any
// CROPS hallmark in the footer. Each mark gets its own short paragraph.
import Link from "next/link";
import { CropsSeal, FleurDeLis } from "@/lib/ornaments";
import { Footer } from "@/lib/footer";
import { useT } from "@/lib/i18n";

export default function CropsPage() {
  const t = useT();
  return (
    <main style={{ minHeight: "calc(100vh - 80px)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 48px" }}>
        {/* Header — the seal at large */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <CropsSeal size={96} style={{ margin: "0 auto" }} />
          <div
            className="t-display"
            style={{
              fontSize: 11,
              letterSpacing: "0.4em",
              color: "var(--vermilion)",
              textTransform: "uppercase",
              marginTop: 16,
            }}
          >
            {t("crops.title")}
          </div>
          <div
            style={{
              borderTop: "0.5px solid var(--gilded)",
              borderBottom: "0.5px solid var(--gilded)",
              height: 5,
              width: 80,
              margin: "12px auto",
            }}
          />
          <p
            className="t-italic"
            style={{
              fontSize: 16,
              lineHeight: 1.65,
              color: "var(--ink-70)",
              maxWidth: 520,
              margin: "8px auto 0",
            }}
          >
            {t("crops.intro")}
          </p>
        </div>

        {/* Four marks */}
        <Mark
          glyph={<BrokenChain />}
          kicker={t("crops.cr.kicker")}
          title={t("crops.cr.title")}
          body={t("crops.cr.body")}
        />
        <Mark
          glyph={<Scroll />}
          kicker={t("crops.os.kicker")}
          title={t("crops.os.title")}
          body={t("crops.os.body")}
        />
        <Mark
          glyph={<SealedLetter />}
          kicker={t("crops.priv.kicker")}
          title={t("crops.priv.title")}
          body={t("crops.priv.body")}
        />
        <Mark
          glyph={<LionKey />}
          kicker={t("crops.sec.kicker")}
          title={t("crops.sec.title")}
          body={t("crops.sec.body")}
        />

        {/* Closing */}
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <FleurDeLis size={20} style={{ margin: "0 auto" }} />
          <p
            className="t-italic"
            style={{ fontSize: 13, color: "var(--ink-50)", marginTop: 8 }}
          >
            {t("crops.signature")}
          </p>
          <Link
            href="/"
            className="t-display"
            style={{
              display: "inline-block",
              marginTop: 20,
              fontSize: 11,
              letterSpacing: "0.3em",
              color: "var(--ink-70)",
              textDecoration: "none",
              borderBottom: "0.5px solid var(--gilded)",
              paddingBottom: 2,
            }}
          >
            {t("crops.back")}
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}

function Mark({
  glyph,
  kicker,
  title,
  body,
}: {
  glyph: React.ReactNode;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <section
      style={{
        display: "flex",
        gap: 18,
        padding: "20px 0",
        borderBottom: "0.5px solid var(--gilded)",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          width: 56,
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "0.5px solid var(--gilded)",
          borderRadius: 999,
          background: "var(--bone)",
        }}
      >
        {glyph}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="t-display"
          style={{
            fontSize: 10,
            letterSpacing: "0.35em",
            color: "var(--vermilion)",
            textTransform: "uppercase",
          }}
        >
          {kicker}
        </div>
        <h2
          className="t-display"
          style={{
            fontSize: 22,
            letterSpacing: "0.04em",
            margin: "4px 0 8px",
            fontWeight: 500,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: "var(--ink)",
            margin: 0,
          }}
        >
          {body}
        </p>
      </div>
    </section>
  );
}

// Larger versions of the four lobe glyphs from the CropsSeal — same DNA but legible at 40px.
const STROKE = "var(--ink)";
const SW = 1;

function BrokenChain() {
  return (
    <svg width="32" height="32" viewBox="-20 -20 40 40" fill="none" stroke={STROKE} strokeWidth={SW} strokeLinecap="round">
      <ellipse cx="-7" cy="0" rx="6" ry="4" />
      <ellipse cx="7" cy="0" rx="6" ry="4" opacity="0.5" />
      <line x1="-2" y1="-5" x2="2" y2="5" strokeWidth={SW * 1.6} />
    </svg>
  );
}

function Scroll() {
  return (
    <svg width="32" height="32" viewBox="-20 -20 40 40" fill="none" stroke={STROKE} strokeWidth={SW} strokeLinecap="round">
      <rect x="-10" y="-8" width="20" height="16" rx="1.2" />
      <line x1="-10" y1="-3" x2="10" y2="-3" opacity="0.6" />
      <line x1="-10" y1="1" x2="10" y2="1" opacity="0.6" />
      <line x1="-10" y1="5" x2="10" y2="5" opacity="0.6" />
    </svg>
  );
}

function SealedLetter() {
  return (
    <svg width="32" height="32" viewBox="-20 -20 40 40" fill="none" stroke={STROKE} strokeWidth={SW} strokeLinecap="round">
      <rect x="-10" y="-6" width="20" height="12" />
      <path d="M -10 -6 L 0 2 L 10 -6" />
      <circle cx="0" cy="3.5" r="2.2" fill="var(--vermilion)" stroke="none" />
    </svg>
  );
}

function LionKey() {
  return (
    <svg width="32" height="32" viewBox="-20 -20 40 40" fill="none" stroke={STROKE} strokeWidth={SW} strokeLinecap="round">
      <circle cx="-4.5" cy="0" r="5" />
      <line x1="0.5" y1="0" x2="11" y2="0" />
      <line x1="6" y1="0" x2="6" y2="4" />
      <line x1="9" y1="0" x2="9" y2="3" />
    </svg>
  );
}
