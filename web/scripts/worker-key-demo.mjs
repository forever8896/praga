// Take the stealth meta-address we just pulled from ENS, extract the worker's
// spending pubkey, derive the escrow workerKey — exactly what a funder does
// before calling fund(taskId, workerKey).
import { keccak256 } from "viem";
import { secp256k1 } from "@noble/curves/secp256k1";

const meta =
  "st:eth:0x02191ee150aa152b1086b6351d3fc084306a79343eabb537014577ce345ff7aa9303e366e08c0c5f65cba22e24526516510cda4e4f34d16f878897e04fd258293b85";

// st:eth:0x<spending-66><viewing-66>
const hex = meta.slice("st:eth:0x".length);
const spendingPubKeyCompressed = hex.slice(0, 66);
const viewingPubKeyCompressed = hex.slice(66, 132);

console.log(`spending pubkey (compressed): 0x${spendingPubKeyCompressed}`);
console.log(`viewing  pubkey (compressed): 0x${viewingPubKeyCompressed}`);

// Decompress, drop the 0x04 prefix, keccak the (x||y), take the last 20 bytes.
const point = secp256k1.ProjectivePoint.fromHex(spendingPubKeyCompressed);
const xy = point.toRawBytes(false).slice(1);
const xyHex = "0x" + Array.from(xy, (b) => b.toString(16).padStart(2, "0")).join("");
const hash = keccak256(xyHex);
const workerKey = "0x" + hash.slice(-40);

console.log(`workerKey (escrow auth address) → ${workerKey}`);
console.log(``);
console.log(`This is what a funder commits to when calling`);
console.log(`  PragueConnectEscrowV2.fund(taskId, "${workerKey}")`);
console.log(``);
console.log(`Worker's actual EOA on chain: 0xAb04088c1D24641C34F6BcEE8103053D84194B25`);
console.log(`workerKey is different — and has zero on-chain history.`);
