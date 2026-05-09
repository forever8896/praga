# PragueConnect — by the hand of

**A peer-to-peer marketplace for human favors. Reputation belongs to the human, not the platform.**

Built for ETHPrague 2026. Live at **<https://pragueconnect-azure.vercel.app>**.

> *"Like Craigslist, if Craigslist were a guild ledger from Rudolfine Prague — every name a sealed inscription, every gift a wax stamp, every receipt a chiseled patent."*

---

## What it is

Each user claims `<name>.pragueconnect.eth`. That single inscription is:

- their account,
- their public personal site (`<name>.pragueconnect.eth.limo`),
- their sealed letterbox (XMTP V3 / MLS),
- their portable reputation, and
- their stealth gift route (ERC-5564 meta-address).

Everything that's a "platform feature" elsewhere is an ENS text record here. There is **no platform database**. Subnames are served by **PragueConnect's own CCIP-Read resolver** — every byte in the resolution path is in this repo. The marketplace data (offers, bios, skills, locations) lives as text records on the user's subname; the payment rails (tips, four-phase escrow) live on Base Sepolia.

## The six loops that close

1. **Claim → Identity.** A 7-beat cinematic onboarding inscribes `<name>.pragueconnect.eth` in two signatures: the first registers the subname, the second derives an ERC-5564 stealth meta-address from a deterministic message and writes it back as a text record. New users have privacy by default, not as a setup step. Beats: *Inheritance acknowledgement → Threshold → LivePreviewParchment → PromiseCard → InscriptionStage → SealedBeat → Branch.*
2. **Edit → Resolver.** `/me/edit` writes bio / location / avatar / skills / `stealth-meta-address` text records. Public profile (`/<ens>`) reflects them on next CCIP read. Auth-gated by Privy access token.
3. **Compose → Feed.** `/compose` writes an `offers` JSON text record. `/feed` lists every subname under `pragueconnect.eth`, flattens the offers, ranks by `posted_at`, filters by sigil chips.
4. **Tip → Stealth payment.** `/tip/<ens>` reads the recipient's `stealth-meta-address`, derives a fresh stealth address client-side, calls `PragueConnectTip.tip(...)` on Base Sepolia. The contract atomically transfers ETH and announces via the canonical ScopeLift ERC-5564 announcer. **Block-explorer view ≠ profile view; the link is broken at the speed of one transaction.**
5. **Reciprocate → 95/5 finder's mark.** A user sealed by an inviter (`sealed-by` text record) sees a `ReciprocateCartouche` on their own profile. Press-and-hold the wax stamp triggers `tipWithReferral(stealth_recipient, stealth_inviter, ephem_recipient, ephem_inviter, ...)` — a single tx, two stealth payouts, two announcements, atomic 95/5 split.
6. **Thread → Magnum Opus escrow.** `/m/<label>` is an XMTP V3 sealed thread keyed by ENS. Above the message stream sits the four-phase escrow widget: **Nigredo** (Funded) → **Albedo** (In progress, worker commits a stealth recipient) → **Citrinitas** (Delivered) → **Rubedo** (Released, payout to stealth address + announcer fires). Each phase posts a system message into the thread, so the alchemical ceremony narrates itself.

The receipts on every profile come from on-chain `Tipped`/`Released` events — no fixtures.

---

## Privacy posture (read this before pitching it)

PragueConnect uses **ERC-5564 stealth addresses** end-to-end. A sender derives a one-time stealth address per gift; the recipient's published address never receives funds directly. **Per-payment unlinkability is real.**

What is **not yet shipped** is **anonymous aggregation** of those stealth pots into a single spendable balance. The naive sweep is a known weakness — academic work on Umbra ([arXiv 2308.01703](https://arxiv.org/pdf/2308.01703)) shows the *Collector heuristic* deanonymizes 25–66% of stealth payments at sweep time. Roadmap below.

### Roadmap: anonymous aggregation (post-hackathon)

The intended architecture is a **per-recipient aggregator vault** that:

1. Holds incoming tips on stealth addresses (per-payment unlinkability — already shipped).
2. Triggers a `shield()` into a **shielded pool** only once cumulative balance crosses a credible-anonymity-set threshold (~$200 equivalent).
3. Holds the shielded balance for a randomized 48–72h delay.
4. Unshields in **rounded denominations the pool already contains** ($25 / $50 / $100), to fresh ENS-registered subnames.

**Backend candidates** (researched 2026-05-09):

| Tech | Verdict for sub-$50 tips |
|---|---|
| **Railgun** (Polygon / Arbitrum) | Strong choice — UTXO model defeats amount-fingerprinting natively; ~$93M TVL. Best fit. |
| **0xbow Privacy Pools** | Wrong tool below ~$1,000. Thin pools (Ethereum USDC: 253 distinct depositors), arbitrary-amount commitments fingerprint, ASP centralization. |
| **Cashu-on-EVM** (Mario Havel's vision, EF Protocol Support) | No production mint exists in May 2026. Tracking. |
| **Aztec mainnet** | Live since 2026-03-31, but Noir SDK lift is heavier than a hackathon allows. Watching. |

The honest line on stage: **"For sub-$50 tips, a single deposit-and-withdraw on any current shielded pool is fingerprintable. Aggregation requires batching by amount and time, and we've designed the vault contract — see roadmap. The Kohaku stack Vitalik unveiled at Devconnect Buenos Aires is exactly this architecture, and we ship to align with it."**

**Status:** designed, not implemented. PRs welcome.

---

## Run it locally

### Web

```bash
cd web
cp .env.example .env.local         # fill in Privy, Base RPC, resolver signer key
bun install
bun run dev                        # → http://localhost:3000
```

Without env keys the design canvas renders without web3 wiring (useful for visual review). With keys, the full flow works against Sepolia ENS + Base Sepolia tips/escrow.

### Contracts

```bash
cd contracts
forge test                         # 7/7 PragueConnectEscrow tests passing
DEPLOYER_KEY=… forge script script/DeployTip.s.sol      --rpc-url https://sepolia.base.org --broadcast
DEPLOYER_KEY=… forge script script/Deploy.s.sol         --rpc-url https://sepolia.base.org --broadcast
DEPLOYER_KEY=… forge script script/DeployResolver.s.sol --rpc-url https://sepolia.infura.io/v3/<key> --broadcast
```

After the resolver deploys, set it as the resolver for `pragueconnect.eth` on the ENS Sepolia public registry (one tx via the ENS app).

---

## Repo layout

```
ethprague/
├── README.md                       This file
├── PLAN.md                         Bounty analysis, build order, risk plan
├── PRDs.md · PRDs_V2.md            Focused PRDs, one per loop
├── AUDIT.md                        Pre-demo audit + addendum after resolver replacement
├── CLAUDE_DESIGN_PROMPT.md         Single-direction design brief (Rudolfine Workshop)
├── design/                         Original HTML/JSX/CSS design canvas
├── web/                            Next.js 16 (Turbopack) — production target
│   ├── app/                        Routes — see table
│   ├── data/subnames.json          Baseline subnames bundled into the resolver
│   └── lib/
│       ├── ornaments.tsx                FleurDeLis · WaxSeal · Cartouche · sigils · marginalia
│       ├── profile-shared.tsx           PortraitRoundel · ReceiptStrip · ProfileHeader
│       ├── i18n.tsx                     EN/CS dictionary + LangToggle
│       ├── navbar.tsx · footer.tsx
│       ├── env.ts · providers.tsx · wagmi.ts
│       ├── resolver.ts                  Drop-in replacement for NameStone client
│       ├── resolver-store.ts            Baseline JSON ∪ in-memory overlay
│       ├── stealth.ts                   FluidKey + ScopeLift wrapper
│       ├── escrow.ts                    Magnum Opus ABI + taskId derivation
│       ├── tip-events.ts                Server-side getLogs for Tipped events
│       ├── xmtp.ts                      XMTP V3 client builder (cached)
│       ├── offers.ts                    Offer encoding + loadFeed()
│       ├── inheritance-tab.tsx          InviterAcknowledgement banner + cookie
│       ├── onboarding-form.tsx          7-beat cinematic claim
│       ├── live-preview-parchment.tsx   Beat 2 — typing preview
│       ├── promise-card.tsx             Beat 3 — pre-Privy modal
│       ├── inscription-stage.tsx        Beat 4 — letter-by-letter carving
│       ├── sealed-beat.tsx              Beat 5 — celebratory branch screen
│       ├── reciprocate-cartouche.tsx    Press-and-hold 95/5 finder's mark
│       ├── compose-form.tsx · edit-form.tsx · feed-view.tsx
│       ├── tip-form.tsx                 Stealth payment with pre-flight gas check
│       ├── thread-view.tsx · escrow-panel.tsx
│       └── owner-panel.tsx · wallet-view.tsx
└── contracts/                      Foundry
    ├── src/
    │   ├── PragueConnectResolver.sol    CCIP-Read offchain resolver (own gateway)
    │   ├── PragueConnectEscrow.sol      Magnum Opus four-phase escrow with stealth payout
    │   └── PragueConnectTip.sol         Tip + tipWithReferral (atomic 95/5 finder's mark)
    ├── test/                       7/7 passing
    ├── script/Deploy.s.sol · DeployTip.s.sol · DeployResolver.s.sol
    └── erc-7730/                   Clear-signing descriptors
```

---

## Routes

| Route | What it is | Data source |
|---|---|---|
| `/` | Onboarding — "Claim your name in Prague" | Resolver availability check, debounced |
| `/feed` | The town square | `listSubnames(pragueconnect.eth)` flattened |
| `/[ensName]` | Public profile / `*.eth.limo` | Resolver record + on-chain receipts |
| `/compose` | Post offer / request | `setSubname` text records |
| `/me/edit` | Edit your seal | `setSubname` (auth via Privy) |
| `/m/[label]` | Sealed XMTP thread + Magnum Opus escrow | XMTP V3 + `PragueConnectEscrow.tasks()` |
| `/tip/[ens]` | One-shot sealed gift | `PragueConnectTip.tip()` + ScopeLift announcer |
| `/r/[txHash]` | Receipt — Patent of Completion | `getTransactionReceipt` + `Tipped` event |
| `/wallet` | Leather-bound ledger | Base Sepolia balance + `Tipped` event totals |
| `/agent` | Agent delegation (UI mock) | — |
| `/api/ccip/[sender]/[data]` | CCIP-Read gateway (signs responses) | `resolver-store` |
| `/api/claim-name`, `/check-name`, `/update-profile` | Resolver write/read | `resolver-store` |
| `/dev/spec`, `/dev/states` | Design vignettes | — |

---

## Deployed addresses

### Sepolia (11155111) — ENS resolver

| Contract | Address |
|---|---|
| `PragueConnectResolver` (CCIP-Read) | `0x8519522032fb505795142ad833b6059e892eb4c1` |
| `pragueconnect.eth` parent | Sepolia ENS Public Resolver pointing to ↑ |

### Base Sepolia (84532) — payment rails

| Contract | Address |
|---|---|
| `PragueConnectTip` | `0x42f035e3a94a232e3240ff91371d51e2ee7bdd91` |
| `PragueConnectEscrow` (Magnum Opus four-phase) | `0xcec992abafa04cd2f0c89bfaa93bdae3bf9da67f` |
| ScopeLift announcer (canonical) | `0x55649E01B5Df198D18D95b5cc5051630cfD45564` |
| ScopeLift registry (canonical) | `0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538` |

ERC-7730 V2 descriptors for both PragueConnect contracts in `contracts/erc-7730/` — ready for upstream submission to the Ledger registry.

---

## Demo script (90 seconds)

1. **Open** `https://pragueconnect-azure.vercel.app` on a phone. Notice the CS/EN toggle in the top right.
2. **Type a name** in the inscription field. The **LivePreviewParchment** below brightens and updates as you type — status flips between AVAILABLE / TAKEN / AWAITING THE QUILL.
3. **SEAL THE NAME** → **PromiseCard** ("two signatures, both free") → Privy login → letter-by-letter inscription → **SealedBeat** lands with branching CTAs.
4. **Land on your profile** — empty bio, "WELCOME — YOUR NEXT STEPS" panel.
5. **Open `/feed`** → seven seeded artisans of Prague. Click any card.
6. **Press SEND A PRIVATE GIFT** → `/tip/<ens>` → 0.001 ETH → press the seal.
7. **Receipt page** — shows the **stealth recipient address** (different from the recipient's known address), Basescan link, ScopeLift announcer reference. *Punch line: explorer view alongside profile view, the link is broken.*
8. **Open the thread** → `/m/<label>` → four-phase Magnum Opus widget. Fund → accept → deliver → release. Each phase narrates into the XMTP thread.
9. **Visit `/wallet`** → real ETH balance, totals in Kč, every receipt linked.

---

## Bounty alignment

| Target | Mechanism |
|---|---|
| **Network Economy** (track) | Stealth payments + non-custodial escrow + ENS identity, end-to-end |
| **Best UX Flow** | Privy embedded wallet · ENS-as-handles · 7-beat cinematic onboarding · auto-stealth at claim · pre-flight gas check · ERC-7730 V2 · CS/EN persisted in localStorage · Kč prominence |
| **Best Privacy by Design** | EIP-5564 stealth payments by default · XMTP V3/MLS messaging · honest privacy-blind-spot disclaimer (see Privacy posture above) · Kohaku-aligned aggregation roadmap |
| **ENS Bounty 2 — Most Creative Use** | **Own CCIP-Read resolver** (no third-party SaaS in the resolution path) · `stealth-meta-address` ENS text record · `offers` text record as a feed primitive · `sealed-by` chain enabling on-chain finder's-mark referrals · subnames-as-data-shelves |
| **ENS Bounty 1 — AI Agents** (stretch) | `agent.<label>.pragueconnect.eth` delegation pattern + ENSIP-25 + ERC-8004 — UI mock present, full flow scoped post-hackathon |

---

## Stack (locked 2026-05-09)

- **ENS subnames:** PragueConnect's own CCIP-Read resolver on Sepolia. Gateway in `web/app/api/ccip/[sender]/[data]/route.ts`. Store in `web/lib/resolver-store.ts`.
- **Embedded wallet:** Privy v3 (email / SMS / Google → embedded EOA)
- **L2 (payment rails):** Base Sepolia
- **Stealth crypto:** `@fluidkey/stealth-account-kit`
- **Stealth rails:** `@scopelift/stealth-address-sdk` + canonical announcer/registry
- **Messaging:** XMTP V3 / MLS (dev network)
- **Anti-blind-signing:** ERC-7730 V2 descriptors (`contracts/erc-7730/`)
- **Frontend:** Next.js 16 (Turbopack), Cormorant Garamond + JetBrains Mono, parchment palette
- **Hosting:** Vercel (auto-deploy on push to `main`, root `web/`)

---

## Forking PragueConnect for another city

The whole stack is city-shaped: copy the repo, swap five things, and you've got `BarcelonaConnect`, `LisbonConnect`, `BogotáConnect`. Each city is its own ENS namespace, its own resolver, its own contract addresses, its own seeded artisans. **Reputation belongs to the human, not the city** — but the *neighborhood feel* is the city's.

### 1. Pick the parent ENS name

Register `<city>connect.eth` (or any name you own) on Sepolia for testing, mainnet for production. Example: `barcelonaconnect.eth`.

### 2. Deploy the resolver

```bash
cd contracts
DEPLOYER_KEY=… forge script script/DeployResolver.s.sol \
  --rpc-url https://sepolia.infura.io/v3/<key> --broadcast
```

Edit `script/DeployResolver.s.sol` first — set:

- `url` to your gateway, e.g. `https://barcelonaconnect.vercel.app/api/ccip/{sender}/{data}.json`
- `signers` to your CCIP-Read signer EOA (this is the address that signs gateway responses; keep its private key in `PC_RESOLVER_SIGNER_KEY`)

Then in the ENS app on Sepolia, set the resolver of `<city>connect.eth` to the deployed address.

### 3. Deploy the payment rails

```bash
DEPLOYER_KEY=… forge script script/DeployTip.s.sol --rpc-url https://sepolia.base.org --broadcast
DEPLOYER_KEY=… forge script script/Deploy.s.sol     --rpc-url https://sepolia.base.org --broadcast
```

ScopeLift announcer/registry addresses are canonical across L2s — no change needed.

### 4. Reskin the parchment

Swap these files for your city's accent:

- `web/public/logo.png` — your guild logo (transparent background, ~64–92px tall in the home hero)
- `web/data/subnames.json` — your seeded artisans (10–15 plausible local handles with bios, locations, skills, sigils)
- `web/lib/i18n.tsx` — replace the `cs` dictionary with your local language; the `en` dictionary stays. Update copy that mentions "Prague" / "Praha" / "Karlín" / "Žižkov".
- `web/lib/ornaments.tsx` — the city silhouette. Currently a Prague skyline; swap the SVG.
- The Rudolfine Workshop visual language (parchment, wax seals, fleur-de-lis, CROPS hallmark) is generic enough to suit any guild city — but if your city has its own iconographic tradition (e.g. Barcelona's modernisme tilework), you may want to swap palette tokens in `web/app/globals.css` (the `--parchment`, `--ink`, `--vermilion`, `--gilded`, `--verdigris` family).
- Sigils on offers (currency / handshake / lantern / scroll / etc.) live in `ornaments.tsx`; pick or extend.

### 5. Wire the env

Copy `web/.env.example` to `web/.env.local`:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=             # your Privy app
PRIVY_APP_SECRET=                     # server-side Privy
NEXT_PUBLIC_PIMLICO_API_KEY=          # optional, for sponsored tx
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_DEFAULT_CHAIN_ID=84532
NEXT_PUBLIC_NAMESTONE_DOMAIN=barcelonaconnect.eth   # despite the var name, this is now your CCIP-Read parent
PC_RESOLVER_SIGNER_KEY=0x…            # signer key for CCIP-Read gateway
NEXT_PUBLIC_PRAGUECONNECT_ESCROW_ADDRESS=0x…        # from step 3
NEXT_PUBLIC_PRAGUECONNECT_TIP_ADDRESS=0x…           # from step 3
```

(The `NAMESTONE_DOMAIN` env var name is historical — it's now just "the parent ENS name." A future cleanup pass would rename it `PARENT_ENS_NAME`.)

### 6. Deploy

```bash
cd web
bun install
bun run build                         # confirm clean
vercel --prod                         # or push to GitHub → auto-deploy
```

Add an alias if you want a vanity domain: `vercel alias set <deployment> barcelonaconnect.com`.

### 7. Optional: rename the contracts

`PragueConnectTip` and `PragueConnectEscrow` are just labels in Solidity. If you want `BarcelonaConnectTip` for the Etherscan vanity, rename the file + contract + the import in `web/lib/escrow.ts` and `web/lib/tip-form.tsx`. The ABI is identical.

### 8. Optional: aggregate ENS namespaces

If you run more than one city, the natural pattern is a hub: `connect.eth` resolves a feed of feeds (`barcelonaconnect.eth`, `lisbonconnect.eth`, `pragueconnect.eth`), and each city is sovereign over its own subnames. The CCIP gateway can serve multiple parent domains — the resolver contract is single-domain by default, but the gateway code in `web/app/api/ccip/...` keys by namehash and trivially extends to many parents.

---

## Operational notes

- The CCIP-Read resolver and gateway code are entirely in this repo. **No third-party hosted resolver** in the resolution path. The gateway signs responses with `PC_RESOLVER_SIGNER_KEY`; the resolver verifies on-chain. (CROPS · Censorship-Resistant leg, made literal.) Verified end-to-end: external wallets resolve `<name>.pragueconnect.eth` via Sepolia ENS Registry → our resolver → our gateway → signed response.
- The store (`web/lib/resolver-store.ts`) reads from baseline JSON (bundled at build) ∪ **Vercel KV** (production) ∪ in-memory overlay (dev fallback). KV is auto-detected via `KV_REST_API_URL` + `KV_REST_API_TOKEN`. **One-click provisioning in Vercel dashboard → Storage → Create KV** — the env vars get auto-injected.
- Contracts deployed by the project's deployer EOA. Demo subnames are also owned by that EOA. Real users get fresh Privy embedded wallets.
- **Faucet drip** (`POST /api/faucet-drip`) sends ~0.005 ETH on Base Sepolia to any Privy-authenticated user whose balance is below 0.001 ETH. Rate-limited to one drip per address per 24h via KV. Requires `PC_FAUCET_KEY` env var (private key of a project-funded EOA on Base Sepolia). The tip page surfaces a "TOP ME UP" button when balance is low — sits next to the public Alchemy faucet link as a fallback.
- Fork-and-rename in good taste: the `pragueconnect.eth` parent is owned by the project deployer for the hackathon; if you want to fork the *brand* (rather than the *city*), please pick a different parent ENS name.

## Public-testing checklist

Before handing the URL to testers:

1. **Provision Vercel KV** (Dashboard → Storage → Create KV). Vercel auto-injects `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN` into all environments. Without this, claims live only in lambda memory and are lost on cold start.
2. **Fund the faucet wallet.** Generate an EOA, get its private key into `PC_FAUCET_KEY`, fund it with ≥ 0.5 Base Sepolia ETH from <https://www.alchemy.com/faucets/base-sepolia>. Cooldown is 24h per address so 100 ETH = 20,000 testers.
3. **Verify external CCIP-Read** with `bun web/scripts/ccip-check.ts` — should print the addr for `ales.pragueconnect.eth` against the `pragueconnect.eth` resolver on Sepolia.
4. **Smoke-test claim → profile → tip** on a fresh device.

Once those four pass, the app is ready for asynchronous public testing. Without #1 and #2, treat it as "demo-only".

## License

MIT — see `LICENSE`.
