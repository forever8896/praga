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
export const PRAGA_STEALTH_DOMAIN = "praga.stealth.v1";
export const PRAGA_STEALTH_MESSAGE = `Sign to seal your private-gift route on Praga.\n\nDomain: ${PRAGA_STEALTH_DOMAIN}\nThis signature only derives a stealth key — it sends no funds.`;

export interface PragaStealthKeys {
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

export function derivePragaKeys(signature: `0x${string}`): PragaStealthKeys {
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

function privateKeyToCompressedPublic(priv: `0x${string}`): `0x${string}` {
  const bytes = secp256k1.getPublicKey(priv.slice(2), true);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex}`;
}

// Re-export for downstream
export { generateEphemeralPrivateKey, generateStealthAddresses };
