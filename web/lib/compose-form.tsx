"use client";

// The real compose-an-offer form. Loads the user's existing `offers` record,
// lets them add a new one, posts back via /api/update-profile.
import { usePrivy, useIdentityToken } from "@privy-io/react-auth";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlchemicalSigil,
  Cartouche,
  CategoryChip,
  FleurDeLis,
  type SigilKind,
} from "./ornaments";
import { decodeOffers, encodeOffers, type OfferType, type StoredOffer } from "./offers";
import { useT } from "./i18n";

interface MyName {
  claimed: boolean;
  label?: string;
  ens?: string;
  text_records?: Record<string, string>;
}

const TYPES: OfferType[] = ["OFFER", "REQUEST", "GIFT"];

const CATEGORIES: Array<{ kind: SigilKind; label: string }> = [
  { kind: "forge", label: "REPAIR" },
  { kind: "mercury", label: "LANGUAGE" },
  { kind: "sulphur", label: "COOK" },
  { kind: "caduceus", label: "RIDE" },
  { kind: "saturn", label: "TUTOR" },
  { kind: "venus", label: "GIFT" },
  { kind: "alembic", label: "ERRANDS" },
];

export function ComposeForm() {
  const { ready, authenticated, login } = usePrivy();
  const { identityToken } = useIdentityToken();
  const t = useT();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [myName, setMyName] = useState<MyName | null>(null);
  const [existing, setExisting] = useState<StoredOffer[]>([]);

  // Form state
  const [type, setType] = useState<OfferType>("OFFER");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [kind, setKind] = useState<SigilKind>("forge");
  const [kc, setKc] = useState<string>("350");
  const [location, setLocation] = useState<string>("");

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
        if (!res.ok) {
          setErr(data.error ?? "could-not-load");
        } else {
          setMyName(data);
          if (data.claimed) {
            const tr: Record<string, string> = data.text_records ?? {};
            setExisting(decodeOffers(tr.offers));
            setLocation(tr.location ?? "");
          }
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

  const canPost = useMemo(
    () =>
      authenticated &&
      identityToken &&
      myName?.claimed &&
      title.trim().length > 4 &&
      !saving,
    [authenticated, identityToken, myName, title, saving],
  );

  const onPost = async () => {
    if (!myName?.label || !identityToken) return;
    setSaving(true);
    setErr(null);
    try {
      const kcNum = Math.max(0, Math.min(99999, Number.parseInt(kc, 10) || 0));
      const usdc = Math.round(kcNum / 28); // demo conversion 1 USDC ≈ 28 Kč
      const newOffer: StoredOffer = {
        id: `o${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        kind,
        type,
        title: title.trim(),
        detail: detail.trim() || undefined,
        kc: type === "GIFT" ? 0 : kcNum,
        usdc: type === "GIFT" ? 0 : usdc,
        location,
        posted_at: Math.floor(Date.now() / 1000),
      };
      const next = [newOffer, ...existing].slice(0, 30);
      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${identityToken}`,
        },
        body: JSON.stringify({
          label: myName.label,
          fields: { offers: encodeOffers(next) },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "post-failed");
        return;
      }
      router.push("/feed");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "post-failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!myName?.label || !identityToken) return;
    setSaving(true);
    setErr(null);
    try {
      const next = existing.filter((o) => o.id !== id);
      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${identityToken}`,
        },
        body: JSON.stringify({
          label: myName.label,
          fields: { offers: encodeOffers(next) },
        }),
      });
      if (res.ok) setExisting(next);
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <Shell><Loader text="preparing the wax…" /></Shell>;
  if (!authenticated) {
    return (
      <Shell>
        <Cartouche padding={32} style={{ textAlign: "center", maxWidth: 420 }}>
          <FleurDeLis size={28} style={{ margin: "0 auto 12px" }} />
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 8 }}>SIGNED OUT</div>
          <div className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", marginBottom: 18, lineHeight: 1.55 }}>
            Sign in to post an offer in the town square.
          </div>
          <button onClick={login} style={btnDark}>SIGN IN</button>
        </Cartouche>
      </Shell>
    );
  }
  if (loading) return <Shell><Loader text="opening your shelf…" /></Shell>;
  if (!myName?.claimed) {
    return (
      <Shell>
        <Cartouche padding={32} style={{ textAlign: "center", maxWidth: 460 }}>
          <FleurDeLis size={28} style={{ margin: "0 auto 12px" }} />
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 8 }}>NO NAME YET</div>
          <div className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", marginBottom: 18, lineHeight: 1.55 }}>
            You need a name in PragueConnect before you can post. Claim one first.
          </div>
          <a href="/" style={btnDark}>CLAIM A NAME</a>
        </Cartouche>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ maxWidth: 720, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.4em", color: "var(--vermilion)", marginBottom: 6 }}>{t("compose.kicker")}</div>
          <div className="t-display" style={{ fontSize: 30, letterSpacing: "0.04em" }}>{t("compose.byHandOf")} {myName.ens}</div>
          <div className="hr-double" style={{ width: 64, margin: "12px auto 0" }} />
        </div>

        <Cartouche padding={28} style={{ width: "100%" }}>
          {/* Type toggle */}
          <div style={{ display: "flex", border: "0.5px solid var(--gilded)", marginBottom: 22 }}>
            {TYPES.map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  background: type === t ? "var(--ink)" : "transparent",
                  color: type === t ? "var(--parchment)" : "var(--ink-70)",
                  fontFamily: "var(--display)",
                  fontSize: 11,
                  letterSpacing: "0.3em",
                  border: "none",
                  borderRight: i < TYPES.length - 1 ? "0.5px solid var(--gilded)" : "none",
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <Field label={type === "REQUEST" ? t("compose.youRequest") : type === "GIFT" ? t("compose.youGive") : t("compose.youOffer")}>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 140))}
              placeholder={type === "REQUEST" ? "to be picked up at 6am Tuesday" : "to fix your bicycle by sundown"}
              style={{ ...inputStyle, fontFamily: "var(--display)", fontSize: 22, letterSpacing: "0.02em", minHeight: 64, lineHeight: 1.2, resize: "vertical" }}
            />
            <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)", marginTop: 4 }}>{title.length} / 140 — first line shows on the feed</div>
          </Field>

          <Field label={t("compose.sayMore")}>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value.slice(0, 600))}
              placeholder="Where, when, what to bring."
              style={{ ...inputStyle, fontStyle: "italic", minHeight: 80, resize: "vertical", background: "var(--bone)" }}
            />
          </Field>

          <Field label={t("compose.underSign")}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.kind}
                  type="button"
                  onClick={() => setKind(c.kind)}
                  style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
                >
                  <CategoryChip kind={c.kind} label={c.label} active={kind === c.kind} />
                </button>
              ))}
            </div>
          </Field>

          {type !== "GIFT" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label={t("compose.forWork")}>
                <input
                  type="number"
                  value={kc}
                  onChange={(e) => setKc(e.target.value)}
                  min={0}
                  max={99999}
                  style={inputStyle}
                />
              </Field>
              <Field label={t("compose.where")}>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value.slice(0, 60))}
                  placeholder="Žižkov"
                  style={inputStyle}
                />
              </Field>
            </div>
          )}

          {type === "GIFT" && (
            <Field label="WHERE — neighbourhood">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value.slice(0, 60))}
                placeholder="Žižkov"
                style={inputStyle}
              />
            </Field>
          )}

          <div className="hr-gilded" style={{ margin: "20px 0 18px" }} />

          {err && (
            <div className="t-italic" style={{ fontSize: 13, color: "var(--vermilion)", textAlign: "center", marginBottom: 12 }}>
              {err}
            </div>
          )}

          <button
            type="button"
            onClick={onPost}
            disabled={!canPost}
            style={{ ...btnDark, width: "100%", opacity: canPost ? 1 : 0.5, cursor: canPost ? "pointer" : "not-allowed" }}
          >
            {saving ? "…" : t("compose.button.seal")}
          </button>
          <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)", textAlign: "center", marginTop: 10 }}>
            This entry is written to the `offers` text record under {myName.ens}. The town square reads it.
          </div>
        </Cartouche>

        {existing.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 6 }}>YOUR EXISTING POSTS</div>
            <div className="t-display" style={{ fontSize: 22, letterSpacing: "0.04em", marginBottom: 12 }}>{existing.length} on the wall</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {existing.map((o) => (
                <div key={o.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", border: "0.5px solid var(--gilded)" }}>
                  <AlchemicalSigil kind={o.kind} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-display" style={{ fontSize: 9, letterSpacing: "0.25em", color: "var(--vermilion)" }}>{o.type}</div>
                    <div className="t-body" style={{ fontSize: 14, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.title}</div>
                  </div>
                  <div className="t-display" style={{ fontSize: 13, color: "var(--ink-70)" }}>{o.type === "GIFT" ? "free" : `${o.kc} Kč`}</div>
                  <button type="button" onClick={() => onDelete(o.id)} style={{ background: "transparent", border: "none", color: "var(--vermilion)", fontSize: 18, cursor: "pointer", padding: "4px 8px" }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}
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

function Loader({ text }: { text: string }) {
  return (
    <div className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)", letterSpacing: "0.1em", paddingTop: 80 }}>{text}</div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="t-mono" style={{ fontSize: 10, letterSpacing: "0.25em", color: "var(--gilded-soft)", marginBottom: 6 }}>{label}</div>
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
