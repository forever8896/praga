// Public env. Anything used in the browser must be NEXT_PUBLIC_* on Next.js.
// Keep keys defaulting to empty so the design canvas renders even without secrets;
// real flows guard on `isConfigured()` and surface a "demo mode" banner if not.
export const env = {
  privyAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "",
  pimlicoApiKey: process.env.NEXT_PUBLIC_PIMLICO_API_KEY ?? "",
  baseRpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://mainnet.base.org",
  baseSepoliaRpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org",
  // Resolver signer key — used by /api/ccip to sign CCIP-Read responses for
  // PragueConnectResolver. Server-only.
  resolverSignerKey: process.env.PC_RESOLVER_SIGNER_KEY ?? "",
  namestoneDomain: process.env.NEXT_PUBLIC_NAMESTONE_DOMAIN ?? "pragueconnect.eth",
  // ScopeLift canonical contracts — same address on every supported L2
  // https://github.com/ScopeLift/stealth-address-erc-contracts
  erc5564Announcer: "0x55649E01B5Df198D18D95b5cc5051630cfD45564",
  erc6538Registry: "0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538",
  // PragueConnect's own deployed addresses — set after running the deploy scripts.
  escrowAddress: process.env.NEXT_PUBLIC_PRAGUECONNECT_ESCROW_ADDRESS ?? "",
  // V2 escrow uses sig-based authorization so the worker's main EOA never
  // appears in any escrow tx. Falls back to v1 if v2 isn't deployed yet.
  escrowV2Address: process.env.NEXT_PUBLIC_PRAGUECONNECT_ESCROW_V2_ADDRESS ?? "",
  tipAddress: (process.env.NEXT_PUBLIC_PRAGUECONNECT_TIP_ADDRESS ?? "") as `0x${string}` | "",
  invitesAddress: (process.env.NEXT_PUBLIC_PRAGUECONNECT_INVITES_ADDRESS ?? "") as `0x${string}` | "",
  // Default chain: Base mainnet (8453). Override with NEXT_PUBLIC_DEFAULT_CHAIN_ID
  // for testnet (84532 = Base Sepolia).
  defaultChainId: Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? "8453"),
};

export function isConfigured(): boolean {
  return Boolean(env.privyAppId);
}
