# Fork PragueConnect for your city

PragueConnect is the **Prague instance** of a city-shaped pattern. The whole stack is parameterized by one ENS parent name, one CCIP-Read gateway, two payment contracts, and a parchment reskin. Everything else — the protocol primitives, the privacy posture, the marketplace logic — comes for free.

This guide walks through standing up your own city in **about an afternoon**. By the end you'll have:

- `<city>connect.eth` (or any name you own) on mainnet ENS, resolving via your own CCIP-Read gateway,
- two contracts on Base for tipping and escrow,
- a Vercel deployment your neighbors can claim names on,
- profiles served from IPFS (no eth.limo dependency),
- end-to-end stealth payments with auto-rotating addresses, working out of the box.

The reference implementation here cost **~0.005 ETH on Base mainnet** to deploy + **~0.0026 ETH** for the ENS registration. Forks should expect to pay similar.

> **Reputation belongs to the human, not the city.** The stack is per-city; identities cross. A user can hold `kilian.pragueconnect.eth` and `kilian.barcelonaconnect.eth` and the stealth-meta-address is the same key — they're the same person, surfaced in two town squares. This is on purpose.

---

## Step 1 — Pick a parent ENS name

Register `<city>connect.eth` on Ethereum mainnet via the [ENS app](https://app.ens.domains). Keep the registration EOA's private key as your deployer — you'll reuse it for everything below. Budget ~0.003 ETH for a 1-year registration plus a few cents in gas.

For dev iteration, register on Sepolia first (free test ETH, same flow) and graduate to mainnet once your gateway is live.

---

## Step 2 — Deploy your CCIP-Read resolver

The resolver is a single Solidity contract. It takes one param: the URL template of your gateway.

```bash
cd contracts
DEPLOYER_KEY=0x… forge script script/DeployResolver.s.sol \
  --rpc-url https://eth-mainnet.g.alchemy.com/v2/<key> --broadcast
```

Before you broadcast, edit `script/DeployResolver.s.sol`:

- `url`: your gateway template, e.g. `https://barcelonaconnect.vercel.app/api/ccip/{sender}/{data}.json`
- `signers`: an EOA whose private key will sign gateway responses (this is *not* the same as the deployer; keep it server-side as `PC_RESOLVER_SIGNER_KEY`)

Once deployed, set the resolver of `<city>connect.eth` to the new address:

- ENS app → your name → "Edit" → "Resolver" → paste address → save.

**Verify:** any wallet pointed at mainnet should now resolve `test.<city>connect.eth` to whatever your gateway returns. The gateway is empty until step 5, so it'll return `0x000…0` — that's expected.

---

## Step 3 — Deploy the payment rails

Two contracts on **Base mainnet** (or Base Sepolia for dev):

```bash
DEPLOYER_KEY=0x… forge script script/DeployTip.s.sol      --rpc-url https://mainnet.base.org --broadcast
DEPLOYER_KEY=0x… forge script script/DeployEscrowV2.s.sol --rpc-url https://mainnet.base.org --broadcast
```

Save the two contract addresses; they go into Vercel env in step 5.

The ScopeLift ERC-5564 announcer (`0x55649E01B5Df198D18D95b5cc5051630cfD45564`) and registry (`0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538`) are **canonical across every supported L2** — no per-city deploy. The Tip contract auto-wires both.

For dev, run `forge test` first — there are 62 tests covering tip atomicity, escrow phase transitions, sig-auth correctness, replay protection, and stealth metadata layout. All should pass before you broadcast.

---

## Step 4 — Reskin the parchment

The visual language (Cormorant Garamond, parchment palette, wax seals, fleur-de-lis stamps, alchemical sigils) was designed to suit any guild city — but five spots want a local touch:

| File | Swap with |
|---|---|
| `web/public/logo.png` | Your city's emblem (transparent PNG, ~64–92px tall) |
| `web/data/subnames.json` | 10–15 seeded local artisans (handles, bios, locations, skills) |
| `web/lib/i18n.tsx` | Replace the `cs` dictionary with your local language; `en` stays. Update strings mentioning Prague / Karlín / Žižkov etc. |
| `web/lib/ornaments.tsx` | The city-skyline SVG (currently Prague). Hand-drawn or traced from a public-domain etching looks best. |
| `web/app/globals.css` | Optional: palette tokens (`--parchment`, `--ink`, `--vermilion`, `--gilded`, `--verdigris`) if your city has a distinct iconography (Lisbon's azulejos, Barcelona's modernisme tilework, etc.) |

The four sigil families on offer cards (currency / handshake / lantern / scroll) live in `ornaments.tsx`. Pick or extend.

---

## Step 5 — Wire the env

Copy `web/.env.example` to `web/.env.local`:

```bash
# Wallet + auth
NEXT_PUBLIC_PRIVY_APP_ID=                 # https://dashboard.privy.io
PRIVY_APP_SECRET=                         # server-side
NEXT_PUBLIC_PIMLICO_API_KEY=              # optional (sponsored tx)

# Chains
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_DEFAULT_CHAIN_ID=8453         # 84532 for testnet

# Identity
NEXT_PUBLIC_NAMESTONE_DOMAIN=barcelonaconnect.eth   # legacy var name; this is your parent ENS
PC_RESOLVER_SIGNER_KEY=0x…                # CCIP-Read response signer (matches resolver's `signers` from step 2)

# Contracts (from step 3)
NEXT_PUBLIC_PRAGUECONNECT_TIP_ADDRESS=0x…
NEXT_PUBLIC_PRAGUECONNECT_ESCROW_V2_ADDRESS=0x…
NEXT_PUBLIC_PRAGUECONNECT_INVITES_ADDRESS=0x…   # optional — skip if you're not gating with invite codes

# Faucet (optional)
PC_FAUCET_KEY=0x…                         # funded EOA on the same L2 — see step 7

# Decentralized profile storage (optional, recommended)
SWARM_BEE_URL=https://your-bee-node       # primary: Swarm via your own Bee node
SWARM_POSTAGE_BATCH_ID=…                  # postage batch (one-time purchase)
PINATA_JWT=…                              # fallback: IPFS via Pinata

# KV
KV_REST_API_URL=                          # auto-injected by Vercel KV add-on
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=
```

> The `NAMESTONE_DOMAIN` env var name is historical — the codebase used to depend on NameStone's hosted SaaS before we replaced it with our own resolver store. It's now just "the parent ENS name." A future cleanup pass would rename it `PARENT_ENS_NAME`.

---

## Step 6 — Provision Vercel KV + deploy

```bash
cd web
bun install
bun run build                   # confirm clean — type-checks all 30+ routes
```

Push to GitHub, connect the repo in Vercel, then:

1. **Vercel Dashboard → Storage → Create KV** — auto-injects three env vars into all environments. Without KV, claims live only in lambda memory and are lost on cold start.
2. Add every env var from step 5 via the Vercel dashboard (or `vercel env add`).
3. **Deploy.** First push to `main` triggers production.

If you want a custom domain, add it under Vercel → Project → Domains; standard DNS dance.

---

## Step 7 — Optional: faucet drip

The reference deployment surfaces a "TOP ME UP" button on the tip page when a user's balance is below 0.001 ETH. It calls `POST /api/faucet-drip`, which sends ~0.005 ETH from `PC_FAUCET_KEY` to the user, rate-limited to one drip per address per 24h via KV.

To enable it: generate a fresh EOA, fund it with 0.5 ETH on your chosen L2, set `PC_FAUCET_KEY` in env. The route is auto-disabled if the env var is missing — UI quietly hides the button.

This is a UX nicety for new users who don't have crypto yet. Skip it if you'd rather point users at a public faucet.

---

## Step 8 — Optional: rename the contracts

`PragueConnectTip`, `PragueConnectEscrowV2`, `PragueConnectInvites`, `PragueConnectResolver` are just labels in Solidity. If you want `BarcelonaConnectTip` for the Etherscan vanity:

1. Rename the file + `contract` declaration.
2. Update `script/Deploy*.s.sol` import lines.
3. Update `web/lib/escrow.ts` and `web/lib/tip-form.tsx` ABI imports if you've renamed the type.
4. The ABI itself is identical — front-end logic doesn't change.

---

## Step 9 — Optional: aggregate ENS namespaces (`connect.eth` hub)

If you run more than one city, the natural pattern is a hub: `connect.eth` resolves a feed-of-feeds pointing at every city subname (`barcelonaconnect.eth`, `lisbonconnect.eth`, `pragueconnect.eth`), and each city stays sovereign over its own subnames.

The CCIP gateway (`web/app/api/ccip/[sender]/[data]/route.ts`) keys lookups by **namehash**, so it trivially extends to multiple parents — point each parent at a separate resolver instance, but share one gateway URL. Each parent then points at the same code, which serves all of them by reading from the same KV store keyed `pc:subnames:<domain>`.

The reference repo deploys one resolver per parent because it's simpler. Multi-parent is a one-day refactor.

---

## Step 10 — Optional: serve profiles from decentralized storage

Each `<name>.<city>connect.eth` page can be served from decentralized storage rather than from Vercel, making the canonical profile site fully sovereign. Two backends are supported; the publisher tries Swarm first, falls back to IPFS.

**Swarm (primary).** Run a Bee node — locally during dev, on a small VPS for prod — and set:

```bash
SWARM_BEE_URL=https://your-bee-node.example      # the Bee API endpoint
SWARM_POSTAGE_BATCH_ID=…                         # purchased once, stamps subsequent uploads
```

Buy a postage batch through your Bee node (`POST /stamps/<amount>/<depth>`) — a one-time payment in xBZZ that covers many uploads.

**IPFS (fallback).** If Swarm isn't configured or the Bee node is unreachable, the publisher falls back to pinning via Pinata:

1. Sign up at [pinata.cloud](https://app.pinata.cloud) (free tier covers ~1 GB).
2. Create an API key with the `pinFileToIPFS` scope. Copy the JWT.
3. Set `PINATA_JWT=eyJ…` in Vercel env.

Either backend produces an ENSIP-7 `contenthash` written to the user's subname. Profiles render a "served from Swarm" / "served from IPFS" badge linking to a public gateway, so anyone can verify the same content without trusting your app.

> Note: `<name>.<city>connect.eth.limo` URLs **don't render in browsers** — eth.limo's wildcard cert only covers `*.eth.limo`, not three-level subdomains like `*.<parent>.eth.limo`. This is an eth.limo platform constraint, not something you can fix from the resolver. Mainnet ENS resolution itself works fine; the IPFS gateway URL on each profile (linked from the badge) is the censorship-resistant public view.

---

## Verification checklist

Before sharing the URL with neighbors:

1. **`forge test`** in `contracts/` — 62/62 pass.
2. **`bun run build`** in `web/` — type-check + production build clean.
3. **External CCIP-Read** — pick any subname-shaped name (it doesn't have to exist yet) and resolve via viem against mainnet ENS:
   ```ts
   import { createPublicClient, http } from "viem";
   import { mainnet } from "viem/chains";
   const c = createPublicClient({ chain: mainnet, transport: http() });
   await c.getEnsAddress({ name: "test.<city>connect.eth" });   // → 0x000…0 (record not set yet) — but no error
   ```
4. **Claim flow** — open the deployed site on a fresh device, claim a name, verify the address resolves on mainnet.
5. **Tip flow** — send 0.0001 ETH from your wallet to your own subname's `/tip/<name>` page. Verify the funds land at a fresh stealth address (Basescan tx → `to` ≠ your main wallet).
6. **Escrow flow** — open `/m/<other-name>` between two test wallets. Fund → accept → deliver → release. Each phase emits a system message into the XMTP thread.

Once these six pass, you're prod.

---

## Forking in good taste

The PragueConnect *brand* (parchment palette, Rudolfine voice, fleur-de-lis stamps, the `pragueconnect.eth` parent itself) belongs to the original project. The **stack** — protocol primitives, contract patterns, gateway code — is MIT-licensed and yours to fork freely.

If you want to fork the brand rather than the city, please pick a different parent ENS name and a different visual direction. The CROPS hallmark (Censorship-Resistant Open Public Stuff) is the only thing we'd ask you keep — it's a tiny mark in the corner of every PragueConnect-derived city, signalling shared lineage. Drop us a line; we'd love to know who's running where.

---

## Cities running the stack

If you fork and ship, open a PR adding your city to this list.

| City | Parent ENS | URL |
|---|---|---|
| **Prague** | `pragueconnect.eth` | https://www.pragueconnect.xyz/ |
