# Praga — by the hand of

**A peer-to-peer marketplace for human favors in Prague. Reputation belongs to the human, not the platform.**

Built for ETHPrague 2026. Live at **<https://praga-azure.vercel.app>**.

## What it is

Each user claims `<name>.praga.eth`. That single inscription is their account, their public personal site (`<name>.praga.eth.limo`), their sealed letterbox (XMTP V3), their portable reputation, and their stealth gift route. Everything that's a "platform feature" elsewhere is an ENS text record here. There is no platform database — NameStone hosts the resolver, the rest is on Base Sepolia or in the user's browser.

## The five loops that close

1. **Claim → Identity.** Two back-to-back signatures: register the subname (NameStone, 1st year on us), then derive an ERC-5564 stealth meta-address from a deterministic message and write it back as a text record. New users have privacy by default, not as a setup step.
2. **Edit → NameStone.** `/me/edit` writes bio / location / avatar / skills / stealth-meta-address text records. Public profile (`/<ens>`) reflects them on next request. Auth-gated by Privy access token.
3. **Compose → Feed.** `/compose` writes an `offers` JSON text record on the user's subname. `/feed` server-fetches every subname under `praga.eth`, flattens the offers, and ranks by `posted_at`. Filterable by sigil chips. No platform DB.
4. **Tip → Stealth payment.** `/tip/<ens>` reads the recipient's `stealth-meta-address`, derives a fresh stealth address client-side, and calls `PragaTip.tip(stealth, ephem, viewTag, memo)` on Base Sepolia. The contract atomically transfers ETH and announces via the canonical ScopeLift ERC-5564 announcer (`0x5564…`). Block-explorer view ≠ profile view; the link is broken at the speed of one transaction.
5. **Thread → Magnum Opus escrow.** `/m/<label>` is an XMTP V3 / MLS sealed thread keyed by ENS. Above the message stream sits the four-phase escrow widget: **Nigredo** (Funded) → **Albedo** (In progress, worker commits a stealth recipient) → **Citrinitas** (Delivered) → **Rubedo** (Released, payout to stealth address + announcer fires). Each phase transition posts a system message into the thread, so the alchemical ceremony narrates itself.

The receipts on every profile's wall come from on-chain `Tipped`/`Released` events — no fixtures.

## Run it locally

```bash
cd web
cp .env.example .env.local         # fill in Privy / Pimlico / NameStone keys
bun install
bun run dev                        # → http://localhost:3000
```

Without env keys the design canvas renders without web3 wiring — useful for visual review. With keys, the full flow works against Base Sepolia + NameStone Sepolia.

```bash
cd contracts
forge test                         # 7/7 PragaEscrow tests passing
DEPLOYER_KEY=… forge script script/DeployTip.s.sol --rpc-url https://sepolia.base.org --broadcast
DEPLOYER_KEY=… forge script script/Deploy.s.sol    --rpc-url https://sepolia.base.org --broadcast
```

Original Rudolfine Workshop design canvas (HTML/JSX/CSS reference):

```bash
bash design/serve.sh               # → http://127.0.0.1:8765/
```

## Repo layout

```
ethprague/
├── README.md                       This file
├── PLAN.md                         Bounty analysis, build order, risk plan
├── PRDs.md                         Five focused PRDs — one per loop, in build order
├── CLAUDE_DESIGN_PROMPT.md         Single-direction design brief
├── design/                         Original design canvas (HTML/JSX/CSS)
├── web/                            Next.js 16 app — production target
│   ├── app/                        Routes — see table below
│   └── lib/
│       ├── ornaments.tsx           FleurDeLis · WaxSeal · Cartouche · sigils · marginalia
│       ├── profile-shared.tsx      PortraitRoundel · ReceiptStrip · ProfileHeader
│       ├── i18n.tsx                EN/CS dictionary + LangToggle
│       ├── navbar.tsx              Shared top nav (auth-aware, lang-toggle, mobile burger)
│       ├── env.ts · providers.tsx · wagmi.ts
│       ├── namestone.ts            Subname issuance + text records (Sepolia path)
│       ├── privy-server.ts         Server-side Privy access-token verification
│       ├── stealth.ts              FluidKey + ScopeLift wrapper
│       ├── escrow.ts               PragaEscrow ABI + taskId derivation + read helpers
│       ├── tip-events.ts           Server-side getLogs for Tipped events
│       ├── xmtp.ts                 XMTP V3 client builder (cached)
│       ├── offers.ts               Offer encoding + loadFeed()
│       ├── onboarding-form.tsx     Claim flow with auto-stealth derivation
│       ├── compose-form.tsx        Real offer composer
│       ├── edit-form.tsx           Real /me/edit form
│       ├── feed-view.tsx           Filterable real-data feed
│       ├── tip-form.tsx            Stealth payment with pre-flight gas check
│       ├── thread-view.tsx         XMTP thread + EscrowPanel mount
│       ├── escrow-panel.tsx        Magnum Opus four-phase widget
│       ├── wallet-view.tsx         Real balance + Tipped totals + receipt list
│       └── owner-panel.tsx         Owner-only "next steps" CTA
└── contracts/                      Foundry
    ├── src/
    │   ├── PragaEscrow.sol         Magnum Opus four-phase escrow with stealth payout
    │   └── PragaTip.sol            One-shot stealth gift (single tx: transfer + announce)
    ├── test/                       7/7 passing
    ├── script/Deploy.s.sol · DeployTip.s.sol
    └── erc-7730/                   Clear-signing descriptors for both contracts
```

## Routes

| Route | What it is | Data source |
|---|---|---|
| `/` | Onboarding — "Claim your name in Prague" | NameStone availability check on every keystroke |
| `/feed` | The town square | `listSubnames(praga.eth)` flattened |
| `/[ensName]` | Public profile / `*.eth.limo` | NameStone record + on-chain receipts |
| `/compose` | Post offer / request | `setSubname` text records |
| `/me/edit` | Edit your seal | `setSubname` (auth via Privy) |
| `/m/[label]` | Sealed XMTP thread + Magnum Opus escrow | XMTP V3 + `PragaEscrow.tasks()` |
| `/tip/[ens]` | One-shot sealed gift | `PragaTip.tip()` + ScopeLift announcer |
| `/r/[txHash]` | Receipt — Patent of Completion | `getTransactionReceipt` + `Tipped` event |
| `/wallet` | Leather-bound ledger | Base Sepolia balance + `Tipped` event totals |
| `/agent` | Agent delegation (UI mock) | — |
| `/dev/spec`, `/dev/states` | Design vignettes | — |

## Deployed addresses (Base Sepolia, 84532)

| Contract | Address | Deploys |
|---|---|---|
| `PragaEscrow` | `0xcec992ABAfA04cD2F0c89BFAa93bdae3bF9da67F` | Magnum Opus four-phase |
| `PragaTip` | `0x44b09471Ece57443FE5b9d350eF3B4f90244AB1b` | One-shot stealth gift |
| ScopeLift announcer | `0x55649E01B5Df198D18D95b5cc5051630cfD45564` | Canonical, used by both |
| ScopeLift registry | `0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538` | Canonical |
| `praga.eth` | Sepolia ENS, NameStone resolver | All subnames |

ERC-7730 V2 descriptors for both contracts in `contracts/erc-7730/` — ready for upstream submission to the Ledger registry post-hackathon.

## Demo script (90 seconds)

1. **Open** `https://praga-azure.vercel.app` on a phone. Notice CS/EN toggle in the top right.
2. **Type a name** in the inscription field — `kilian` shows ✓ available... wait, taken. Type something fresh — live NameStone check.
3. **SEAL THE NAME** — Privy login, two signatures back-to-back: one to inscribe, one to derive your stealth gift route.
4. **Land on your profile** — empty bio, "WELCOME — YOUR NEXT STEPS" panel with three checkboxes.
5. **Open `/feed`** in another browser tab — see the seven seeded artisans of Prague.
6. **Click any card** → that user's public profile + their offer.
7. **Press SEND A PRIVATE GIFT** → `/tip/<ens>` → 0.001 ETH → faucet link if your testnet wallet is empty → press the seal → one transaction.
8. **Receipt page** — shows the **stealth recipient address** (different from the recipient's known address), Basescan link, ScopeLift announcer reference. *This is the punch line: explorer view alongside profile view, the link is broken.*
9. **Open the thread** for the same user → `/m/<label>` → the four-phase Magnum Opus widget. Type a message, fund the work, accept, deliver, release. Each phase narrates into the thread.
10. **Visit `/wallet`** → real ETH balance, totals in Kč, every receipt linked.

## Bounty alignment

| Target | Mechanism |
|---|---|
| **Network Economy** (track) | Stealth payments + non-custodial escrow + ENS identity, end-to-end |
| **Best UX Flow** | Privy embedded wallet · ENS-as-handles · live availability check · auto-stealth at claim · pre-flight gas balance check · ERC-7730 V2 descriptors · CS/EN locale toggle persisted in localStorage · Kč prominence |
| **Best Privacy by Design** | EIP-5564 stealth payments by default (set at claim, not later) · XMTP V3/MLS messaging · honest privacy-blind-spot disclaimers · Web3Privacy Builder Stack alignment |
| **ENS Bounty 2 — Most Creative Use** | `stealth-meta-address` ENS text record (no ENSIP for it yet) · `offers` text record as a feed primitive · subnames-as-data-shelves |
| **ENS Bounty 1 — AI Agents** (stretch) | `agent.<label>.praga.eth` delegation pattern + ENSIP-25 + ERC-8004 — UI mock present, full flow scoped for post-hackathon |

## Stack (locked 2026-05-08, all shipped)

- **ENS subnames:** NameStone hosted offchain resolver on `praga.eth`
- **Embedded wallet:** Privy v3 (email/SMS/Google → embedded EOA)
- **L2:** Base Sepolia for the demo
- **Stealth crypto:** `@fluidkey/stealth-account-kit`
- **Stealth rails:** `@scopelift/stealth-address-sdk` + canonical announcer/registry
- **Messaging:** XMTP V3 / MLS (dev network)
- **Anti-blind-signing:** ERC-7730 V2 descriptors (`contracts/erc-7730/`)

## Operational notes

- Both contracts deployed by the open-agents project's deployer EOA (`0x2908…9D10`). Demo subnames are also owned by that EOA. Real users get fresh Privy embedded wallets.
- NameStone Sepolia path is `https://namestone.com/api/public_v1_sepolia` — the SDK quirk is undocumented in their /docs page; the URL prefix is the only thing that works.
- Contracts on Base Sepolia. Need testnet ETH? <https://www.alchemy.com/faucets/base-sepolia> — the tip and escrow flows surface this link inline when balance is too low.
