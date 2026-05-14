// Test viem's getEnsAddress (the actual API real ENS clients use).
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const client = createPublicClient({ chain: mainnet, transport: http("https://ethereum-rpc.publicnode.com") });

for (const name of ["kilian.pragueconnect.eth", "pragueconnect.eth", "vitalik.eth"]) {
  try {
    const addr = await client.getEnsAddress({ name });
    console.log(`${name} -> ${addr}`);
  } catch (e) {
    console.log(`${name} -> ERROR: ${e.shortMessage ?? e.message}`);
  }
}

// Also try a text record (e.g. avatar / description)
try {
  const text = await client.getEnsText({ name: "kilian.pragueconnect.eth", key: "avatar" });
  console.log(`kilian.pragueconnect.eth avatar -> ${text}`);
} catch (e) {
  console.log(`getEnsText error: ${e.shortMessage ?? e.message}`);
}
