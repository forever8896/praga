"use client";

// The real edit-your-seal form. Loads NameStone record for the signed-in
// user's wallet, lets them edit bio/location/avatar/skills, posts back.
import { usePrivy, useSignMessage } from "@privy-io/react-auth";
import { useAccessToken } from "./use-access-token";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Cartouche, FleurDeLis, AlchemicalSigil, type SigilKind } from "./ornaments";
import { derivePragueConnectKeys, PRAGUECONNECT_STEALTH_MESSAGE } from "./stealth";
import { useT, useI18n } from "./i18n";
import { NeighbourhoodPicker } from "./neighborhoods";
import { SealPortrait } from "./seal-portrait";

interface Skill {
  kind: SigilKind;
  name: string;
  price: string;
}

interface MyName {
  claimed: boolean;
  label?: string;
  ens?: string;
  text_records?: Record<string, string>;
}

const KIND_OPTIONS: SigilKind[] = ["forge", "alembic", "venus", "mercury", "saturn", "caduceus", "sulphur"];

function decodeSkills(raw: string | undefined): Skill[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => s && typeof s === "object")
      .map((s: { kind?: string; name?: string; price?: string }) => ({
        kind: (KIND_OPTIONS as string[]).includes(s.kind ?? "") ? (s.kind as SigilKind) : "forge",
        name: typeof s.name === "string" ? s.name : "",
        price: typeof s.price === "string" ? s.price : "",
      }));
  } catch {
    return [];
  }
}

export function EditForm() {
  const { ready, authenticated, login, user } = usePrivy();
  const { accessToken: identityToken } = useAccessToken();
  const { signMessage } = useSignMessage();
  const t = useT();
  const { lang } = useI18n();
  const skillPricePlaceholder = lang === "en" ? "from $20 / hr" : "od 200 Kč / hod";
  const router = useRouter();
  const [sealing, setSealing] = useState(false);
  const [stealthMeta, setStealthMeta] = useState("");
  const [rotateAddr, setRotateAddr] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedAt, setPublishedAt] = useState<{ limo: string; ipfs: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [myName, setMyName] = useState<MyName | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [avatar, setAvatar] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);

  const address = user?.wallet?.address;

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
            setDisplayName(tr.name ?? "");
            setBio(tr.description ?? "");
            setLocation(tr.location ?? "");
            setAvatar(tr.avatar ?? "");
            setSkills(decodeSkills(tr.skills));
            setStealthMeta(tr["stealth-meta-address"] ?? "");
            setRotateAddr(tr["stealth-rotate-addr"] === "true");
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

  const canSave = useMemo(
    () => authenticated && identityToken && myName?.claimed && !saving,
    [authenticated, identityToken, myName, saving],
  );

  const onSealStealth = async () => {
    if (!myName?.label || !identityToken) return;
    setSealing(true);
    setErr(null);
    try {
      const { signature } = await signMessage({ message: PRAGUECONNECT_STEALTH_MESSAGE });
      const keys = derivePragueConnectKeys(signature as `0x${string}`);
      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${identityToken}`,
        },
        body: JSON.stringify({
          label: myName.label,
          fields: { "stealth-meta-address": keys.metaAddress },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "stealth-save-failed");
        return;
      }
      setStealthMeta(keys.metaAddress);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "stealth-failed");
    } finally {
      setSealing(false);
    }
  };

  const onSave = async () => {
    if (!myName?.label || !identityToken) return;
    setSaving(true);
    setErr(null);
    try {
      const fields: Record<string, string> = {
        name: displayName,
        description: bio,
        location,
        avatar,
        skills: JSON.stringify(skills.filter((s) => s.name.trim())),
        // Rotation flag is only honored by the gateway when stealth-meta is
        // also set. Persist regardless so the toggle state round-trips.
        "stealth-rotate-addr": rotateAddr ? "true" : "false",
      };
      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${identityToken}`,
        },
        body: JSON.stringify({ label: myName.label, fields }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "save-failed");
        return;
      }
      // Fire-and-forget Swarm publish so the .eth.limo personal site stays
      // in sync with the latest text records. Save completes regardless.
      publishSite();
      router.push(`/${myName.ens}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "save-failed");
    } finally {
      setSaving(false);
    }
  };

  const publishSite = async () => {
    if (!myName?.label || !identityToken) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/publish-site", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${identityToken}`,
        },
        body: JSON.stringify({ label: myName.label }),
      });
      const data = await res.json();
      if (res.ok && data.limo) {
        setPublishedAt({ limo: data.limo, ipfs: data.ipfs });
      }
    } catch {
      /* publish is best-effort */
    } finally {
      setPublishing(false);
    }
  };

  if (!ready) {
    return <Shell><Loader text="preparing the wax…" /></Shell>;
  }
  if (!authenticated) {
    return (
      <Shell>
        <Cartouche padding={32} style={{ textAlign: "center", maxWidth: 420 }}>
          <FleurDeLis size={28} style={{ margin: "0 auto 12px" }} />
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 8 }}>SIGNED OUT</div>
          <div className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", marginBottom: 18, lineHeight: 1.55 }}>
            Sign in to edit your seal. Only the bearer of the name can carve it.
          </div>
          <button onClick={login} style={btnDark}>SIGN IN</button>
        </Cartouche>
      </Shell>
    );
  }
  if (loading) {
    return <Shell><Loader text="opening your shelf…" /></Shell>;
  }
  if (!myName?.claimed) {
    return (
      <Shell>
        <Cartouche padding={32} style={{ textAlign: "center", maxWidth: 460 }}>
          <FleurDeLis size={28} style={{ margin: "0 auto 12px" }} />
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 8 }}>NO NAME ON THIS WALLET</div>
          <div className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", marginBottom: 18, lineHeight: 1.55 }}>
            Wallet {address?.slice(0, 6)}…{address?.slice(-4)} hasn't yet claimed a name in PragueConnect. The seal is empty.
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
          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.4em", color: "var(--vermilion)", marginBottom: 6 }}>{t("edit.kicker")}</div>
          <div className="t-display" style={{ fontSize: 36, letterSpacing: "0.04em" }}>{myName.ens}</div>
          <div className="hr-double" style={{ width: 64, margin: "12px auto 0" }} />
        </div>

        <Cartouche padding={28} style={{ width: "100%" }}>
          <Field label={t("edit.fields.displayName")}>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 60))}
              style={inputStyle}
              placeholder="how you sign your work"
            />
          </Field>

          <Field label={t("edit.fields.bio")}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 900))}
              style={{ ...inputStyle, minHeight: 110, resize: "vertical", fontFamily: "var(--body)", fontStyle: "italic" }}
              placeholder="A paragraph in your hand. Where you work, what you do, how you keep your tools."
            />
            <div className="t-mono" style={{ fontSize: 10, color: "var(--ink-50)", textAlign: "right", marginTop: 4 }}>{bio.length} / 900</div>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label={t("edit.fields.location")}>
              <NeighbourhoodPicker
                value={location}
                onChange={setLocation}
                placeholderLabel={lang === "cs" ? "— vyberte čtvrť —" : "— pick a neighbourhood —"}
              />
            </Field>
            <Field label={t("edit.fields.avatar")}>
              <input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value.slice(0, 400))}
                style={inputStyle}
                placeholder={lang === "cs" ? "https://… nebo nechte prázdné pro pečetní znak" : "https://… or leave blank for your seal sigil"}
              />
            </Field>
          </div>

          {/* Live preview of how the avatar will render on the profile. If
           *  the URL is set, the wax-seal frame holds it; if not, the
           *  deterministic identicon stands in. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "14px 16px",
              border: "0.5px dashed var(--gilded)",
              background: "var(--bone)",
              marginTop: 4,
            }}
          >
            <SealPortrait address={address ?? null} avatarUrl={avatar || null} size={84} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="t-display"
                style={{ fontSize: 10, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 4 }}
              >
                {lang === "cs" ? "VAŠE PEČEŤ" : "YOUR SEAL"}
              </div>
              <div
                className="t-italic"
                style={{ fontSize: 13, color: "var(--ink-70)", lineHeight: 1.5 }}
              >
                {avatar
                  ? lang === "cs"
                    ? "Vlastní obrázek nasazený do voskové pečeti."
                    : "Your image, set inside the wax-seal frame."
                  : lang === "cs"
                  ? "Vygenerováno z vaší peněženky — žádné dvě nejsou stejné. Nahrajte URL pro vlastní obrázek."
                  : "Generated from your wallet — no two are alike. Paste a URL above for a custom image."}
              </div>
            </div>
          </div>

          <div className="hr-gilded" style={{ margin: "24px 0" }} />

          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 4 }}>{t("edit.skills.kicker")}</div>
          <div className="t-display" style={{ fontSize: 22, letterSpacing: "0.04em", marginBottom: 12 }}>{t("edit.skills.title")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {skills.map((s, i) => (
              <SkillRow
                key={i}
                skill={s}
                pricePlaceholder={skillPricePlaceholder}
                onChange={(next) =>
                  setSkills((curr) => curr.map((x, j) => (j === i ? next : x)))
                }
                onRemove={() => setSkills((curr) => curr.filter((_, j) => j !== i))}
              />
            ))}
            <button
              type="button"
              onClick={() => setSkills((curr) => [...curr, { kind: "forge", name: "", price: "" }])}
              style={{ marginTop: 4, padding: "10px 14px", background: "transparent", border: "0.5px dashed var(--gilded)", fontFamily: "var(--display)", fontSize: 11, letterSpacing: "0.3em", color: "var(--ink)", cursor: "pointer" }}
            >
              {t("edit.skills.add")}
            </button>
          </div>

          <div className="hr-gilded" style={{ margin: "28px 0 18px" }} />

          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 4 }}>{t("edit.stealth.kicker")}</div>
          <div className="t-display" style={{ fontSize: 22, letterSpacing: "0.04em", marginBottom: 6 }}>{t("edit.stealth.title")}</div>
          <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", lineHeight: 1.55, marginBottom: 12 }}>
            {t("edit.stealth.body")}
          </div>
          {stealthMeta ? (
            <>
              <div style={{ padding: "12px 14px", border: "0.5px solid var(--gilded)", background: "var(--bone)" }}>
                <div className="t-mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--verdigris)", marginBottom: 6 }}>{t("edit.stealth.sealed")}</div>
                <div className="t-mono" style={{ fontSize: 11, color: "var(--ink)", wordBreak: "break-all" }}>{stealthMeta}</div>
                <button
                  type="button"
                  onClick={onSealStealth}
                  disabled={sealing}
                  className="t-display"
                  style={{ marginTop: 10, fontSize: 10, letterSpacing: "0.25em", color: "var(--ink-70)", background: "transparent", border: "none", cursor: sealing ? "wait" : "pointer", padding: 0 }}
                >
                  {sealing ? "…" : t("edit.stealth.reseal")}
                </button>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 14px",
                  marginTop: 10,
                  border: "0.5px solid var(--gilded)",
                  background: rotateAddr ? "rgba(82, 114, 96, 0.08)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={rotateAddr}
                  onChange={(e) => setRotateAddr(e.target.checked)}
                  style={{ marginTop: 3, flex: "0 0 auto", accentColor: "var(--vermilion)" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t-display" style={{ fontSize: 10, letterSpacing: "0.3em", color: rotateAddr ? "var(--verdigris)" : "var(--vermilion)", textTransform: "uppercase", marginBottom: 4 }}>
                    {rotateAddr ? "ROTATING · ON" : "ROTATE PER RESOLUTION"}
                  </div>
                  <div className="t-italic" style={{ fontSize: 13, color: "var(--ink-70)", lineHeight: 1.5 }}>
                    Every time someone resolves <code className="t-mono" style={{ fontSize: 12 }}>{myName.ens}</code> through ENS — MetaMask, Rainbow, Etherscan — they'll see a fresh stealth address derived from your meta-key. Your main wallet stays out of the on-chain trail. Funds land in a private bulletin only you can read.
                  </div>
                </div>
              </label>
            </>
          ) : (
            <button
              type="button"
              onClick={onSealStealth}
              disabled={sealing}
              style={{ ...btnDark, padding: "10px 18px", fontSize: 11, opacity: sealing ? 0.6 : 1, cursor: sealing ? "wait" : "pointer" }}
            >
              {sealing ? "…" : t("edit.stealth.generate")}
            </button>
          )}

          <div className="hr-gilded" style={{ margin: "20px 0 18px" }} />

          <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.3em", color: "var(--vermilion)", marginBottom: 4 }}>YOUR PERSONAL SITE</div>
          <div className="t-display" style={{ fontSize: 22, letterSpacing: "0.04em", marginBottom: 6 }}>Served from IPFS</div>
          <div className="t-italic" style={{ fontSize: 14, color: "var(--ink-70)", lineHeight: 1.55, marginBottom: 12 }}>
            Each save pins a fresh static page to IPFS. The CID is written to your subname's <code className="t-mono">contenthash</code>, so <code className="t-mono">{myName.ens}.limo</code> resolves to an IPFS-hosted page anyone can verify.
          </div>
          {publishedAt ? (
            <div style={{ padding: "10px 12px", border: "0.5px solid var(--gilded)", background: "var(--bone)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div className="t-mono" style={{ fontSize: 11, color: "var(--verdigris)" }}>✓ {publishing ? "republishing…" : "pinned to IPFS"}</div>
              <div style={{ display: "flex", gap: 12 }}>
                <a href={publishedAt.limo} target="_blank" rel="noreferrer" className="t-mono" style={{ fontSize: 11, color: "var(--ink)" }}>{myName.ens}.limo ↗</a>
                <a href={publishedAt.ipfs} target="_blank" rel="noreferrer" className="t-mono" style={{ fontSize: 11, color: "var(--ink-70)" }}>ipfs ↗</a>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={publishSite}
              disabled={publishing || !myName.label}
              style={{ ...btnDark, padding: "10px 18px", fontSize: 11, opacity: publishing ? 0.6 : 1, cursor: publishing ? "wait" : "pointer" }}
            >
              {publishing ? "PINNING TO IPFS…" : "PUBLISH TO IPFS"}
            </button>
          )}

          <div className="hr-gilded" style={{ margin: "20px 0 18px" }} />

          {err && (
            <div className="t-italic" style={{ fontSize: 13, color: "var(--vermilion)", textAlign: "center", marginBottom: 12 }}>
              {err}
            </div>
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            style={{ ...btnDark, width: "100%", opacity: canSave ? 1 : 0.5, cursor: canSave ? "pointer" : "not-allowed" }}
          >
            {saving ? "…" : t("edit.button.save")}
          </button>
          <div className="t-italic" style={{ fontSize: 12, color: "var(--ink-70)", textAlign: "center", marginTop: 10 }}>
            Your edits write text records under {myName.ens} on Sepolia ENS.
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

function Loader({ text }: { text: string }) {
  return (
    <div className="t-mono" style={{ fontSize: 12, color: "var(--ink-70)", letterSpacing: "0.1em", paddingTop: 80 }}>{text}</div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="t-mono" style={{ fontSize: 9, letterSpacing: "0.25em", color: "var(--gilded-soft)", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function SkillRow({ skill, onChange, onRemove, pricePlaceholder }: { skill: Skill; onChange: (s: Skill) => void; onRemove: () => void; pricePlaceholder: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 140px auto", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid var(--gilded)" }}>
      <select
        value={skill.kind}
        onChange={(e) => onChange({ ...skill, kind: e.target.value as SigilKind })}
        style={{ ...inputStyle, padding: "6px 8px", width: 64 }}
      >
        {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AlchemicalSigil kind={skill.kind} size={24} />
        <input
          value={skill.name}
          onChange={(e) => onChange({ ...skill, name: e.target.value.slice(0, 80) })}
          style={{ ...inputStyle, padding: "6px 8px" }}
          placeholder="bicycles, knives, small electrics"
        />
      </div>
      <input
        value={skill.price}
        onChange={(e) => onChange({ ...skill, price: e.target.value.slice(0, 40) })}
        style={{ ...inputStyle, padding: "6px 8px", textAlign: "right" }}
        placeholder={pricePlaceholder}
      />
      <button type="button" onClick={onRemove} className="t-mono" style={{ fontSize: 11, color: "var(--vermilion)", background: "transparent", border: "none", cursor: "pointer", padding: "4px 8px" }}>×</button>
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
