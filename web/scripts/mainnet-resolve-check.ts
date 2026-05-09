import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

export {};

const c = createPublicClient({
  chain: mainnet,
  transport: http("https://ethereum-rpc.publicnode.com"),
});

console.log("=== mainnet ENS → our resolver → CCIP gateway ===");
for (const name of ["ales.pragueconnect.eth", "kilian.pragueconnect.eth", "lucia.pragueconnect.eth"]) {
  try {
    const addr = await c.getEnsAddress({ name });
    const text = await c.getEnsText({ name, key: "name" });
    const loc = await c.getEnsText({ name, key: "location" });
    console.log(`  ${name}`);
    console.log(`    addr: ${addr}`);
    console.log(`    text(name): ${text}`);
    console.log(`    text(location): ${loc}`);
  } catch (e: unknown) {
    const err = e as { shortMessage?: string; message?: string };
    console.log(`  ${name} ERROR:`, err.shortMessage ?? err.message?.slice(0, 200));
  }
}
