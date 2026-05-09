"use client";

// Feed view — client-side filtering on real offers loaded by the server route.
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlchemicalSigil,
  Cartouche,
  FilterChip,
  FleurDeLis,
  Marginalia,
} from "./ornaments";
import type { FeedOffer } from "./offers";
import type { SigilKind } from "./ornaments";
import { useT } from "./i18n";

const FILTERS: Array<{ kind: SigilKind | "all"; label: string }> = [
  { kind: "all", label: "ALL" },
  { kind: "forge", label: "REPAIR" },
  { kind: "mercury", label: "LANGUAGE" },
  { kind: "sulphur", label: "COOK" },
  { kind: "caduceus", label: "RIDE" },
  { kind: "saturn", label: "TUTOR" },
  { kind: "venus", label: "GIFTS" },
  { kind: "alembic", label: "ERRANDS" },
];

function timeAgo(unixSec: number): string {
  const diff = Date.now() / 1000 - unixSec;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function OfferCard({ offer, compact = false }: { offer: FeedOffer; compact?: boolean }) {
  const typeColor =
    offer.type === "GIFT"
      ? "var(--verdigris)"
      : offer.type === "REQUEST"
      ? "var(--lapis)"
      : "var(--vermilion)";
  return (
    <Link
      href={`/${offer.ens}`}
      style={{ display: "block", textDecoration: "none", color: "inherit" }}
    >
      <div style={{ position: "relative", background: "var(--parchment)" }}>
        <Cartouche style={{ background: "transparent" }} padding={compact ? 18 : 22} tight={compact}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: "0 0 auto" }}>
              <AlchemicalSigil kind={offer.kind} size={compact ? 44 : 52} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span className="t-display" style={{ fontSize: 10, letterSpacing: "0.3em", color: typeColor }}>
                  {offer.type}
                </span>
                <span className="t-mono" style={{ fontSize: 10, color: "var(--ink-50)" }}>·</span>
                <span className="t-mono" style={{ fontSize: 12, color: "var(--ink)" }}>{offer.ens}</span>
                {offer.verified && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <span style={{ width: 6, height: 6, background: "var(--vermilion)", borderRadius: "50%" }} />
                    <span className="t-display" style={{ fontSize: 9, letterSpacing: "0.25em", color: "var(--vermilion)" }}>
                      SEALED
                    </span>
                  </span>
                )}
              </div>
              <div className="t-body" style={{ fontSize: compact ? 16 : 18, lineHeight: 1.35, color: "var(--ink)", marginBottom: 12 }}>
                {offer.title}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <span className="t-display" style={{ fontSize: compact ? 22 : 26, letterSpacing: "0.02em", color: "var(--ink)" }}>
                    {offer.type === "GIFT" ? "Free" : `${offer.kc} Kč`}
                  </span>
                  {offer.type !== "GIFT" && offer.usdc > 0 && (
                    <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-70)", marginLeft: 10 }}>
                      {offer.usdc} USDC
                    </span>
                  )}
                </div>
                <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)" }}>
                  {offer.location || "Praha"} · {timeAgo(offer.posted_at)}
                </div>
              </div>
            </div>
          </div>
        </Cartouche>
      </div>
    </Link>
  );
}

function EmptyState() {
  const t = useT();
  return (
    <Cartouche padding={32} style={{ textAlign: "center", maxWidth: 500, margin: "32px auto" }}>
      <FleurDeLis size={28} style={{ margin: "0 auto 12px" }} />
      <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 8 }}>{t("feed.empty.title")}</div>
      <div className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", marginBottom: 18, lineHeight: 1.55 }}>
        {t("feed.empty.body")}
      </div>
      <Link
        href="/compose"
        className="t-display"
        style={{ display: "inline-block", padding: "12px 22px", background: "var(--ink)", color: "var(--parchment)", fontSize: 12, letterSpacing: "0.3em", textDecoration: "none" }}
      >
        {t("feed.empty.cta")}
      </Link>
    </Cartouche>
  );
}

export function FeedView({ offers }: { offers: FeedOffer[] }) {
  const [filter, setFilter] = useState<SigilKind | "all">("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    let list = offers;
    if (filter !== "all") list = list.filter((o) => o.kind === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          (o.detail ?? "").toLowerCase().includes(q) ||
          o.ens.toLowerCase().includes(q),
      );
    }
    return list;
  }, [offers, filter, search]);

  const neighbourhoods = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of offers) {
      const loc = (o.location || "Praha").trim();
      counts.set(loc, (counts.get(loc) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [offers]);

  return (
    <>
      <MobileFeed
        offers={visible}
        all={offers}
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
      />
      <DesktopFeed
        offers={visible}
        all={offers}
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
        neighbourhoods={neighbourhoods}
      />
    </>
  );
}

interface FeedProps {
  offers: FeedOffer[];
  all: FeedOffer[];
  filter: SigilKind | "all";
  setFilter: (k: SigilKind | "all") => void;
  search: string;
  setSearch: (s: string) => void;
}

function MobileFeed({ offers, all, filter, setFilter, search, setSearch }: FeedProps) {
  const t = useT();
  return (
    <div className="parchment-surface mobile-only" style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 24px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div className="t-display" style={{ fontSize: 10, letterSpacing: "0.35em", color: "var(--vermilion)" }}>{t("feed.eyebrow")}</div>
            <div className="t-display" style={{ fontSize: 30, letterSpacing: "0.04em", lineHeight: 1 }}>Praga, V.viii</div>
          </div>
          <FleurDeLis size={26} />
        </div>
        <div className="hr-gilded" style={{ marginTop: 10 }} />
        <div style={{ marginTop: 14 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("feed.search")}
            style={{ width: "100%", padding: "12px 14px", background: "var(--bone)", border: "0.5px solid var(--gilded)", fontFamily: "var(--body)", fontStyle: "italic", fontSize: 15, color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 14, overflowX: "auto", paddingBottom: 4 }}>
          {FILTERS.map((f) => (
            <button
              key={f.kind}
              type="button"
              onClick={() => setFilter(f.kind)}
              style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}
            >
              <FilterChip
                label={f.label}
                kind={f.kind === "all" ? undefined : f.kind}
                active={filter === f.kind}
              />
            </button>
          ))}
        </div>
        <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)", marginTop: 8 }}>
          {all.length} {t("feed.handsAtWork")} · {offers.length}
        </div>
      </div>
      <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        {offers.length === 0 ? (
          <EmptyState />
        ) : (
          offers.map((o) => <OfferCard key={`${o.ens}:${o.id}`} offer={o} compact />)
        )}
      </div>
    </div>
  );
}

interface DesktopProps extends FeedProps {
  neighbourhoods: Array<[string, number]>;
}

function DesktopFeed({ offers, all, filter, setFilter, search, setSearch, neighbourhoods }: DesktopProps) {
  const t = useT();
  return (
    <div className="parchment-surface desktop-only" style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "24px 56px 0", display: "flex", alignItems: "center", gap: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("feed.search")}
          style={{ flex: 1, maxWidth: 480, padding: "10px 14px", background: "var(--bone)", border: "0.5px solid var(--gilded)", fontFamily: "var(--body)", fontStyle: "italic", fontSize: 14, outline: "none" }}
        />
        <span className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)" }}>
          {all.length} {t("feed.handsAtWork")}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 220px", gap: 32, padding: "32px 56px 64px" }}>
        <aside>
          <Marginalia kind="constellation" size={170} />
          <div className="hr-gilded" style={{ margin: "24px 0" }} />
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.25em", color: "var(--ink-70)", marginBottom: 12 }}>{t("feed.neighbourhood")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {neighbourhoods.length === 0 ? (
              <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)" }}>No notices yet.</div>
            ) : (
              neighbourhoods.map(([n, c]) => (
                <div key={n} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <span className="t-body" style={{ fontSize: 15, color: "var(--ink-70)" }}>{n}</span>
                  <span className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)" }}>{c}</span>
                </div>
              ))
            )}
          </div>
        </aside>

        <div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div className="t-display" style={{ fontSize: 12, letterSpacing: "0.4em", color: "var(--vermilion)" }}>{t("feed.eyebrow")}</div>
              <div className="t-display" style={{ fontSize: 56, letterSpacing: "0.04em", lineHeight: 1 }}>{t("feed.title")}</div>
            </div>
            <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)" }}>{offers.length}</div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            {FILTERS.map((f) => (
              <button
                key={f.kind}
                type="button"
                onClick={() => setFilter(f.kind)}
                style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
              >
                <FilterChip
                  label={f.label}
                  kind={f.kind === "all" ? undefined : f.kind}
                  active={filter === f.kind}
                />
              </button>
            ))}
          </div>

          {offers.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {offers.map((o) => (
                <OfferCard key={`${o.ens}:${o.id}`} offer={o} />
              ))}
            </div>
          )}
        </div>

        <aside>
          <Cartouche tone="bone" padding={20} tight>
            <div className="t-display" style={{ fontSize: 10, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 8 }}>POST YOUR OWN</div>
            <div className="t-italic" style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.45 }}>
              An offer takes a paragraph and a price.
            </div>
            <div className="hr-gilded" style={{ margin: "12px 0" }} />
            <Link
              href="/compose"
              className="t-display"
              style={{ display: "inline-block", padding: "10px 16px", background: "var(--ink)", color: "var(--parchment)", fontSize: 11, letterSpacing: "0.3em", textDecoration: "none" }}
            >
              + COMPOSE
            </Link>
          </Cartouche>
          <div style={{ marginTop: 24 }}>
            <Marginalia kind="pragueMap" size={170} />
          </div>
        </aside>
      </div>
    </div>
  );
}
