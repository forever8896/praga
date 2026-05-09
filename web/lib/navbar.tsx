"use client";

// Shared top navigation. Adapts to sign-in state and shows the user's
// claimed name when known. Renders on every screen except the bare home
// (the onboarding cartouche has its own header).
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy, useIdentityToken } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { FleurDeLis } from "./ornaments";
import { LangToggle, useT } from "./i18n";

export function Navbar({ variant = "default" }: { variant?: "default" | "transparent" }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, authenticated, login, logout } = usePrivy();
  const { identityToken } = useIdentityToken();
  const t = useT();
  const [myEns, setMyEns] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!authenticated || !identityToken) {
      setMyEns(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/my-name", {
          headers: { Authorization: `Bearer ${identityToken}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.claimed) setMyEns(data.ens);
        else setMyEns(null);
      } catch {
        /* leave null */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, identityToken]);

  const linkActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const links: Array<{ href: string; label: string; show: "always" | "auth" }> = [
    { href: "/feed", label: t("nav.townsquare"), show: "always" },
    { href: "/compose", label: t("nav.compose"), show: "auth" },
    { href: "/wallet", label: t("nav.wallet"), show: "auth" },
    { href: "/me/edit", label: t("nav.edit"), show: "auth" },
    { href: "/agent", label: t("nav.familiar"), show: "auth" },
  ];

  const bgRule = variant === "transparent" ? "transparent" : "var(--parchment)";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: bgRule,
        borderBottom: "0.5px solid var(--gilded)",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--ink)" }}>
          <FleurDeLis size={22} />
          <span className="t-display" style={{ fontSize: 13, letterSpacing: "0.4em" }}>PRAGUECONNECT</span>
        </Link>

        {/* Desktop links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 28 }} className="navbar-desktop">
          {links
            .filter((l) => l.show === "always" || authenticated)
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="t-italic"
                style={{
                  fontSize: 14,
                  color: linkActive(l.href) ? "var(--vermilion)" : "var(--ink-70)",
                  textDecoration: "none",
                  borderBottom: linkActive(l.href) ? "0.5px solid var(--vermilion)" : "none",
                  paddingBottom: 2,
                }}
              >
                {l.label}
              </Link>
            ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LangToggle />
          {!ready ? (
            <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-50)" }}>…</span>
          ) : authenticated ? (
            <>
              {myEns && (
                <Link
                  href={`/${myEns}`}
                  className="t-mono navbar-myens"
                  style={{ fontSize: 12, color: "var(--ink)", textDecoration: "none", borderBottom: "0.5px solid var(--gilded)" }}
                >
                  {myEns}
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="t-display"
                style={{ fontSize: 10, letterSpacing: "0.25em", color: "var(--ink-70)", background: "transparent", border: "none", cursor: "pointer" }}
              >
                {t("nav.signout")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => login()}
              className="t-display"
              style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--parchment)", background: "var(--ink)", padding: "8px 14px", border: "none", cursor: "pointer" }}
            >
              {t("nav.signin")}
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setNavOpen((v) => !v)}
            className="navbar-burger"
            style={{ background: "transparent", border: "0.5px solid var(--gilded)", padding: "6px 10px", cursor: "pointer", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: 14 }}
          >
            ≡
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {navOpen && (
        <div
          className="navbar-mobile-menu"
          style={{ borderTop: "0.5px solid var(--gilded)", background: "var(--parchment)", padding: "12px 20px" }}
        >
          {links
            .filter((l) => l.show === "always" || authenticated)
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setNavOpen(false)}
                className="t-italic"
                style={{
                  display: "block",
                  padding: "10px 0",
                  fontSize: 16,
                  color: linkActive(l.href) ? "var(--vermilion)" : "var(--ink)",
                  textDecoration: "none",
                  borderBottom: "0.5px solid var(--gilded)",
                }}
              >
                {l.label}
              </Link>
            ))}
        </div>
      )}
    </header>
  );
}
