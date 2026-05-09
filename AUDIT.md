# PragueConnect — pre-demo audit

> **Date:** 2026-05-09. **Method:** code paths read against runtime evidence. Every claim cites a file:line, an on-chain address, an HTTP response, or a published spec. Where an existing doc overclaims, the overclaim is named and a grounded replacement is given.

---

## TL;DR

**The marketplace is real.** Both contracts are deployed and pass 19/19 tests. Stealth-address tips are live on Base Sepolia, derived via two audited SDKs, announced through ScopeLift's canonical ERC-5564 contract, and unlinkable on Basescan. Five end-to-end loops ship: claim → edit → compose → feed → tip → receipt. The site is up at https://praga-azure.vercel.app and https://pragueconnect-azure.vercel.app.

**Three things are *not* what the docs say they are.** ① The "rename to pragueconnect.eth" is a label-only rename — production still resolves through `praga.eth` on NameStone; the new parent has not been registered on Sepolia ENS or authorised at NameStone. ② "Dual-publish to ERC-6538" is documented but no code calls the registry. ③ "ENSIP-25 agent delegation" is closer to *inspired-by-ENSIP-25*: the text-record key uses the bare `agent-registration` rather than the spec's `agent-registration[<registry>][<agentId>]` indexed form. Each is fixable in <90 minutes; together they are the difference between an honest pitch and an N/A finding.

**Two things are vapor and should be retired from the pitch.** Semaphore ZK reputation is zero code. The "no platform database" line is technically untrue if the Day-5 OffchainResolver SQLite ships. Both have been narrated; neither needs to be.

**Demo readiness on the privacy-first arc:** **HIGH** for the tip → Basescan reveal → Swarm hash beats, **MEDIUM** for the inscription/inheritance ceremony (works locally; production NameStone domain mismatch could surface), **LOW** for XMTP threading (wired but never message-tested).

---

## §1 — What actually works (verified, demonstrable on demo day)

| # | Capability | Evidence | Confidence |
|---|---|---|---|
| 1 | **PragueConnectEscrow** four-phase flow on Base Sepolia | `contracts/src/PragueConnectEscrow.sol`; 7/7 tests pass via `forge test`; deployed at `0xcec992ABAfA04cD2F0c89BFAa93bdae3bF9da67F`; canonical ERC-5564 announcer wired at line 27 (`0x55649E…45564`) | ★★★★★ |
| 2 | **PragueConnectTip** + `tipWithReferral` (95/5 atomic split) | `contracts/src/PragueConnectTip.sol:62-115`; 12/12 tests; deployed `0x42F035e3A94A232e3240fF91371d51e2ee7bdd91`; refusing-recipient + indivisible-amount cases both covered | ★★★★★ |
| 3 | **Stealth address derivation** (EIP-5564) | `web/lib/stealth.ts`: FluidKey `@fluidkey/stealth-account-kit` for spending+viewing keys (line 47), ScopeLift `@scopelift/stealth-address-sdk` for recipient-address generation (line 72). Both are Dedaub-audited. ERC-6538 meta-address format (`st:eth:0x<spend><view>`) constructed at line 58 | ★★★★★ |
| 4 | **NameStone subname registration + text-record writes** | `web/app/api/claim-name/route.ts`; `web/app/api/update-profile/route.ts:14-29` allowlists ten record keys including `description`, `avatar`, `location`, `skills`, `offers`, `stealth-meta-address`, `sealed-by`, `agent-registration`, `delegation-policy`. Live data on `praga.eth`: 11 subnames (verified via API call). | ★★★★★ |
| 5 | **Stealth tip flow end-to-end** | Sender presses on `/tip/<ens>` → `lib/stealth.ts:paymentAddress` → `PragueConnectTip.tip(...)` → ScopeLift announcer fires → recipient receives at fresh address never linked to ENS. Tip events are decoded by `lib/tip-events.ts` for the receipt page. | ★★★★★ |
| 6 | **Five V1 loops** (PRDs.md) | All five flows are real: profile edit, offer compose, feed listing, stealth tip, on-chain receipts. Memory entry confirms shipped 2026-05-09. Verified via live HTTP (`/feed` returns kilian/lucia/tomas as decoded names). | ★★★★ |
| 7 | **Inheritance pull-tab + sealed-by trail** | `web/lib/inheritance-tab.tsx` (auth-aware slide-up, 10-day localStorage TTL); `web/app/api/claim-name/route.ts:46-58` validates inviter and writes `sealed-by` text record only if inviter exists. Embedded twin in `web/lib/swarm.ts` for `*.eth.limo` static HTML. | ★★★★ |
| 8 | **Inscription animation** | `web/lib/inscription-stage.tsx` (239 lines): letter-by-letter chiseling at 60ms/letter, three sequential narration lines, broken-seal vignette on error. Pure CSS, no animation library. Czech variants for all narration. | ★★★★★ |
| 9 | **CROPS hallmark + `/crops` explainer** | `web/lib/ornaments.tsx:CropsSeal`, `web/app/crops/page.tsx`. Embedded as inline SVG (`CROPS_SEAL_SVG`) in `web/lib/swarm.ts` so `*.eth.limo` profiles carry the hallmark too. Static-page route in build. | ★★★★★ |
| 10 | **ERC-7730 V2 descriptors** | `contracts/erc-7730/PragueConnectEscrow.json`, `PragueConnectTip.json` — both updated with the new `tipWithReferral` clear-signing field metadata. Deployments table is current. **Not yet submitted to Ledger registry.** | ★★★★ |
| 11 | **Swarm-rendered personal sites** (HTML + ENSIP-7 contenthash encoder) | `web/lib/swarm.ts`: `bzzToContenthash` correctly emits `0xe40101fa011b20<32-byte-ref>` per ENSIP-7. `renderProfileHtml` is self-contained (no JS, no external assets), rendering bio + skills + offers + sealed-by trail + CROPS hallmark + inheritance pull-tab. **Requires `SWARM_BEE_URL` + `SWARM_POSTAGE_BATCH_ID` to actually upload.** | ★★★ (offline) / ★ (live without env) |
| 12 | **Vercel production + GitHub auto-deploy** | https://praga-azure.vercel.app (canonical, 200) + https://pragueconnect-azure.vercel.app (custom alias, 200). `rootDirectory=web` set via Vercel API. SSO protection disabled. Auto-deploy fires on push to `main` (verified 2026-05-09). | ★★★★★ |

---

## §2 — Overclaims to retract before the pitch

These appear in PLAN.md, README.md, project memory, or the design briefs. If a judge probes any of them and we cannot show the receipt, the moment dies.

### 2.1 "Renamed to `pragueconnect.eth`" — only true at the label level

**Reality.** Live API call: `GET https://namestone.com/api/public_v1_sepolia/get-names?domain=pragueconnect.eth` returns `{"error":"Domain does not exist"}`. The same call against `domain=praga.eth` returns 11 seeded subnames (kilian, lucia, bohuslav, milena, tomas, pavla, jirka, ales, jan, radek, brianpistar). Production resolves through `praga.eth` because the Vercel env var `NEXT_PUBLIC_NAMESTONE_DOMAIN` is still set to `praga.eth` even though the local `.env.local` says `pragueconnect.eth`.

**What this means.** The site *appears* to use `pragueconnect.eth` because URLs are formatted as `<label>.pragueconnect.eth` cosmetically, but the data layer is the old parent. Every existing offer, every existing seeded subname, every receipt — all still resolve through `praga.eth`.

**Fix before demo.** One of two paths: (a) register `pragueconnect.eth` on Sepolia ENS, get NameStone API key authorised for it, re-seed the demo subnames; OR (b) acknowledge that the canonical ENS parent is `praga.eth` and the user-facing rename is a forward-looking label. **The cleanest pitch keeps the data on `praga.eth` for the demo and frames `pragueconnect.eth` as the V2 parent.**

### 2.2 "Dual-publish stealth meta-address to ERC-6538 registry"

**Reality.** No code in `web/` calls `0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538`. The ScopeLift SDK we use (`@scopelift/stealth-address-sdk`) ships `generateSignatureForRegisterKeysOnBehalf` and `ERC6538_CONTRACT_ADDRESS` constants — we never invoke them. The stealth meta-address is published only as the ENS text record `stealth-meta-address`.

**Why this matters.** Cannes' ENS bounty rubric specifically calls out "auto-rotating addresses on each name resolution for privacy applications" (see source list in §4). The ENS text-record path satisfies that prompt — the registry write is bonus. **Don't claim what we didn't ship.**

**Fix.** Either (a) drop the dual-publish claim from the pitch, or (b) ship a one-shot `registerKeys` call from the onboarding flow (~1h work; requires gas; uses the SDK helper already in `node_modules`). Recommended: drop the claim; the ENS-only path is the more creative use anyway.

### 2.3 "ENSIP-25 agent delegation"

**Reality.** ENSIP-25 (published 2026-03-04, [ens.domains/blog/post/ensip-25](https://ens.domains/blog/post/ensip-25)) specifies the text-record key as `agent-registration[<registry>][<agentId>]` using ERC-7930 interoperable addresses, paired with an ERC-8004 Identity Registry entry (`eips.ethereum.org/EIPS/eip-8004`). Our code uses the bare key `agent-registration` (`web/lib/agent-form.tsx:154`, `web/app/api/update-profile/route.ts:27`) and stores a self-defined JSON attestation — the file even contains the comment *"…we propose [a custom format]"*. We have no ERC-8004 entry.

**Why this matters.** A judge reading our code sees the honest comment and respects the attempt. But a pitch line that says "ENSIP-25 compliant" is misleading.

**Fix.** Pitch wording: *"`agent-registration` text record under the user's subname carries a signed delegation attestation (a precursor to ENSIP-25 — published mid-March, after we scoped this surface). The structure is intentionally close to the spec so the on-chain ERC-8004 path is a small migration."* Honest, gives the bounty judge the right vocabulary, and earns credit for being early.

### 2.4 "Semaphore ZK reputation"

**Reality.** Zero `@semaphore-protocol/*` imports in `web/` or `contracts/`. `PragueConnectEscrow.sol:66` does emit a `reputationCommitment` (a `keccak256` hash of stealth recipient + task ID + rating) on release — that's a *commitment*, not a *proof*. There is no circuit, no proof generation, no verifier.

**Fix.** Drop the line from the pitch entirely. The commitment is a primitive we *built toward* a future ZK system; we don't have to claim more than that. The Privacy-by-Design pitch is strong enough on stealth + E2E without the ZK angle.

### 2.5 "No platform database"

**Reality.** Today, true (offers live in NameStone text records; receipts on chain). Day-5 PRD 6 introduces SQLite for the OffchainResolver. If PRD 6 ships, the line becomes false the moment we cut over.

**Fix.** Don't say "no database" — say *"the user's data lives in their ENS name; the resolver code we run is open and self-hostable."* This is the precise, defensible version.

### 2.6 "10 demo subnames" vs "7 demo subnames"

**Reality.** PLAN.md Part 4 says ten; demo script in README and project memory says seven. NameStone live count under `praga.eth` is 11 (10 named seeds + 1 brianpistar test). For the demo, we should pick a hero set of seven (the seven the script names) and let the rest be background.

**Fix.** Update PLAN.md and project memory to "7 demo seeds + N test names." Trivial edit.

---

## §3 — Pre-demo punch list (in priority order)

1. **Decide the canonical ENS parent for demo day.** If staying on `praga.eth`, update local `.env.local` to match prod (`NEXT_PUBLIC_NAMESTONE_DOMAIN=praga.eth`) and revise pitch to "the rebrand to pragueconnect.eth is V2." If moving to `pragueconnect.eth`, register on Sepolia ENS, contact NameStone for domain authorisation, re-seed names. **Cost of wrong choice: every prod URL silently shows UNCLAIMED on demo day.**
2. **Live-test XMTP** (`/m/<label>`). The wiring exists in `web/lib/xmtp.ts` and `web/app/m/[threadId]/page.tsx` but no end-to-end exchange has happened. Send one message between two browsers before the demo. If the dev network is slow, prepare a pre-recorded clip.
3. **Set Swarm env on Vercel** if a Bee gateway is available before demo. `SWARM_BEE_URL` + `SWARM_POSTAGE_BATCH_ID`. Without these, `/api/publish-site` returns 503 and the "served from Swarm" claim is local-only. ENS bounty mentions Swarm contenthash explicitly — this is worth the time.
4. **Submit ERC-7730 descriptors to the Ledger registry** ([github.com/LedgerHQ/clear-signing-erc7730-registry](https://github.com/LedgerHQ/clear-signing-erc7730-registry)). 1h. Means the demo wallet shows "send 100 Kč to lucia" instead of hex during the privacy-first arc.
5. **Update env vars on Vercel:** remove stale `NEXT_PUBLIC_PRAGA_TIP_ADDRESS` / `NEXT_PUBLIC_PRAGA_ESCROW_ADDRESS`; the new `NEXT_PUBLIC_PRAGUECONNECT_*` keys are already there. Cosmetic but tidies the env list a judge might ask to see.
6. **Edit PLAN.md, README.md, project memory** to match §2 corrections. The audit is only useful if it lands in the documents that get shown.
7. **Ship LICENSE (MIT)** at repo root. PRD 9 names this; without it the "open-source" leg of CROPS is technically not asserted.

---

## §4 — The ENS pitch (for both bounties)

### Headline (one breath)
> *"PragueConnect collapses identity, page, payment route, and agent verifier into a single ENS subname. One name, six text records, one contenthash — and stealth payments routed through the spec the registry was designed for."*

### Bounty 2 — Most Creative Use of ENS ($2,000)

**The Cannes prompt is essentially asking for what we built.** The published ENS bounty rubric for Cannes 2026 includes the line *"auto-rotating addresses on each name resolution for privacy applications"* ([ethglobal.com/events/cannes/prizes/ens](https://ethglobal.com/events/cannes/prizes/ens)). That is the precise mechanism behind `stealth-meta-address` — one ENS text record, fresh recipient address every transaction, never linkable.

**The four ENS surfaces we use, all load-bearing.**

1. **Subname-as-identity** — `<label>.praga.eth` (V1) / `.pragueconnect.eth` (V2 in flight) is the user's account. Verified: NameStone resolver returns 11 live records.
2. **Text records as data shelves** — eight purposeful keys: `description` (bio), `location` (Czech neighbourhood), `avatar`, `skills` (JSON), `offers` (JSON marketplace primitive — feed reads via `listSubnames` + flatten, no DB), `stealth-meta-address` (EIP-5564 meta-address, auto-rotating addresses on resolution), `sealed-by` (inheritance trail — novel; couldn't find precedent), `agent-registration` (delegation attestation, ENSIP-25-adjacent).
3. **Contenthash → Swarm-served personal site** — `bzzToContenthash` encodes per ENSIP-7 (`0xe40101fa011b20 + 32-byte-ref`); `renderProfileHtml` produces a self-contained illuminated-manuscript page suitable for `*.eth.limo`. Code path verified `web/lib/swarm.ts:21-66`.
4. **Reverse-resolution loop closure** — receipts on `/r/<txHash>` reverse-look-up the recipient's stealth address against the seeded subname set to label the participants by ENS, never raw 0x.

**Why this beats past winners.**

- SQUIDL (ETHGlobal Singapore 2024, [dynamic.xyz/blog/ethglobal-singapore](https://www.dynamic.xyz/blog/ethglobal-singapore)) used stealth + ENS but as a *payment link generator*. We use it as a *complete identity surface*: the same name does payment, page, profile, marketplace primitive, and agent.
- Raduno (ETHRome 2025) and FanTag (ETHAccra 2025) used Durin-issued L2 subnames — same plumbing, no privacy layer.

**The novel surfaces — name them in the pitch.**

- `sealed-by` text record as a verifiable inheritance trail. Couldn't find a precedent. The product loop closes when an invitee's first tip routes 5% to the inviter (`tipWithReferral` on chain), making the social graph economically alive without adding a centralised referral table.
- `offers` text record as a marketplace primitive — *the marketplace is the parent's subnames, flattened.* No backend.

**Risks if a judge digs.**
- "ERC-6538 dual-publish" — drop. ENS-only path is fine.
- `sealed-by` is our own convention, no ENSIP. Lean into "this is the kind of thing an ENSIP could codify."

### Bounty 1 — Best AI Agent Integration ($2,000) — honest framing

**The honest opener.** *"ENSIP-25 was published 2026-03-04; we scoped our agent surface in February. So our `agent-registration` text record is the prototype the spec formalised — close, but not a literal compliance claim."*

**What we have.**
- `web/lib/agent-form.tsx` lets a user sign a structured attestation: agent address, scopes (`read-feed`, `post-offer`, `accept-work`, `send-tip`, `open-thread`), `dailyTipCapEth`, `expiresAt`, signed by the user's principal. Stored on chain via NameStone as `agent-registration` text record.
- Any client reads the attestation, verifies the signature against the parent subname's owner, and rejects the agent if any check fails.
- The attestation is the human-controllable kill switch: setting `agent-registration` to empty string revokes everything (`agent-form.tsx:177`).

**What we don't have (yet).**
- No ERC-8004 Identity Registry entry. The spec wants `agent-registration[<registry>][<agentId>]` indexed.
- No on-stage agent demonstration that *autonomously acts* on PragueConnect. PRD 4 (the Familiar via 0G Compute TEE inference) is scoped for Day 5 — it's the bridge to a working agent demo.

**Stretch claim if PRD 4 ships.** *"The Familiar is an agent that drafts marketplace offers from a one-line prompt; inference runs inside a 0G Compute TEE so the prompt is encrypted to the enclave's attestation key. We never see the prompt; the operator never sees the prompt; the user only sees three drafts, signed by the agent's address per its `agent-registration` attestation."* This is the pitch for the AI bounty *if* the Familiar ships.

**If Familiar slips.** Don't pitch this bounty. Concentrate fire on Bounty 2.

### Mentor / judge note

ETHPrague 2026 lists Kevin from ENS as a mentor ([ethprague.com/hackathon](https://ethprague.com/hackathon)). The "workemon.eth" name from prior project notes did not surface in any official ETHPrague mentor listing — treat as TG-intel only. Confirm at the venue.

---

## §5 — The Privacy by Design pitch (Trezor Safe 7)

The framework you want is **Pagency** — Web3PrivacyNow's nine-axis ideation tool ([github.com/web3privacy/pagency](https://github.com/web3privacy/pagency)) — paired with the **Privacy Builder Pack** ([build.web3privacy.info](https://build.web3privacy.info/)). The acronym they coined is **PEDApp** (Privacy-Enhanced Decentralised Application). Use it.

### Pagency mapping (cite this verbatim if a Web3Privacy mentor judges)

| Axis | PragueConnect's answer |
|---|---|
| **Humans** | Digital nomads / expats living in Prague, Czech-speaking locals, anyone who'd post a marketplace offer to neighbours. |
| **Data** | Identity (ENS name), payment routes (stealth meta-address), offer text, message contents, the social graph (who introduced whom). |
| **Challenge** | The marketplace operator (us) sees no cash flows, no message contents, no stable recipient addresses. Chain observers see no link between an ENS name and the addresses funds land at. |
| **Threat actors** | The marketplace operator (us, including a future hostile fork), chain analysts, government surveillance, advertisers, the messaging provider (XMTP relay can't read MLS-encrypted bodies), the resolver provider (NameStone today; our own gateway in V2). |
| **Privacy layers** | Network-level (EIP-5564 stealth tips: recipient unlinkable on chain), transport (XMTP V3/MLS E2E messaging), storage (Swarm-served pages, no platform DB of profiles), identity (ENS name controlled by the user — they can move it). |
| **Solution** | ENS-native identity + EIP-5564 stealth payments + XMTP V3/MLS messaging + Swarm contenthash personal sites. Privacy is the default, not an opt-in. |
| **Partners** | ENS (subname infrastructure), ScopeLift (canonical 5564 announcer + SDK), FluidKey (Dedaub-audited stealth-account-kit), XMTP (V3/MLS), Swarm (Bee + ENSIP-7 contenthash), NameStone (offchain CCIP-Read resolver, V1). |
| **Resources** | Open source (MIT planned per PRD 9). The code base today: `~5k LOC`, two Solidity contracts, one Next.js 16 app. |
| **Success metrics** | A Basescan auditor, given a recipient's ENS name, cannot find a single address that holds funds tied to that name. (Verifiable on demo day for any of the seeded users.) |

### Paradigm choice

Pagency lists four privacy paradigms (Embedded · Configurable · Enterprise-Ready · Total Anonymity). **PragueConnect is "Embedded"** — privacy at the network/protocol level, default-on, no configuration UI for the user. This matches the user's earlier choice: *stealth as the headline, narrated layered story behind it*.

### The headline beat (use it word-for-word)

> *"You send to `lucia.pragueconnect.eth`. On Basescan, the recipient is an address that has no on-chain history under that name. The name is hers; the address is not. That's by design — and it's by default. We didn't add a privacy mode; we removed the mode where you can't be private."*

### What's real (cite line-by-line if challenged)

- `PragueConnectTip.tip(...)`: `web/lib/stealth.ts:paymentAddress` derives a fresh stealth address from the recipient's `stealth-meta-address` text record; `tip-form.tsx` submits to the contract; the announcer fires on chain. **No code path emits the recipient's ENS-bound address in this flow.** Verifiable: read the `Tipped` event ABI in `contracts/src/PragueConnectTip.sol:36`.
- XMTP V3 / MLS in `web/lib/xmtp.ts`: dev network, browser SDK. Bodies are MLS-encrypted; the relay (and we) cannot read them.
- Personal sites on Swarm: `bzz://` reference, ENS contenthash, `*.eth.limo` gateway. We don't host profile data.
- `tipWithReferral` (the inviter slice): also two stealth legs in one tx — the inviter's reward also lands at an unlinkable address.

### What we *don't* claim (drop these)

- Semaphore ZK reputation. Don't say it.
- "Total anonymity." We're not — XMTP needs an Ethereum identity, Privy needs an email, Vercel logs IPs. We're "embedded privacy at the unit-of-payment layer."
- "No metadata leakage." Be specific: what *is* leaked — RPC IPs to public providers, NameStone (or our resolver) sees who looked up which name, XMTP relay sees who messaged whom (envelope, not body). Acknowledge it in the threat model; that's what a Privacy-by-Design judge wants to see.

### The four design principles (Web3PrivacyNow's published list)

1. **Human centred** — The pitch beats the privacy. A Czech translator in Žižkov sees "send to lucia" not "your stealth meta-address material is…".
2. **Solves an actual privacy-specific problem** — Marketplace platforms see every transaction. We don't.
3. **Accessible** — Privy embedded wallet, Pimlico paymaster sponsors gas, Czech localisation throughout.
4. **Open-source** — MIT (PRD 9), forkable for any city via `bin/fork-for-city <name>`.

### Closing line for the Trezor judge

> *"The Trezor Safe 7 is the device that makes a private payment land cleanly. PragueConnect is the network that makes a private payment land *to a name a human can remember.*"*

---

## §6 — The honest one-liner for the booth

> *"PragueConnect is one ENS name doing the work of a profile, a personal site, a marketplace stall, a private gift-route, and (optionally) an agent's signed delegation. Sealed in 90 seconds, served from Swarm, paid through stealth addresses on Base. CROPS — censorship-resistant, open-source, private, secure — is the maker's mark."*

**Citations.** [ENS Cannes prize](https://ethglobal.com/events/cannes/prizes/ens) · [ENSIP-25](https://ens.domains/blog/post/ensip-25) · [EIP-8004](https://eips.ethereum.org/EIPS/eip-8004) · [Pagency](https://github.com/web3privacy/pagency) · [Privacy Builder Pack](https://build.web3privacy.info/) · [ETHPrague 2026 hackathon page](https://ethprague.com/hackathon) · [Ledger ERC-7730 registry](https://github.com/LedgerHQ/clear-signing-erc7730-registry) · [Web3PrivacyNow / PEDApp](https://github.com/web3privacy/web3privacy) · [SQUIDL precedent](https://www.dynamic.xyz/blog/ethglobal-singapore).
