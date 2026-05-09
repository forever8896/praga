"use client";

// Wrapper around Privy's getAccessToken() that gives us a hook with the same
// shape useIdentityToken used to ({ accessToken }), so the rest of the app
// can remain reactive without each component awaiting getAccessToken() inline.
//
// Why not useIdentityToken? In our Privy app, identity tokens are not issued
// after login (the hook returns null even when the session is fully ready),
// while the *access* token is always available. We learned this the hard way
// from the post-claim refresh: every authenticated API call 401'd because
// the bearer header carried `null`.
import { usePrivy } from "@privy-io/react-auth";
import { getAccessToken } from "@privy-io/react-auth";
import { useEffect, useState } from "react";

export function useAccessToken(): { accessToken: string | null } {
  const { authenticated, ready } = usePrivy();
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setAccessToken(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const t = await getAccessToken();
        if (!cancelled) setAccessToken(t || null);
      } catch {
        if (!cancelled) setAccessToken(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated]);

  return { accessToken };
}
