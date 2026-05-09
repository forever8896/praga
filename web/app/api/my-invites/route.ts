// GET /api/my-invites — return the caller's invite codes (mints if none yet).
// POST /api/my-invites — top up to CODES_PER_USER (idempotent).
//
// Auth: Privy identity token. Only the bearer of the token can see/mint their
// own codes.
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/privy-server";
import { listSubnames } from "@/lib/resolver";
import { env } from "@/lib/env";
import { listInvitesForUser, mintCodesForUser, CODES_PER_USER } from "@/lib/invite-codes";

export const runtime = "nodejs";

async function findEnsForAddress(address: string): Promise<string | null> {
  const all = await listSubnames(env.namestoneDomain, 500);
  const match = all.find((r) => r.address.toLowerCase() === address.toLowerCase());
  return match ? `${match.name}.${match.domain}` : null;
}

export async function GET(req: Request) {
  const session = await verifySession(req);
  if (!session?.address) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ens = await findEnsForAddress(session.address);
  if (!ens) return NextResponse.json({ error: "no-name" }, { status: 404 });

  const records = await listInvitesForUser(ens);
  return NextResponse.json({ ens, codes: records });
}

export async function POST(req: Request) {
  const session = await verifySession(req);
  if (!session?.address) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ens = await findEnsForAddress(session.address);
  if (!ens) return NextResponse.json({ error: "no-name" }, { status: 404 });

  const codes = await mintCodesForUser(ens, CODES_PER_USER);
  const records = await listInvitesForUser(ens);
  return NextResponse.json({ ens, codes, records });
}
