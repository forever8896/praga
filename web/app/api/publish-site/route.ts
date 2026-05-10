// POST /api/publish-site — render the caller's profile to HTML, pin it, and
// write the resulting contenthash back to the subname.
//
// Storage policy: Swarm is the canonical layer. We try uploading to a Bee
// node first (via SWARM_BEE_URL + SWARM_POSTAGE_BATCH_ID) and only fall
// back to IPFS via Pinata if Swarm is unconfigured or the upload fails.
// After this, `<name>.pragueconnect.eth.limo` resolves to the pinned page.
import { NextResponse } from "next/server";
import { getSubname, setSubname, type NameStoneRecord } from "@/lib/resolver";
import { verifySession } from "@/lib/privy-server";
import { env } from "@/lib/env";
import { renderProfileHtml } from "@/lib/site-html";
import { isSwarmConfigured, uploadHtmlToSwarm } from "@/lib/swarm";
import { isIpfsConfigured, uploadHtmlToIpfs } from "@/lib/ipfs";
import { getEthFxRates } from "@/lib/eth-czk";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isSwarmConfigured() && !isIpfsConfigured()) {
    return NextResponse.json({ error: "no-storage-configured" }, { status: 503 });
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

  let storage: "swarm" | "ipfs" | null = null;
  let contenthash: `0x${string}` | null = null;
  let reference: string | null = null;
  let swarmError: string | null = null;

  // Snapshot live fx rates so the static HTML can render an ETH equivalent
  // alongside Kč prices. Profile is canonically Prague (Kč as the stored
  // currency); pairing with ETH makes it readable to anyone, anywhere.
  const fxRates = await getEthFxRates();

  if (isSwarmConfigured()) {
    try {
      const html = renderProfileHtml(record as NameStoneRecord, "Swarm", fxRates);
      const r = await uploadHtmlToSwarm(html);
      storage = "swarm";
      contenthash = r.contenthash;
      reference = r.reference;
    } catch (e) {
      // Swarm fails when the Bee node is unreachable (tunnel down) or the
      // postage batch is exhausted. Record the reason and try IPFS.
      swarmError = e instanceof Error ? e.message : String(e);
      console.warn("[publish-site] Swarm upload failed, will try IPFS:", swarmError);
    }
  }

  if (!contenthash && isIpfsConfigured()) {
    try {
      const html = renderProfileHtml(record as NameStoneRecord, "IPFS", fxRates);
      const r = await uploadHtmlToIpfs(html);
      storage = "ipfs";
      contenthash = r.contenthash;
      reference = r.cid;
    } catch (e) {
      const ipfsError = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { error: "publish-failed", swarm: swarmError, ipfs: ipfsError },
        { status: 502 },
      );
    }
  }

  if (!contenthash || !storage) {
    return NextResponse.json(
      { error: "publish-failed", swarm: swarmError ?? "swarm-not-configured", ipfs: "ipfs-not-configured" },
      { status: 502 },
    );
  }

  await setSubname({
    domain: env.namestoneDomain,
    name: label,
    address: record.address,
    text_records: record.text_records,
    contenthash,
  });

  const ens = `${label}.pragueconnect.eth`;
  return NextResponse.json({
    ok: true,
    storage,
    contenthash,
    reference,
    ens,
    limo: `https://${ens}.limo`,
    gateway: storage === "swarm"
      ? `https://api.gateway.ethswarm.org/bzz/${reference}/`
      : `https://ipfs.io/ipfs/${reference}`,
    swarmFallbackReason: storage === "ipfs" ? swarmError : undefined,
  });
}
