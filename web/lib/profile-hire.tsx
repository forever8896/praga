"use client";

// Inline escrow widget on /<ens>. Only renders for signed-in visitors who are
// NOT the profile owner. Wraps the existing EscrowPanel so a buyer can fund,
// the seller can accept + deliver, and the buyer (or seller after the
// 24h grace) can release — all without leaving the profile page.
//
// One task per (buyer, seller) pair, keyed by deriveTaskId — same convention
// the messaging thread uses, so an escrow opened here shows the same phase
// inside /m/<thread> too.
import { usePrivy } from "@privy-io/react-auth";
import { EscrowPanel } from "./escrow-panel";

interface Props {
  ownerAddress: `0x${string}` | null;
  ownerEns: string;
  ownerStealthMeta: string | null;
}

export function ProfileHire({ ownerAddress, ownerEns, ownerStealthMeta }: Props) {
  const { ready, authenticated, user } = usePrivy();
  if (!ready || !authenticated || !ownerAddress) return null;
  const myAddr = (user?.wallet?.address ?? "") as `0x${string}` | "";
  if (!myAddr) return null;
  if (myAddr.toLowerCase() === ownerAddress.toLowerCase()) return null;

  return (
    <div style={{ marginTop: 18 }}>
      <div
        className="kicker"
        style={{ marginBottom: 6, textAlign: "left", color: "var(--vermilion)" }}
      >
        HIRE · OPEN THE SEAL OF WORK
      </div>
      <p
        className="italic"
        style={{
          fontSize: 13,
          color: "var(--ink-70)",
          margin: "0 0 10px",
          lineHeight: 1.55,
        }}
      >
        Funds are held in escrow on Base. The seal is broken — and your ETH
        released to {ownerEns.split(".")[0]}&rsquo;s stealth address — only when
        you press the seal of release after delivery.
      </p>
      <EscrowPanel
        myAddress={myAddr as `0x${string}`}
        peerAddress={ownerAddress}
        peerEns={ownerEns}
        peerStealthMeta={ownerStealthMeta ?? ""}
      />
    </div>
  );
}
