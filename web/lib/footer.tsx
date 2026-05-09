"use client";

// Shared footer — the CROPS hallmark + the "sealed by your own hand · forkable · MIT" line.
// Renders on every authenticated page. Mobile-first: 24px seal + small caption; desktop bumps
// to 32px. The seal is tappable and links to /crops for the explainer.
import Link from "next/link";
import { CropsSeal } from "./ornaments";
import { useT } from "./i18n";

export function Footer({ tone = "default" }: { tone?: "default" | "transparent" }) {
  const t = useT();
  const bg = tone === "transparent" ? "transparent" : "var(--parchment)";
  return (
    <footer
      style={{
        marginTop: 48,
        padding: "20px 20px 28px",
        background: bg,
        borderTop: "0.5px solid var(--gilded)",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/crops"
          aria-label={t("crops.title")}
          style={{ display: "inline-flex", lineHeight: 0 }}
          className="footer-seal"
        >
          <CropsSeal size={28} />
        </Link>
        <span
          className="t-italic"
          style={{ fontSize: 12, color: "var(--ink-50)", letterSpacing: "0.04em" }}
        >
          {t("crops.footer.line")}
        </span>
      </div>
    </footer>
  );
}
