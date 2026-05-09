// Top-level provider chain: Privy (embedded wallet) → wagmi → react-query.
// Falls back to a no-op render if Privy isn't configured so the design canvas
// remains demo-able without keys.
"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { base, baseSepolia } from "viem/chains";
import { env, isConfigured } from "./env";
import { wagmiConfig } from "./wagmi";
import { I18nProvider } from "./i18n";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  if (!isConfigured()) {
    // Demo mode — render the design canvas without web3 wiring.
    return <I18nProvider>{children}</I18nProvider>;
  }

  return (
    <I18nProvider><PrivyProvider
      appId={env.privyAppId}
      config={{
        loginMethods: ["email", "sms", "google"],
        appearance: {
          theme: "light",
          accentColor: "#B23A2F",
          logo: undefined,
          // Skol palette pushed into Privy's modal so it doesn't break the parchment vibe.
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          // Auto-create an embedded wallet for every signed-in user (Privy v3 shape).
          ethereum: { createOnLogin: "users-without-wallets" },
        },
        defaultChain: env.defaultChainId === baseSepolia.id ? baseSepolia : base,
        supportedChains: [base, baseSepolia],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider></I18nProvider>
  );
}
