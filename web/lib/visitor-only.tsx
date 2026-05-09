"use client";

// Render children only when the signed-in viewer is not the owner of the
// given address. Used to hide "open thread with yourself" CTAs. When signed
// out (no Privy wallet yet) we treat the viewer as a visitor and render the
// children — only owners get them stripped.
import { usePrivy } from "@privy-io/react-auth";
import type { ReactNode } from "react";

export function VisitorOnly({
  ownerAddress,
  children,
}: {
  ownerAddress: string | null | undefined;
  children: ReactNode;
}) {
  const { authenticated, user } = usePrivy();
  if (!ownerAddress) return <>{children}</>;
  if (!authenticated) return <>{children}</>;
  const my = user?.wallet?.address?.toLowerCase();
  if (!my) return <>{children}</>;
  if (my === ownerAddress.toLowerCase()) return null;
  return <>{children}</>;
}
