"use client";

// Sealed XMTP thread view. The user's Privy wallet signs an installation key
// once (XMTP "registration"), then conversations are E2E encrypted on the
// XMTP network. UI streams new messages and lets the user reply.
import { usePrivy, useSignMessage } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Cartouche, FleurDeLis, WaxSeal } from "./ornaments";
import { getXmtpClient, openDm, type XmtpConversation, type XmtpMessage } from "./xmtp";
import { EscrowPanel } from "./escrow-panel";

interface Peer {
  label: string;
  ens: string;
  display: string;
  address: `0x${string}` | null;
  location: string;
  found: boolean;
  stealthMeta?: string;
}

interface UiMessage {
  id: string;
  fromMe: boolean;
  text: string;
  sentAt: Date;
}

function decodeMessage(m: XmtpMessage, myInboxId: string): UiMessage | null {
  // We only render text messages; group-update and other content kinds skip.
  if (typeof m.content !== "string") return null;
  return {
    id: m.id,
    fromMe: m.senderInboxId === myInboxId,
    text: m.content,
    sentAt: new Date(Number(m.sentAtNs / BigInt(1_000_000))),
  };
}

export function ThreadView({ peer }: { peer: Peer }) {
  const { ready, authenticated, login, user } = usePrivy();
  const { signMessage } = useSignMessage();

  const [stage, setStage] = useState<"loading" | "needs-sign-in" | "preparing" | "ready" | "missing-peer" | "error">(
    "loading",
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const conversationRef = useRef<XmtpConversation | null>(null);
  const myInboxIdRef = useRef<string>("");
  const streamCloserRef = useRef<{ end: () => void } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const myAddress = (user?.wallet?.address ?? "") as `0x${string}` | "";

  const initThread = useCallback(async () => {
    if (!myAddress || !peer.address) return;
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
      const conversation = await openDm(client, peer.address);
      conversationRef.current = conversation;

      // Initial history.
      await conversation.sync();
      const history = await conversation.messages();
      const decoded = history
        .map((m) => decodeMessage(m, myInboxIdRef.current))
        .filter((m): m is UiMessage => m !== null);
      setMessages(decoded);

      // Live stream.
      const stream = await conversation.stream();
      // The stream is async-iterable.
      (async () => {
        try {
          for await (const m of stream) {
            if (!m) continue;
            const decoded = decodeMessage(m as unknown as XmtpMessage, myInboxIdRef.current);
            if (!decoded) continue;
            setMessages((curr) =>
              curr.some((x) => x.id === decoded.id) ? curr : [...curr, decoded],
            );
          }
        } catch {
          /* stream ended */
        }
      })();
      streamCloserRef.current = { end: () => stream.return?.() };

      setStage("ready");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "xmtp-init-failed");
      setStage("error");
    }
  }, [myAddress, peer.address, signMessage]);

  useEffect(() => {
    if (!ready) return;
    if (!peer.found || !peer.address) {
      setStage("missing-peer");
      return;
    }
    if (!authenticated) {
      setStage("needs-sign-in");
      return;
    }
    if (myAddress && peer.address.toLowerCase() === myAddress.toLowerCase()) {
      setErrMsg("You can't open a thread with yourself.");
      setStage("error");
      return;
    }
    initThread();
    return () => {
      streamCloserRef.current?.end();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, myAddress, peer.address]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const onSend = async () => {
    const conversation = conversationRef.current;
    if (!conversation || !text.trim()) return;
    setSending(true);
    try {
      await conversation.sendText(text.trim());
      setText("");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "send-failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="parchment-surface" style={{ width: "100%", minHeight: "100vh", padding: "24px 20px 32px", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 720, width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ textAlign: "center" }}>
          <FleurDeLis size={24} style={{ margin: "0 auto 6px" }} />
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.4em", color: "var(--vermilion)" }}>SEALED LETTER TO</div>
          <div className="t-display" style={{ fontSize: 28, letterSpacing: "0.04em" }}>{peer.display}</div>
          <div className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)" }}>{peer.ens}</div>
        </div>

        {stage === "loading" && <Centered>preparing the wax…</Centered>}

        {stage === "missing-peer" && (
          <Cartouche padding={28} style={{ textAlign: "center" }}>
            <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 8 }}>NO SUCH NAME</div>
            <div className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", marginBottom: 14 }}>
              {peer.ens} hasn't been claimed in Praga. Threads only work between sealed names.
            </div>
            <Link href="/feed" style={btnDark}>BACK TO THE SQUARE</Link>
          </Cartouche>
        )}

        {stage === "needs-sign-in" && (
          <Cartouche padding={28} style={{ textAlign: "center" }}>
            <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 8 }}>SIGNED OUT</div>
            <div className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", marginBottom: 14 }}>
              Sign in to open a sealed thread. Your wallet signs once for the XMTP installation key — every message after is end-to-end encrypted.
            </div>
            <button onClick={login} style={btnDark}>SIGN IN</button>
          </Cartouche>
        )}

        {stage === "preparing" && (
          <Cartouche padding={28} style={{ textAlign: "center" }}>
            <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", lineHeight: 1.55 }}>
              Sign the prompt to seal your XMTP installation key. After this you won't be asked again on this device.
            </div>
          </Cartouche>
        )}

        {stage === "error" && (
          <Cartouche padding={28} style={{ textAlign: "center" }}>
            <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 8 }}>STREAM BROKEN</div>
            <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", lineHeight: 1.55, marginBottom: 12 }}>
              {errMsg ?? "Something went wrong opening the thread."}
            </div>
            <button onClick={initThread} style={btnDark}>TRY AGAIN</button>
          </Cartouche>
        )}

        {stage === "ready" && (
          <>
            <EscrowPanel
              myAddress={myAddress as `0x${string}` | null}
              peerAddress={peer.address}
              peerEns={peer.ens}
              peerStealthMeta={peer.stealthMeta ?? ""}
              onSystemMessage={async (text) => {
                const c = conversationRef.current;
                if (!c) return;
                try {
                  await c.sendText(text);
                } catch {}
              }}
            />
            <div ref={scrollRef} style={{ flex: 1, minHeight: 320, maxHeight: "60vh", overflowY: "auto", padding: "8px 4px", display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.length === 0 ? (
                <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", textAlign: "center", padding: "40px 0" }}>
                  No letters yet. Be the first to write.
                </div>
              ) : (
                messages.map((m) => <Bubble key={m.id} m={m} peerName={peer.display} />)
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                placeholder={`Write to ${peer.display.split(" ")[0]}…`}
                style={{ flex: 1, padding: "12px 14px", background: "var(--bone)", border: "0.5px solid var(--gilded)", fontFamily: "var(--body)", fontStyle: "italic", fontSize: 15, color: "var(--ink)", outline: "none" }}
              />
              <button
                type="button"
                onClick={onSend}
                disabled={sending || !text.trim()}
                style={{ padding: "12px 18px", background: "var(--ink)", color: "var(--parchment)", fontFamily: "var(--display)", fontSize: 11, letterSpacing: "0.3em", border: "none", cursor: sending ? "wait" : "pointer", opacity: text.trim() && !sending ? 1 : 0.5, display: "inline-flex", alignItems: "center", gap: 10 }}
              >
                <WaxSeal size={16} state="rubedo" rotate={-7} emboss="fleur" />
                {sending ? "SEALING…" : "SEAL"}
              </button>
            </div>
            <div className="t-mono" style={{ fontSize: 10, color: "var(--ink-50)", textAlign: "center", letterSpacing: "0.1em" }}>
              END-TO-END ENCRYPTED · XMTP V3 / MLS · DEV NET
            </div>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 12 }}>
          <Link href={`/${peer.ens}`} className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)" }}>
            ← back to {peer.display.split(" ")[0]}'s seal
          </Link>
        </div>
      </div>
    </div>
  );
}

function Bubble({ m, peerName }: { m: UiMessage; peerName: string }) {
  const align = m.fromMe ? "flex-end" : "flex-start";
  const bg = m.fromMe ? "var(--ink)" : "var(--bone)";
  const fg = m.fromMe ? "var(--parchment)" : "var(--ink)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align, gap: 4 }}>
      <div className="t-mono" style={{ fontSize: 9, color: "var(--ink-50)", letterSpacing: "0.15em" }}>
        {m.fromMe ? "YOU" : peerName.toUpperCase()} · {m.sentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div
        style={{
          background: bg,
          color: fg,
          padding: "10px 14px",
          maxWidth: "78%",
          fontFamily: "var(--body)",
          fontSize: 15,
          lineHeight: 1.45,
          border: m.fromMe ? "none" : "0.5px solid var(--gilded)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {m.text}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)", textAlign: "center", padding: "60px 0", letterSpacing: "0.1em" }}>
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
