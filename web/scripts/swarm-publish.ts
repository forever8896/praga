// CLI smoke test for the full Swarm publish pipeline.
//
// Usage:
//   SWARM_BEE_URL=http://localhost:1633 \
//   SWARM_POSTAGE_BATCH_ID=0x...  \
//   bun web/scripts/swarm-publish.ts <label>
//
// Renders the profile HTML for `<label>.pragueconnect.eth`, uploads to the
// configured Bee node, encodes the bzz reference as ENSIP-7 contenthash, and
// prints both the raw reference and the `.eth.limo` URL it would resolve to.
// Does NOT write the contenthash back to the resolver store — pass --persist
// to also call /api/publish-site (requires the dev server running locally).
import { renderProfileHtml, uploadHtmlToSwarm, isSwarmConfigured } from "../lib/swarm";
import { getSubname } from "../lib/resolver-store";

export {};

const args = process.argv.slice(2);
const label = args.find((a) => !a.startsWith("--"));
const persist = args.includes("--persist");

if (!label) {
  console.error("usage: bun web/scripts/swarm-publish.ts <label> [--persist]");
  process.exit(1);
}

if (!isSwarmConfigured()) {
  console.error("missing SWARM_BEE_URL or SWARM_POSTAGE_BATCH_ID");
  console.error("Swarm Desktop default Bee API is http://localhost:1633");
  process.exit(1);
}

const PARENT = process.env.NEXT_PUBLIC_NAMESTONE_DOMAIN ?? "pragueconnect.eth";

console.log(`→ resolving ${label}.${PARENT} from local store…`);
const record = await getSubname(PARENT, label);
if (!record) {
  console.error(`no subname record for ${label}.${PARENT}`);
  console.error(`available subnames: see web/data/subnames.json`);
  process.exit(2);
}

console.log(`  display: ${record.text_records?.name ?? "(no name set)"}`);
console.log(`  address: ${record.address}`);

console.log(`\n→ rendering HTML…`);
const html = renderProfileHtml(record);
console.log(`  ${html.length.toLocaleString()} bytes`);

console.log(`\n→ uploading to ${process.env.SWARM_BEE_URL}…`);
const t0 = Date.now();
let result;
try {
  result = await uploadHtmlToSwarm(html);
} catch (e) {
  console.error(`upload failed: ${e instanceof Error ? e.message : e}`);
  console.error(`\nhints:`);
  console.error(`  · is the Bee node running and reachable at SWARM_BEE_URL?`);
  console.error(`  · is SWARM_POSTAGE_BATCH_ID a valid, funded batch?`);
  console.error(`  · check Bee API: curl ${process.env.SWARM_BEE_URL}/health`);
  process.exit(3);
}
const dt = Date.now() - t0;

console.log(`  reference: ${result.reference}`);
console.log(`  contenthash: ${result.contenthash}`);
console.log(`  upload took: ${dt}ms`);

console.log(`\n→ where it lives:`);
console.log(`  bzz://${result.reference}`);
console.log(`  https://api.gateway.ethswarm.org/bzz/${result.reference}/`);
console.log(`  https://${label}.${PARENT}.limo (after contenthash is written)`);

if (persist) {
  const port = process.env.PORT ?? "3000";
  console.log(`\n→ POST /api/publish-site (--persist)`);
  console.log(`  this requires a logged-in session — use the UI at /me/edit instead.`);
  console.log(`  bun web/scripts/swarm-publish.ts is for upload smoke-tests only.`);
}
