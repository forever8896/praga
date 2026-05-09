// /  — Onboarding (the gate). Single responsive layout (no mobile/desktop fork).
// Visual system ported from the Claude Design handoff. The actual claim flow
// — Privy auth, name claim, stealth derivation, beats 3-5 — lives in
// OnboardingForm; this file is the parchment around it.
"use client";
import Image from "next/image";
import { CropsSeal, FleurDeLis } from "@/lib/ornaments";
import { OnboardingForm } from "@/lib/onboarding-form";
import { InviterCapture, InviterAcknowledgement } from "@/lib/inheritance-tab";
import { useT, useI18n } from "@/lib/i18n";

export default function OnboardingPage() {
  return (
    <>
      <InviterCapture />
      <OnboardingScreen />
    </>
  );
}

function OnboardingScreen() {
  const t = useT();
  const { lang, setLang } = useI18n();

  return (
    <div className="page" style={{ minHeight: "100vh", paddingBottom: 40 }}>
      <div className="container-tight" style={{ paddingTop: 36, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <Image
            src="/logo.png"
            alt="PragueConnect"
            width={300}
            height={200}
            priority
            style={{ height: 84, width: "auto", display: "block" }}
          />
        </div>
        <div className="italic" style={{ fontSize: 13, color: "var(--ink-50)", marginBottom: 14 }}>
          est. anno mmxxvi · Praha
        </div>
        <hr className="hr-double" style={{ width: 48, margin: "0 auto 28px" }} />

        <h1
          className="display"
          style={{
            fontSize: "clamp(32px, 8vw, 64px)",
            margin: "0 0 18px",
            color: "var(--ink)",
          }}
        >
          {t("home.headline.line1")} {t("home.headline.italic")} {t("home.headline.line2")}
        </h1>
        <p
          className="italic"
          style={{
            fontSize: "clamp(15px, 2.4vw, 18px)",
            color: "var(--ink-70)",
            margin: "0 auto 28px",
            maxWidth: 480,
            lineHeight: 1.5,
          }}
        >
          {t("home.subhead.mobile")}
        </p>

        <InviterAcknowledgement />

        <OnboardingForm size="mobile" />

        <div
          style={{
            marginTop: 48,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <CropsSeal size={20} color="var(--gilded-soft)" />
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11 }}>
            <button
              type="button"
              onClick={() => setLang("en")}
              className="mono-caps"
              style={{ color: lang === "en" ? "var(--ink)" : "var(--ink-50)" }}
            >
              EN
            </button>
            <span style={{ color: "var(--ink-30)" }}>/</span>
            <button
              type="button"
              onClick={() => setLang("cs")}
              className="mono-caps"
              style={{ color: lang === "cs" ? "var(--ink)" : "var(--ink-50)" }}
            >
              CS
            </button>
          </div>
          <a href="/feed" className="italic" style={{ fontSize: 13, color: "var(--ink-70)", textDecoration: "underline", textDecorationColor: "var(--gilded)", textUnderlineOffset: 4 }}>
            {t("home.browse")}
          </a>
          <div className="italic" style={{ fontSize: 12, color: "var(--ink-50)", marginTop: 4 }}>
            sealed by your own hand · forkable · MIT
          </div>
          <FleurDeLis size={16} stroke="var(--gilded)" style={{ marginTop: 4 }} />
        </div>
      </div>
    </div>
  );
}
