"use client";

// Shared top navigation. Adapts to sign-in state and shows the user's
// claimed name when known. Renders on every screen except the bare home
// (the onboarding cartouche has its own header).
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAccessToken } from "./use-access-token";
import { useEffect, useState } from "react";
import { LangToggle, useT } from "./i18n";

export function Navbar({ variant = "default" }: { variant?: "default" | "transparent" }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, authenticated, login, logout } = usePrivy();
  const { accessToken: identityToken } = useAccessToken();
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
      className="navbar-shell"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        background: bgRule,
        backdropFilter: variant === "transparent" ? "blur(8px)" : undefined,
        WebkitBackdropFilter: variant === "transparent" ? "blur(8px)" : undefined,
      }}
    >
      <div className="navbar-inner">
        <Link href="/" aria-label="PragueConnect" className="navbar-brand">
          <Image
            src="/logo.png"
            alt="PragueConnect"
            width={300}
            height={239}
            priority
            className="navbar-logo"
          />
        </Link>

        {/* Desktop links */}
        <nav className="navbar-desktop" aria-label="Main">
          {links
            .filter((l) => l.show === "always" || authenticated)
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`navbar-link ${linkActive(l.href) ? "navbar-link-active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
        </nav>

        <div className="navbar-right">
          <LangToggle />
          {!ready ? (
            <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-50)", letterSpacing: "0.1em" }}>…</span>
          ) : authenticated ? (
            <>
              {myEns && (
                <Link
                  href={`/${myEns}`}
                  className="t-mono navbar-myens"
                  aria-label={`Your seal — ${myEns}`}
                >
                  <span className="navbar-myens-dot" />
                  {myEns}
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="t-display navbar-signout"
              >
                {t("nav.signout")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => login()}
              className="t-display navbar-signin"
            >
              {t("nav.signin")}
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
            className="navbar-burger"
          >
            <span className={`navbar-burger-line ${navOpen ? "navbar-burger-x1" : ""}`} />
            <span className={`navbar-burger-line ${navOpen ? "navbar-burger-fade" : ""}`} />
            <span className={`navbar-burger-line ${navOpen ? "navbar-burger-x2" : ""}`} />
          </button>
        </div>
      </div>

      {/* Engraved double hairline */}
      <div className="navbar-rule" aria-hidden="true">
        <div className="navbar-rule-thick" />
        <div className="navbar-rule-thin" />
      </div>

      {/* Mobile menu */}
      {navOpen && (
        <div className="navbar-mobile-menu">
          {links
            .filter((l) => l.show === "always" || authenticated)
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setNavOpen(false)}
                className={`navbar-mobile-link ${linkActive(l.href) ? "navbar-mobile-link-active" : ""}`}
              >
                <span className="navbar-mobile-link-mark" />
                {l.label}
              </Link>
            ))}
          {authenticated && myEns && (
            <Link
              href={`/${myEns}`}
              onClick={() => setNavOpen(false)}
              className="t-mono navbar-mobile-myens"
            >
              {myEns}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
