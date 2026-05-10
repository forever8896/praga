"use client";

// Live-rotation widget — small client-side panel on the profile page that
// polls /api/stealth/peek every few seconds and shows the address the CCIP
// gateway is currently handing out. Rolls over on the gateway's natural
// rotation cadence so visitors can see "this name resolves to a different
// address every few seconds" without trusting our copy.
//
// Hidden when the profile owner hasn't opted into rotation.
import { useEffect, useRef, useState } from "react";

interface PeekResponse {
  address?: string;
  rotating?: boolean;
  ts?: number;
}

const POLL_INTERVAL_MS = 6000;
const HISTORY_CAP = 4;

export function RotationWidget({ label, ens }: { label: string; ens: string }) {
  const [current, setCurrent] = useState<string | null>(null);
  const [history, setHistory] = useState<{ address: string; ts: number }[]>([]);
  const [rotating, setRotating] = useState<boolean | null>(null);
  const lastRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/stealth/peek?label=${encodeURIComponent(label)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as PeekResponse;
        if (cancelled) return;
        const isRotating = !!data.rotating;
        setRotating(isRotating);
        if (!isRotating) return;
        if (data.address && data.address !== lastRef.current) {
          lastRef.current = data.address;
          setCurrent(data.address);
          setHistory((h) => {
            const ts = data.ts ?? Date.now();
            const next = [{ address: data.address as string, ts }, ...h];
            return next.slice(0, HISTORY_CAP);
          });
        }
      } catch {
        /* network blips are fine — next tick will retry */
      }
    }
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [label]);

  if (rotating === false) return null;

  const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
  const ageSeconds = (ts: number) => Math.max(0, Math.floor((Date.now() - ts) / 1000));

  return (
    <div
      style={{
        marginTop: 12,
        padding: "14px 16px",
        border: "0.5px solid var(--gilded)",
        background: "rgba(82, 114, 96, 0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--verdigris)",
            boxShadow: "0 0 0 4px rgba(82,114,96,0.18)",
            animation: "pc-rotation-pulse 2s ease-in-out infinite",
          }}
        />
        <div className="t-display" style={{ fontSize: 10, letterSpacing: "0.3em", color: "var(--verdigris)", textTransform: "uppercase" }}>
          {ens} · resolving live
        </div>
      </div>

      <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)", lineHeight: 1.5, marginBottom: 10 }}>
        Every wallet that resolves this name right now sees a fresh stealth address. The on-chain trail to the human behind the name lives only off-chain.
      </div>

      <div className="t-mono" style={{ fontSize: 13, color: "var(--ink)", wordBreak: "break-all", padding: "8px 10px", background: "var(--bone)", border: "0.5px solid var(--gilded)" }}>
        {current ? short(current) : "…"}
      </div>

      {history.length > 1 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 2 }}>
          <div className="t-display" style={{ fontSize: 9, letterSpacing: "0.25em", color: "var(--ink-50)", marginBottom: 4 }}>
            previously
          </div>
          {history.slice(1).map((h) => (
            <div key={h.address + h.ts} className="t-mono" style={{ fontSize: 11, color: "var(--ink-50)", display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>{short(h.address)}</span>
              <span style={{ color: "var(--ink-30)" }}>{ageSeconds(h.ts)}s ago</span>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes pc-rotation-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
