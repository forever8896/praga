// Trace the CCIP-Read flow for kilian.pragueconnect.eth manually.
//
//   1. Ask the ENS Registry which resolver is set on `pragueconnect.eth`.
//   2. Call `resolver.resolve(name, addr(node))` directly. It MUST revert with
//      OffchainLookup — that's how we know the resolution is offchain.
//   3. Decode the OffchainLookup error to extract the gateway URL and callData.
//   4. Hit the gateway, get a signed response.
//   5. Pass that response back to `resolver.resolveWithProof(...)` — which
//      verifies the gateway signature on-chain and returns the answer.
import {
  createPublicClient,
  http,
  namehash,
  encodeFunctionData,
  decodeErrorResult,
  decodeAbiParameters,
  toHex,
} from "viem";
import { mainnet } from "viem/chains";

const client = createPublicClient({
  chain: mainnet,
  transport: http("https://ethereum-rpc.publicnode.com"),
});

const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const PARENT = "pragueconnect.eth";
const FULL = "kilian.pragueconnect.eth";

const REGISTRY_ABI = [
  { type: "function", name: "resolver", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }], outputs: [{ type: "address" }] },
];

const RESOLVER_ABI = [
  { type: "function", name: "url", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "resolve", stateMutability: "view", inputs: [{ name: "name", type: "bytes" }, { name: "data", type: "bytes" }], outputs: [{ type: "bytes" }] },
  { type: "function", name: "resolveWithProof", stateMutability: "view", inputs: [{ name: "response", type: "bytes" }, { name: "extraData", type: "bytes" }], outputs: [{ type: "bytes" }] },
  // The error we expect:
  { type: "error", name: "OffchainLookup", inputs: [
    { name: "sender", type: "address" },
    { name: "urls", type: "string[]" },
    { name: "callData", type: "bytes" },
    { name: "callbackFunction", type: "bytes4" },
    { name: "extraData", type: "bytes" },
  ]},
];

const ADDR_ABI = [{ type: "function", name: "addr", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }], outputs: [{ type: "address" }] }];

function dnsEncode(name) {
  const labels = name.split(".");
  const parts = [];
  for (const lbl of labels) {
    const bytes = new TextEncoder().encode(lbl);
    parts.push(new Uint8Array([bytes.length, ...bytes]));
  }
  parts.push(new Uint8Array([0]));
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return ("0x" + Array.from(out, (b) => b.toString(16).padStart(2, "0")).join(""));
}

// 1. Resolver address from the registry
const parentNode = namehash(PARENT);
const resolverAddr = await client.readContract({
  address: ENS_REGISTRY,
  abi: REGISTRY_ABI,
  functionName: "resolver",
  args: [parentNode],
});
console.log(`[1] ENS Registry says resolver for ${PARENT} = ${resolverAddr}`);

// 2. resolver.url() — public so we can confirm where it points before any call
const gatewayUrl = await client.readContract({ address: resolverAddr, abi: RESOLVER_ABI, functionName: "url" });
console.log(`[2] Resolver.url() = ${gatewayUrl}`);

// 3. Direct call to resolve(name, addr(node)) — this MUST revert with OffchainLookup
const innerData = encodeFunctionData({ abi: ADDR_ABI, functionName: "addr", args: [namehash(FULL)] });
const dnsName = dnsEncode(FULL);

let extraData;
let callDataForGateway;
try {
  await client.call({
    to: resolverAddr,
    data: encodeFunctionData({
      abi: RESOLVER_ABI,
      functionName: "resolve",
      args: [dnsName, innerData],
    }),
  });
  console.log(`[3] resolve(...) returned WITHOUT reverting — that would be onchain resolution!`);
} catch (e) {
  const raw = e.cause?.data ?? e.data;
  if (!raw) {
    console.log(`[3] resolve() reverted but no error data — `, e.shortMessage ?? e.message);
  } else {
    const decoded = decodeErrorResult({ abi: RESOLVER_ABI, data: raw });
    if (decoded.errorName === "OffchainLookup") {
      const [sender, urls, callData, cb, extra] = decoded.args;
      console.log(`[3] resolve(...) REVERTED with OffchainLookup — this is the EIP-3668 signal`);
      console.log(`     sender (resolver):        ${sender}`);
      console.log(`     urls:                     ${urls.join(", ")}`);
      console.log(`     callData (to gateway):    ${callData.slice(0, 22)}…  (${callData.length / 2 - 1} bytes)`);
      console.log(`     callback:                 ${cb}`);
      console.log(`     extraData:                ${extra.slice(0, 22)}…  (${extra.length / 2 - 1} bytes)`);
      extraData = extra;
      callDataForGateway = callData;
    } else {
      console.log(`[3] reverted with ${decoded.errorName}`, decoded.args);
    }
  }
}

if (!callDataForGateway) process.exit(0);

// 4. Hit the gateway with the same callData. URL template is "...{sender}/{data}.json".
const url = gatewayUrl
  .replace("{sender}", resolverAddr)
  .replace("{data}", callDataForGateway);
console.log(`[4] GET ${url}`);
const gatewayRes = await fetch(url).then((r) => r.json());
console.log(`     gateway returned signed payload of ${gatewayRes.data.length / 2 - 1} bytes`);

// 5. Hand the gateway's response back to resolveWithProof — onchain signature verify.
const verified = await client.readContract({
  address: resolverAddr,
  abi: RESOLVER_ABI,
  functionName: "resolveWithProof",
  args: [gatewayRes.data, extraData],
});
const [recoveredAddr] = decodeAbiParameters([{ type: "address" }], verified);
console.log(`[5] resolveWithProof verified the signature, returned address = ${recoveredAddr}`);
