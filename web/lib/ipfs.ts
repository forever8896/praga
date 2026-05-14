// IPFS publishing via Pinata. Pin a profile's static HTML, encode the resulting
// CID as an ENSIP-7 contenthash, write it back to NameStone. Result:
// `<name>.pragueconnect.eth.limo` resolves to a real IPFS-pinned page.
//
// Requires PINATA_JWT (a scoped JWT from pinata.cloud → API Keys).
//
// ENSIP-7 contenthash for IPFS CIDv1 dag-pb sha256:
//   0xe301 || 0x01 || 0x70 || 0x12 0x20 || <32-byte sha256>
//   = 0xe30101701220 + <32-byte hash>
// Where:
//   0xe301 — varint(0xe3) ipfs-ns multicodec
//   0x01   — CIDv1
//   0x70   — dag-pb codec
//   0x1220 — multihash header: sha256 (0x12), 32 bytes (0x20)

const PINATA_PIN_API = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const IPFS_CONTENTHASH_PREFIX = "e30101701220"; // 6 bytes / 12 hex chars

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Decode(s: string): Uint8Array {
  // Byte-wise big-endian arithmetic — no BigInt, just multiply-and-carry.
  // For each input char: digits = digits * 58 + idx, where digits[] is big-endian bytes.
  const out: number[] = [];
  for (const c of s) {
    const idx = BASE58_ALPHABET.indexOf(c);
    if (idx < 0) throw new Error(`invalid base58 char: ${c}`);
    let carry = idx;
    for (let i = out.length - 1; i >= 0; i--) {
      const v = out[i] * 58 + carry;
      out[i] = v & 0xff;
      carry = v >>> 8;
    }
    while (carry) {
      out.unshift(carry & 0xff);
      carry >>>= 8;
    }
  }
  // Restore leading zero bytes (each '1' = one zero byte).
  let leading = 0;
  for (const c of s) { if (c === "1") leading++; else break; }
  const padded = new Uint8Array(leading + out.length);
  for (let i = 0; i < out.length; i++) padded[leading + i] = out[i];
  return padded;
}

function base58Encode(bytes: Uint8Array): string {
  const digits: number[] = [];
  for (const b of bytes) {
    let carry = b;
    for (let i = 0; i < digits.length; i++) {
      const v = digits[i] * 256 + carry;
      digits[i] = v % 58;
      carry = (v / 58) | 0;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let result = "";
  for (const b of bytes) {
    if (b === 0) result += "1";
    else break;
  }
  for (let i = digits.length - 1; i >= 0; i--) result += BASE58_ALPHABET[digits[i]];
  return result;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error("invalid hex");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

export function cidV0ToContenthash(cid: string): `0x${string}` {
  if (!cid.startsWith("Qm") || cid.length !== 46) {
    throw new Error(`expected CIDv0 (Qm...), got ${cid}`);
  }
  const mh = base58Decode(cid);
  if (mh.length !== 34 || mh[0] !== 0x12 || mh[1] !== 0x20) {
    throw new Error("invalid CIDv0 multihash");
  }
  const hash = mh.slice(2);
  return `0x${IPFS_CONTENTHASH_PREFIX}${bytesToHex(hash)}` as `0x${string}`;
}

export function contenthashToCidV0(contenthash: string | null | undefined): string | null {
  if (!contenthash) return null;
  const hex = contenthash.startsWith("0x") ? contenthash.slice(2).toLowerCase() : contenthash.toLowerCase();
  if (hex.length !== 76) return null; // 12 prefix + 64 hash hex
  if (!hex.startsWith(IPFS_CONTENTHASH_PREFIX)) return null;
  const hashHex = hex.slice(IPFS_CONTENTHASH_PREFIX.length);
  const multihash = hexToBytes("1220" + hashHex);
  return base58Encode(multihash);
}

export function isIpfsConfigured(): boolean {
  return !!process.env.PINATA_JWT;
}

interface UploadResult {
  cid: string;
  contenthash: `0x${string}`;
}

export async function uploadHtmlToIpfs(html: string, fileName = "index.html"): Promise<UploadResult> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("ipfs-not-configured");
  const form = new FormData();
  form.append("file", new Blob([html], { type: "text/html; charset=utf-8" }), fileName);
  form.append("pinataMetadata", JSON.stringify({ name: `pragueconnect/${fileName}` }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 0 }));
  const res = await fetch(PINATA_PIN_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`pinata ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { IpfsHash?: string };
  if (!data.IpfsHash) throw new Error("pinata returned no IpfsHash");
  return {
    cid: data.IpfsHash,
    contenthash: cidV0ToContenthash(data.IpfsHash),
  };
}
