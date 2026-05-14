// Screen — /groups · the public hall of rooms.
//
// Lists every subname under pragueconnect.eth that carries the
// pc.group=1 marker. Membership remains invite-only so only people who've
// been added can read what's inside, but discovery is open: a visitor can
// see what rooms exist and which one fits before they ask to join.
//
// Server-rendered against the same resolver listing we use for /feed —
// no separate read path, so a new room appears the instant it's minted.
import Link from "next/link";
import { listSubnames } from "@/lib/resolver";
import { env } from "@/lib/env";
import { decodeGroup, type GroupRecord } from "@/lib/group";
import { AlchemicalSigil, Cartouche, FleurDeLis } from "@/lib/ornaments";
import { SealPortrait } from "@/lib/seal-portrait";

export const dynamic = "force-dynamic";

async function loadGroups(): Promise<GroupRecord[]> {
  const subnames = await listSubnames(env.namestoneDomain, 200).catch(() => []);
  const rooms: GroupRecord[] = [];
  for (const s of subnames) {
    const decoded = decodeGroup({
      name: s.name,
      domain: s.domain,
      address: s.address,
      text_records: s.text_records ?? null,
    });
    if (!decoded) continue;
    if (decoded.visibility === "unlisted") continue; // hidden from the hall
    rooms.push(decoded);
  }
  rooms.sort((a, b) => b.createdAt - a.createdAt);
  return rooms;
}

export default async function GroupsPage() {
  const groups = await loadGroups();
  const empty = groups.length === 0;

  return (
    <div
      className="parchment-surface"
      style={{ width: "100%", minHeight: "100vh", padding: "32px 20px 56px" }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <header style={{ textAlign: "center", marginBottom: 28 }}>
          <FleurDeLis size={28} style={{ margin: "0 auto 10px" }} />
          <div className="kicker" style={{ color: "var(--vermilion)" }}>
            THE HALL OF ROOMS
          </div>
          <h1
            className="display"
            style={{
              fontSize: "clamp(36px, 7vw, 52px)",
              letterSpacing: "0.04em",
              margin: "8px 0 6px",
              color: "var(--ink)",
            }}
          >
            Shared shelves, one per idea
          </h1>
          <p
            className="italic"
            style={{
              fontSize: 16,
              color: "var(--ink-70)",
              maxWidth: 580,
              margin: "0 auto",
              lineHeight: 1.55,
            }}
          >
            Each room is its own ENS subname — anyone can see it exists; only
            people you let in can read what's inside.
          </p>
          <div className="hr-double" style={{ width: 120, margin: "16px auto 0" }} />

          <Link
            href="/groups/new"
            className="display"
            style={{
              display: "inline-block",
              marginTop: 22,
              padding: "12px 22px",
              background: "var(--ink)",
              color: "var(--parchment)",
              fontSize: 12,
              letterSpacing: "0.3em",
              textDecoration: "none",
            }}
          >
            OPEN A NEW ROOM →
          </Link>
        </header>

        {empty ? (
          <Cartouche
            padding={36}
            style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}
          >
            <FleurDeLis size={24} style={{ margin: "0 auto 12px" }} />
            <div className="kicker" style={{ color: "var(--ink-50)" }}>
              THE HALL IS QUIET
            </div>
            <p
              className="italic"
              style={{
                fontSize: 15,
                color: "var(--ink-70)",
                margin: "12px auto 0",
                maxWidth: 360,
                lineHeight: 1.55,
              }}
            >
              No one has sealed a room yet. Be first — pick a topic the city
              needs and open the first door.
            </p>
          </Cartouche>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {groups.map((g) => (
              <GroupCard key={g.label} group={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCard({ group }: { group: GroupRecord }) {
  return (
    <Link
      href={`/g/${group.label}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <Cartouche padding={22} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <SealPortrait address={group.ownerAddress} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="display"
              style={{
                fontSize: 17,
                letterSpacing: "0.02em",
                color: "var(--ink)",
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {group.topic || group.label}
            </div>
            <div
              className="mono"
              style={{ fontSize: 11, color: "var(--ink-50)", marginTop: 4 }}
            >
              {group.label}.pragueconnect.eth
            </div>
          </div>
          <AlchemicalSigil kind={group.sigil} size={32} />
        </div>

        {group.description && (
          <p
            className="italic"
            style={{
              fontSize: 14,
              color: "var(--ink-70)",
              margin: "0 0 16px",
              lineHeight: 1.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {group.description}
          </p>
        )}

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingTop: 12,
            borderTop: "0.5px solid var(--gilded)",
            flexWrap: "wrap",
          }}
        >
          <span
            className="display"
            style={{
              fontSize: 10,
              letterSpacing: "0.3em",
              color: "var(--vermilion)",
            }}
          >
            {group.memberCount === 1
              ? "1 SEAL"
              : `${group.memberCount} SEALS`}
          </span>
          {group.pending.length > 0 && (
            <span
              className="display"
              style={{
                fontSize: 10,
                letterSpacing: "0.3em",
                color: "var(--ink-50)",
              }}
            >
              · {group.pending.length} KNOCKING
            </span>
          )}
          {!group.xmtpGroupId && (
            <span
              className="italic"
              style={{
                fontSize: 11,
                color: "var(--ink-50)",
                marginLeft: "auto",
              }}
            >
              chat pending
            </span>
          )}
        </div>
      </Cartouche>
    </Link>
  );
}
