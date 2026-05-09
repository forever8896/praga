// /i/<code> — invite-link landing. Validates the code server-side, then
// hands the code to the home page via ?inv=<code>. The OnboardingForm picks
// it up on mount, writes the pc_invite cookie client-side, and clears the
// query — server-component code paths can't write cookies in Next 15+, so
// the cookie has to land on the client.
import { redirect } from "next/navigation";
import { validateInvite } from "@/lib/invite-codes";

export const dynamic = "force-dynamic";

export default async function InviteLanding({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = String(raw).toUpperCase().trim();
  const valid = await validateInvite(code);

  if (valid) {
    redirect(`/?inv=${encodeURIComponent(code)}`);
  }

  // Code invalid or already used — show a parchment 404 (not a redirect, so
  // the URL doesn't lie about the state).
  return (
    <div
      className="parchment-surface"
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div className="t-display" style={{ fontSize: 11, letterSpacing: "0.4em", color: "var(--vermilion)" }}>
        SEAL BROKEN
      </div>
      <h1 className="t-display" style={{ fontSize: 32, letterSpacing: "0.04em", margin: "16px 0 8px" }}>
        This invite was already opened
      </h1>
      <p className="t-italic" style={{ fontSize: 15, color: "var(--ink-70)", maxWidth: 420, lineHeight: 1.5 }}>
        Each seal in the guild can be opened only once. Ask the friend who sent you here for a fresh one — every member of PragueConnect can mint a few.
      </p>
      <a href="/" className="t-display" style={{ marginTop: 28, fontSize: 11, letterSpacing: "0.3em", color: "var(--ink-70)", textDecoration: "none", borderBottom: "0.5px solid var(--gilded)", padding: 6 }}>
        BACK TO THE GATE
      </a>
    </div>
  );
}
