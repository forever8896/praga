"use client";

// Owner-gated invite-codes panel for /<ens>. Lets the seal-holder see all
// the codes they've ever minted (used + unused), copy each one's invite URL,
// and mint a fresh batch if the pool is empty. Mirrors the InviteCodeBlock
// shown right after claim — but persists, so refreshing the page or coming
// back days later still shows the codes.
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { useAccessToken } from "./use-access-token";

interface InviteRow {
  code: string;
  used: boolean;
  usedBy: string | null;
}

export function MyInvitesCartouche({
  ownerAddress,
}: {
  ownerAddress: `0x${string}` | null;
}) {
  const { ready, authenticated, user } = usePrivy();
  const { accessToken } = useAccessToken();
  const [rows, setRows] = useState<InviteRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const myAddr = user?.wallet?.address;
  const isOwner =
    !!ownerAddress &&
    !!myAddr &&
    myAddr.toLowerCase() === ownerAddress.toLowerCase();

  useEffect(() => {
    if (!ready || !authenticated || !accessToken || !isOwner) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/my-invites", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setErr(data?.error ?? "failed-to-load");
          setRows([]);
        } else {
          setRows(
            (data.codes ?? []).map((r: { code: string; used: boolean; usedBy: string | null }) => ({
              code: r.code,
              used: r.used,
              usedBy: r.usedBy,
            })),
          );
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "load-failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, accessToken, isOwner]);

  const onMint = async () => {
    if (!accessToken) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/my-invites", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? "mint-failed");
        return;
      }
      setRows(
        (data.records ?? []).map((r: { code: string; used: boolean; usedBy: string | null }) => ({
          code: r.code,
          used: r.used,
          usedBy: r.usedBy,
        })),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "mint-failed");
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async (url: string, code: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1800);
    } catch {
      /* ignore */
    }
  };

  if (!ready || !authenticated || !isOwner) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const hasUnused = rows?.some((r) => !r.used) ?? false;

  return (
    <div
      className="cartouche"
      style={{
        marginTop: 24,
        padding: 22,
        textAlign: "left",
      }}
    >
      <div
        className="kicker"
        style={{ marginBottom: 10, textAlign: "center" }}
      >
        YOUR SEALS TO PASS ON
      </div>
      <p
        className="italic"
        style={{
          fontSize: 14,
          color: "var(--ink-70)",
          margin: "0 0 14px",
          textAlign: "center",
          lineHeight: 1.55,
        }}
      >
        Each code opens a single seat in the guild. When the recipient tips,
        5% returns to you as a finder&rsquo;s mark.
      </p>

      {loading && !rows && (
        <div className="mono-caps" style={{ textAlign: "center", color: "var(--ink-50)" }}>
          LOADING…
        </div>
      )}

      {err && (
        <div
          className="italic"
          style={{ fontSize: 13, color: "var(--vermilion)", textAlign: "center", marginBottom: 12 }}
        >
          {err}
        </div>
      )}

      {rows && rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => {
            const url = `${origin}/i/${r.code}`;
            const isCopied = copied === r.code;
            return (
              <div
                key={r.code}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  border: "0.5px solid var(--gilded)",
                  background: "var(--parchment)",
                  opacity: r.used ? 0.55 : 1,
                }}
              >
                <span
                  className="mono"
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: "var(--ink)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textDecoration: r.used ? "line-through" : "none",
                  }}
                >
                  {url}
                </span>
                {r.used ? (
                  <span
                    className="mono-caps"
                    style={{ color: "var(--verdigris)", fontSize: 9 }}
                    title={r.usedBy ?? "opened"}
                  >
                    OPENED
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onCopy(url, r.code)}
                    className="copy-btn"
                    style={{ color: isCopied ? "var(--verdigris)" : "var(--vermilion)" }}
                  >
                    {isCopied ? "copied" : "copy"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rows && rows.length === 0 && !loading && (
        <div
          className="italic"
          style={{ fontSize: 14, color: "var(--ink-70)", textAlign: "center", marginBottom: 14 }}
        >
          No codes minted yet.
        </div>
      )}

      {rows && !hasUnused && (
        <div style={{ marginTop: 14, textAlign: "center" }}>
          <button
            type="button"
            onClick={onMint}
            disabled={loading}
            className="btn btn-vermilion btn-sm"
          >
            {loading ? "MINTING…" : "MINT FRESH SEALS"}
          </button>
        </div>
      )}
    </div>
  );
}
