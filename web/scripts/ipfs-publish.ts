// CLI smoke test for the full IPFS publish pipeline.
//
// Usage:
//   PINATA_JWT=eyJ...  bun web/scripts/ipfs-publish.ts <label>
//
// Renders the profile HTML for `<label>.pragueconnect.eth`, pins to IPFS via
// Pinata, encodes the CID as ENSIP-7 contenthash, and prints both the raw CID
// and the `.eth.limo` URL it would resolve to. Does NOT write the contenthash
// back to the resolver store — go through /api/publish-site (signed-in) to
// persist.
import { renderProfileHtml } from "../lib/site-html";
import { uploadHtmlToIpfs, isIpfsConfigured } from "../lib/ipfs";
import { getSubname } from "../lib/resolver-store";

export {};

const args = process.argv.slice(2);
const label = args.find((a) => !a.startsWith("--"));

if (!label) {
  console.error("usage: bun web/scripts/ipfs-publish.ts <label>");
  process.exit(1);
}

if (!isIpfsConfigured()) {
  console.error("missing PINATA_JWT");
  console.error("Get a scoped JWT at https://app.pinata.cloud/developers/api-keys");
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

console.log(`\n→ pinning to Pinata…`);
const t0 = Date.now();
let result;
try {
  result = await uploadHtmlToIpfs(html);
} catch (e) {
  console.error(`pin failed: ${e instanceof Error ? e.message : e}`);
  console.error(`\nhints:`);
  console.error(`  · is PINATA_JWT a valid scoped key with pinFileToIPFS scope?`);
  console.error(`  · check Pinata status: https://status.pinata.cloud/`);
  process.exit(3);
}
const dt = Date.now() - t0;

console.log(`  CID: ${result.cid}`);
console.log(`  contenthash: ${result.contenthash}`);
console.log(`  pin took: ${dt}ms`);

console.log(`\n→ where it lives:`);
console.log(`  ipfs://${result.cid}`);
console.log(`  https://ipfs.io/ipfs/${result.cid}/`);
console.log(`  https://gateway.pinata.cloud/ipfs/${result.cid}/`);
console.log(`  https://${label}.${PARENT}.limo (after contenthash is written)`);
