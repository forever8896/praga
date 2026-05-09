// Screen 3 — Profile / personal site (`username.pragueconnect.eth.limo`)
// Reads the actual NameStone record for the requested label. If the name has
// not been claimed yet, we show a "not yet inscribed" placeholder.
import { AlchemicalSigil, Cartouche, FleurDeLis, Marginalia, WaxSeal } from "@/lib/ornaments";
import {
  PortraitRoundel,
  ProfileHeader,
} from "@/lib/profile-shared";
import { getSubname } from "@/lib/resolver";
import { env } from "@/lib/env";
import { loadTipReceipts, type TipReceipt } from "@/lib/tip-events";
import { decodeOffers } from "@/lib/offers";
import { OwnerPanel } from "@/lib/owner-panel";
import { MyInvitesCartouche } from "@/lib/my-invites-cartouche";
import { ProfileHire } from "@/lib/profile-hire";
import { InheritanceTab } from "@/lib/inheritance-tab";
import { ReciprocateCartouche } from "@/lib/reciprocate-cartouche";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ProfileData {
  ens: string;
  label: string;
  display: string;
  address: `0x${string}` | null;
  bio: string;
  location: string;
  sealedBy: string | null;
  isClaimed: boolean;
  hasStealth: boolean;
  hasOffers: boolean;
  stealthMeta: string | null;
  receiptsSent: TipReceipt[];
  receiptsReceived: TipReceipt[];
  /** Swarm bzz reference (32-byte hex) decoded from the subname's contenthash, if any. */
  swarmRef: string | null;
}

async function loadProfile(rawName: string): Promise<ProfileData> {
  const ens = rawName.includes(".") ? rawName : `${rawName}.pragueconnect.eth`;
  const label = ens.split(".")[0];

  const record = await getSubname(env.namestoneDomain, label).catch(() => null);
  if (!record) {
    return {
      ens,
      label,
      display: label.charAt(0).toUpperCase() + label.slice(1),
      address: null,
      bio: "",
      location: "",
      sealedBy: null,
      isClaimed: false,
      hasStealth: false,
      hasOffers: false,
      stealthMeta: null,
      receiptsSent: [],
      receiptsReceived: [],
      swarmRef: null,
    };
  }
  const display = record.text_records?.name ?? label.charAt(0).toUpperCase() + label.slice(1);
  const [receiptsSent, receiptsReceived] = await Promise.all([
    loadTipReceipts({ from: record.address, limit: 20 }).catch(() => []),
    loadTipReceipts({ recipient: record.address, limit: 20 }).catch(() => []),
  ]);
  return {
    ens,
    label,
    display,
    address: record.address,
    bio: record.text_records?.description ?? "",
    location: record.text_records?.location ?? "Praha",
    sealedBy: record.text_records?.["sealed-by"] ?? null,
    isClaimed: true,
    hasStealth: !!record.text_records?.["stealth-meta-address"],
    hasOffers: decodeOffers(record.text_records?.offers).length > 0,
    stealthMeta: record.text_records?.["stealth-meta-address"] ?? null,
    receiptsSent,
    receiptsReceived,
    swarmRef: extractSwarmRef(record.contenthash),
  };
}

/** Decode an ENSIP-7 Swarm contenthash back to its 32-byte bzz reference.
 *  The fixed prefix is 0xe40101fa011b20 (swarm-ns / CIDv1 / swarm-manifest /
 *  keccak256-32). Anything else returns null. */
function extractSwarmRef(contenthash: string | null | undefined): string | null {
  if (!contenthash) return null;
  const hex = contenthash.startsWith("0x") ? contenthash.slice(2) : contenthash;
  if (hex.length !== 78) return null; // 7 prefix + 32 ref = 39 bytes = 78 hex chars
  if (!hex.toLowerCase().startsWith("e40101fa011b20")) return null;
  return hex.slice(14);
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ ensName: string }>;
}) {
  const { ensName: rawName } = await params;
  const profile = await loadProfile(rawName);

  return (
    <>
      <MobileProfile profile={profile} />
      <DesktopProfile profile={profile} />
      {profile.isClaimed && (
        <InheritanceTab inviterLabel={profile.label} inviterDisplay={profile.display} />
      )}
      {profile.isClaimed && profile.sealedBy && (
        <ReciprocateCartouche profileAddress={profile.address} />
      )}
    </>
  );
}

/** "served from Swarm" badge. Compact chip variant for the mobile chip strip;
 *  inline variant for the desktop seal block. Both link to a public Swarm
 *  gateway so anyone (including someone reading this on the .limo page) can
 *  fetch the same content without trusting our app. */
function SwarmBadge({ swarmRef, inline = false }: { swarmRef: string; inline?: boolean }) {
  const href = `https://api.gateway.ethswarm.org/bzz/${swarmRef}/`;
  const short = `bzz://${swarmRef.slice(0, 6)}…${swarmRef.slice(-4)}`;
  if (inline) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="t-mono"
        style={{ fontSize: 12, color: "var(--ink-70)", textDecoration: "none", borderBottom: "0.5px dotted var(--gilded)" }}
        title={`Swarm reference: ${swarmRef}`}
      >
        Swarm · {short}
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="t-display"
      style={{ fontSize: 9, letterSpacing: "0.3em", color: "var(--verdigris)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
      title={`Swarm reference: ${swarmRef}`}
    >
      <span style={{ width: 6, height: 6, background: "var(--verdigris)", borderRadius: "50%" }} />
      SERVED FROM SWARM
    </a>
  );
}

function ReceiptsBlock({ profile }: { profile: ProfileData }) {
  const { receiptsSent, receiptsReceived, hasStealth, display } = profile;
  const empty = receiptsSent.length === 0 && receiptsReceived.length === 0;
  if (empty) {
    return (
      <div style={{ padding: "20px", border: "0.5px dashed var(--gilded)", textAlign: "center" }}>
        <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--ink-50)" }}>BLANK LEDGER</div>
        <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", marginTop: 8, lineHeight: 1.55 }}>
          {hasStealth
            ? `${display.split(" ")[0]}'s sealed gift route is set, but no receipts public yet. Tips landing on stealth addresses don't appear here — that's the point.`
            : `No tips on this wall yet.`}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {receiptsReceived.map((r) => <ReceiptRow key={`r:${r.txHash}`} r={r} kind="received" />)}
      {receiptsSent.map((r) => <ReceiptRow key={`s:${r.txHash}`} r={r} kind="sent" />)}
      {hasStealth && (
        <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
          Tips landing at sealed gift-route addresses are deliberately invisible to the public — only {display.split(" ")[0]}'s scanner detects them.
        </div>
      )}
    </div>
  );
}

function ReceiptRow({ r, kind }: { r: TipReceipt; kind: "sent" | "received" }) {
  const counterparty = kind === "sent" ? r.recipientEns : r.fromEns;
  const counterpartyLabel = counterparty ?? `${(kind === "sent" ? r.stealthRecipient : r.from).slice(0, 6)}…${(kind === "sent" ? r.stealthRecipient : r.from).slice(-4)}`;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", padding: "10px 12px", borderBottom: "0.5px solid var(--gilded)" }}>
      <AlchemicalSigil kind={kind === "sent" ? "venus" : "caduceus"} size={28} />
      <div style={{ minWidth: 0 }}>
        <div className="t-mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: kind === "sent" ? "var(--vermilion)" : "var(--verdigris)" }}>
          {kind === "sent" ? "GAVE" : "RECEIVED"}
        </div>
        <div className="t-italic" style={{ fontSize: 14, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {kind === "sent" ? "to" : "from"} {counterpartyLabel}
          {r.memo && <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-50)", marginLeft: 8 }}>· {r.memo}</span>}
        </div>
      </div>
      <a href={`/r/${r.txHash}`} className="t-display" style={{ fontSize: 12, color: "var(--ink)", letterSpacing: "0.04em", textDecoration: "none" }}>
        {r.amountEth} ETH
      </a>
    </div>
  );
}

function NotYetInscribed({ ens }: { ens: string }) {
  return (
    <div className="parchment-surface" style={{ width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <Cartouche padding={32} style={{ maxWidth: 480, width: "100%", textAlign: "center", boxSizing: "border-box" }}>
        <FleurDeLis size={32} style={{ margin: "0 auto 12px" }} />
        <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 8 }}>UNCLAIMED INSCRIPTION</div>
        <div className="t-mono" style={{ fontSize: 18, letterSpacing: "-0.01em", marginBottom: 12, wordBreak: "break-all" }}>{ens}</div>
        <div className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", lineHeight: 1.55, marginBottom: 18 }}>
          No-one has yet sealed this name in PragueConnect. The page will be carved when its bearer presses the seal.
        </div>
        <a href="/" className="t-display" style={{ display: "inline-block", padding: "12px 22px", background: "var(--ink)", color: "var(--parchment)", fontSize: 12, letterSpacing: "0.3em", textDecoration: "none" }}>
          CLAIM A NAME
        </a>
      </Cartouche>
    </div>
  );
}

function MobileProfile({ profile }: { profile: ProfileData }) {
  if (!profile.isClaimed) {
    return <div className="mobile-only"><NotYetInscribed ens={profile.ens} /></div>;
  }
  const bio = profile.bio || `${profile.display} has just inscribed their name in PragueConnect. The bio, the catalogue and the wall will fill as the work begins.`;
  return (
    <div className="parchment-surface mobile-only" style={{ width: "100%", minHeight: "100vh", padding: "12px 24px 32px" }}>
      <div className="t-mono" style={{ fontSize: 11, color: "var(--ink-70)", textAlign: "center", marginBottom: 12 }}>{profile.ens}.limo</div>
      <Cartouche padding={20}>
        <ProfileHeader size="mobile" name={profile.display} ens={profile.ens} />
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <PortraitRoundel size={140} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <span className="t-display" style={{ fontSize: 9, letterSpacing: "0.3em", color: "var(--vermilion)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, background: "var(--vermilion)", borderRadius: "50%" }} />
            VERIFIED HUMAN
          </span>
          {profile.location && <span className="t-display" style={{ fontSize: 9, letterSpacing: "0.3em", color: "var(--ink-70)" }}>· {profile.location.toUpperCase()} ·</span>}
          {profile.swarmRef && <SwarmBadge swarmRef={profile.swarmRef} />}
        </div>
        {profile.sealedBy && (
          <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-50)", textAlign: "center", marginTop: 8, letterSpacing: "0.02em" }}>
            sealed by{" "}
            <Link href={`/${profile.sealedBy}`} className="t-mono" style={{ fontSize: 11, color: "var(--ink-70)", textDecoration: "none", borderBottom: "0.5px dotted var(--gilded)" }}>
              {profile.sealedBy}
            </Link>
          </div>
        )}
        <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <a href={`/tip/${profile.ens}`} className="t-display" style={{ padding: "12px 18px", background: "var(--vermilion)", color: "var(--parchment)", fontFamily: "var(--display)", fontSize: 11, letterSpacing: "0.3em", display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer", textDecoration: "none" }}>
            <WaxSeal size={26} state="rubedo" rotate={-6} emboss="fleur" />
            SEND A PRIVATE GIFT
          </a>
          <a href={`/m/${profile.label}`} className="t-display" style={{ padding: "12px 18px", background: "transparent", border: "0.5px solid var(--gilded)", color: "var(--ink)", fontFamily: "var(--display)", fontSize: 11, letterSpacing: "0.3em", textDecoration: "none" }}>
            SEND A SEALED LETTER
          </a>
        </div>
      </Cartouche>

      <OwnerPanel
        ownerAddress={profile.address}
        hasBio={!!profile.bio}
        hasOffers={profile.hasOffers}
        hasStealth={profile.hasStealth}
      />

      <MyInvitesCartouche ownerAddress={profile.address} />

      <ProfileHire
        ownerAddress={profile.address}
        ownerEns={profile.ens}
        ownerStealthMeta={profile.stealthMeta}
      />

      <div style={{ marginTop: 24 }}>
        <div className="t-italic" style={{ fontSize: 16, lineHeight: 1.55, color: "var(--ink)" }}>{bio}</div>
      </div>

      <div style={{ marginTop: 28 }}>
        <div className="t-display" style={{ fontSize: 12, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 4 }}>The wall</div>
        <div className="t-display" style={{ fontSize: 22, letterSpacing: "0.04em", marginBottom: 12 }}>Sealed receipts</div>
        <ReceiptsBlock profile={profile} />
      </div>

      <div style={{ marginTop: 28, padding: "20px 0", borderTop: "0.5px solid var(--gilded)", borderBottom: "0.5px solid var(--gilded)", textAlign: "center" }}>
        <div className="t-cer" style={{ fontSize: 22, color: "var(--ink)" }}>Verus Sigillum</div>
        <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)", marginTop: 6 }}>this site is sealed by PragueConnect · the name belongs to the human</div>
        <FleurDeLis size={20} style={{ margin: "12px auto 0" }} />
        {profile.address && (
          <div className="t-mono" style={{ fontSize: 10, color: "var(--ink-50)", marginTop: 8 }}>
            {profile.address.slice(0, 6)}…{profile.address.slice(-4)}
          </div>
        )}
      </div>
    </div>
  );
}

function DesktopProfile({ profile }: { profile: ProfileData }) {
  if (!profile.isClaimed) {
    return <div className="desktop-only"><NotYetInscribed ens={profile.ens} /></div>;
  }
  const bio = profile.bio || `${profile.display} has just inscribed their name in PragueConnect. The bio, the catalogue and the wall will fill as the work begins.`;
  const dropChar = bio.charAt(0).toUpperCase();
  return (
    <div className="parchment-surface desktop-only" style={{ width: "100%", minHeight: "100vh", padding: "32px 56px 56px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)" }}>{profile.ens}.limo</span>
        <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-50)", letterSpacing: "0.15em" }}>PRAGUECONNECT · A SEALED PERSONAL SITE</span>
      </div>
      <div className="hr-double" style={{ marginBottom: 24 }} />

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 200px", gap: 36 }}>
        <aside style={{ display: "flex", flexDirection: "column", gap: 36, alignItems: "center", paddingTop: 80 }}>
          <Marginalia kind="astrolog" size={150} />
          <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)", textAlign: "center", maxWidth: 180, lineHeight: 1.5 }}>
            "Two trades fit in one pair of hands, three with patience."
          </div>
          <Marginalia kind="alembicDiagram" size={150} />
          <FleurDeLis size={28} />
        </aside>

        <div>
          <ProfileHeader size="desktop" name={profile.display} ens={profile.ens} />

          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 36, alignItems: "flex-start", marginTop: 12 }}>
            <div>
              <PortraitRoundel size={260} />
              <div style={{ display: "flex", justifyContent: "center", marginTop: -28, position: "relative", zIndex: 1 }}>
                <WaxSeal size={70} state="rubedo" rotate={-9} emboss="fleur" label="VERIFIED HUMAN ·" />
              </div>
            </div>
            <div>
              <div className="t-italic" style={{ fontSize: 19, lineHeight: 1.6, color: "var(--ink)" }}>
                <span style={{ fontFamily: "var(--display)", fontSize: 88, lineHeight: 0.85, float: "left", padding: "0.04em 0.14em 0 0", color: "var(--vermilion)", fontWeight: 600 }}>{dropChar}</span>
                {bio.slice(1)}
              </div>
              <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "var(--bone)", border: "0.5px solid var(--gilded)" }}>
                <WaxSeal size={50} state="rubedo" rotate={-7} emboss="fleur" />
                <div style={{ flex: 1 }}>
                  <div className="t-display" style={{ fontSize: 12, letterSpacing: "0.3em", color: "var(--vermilion)" }}>SEND A PRIVATE GIFT</div>
                  <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", marginTop: 2 }}>
                    your gift will reach {profile.display.split(" ")[0]} without revealing the address it lands at — by design
                  </div>
                </div>
                <a href={`/tip/${profile.ens}`} className="t-display" style={{ padding: "12px 22px", background: "var(--vermilion)", color: "var(--parchment)", fontSize: 12, letterSpacing: "0.3em", textDecoration: "none" }}>PRESS THE SEAL</a>
              </div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", border: "0.5px solid var(--gilded)" }}>
                <div style={{ flex: 1 }}>
                  <div className="t-display" style={{ fontSize: 12, letterSpacing: "0.3em", color: "var(--ink)" }}>SEND A SEALED LETTER</div>
                  <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", marginTop: 2 }}>
                    open an end-to-end encrypted thread keyed by {profile.ens} on XMTP
                  </div>
                </div>
                <a href={`/m/${profile.label}`} className="t-display" style={{ padding: "12px 22px", background: "var(--ink)", color: "var(--parchment)", fontSize: 12, letterSpacing: "0.3em", textDecoration: "none" }}>OPEN THREAD</a>
              </div>
              <OwnerPanel
                ownerAddress={profile.address}
                hasBio={!!profile.bio}
                hasOffers={profile.hasOffers}
                hasStealth={profile.hasStealth}
              />
              <MyInvitesCartouche ownerAddress={profile.address} />
              <ProfileHire
                ownerAddress={profile.address}
                ownerEns={profile.ens}
                ownerStealthMeta={profile.stealthMeta}
              />
            </div>
          </div>

          <div className="hr-gilded" style={{ margin: "40px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 56 }}>
            <div>
              <div className="t-display" style={{ fontSize: 12, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 4 }}>The wall · {profile.receiptsSent.length + profile.receiptsReceived.length} sealed</div>
              <div className="t-display" style={{ fontSize: 32, letterSpacing: "0.04em", marginBottom: 16 }}>Sealed receipts</div>
              <ReceiptsBlock profile={profile} />
            </div>
          </div>

          <div style={{ marginTop: 48, padding: "24px 0", borderTop: "0.5px solid var(--gilded)", borderBottom: "0.5px solid var(--gilded)", textAlign: "center" }}>
            <div className="t-cer" style={{ fontSize: 36, color: "var(--ink)" }}>Verus Sigillum</div>
            <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", marginTop: 8 }}>
              this site is sealed by PragueConnect · the name belongs to the human · reputation travels with the name
            </div>
            {profile.sealedBy && (
              <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-50)", marginTop: 12 }}>
                sealed by{" "}
                <Link href={`/${profile.sealedBy}`} className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)", textDecoration: "none", borderBottom: "0.5px dotted var(--gilded)" }}>
                  {profile.sealedBy}
                </Link>
              </div>
            )}
            {profile.swarmRef && (
              <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-50)", marginTop: 8 }}>
                served from <SwarmBadge swarmRef={profile.swarmRef} inline />
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 16 }}>
              <FleurDeLis size={22} />
              <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-50)" }}>
                {profile.ens} · {profile.address ? `${profile.address.slice(0, 6)}…${profile.address.slice(-4)}` : "attested"} · sealed
              </span>
              <FleurDeLis size={22} />
            </div>
          </div>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 36, alignItems: "center", paddingTop: 80 }}>
          <Marginalia kind="pragueMap" size={150} />
          <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)", textAlign: "center", maxWidth: 180, lineHeight: 1.5 }}>
            {profile.location ? <>workshop in<br />{profile.location}</> : <>no workshop pinned yet</>}
          </div>
          <Marginalia kind="constellation" size={150} />
          <FleurDeLis size={28} />
        </aside>
      </div>
    </div>
  );
}
