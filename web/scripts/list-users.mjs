// Read-only dump of pragueconnect.eth subnames in production KV.
// Usage: node --env-file=.env.kv scripts/list-users.mjs
import { kv } from "@vercel/kv";

const PARENT = "pragueconnect.eth";
const HASH_KEY = `pc:subnames:${PARENT.toLowerCase()}`;

const all = await kv.hgetall(HASH_KEY);
if (!all) {
  console.log("(no records in KV)");
  process.exit(0);
}
const records = Object.values(all);
console.log(`# ${records.length} registered names in production KV\n`);

for (const r of records) {
  const tr = r.text_records ?? {};
  const offers = tr.offers ? JSON.parse(tr.offers) : [];
  const skills = tr.skills ? JSON.parse(tr.skills) : [];
  console.log(`## ${r.name}.${r.domain}`);
  console.log(`   addr:    ${r.address}`);
  console.log(`   stealth: ${tr["stealth-meta-address"] ? "yes" : "NO"}`);
  console.log(`   bio:     ${tr.description ? `"${tr.description.slice(0,90)}"` : "(empty)"}`);
  console.log(`   name:    ${tr.name ?? "(empty)"}`);
  console.log(`   loc:     ${tr.location ?? "(empty)"}`);
  console.log(`   avatar:  ${tr.avatar ? "yes" : "no"}`);
  console.log(`   offers:  ${offers.length}`);
  for (const o of offers) console.log(`     - ${o.type} "${(o.title||"").slice(0,60)}" ${o.kc??""}Kč`);
  console.log(`   skills:  ${skills.length}`);
  for (const s of skills) console.log(`     - ${s.kind} "${s.name?.slice(0,60)}" ${s.price}`);
  const other = Object.keys(tr).filter((k) => !["description","name","location","avatar","offers","skills","stealth-meta-address"].includes(k));
  if (other.length) console.log(`   other text records: ${other.join(", ")}`);
  console.log("");
}
