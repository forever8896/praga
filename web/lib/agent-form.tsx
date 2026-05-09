"use client";

// ENSIP-25 agent delegation. The human signs an attestation that names an
// agent address + scopes + expiry. The attestation is stored as the
// `agent-registration` text record on `<label>.pragueconnect.eth`. Any client (or
// agent) reading the subname can verify what the human authorised.
//
// This is a creative use of ENS for the AI Agents bounty: no ENSIP yet
// formalises the text-record name `agent-registration`, so we propose
// the convention via this implementation.

import { usePrivy, useSignMessage } from "@privy-io/react-auth";
import { useAccessToken } from "./use-access-token";
import { useEffect, useState } from "react";
import { Cartouche, FleurDeLis, AlchemicalSigil } from "./ornaments";
import Link from "next/link";

const SCOPE_OPTIONS = [
  { id: "read-feed", label: "Read the town square (browse offers)" },
  { id: "post-offer", label: "Post offers on my behalf" },
  { id: "accept-work", label: "Accept work proposed to me" },
  { id: "send-tip", label: "Send small tips up to a daily limit" },
  { id: "open-thread", label: "Open new sealed threads" },
] as const;

interface MyName {
  claimed: boolean;
  label?: string;
  ens?: string;
  text_records?: Record<string, string>;
}

interface AgentRegistration {
  v: 1;
  agentAddress: `0x${string}`;
  scopes: string[];
  dailyTipCapEth?: string;
  issuedAt: number;
  expiresAt: number;
  signedBy: `0x${string}`;
  signature: `0x${string}`;
}

function parseRegistration(raw: string | undefined): AgentRegistration | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (typeof o !== "object" || !o) return null;
    if (o.v !== 1) return null;
    if (!/^0x[a-fA-F0-9]{40}$/.test(o.agentAddress)) return null;
    return o as AgentRegistration;
  } catch {
    return null;
  }
}

export function AgentForm() {
  const { ready, authenticated, login, user } = usePrivy();
  const { accessToken: identityToken } = useAccessToken();
  const { signMessage } = useSignMessage();

  const [myName, setMyName] = useState<MyName | null>(null);
  const [existing, setExisting] = useState<AgentRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [agentAddress, setAgentAddress] = useState("");
  const [scopes, setScopes] = useState<Set<string>>(new Set(["read-feed"]));
  const [dailyCapEth, setDailyCapEth] = useState("0.005");
  const [validDays, setValidDays] = useState("30");

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !identityToken) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/my-name", {
          headers: { Authorization: `Bearer ${identityToken}` },
        });
        const data = await res.json();
        if (cancelled) return;
        setMyName(data);
        const tr: Record<string, string> = data.text_records ?? {};
        const reg = parseRegistration(tr["agent-registration"]);
        setExisting(reg);
        if (reg) {
          setAgentAddress(reg.agentAddress);
          setScopes(new Set(reg.scopes));
          setDailyCapEth(reg.dailyTipCapEth ?? "");
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "fetch-failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, identityToken]);

  const onRegister = async () => {
    if (!myName?.label || !identityToken) return;
    if (!/^0x[a-fA-F0-9]{40}$/.test(agentAddress)) {
      setErr("Agent address must be a 0x… EOA");
      return;
    }
    if (scopes.size === 0) {
      setErr("Pick at least one scope");
      return;
    }
    const days = Math.max(1, Math.min(365, Number.parseInt(validDays, 10) || 30));
    setSaving(true);
    setErr(null);
    try {
      const issuedAt = Math.floor(Date.now() / 1000);
      const expiresAt = issuedAt + days * 86400;
      const myAddr = (user?.wallet?.address ?? "") as `0x${string}`;
      const message = [
        "PragueConnect · ENSIP-25 agent delegation",
        `principal: ${myName.ens}`,
        `agent: ${agentAddress.toLowerCase()}`,
        `scopes: ${[...scopes].sort().join(",")}`,
        `dailyTipCapEth: ${dailyCapEth || "0"}`,
        `issuedAt: ${issuedAt}`,
        `expiresAt: ${expiresAt}`,
        `signedBy: ${myAddr.toLowerCase()}`,
      ].join("\n");

      const { signature } = await signMessage({ message });

      const reg: AgentRegistration = {
        v: 1,
        agentAddress: agentAddress.toLowerCase() as `0x${string}`,
        scopes: [...scopes].sort(),
        dailyTipCapEth: dailyCapEth || undefined,
        issuedAt,
        expiresAt,
        signedBy: myAddr.toLowerCase() as `0x${string}`,
        signature: signature as `0x${string}`,
      };

      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${identityToken}` },
        body: JSON.stringify({
          label: myName.label,
          fields: { "agent-registration": JSON.stringify(reg) },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "register-failed");
        return;
      }
      setExisting(reg);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "register-failed");
    } finally {
      setSaving(false);
    }
  };

  const onRevoke = async () => {
    if (!myName?.label || !identityToken) return;
    setSaving(true);
    try {
      await fetch("/api/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${identityToken}` },
        body: JSON.stringify({ label: myName.label, fields: { "agent-registration": "" } }),
      });
      setExisting(null);
      setAgentAddress("");
      setScopes(new Set(["read-feed"]));
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <Shell><Loader>preparing…</Loader></Shell>;
  if (!authenticated) {
    return (
      <Shell>
        <Cartouche padding={32} style={{ textAlign: "center", maxWidth: 460 }}>
          <FleurDeLis size={28} style={{ margin: "0 auto 12px" }} />
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 8 }}>SIGNED OUT</div>
          <div className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", lineHeight: 1.55, marginBottom: 18 }}>
            Sign in to delegate a familiar — an agent that may act on your behalf with scoped permission.
          </div>
          <button onClick={login} style={btnDark}>SIGN IN</button>
        </Cartouche>
      </Shell>
    );
  }
  if (loading) return <Shell><Loader>opening your shelf…</Loader></Shell>;
  if (!myName?.claimed) {
    return (
      <Shell>
        <Cartouche padding={32} style={{ textAlign: "center", maxWidth: 460 }}>
          <FleurDeLis size={28} style={{ margin: "0 auto 12px" }} />
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 8 }}>NO NAME YET</div>
          <div className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", marginBottom: 18, lineHeight: 1.55 }}>
            Claim your name in PragueConnect first. A familiar lives under it.
          </div>
          <Link href="/" style={btnDark}>CLAIM A NAME</Link>
        </Cartouche>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ maxWidth: 720, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <FleurDeLis size={28} style={{ margin: "0 auto 6px" }} />
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.4em", color: "var(--vermilion)" }}>THE FAMILIAR</div>
          <div className="t-display" style={{ fontSize: 32, letterSpacing: "0.04em" }}>An agent under your seal</div>
          <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", maxWidth: 540, margin: "8px auto 0", lineHeight: 1.55 }}>
            ENSIP-25 delegation — your principal name <code className="t-mono">{myName.ens}</code> signs a scoped attestation that names an agent address. Any client reads the attestation from the <code className="t-mono">agent-registration</code> text record and verifies your signature.
          </div>
          <div className="hr-double" style={{ width: 80, margin: "14px auto 0" }} />
        </div>

        <Cartouche padding={28}>
          {existing && (
            <div style={{ marginBottom: 18, padding: "12px 14px", background: "var(--bone)", border: "0.5px solid var(--gilded)" }}>
              <div className="t-mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--verdigris)", marginBottom: 6 }}>✓ ACTIVE FAMILIAR</div>
              <div className="t-mono" style={{ fontSize: 11, color: "var(--ink)", wordBreak: "break-all" }}>{existing.agentAddress}</div>
              <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)", marginTop: 6 }}>
                scopes: {existing.scopes.join(" · ")} · expires {new Date(existing.expiresAt * 1000).toLocaleDateString("cs-CZ")}
              </div>
              <button onClick={onRevoke} disabled={saving} className="t-display" style={{ marginTop: 8, fontSize: 10, letterSpacing: "0.25em", color: "var(--vermilion)", background: "transparent", border: "none", cursor: saving ? "wait" : "pointer", padding: 0 }}>
                {saving ? "…" : "REVOKE"}
              </button>
            </div>
          )}

          <Field label="AGENT ADDRESS — 0x…">
            <input
              value={agentAddress}
              onChange={(e) => setAgentAddress(e.target.value.trim())}
              placeholder="0xAgentEOA…"
              style={input}
            />
          </Field>

          <Field label="SCOPES">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {SCOPE_OPTIONS.map((s) => (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "4px 0" }}>
                  <input
                    type="checkbox"
                    checked={scopes.has(s.id)}
                    onChange={(e) => {
                      const next = new Set(scopes);
                      if (e.target.checked) next.add(s.id);
                      else next.delete(s.id);
                      setScopes(next);
                    }}
                  />
                  <AlchemicalSigil kind="saturn" size={18} frame={false} />
                  <span className="t-body" style={{ fontSize: 14 }}>{s.label}</span>
                </label>
              ))}
            </div>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="DAILY TIP CAP — ETH">
              <input
                type="number"
                step="0.0001"
                value={dailyCapEth}
                onChange={(e) => setDailyCapEth(e.target.value)}
                style={input}
              />
            </Field>
            <Field label="VALID FOR — DAYS">
              <input
                type="number"
                min={1}
                max={365}
                value={validDays}
                onChange={(e) => setValidDays(e.target.value)}
                style={input}
              />
            </Field>
          </div>

          {err && <div className="t-italic" style={{ fontSize: 13, color: "var(--vermilion)", textAlign: "center", margin: "10px 0" }}>{err}</div>}

          <button
            type="button"
            onClick={onRegister}
            disabled={saving}
            style={{ ...btnDark, width: "100%", marginTop: 8, opacity: saving ? 0.5 : 1, cursor: saving ? "wait" : "pointer" }}
          >
            {saving ? "…" : existing ? "RE-SIGN ATTESTATION" : "BIND THE FAMILIAR"}
          </button>

          <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
            One signature. The attestation is written to the <code className="t-mono">agent-registration</code> text record under {myName.ens}. ERC-8004 Identity Registry on-chain registration is scoped post-hackathon.
          </div>
        </Cartouche>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="parchment-surface" style={{ width: "100%", minHeight: "100vh", padding: "32px 20px 48px", display: "flex", justifyContent: "center" }}>
      {children}
    </div>
  );
}

function Loader({ children }: { children: React.ReactNode }) {
  return <div className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)", padding: "60px 0", letterSpacing: "0.1em" }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="t-mono" style={{ fontSize: 9, letterSpacing: "0.25em", color: "var(--gilded-soft)", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "transparent",
  border: "0.5px solid var(--gilded)", fontFamily: "var(--body)",
  fontSize: 15, color: "var(--ink)", outline: "none", boxSizing: "border-box",
};

const btnDark: React.CSSProperties = {
  display: "inline-block", padding: "12px 22px", background: "var(--ink)",
  color: "var(--parchment)", fontFamily: "var(--display)", fontSize: 12,
  letterSpacing: "0.3em", border: "none", cursor: "pointer", textDecoration: "none",
};
