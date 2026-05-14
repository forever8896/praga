// Resolve kilian.pragueconnect.eth through real mainnet ENS — proves the
// CCIP-Read gateway is wired up end-to-end.
import { createPublicClient, http, namehash } from "viem";
import { mainnet } from "viem/chains";

const client = createPublicClient({
  chain: mainnet,
  transport: http("https://ethereum-rpc.publicnode.com"),
});

const name = "kilian.pragueconnect.eth";

console.log(`Resolving ${name} through mainnet ENS …`);
console.log(`namehash: ${namehash(name)}`);

try {
  const addr = await client.getEnsAddress({ name });
  console.log(`addr → ${addr}`);
} catch (e) {
  console.log(`addr lookup failed: ${e.shortMessage ?? e.message}`);
}

try {
  const meta = await client.getEnsText({ name, key: "stealth-meta-address" });
  console.log(`stealth-meta-address → ${meta}`);
} catch (e) {
  console.log(`text lookup failed: ${e.shortMessage ?? e.message}`);
}

try {
  const display = await client.getEnsText({ name, key: "name" });
  console.log(`display name → ${display}`);
} catch (e) {
  console.log(`display lookup failed: ${e.shortMessage ?? e.message}`);
}
