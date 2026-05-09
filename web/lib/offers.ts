// Offer encoding/decoding. Each user's pragueconnect.eth subname holds an `offers`
// text record: a JSON array of Offer objects. The feed flattens all subnames
// into a single sorted list. No platform DB.
import type { SigilKind } from "./ornaments";
import { listSubnames } from "./namestone";
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

export interface FeedOffer extends StoredOffer {
  ens: string; // <label>.pragueconnect.eth
  label: string; // just the label
  address: `0x${string}`;
  verified: boolean;
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

/** Server-only. Loads every subname under pragueconnect.eth, flattens their offers,
 *  sorts by posted_at desc. */
export async function loadFeed(): Promise<FeedOffer[]> {
  const subnames = await listSubnames(env.namestoneDomain, 200);
  const out: FeedOffer[] = [];
  for (const s of subnames) {
    const offers = decodeOffers(s.text_records?.offers);
    for (const o of offers) {
      out.push({
        ...o,
        ens: `${s.name}.${s.domain}`,
        label: s.name,
        address: s.address,
        verified: !!s.text_records?.description, // anyone with a bio is "verified" for the demo
      });
    }
  }
  return out.sort((a, b) => b.posted_at - a.posted_at);
}
