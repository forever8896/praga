// Offer encoding/decoding. Each user's pragueconnect.eth subname holds an `offers`
// text record (a JSON array of Offer objects) and a `skills` text record (a JSON
// array of Skill objects). The feed flattens all subnames' offers AND skills
// into a single sorted list. No platform DB.
import type { SigilKind } from "./ornaments";
import { listSubnames } from "./resolver";
import { env } from "./env";

export type OfferType = "OFFER" | "REQUEST" | "GIFT";

export const SIGIL_KINDS: SigilKind[] = [
  "forge",
  "mercury",
  "sulphur",
  "caduceus",
  "saturn",
  "venus",
  "alembic",
];

export interface StoredOffer {
  id: string;
  kind: SigilKind;
  type: OfferType;
  title: string;
  detail?: string;
  kc: number;
  usdc: number;
  location: string;
  posted_at: number; // unix seconds
}

/** A persistent catalogue entry from a user's `skills` text record.
 *  Unlike an Offer (a dated post), a Skill is a standing offer of services. */
export interface StoredSkill {
  kind: SigilKind;
  name: string;
  /** Free-form price hint, e.g. "from 200 Kč" or "200 Kč / hr". */
  price: string;
}

export interface FeedOffer extends StoredOffer {
  ens: string; // <label>.pragueconnect.eth
  label: string; // just the label
  address: `0x${string}`;
  verified: boolean;
  /** "offer" = posted to the square (has its own posted_at).
   *  "skill" = persistent catalogue entry, surfaced into the square. */
  source: "offer" | "skill";
  /** For skills: original free-text price string for display. Offers leave undefined. */
  priceLabel?: string;
  /** Display name from the owner's `name` text record, if set — used so the
   *  feed can show "Kilián" rather than just the bare ENS label. Falls back
   *  to the capitalised label at the call site when absent. */
  displayName?: string;
}

/** A handle representing one user (one subname) in the square — the social
 *  surface of the feed. Used to render the "people in the square today" strip
 *  so visitors see *who* is here, not just a flat list of items. */
export interface FeedPerson {
  ens: string;
  label: string;
  display: string;
  bio: string;
  location: string;
  /** Total of (offers + skills) this person has surfaced into the square. */
  itemCount: number;
  offeringsCount: number;
  asksCount: number;
}

const TYPE_VALUES: OfferType[] = ["OFFER", "REQUEST", "GIFT"];

export function decodeOffers(raw: string | undefined): StoredOffer[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((o: Record<string, unknown>): StoredOffer | null => {
        if (!o || typeof o !== "object") return null;
        const id = typeof o.id === "string" ? o.id : "";
        const title = typeof o.title === "string" ? o.title : "";
        if (!id || !title) return null;
        const kind = (SIGIL_KINDS as string[]).includes(o.kind as string)
          ? (o.kind as SigilKind)
          : "forge";
        const type = (TYPE_VALUES as string[]).includes(o.type as string)
          ? (o.type as OfferType)
          : "OFFER";
        return {
          id,
          kind,
          type,
          title,
          detail: typeof o.detail === "string" ? o.detail : undefined,
          kc: Number.isFinite(o.kc) ? Number(o.kc) : 0,
          usdc: Number.isFinite(o.usdc) ? Number(o.usdc) : 0,
          location: typeof o.location === "string" ? o.location : "",
          posted_at: Number.isFinite(o.posted_at) ? Number(o.posted_at) : Date.now() / 1000,
        };
      })
      .filter((x): x is StoredOffer => x !== null);
  } catch {
    return [];
  }
}

export function encodeOffers(offers: StoredOffer[]): string {
  return JSON.stringify(offers);
}

export function decodeSkills(raw: string | undefined): StoredSkill[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s: { kind?: unknown; name?: unknown; price?: unknown }): StoredSkill | null => {
        if (!s || typeof s !== "object") return null;
        const name = typeof s.name === "string" ? s.name.trim() : "";
        if (!name) return null;
        const kind = (SIGIL_KINDS as string[]).includes(s.kind as string)
          ? (s.kind as SigilKind)
          : "forge";
        const price = typeof s.price === "string" ? s.price : "";
        return { kind, name, price };
      })
      .filter((x): x is StoredSkill => x !== null);
  } catch {
    return [];
  }
}

/** Best-effort numeric Kč extraction from a free-text price ("from 200 Kč" → 200).
 *  Used so skills can sit alongside priced offers in the feed even though their
 *  authoritative display is the original `priceLabel` string. */
export function parseKcFromPrice(price: string): number {
  const m = price.match(/(\d[\d\s.,]*)/);
  if (!m) return 0;
  const n = parseInt(m[1].replace(/[\s.,]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

/** Normalise a free-text skill price for display so the feed always shows a
 *  Kč figure on a skill card. If the user already typed a currency token
 *  (Kč/Kc/CZK), return verbatim; otherwise append " Kč". Empty input yields
 *  "—" so the visual slot is never blank. */
export function normaliseSkillPrice(raw: string | undefined): string {
  const label = (raw ?? "").trim();
  if (!label) return "—";
  if (/Kč|Kc|CZK/i.test(label)) return label;
  return `${label} Kč`;
}

/** Server-only. Loads every subname under pragueconnect.eth, flattens their offers
 *  AND their persistent skill catalogue entries into the same feed. Offers sort by
 *  posted_at desc; skills carry posted_at=0 so they cluster after dated activity
 *  but stay discoverable. Also emits a parallel `people` array — one entry per
 *  subname that contributes to the square — so the feed view can render a
 *  "people in the square today" social strip without reloading the resolver. */
export async function loadFeed(): Promise<{ offers: FeedOffer[]; people: FeedPerson[] }> {
  const subnames = await listSubnames(env.namestoneDomain, 200);
  const out: FeedOffer[] = [];
  const people: FeedPerson[] = [];
  for (const s of subnames) {
    const verified = !!s.text_records?.description; // anyone with a bio is "verified" for the demo
    const ens = `${s.name}.${s.domain}`;
    const ownerLocation = s.text_records?.location ?? "Praha";
    const displayName = s.text_records?.name?.trim() || undefined;

    const offers = decodeOffers(s.text_records?.offers);
    for (const o of offers) {
      out.push({
        ...o,
        ens,
        label: s.name,
        address: s.address,
        verified,
        source: "offer",
        displayName,
      });
    }

    const skills = decodeSkills(s.text_records?.skills);
    skills.forEach((sk, i) => {
      out.push({
        id: `skill:${i}`,
        kind: sk.kind,
        type: "OFFER",
        title: sk.name,
        detail: sk.price,
        kc: parseKcFromPrice(sk.price),
        usdc: 0,
        location: ownerLocation,
        posted_at: 0,
        ens,
        label: s.name,
        address: s.address,
        verified,
        source: "skill",
        priceLabel: sk.price,
        displayName,
      });
    });

    const offeringsCount =
      offers.filter((o) => o.type === "OFFER" || o.type === "GIFT").length + skills.length;
    const asksCount = offers.filter((o) => o.type === "REQUEST").length;
    if (offeringsCount + asksCount > 0) {
      people.push({
        ens,
        label: s.name,
        display: displayName ?? s.name.charAt(0).toUpperCase() + s.name.slice(1),
        bio: s.text_records?.description ?? "",
        location: ownerLocation,
        itemCount: offeringsCount + asksCount,
        offeringsCount,
        asksCount,
      });
    }
  }
  out.sort((a, b) => b.posted_at - a.posted_at);
  people.sort((a, b) => b.itemCount - a.itemCount);
  return { offers: out, people };
}
