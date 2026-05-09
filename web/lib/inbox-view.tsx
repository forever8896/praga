"use client";

// The Letterbox — a single page that lists every sealed thread the signed-in
// user is part of, sorted by most recent letter, with live updates as new
// messages arrive. This is the answer to "where do I see my messages?" — one
// destination, reachable from the navbar at all times.
import { usePrivy, useSignMessage } from "@privy-io/react-auth";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Cartouche, FleurDeLis, WaxSeal } from "./ornaments";
import { getXmtpClient } from "./xmtp";
import { playMessagePing, setGlobalUnreadCount } from "./notify";

interface PeerRow {
  conversationId: string;
  peerAddress: string;
  peerInboxId: string;
  // Resolved from /api/lookup-ens — null while pending, set once known.
  label: string | null;
  ens: string | null;
  display: string;
  location: string;
  lastText: string;
  lastSentAt: Date | null;
  lastFromMe: boolean;
  // True when there is at least one message newer than the locally-stored
  // last-read marker AND the most recent sender is not us.
  unread: boolean;
}

const READ_MARKER_KEY = "pragueconnect.inbox.readAt";

function loadReadMarkers(): Record<string, number> {
  try {
    const raw = localStorage.getItem(READ_MARKER_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistReadMarkers(markers: Record<string, number>) {
  try {
    localStorage.setItem(READ_MARKER_KEY, JSON.stringify(markers));
  } catch {}
}

function formatWhen(d: Date | null): string {
  if (!d) return "—";
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function shortenAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function InboxView() {
  const { ready, authenticated, login, user } = usePrivy();
  const { signMessage } = useSignMessage();
  const [stage, setStage] = useState<
    "loading" | "needs-sign-in" | "preparing" | "ready" | "error"
  >("loading");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<PeerRow[]>([]);
  const myInboxIdRef = useRef<string>("");
  const myAddress = (user?.wallet?.address ?? "") as `0x${string}` | "";

  const refresh = useCallback(async () => {
    if (!myAddress) return;
    setStage("preparing");
    setErrMsg(null);
    try {
      const client = await getXmtpClient({
        address: myAddress as `0x${string}`,
        signMessage: async (message: string) => {
          const { signature } = await signMessage({ message });
          return signature;
        },
      });
      myInboxIdRef.current = client.inboxId ?? "";

      // Pull the latest from the network so brand-new threads show up.
      await client.conversations.sync();
      const dms = await client.conversations.listDms();

      // For each DM, gather peer inbox id + last message in parallel.
      const previews = await Promise.all(
        dms.map(async (dm) => {
          try {
            // dm.sync() fills in messages we haven't seen yet on this device.
            await dm.sync().catch(() => {});
            const [peerInboxId, last] = await Promise.all([
              dm.peerInboxId(),
              dm.lastMessage(),
            ]);
            const lastText =
              last && typeof last.content === "string" ? last.content : "";
            const lastSentAt = last
              ? new Date(Number(last.sentAtNs / BigInt(1_000_000)))
              : null;
            const lastSenderInboxId = last?.senderInboxId ?? null;
            return {
              conversationId: dm.id,
              peerInboxId,
              lastText,
              lastSentAt,
              lastSenderInboxId,
            };
          } catch {
            return null;
          }
        }),
      );

      const valid = previews.filter(
        (p): p is NonNullable<typeof p> => p !== null,
      );

      // Resolve each peer's address via getInboxStates, then look up ENS labels.
      const inboxIds = Array.from(new Set(valid.map((p) => p.peerInboxId))).filter(
        (id) => id && id.length > 0,
      );
      let inboxToAddress: Record<string, string> = {};
      if (inboxIds.length > 0) {
        try {
          const states = await client.preferences.getInboxStates(inboxIds);
          for (const s of states) {
            const ident = s.accountIdentifiers?.[0];
            if (ident?.identifier) {
              inboxToAddress[s.inboxId] = ident.identifier.toLowerCase();
            }
          }
        } catch {
          inboxToAddress = {};
        }
      }

      const addresses = Array.from(new Set(Object.values(inboxToAddress)));
      let ensLookup: Record<
        string,
        { label: string; ens: string; display: string; location: string }
      > = {};
      if (addresses.length > 0) {
        try {
          const res = await fetch("/api/lookup-ens", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ addresses }),
          });
          if (res.ok) {
            const data = await res.json();
            ensLookup = data?.records ?? {};
          }
        } catch {
          ensLookup = {};
        }
      }

      const markers = loadReadMarkers();

      const peerRows: PeerRow[] = valid.map((p) => {
        const peerAddress = inboxToAddress[p.peerInboxId] ?? "";
        const ensRec = peerAddress ? ensLookup[peerAddress] : undefined;
        const lastTs = p.lastSentAt ? p.lastSentAt.getTime() : 0;
        const readAt = markers[p.conversationId] ?? 0;
        const lastFromMe =
          p.lastSenderInboxId !== null &&
          p.lastSenderInboxId === myInboxIdRef.current;
        const unread = lastTs > readAt && !lastFromMe && p.lastSenderInboxId !== null;
        return {
          conversationId: p.conversationId,
          peerAddress,
          peerInboxId: p.peerInboxId,
          label: ensRec?.label ?? null,
          ens: ensRec?.ens ?? null,
          display:
            ensRec?.display ??
            (peerAddress ? shortenAddr(peerAddress) : "unknown sender"),
          location: ensRec?.location ?? "",
          lastText: p.lastText || "(no text yet)",
          lastSentAt: p.lastSentAt,
          lastFromMe,
          unread,
        };
      });

      peerRows.sort((a, b) => {
        const at = a.lastSentAt?.getTime() ?? 0;
        const bt = b.lastSentAt?.getTime() ?? 0;
        return bt - at;
      });

      setRows(peerRows);
      setStage("ready");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "letterbox-failed");
      setStage("error");
    }
  }, [myAddress, signMessage]);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setStage("needs-sign-in");
      return;
    }
    if (!myAddress) return;
    refresh();
  }, [ready, authenticated, myAddress, refresh]);

  // Live stream new messages so the inbox updates without a manual refresh.
  useEffect(() => {
    if (stage !== "ready" || !myAddress) return;
    let cancelled = false;
    let closer: { end: () => void } | null = null;
    (async () => {
      try {
        const client = await getXmtpClient({
          address: myAddress as `0x${string}`,
          signMessage: async (message: string) => {
            const { signature } = await signMessage({ message });
            return signature;
          },
        });
        const myInboxId = client.inboxId ?? "";
        const stream = await client.conversations.streamAllDmMessages();
        closer = { end: () => stream.return?.() };
        for await (const m of stream) {
          if (cancelled || !m) continue;
          if (typeof m.content !== "string") continue;
          // Soft chime when a sealed letter actually arrives FROM someone
          // else. Skip our own sends to avoid pinging the sender.
          if (myInboxId && m.senderInboxId !== myInboxId) {
            playMessagePing();
          }
          // Re-pull the inbox list when a new message lands. Cheap because
          // the XMTP client is cached and the network sync is incremental.
          refresh();
        }
      } catch {
        /* stream ended */
      }
    })();
    return () => {
      cancelled = true;
      closer?.end();
    };
  }, [stage, myAddress, refresh, signMessage]);

  const totalUnread = rows.filter((r) => r.unread).length;

  // Mirror the unread total into the cross-component channel so the navbar
  // badge can update without having to mount the inbox view itself.
  useEffect(() => {
    if (stage !== "ready") return;
    setGlobalUnreadCount(totalUnread);
  }, [stage, totalUnread]);

  return (
    <div
      className="parchment-surface"
      style={{
        width: "100%",
        minHeight: "100vh",
        padding: "24px 20px 32px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <FleurDeLis size={24} style={{ margin: "0 auto 6px" }} />
          <div
            className="t-display"
            style={{
              fontSize: 11,
              letterSpacing: "0.4em",
              color: "var(--vermilion)",
            }}
          >
            THE LETTERBOX
          </div>
          <div
            className="t-display"
            style={{ fontSize: 28, letterSpacing: "0.04em" }}
          >
            Your sealed letters
          </div>
          <div
            className="t-italic"
            style={{ fontSize: 14, color: "var(--ink-70)", marginTop: 4 }}
          >
            Every conversation you have on PragueConnect lives here.
            {totalUnread > 0 && (
              <>
                {" "}
                <span style={{ color: "var(--vermilion)" }}>
                  {totalUnread} new
                </span>
                .
              </>
            )}
          </div>
        </div>

        {stage === "needs-sign-in" && (
          <Cartouche padding={28} style={{ textAlign: "center" }}>
            <div
              className="t-display"
              style={{
                fontSize: 11,
                letterSpacing: "0.3em",
                color: "var(--vermilion)",
                marginBottom: 8,
              }}
            >
              SIGNED OUT
            </div>
            <div
              className="t-italic"
              style={{
                fontSize: 15,
                color: "var(--ink-70)",
                marginBottom: 14,
                lineHeight: 1.55,
              }}
            >
              Sign in to open your letterbox. Your wallet signs once for the
              XMTP installation key — every letter after is end-to-end
              encrypted.
            </div>
            <button onClick={login} style={btnDark}>
              SIGN IN
            </button>
          </Cartouche>
        )}

        {(stage === "loading" || stage === "preparing") && (
          <Centered>opening the letterbox…</Centered>
        )}

        {stage === "error" && (
          <Cartouche padding={28} style={{ textAlign: "center" }}>
            <div
              className="t-display"
              style={{
                fontSize: 11,
                letterSpacing: "0.3em",
                color: "var(--vermilion)",
                marginBottom: 8,
              }}
            >
              LETTERBOX UNREACHABLE
            </div>
            <div
              className="t-italic"
              style={{
                fontSize: 14,
                color: "var(--ink-70)",
                lineHeight: 1.55,
                marginBottom: 12,
              }}
            >
              {errMsg ?? "Something went wrong opening your letters."}
            </div>
            <button onClick={refresh} style={btnDark}>
              TRY AGAIN
            </button>
          </Cartouche>
        )}

        {stage === "ready" && rows.length === 0 && (
          <Cartouche padding={32} style={{ textAlign: "center" }}>
            <WaxSeal
              size={48}
              state="albedo"
              rotate={-6}
              emboss="fleur"
              style={{ margin: "0 auto 14px" }}
            />
            <div
              className="t-display"
              style={{
                fontSize: 11,
                letterSpacing: "0.3em",
                color: "var(--vermilion)",
                marginBottom: 8,
              }}
            >
              EMPTY LETTERBOX
            </div>
            <div
              className="t-italic"
              style={{
                fontSize: 15,
                color: "var(--ink-70)",
                lineHeight: 1.55,
                marginBottom: 14,
              }}
            >
              You haven't started a sealed letter yet. Open someone's seal on
              the town square and press <em>Open thread</em> to send the first
              line. New letters arriving here will show up live.
            </div>
            <Link href="/feed" style={btnDark}>
              GO TO THE TOWN SQUARE
            </Link>
          </Cartouche>
        )}

        {stage === "ready" && rows.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              border: "0.5px solid var(--gilded)",
              background: "var(--bone)",
            }}
          >
            {rows.map((r, i) => (
              <InboxRow
                key={r.conversationId}
                row={r}
                isLast={i === rows.length - 1}
              />
            ))}
          </div>
        )}

        <div className="t-mono" style={{
          fontSize: 10,
          color: "var(--ink-50)",
          textAlign: "center",
          letterSpacing: "0.1em",
          marginTop: 8,
        }}>
          END-TO-END ENCRYPTED · XMTP V3 / MLS · DEV NET
        </div>
      </div>
    </div>
  );
}

function InboxRow({ row, isLast }: { row: PeerRow; isLast: boolean }) {
  // Where to send the user when they tap the row. Prefer the ENS label so
  // the existing /m/[threadId] page resolves it; fall back to the address
  // for unclaimed peers (the thread page handles the missing-peer case).
  const href = row.label ? `/m/${row.label}` : `/m/${row.peerAddress}`;
  return (
    <Link
      href={href}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 14,
        alignItems: "center",
        padding: "14px 16px",
        textDecoration: "none",
        color: "inherit",
        borderBottom: isLast ? "none" : "0.5px solid var(--gilded)",
        background: row.unread ? "rgba(178, 58, 47, 0.05)" : "transparent",
        transition: "background 160ms ease",
      }}
    >
      <div style={{ position: "relative" }}>
        <WaxSeal
          size={36}
          state={row.unread ? "rubedo" : "albedo"}
          rotate={-6}
          emboss="fleur"
        />
        {row.unread && (
          <span
            aria-label="unread"
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "var(--vermilion)",
              border: "1.5px solid var(--bone)",
            }}
          />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            className="t-display"
            style={{
              fontSize: 16,
              letterSpacing: "0.02em",
              color: "var(--ink)",
              fontWeight: row.unread ? 600 : 500,
            }}
          >
            {row.display}
          </span>
          {row.ens && (
            <span
              className="t-mono"
              style={{ fontSize: 11, color: "var(--ink-50)" }}
            >
              {row.ens}
            </span>
          )}
        </div>
        <div
          className="t-italic"
          style={{
            fontSize: 14,
            color: row.unread ? "var(--ink)" : "var(--ink-70)",
            marginTop: 3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: row.unread ? 500 : 400,
          }}
        >
          {row.lastFromMe && (
            <span
              className="t-mono"
              style={{ fontSize: 11, color: "var(--ink-50)", marginRight: 6, letterSpacing: "0.1em" }}
            >
              YOU:
            </span>
          )}
          {row.lastText}
        </div>
      </div>
      <div
        className="t-mono"
        style={{
          fontSize: 11,
          color: row.unread ? "var(--vermilion)" : "var(--ink-50)",
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
        }}
      >
        {formatWhen(row.lastSentAt)}
      </div>
    </Link>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="t-mono"
      style={{
        fontSize: 12,
        color: "var(--ink-70)",
        textAlign: "center",
        padding: "60px 0",
        letterSpacing: "0.1em",
      }}
    >
      {children}
    </div>
  );
}

const btnDark: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 22px",
  background: "var(--ink)",
  color: "var(--parchment)",
  fontFamily: "var(--display)",
  fontSize: 12,
  letterSpacing: "0.3em",
  border: "none",
  cursor: "pointer",
  textDecoration: "none",
};

// Helper exposed so the thread view can mark a conversation read after it
// loads. Stored in localStorage so the inbox dot disappears on next visit.
export function markConversationRead(conversationId: string) {
  if (!conversationId) return;
  try {
    const raw = localStorage.getItem(READ_MARKER_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const markers = parsed && typeof parsed === "object" ? parsed : {};
    markers[conversationId] = Date.now();
    localStorage.setItem(READ_MARKER_KEY, JSON.stringify(markers));
  } catch {}
}
