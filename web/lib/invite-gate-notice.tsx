"use client";

// Tiny landing-page notice that surfaces the invite-code requirement BEFORE
// the user even starts typing a name. Visible whenever the visitor has no
// invite cookie, no `?invitedBy=` referral, and no stored inviter. If any of
// those are present, the existing InviterAcknowledgement / claim flow takes
// over — the visitor already has the credential they need.
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { FleurDeLis } from "./ornaments";
import { useI18n } from "./i18n";

function readInviteCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)pc_invite=([A-Z2-9]{8})/);
  return m ? m[1] : null;
}

function readInviterStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem("pragueconnect.inviter");
    return v && /^[a-z0-9-]{1,32}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function InviteGateNotice() {
  const { authenticated } = usePrivy();
  const { lang } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const inviterParam = params.get("invitedBy");
    const hasInvite = !!readInviteCookie() || !!inviterParam || !!readInviterStored();
    setShow(!hasInvite);
  }, []);

  if (authenticated || !show) return null;

  const kicker = lang === "cs" ? "POZVÁNKA JE NUTNÁ" : "AN INVITE IS NEEDED";
  const body =
    lang === "cs"
      ? "K zápisu jména na PragueConnect je potřeba pozvánkový kód od někoho, kdo už je uvnitř. Pokud vám člen cechu předal zapečetěnou obálku, odkaz ho doplní za vás. Jinak nejdřív zaklepejte na dveře."
      : "Claiming a name on PragueConnect requires an invite code from someone already inside the guild. If a member handed you a sealed envelope, the link fills the code for you. Otherwise, knock on a door first.";
  const hint =
    lang === "cs"
      ? "Otevřete pozvánku ve formátu /i/<KÓD>, nebo si nechte poslat odkaz pozvánky od přítele."
      : "Open an invite link in the form /i/<CODE>, or have a friend send you their referral link.";

  return (
    <div
      role="note"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        margin: "0 auto 18px",
        maxWidth: 380,
        textAlign: "left",
        background: "rgba(178, 58, 47, 0.06)",
        border: "0.5px solid var(--vermilion)",
        borderLeft: "2px solid var(--vermilion)",
      }}
    >
      <FleurDeLis size={18} stroke="var(--vermilion)" style={{ flex: "0 0 auto", marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="t-display"
          style={{
            fontSize: 9,
            letterSpacing: "0.35em",
            color: "var(--vermilion)",
            textTransform: "uppercase",
          }}
        >
          {kicker}
        </div>
        <div className="t-italic" style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink)", marginTop: 4 }}>
          {body}
        </div>
        <div className="t-mono" style={{ fontSize: 10, lineHeight: 1.5, color: "var(--ink-50)", marginTop: 6, letterSpacing: "0.05em" }}>
          {hint}
        </div>
      </div>
    </div>
  );
}
