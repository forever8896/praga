"use client";

// ActivationCard — the missing beat between "name sealed" and SealedBeat.
//
// The KV dump after one demo week showed 6 of 8 users claimed a name and
// then did *nothing* — no bio, no offer, no avatar. The activation card is
// the cheapest possible nudge: a single overlay that asks for three lines
// (display name, one-line bio, neighborhood) BEFORE the celebratory finale
// runs, so the user fills in their personality while the moment is hot. Skip
// is one tap away — opt-out, not friction.
//
// The avatar preview is the deterministic wax-seal identicon from
// SealPortrait; it animates from the address as soon as the wallet is known.

import { useState } from "react";
import { Cartouche, FleurDeLis } from "./ornaments";
import { SealPortrait } from "./seal-portrait";
import { NeighbourhoodPicker } from "./neighborhoods";

interface Lang {
  kicker: string;
  title: (display: string) => string;
  subtitle: string;
  fields: {
    displayName: { label: string; placeholder: string };
    bio: { label: string; placeholder: string };
    location: { label: string; placeholder: string };
  };
  avatarHint: string;
  saveCta: string;
  skipCta: string;
  saving: string;
}

const COPY_EN: Lang = {
  kicker: "GIVE YOUR SEAL A FACE",
  title: (display) => `Welcome, ${display}.`,
  subtitle:
    "Three lines so the town knows who they're meeting. You can edit any of this later from your seal.",
  fields: {
    displayName: {
      label: "HOW YOU SIGN",
      placeholder: "your name as the city would call you",
    },
    bio: {
      label: "ONE LINE — what you do",
      placeholder: "violin teacher · bike fixer · I cook lentil soup on Tuesdays",
    },
    location: {
      label: "WHERE — your part of Prague",
      placeholder: "— pick a neighbourhood —",
    },
  },
  avatarHint: "your wax-seal sigil — derived from your wallet, unique to you",
  saveCta: "Save & continue →",
  skipCta: "Skip for now",
  saving: "saving…",
};

const COPY_CS: Lang = {
  kicker: "DEJTE SVÉ PEČETI TVÁŘ",
  title: (display) => `Vítejte, ${display}.`,
  subtitle:
    "Tři řádky, ať město ví, koho potkává. Cokoli z toho můžete později upravit ze své pečeti.",
  fields: {
    displayName: {
      label: "JAK SE PODEPISUJETE",
      placeholder: "jméno, jak by vás oslovilo město",
    },
    bio: {
      label: "JEDEN ŘÁDEK — co děláte",
      placeholder: "učitelka houslí · opravář kol · v úterý vařím čočkovou polévku",
    },
    location: {
      label: "KDE — vaše část Prahy",
      placeholder: "— vyberte čtvrť —",
    },
  },
  avatarHint: "váš pečetní znak — odvozený z peněženky, jen pro vás",
  saveCta: "Uložit a pokračovat →",
  skipCta: "Přeskočit",
  saving: "ukládám…",
};

export function ActivationCard({
  label,
  address,
  identityToken,
  lang = "en",
  onDone,
  initialDisplayName = "",
  initialBio = "",
  initialLocation = "",
}: {
  label: string;
  address: string | null;
  identityToken: string | null;
  lang?: "en" | "cs";
  /** Called after a successful save OR a skip. Parent decides what comes next
   *  (typically: trigger the SealedBeat finale). */
  onDone: () => void;
  initialDisplayName?: string;
  initialBio?: string;
  initialLocation?: string;
}) {
  const copy = lang === "cs" ? COPY_CS : COPY_EN;
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [location, setLocation] = useState(initialLocation);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const previewDisplay =
    displayName.trim() ||
    label.charAt(0).toUpperCase() + label.slice(1);

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    setErr(null);
    try {
      const fields: Record<string, string> = {};
      if (displayName.trim()) fields["name"] = displayName.trim().slice(0, 60);
      if (bio.trim()) fields["description"] = bio.trim().slice(0, 280);
      if (location) fields["location"] = location;

      // Skip the API call entirely if the user filled nothing. Skipping is a
      // valid outcome — we just don't write empty strings over potentially
      // existing values.
      if (Object.keys(fields).length === 0 || !identityToken) {
        onDone();
        return;
      }

      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${identityToken}`,
        },
        body: JSON.stringify({ label, fields }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? "save-failed");
        return;
      }
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "save-failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-label={copy.kicker} style={overlayStyle}>
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          margin: "0 auto",
          padding: "24px 20px 40px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <FleurDeLis size={26} stroke="var(--gilded)" />
        </div>
        <div
          className="kicker"
          style={{ textAlign: "center", marginBottom: 14 }}
        >
          {copy.kicker}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <SealPortrait
            address={address}
            size={132}
            label={`${label.toUpperCase()} · PRAGUECONNECT`}
          />
        </div>

        <h2
          className="display"
          style={{
            fontSize: "clamp(28px, 6vw, 38px)",
            textAlign: "center",
            margin: "0 0 6px",
            letterSpacing: "0.02em",
            color: "var(--ink)",
          }}
        >
          {copy.title(previewDisplay)}
        </h2>
        <p
          className="italic"
          style={{
            fontSize: 14,
            color: "var(--ink-70)",
            textAlign: "center",
            margin: "0 auto 24px",
            maxWidth: 380,
            lineHeight: 1.55,
          }}
        >
          {copy.subtitle}
        </p>

        <Cartouche padding={22} tight style={{ marginBottom: 18 }}>
          <Field label={copy.fields.displayName.label}>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 60))}
              placeholder={copy.fields.displayName.placeholder}
              style={inputStyle}
              autoFocus
            />
          </Field>

          <Field label={copy.fields.bio.label}>
            <input
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 140))}
              placeholder={copy.fields.bio.placeholder}
              style={inputStyle}
            />
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--ink-50)",
                textAlign: "right",
                marginTop: 4,
              }}
            >
              {bio.length} / 140
            </div>
          </Field>

          <Field label={copy.fields.location.label}>
            <NeighbourhoodPicker
              value={location}
              onChange={setLocation}
              placeholderLabel={copy.fields.location.placeholder}
            />
          </Field>

          <p
            className="italic"
            style={{
              fontSize: 12,
              color: "var(--ink-50)",
              margin: "10px 0 0",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            {copy.avatarHint}
          </p>
        </Cartouche>

        {err && (
          <div
            className="italic"
            style={{
              fontSize: 13,
              color: "var(--vermilion)",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {err}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="btn btn-ink btn-block"
            style={{ cursor: saving ? "wait" : "pointer" }}
          >
            {saving ? copy.saving : copy.saveCta}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!saving) onDone();
            }}
            className="btn btn-text"
            style={{
              textAlign: "center",
              fontFamily: "var(--display)",
              fontSize: 12,
              letterSpacing: "0.25em",
              color: "var(--ink-70)",
              background: "transparent",
              border: "none",
              cursor: saving ? "wait" : "pointer",
              padding: "8px 0",
            }}
          >
            {copy.skipCta}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.25em",
          color: "var(--gilded-soft)",
          marginBottom: 4,
        }}
      >
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

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 54,
  background: "var(--parchment)",
  backgroundImage: "var(--grain)",
  backgroundSize: "4px 4px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "24px 0",
  overflow: "auto",
  animation: "pc-narration-fade 600ms cubic-bezier(0.32, 0.72, 0.24, 1)",
};
