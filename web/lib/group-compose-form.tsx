"use client";

// Group composer — pick a slug, give it a topic, pick a sigil, choose
// visibility. On submit we:
//   1. POST /api/groups/create — claims `<slug>.pragueconnect.eth`,
//      writes the marker text-records, returns the slug.
//   2. In the browser: build/sync XMTP client, create the MLS group room
//      under the same wallet as a single-member optimistic group.
//   3. POST /api/update-profile — write the XMTP group id to
//      `pc.group.xmtp` so the resolver carries a back-link to the room.
//   4. Redirect to /g/<slug>.
//
// Steps 2-3 can fail without breaking step 1 — the subname stays minted,
// and the user can re-open /g/<slug> later to retry the XMTP attach. The
// detail page handles a missing XMTP id by showing a "set up chat" prompt.

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccessToken } from "./use-access-token";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlchemicalSigil,
  Cartouche,
  FleurDeLis,
  type SigilKind,
} from "./ornaments";
import { isValidGroupSlug } from "./group";
import {
  createGroupRoom,
  getXmtpClient,
} from "./xmtp";

const SIGIL_OPTIONS: SigilKind[] = [
  "alembic",
  "forge",
  "venus",
  "mercury",
  "saturn",
  "caduceus",
  "sulphur",
];

type Stage =
  | "idle"
  | "minting"
  | "creating-room"
  | "attaching"
  | "done"
  | "error";

export function GroupComposeForm() {
  const { ready, authenticated, login, user } = usePrivy();
  const { accessToken: identityToken } = useAccessToken();
  const { wallets } = useWallets();
  const router = useRouter();

  const [slug, setSlug] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [sigil, setSigil] = useState<SigilKind>("alembic");
  const [visibility, setVisibility] = useState<"open" | "unlisted">("open");
  const [stage, setStage] = useState<Stage>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [slugCheck, setSlugCheck] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const address = user?.wallet?.address as `0x${string}` | undefined;

  // Debounced slug availability check so users see "this name is taken"
  // before they hit Create.
  useEffect(() => {
    if (!slug) {
      setSlugCheck("idle");
      return;
    }
    if (!isValidGroupSlug(slug)) {
      setSlugCheck("idle");
      return;
    }
    setSlugCheck("checking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-name?name=${encodeURIComponent(slug)}`);
        const data = await res.json();
        setSlugCheck(data.available ? "available" : "taken");
      } catch {
        /* leave checking */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [slug]);

  const canSubmit =
    ready &&
    authenticated &&
    slugCheck === "available" &&
    topic.trim().length >= 3 &&
    !!address &&
    stage === "idle";

  const onCreate = async () => {
    if (!canSubmit || !address || !identityToken) return;
    setErr(null);

    // Step 1 — mint the subname under our resolver, marked as a group.
    setStage("minting");
    let mintedSlug = slug;
    try {
      const res = await fetch("/api/groups/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${identityToken}`,
        },
        body: JSON.stringify({
          slug,
          topic: topic.trim(),
          description: description.trim(),
          visibility,
          sigil,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(humanizeMintError(data.error));
        setStage("error");
        return;
      }
      mintedSlug = data.slug ?? slug;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "could-not-mint");
      setStage("error");
      return;
    }

    // Step 2 — create the XMTP MLS group from the browser. The wallet that
    // owns the subname must also be the wallet that creates the room,
    // because XMTP rooms are tied to the signer's installation.
    setStage("creating-room");
    let xmtpGroupId = "";
    try {
      const wallet =
        wallets.find((w) => w.address.toLowerCase() === address.toLowerCase()) ??
        wallets[0];
      if (!wallet) throw new Error("no-wallet");
      const client = await getXmtpClient({
        address,
        signMessage: (m: string) => wallet.sign(m),
      });
      const room = await createGroupRoom(client, {
        topic: topic.trim(),
        description: description.trim(),
      });
      xmtpGroupId = room.id;
    } catch (e) {
      // The subname is minted — the user can still retry from /g/<slug>.
      setErr(
        e instanceof Error
          ? `chat room failed: ${e.message}`
          : "chat-room-failed",
      );
      // We still proceed to the room page so they can retry there.
      router.push(`/g/${mintedSlug}`);
      return;
    }

    // Step 3 — write the XMTP id back so other members can find this room
    // by resolving the ENS.
    setStage("attaching");
    try {
      await fetch("/api/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${identityToken}`,
        },
        body: JSON.stringify({
          label: mintedSlug,
          fields: { "pc.group.xmtp": xmtpGroupId },
        }),
      });
    } catch {
      /* non-fatal: the group page reads the missing id and prompts a fix */
    }

    setStage("done");
    router.push(`/g/${mintedSlug}`);
  };

  if (!ready) {
    return <Loader text="opening the room…" />;
  }
  if (!authenticated) {
    return (
      <Shell>
        <Cartouche padding={32} style={{ textAlign: "center", maxWidth: 460 }}>
          <FleurDeLis size={28} style={{ margin: "0 auto 12px" }} />
          <div className="kicker" style={{ marginBottom: 8 }}>SIGNED OUT</div>
          <p className="italic" style={{ fontSize: 15, color: "var(--ink-70)", lineHeight: 1.55 }}>
            Sign in to seal a new room. Only people with a name in the city can open one.
          </p>
          <button onClick={() => login()} className="btn btn-ink" style={{ marginTop: 18 }}>
            SIGN IN
          </button>
        </Cartouche>
      </Shell>
    );
  }

  const slugStatusLine =
    !slug
      ? "pick a short, all-lowercase slug — letters, numbers, dashes"
      : !isValidGroupSlug(slug)
      ? "2–20 chars, lowercase letters/numbers/dashes only"
      : slugCheck === "checking"
      ? "checking…"
      : slugCheck === "taken"
      ? `${slug}.pragueconnect.eth · already taken`
      : slugCheck === "available"
      ? `${slug}.pragueconnect.eth · available`
      : "";

  const slugStatusColor =
    slugCheck === "taken"
      ? "var(--vermilion)"
      : slugCheck === "available"
      ? "var(--verdigris)"
      : "var(--ink-50)";

  return (
    <Shell>
      <div style={{ maxWidth: 640, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="kicker" style={{ color: "var(--vermilion)" }}>OPEN A ROOM</div>
          <h1
            className="display"
            style={{ fontSize: 36, letterSpacing: "0.04em", margin: "8px 0 6px" }}
          >
            A shared shelf for one idea
          </h1>
          <p className="italic" style={{ fontSize: 15, color: "var(--ink-70)", maxWidth: 480, margin: "0 auto", lineHeight: 1.55 }}>
            Each room is its own pragueconnect.eth subname. Anyone can find it; only people you let in can read what's said inside.
          </p>
          <div className="hr-double" style={{ width: 100, margin: "16px auto 0" }} />
        </div>

        <Cartouche padding={28}>
          <Field label="SLUG — the room's address">
            <div style={{ position: "relative" }}>
              <input
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20))
                }
                placeholder="prague-rust"
                style={inputStyle}
              />
              <div
                className="mono"
                style={{
                  position: "absolute",
                  right: 12,
                  top: 12,
                  fontSize: 12,
                  color: "var(--ink-50)",
                  pointerEvents: "none",
                }}
              >
                .pragueconnect.eth
              </div>
            </div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: slugStatusColor,
                marginTop: 6,
                letterSpacing: "0.05em",
              }}
            >
              {slugStatusLine}
            </div>
          </Field>

          <Field label="TOPIC — one line">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 140))}
              placeholder="Rust devs in Prague, meeting Wednesdays"
              style={inputStyle}
            />
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-50)", textAlign: "right", marginTop: 4 }}>
              {topic.length} / 140
            </div>
          </Field>

          <Field label="DESCRIPTION — optional">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1200))}
              placeholder="What this room is for. Who should join. House rules, if any."
              style={{ ...inputStyle, minHeight: 100, resize: "vertical", fontFamily: "var(--body)", fontStyle: "italic" }}
            />
          </Field>

          <Field label="SIGIL — the room's mark">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {SIGIL_OPTIONS.map((k) => {
                const active = sigil === k;
                return (
                  <button
                    type="button"
                    key={k}
                    onClick={() => setSigil(k)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 48,
                      height: 48,
                      padding: 0,
                      background: active ? "var(--ink)" : "transparent",
                      border: `0.5px solid ${active ? "var(--ink)" : "var(--gilded)"}`,
                      cursor: "pointer",
                    }}
                    aria-label={k}
                    aria-pressed={active}
                  >
                    <AlchemicalSigil
                      kind={k}
                      size={28}
                      frame={false}
                      color={active ? "var(--parchment)" : "var(--ink)"}
                    />
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="VISIBILITY">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(["open", "unlisted"] as const).map((v) => {
                const active = visibility === v;
                const meta =
                  v === "open"
                    ? {
                        title: "Open · listed",
                        body: "Anyone can find this room on /groups and ask to join. You decide who gets in.",
                      }
                    : {
                        title: "Unlisted",
                        body: "Only people with the direct link see this room. Still invite-only to read.",
                      };
                return (
                  <label
                    key={v}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 12px",
                      border: "0.5px solid var(--gilded)",
                      background: active ? "rgba(178, 58, 47, 0.06)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      checked={active}
                      onChange={() => setVisibility(v)}
                      style={{ marginTop: 4, accentColor: "var(--vermilion)" }}
                    />
                    <div>
                      <div className="display" style={{ fontSize: 12, letterSpacing: "0.25em", color: active ? "var(--vermilion)" : "var(--ink)" }}>
                        {meta.title.toUpperCase()}
                      </div>
                      <div className="italic" style={{ fontSize: 13, color: "var(--ink-70)", marginTop: 2, lineHeight: 1.5 }}>
                        {meta.body}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </Field>

          {err && (
            <div
              className="italic"
              style={{
                fontSize: 13,
                color: "var(--vermilion)",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              {err}
            </div>
          )}

          <button
            type="button"
            onClick={onCreate}
            disabled={!canSubmit}
            className="btn btn-ink btn-block"
            style={{
              cursor: !canSubmit ? "not-allowed" : "pointer",
              opacity: !canSubmit ? 0.5 : 1,
            }}
          >
            {stageLabel(stage)}
          </button>
          <p
            className="italic"
            style={{
              fontSize: 12,
              color: "var(--ink-70)",
              textAlign: "center",
              marginTop: 10,
              lineHeight: 1.5,
            }}
          >
            You'll sign twice: once to claim the room's name, once to seal the XMTP chat key.
          </p>
        </Cartouche>
      </div>
    </Shell>
  );
}

function stageLabel(stage: Stage): string {
  switch (stage) {
    case "minting":
      return "CLAIMING THE NAME…";
    case "creating-room":
      return "SEALING THE XMTP ROOM…";
    case "attaching":
      return "BINDING THE KEYS…";
    case "done":
      return "✓ OPEN";
    case "error":
      return "RETRY";
    default:
      return "OPEN THE ROOM";
  }
}

function humanizeMintError(code: string | undefined): string {
  switch (code) {
    case "slug-taken":
      return "That slug is already in use — pick another.";
    case "reserved-slug":
      return "That slug is reserved — pick another.";
    case "invalid-slug":
      return "Slugs must be 2–20 lowercase letters, digits, or dashes.";
    case "topic-required":
      return "Give the room a one-line topic so people know what it's for.";
    default:
      return code ?? "Couldn't seal that room. Try again in a moment.";
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="parchment-surface"
      style={{
        width: "100%",
        minHeight: "100vh",
        padding: "32px 20px 56px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function Loader({ text }: { text: string }) {
  return (
    <Shell>
      <div className="mono" style={{ fontSize: 12, color: "var(--ink-70)", paddingTop: 80, letterSpacing: "0.1em" }}>
        {text}
      </div>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.25em", color: "var(--gilded-soft)", marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "transparent",
  border: "0.5px solid var(--gilded)",
  borderRadius: 0,
  fontFamily: "var(--body)",
  fontSize: 15,
  color: "var(--ink)",
  outline: "none",
  boxSizing: "border-box",
};
