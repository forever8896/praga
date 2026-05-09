// /i/<code> — invite-link landing page. Validates the code server-side, sets
// a cookie, and redirects to the onboarding home. The cookie is read by the
// client when the user clicks SEAL — the code is then forwarded to
// /api/claim-name and consumed atomically with the subname write.
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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

  const c = await cookies();
  if (valid) {
    // 24h cookie — gives the user time to come back and claim. Cookie is
    // HttpOnly:false so the onboarding form can read it client-side.
    c.set("pc_invite", code, {
      maxAge: 60 * 60 * 24,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
    redirect("/?invited=1");
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
