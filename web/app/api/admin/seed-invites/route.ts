// POST /api/admin/seed-invites
// Headers: Authorization: Bearer <ADMIN_SECRET>
// Body: { count: number }
//
// Mints `count` bootstrap invite codes (no owner — used to seed the first
// generation of users via Telegram). Run once and stash the output in a
// password manager / Telegram bookmark.
//
// Set ADMIN_SECRET in Vercel env. Without it, the route refuses everyone.
import { NextResponse } from "next/server";
import { seedBootstrapCodes } from "@/lib/invite-codes";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "admin-not-configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m || m[1] !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { count?: number };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const count = Math.max(1, Math.min(100, Number(body.count ?? 10)));
  const codes = await seedBootstrapCodes(count);
  return NextResponse.json({
    ok: true,
    count: codes.length,
    codes,
    inviteUrls: codes.map((c) => `https://www.pragueconnect.xyz/i/${c}`),
  });
}
