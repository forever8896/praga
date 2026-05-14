// Group records — a chat-room is just a subname under pragueconnect.eth
// with a `pc.group="1"` text-record marker. Everything about the room
// lives in the same text-record shelf model people already use: topic,
// description, XMTP MLS group ID, sigil, visibility, pending join requests.
//
// Why subname-as-room: the room inherits all the existing primitives —
// owner-only edits, public discoverability via ENS, content-hash for a
// `room.pragueconnect.eth.limo` static landing page, even stealth meta-
// addresses if a room wants to take private tips. Zero new primitives.

import type { SigilKind } from "./ornaments";

export const GROUP_MARKER_KEY = "pc.group";
export const GROUP_MARKER_VALUE = "1";

/** Visibility controls *discovery*, not membership. "open" rooms show up
 *  in /groups and accept join requests; "unlisted" rooms hide from /groups
 *  and only their creator-shared link works. Membership is always invite-
 *  only — the creator (or any admin) decides who can read. */
export type GroupVisibility = "open" | "unlisted";

export interface GroupRecord {
  label: string;
  ens: string;
  topic: string;
  description: string;
  createdBy: string | null;
  createdAt: number;
  xmtpGroupId: string;
  sigil: SigilKind;
  visibility: GroupVisibility;
  memberCount: number;
  /** Pending join requests — ENS labels of people who asked but haven't
   *  been added. Stored as JSON in pc.group.pending. */
  pending: PendingRequest[];
  /** The address that owns the group's subname (the creator). The XMTP
   *  group's admin list is whatever XMTP itself says — this is the lighter
   *  invariant for "who can approve join requests on the bulletin layer". */
  ownerAddress: `0x${string}`;
}

export interface PendingRequest {
  ens: string;
  address: `0x${string}`;
  note: string;
  requestedAt: number;
}

export interface RawGroupInput {
  text_records?: Record<string, string> | null;
  address: `0x${string}`;
  name: string;
  domain: string;
}

const VALID_SIGILS: ReadonlyArray<SigilKind> = [
  "forge",
  "alembic",
  "venus",
  "mercury",
  "saturn",
  "caduceus",
  "sulphur",
];

function safeJson<T>(s: string | undefined | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function safeSigil(s: string | undefined | null): SigilKind {
  return (VALID_SIGILS as string[]).includes(s ?? "") ? (s as SigilKind) : "alembic";
}

function safeVisibility(s: string | undefined | null): GroupVisibility {
  return s === "unlisted" ? "unlisted" : "open";
}

/** True when this subname is a group room rather than a person's seal. */
export function isGroupRecord(text_records: Record<string, string> | null | undefined): boolean {
  return text_records?.[GROUP_MARKER_KEY] === GROUP_MARKER_VALUE;
}

/** Decode the resolver record for a group subname into a typed shape used
 *  by every UI surface. Tolerates partial/malformed records so a group can
 *  exist even before its XMTP id is wired in. */
export function decodeGroup(raw: RawGroupInput): GroupRecord | null {
  const tr = raw.text_records ?? {};
  if (!isGroupRecord(tr)) return null;
  const topic = (tr["pc.group.topic"] ?? tr["name"] ?? raw.name).slice(0, 200);
  const description = (tr["pc.group.description"] ?? tr["description"] ?? "").slice(0, 1200);
  const createdAtRaw = parseInt(tr["pc.group.created_at"] ?? "", 10);
  return {
    label: raw.name,
    ens: `${raw.name}.${raw.domain}`,
    topic,
    description,
    createdBy: tr["pc.group.created_by"] || null,
    createdAt: Number.isFinite(createdAtRaw) ? createdAtRaw : 0,
    xmtpGroupId: tr["pc.group.xmtp"] ?? "",
    sigil: safeSigil(tr["pc.group.sigil"]),
    visibility: safeVisibility(tr["pc.group.visibility"]),
    memberCount: Math.max(0, parseInt(tr["pc.group.member_count"] ?? "1", 10) || 1),
    pending: safeJson<PendingRequest[]>(tr["pc.group.pending"], []),
    ownerAddress: raw.address,
  };
}

/** Field set the resolver allows us to write for a group. Mirrors the set
 *  in /api/update-profile's ALLOWED_FIELDS — keep them in sync. */
export const GROUP_TEXT_RECORD_KEYS = [
  "pc.group",
  "pc.group.topic",
  "pc.group.description",
  "pc.group.created_by",
  "pc.group.created_at",
  "pc.group.xmtp",
  "pc.group.sigil",
  "pc.group.visibility",
  "pc.group.member_count",
  "pc.group.pending",
] as const;

/** A slug is a valid group label — same constraints as a personal subname
 *  but with a separate reserved-prefix carve-out so we never collide with
 *  someone's first name. */
export function isValidGroupSlug(slug: string): boolean {
  if (!/^[a-z0-9-]{2,20}$/.test(slug)) return false;
  if (slug.startsWith("-") || slug.endsWith("-")) return false;
  return true;
}
