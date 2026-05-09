// Screen 1 — Landing / onboarding — Claim your name in Prague.
// Ported from /design/screen-onboarding.jsx.
"use client";
import Image from "next/image";
import { Cartouche, FleurDeLis } from "@/lib/ornaments";
import { OnboardingForm } from "@/lib/onboarding-form";
import { InviterCapture, InviterAcknowledgement } from "@/lib/inheritance-tab";
import { useT } from "@/lib/i18n";

function PragueSilhouette({ opacity = 0.18 }: { opacity?: number }) {
  return (
    <svg
      viewBox="0 0 1440 220"
      preserveAspectRatio="xMidYMax meet"
      style={{ width: "100%", height: "auto", display: "block", opacity }}
    >
      <g fill="none" stroke="var(--ink)" strokeWidth="0.8" strokeLinecap="round">
        <path d="M 0 200 C 200 196, 380 198, 540 200 C 700 202, 860 198, 1040 200 C 1220 202, 1340 198, 1440 200" />
        <path d="M 0 206 C 220 210, 480 206, 720 208 C 960 210, 1200 206, 1440 208" opacity="0.6" />
        <path d="M 80 130 L 120 110 L 160 110 L 160 90 L 200 90 L 200 110 L 240 110 L 240 90 L 280 90 L 280 110 L 320 110 L 360 130 L 360 200 L 80 200 Z" />
        <line x1="180" y1="84" x2="180" y2="90" />
        <line x1="220" y1="80" x2="220" y2="90" />
        <line x1="260" y1="84" x2="260" y2="90" />
        <path d="M 220 90 L 220 60 L 215 56 L 220 52 L 225 56 L 220 60" />
        <path d="M 240 90 L 240 50 L 234 44 L 240 38 L 246 44 L 240 50" />
        <path d="M 260 90 L 260 64 L 256 60 L 260 56 L 264 60 L 260 64" />
        <path d="M 420 200 L 420 170 L 470 170 L 470 200 M 470 200 L 470 170 L 540 170 L 540 200 M 540 200 L 540 170 L 610 170 L 610 200 M 610 200 L 610 170 L 680 170 L 680 200 M 680 200 L 680 170 L 750 170 L 750 200 M 750 200 L 750 170 L 820 170 L 820 200 M 820 200 L 820 170 L 880 170 L 880 200" />
        <path d="M 420 170 C 444 158, 470 158, 470 170 M 470 170 C 504 158, 540 158, 540 170 M 540 170 C 574 158, 610 158, 610 170 M 610 170 C 644 158, 680 158, 680 170 M 680 170 C 714 158, 750 158, 750 170 M 750 170 C 784 158, 820 158, 820 170 M 820 170 C 850 158, 880 158, 880 170" />
        <path d="M 380 200 L 380 130 L 392 130 L 392 122 L 408 122 L 408 130 L 420 130 L 420 200 Z" />
        <path d="M 396 122 L 396 110 L 404 110 L 404 122" />
        <path d="M 880 200 L 880 130 L 892 130 L 892 122 L 908 122 L 908 130 L 920 130 L 920 200 Z" />
        <path d="M 896 122 L 896 110 L 904 110 L 904 122" />
        <path d="M 1000 200 L 1000 140 L 1040 140 L 1040 200" />
        <path d="M 1010 140 L 1010 110 L 1015 105 L 1010 100 L 1020 95 L 1030 100 L 1025 105 L 1030 110 L 1030 140" />
        <path d="M 1080 200 L 1080 130 L 1110 130 L 1110 200" />
        <path d="M 1085 130 L 1085 100 L 1090 96 L 1085 92 L 1095 88 L 1105 92 L 1100 96 L 1105 100 L 1105 130" />
        <path d="M 1180 200 L 1180 110 L 1220 110 L 1220 200 Z" />
        <path d="M 1188 110 L 1188 90 L 1212 90 L 1212 110" />
        <circle cx="1200" cy="150" r="10" />
        <line x1="1200" y1="150" x2="1200" y2="142" />
        <line x1="1200" y1="150" x2="1206" y2="153" />
        <path d="M 1290 200 L 1290 160 L 1310 160 L 1310 200 M 1300 160 L 1300 140 L 1305 134 L 1300 130 L 1310 126 L 1320 130 L 1315 134 L 1320 140 L 1320 160 L 1340 160 L 1340 200" />
        <path d="M 320 60 C 326 56, 332 56, 338 60" opacity="0.7" />
        <path d="M 380 80 C 386 76, 392 76, 398 80" opacity="0.7" />
        <path d="M 460 50 C 466 46, 472 46, 478 50" opacity="0.7" />
      </g>
    </svg>
  );
}

function ENSInscription({ value, size = "lg" }: { value?: string; size?: "lg" | "md" | "sm" }) {
  const fontSize = size === "lg" ? 56 : size === "md" ? 36 : 26;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "center",
        fontFamily: "var(--mono)",
        fontSize,
        color: "var(--ink)",
        letterSpacing: "-0.01em",
        fontWeight: 400,
      }}
    >
      <span
        style={{
          borderBottom: "0.5px solid var(--gilded)",
          minWidth: 200,
          textAlign: "right",
          paddingRight: 6,
          paddingBottom: 4,
          color: value ? "var(--ink)" : "var(--ink-30)",
        }}
      >
        {value || "kilian"}
      </span>
      <span style={{ color: "var(--ink-50)" }}>.pragueconnect.eth</span>
    </div>
  );
}

function MobileOnboarding() {
  const t = useT();
  return (
    <div className="parchment-surface mobile-only" style={{ width: "100%", minHeight: "100vh", position: "relative", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, padding: "32px 32px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <Image
          src="/logo.png"
          alt="PragueConnect"
          width={300}
          height={200}
          priority
          style={{ height: 92, width: "auto", display: "block", marginBottom: 4 }}
        />
        <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)" }}>est. anno mmxxvi · Praha</div>
        <div className="hr-double" style={{ width: 48, marginTop: 16, marginBottom: 28 }} />

        <div className="t-display" style={{ fontSize: 30, letterSpacing: "0.05em", lineHeight: 1.05, marginBottom: 14 }}>{t("home.headline.line1")}<br />{t("home.headline.italic")} {t("home.headline.line2")}</div>
        <div className="t-italic" style={{ fontSize: 16, color: "var(--ink-70)", lineHeight: 1.5, maxWidth: 280, marginBottom: 22 }}>{t("home.subhead.mobile")}</div>

        <InviterAcknowledgement />

        <OnboardingForm size="mobile" />

        <a href="/feed" className="t-italic" style={{ marginTop: 24, fontSize: 13, color: "var(--ink-70)", textDecoration: "underline", textDecorationColor: "var(--gilded)", textUnderlineOffset: 4 }}>
          {t("home.browse")}
        </a>
      </div>
      <div style={{ marginTop: "auto" }}>
        <PragueSilhouette opacity={0.22} />
      </div>
    </div>
  );
}

function DesktopOnboarding() {
  const t = useT();
  return (
    <div className="parchment-surface desktop-only" style={{ width: "100%", minHeight: "100vh", position: "relative", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: 24 }} />

      <div style={{ flex: 1, padding: "48px 56px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
        <div>
          <div className="t-display" style={{ fontSize: 12, letterSpacing: "0.4em", color: "var(--vermilion)", marginBottom: 12 }}>{t("home.eyebrow")}</div>
          <div className="t-display" style={{ fontSize: 68, letterSpacing: "0.04em", lineHeight: 1.0 }}>
            {t("home.headline.line1")}<br />
            <span style={{ fontStyle: "italic", fontFamily: "var(--body)", fontWeight: 500, textTransform: "none", letterSpacing: "0.01em" }}>{t("home.headline.italic")} </span>
            {t("home.headline.line2")}
          </div>
          <div className="t-italic" style={{ fontSize: 20, color: "var(--ink-70)", marginTop: 20, lineHeight: 1.5, maxWidth: 520 }}>
            {t("home.subhead")}
          </div>
          <div style={{ marginTop: 36, display: "flex", gap: 20, alignItems: "center" }}>
            <FleurDeLis size={20} />
            <span className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)", letterSpacing: "0.1em" }}>{t("home.assurances")}</span>
          </div>
          <a href="/feed" className="t-italic" style={{ display: "inline-block", marginTop: 24, fontSize: 16, color: "var(--ink-70)", textDecoration: "underline", textDecorationColor: "var(--gilded)", textUnderlineOffset: 4 }}>
            {t("home.browse")}
          </a>
        </div>

        <Cartouche tone="bone" padding={48}>
          <div className="t-display" style={{ fontSize: 12, letterSpacing: "0.3em", color: "var(--vermilion)", textAlign: "center", marginBottom: 18 }}>{t("home.hero.kicker")}</div>
          <InviterAcknowledgement />
          <OnboardingForm size="desktop" />
        </Cartouche>
      </div>

      <div style={{ marginTop: 24 }}>
        <PragueSilhouette opacity={0.2} />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <>
      <InviterCapture />
      <MobileOnboarding />
      <DesktopOnboarding />
    </>
  );
}
