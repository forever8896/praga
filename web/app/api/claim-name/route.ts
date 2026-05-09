// POST /api/claim-name — issues a `<name>.pragueconnect.eth` subname through
// PragueConnect's own resolver store (no third-party SaaS in the path).
//
// Hard invite gate: when INVITE_REQUIRED is true, claim requires a valid
// invite code. Codes are consumed atomically with the claim. The inviter
// (code's owner) becomes the claimant's `sealed-by` chain — that drives the
// 5% finder's-mark on tipWithReferral.
import { NextResponse } from "next/server";
import { getSubname, setSubname } from "@/lib/resolver";
import { env } from "@/lib/env";
import {
  consumeInvite,
  validateInvite,
  mintCodesForUser,
  INVITE_REQUIRED,
} from "@/lib/invite-codes";
import { settleFundedInvite } from "@/lib/invites-contract";

export const runtime = "nodejs";

interface Body {
  name?: string;
  address?: string;
  invitedBy?: string | null;
  inviteCode?: string | null;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const name = (body.name ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const address = body.address;

  if (!name || name.length < 1 || name.length > 20) {
    return NextResponse.json({ error: "invalid-name" }, { status: 400 });
  }
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid-address" }, { status: 400 });
  }

  const inviteCode = (body.inviteCode ?? "").toString().trim().toUpperCase();

  // Hard invite gate: validate the code BEFORE writing anything.
  if (INVITE_REQUIRED) {
    if (!inviteCode) {
      return NextResponse.json({ error: "invite-required" }, { status: 403 });
    }
    const valid = await validateInvite(inviteCode);
    if (!valid) {
      return NextResponse.json({ error: "invite-invalid" }, { status: 403 });
    }
  }

  // Resolve the inviter chain. If the body provides `invitedBy` we use it;
  // otherwise we derive it from the invite code's owner. The code's owner
  // wins on conflict — codes are the source of truth for the seal-by chain.
  let sealedBy: string | null = null;
  let inviterDisplay: string | null = null;
  let inviterFromCode: string | null = null;

  if (inviteCode) {
    const code = await validateInvite(inviteCode); // re-fetch
    if (code?.owner) inviterFromCode = code.owner;
  }

  const inviterCandidate = inviterFromCode
    ? inviterFromCode.replace(/\.pragueconnect\.eth$/i, "")
    : (body.invitedBy ?? "").toString().toLowerCase().trim();

  if (inviterCandidate && /^[a-z0-9-]{1,32}$/.test(inviterCandidate) && inviterCandidate !== name) {
    const inviterRecord = await getSubname(env.namestoneDomain, inviterCandidate).catch(() => null);
    if (inviterRecord) {
      sealedBy = `${inviterCandidate}.${env.namestoneDomain}`;
      inviterDisplay =
        inviterRecord.text_records?.name ??
        inviterCandidate.charAt(0).toUpperCase() + inviterCandidate.slice(1);
    }
  }

  // Uniqueness check — the resolver store is the source of truth.
  const existing = await getSubname(env.namestoneDomain, name);
  if (existing) {
    if (existing.address.toLowerCase() === address.toLowerCase()) {
      return NextResponse.json({ ok: true, idempotent: true });
    }
    return NextResponse.json({ error: "name-taken" }, { status: 409 });
  }

  try {
    const text_records: Record<string, string> = {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      location: "Praha",
      url: `https://pragueconnect-azure.vercel.app/${name}.pragueconnect.eth`,
    };
    if (sealedBy) text_records["sealed-by"] = sealedBy;
    await setSubname({
      domain: env.namestoneDomain,
      name,
      address: address as `0x${string}`,
      text_records,
    });

    // Consume the invite code AFTER the subname write succeeds. If we crash
    // between these two, the user's claim succeeded and the code is still
    // burnable on retry — preferable to the alternative (consumed code, no
    // subname).
    if (inviteCode) {
      await consumeInvite(inviteCode, `${name}.${env.namestoneDomain}`).catch(() => {});
    }

    // Mint this new user's own invite codes so they can pass the seal forward.
    const ownCodes = await mintCodesForUser(`${name}.${env.namestoneDomain}`).catch(() => []);

    // Settle any funds attached to the invite code. This is best-effort: the
    // claim has already succeeded above, and a failure here just means the
    // funds remain in the Invites contract (the inviter can reclaim them, or
    // an admin can manually settle later).
    let inviteFunds: { txHash: string; amount: string } | null = null;
    if (inviteCode) {
      inviteFunds = await settleFundedInvite(inviteCode, address as `0x${string}`).catch(() => null);
    }

    return NextResponse.json({
      ok: true,
      ens: `${name}.${env.namestoneDomain}`,
      sealedBy,
      inviter:
        sealedBy && inviterDisplay
          ? { ens: sealedBy, display: inviterDisplay }
          : null,
      inviteCodes: ownCodes,
      inviteFunds,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "resolver-failed" },
      { status: 502 },
    );
  }
}
