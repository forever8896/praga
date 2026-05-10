"use client";

// Feed view — the town square. Two clearly separated stalls:
//   OFFERINGS  = skills + posted OFFER + GIFT (what hands can do for you)
//   ASKS       = posted REQUEST                (what neighbours need a hand with)
// A "people in the square today" strip leads, so the page reads as a community
// of pseudonymous humans rather than a flat classifieds list. ENS label is the
// only identity shown — no email, no wallet address. Click → profile, where the
// purchase lives.
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import {
  AlchemicalSigil,
  Cartouche,
  FilterChip,
  FleurDeLis,
  Marginalia,
} from "./ornaments";
import type { FeedOffer, FeedPerson } from "./offers";
import { normaliseSkillPrice } from "./offers";
import type { SigilKind } from "./ornaments";
import { useT } from "./i18n";
import { useFx } from "./use-eth-czk";

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

function priceFor(offer: FeedOffer, fx: ReturnType<typeof useFx>): string {
  if (offer.source === "skill") return normaliseSkillPrice(offer.priceLabel);
  if (offer.type === "GIFT") return "Free";
  return offer.kc > 0 ? fx.pairFromKc(offer.kc) : "—";
}

/** A vendor card — used in OFFERINGS. Username is the headline (the social
 *  hook); skill/offer title sits underneath; price + REQUEST/TIP sit in the
 *  action row. The whole card surface is NOT a single link, so the explicit
 *  CTAs work without nested-anchor jank. `isMine` collapses the REQUEST CTA
 *  for the listing's owner — you can't open a sealed thread with yourself. */
function OfferingCard({
  offer,
  compact = false,
  isMine = false,
}: {
  offer: FeedOffer;
  compact?: boolean;
  isMine?: boolean;
}) {
  const username = offer.label;
  const display = offer.displayName ?? username.charAt(0).toUpperCase() + username.slice(1);
  const stallLabel = offer.source === "skill" ? "SKILL" : offer.type === "GIFT" ? "GIFT" : "OFFER";
  const stallColor =
    offer.source === "skill"
      ? "var(--gilded)"
      : offer.type === "GIFT"
      ? "var(--verdigris)"
      : "var(--vermilion)";
  const fx = useFx();
  const price = priceFor(offer, fx);
  return (
    <Cartouche style={{ background: "var(--parchment)" }} padding={compact ? 16 : 20} tight={compact}>
      <div style={{ display: "flex", gap: compact ? 12 : 14, alignItems: "flex-start" }}>
        <Link href={`/${offer.ens}`} style={{ flex: "0 0 auto", textDecoration: "none" }} aria-label={`Open ${username}'s profile`}>
          <AlchemicalSigil kind={offer.kind} size={compact ? 42 : 52} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span className="t-display" style={{ fontSize: 9, letterSpacing: "0.32em", color: stallColor }}>
              {stallLabel}
            </span>
            <span className="t-mono" style={{ fontSize: 10, color: "var(--ink-50)" }}>·</span>
            <Link
              href={`/${offer.ens}`}
              className="t-display"
              style={{ fontSize: compact ? 14 : 15, letterSpacing: "0.04em", color: "var(--ink)", textDecoration: "none", borderBottom: "0.5px dotted var(--gilded)" }}
            >
              {display}
            </Link>
            <span className="t-mono" style={{ fontSize: 10, color: "var(--ink-50)" }}>@{username}</span>
            {offer.verified && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                <span style={{ width: 5, height: 5, background: "var(--vermilion)", borderRadius: "50%" }} />
                <span className="t-display" style={{ fontSize: 8, letterSpacing: "0.25em", color: "var(--vermilion)" }}>
                  SEALED
                </span>
              </span>
            )}
          </div>
          <Link href={`/${offer.ens}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="t-body" style={{ fontSize: compact ? 16 : 18, lineHeight: 1.35, color: "var(--ink)", marginBottom: 12 }}>
              {offer.title}
            </div>
          </Link>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <span className="t-display" style={{ fontSize: compact ? 22 : 26, letterSpacing: "0.02em", color: "var(--ink)" }}>
              {price}
            </span>
            <span className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)" }}>
              {offer.location || "Praha"}
              {offer.source === "offer" ? ` · ${timeAgo(offer.posted_at)}` : ""}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href={`/${offer.ens}`}
              className="t-display"
              style={{ flex: "1 1 auto", textAlign: "center", padding: "9px 12px", border: "0.5px solid var(--gilded)", color: "var(--ink)", fontSize: 10, letterSpacing: "0.3em", textDecoration: "none" }}
            >
              {isMine ? "VIEW (YOURS)" : "VIEW"}
            </Link>
            {!isMine && (
              <Link
                href={`/m/${offer.label}`}
                className="t-display"
                style={{ flex: "1 1 auto", textAlign: "center", padding: "9px 12px", background: "var(--vermilion)", color: "var(--parchment)", fontSize: 10, letterSpacing: "0.3em", textDecoration: "none" }}
              >
                REQUEST
              </Link>
            )}
          </div>
        </div>
      </div>
    </Cartouche>
  );
}

/** An ASK card — somebody wanting a hand. Same anatomy as OfferingCard but the
 *  action verb is REPLY (you're answering a request, not buying a service). */
function AskCard({
  offer,
  compact = false,
  isMine = false,
}: {
  offer: FeedOffer;
  compact?: boolean;
  isMine?: boolean;
}) {
  const username = offer.label;
  const display = offer.displayName ?? username.charAt(0).toUpperCase() + username.slice(1);
  const fx = useFx();
  const budget = offer.kc > 0 ? `${fx.pairFromKc(offer.kc)} budget` : "open budget";
  return (
    <Cartouche style={{ background: "var(--parchment)" }} padding={compact ? 16 : 20} tight={compact}>
      <div style={{ display: "flex", gap: compact ? 12 : 14, alignItems: "flex-start" }}>
        <Link href={`/${offer.ens}`} style={{ flex: "0 0 auto", textDecoration: "none" }} aria-label={`Open ${username}'s profile`}>
          <AlchemicalSigil kind={offer.kind} size={compact ? 42 : 52} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span className="t-display" style={{ fontSize: 9, letterSpacing: "0.32em", color: "var(--lapis)" }}>
              ASK
            </span>
            <span className="t-mono" style={{ fontSize: 10, color: "var(--ink-50)" }}>·</span>
            <Link
              href={`/${offer.ens}`}
              className="t-display"
              style={{ fontSize: compact ? 14 : 15, letterSpacing: "0.04em", color: "var(--ink)", textDecoration: "none", borderBottom: "0.5px dotted var(--gilded)" }}
            >
              {display}
            </Link>
            <span className="t-mono" style={{ fontSize: 10, color: "var(--ink-50)" }}>@{username}</span>
          </div>
          <Link href={`/${offer.ens}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="t-body" style={{ fontSize: compact ? 16 : 18, lineHeight: 1.35, color: "var(--ink)", marginBottom: 12 }}>
              {offer.title}
            </div>
          </Link>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <span className="t-display" style={{ fontSize: compact ? 18 : 20, letterSpacing: "0.02em", color: "var(--lapis)" }}>
              {budget}
            </span>
            <span className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)" }}>
              {offer.location || "Praha"} · {timeAgo(offer.posted_at)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href={`/${offer.ens}`}
              className="t-display"
              style={{ flex: "1 1 auto", textAlign: "center", padding: "9px 12px", border: "0.5px solid var(--gilded)", color: "var(--ink)", fontSize: 10, letterSpacing: "0.3em", textDecoration: "none" }}
            >
              {isMine ? "VIEW (YOURS)" : "VIEW"}
            </Link>
            {!isMine && (
              <Link
                href={`/m/${offer.label}`}
                className="t-display"
                style={{ flex: "1 1 auto", textAlign: "center", padding: "9px 12px", background: "var(--lapis)", color: "var(--parchment)", fontSize: 10, letterSpacing: "0.3em", textDecoration: "none" }}
              >
                REPLY
              </Link>
            )}
          </div>
        </div>
      </div>
    </Cartouche>
  );
}

/** Horizontally-scrollable row of pseudonymous humans currently in the square.
 *  The single "social" surface — everything else is items. Each chip carries
 *  the display name (the human, not the listing), the @label, and a count of
 *  what they've put on the square. Tap → profile. */
function PeopleStrip({ people }: { people: FeedPerson[] }) {
  if (people.length === 0) return null;
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.32em", color: "var(--vermilion)" }}>
          {people.length} {people.length === 1 ? "person" : "people"} in the square today
        </div>
        <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)" }}>
          tap a name to read their page
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
        {people.map((p) => (
          <Link
            key={p.ens}
            href={`/${p.ens}`}
            style={{ textDecoration: "none", flex: "0 0 auto" }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 110,
                padding: "12px 8px",
                background: "var(--bone)",
                border: "0.5px solid var(--gilded)",
              }}
            >
              <PersonRoundel label={p.label} />
              <div className="t-display" style={{ fontSize: 12, letterSpacing: "0.04em", color: "var(--ink)", marginTop: 8, textAlign: "center", lineHeight: 1.2 }}>
                {p.display}
              </div>
              <div className="t-mono" style={{ fontSize: 9, color: "var(--ink-50)", marginTop: 2 }}>
                @{p.label}
              </div>
              <div className="t-italic" style={{ fontSize: 10, color: "var(--ink-70)", marginTop: 6, textAlign: "center", lineHeight: 1.3 }}>
                {p.offeringsCount > 0 && <>{p.offeringsCount} offering{p.offeringsCount === 1 ? "" : "s"}</>}
                {p.offeringsCount > 0 && p.asksCount > 0 && <> · </>}
                {p.asksCount > 0 && <>{p.asksCount} ask{p.asksCount === 1 ? "" : "s"}</>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** A small monogram in a roundel — the closest thing to an avatar without
 *  asking the user to upload one. Pseudonymity preserved: it shows the first
 *  letter of the label (which is the public ENS handle anyway). */
function PersonRoundel({ label }: { label: string }) {
  const initial = label.charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "var(--parchment)",
        border: "0.5px solid var(--gilded)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <span className="t-display" style={{ fontSize: 26, color: "var(--vermilion)", letterSpacing: "0.04em" }}>
        {initial}
      </span>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  count,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.4em", color: "var(--vermilion)" }}>
            {eyebrow}
          </div>
          <div className="t-display" style={{ fontSize: 30, letterSpacing: "0.04em", lineHeight: 1.05 }}>
            {title}
          </div>
        </div>
        <div className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)" }}>
          {count} {count === 1 ? "notice" : "notices"}
        </div>
      </div>
      <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)", marginTop: 4 }}>
        {subtitle}
      </div>
      <div className="hr-gilded" style={{ marginTop: 12 }} />
    </div>
  );
}

function EmptyStallNote({ kind }: { kind: "offerings" | "asks" }) {
  const text =
    kind === "offerings"
      ? "No skills posted under this filter. The square is quiet."
      : "Nobody is asking for a hand right now.";
  return (
    <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", textAlign: "center", padding: "20px 12px", border: "0.5px dashed var(--gilded)" }}>
      {text}
    </div>
  );
}

function OverallEmptyState() {
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

export function FeedView({ offers, people }: { offers: FeedOffer[]; people: FeedPerson[] }) {
  const [filter, setFilter] = useState<SigilKind | "all">("all");
  const [search, setSearch] = useState("");
  const { authenticated, user } = usePrivy();
  const myAddress = authenticated ? user?.wallet?.address?.toLowerCase() ?? null : null;

  const visible = useMemo(() => {
    let list = offers;
    if (filter !== "all") list = list.filter((o) => o.kind === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          (o.detail ?? "").toLowerCase().includes(q) ||
          o.ens.toLowerCase().includes(q) ||
          (o.displayName ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [offers, filter, search]);

  const offerings = useMemo(
    () => visible.filter((o) => o.source === "skill" || o.type === "OFFER" || o.type === "GIFT"),
    [visible],
  );
  const asks = useMemo(() => visible.filter((o) => o.source === "offer" && o.type === "REQUEST"), [visible]);

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
        offerings={offerings}
        asks={asks}
        people={people}
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
        myAddress={myAddress}
      />
      <DesktopFeed
        offers={visible}
        all={offers}
        offerings={offerings}
        asks={asks}
        people={people}
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
        neighbourhoods={neighbourhoods}
        myAddress={myAddress}
      />
    </>
  );
}

interface FeedProps {
  offers: FeedOffer[];
  all: FeedOffer[];
  offerings: FeedOffer[];
  asks: FeedOffer[];
  people: FeedPerson[];
  filter: SigilKind | "all";
  setFilter: (k: SigilKind | "all") => void;
  search: string;
  setSearch: (s: string) => void;
  myAddress: string | null;
}

function isOwn(offer: FeedOffer, myAddress: string | null): boolean {
  return !!myAddress && offer.address.toLowerCase() === myAddress;
}

function MobileFeed({ offers, all, offerings, asks, people, filter, setFilter, search, setSearch, myAddress }: FeedProps) {
  const t = useT();
  return (
    <div className="parchment-surface mobile-only" style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 24px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div className="t-display" style={{ fontSize: 10, letterSpacing: "0.35em", color: "var(--vermilion)" }}>{t("feed.eyebrow")}</div>
            <div className="t-display" style={{ fontSize: 30, letterSpacing: "0.04em", lineHeight: 1 }}>PragueConnect, V.viii</div>
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
          {all.length} {t("feed.handsAtWork")} · showing {offers.length}
        </div>
      </div>

      <div style={{ padding: "0 24px 32px", flex: 1 }}>
        <PeopleStrip people={people} />

        {offers.length === 0 ? (
          <OverallEmptyState />
        ) : (
          <>
            <div style={{ marginBottom: 28 }}>
              <SectionHeader
                eyebrow="OFFERINGS"
                title="Skills & services"
                subtitle="Hands offering work, lessons, gifts. Tap REQUEST to open a sealed thread."
                count={offerings.length}
              />
              {offerings.length === 0 ? (
                <EmptyStallNote kind="offerings" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {offerings.map((o) => <OfferingCard key={`${o.ens}:${o.id}`} offer={o} compact isMine={isOwn(o, myAddress)} />)}
                </div>
              )}
            </div>

            <div>
              <SectionHeader
                eyebrow="ASKS"
                title="Help wanted"
                subtitle="Neighbours asking for a hand. Tap REPLY if you can do it."
                count={asks.length}
              />
              {asks.length === 0 ? (
                <EmptyStallNote kind="asks" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {asks.map((o) => <AskCard key={`${o.ens}:${o.id}`} offer={o} compact isMine={isOwn(o, myAddress)} />)}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface DesktopProps extends FeedProps {
  neighbourhoods: Array<[string, number]>;
}

function DesktopFeed({ offers, all, offerings, asks, people, filter, setFilter, search, setSearch, neighbourhoods, myAddress }: DesktopProps) {
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
          {all.length} {t("feed.handsAtWork")} · showing {offers.length}
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

          <PeopleStrip people={people} />

          {offers.length === 0 ? (
            <OverallEmptyState />
          ) : (
            <>
              <div style={{ marginBottom: 40 }}>
                <SectionHeader
                  eyebrow="OFFERINGS"
                  title="Skills & services"
                  subtitle="Hands offering work, lessons, gifts. Tap REQUEST to open a sealed thread with the maker."
                  count={offerings.length}
                />
                {offerings.length === 0 ? (
                  <EmptyStallNote kind="offerings" />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {offerings.map((o) => <OfferingCard key={`${o.ens}:${o.id}`} offer={o} isMine={isOwn(o, myAddress)} />)}
                  </div>
                )}
              </div>

              <div>
                <SectionHeader
                  eyebrow="ASKS"
                  title="Help wanted"
                  subtitle="Neighbours asking for a hand. Tap REPLY if you can do it."
                  count={asks.length}
                />
                {asks.length === 0 ? (
                  <EmptyStallNote kind="asks" />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {asks.map((o) => <AskCard key={`${o.ens}:${o.id}`} offer={o} isMine={isOwn(o, myAddress)} />)}
                  </div>
                )}
              </div>
            </>
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
