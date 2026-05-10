// Stealth payments — FluidKey + ScopeLift wrapper.
// FluidKey: deterministic crypto (meta-address + ephemeral keys + recipient sweeping)
// ScopeLift: canonical 0x5564… announcer + 0x6538… registry, on-chain rails
//
// References:
//   EIP-5564: https://eips.ethereum.org/EIPS/eip-5564
//   ERC-6538: https://eips.ethereum.org/EIPS/eip-6538
//   FluidKey: https://github.com/fluidkey/fluidkey-stealth-account-kit
//   ScopeLift: https://github.com/ScopeLift/stealth-address-sdk
//
// Skol's twist: dual-publish the meta-address to BOTH the ERC-6538 registry AND
// to an ENS text record `stealth-meta-address`. ENS-publication is currently
// a not-yet-finalized pattern — the "creative use of ENS" angle for ENS Bounty 2.

import {
  generateKeysFromSignature,
  extractViewingPrivateKeyNode,
  generateEphemeralPrivateKey,
  generateStealthAddresses,
} from "@fluidkey/stealth-account-kit";
import {
  generateStealthAddress,
  VALID_SCHEME_ID,
} from "@scopelift/stealth-address-sdk";

/**
 * Derive Skol's stealth meta-address from a single deterministic signature.
 * The signer (Privy embedded wallet, or any EIP-191 signer) signs a fixed
 * message; the same signature always produces the same meta keys.
 */
export const PRAGUECONNECT_STEALTH_DOMAIN = "pragueconnect.stealth.v1";
export const PRAGUECONNECT_STEALTH_MESSAGE = `Sign to seal your private-gift route on PragueConnect.\n\nDomain: ${PRAGUECONNECT_STEALTH_DOMAIN}\nThis signature only derives a stealth key — it sends no funds.`;

export interface PragueConnectStealthKeys {
  /** ERC-5564 spending public key, hex */
  spendingPublicKey: `0x${string}`;
  /** ERC-5564 viewing public key, hex */
  viewingPublicKey: `0x${string}`;
  /** Viewing private key — kept client-side, used to scan announcements. */
  viewingPrivateKey: `0x${string}`;
  /** Spending private key — used to claim/sweep funds from a stealth address. */
  spendingPrivateKey: `0x${string}`;
  /** ERC-6538 meta-address string: "st:eth:0x<spend><view>" */
  metaAddress: string;
}

export function derivePragueConnectKeys(signature: `0x${string}`): PragueConnectStealthKeys {
  const { spendingPrivateKey, viewingPrivateKey } = generateKeysFromSignature(signature);
  // Viewing key node is the BIP-32 derivation root for ephemeral keys.
  // Per FluidKey kit: m/5564'/0'/8'/0'/0'/p'/n'
  extractViewingPrivateKeyNode(viewingPrivateKey, 0);
  // Public keys are derived inside FluidKey's helper when generating addresses;
  // we expose the meta-address ScopeLift expects on the registry.
  // ScopeLift's SDK formats meta-addresses; we just hand it the priv keys.
  // For now, format directly per ERC-6538 §5.
  const spendingPublicKey = privateKeyToCompressedPublic(spendingPrivateKey);
  const viewingPublicKey = privateKeyToCompressedPublic(viewingPrivateKey);
  const metaAddress = `st:eth:0x${spendingPublicKey.slice(2)}${viewingPublicKey.slice(2)}`;
  return {
    spendingPublicKey,
    viewingPublicKey,
    viewingPrivateKey,
    spendingPrivateKey,
    metaAddress,
  };
}

/**
 * Generate a fresh stealth-payment address for a given meta-address.
 * Senders call this; receivers don't.
 */
export function paymentAddress(metaAddress: string): {
  stealthAddress: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
  viewTag: `0x${string}`;
} {
  const out = generateStealthAddress({
    stealthMetaAddressURI: metaAddress,
    schemeId: VALID_SCHEME_ID.SCHEME_ID_1,
  });
  return {
    stealthAddress: out.stealthAddress as `0x${string}`,
    ephemeralPublicKey: out.ephemeralPublicKey as `0x${string}`,
    viewTag: out.viewTag as `0x${string}`,
  };
}

// --- helpers ---

// @noble/curves is a transitive dep of viem, so this resolves with no extra install.
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak256 } from "viem";

function privateKeyToCompressedPublic(priv: `0x${string}`): `0x${string}` {
  const bytes = secp256k1.getPublicKey(priv.slice(2), true);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex}`;
}

/** Convert a secp256k1 public key (compressed or uncompressed hex) to its
 *  Ethereum address. Used by the v2 escrow flow to derive `workerKey` —
 *  the address that ecrecover gives back when the worker signs intents
 *  with their stealth spending privkey. */
export function publicKeyToEthAddress(pubKeyHex: string): `0x${string}` {
  const clean = (pubKeyHex.startsWith("0x") ? pubKeyHex.slice(2) : pubKeyHex).toLowerCase();
  let xy: Uint8Array;
  if (clean.length === 66) {
    const point = secp256k1.ProjectivePoint.fromHex(clean);
    xy = point.toRawBytes(false).slice(1); // drop 0x04 prefix
  } else if (clean.length === 130 && clean.startsWith("04")) {
    xy = hexToBytes(clean.slice(2));
  } else if (clean.length === 128) {
    xy = hexToBytes(clean);
  } else {
    throw new Error(`invalid public key length: ${clean.length}`);
  }
  const hash = keccak256(`0x${bytesToHex(xy)}` as `0x${string}`);
  return `0x${hash.slice(-40)}` as `0x${string}`;
}

/** Extract the spending-key-derived address from an ERC-6538 meta-address.
 *  Format: st:eth:0x<spendingPubKey-66><viewingPubKey-66>. */
export function metaAddressToWorkerKey(meta: string): `0x${string}` {
  if (!meta.startsWith("st:eth:0x")) throw new Error("invalid meta-address");
  const hex = meta.slice("st:eth:0x".length);
  if (hex.length !== 132) throw new Error("invalid meta-address payload length");
  return publicKeyToEthAddress(`0x${hex.slice(0, 66)}`);
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Re-export for downstream
export { generateEphemeralPrivateKey, generateStealthAddresses };
