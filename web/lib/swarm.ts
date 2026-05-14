// Swarm uploader — pin a rendered profile HTML page to a Bee node and encode
// the resulting bzz reference as an ENSIP-7 contenthash. The HTML rendering
// itself lives in lib/site-html.ts so Swarm and the IPFS fallback share one
// source of truth for what a profile page looks like.
//
// Requires SWARM_BEE_URL + SWARM_POSTAGE_BATCH_ID env vars. The Bee node
// must be reachable from Vercel — locally that means a tunnel
// (cloudflared / ngrok) pointing at http://localhost:1633.
//
// ENSIP-7 contenthash for Swarm: 7-byte fixed prefix + 32-byte ref.
//   0xe40101fa011b20 || <32-byte-ref>
//   0xe401  swarm-ns multicodec
//   0x01    CIDv1
//   0xfa01  swarm-manifest codec
//   0x1b20  multihash header — keccak256 (0x1b), 32 bytes (0x20)
const SWARM_CONTENTHASH_PREFIX = "e40101fa011b20";

export function bzzToContenthash(ref: string): `0x${string}` {
  const clean = ref.replace(/^0x/, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error("invalid bzz reference");
  }
  return `0x${SWARM_CONTENTHASH_PREFIX}${clean}` as `0x${string}`;
}

export function isSwarmConfigured(): boolean {
  return !!process.env.SWARM_BEE_URL && !!process.env.SWARM_POSTAGE_BATCH_ID;
}

interface UploadResult {
  reference: string;
  contenthash: `0x${string}`;
}

export async function uploadHtmlToSwarm(html: string, fileName = "index.html"): Promise<UploadResult> {
  const beeUrl = process.env.SWARM_BEE_URL;
  const stamp = process.env.SWARM_POSTAGE_BATCH_ID;
  if (!beeUrl || !stamp) {
    throw new Error("swarm-not-configured");
  }
  const url = new URL(`${beeUrl.replace(/\/$/, "")}/bzz`);
  url.searchParams.set("name", fileName);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Swarm-Postage-Batch-Id": stamp,
      "Swarm-Index-Document": "index.html",
    },
    body: html,
  });
  if (!res.ok) {
    throw new Error(`bee ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { reference?: string };
  if (!data.reference) {
    throw new Error("bee returned no reference");
  }
  return {
    reference: data.reference,
    contenthash: bzzToContenthash(data.reference),
  };
}
