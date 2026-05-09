// Mock fixture data — same content as the design canvas, ready to be swapped
// for real onchain reads (NameStone subnames, ENS text records, escrow events).
import type { SigilKind } from "./ornaments";

export type OfferType = "OFFER" | "REQUEST" | "GIFT";

export interface Offer {
  kind: SigilKind;
  name: string; // ENS label, before .skol.eth
  skill: string;
  kc: number;
  crypto: string;
  dist: string;
  verified: boolean;
  type: OfferType;
}

export const FEED_OFFERS: Offer[] = [
  { kind: "forge", name: "kilian", skill: "I will fix your bicycle by sundown.", kc: 350, crypto: "12 USDC", dist: "Žižkov · 800m", verified: true, type: "OFFER" },
  { kind: "mercury", name: "lucia", skill: "Czech ↔ English, an hour over coffee.", kc: 450, crypto: "16 USDC", dist: "Vinohrady · 1.2km", verified: true, type: "OFFER" },
  { kind: "sulphur", name: "bohuslav", skill: "Sunday svíčková, two portions, hand-delivered.", kc: 280, crypto: "10 USDC", dist: "Karlín · 600m", verified: false, type: "OFFER" },
  { kind: "caduceus", name: "milena", skill: "Ride to the airport, 6am Tuesday.", kc: 600, crypto: "22 USDC", dist: "Holešovice · 2.0km", verified: true, type: "REQUEST" },
  { kind: "saturn", name: "tomas", skill: "Mathematics for your gymnázium child, weekly.", kc: 550, crypto: "20 USDC", dist: "Smíchov · 1.5km", verified: true, type: "OFFER" },
  { kind: "venus", name: "pavla", skill: "Free piano — pick it up Saturday morning.", kc: 0, crypto: "gift", dist: "Vinohrady · 1.1km", verified: false, type: "GIFT" },
  { kind: "alembic", name: "jirka", skill: "I'll wait at the foreign-police office for you.", kc: 200, crypto: "7 USDC", dist: "Žižkov · 900m", verified: false, type: "OFFER" },
  { kind: "forge", name: "radek", skill: "Hung shelves, simple plumbing, sealed grout.", kc: 420, crypto: "15 USDC", dist: "Karlín · 1.7km", verified: true, type: "OFFER" },
];

export const KILIAN_BIO =
  "Born in Karlovy Vary, transplanted to Žižkov ten winters ago. I keep a small workshop above a butcher's on Krásova where I sharpen knives, fix bicycles, and occasionally repair an old radio if it deserves it. I am told I am patient. I prefer working before noon. The wax seal below this letter is my hand on the work.";

export interface Receipt {
  kind: SigilKind;
  task: string;
  from: string;
  date: string;
  stars: number;
}

export const KILIAN_RECEIPTS: Receipt[] = [
  { kind: "forge", task: "Repaired a Favorit, replaced bottom bracket", from: "lucia.skol.eth", date: "04 may 2026", stars: 5 },
  { kind: "forge", task: "Three knives sharpened, balanced", from: "pavla.skol.eth", date: "28 apr 2026", stars: 5 },
  { kind: "alembic", task: "Waited at the foreign-police for the morning", from: "milena.skol.eth", date: "22 apr 2026", stars: 4 },
  { kind: "forge", task: "Hung shelves, sealed bath grout", from: "tomas.skol.eth", date: "14 apr 2026", stars: 5 },
  { kind: "forge", task: "Old radio brought back to life", from: "bohuslav.skol.eth", date: "02 apr 2026", stars: 5 },
  { kind: "forge", task: "Fixed a kitchen leak, neat work", from: "radek.skol.eth", date: "24 mar 2026", stars: 4 },
];

export interface ThreadMessage {
  from: string;
  mine: boolean;
  text: string;
}

export const THREAD_MESSAGES: ThreadMessage[] = [
  { from: "lucia", mine: false, text: "Hello Kilian — my Favorit's bottom bracket is creaking. Saturday morning, by any chance?" },
  { from: "kilian", mine: true, text: "Saturday is open. Bring it before noon. 350 Kč as posted." },
  { from: "lucia", mine: false, text: "Wonderful. Funding the seal now." },
  { from: "kilian", mine: true, text: "Received. I will start when the bell at the church strikes ten." },
];

export type EscrowState = "nigredo" | "albedo" | "citrinitas" | "rubedo";
