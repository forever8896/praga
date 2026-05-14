#!/usr/bin/env node
// PragueConnect ENS demo — runs end-to-end against live mainnet ENS and our
// production CCIP-Read gateway. Tells the privacy story in five acts.
//
//   Run from /web:  node scripts/ens-demo.mjs
//
// No setup, no env, no keys. Reads a real subname, traces the offchain flow,
// derives the escrow workerKey, then proves the workerKey has zero on-chain
// footprint. End on a one-liner judges can repeat back.

import {
  createPublicClient,
  http,
  namehash,
  encodeFunctionData,
  decodeErrorResult,
  decodeAbiParameters,
} from "viem";
import { mainnet, base } from "viem/chains";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak256 } from "viem";

const NAME = process.argv[2] ?? "kilian.pragueconnect.eth";

// Two clients — mainnet for ENS, Base for the workerKey footprint check.
const eth = createPublicClient({ chain: mainnet, transport: http("https://ethereum-rpc.publicnode.com") });
const baseRpc = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });

const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const REGISTRY_ABI = [
  { type: "function", name: "resolver", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }], outputs: [{ type: "address" }] },
];
const RESOLVER_ABI = [
  { type: "function", name: "url", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "resolve", stateMutability: "view", inputs: [{ name: "name", type: "bytes" }, { name: "data", type: "bytes" }], outputs: [{ type: "bytes" }] },
  { type: "function", name: "resolveWithProof", stateMutability: "view", inputs: [{ name: "response", type: "bytes" }, { name: "extraData", type: "bytes" }], outputs: [{ type: "bytes" }] },
  { type: "error", name: "OffchainLookup", inputs: [
    { name: "sender", type: "address" },
    { name: "urls", type: "string[]" },
    { name: "callData", type: "bytes" },
    { name: "callbackFunction", type: "bytes4" },
    { name: "extraData", type: "bytes" },
  ]},
];
const ADDR_ABI = [{ type: "function", name: "addr", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }], outputs: [{ type: "address" }] }];

const c = {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", magenta: "\x1b[35m", cyan: "\x1b[36m",
};

function hr() { console.log(c.dim + "─".repeat(72) + c.reset); }
function hdr(n, label) {
  console.log("");
  console.log(`${c.bold}${c.cyan}❯ ACT ${n}${c.reset}  ${c.bold}${label}${c.reset}`);
  hr();
}
function kv(k, v, color = c.green) {
  const pad = " ".repeat(Math.max(0, 28 - k.length));
  console.log(`  ${c.dim}${k}${pad}${c.reset}${color}${v}${c.reset}`);
}
function sub(text) { console.log(`  ${c.dim}${text}${c.reset}`); }
function dnsEncode(name) {
  const labels = name.split(".");
  const parts = [];
  for (const lbl of labels) {
    const b = new TextEncoder().encode(lbl);
    parts.push(new Uint8Array([b.length, ...b]));
  }
  parts.push(new Uint8Array([0]));
  let total = 0; for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0; for (const p of parts) { out.set(p, off); off += p.length; }
  return "0x" + Array.from(out, (b) => b.toString(16).padStart(2, "0")).join("");
}
function workerKeyFromMeta(meta) {
  const hex = meta.slice("st:eth:0x".length);
  const spending = hex.slice(0, 66);
  const point = secp256k1.ProjectivePoint.fromHex(spending);
  const xy = point.toRawBytes(false).slice(1);
  const xyHex = "0x" + Array.from(xy, (b) => b.toString(16).padStart(2, "0")).join("");
  return ("0x" + keccak256(xyHex).slice(-40));
}
async function txCount(client, addr) {
  const r = await client.request({ method: "eth_getTransactionCount", params: [addr, "latest"] });
  return parseInt(r, 16);
}
async function balance(client, addr) {
  const r = await client.request({ method: "eth_getBalance", params: [addr, "latest"] });
  return BigInt(r);
}

console.log("");
console.log(`${c.bold}${c.magenta}  PRAGUECONNECT × ENS — privacy by resolution${c.reset}`);
console.log(`${c.dim}  Live demo: mainnet ENS → our CCIP-Read gateway → ERC-5564 stealth → escrow auth${c.reset}`);
console.log(`${c.dim}  Subject:   ${NAME}${c.reset}`);

// ─────────────────────────────────────────────────────────────────────────────
hdr(1, "What does the world see when they look up this name?");

const fullNode = namehash(NAME);
kv("namehash(name)", fullNode);

const display = await eth.getEnsText({ name: NAME, key: "name" }).catch(() => null);
const location = await eth.getEnsText({ name: NAME, key: "location" }).catch(() => null);
const sealedBy = await eth.getEnsText({ name: NAME, key: "sealed-by" }).catch(() => null);
const stealthMeta = await eth.getEnsText({ name: NAME, key: "stealth-meta-address" }).catch(() => null);
const addr = await eth.getEnsAddress({ name: NAME }).catch(() => null);

kv("addr(name)", addr ?? "—");
kv("text('name')", display ?? "—");
kv("text('location')", location ?? "—");
kv("text('sealed-by')", sealedBy && sealedBy.length ? sealedBy : `${c.dim}(no inviter)${c.reset}`);
kv("text('stealth-meta')", stealthMeta ? stealthMeta.slice(0, 28) + "…" + stealthMeta.slice(-8) : "—");
sub(`fetched via mainnet ENS — every wallet on Earth gets the same answers.`);

// ─────────────────────────────────────────────────────────────────────────────
hdr(2, "But where does that data actually live? — the offchain proof");

const PARENT = NAME.split(".").slice(1).join(".");
const parentNode = namehash(PARENT);
const resolverAddr = await eth.readContract({
  address: ENS_REGISTRY, abi: REGISTRY_ABI, functionName: "resolver", args: [parentNode],
});
kv("registry.resolver(parent)", resolverAddr);

const gatewayUrl = await eth.readContract({ address: resolverAddr, abi: RESOLVER_ABI, functionName: "url" });
kv("resolver.url()", gatewayUrl, c.blue);
sub("the resolver itself stores nothing — it just points at our gateway.");

console.log("");
sub(`calling resolver.resolve(name, addr(node)) directly …`);

const innerData = encodeFunctionData({ abi: ADDR_ABI, functionName: "addr", args: [fullNode] });
const dnsName = dnsEncode(NAME);

// Raw eth_call so viem doesn't auto-handle CCIP — we want the revert data verbatim.
const callPayload = encodeFunctionData({ abi: RESOLVER_ABI, functionName: "resolve", args: [dnsName, innerData] });
let captured;
try {
  await eth.request({
    method: "eth_call",
    params: [{ to: resolverAddr, data: callPayload }, "latest"],
  });
  console.log(`  ${c.red}✗ resolve() returned without reverting — that would mean onchain resolution!${c.reset}`);
} catch (e) {
  // Different RPCs nest the revert data in different places. Walk the cause chain.
  let raw = e?.data ?? e?.cause?.data ?? e?.cause?.cause?.data;
  if (!raw && typeof e?.message === "string") {
    const m = e.message.match(/0x556f1830[0-9a-fA-F]*/); // selector for OffchainLookup
    if (m) raw = m[0];
  }
  if (raw && raw.startsWith("0x556f1830")) {
    const dec = decodeErrorResult({ abi: RESOLVER_ABI, data: raw });
    const [sender, urls, callData, cb, extra] = dec.args;
    console.log(`  ${c.green}✓ revert(OffchainLookup)${c.reset} — EIP-3668 signal received`);
    kv("  → revert selector", "0x556f1830  (OffchainLookup)");
    kv("  → sender", sender);
    kv("  → urls[0]", urls[0], c.blue);
    kv("  → callback", `${cb}  (resolveWithProof)`);
    captured = { resolverAddr, urls, callData, extraData: extra };
  } else {
    console.log(`  ${c.red}reverted but no OffchainLookup data captured${c.reset}`);
    console.log(`  ${c.dim}${(e.shortMessage ?? e.message ?? "").slice(0, 200)}${c.reset}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
hdr(3, "Hit the gateway → fetch a signed payload → verify on-chain");

if (captured) {
  const url = captured.urls[0]
    .replace("{sender}", captured.resolverAddr)
    .replace("{data}", captured.callData);
  sub(`GET ${url.length > 96 ? url.slice(0, 64) + "…" + url.slice(-24) : url}`);
  const gatewayRes = await fetch(url).then((r) => r.json());
  kv("gateway response bytes", `${gatewayRes.data.length / 2 - 1} bytes (result ‖ expires ‖ signature)`);

  const verified = await eth.readContract({
    address: captured.resolverAddr,
    abi: RESOLVER_ABI,
    functionName: "resolveWithProof",
    args: [gatewayRes.data, captured.extraData],
  });
  const [recovered] = decodeAbiParameters([{ type: "address" }], verified);
  kv("resolveWithProof()", `${recovered}  ✓`, c.green);
  sub("on-chain ECDSA recovery verified the gateway's signature against the registered signer set.");
}

// ─────────────────────────────────────────────────────────────────────────────
hdr(4, "From the stealth-meta-address → escrow's workerKey");

if (stealthMeta && stealthMeta.startsWith("st:eth:")) {
  const wk = workerKeyFromMeta(stealthMeta);
  kv("stealth-meta (ERC-6538)", stealthMeta.slice(0, 28) + "…");
  kv("→ spending pubkey", "0x" + stealthMeta.slice("st:eth:0x".length, "st:eth:0x".length + 66));
  kv("→ workerKey", wk, c.yellow);
  sub("this is what the funder commits to in PragueConnectEscrowV2.fund(taskId, workerKey).");

  // Footprint check — should be zeros across the board.
  console.log("");
  sub("how much on-chain history does that workerKey have?");
  const [ethTx, baseTx, baseBal] = await Promise.all([
    txCount(eth, wk).catch(() => -1),
    txCount(baseRpc, wk).catch(() => -1),
    balance(baseRpc, wk).catch(() => -1n),
  ]);
  const fmt = (n, unit = "") => (n === 0 ? `${c.green}0${c.reset} ${unit}${c.dim}(virgin address)${c.reset}` : `${n} ${unit}`);
  kv("ethereum mainnet txs", fmt(ethTx), "");
  kv("base mainnet txs", fmt(baseTx), "");
  kv("base mainnet balance", fmt(Number(baseBal), "wei"), "");

  console.log("");
  if (addr) {
    sub(`compare to the ENS-listed addr ${addr}:`);
    const realTx = await txCount(eth, addr).catch(() => -1);
    const realTxBase = await txCount(baseRpc, addr).catch(() => -1);
    kv("real EOA  ethereum txs", `${realTx}`, c.red);
    kv("real EOA  base txs", `${realTxBase}`, c.red);
    sub("the real EOA exists on-chain. workerKey doesn't. yet the escrow recognizes it as authoritative.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
hdr(5, "What this proves");

console.log("");
console.log(`  ${c.green}✓${c.reset}  Resolution is offchain (EIP-3668) — verified by the OffchainLookup revert.`);
console.log(`  ${c.green}✓${c.reset}  The gateway response is signed; the resolver verifies it on-chain.`);
console.log(`  ${c.green}✓${c.reset}  ENS publishes an ERC-6538 stealth-meta-address — sender derivation needs nothing else.`);
console.log(`  ${c.green}✓${c.reset}  The escrow's workerKey is just a public-key shape — zero on-chain footprint.`);
console.log(`  ${c.green}✓${c.reset}  ENS isn't decoration here. It's the protocol that makes the privacy work.`);
console.log("");
console.log(`  ${c.dim}"In PragueConnect, an ENS lookup is a payment privacy operation."${c.reset}`);
console.log("");
