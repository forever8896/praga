// POST /api/publish-site — render the caller's profile to HTML, upload to
// Swarm via Bee, write the bzz reference back as the subname's contenthash.
// After this, `<name>.pragueconnect.eth.limo` resolves to the Swarm-hosted page.
import { NextResponse } from "next/server";
import { getSubname, setSubname, type NameStoneRecord } from "@/lib/namestone";
import { verifySession } from "@/lib/privy-server";
import { env } from "@/lib/env";
import { isSwarmConfigured, renderProfileHtml, uploadHtmlToSwarm } from "@/lib/swarm";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.NAMESTONE_API_KEY) {
    return NextResponse.json({ error: "namestone-not-configured" }, { status: 500 });
  }
  if (!isSwarmConfigured()) {
    return NextResponse.json({ error: "swarm-not-configured" }, { status: 503 });
  }

  const session = await verifySession(req);
  if (!session?.address) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const label = (body.label ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!label || label.length > 20) {
    return NextResponse.json({ error: "invalid-label" }, { status: 400 });
  }

  const record = await getSubname(env.namestoneDomain, label);
  if (!record) return NextResponse.json({ error: "name-not-found" }, { status: 404 });
  if (record.address.toLowerCase() !== session.address.toLowerCase()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const html = renderProfileHtml(record as NameStoneRecord);
    const { reference, contenthash } = await uploadHtmlToSwarm(html);
    await setSubname(
      {
        domain: env.namestoneDomain,
        name: label,
        address: record.address,
        text_records: record.text_records,
        contenthash,
      },
      process.env.NAMESTONE_API_KEY,
    );
    return NextResponse.json({
      ok: true,
      reference,
      contenthash,
      ens: `${label}.pragueconnect.eth`,
      limo: `https://${label}.pragueconnect.eth.limo`,
      bzz: `https://api.gateway.ethswarm.org/bzz/${reference}`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "publish-failed" },
      { status: 502 },
    );
  }
}
