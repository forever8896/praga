"use client";

// Group room — the visitor view, the member chat, and the owner's
// admin panel in one component because the only state that decides
// which to show is `role` and that comes from XMTP itself once the
// client has synced.
//
// Roles:
//   - "visitor"   — not in the MLS group. Sees topic/description and
//                   a "knock" button that POSTs request-join.
//   - "member"    — has been admitted. Sees the chat.
//   - "owner"     — owns the subname AND is an admin in MLS. Sees the
//                   chat plus a pending-requests panel.
//
// We never trust the resolver for membership — XMTP's MLS group is the
// source of truth ("can this wallet actually decrypt messages?"). The
// resolver's pending list is bulletin metadata, not enforcement.

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccessToken } from "./use-access-token";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlchemicalSigil,
  Cartouche,
  FleurDeLis,
  type SigilKind,
} from "./ornaments";
import { SealPortrait } from "./seal-portrait";
import {
  addMemberToGroup,
  createGroupRoom,
  getXmtpClient,
  openGroupById,
  type XmtpConversation,
  type XmtpMessage,
} from "./xmtp";
import { playMessagePing } from "./notify";
import type { GroupRecord, PendingRequest } from "./group";

interface UiMessage {
  id: string;
  fromMe: boolean;
  senderInboxId: string;
  text: string;
  sentAt: Date;
}

type Role = "loading" | "needs-sign-in" | "visitor" | "member" | "owner" | "error";

function decodeMessage(m: XmtpMessage, myInboxId: string): UiMessage | null {
  if (typeof m.content !== "string") return null;
  return {
    id: m.id,
    fromMe: m.senderInboxId === myInboxId,
    senderInboxId: m.senderInboxId,
    text: m.content,
    sentAt: new Date(Number(m.sentAtNs / BigInt(1_000_000))),
  };
}

export function GroupView({ group }: { group: GroupRecord }) {
  const { ready, authenticated, login, user } = usePrivy();
  const { wallets } = useWallets();
  const { accessToken: identityToken } = useAccessToken();

  const [role, setRole] = useState<Role>("loading");
  const [err, setErr] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [knocking, setKnocking] = useState(false);
  const [knocked, setKnocked] = useState(false);
  const [knockNote, setKnockNote] = useState("");

  // Owner panel state — these mirror the resolver fields but update
  // optimistically when the owner approves/declines.
  const [pending, setPending] = useState<PendingRequest[]>(group.pending);
  const [memberCount, setMemberCount] = useState<number>(group.memberCount);
  const [resolving, setResolving] = useState<string | null>(null);

  const conversationRef = useRef<XmtpConversation | null>(null);
  const myInboxIdRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const myAddress = (user?.wallet?.address ?? "") as `0x${string}` | "";
  const isOwnerByAddress =
    !!myAddress &&
    myAddress.toLowerCase() === group.ownerAddress.toLowerCase();

  const initRoom = useCallback(async () => {
    if (!ready) return;
    if (!authenticated) {
      setRole("needs-sign-in");
      return;
    }
    if (!myAddress) return;

    setErr(null);
    try {
      const wallet =
        wallets.find((w) => w.address.toLowerCase() === myAddress.toLowerCase()) ??
        wallets[0];
      if (!wallet) {
        setRole("needs-sign-in");
        return;
      }
      const client = await getXmtpClient({
        address: myAddress as `0x${string}`,
        signMessage: (m: string) => wallet.sign(m),
      });
      myInboxIdRef.current = client.inboxId ?? "";

      // Owner-special path: the room may have been minted but the XMTP
      // group never created (step 2 failed at compose time). Heal it now.
      let conv: XmtpConversation | null = null;
      if (group.xmtpGroupId) {
        conv = await openGroupById(client, group.xmtpGroupId);
      }
      if (!conv && isOwnerByAddress) {
        // The owner is back — create the XMTP room and persist its id.
        const created = await createGroupRoom(client, {
          topic: group.topic,
          description: group.description,
        });
        conv = created;
        if (identityToken) {
          await fetch("/api/update-profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${identityToken}`,
            },
            body: JSON.stringify({
              label: group.label,
              fields: { "pc.group.xmtp": created.id },
            }),
          }).catch(() => {});
        }
      }
      conversationRef.current = conv;

      // Decide role from XMTP truth: am I a member of this conversation?
      let amMember = false;
      if (conv) {
        try {
          const members = await (
            conv as unknown as { members?: () => Promise<Array<{ inboxId: string }>> }
          ).members?.();
          if (Array.isArray(members)) {
            amMember = members.some((m) => m.inboxId === myInboxIdRef.current);
          } else {
            // Fallback — if we can fetch messages without throwing, we're in.
            await conv.sync();
            await conv.messages();
            amMember = true;
          }
        } catch {
          amMember = false;
        }
      }

      if (!amMember) {
        setRole("visitor");
        return;
      }

      // We're in. Sync history + start streaming.
      try {
        await conv!.sync();
        const history = await conv!.messages();
        const decoded = history
          .map((m) => decodeMessage(m, myInboxIdRef.current))
          .filter((m): m is UiMessage => m !== null);
        setMessages(decoded);

        const stream = await conv!.stream();
        (async () => {
          try {
            for await (const m of stream) {
              if (!m) continue;
              const decoded = decodeMessage(m as unknown as XmtpMessage, myInboxIdRef.current);
              if (!decoded) continue;
              let appended = false;
              setMessages((curr) => {
                if (curr.some((x) => x.id === decoded.id)) return curr;
                appended = true;
                return [...curr, decoded];
              });
              if (appended && !decoded.fromMe) playMessagePing();
            }
          } catch {
            /* stream ended */
          }
        })();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "could-not-load-history");
      }

      setRole(isOwnerByAddress ? "owner" : "member");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "xmtp-init-failed");
      setRole("error");
    }
  }, [ready, authenticated, myAddress, wallets, group, identityToken, isOwnerByAddress]);

  useEffect(() => {
    void initRoom();
  }, [initRoom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onSend = async () => {
    if (sending) return;
    const draft = text.trim();
    if (!draft) return;
    const conv = conversationRef.current;
    if (!conv) return;
    setSending(true);
    try {
      // sendText is the string-content shorthand; conv.send takes
      // EncodedContent for typed content types we don't use here.
      await (conv as unknown as { sendText: (s: string) => Promise<string> }).sendText(draft);
      setText("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "send-failed");
    } finally {
      setSending(false);
    }
  };

  const onKnock = async () => {
    if (!identityToken || knocking) return;
    setKnocking(true);
    setErr(null);
    try {
      const res = await fetch(`/api/groups/${group.label}/request-join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${identityToken}`,
        },
        body: JSON.stringify({ note: knockNote.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? "knock-failed");
        return;
      }
      setKnocked(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "knock-failed");
    } finally {
      setKnocking(false);
    }
  };

  const onResolveRequest = async (req: PendingRequest, decision: "approve" | "decline") => {
    if (!identityToken || resolving) return;
    setResolving(req.address);
    setErr(null);
    try {
      // If approving, the OWNER's browser does the XMTP addMember call
      // first — that's what actually gates message decryption. The
      // resolver write is only the bulletin metadata.
      if (decision === "approve") {
        const conv = conversationRef.current;
        if (!conv) throw new Error("xmtp-room-not-loaded");
        await addMemberToGroup(conv, req.address);
      }
      const res = await fetch(`/api/groups/${group.label}/resolve-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${identityToken}`,
        },
        body: JSON.stringify({ address: req.address, decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? "resolve-failed");
        return;
      }
      setPending((curr) =>
        curr.filter((p) => p.address.toLowerCase() !== req.address.toLowerCase()),
      );
      if (decision === "approve") {
        setMemberCount((n) => n + 1);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "resolve-failed");
    } finally {
      setResolving(null);
    }
  };

  if (role === "loading") {
    return (
      <Shell>
        <GroupHeader group={group} memberCount={memberCount} />
        <div className="mono" style={{ fontSize: 12, color: "var(--ink-70)", textAlign: "center", padding: "32px 0", letterSpacing: "0.1em" }}>
          opening the door…
        </div>
      </Shell>
    );
  }

  if (role === "needs-sign-in") {
    return (
      <Shell>
        <GroupHeader group={group} memberCount={memberCount} />
        <Cartouche padding={28} style={{ maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
          <FleurDeLis size={26} style={{ margin: "0 auto 10px" }} />
          <div className="kicker" style={{ color: "var(--vermilion)" }}>SIGNED OUT</div>
          <p className="italic" style={{ fontSize: 15, color: "var(--ink-70)", lineHeight: 1.55, margin: "12px 0 18px" }}>
            Rooms are sealed by name. Sign in to ask the host to let you in.
          </p>
          <button onClick={() => login()} className="btn btn-ink">SIGN IN</button>
        </Cartouche>
      </Shell>
    );
  }

  if (role === "visitor") {
    return (
      <Shell>
        <GroupHeader group={group} memberCount={memberCount} />
        <Cartouche padding={28} style={{ maxWidth: 520, margin: "0 auto" }}>
          <div className="kicker" style={{ color: "var(--vermilion)", marginBottom: 6, textAlign: "center" }}>
            KNOCK ON THE DOOR
          </div>
          <p className="italic" style={{ fontSize: 15, color: "var(--ink-70)", lineHeight: 1.55, margin: "0 0 18px", textAlign: "center" }}>
            {knocked
              ? "The host knows you're here. They'll add you when they're back at their seal."
              : "Tell the host who you are and why you'd like in. They decide."}
          </p>
          {!knocked && (
            <>
              <textarea
                value={knockNote}
                onChange={(e) => setKnockNote(e.target.value.slice(0, 200))}
                placeholder="A line for the host: who you are, why this room"
                style={{
                  ...inputStyle,
                  minHeight: 80,
                  resize: "vertical",
                  fontFamily: "var(--body)",
                  fontStyle: "italic",
                }}
              />
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-50)", textAlign: "right", marginTop: 4, marginBottom: 12 }}>
                {knockNote.length} / 200
              </div>
              {err && (
                <div className="italic" style={{ fontSize: 13, color: "var(--vermilion)", textAlign: "center", marginBottom: 10 }}>
                  {err}
                </div>
              )}
              <button
                type="button"
                onClick={onKnock}
                disabled={knocking}
                className="btn btn-ink btn-block"
                style={{ cursor: knocking ? "wait" : "pointer", opacity: knocking ? 0.6 : 1 }}
              >
                {knocking ? "KNOCKING…" : "KNOCK"}
              </button>
            </>
          )}
          {knocked && (
            <div className="mono" style={{ fontSize: 11, color: "var(--verdigris)", textAlign: "center", letterSpacing: "0.2em" }}>
              ✓ KNOCK SENT
            </div>
          )}
        </Cartouche>
      </Shell>
    );
  }

  if (role === "error") {
    return (
      <Shell>
        <GroupHeader group={group} memberCount={memberCount} />
        <Cartouche padding={28} style={{ maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
          <div className="kicker" style={{ color: "var(--vermilion)" }}>THE ROOM WOULD NOT OPEN</div>
          <p className="italic" style={{ fontSize: 15, color: "var(--ink-70)", lineHeight: 1.55, margin: "12px 0 18px" }}>
            {err ?? "We couldn't reach the XMTP room. Try again in a moment."}
          </p>
          <button onClick={() => void initRoom()} className="btn btn-ink">RETRY</button>
        </Cartouche>
      </Shell>
    );
  }

  // Member / owner — render the chat
  return (
    <Shell>
      <GroupHeader group={group} memberCount={memberCount} />
      {role === "owner" && (
        <OwnerPanel
          group={group}
          pending={pending}
          resolving={resolving}
          onResolve={onResolveRequest}
        />
      )}
      <Cartouche
        padding={0}
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: "var(--bone)",
          overflow: "hidden",
        }}
      >
        <div
          ref={scrollRef}
          style={{
            minHeight: 360,
            maxHeight: 560,
            overflowY: "auto",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {messages.length === 0 ? (
            <div className="italic" style={{ fontSize: 14, color: "var(--ink-50)", textAlign: "center", padding: "40px 16px" }}>
              No words in this room yet. Be the first to leave a mark.
            </div>
          ) : (
            messages.map((m) => <MessageRow key={m.id} m={m} />)
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "12px 14px",
            borderTop: "0.5px solid var(--gilded)",
            background: "var(--parchment)",
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
            placeholder="A sealed word for the room…"
            style={{ ...inputStyle, padding: "10px 14px" }}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={sending || !text.trim()}
            className="display"
            style={{
              padding: "0 18px",
              background: "var(--vermilion)",
              color: "var(--parchment)",
              border: "none",
              fontFamily: "var(--display)",
              fontSize: 12,
              letterSpacing: "0.3em",
              cursor: sending || !text.trim() ? "not-allowed" : "pointer",
              opacity: sending || !text.trim() ? 0.5 : 1,
            }}
          >
            {sending ? "…" : "SEND"}
          </button>
        </div>
      </Cartouche>
      {err && (
        <div className="italic" style={{ fontSize: 13, color: "var(--vermilion)", textAlign: "center", marginTop: 14 }}>
          {err}
        </div>
      )}
    </Shell>
  );
}

function MessageRow({ m }: { m: UiMessage }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: m.fromMe ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: "78%",
          padding: "8px 12px",
          background: m.fromMe ? "var(--ink)" : "var(--parchment)",
          color: m.fromMe ? "var(--parchment)" : "var(--ink)",
          border: m.fromMe ? "none" : "0.5px solid var(--gilded)",
          fontSize: 15,
          lineHeight: 1.45,
          wordBreak: "break-word",
        }}
      >
        {m.text}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: "var(--ink-50)",
          marginTop: 3,
          letterSpacing: "0.05em",
        }}
      >
        {m.fromMe ? "you" : shortInbox(m.senderInboxId)} · {timeStr(m.sentAt)}
      </div>
    </div>
  );
}

function GroupHeader({ group, memberCount }: { group: GroupRecord; memberCount: number }) {
  return (
    <header style={{ maxWidth: 720, margin: "0 auto 24px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <SealPortrait address={group.ownerAddress} size={96} />
      </div>
      <div className="kicker" style={{ color: "var(--vermilion)" }}>
        A SEALED ROOM
      </div>
      <h1
        className="display"
        style={{
          fontSize: "clamp(28px, 5.5vw, 38px)",
          margin: "6px 0 4px",
          letterSpacing: "0.04em",
        }}
      >
        {group.topic || group.label}
      </h1>
      <div className="mono" style={{ fontSize: 12, color: "var(--ink-70)" }}>
        {group.ens}
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginTop: 12,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <SigilBadge kind={group.sigil} />
        <span className="display" style={{ fontSize: 10, letterSpacing: "0.3em", color: "var(--ink-70)" }}>
          {memberCount === 1 ? "1 SEAL" : `${memberCount} SEALS`}
        </span>
        {group.createdBy && (
          <span className="italic" style={{ fontSize: 12, color: "var(--ink-50)" }}>
            · opened by{" "}
            <Link
              href={`/${group.createdBy}`}
              className="mono"
              style={{
                color: "var(--ink-70)",
                textDecoration: "none",
                borderBottom: "0.5px dotted var(--gilded)",
              }}
            >
              {group.createdBy}
            </Link>
          </span>
        )}
      </div>
      {group.description && (
        <p
          className="italic"
          style={{
            fontSize: 15,
            color: "var(--ink-70)",
            margin: "16px auto 0",
            maxWidth: 560,
            lineHeight: 1.55,
          }}
        >
          {group.description}
        </p>
      )}
      <div className="hr-double" style={{ width: 100, margin: "20px auto 0" }} />
    </header>
  );
}

function SigilBadge({ kind }: { kind: SigilKind }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        background: "var(--bone)",
        border: "0.5px solid var(--gilded)",
      }}
    >
      <AlchemicalSigil kind={kind} size={14} frame={false} />
      <span className="display" style={{ fontSize: 9, letterSpacing: "0.3em", color: "var(--ink)" }}>
        {kind.toUpperCase()}
      </span>
    </span>
  );
}

function OwnerPanel({
  group,
  pending,
  resolving,
  onResolve,
}: {
  group: GroupRecord;
  pending: PendingRequest[];
  resolving: string | null;
  onResolve: (req: PendingRequest, decision: "approve" | "decline") => void;
}) {
  return (
    <Cartouche
      padding={20}
      style={{
        maxWidth: 720,
        margin: "0 auto 18px",
        background: "rgba(178, 58, 47, 0.05)",
      }}
    >
      <div className="kicker" style={{ color: "var(--vermilion)", marginBottom: 6 }}>
        YOU HOST THIS ROOM
      </div>
      <p className="italic" style={{ fontSize: 13, color: "var(--ink-70)", lineHeight: 1.5, margin: "0 0 14px" }}>
        {pending.length === 0
          ? "No one is knocking. Share the link to your room — only you can let people in."
          : `${pending.length} ${pending.length === 1 ? "person is" : "people are"} waiting at the door.`}
      </p>
      <div className="mono" style={{ fontSize: 11, color: "var(--ink-70)", marginBottom: pending.length ? 12 : 0 }}>
        share: <code style={{ color: "var(--ink)" }}>/g/{group.label}</code>
      </div>
      {pending.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pending.map((p) => {
            const busy = resolving === p.address;
            return (
              <div
                key={p.address}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  border: "0.5px solid var(--gilded)",
                  background: "var(--parchment)",
                  flexWrap: "wrap",
                }}
              >
                <SealPortrait address={p.address} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    href={p.ens ? `/${p.ens}` : "#"}
                    className="display"
                    style={{
                      fontSize: 13,
                      letterSpacing: "0.04em",
                      color: "var(--ink)",
                      textDecoration: "none",
                      borderBottom: "0.5px dotted var(--gilded)",
                    }}
                  >
                    {p.ens || `${p.address.slice(0, 6)}…${p.address.slice(-4)}`}
                  </Link>
                  {p.note && (
                    <div className="italic" style={{ fontSize: 13, color: "var(--ink-70)", marginTop: 2, lineHeight: 1.4 }}>
                      “{p.note}”
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => onResolve(p, "approve")}
                    disabled={busy}
                    className="display"
                    style={{
                      padding: "6px 12px",
                      background: "var(--ink)",
                      color: "var(--parchment)",
                      border: "none",
                      fontSize: 10,
                      letterSpacing: "0.25em",
                      cursor: busy ? "wait" : "pointer",
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    {busy ? "…" : "OPEN"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolve(p, "decline")}
                    disabled={busy}
                    className="italic"
                    style={{
                      padding: "6px 8px",
                      background: "transparent",
                      border: "none",
                      fontStyle: "italic",
                      fontSize: 12,
                      color: "var(--ink-70)",
                      cursor: busy ? "wait" : "pointer",
                    }}
                  >
                    decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Cartouche>
  );
}

function shortInbox(id: string): string {
  if (!id) return "anon";
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function timeStr(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="parchment-surface"
      style={{
        width: "100%",
        minHeight: "100vh",
        padding: "32px 20px 56px",
      }}
    >
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
