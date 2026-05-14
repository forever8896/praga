// POST /api/groups/create — claim a `<slug>.pragueconnect.eth` subname and
// mark it as a chat-room rather than a personal seal.
//
// Body: { slug, topic, description?, visibility?, sigil?, xmtpGroupId? }
// Auth: Privy session (we need the verified wallet to set as the room's
// owner — only that address can later edit text records via /api/update-profile).
//
// The XMTP group itself is created client-side AFTER we mint the subname:
// the wallet that owns the subname must also be the wallet that creates
// the MLS group, so signing happens in the browser. We accept an optional
// `xmtpGroupId` in the same request so a single call can persist both.
// More commonly the client will create the room here, get back the ENS,
// then PATCH the XMTP id via /api/update-profile.
import { NextResponse } from "next/server";
import { getSubname, setSubname } from "@/lib/resolver";
import { verifySession } from "@/lib/privy-server";
import { env } from "@/lib/env";
import { isValidGroupSlug, GROUP_MARKER_KEY, GROUP_MARKER_VALUE } from "@/lib/group";
import type { SigilKind } from "@/lib/ornaments";

export const runtime = "nodejs";

interface Body {
  slug?: string;
  topic?: string;
  description?: string;
  visibility?: "open" | "unlisted";
  sigil?: SigilKind;
  xmtpGroupId?: string;
}

const VALID_SIGILS: SigilKind[] = [
  "forge",
  "alembic",
  "venus",
  "mercury",
  "saturn",
  "caduceus",
  "sulphur",
];

// Slugs that could realistically collide with somebody's first name in a
// post-hackathon city fork (or with our own reserved routes). Cheap belt
// and braces — the resolver-level uniqueness check is the source of truth.
const RESERVED_SLUGS = new Set([
  "me",
  "edit",
  "feed",
  "compose",
  "wallet",
  "groups",
  "tip",
  "crops",
  "dev",
  "api",
  "i",
  "r",
  "m",
  "g",
]);

export async function POST(req: Request) {
  const session = await verifySession(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.address) {
    return NextResponse.json({ error: "no-wallet" }, { status: 400 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const slug = (body.slug ?? "").toLowerCase().trim();
  const topic = (body.topic ?? "").trim().slice(0, 140);
  const description = (body.description ?? "").trim().slice(0, 1200);
  const visibility = body.visibility === "unlisted" ? "unlisted" : "open";
  const sigil: SigilKind = VALID_SIGILS.includes(body.sigil as SigilKind)
    ? (body.sigil as SigilKind)
    : "alembic";
  const xmtpGroupId = (body.xmtpGroupId ?? "").trim().slice(0, 200);

  if (!isValidGroupSlug(slug)) {
    return NextResponse.json({ error: "invalid-slug" }, { status: 400 });
  }
  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ error: "reserved-slug" }, { status: 409 });
  }
  if (!topic || topic.length < 3) {
    return NextResponse.json({ error: "topic-required" }, { status: 400 });
  }

  const existing = await getSubname(env.namestoneDomain, slug);
  if (existing) {
    return NextResponse.json({ error: "slug-taken" }, { status: 409 });
  }

  const createdBy = await ownerEnsOf(session.address);

  const text_records: Record<string, string> = {
    [GROUP_MARKER_KEY]: GROUP_MARKER_VALUE,
    "pc.group.topic": topic,
    "pc.group.description": description,
    "pc.group.created_by": createdBy ?? "",
    "pc.group.created_at": String(Math.floor(Date.now() / 1000)),
    "pc.group.sigil": sigil,
    "pc.group.visibility": visibility,
    "pc.group.member_count": "1",
    // Mirror onto the human-facing fields so the .limo profile renders
    // sensibly until we ship a group-specific contenthash.
    name: topic,
    description,
  };
  if (xmtpGroupId) text_records["pc.group.xmtp"] = xmtpGroupId;

  try {
    await setSubname({
      domain: env.namestoneDomain,
      name: slug,
      address: session.address as `0x${string}`,
      text_records,
    });
    return NextResponse.json({
      ok: true,
      ens: `${slug}.${env.namestoneDomain}`,
      slug,
      url: `/g/${slug}`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "resolver-failed" },
      { status: 502 },
    );
  }
}

/** Reverse-resolve the caller's address to their pragueconnect.eth subname.
 *  Used to stamp `pc.group.created_by` so groups carry a back-link to the
 *  human who made them rather than a raw hex address. Best-effort. */
async function ownerEnsOf(address: string): Promise<string | null> {
  try {
    const { listSubnames } = await import("@/lib/resolver");
    const all = await listSubnames(env.namestoneDomain, 200);
    const mine = all.find((r) => r.address.toLowerCase() === address.toLowerCase());
    return mine ? `${mine.name}.${mine.domain}` : null;
  } catch {
    return null;
  }
}
