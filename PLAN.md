# Praga — ETHPrague Hackathon Plan

A peer-to-peer human-skill marketplace for Prague. Micro-payments, escrow, private messaging, ENS-native identity. Reputation belongs to the human, not the platform. Agents are an optional delegate, not the protagonist.

---

## Part 1 — Claude Design Prompt (mockup brief)

> **Active brief lives in [`CLAUDE_DESIGN_PROMPT.md`](./CLAUDE_DESIGN_PROMPT.md)** — single locked direction (the *Rudolfine Workshop*: Prague-royal, alchemical, fleur-de-lis as recurring stamp), mobile + web rendered together, escrow states mapped to the four phases of the Magnum Opus.
>
> **Design canvas delivered (2026-05-08):** Claude Design produced 25+ artboards across all 12 screens. Bundle staged at [`./design/`](./design/) — open `index.html` via `bash design/serve.sh` then visit `http://127.0.0.1:8765/`. JSX prototypes use React + Babel-standalone from CDN, no build step. To be ported to a production stack (Next.js + Tailwind/vanilla CSS) when build phase begins.
>
> The 4-variation exploration brief below is **superseded** but kept for historical reference.

Use this verbatim in Claude Design to generate four distinct visual directions for the product.

### Product
Design a mobile-first web app called **Praga** (working name) — a peer-to-peer marketplace where humans in Prague offer micro-skills, favors, and gifts to each other for small crypto payments. Think TaskRabbit × Craigslist gigs × ENS-native identity, but the unit of trust is a *person*, not a platform.

The vibe: **a digital town square for a real city**. Locally rooted, human-warm, crypto-quiet. Crypto/ENS rails are present but never the foreground noun — the foreground noun is the *person* and what they can *do for you today*.

### Core user flow to mock up (mandatory screens)
Design these 7 screens for each variation:

1. **Landing / Onboarding** — "Claim your name in Prague." User connects wallet, gets/links an ENS subname (e.g., `kilian.praga.eth`), which becomes both their profile URL and their personal site.
2. **Discovery feed** — browse offers and requests near you. Filterable by category (handyman, language exchange, ride, cooking, tutoring, errands, gifts/freebies). Each card shows person, skill, reputation badge, price in EUR + crypto equivalent.
3. **Profile / personal site** — the page rendered at `username.praga.eth.limo`. Bio, skills offered, reputation, completed tasks, gifts given. This is *their* site — they own it. Show a "you are viewing your own page" state and a "public visitor" state.
4. **Offer/Request composer** — post a skill offer or a task request. Price, time, location radius, category. Privacy toggle (public vs. invite-only).
5. **Private message thread + escrow panel** — the core commerce moment. Two humans negotiating, with a side panel showing escrow state: *Funded → In Progress → Delivered → Released*. Show one in each state.
6. **Reputation / completed task receipt** — what a finished gig looks like. Mutual rating, on-chain attestation badge, "verified by Praga" stamp. Reputation must feel *earned and personal*, not gamified-points-y.
7. **Edit-your-site dashboard** — the secret authenticated view where the ENS-name owner manages their personal page, subname records, and which data is public vs. private. Make the "subnames as data shelves" concept visually legible (e.g., `bio.kilian.praga.eth`, `skills.kilian.praga.eth`, `inbox.kilian.praga.eth`).

### Generate 4 distinct visual variations

Each variation should be a fully different design language — not color swaps. Treat them as four real product directions a team would debate.

**Variation A — "Prague Postcard"**
Warm, analog, human. Inspired by hand-painted Czech shopfront signage and the ochre/terracotta palette of Old Town. Serif display type, soft paper textures, hand-drawn category icons. Crypto elements rendered as little stamps/seals rather than glowing buttons. Feels like a neighborhood notice board.

**Variation B — "Quiet Protocol"**
Minimal, Swiss-grid, monochrome with one accent. Inspired by Linear / Cal.com / Family wallet. Tiny type, generous whitespace, ENS names treated as the design's hero typographic element. The interface gets out of the way. For users who want commerce to feel like email.

**Variation C — "Civic Punk"**
Bold, zine-like, slightly anarchic. Inspired by squat-collective posters, samizdat, and early web. High-contrast, riso-print colors, monospace, sticker-like reputation badges. Leans into "we are bypassing the platforms" energy. Loud about ENS and self-sovereignty without being crypto-bro.

**Variation D — "Soft Agent"**
Friendly, rounded, slightly futuristic. Inspired by Arc Browser / Granola / iOS 18. Subtle gradients, soft shadows, gentle motion implied. Surfaces the optional AI-agent layer (an agent can browse the marketplace on your behalf, draft replies, schedule). Make agent-assisted actions visually distinct from human-authored ones.

### Things every variation must communicate
- **Local + human first.** Prague-specific cues (street names, tram lines, neighborhood names like Žižkov / Vinohrady / Karlín). Currency shown as Kč with crypto secondary.
- **Reputation is the person's, not the platform's.** It travels with their ENS name. Show this on the profile.
- **Privacy by design.** Messages are private. Pricing is visible but identity reveal can be staged. Show a privacy indicator on the message thread.
- **Escrow visible but calm.** Don't make it look like DeFi. Make it look like Stripe.
- **Subnames as a feature, not a footnote.** The personal site at `name.praga.eth.limo` and the subname-shelves model should be obviously different from "yet another username."

### Things to avoid
- No "web3" jargon in copy. No "decentralized," "trustless," "permissionless" — show, don't say.
- No glowing purple gradients or generic crypto aesthetic.
- No gamification (no XP bars, no levels, no leaderboards). Reputation is artisanal, not arcade.
- No agent-first framing. Agents are an *option*, humans are the protagonists.

### Deliverable
For each of the 4 variations, render all 7 screens at mobile width (390px) plus the profile page additionally at desktop width (1200px) so we can see how the personal-site-under-ENS feels as a public web destination. Label each screen clearly. Include a one-paragraph rationale per variation explaining who it's for.

---

## Part 2 — Bounty Lens Analysis (confirmed 2026-05-08, complete set)

Bounty list is closed. Total competitive surface:
- **3 tracks**: Ethereum Core, Network Economy, Future Society. Judges pick 1 winner per track.
- **3 ad-hoc bounties** on the Awards page: Best Hardware Usage, Best UX Flow, Best Privacy by Design.
- **2 sponsored ENS sub-bounties** (Best ENS Integration for AI Agents · Most Creative Use of ENS), $2k each, split $1,250 / $750.

**Track target: Network Economy.** Track copy ("next-generation privacy, identity, and on-chain economic solutions putting user control first … real economic and privacy challenges in a decentralized way") maps line-for-line onto Praga. Their own example — *zk identity wallet with selective verifiable claim sharing* — is the same shape as Praga's ZK reputation proofs. Don't split focus into Future Society (their example is a zk-IoT environmental oracle, not us).

### 1. ENS Bounty 2 — *Most Creative Use of ENS*  ($1,250 / $750)

**Confirmed winning examples (their words):**
- **Stealth addresses (EIP-5564), auto-rotating addresses per resolution, dual-key ECDH** ← Praga's payments layer hits this directly
- Verifiable credentials / zk proofs in text records
- Subnames as access tokens or membership credentials
- ENSIP-9 / ENSIP-11 multichain payment routing
- Decentralized websites via contenthash
- Social graphs / reputation built on text records
- Offchain subname trees via CCIP-Read

**Native fit:** very strong. Praga can plausibly hit *four* of these bullets in one feature surface:
1. Stealth meta-address text record on every user's subname
2. ENSIP-9/11 multichain coin types so payments route to the correct L2 stealth address
3. Contenthash personal site at `username.praga.eth.limo`
4. Reputation commitments / attestations stored as text records

**Judging criteria they listed:** creativity · product fit · technical depth (resolvers, records, CCIP-Read, wildcards) · completeness · clarity. *No hard-coded values.*

**Hero demo:** judge claims `judgename.praga.eth` → site goes live at `judgename.praga.eth.limo` → judge "tips" the booth via the stealth tip-jar → block explorer side-by-side shows the recipient address is unlinkable.

### 2. ENS Bounty 1 — *Best ENS Integration for AI Agents*  ($1,250 / $750)

**Confirmed winning examples:**
- Subname registry for fleet of agents (e.g., `trader.myfleet.eth`)
- Storing agent capabilities / model / endpoint / reputation in text records
- Agent-to-agent discovery via ENS lookup + negotiation
- ENS + verifiable credentials so agents prove what they are
- **Delegation patterns where an agent acts on behalf of a named human principal** ← matches Praga's "optional delegate" framing exactly

**Native fit:** reachable as a stretch goal. PLAN previously called agents *optional*; this bounty makes the agent layer worth ~$2k.

**Concrete shape:**
- Each user's optional Praga agent gets `agent.kilian.praga.eth`
- Text records: `capabilities`, `model`, `endpoint`, `policy-hash`, `principal=kilian.praga.eth`
- Agent-to-agent: bob's agent resolves `kilian.praga.eth` → finds agent endpoint → negotiates a gig → both sign escrow
- Scoped permissions and revocability are the EthUX agent-rubric requirements; same work scores there too

**Mentor:** workemon.eth (TG: workemon) is the ENS-for-AI specialist on site all event. Day-1 conversation.

### 3. Network Economy track — *macro track, decides overall placement*

**Confirmed framing:** privacy + identity + on-chain economics + user control. Their example is a zk identity wallet with selective verifiable claim sharing.

**Native fit:** essentially what Praga is. Real money moves (escrow micro-payments), identity *is* the product (reputation lives on the human), peer-to-peer with no central rent-seeker. Stealth payments + ZK reputation + non-custodial escrow = direct mapping.

**Sharpen to win:**
- Stage line: *"TaskRabbit can see every gig and every dollar; Praga literally cannot."*
- Frame the platform-resistance angle: gig-economy incumbents take 20-30%, we take 0-1%, worker's reputation survives the platform dying
- Show real Kč moving on stage, not testnet ETH

**Hero demo:** Kč 200 task escrowed → ZK rep proof shown before acceptance → completed → released to a stealth address → block explorer can't link recipient to `kilian.praga.eth`.

### 4. Best UX Flow bounty — *load-bearing, prescriptive rubric*

**Confirmed rubric (their bullets, mapped to Praga delivery):**

| Requirement | Where Praga delivers it |
|---|---|
| Anti-blind-signing summaries | Escrow funding screen: *"You will lock 200 Kč until Aleš confirms the couch is moved"* — never calldata |
| Gradual disclosure / jargon shielding | Privy embedded wallet, no seed phrase on signup; "back up account" surfaced only after first earnings |
| Paymasters / gasless onboarding | Pimlico or Alchemy Gas Manager sponsors subname registration + first escrow |
| ERC-20 fee payment | Optional — platform fees payable in EURe / USDC |
| Cross-chain abstraction | ENSIP-11 stealth resolver returns correct chain; user never switches networks |
| ENS / handles instead of hex | *No 0x address ever shown to a user.* Reverse resolution everywhere |
| Max Send with gas accounting | "Send all earnings" subtracts gas correctly |
| Undo / Cancel pending tx | N-second cancel window before broadcast |
| Localized errors | Czech + English; *"Tato adresa nemá dost prostředků"* not `EVM revert: 0x…` |
| Non-Latin / fiat-first | **Kč** as primary unit; Czech as first-class language — easy point on a Prague-local product |

**Resource they cite:** ethux.design — checklists + UX skill files. Self-audit before demo day.

**Hero demo:** hand a phone to a non-crypto judge cold; they claim a name, post "need help moving a couch Saturday — 300 Kč", get a reply. Under 90 seconds, "wallet" never appears.

### 5. Best Privacy by Design bounty

**Confirmed framing:** privacy by default, not add-on. Inspired by **Web3Privacy Now**. Resource: **Privacy Builder Stack** at `build.web3privacy.info`. Looks beyond simple encryption — minimize data collection, prevent metadata leakage, user-controlled footprint.

**Native fit:** messaging layer + stealth payments + ZK reputation = privacy-native by construction.

**Stack to cite in submission:**
- Stealth payments: FluidKey Stealth Account Kit or Umbra primitives (EIP-5564 reference impl)
- Messaging: XMTP or Waku — E2E encrypted, no metadata
- ZK reputation: Semaphore — lightest viable path
- No-tracking infra: self-hosted stealth scanner; no third-party analytics
- Selective transparency: viewing-key export for tax/audit (compliance off-ramp narrative)

**Hero demo:** judge A messages judge B. Show platform DB — ciphertext. Then judge B presents a ZK proof of reputation to A without revealing history. Side-by-side: TaskRabbit's surveillance dashboard vs. Praga's empty one.

### 6. Future Society track — *stretch, only if framed right*

**Confirmed framing:** sustainable, ethical, inclusive social impact. Privacy-respecting community resource management and governance. Their example is a zk-IoT environmental data oracle triggering community funding — quite specific and not us.

**Possible angle:** "Platform-resistant fair P2P economy = worker liberation, reputation sovereignty when platforms die." Real but distant from the example. **Skip unless we have spare cycles** — don't sacrifice a stronger track for it.

### 7. Skipped

- **Ethereum Core** — infra/L2 inspector territory. Not us.
- **Best Hardware Usage** — irrelevant.

---

## Part 3 — Conflicts & Resolutions

| Tension | Resolution |
|---|---|
| ZK proofs (Privacy/Network Econ) vs. instant onboarding (UX) | Progressive disclosure: ZK is opt-in for high-trust tasks only. Default path skips it. |
| Stealth-address scanning vs. instant UX | Embedded wallet runs scanner silently; user just sees "200 Kč received." On L2, sweep gas is negligible. |
| Multiple subname data shelves (ENS) vs. onboarding cost | v1: single content-hash JSON manifest. v2: split into shelves. Or batch issuance via Durin/NameStone gas-free. |
| Self-custody (Network Econ) vs. embedded wallet (UX) | Privy/Para with **exportable** keys — looks like email login, is actually self-sovereign. Mention this on stage. |
| Public discovery vs. private commerce (Privacy) | Listings public, identity reveal staged, negotiation thread E2E encrypted, settlement to stealth addresses. Privacy at contract-formation + settlement, not marketplace stage. |
| Agent layer adds scope vs. "humans first" framing | Agent is opt-in `agent.kilian.praga.eth` subname acting under explicit delegation with scoped permissions — leans into both ENS Bounty 1 ($2k) and EthUX agent rubric. |
| Stealth privacy vs. tax / compliance | Viewing-key export to a read-only auditor (self, accountant). Privacy-by-default with off-ramp = mature framing. |

---

## Part 4 — Bounty Stack Rank (confirmed $$ where known)

| Tier | Target | Prize | Confidence |
|---|---|---|---|
| Load-bearing | **ENS Bounty 2 — Most Creative Use** | $1,250 / $750 | Very high (stealth + auto-rotate + multichain coins + contenthash all listed as winning examples) |
| Load-bearing | **Network Economy track** | track | High (Praga thesis matches sponsor framing exactly) |
| Load-bearing | **Best UX Flow** | bounty | High if rubric is hit precisely (Kč-first + ENS-handles + paymaster + undo + Czech localisation) |
| Load-bearing | **Best Privacy by Design** | bounty | High (stealth + XMTP + Semaphore + Privacy Builder Stack alignment) |
| Reachable | **ENS Bounty 1 — AI Agents** | $1,250 / $750 | Medium-high (requires shipping the optional agent layer with `agent.x.praga.eth`) |
| Stretch | Future Society track | track | Low — example is zk-IoT, not us |
| Skip | Ethereum Core / Best Hardware | — | Out of scope |

---

## Part 5 — Build Order (locked 2026-05-08 after stack research)

**Day 1** — identity loop. NameStone hosted offchain resolver mints `username.praga.eth` on first login. Privy embedded wallet wraps it with email/SMS auth. Contenthash → IPNS pointer → static personal site bundle published to IPFS, served at `username.praga.eth.limo`. Pimlico paymaster URL set in Privy dashboard sponsors all txs. Hero: judge claims a name, sees their page live in 30s.

**Day 2** — stealth payments. `@fluidkey/stealth-account-kit` driven by Privy signer for meta-address derivation. `@scopelift/stealth-address-sdk` against the canonical `0x5564…` announcer + `0x6538…` registry already deployed on Base. Dual-publish meta-address to ENS text record `stealth-meta-address` AND `ERC6538Registry.registerKeys()`. Background scanner runs as a Web Worker in the Privy session against the ScopeLift subgraph. Personal site gets the "Send a private gift" wax-stamp button.

**Day 3** — commerce loop. Escrow contract on Base: takes a stealth meta-address pointer, holds funds, emits a `commitment = Poseidon(stealthRecipient ‖ taskId ‖ rating)` on release. The four Magnum Opus states map to contract states. Composer + thread UI on top.

**Day 4** — privacy + messaging. XMTP V3 SDK for E2E threads, ENS-keyed inbox. **One** Semaphore v4 N=1 group-membership proof ("≥1 completion at ≥4★") for the ZK rep demo. Tax off-ramp: viewing-key export to a JSON download (Railgun pattern, scratch).

**Day 5** — agent layer (ENS Bounty 1) + UX rubric polish. `agent.username.praga.eth` subname + ENSIP-25 text record + ERC-8004 Identity Registry on Sepolia + custom `delegation-policy` text record. ERC-7730 V2 descriptors for Praga's contracts (anti-blind-signing). Delayed-broadcast Undo (~5-10s client-side buffer). i18next shell with `cs.json` + `en.json`.

**Day 6** — polish. The 90-second demo timing. Magnum Opus animations. Walk through ethux.design checklists as self-audit.

**Day 7** — demo. Hand a phone cold to a non-crypto judge. Stage the block-explorer side-by-side moment for the stealth payment ("TaskRabbit can see every dollar; Praga literally cannot").

**Stretch (only if Days 2-3 finish clean):** N≥3 Semaphore aggregator circuit (~+1.5 days). Bespoke stealth-rep custom circuit (~+3 days, basically a separate research project — explicitly out of scope for week-of).

**If Day 1-2 risk materialises:** drop in this order — agent layer (loses ENS B1, $2k) → XMTP (loses some Privacy narrative) → ZK rep (loses some Network Economy depth). Keep ENS subname + stealth payment + escrow + personal site = the irreducible core that clears ENS B2 + Privacy + Network Economy.

---

## Open Questions / Next Steps

- [x] ~~Pull actual bounty text~~ — done 2026-05-08. Awards page (3 tracks + 3 ad-hoc bounties) and Sponsored Bounties (2 ENS sub-prizes) are the **complete** set.
- [x] **Track target locked: Network Economy.** Future Society de-prioritised; Ethereum Core out of scope.
- [x] **ENS subname stack: NameStone** (Durin = 1.5d overhead for no extra creativity; ENSv2 scrapped Feb 2026, not shippable).
- [x] **Embedded wallet: Privy** (Dynamic acquired by Fireblocks Oct 2025, no longer self-custodial; Para viable but Privy+Pimlico is the most documented path).
- [x] **Paymaster: Pimlico** (free on testnets; ERC-20 paymaster contract = free rubric line).
- [x] **L2: Base primary + Linea secondary.** No L2 is an ETHPrague 2026 sponsor — purely technical pick.
- [x] **Stealth lib: FluidKey Stealth Account Kit (crypto) + ScopeLift stealth-address-sdk (rails).** Canonical contracts already deployed; zero deploy work.
- [x] **Agent delegation: ENSIP-25 (March 2026) + ERC-8004 Identity Registry** + custom `delegation-policy` text record for principal-binding semantics. Reference impl: github.com/estmcmxci/synthesis.
- [x] **Anti-blind-signing: ERC-7730 V2** descriptors (Ledger maintains the open registry; we ship our own JSON for Praga contracts).
- [x] **ZK rep scope: Semaphore v4, N=1 proof only** for week-of. N≥3 aggregator and stealth-rep custom circuit are explicit stretch / roadmap.
- [x] **Privacy stack to namecheck:** Web3Privacy Now / Privacy Builder Stack at build.web3privacy.info — cite XMTP-MLS, Semaphore, ERC-5564 as our chosen Builder Stack subset; place Praga in the Marketplace category (currently white space — no W3PN-listed project covers stealth-payments-as-marketplace-rail).
- [x] **Visual direction:** Rudolfine Workshop (locked, design canvas delivered, see [`design/`](./design/)).
- [ ] **Day-1 booth conversations:** workemon.eth (TG: workemon) on ENS+AI agents (ENSIP-25 reference implementation questions); NameStone team for parent `praga.eth` provisioning.
- [x] **Scaffold complete (2026-05-08):** see [`README.md`](./README.md). Next.js 16 app at `web/` with **all 12 screens ported** as 13 routes, Privy/wagmi/Pimlico providers wired (demo-mode fallback), NameStone client, FluidKey + ScopeLift stealth wrappers. Foundry contracts at `contracts/` — `PragaEscrow.sol` with Magnum Opus four-phase state machine, stealth payout to ERC-5564 announcer, reputation commitment hash, **7/7 tests passing**. ERC-7730 V2 descriptor at `contracts/erc7730/PragaEscrow.json`. Build clean, dev server boots, all routes return 200.
- [x] **On-chain milestones (2026-05-08):**
  - **`praga.eth` registered on Sepolia ENS** — owner `0x2908…9D10` (open-agents deployer key), resolver `0x8FADE…B7dD` (Sepolia PublicResolver), 1-yr rent. Register tx: `0x38ee44a3…b93861fc`. Sepolia balance after: 0.0966 ETH.
  - **`PragaEscrow` deployed on Base Sepolia at `0xcec992ABAfA04cD2F0c89BFAa93bdae3bF9da67F`** — wired to canonical ScopeLift announcer `0x55649E…45564`. Base Sepolia balance after: 0.0099 ETH.
  - `web/.env.local` populated with deployed addresses + chain config.
  - **NameStone authorized for `praga.eth` (Sepolia).** Resolver tx `0x8645fd08…ccea6e` set the parent's resolver to NameStone's Sepolia resolver `0xA87361…715125`. SIWE-signed enable-domain handshake completed against `https://namestone.com/api/public_v1_sepolia` (note: NameStone's testnet base URL is `_sepolia` suffix on `public_v1`, not a query param — undocumented in the public API page, found via SDK source `namestonehq/namestone-sdk/src/client.ts`).
  - **10 demo subnames issued** under `praga.eth` (kilian, lucia, bohuslav, milena, tomas, pavla, jirka, radek, ales, jan), each with `name`/`location` text records; kilian carries full bio + avatar URL + description + twitter handle for the hero demo.
  - **Vercel production live** at https://praga-azure.vercel.app with Privy + Pimlico + NameStone all wired.
- [ ] **Pre-hackathon (this week):** register `praga.eth` on L1, set NameStone resolver, deploy `PragaEscrow` to Base Sepolia (`forge script script/Deploy.s.sol`), deploy ERC-8004 registry on Sepolia, create Privy app + Pimlico project + Base RPC keys → fill `.env.local`.
- [ ] **Day 1-2 wiring (week-of):** real `claim name` flow (Privy login → derive stealth keys → NameStone `set-name` with `stealth-meta-address` text record), real escrow tx flow (fund/accept/deliver/release), background stealth scanner Web Worker.
- [ ] **Day 3-5:** XMTP V3 thread integration, Semaphore v4 N=1 ZK rep proof, ENSIP-25 + ERC-8004 agent layer wiring.
