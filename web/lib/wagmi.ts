// wagmi + Privy config. Base primary, Linea + Sepolia secondary for tx-flow demos.
"use client";

import { createConfig } from "@privy-io/wagmi";
import { http } from "viem";
import { base, baseSepolia, linea } from "viem/chains";
import { env } from "./env";

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia, linea],
  transports: {
    [base.id]: http(env.baseRpcUrl),
    [baseSepolia.id]: http(env.baseSepoliaRpcUrl),
    [linea.id]: http(),
  },
});

// Pimlico bundler/paymaster URL for the active chain (smart-wallet flow).
export function pimlicoUrl(chainId: number): string {
  if (!env.pimlicoApiKey) return "";
  return `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${env.pimlicoApiKey}`;
}
