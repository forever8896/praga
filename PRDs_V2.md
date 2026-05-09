# PragueConnect V2 — the dream onboarding & CROPS hardening

Eight focused PRDs, in build order. V1's five loops shipped end-to-end; V2 layers
the *story* and hardens the four CROPS legs (Censorship-resistant · Open-source ·
Private · Secure). Demo target: the **privacy-first 90s arc** with the inheritance
loop closed and the CROPS hallmark visible on every screen.

Format per PRD: **Goal · Scope · Non-goals · Data flow · Surfaces · Acceptance · Effort**.

---

## PRD 1 — `tipWithReferral`: atomic 95/5 split

**Goal.** When Kilian sends his first tip after being introduced by Lucia, 95 % goes
to the recipient's stealth address and 5 % goes to Lucia's stealth address — both
in the same transaction, both ERC-5564 announced.

**Scope.**
- New external function on `PragueConnectTip`: `tipWithReferral(recipientStealth, recipientEphemeralPub, recipientViewTag, inviterStealth, inviterEphemeralPub, inviterViewTag)` payable.
- Atomic two-leg execution: `recipient` receives `msg.value * 95 / 100`, `inviter` receives `msg.value - recipientShare`. Both via `Announcer.announce(...)` from the canonical 0x5564… contract.
- Emit `Tipped(recipient, inviter, recipientAmount, inviterAmount, txOrigin)`.
- Existing `tip(...)` stays untouched (back-compat for non-referral tips).
- Redeploy on Base Sepolia; update `NEXT_PUBLIC_PRAGUECONNECT_TIP_ADDRESS`.

**Non-goals.**
- No referral cap, no referral expiry, no two-hop chains. v1 is single-hop, first-tip-only enforcement happens in the UI (server-side `inviter` resolution from NameStone), not on-chain.
- No upgradeability. Redeploy is fine.

**Data flow.**
1. Client reads `inviter` from the user's NameStone text record `sealed-by` (set during signup).
2. Client derives BOTH stealth addresses (recipient + inviter) via `@scopelift/stealth-address-sdk`.
3. Single `tipWithReferral(...)` call with both stealth keys.
4. Server-side indexer (PRD 8) reads the new event for receipts.

**Surfaces.**
- `contracts/src/PragueConnectTip.sol` — add the function.
- `contracts/test/PragueConnectTip.t.sol` — new test cases (atomic split, no-inviter still works via old `tip`, gas budget).
- `contracts/script/DeployTip.s.sol` — re-run deploy.
- `web/lib/tip-form.tsx` — branch on presence of `sealed-by` record; call referral path when present.
- `web/lib/tip-events.ts` — decode new `Tipped` shape.
- `web/.env.local` + Vercel — new contract address.
- `contracts/erc-7730/PragueConnectTip.json` — add `tipWithReferral` field metadata.

**Acceptance.**
- `forge test` — new test verifies (a) total `msg.value` is split exactly 95/5 with no dust loss, (b) both legs emit a 5564 announcement, (c) reverts cleanly if either stealth address is zero.
- Sepolia send: 100 Kč (in ETH equivalent) splits to 95 Kč to recipient, 5 Kč to inviter; both visible on Basescan with unrelated addresses.

**Effort.** ~4 h.

---

## PRD 2 — Inheritance arrival: the pull-tab on the profile

**Goal.** When a stranger opens `lucia.pragueconnect.eth.limo` in TG/Signal,
they see Lucia's full parchment AND a parchment pull-tab at the foot
inviting them to claim their own seal — *"You were led to this seal by Lucia."*

**Scope.**
- Pull-tab component slides up from the bottom of every public profile page (`/[ensName]` and the Swarm-served HTML).
- Copy mentions the *visited* profile by name. (Does NOT track who *invited* the visitor — that's set later, on claim.)
- CTA navigates to `/?invitedBy=lucia` which seeds the `sealed-by` text record at claim time.
- Component must work in TG's in-app browser (no service worker dependency, no JS-only fallback).
- Must render inside the static Swarm HTML too, not just the in-app view.

**Non-goals.**
- No inviter analytics dashboard.
- No multi-inviter chains (one inviter only — the *first* profile they landed on).

**Data flow.**
1. Visitor opens `lucia.pragueconnect.eth.limo` → loads from Swarm.
2. Static HTML contains the pull-tab with hard-coded inviter `lucia`.
3. Click → navigates to `https://pragueconnect.app/?invitedBy=lucia`.
4. Onboarding page reads `?invitedBy` from URL, stores in localStorage `pc:invitedBy` (10-day TTL).
5. On claim (PRD 3 `/api/claim-name`), if `invitedBy` is in localStorage AND that name exists in NameStone, write `sealed-by: lucia.pragueconnect.eth` text record on the new subname.

**Surfaces.**
- `web/lib/swarm.ts` — `renderProfileHtml` adds the pull-tab block.
- `web/app/[ensName]/page.tsx` — same pull-tab as a React component (auth-aware: hide if visitor is signed in).
- New: `web/lib/inheritance-tab.tsx`.
- `web/app/page.tsx` — read `?invitedBy=`, persist to localStorage.
- `web/app/api/claim-name/route.ts` — accept `invitedBy` in body, write `sealed-by` text record.
- `web/lib/onboarding-form.tsx` — pass localStorage `pc:invitedBy` to claim API.

**Acceptance.**
- Open `lucia.pragueconnect.eth.limo` (Swarm-served), scroll to bottom, see the pull-tab.
- Click → land on PC home with `?invitedBy=lucia`, claim a name, then visit `/<your-name>` and see *"sealed by lucia.pragueconnect.eth"* in fine print.

**Effort.** ~3 h.

---

## PRD 3 — Inscription: the spinner-replacement animation

**Goal.** When a user submits their name claim, the loading state is **not a spinner** — it is the chosen name being chiseled into a parchment in display caps over ~1.8 s, with three lines of italic Garamond appearing line-by-line below as the ledger writes settle.

**Scope.**
- A new `<InscriptionStage>` component that orchestrates four phases:
  1. *carving* — letter-by-letter draw of `[NAME].pragueconnect.eth` in Cormorant Garamond Small Caps with quill-stroke easing.
  2. *line 1* — *"the parchment receives the name…"* (fade-in, 200ms after carve completes).
  3. *line 2* — *"the seal is being cut in pragueconnect's ledger…"* (fade-in 700ms after line 1).
  4. *line 3* — *"a place on Swarm is being prepared for your hand…"* (fade-in 1200ms after line 2).
- Animation runs while `/api/claim-name` is in flight. If the API resolves first, hold the animation until the carve completes; do NOT end early.
- If the API fails, dissolve to the error state (broken wax seal vignette).
- Pure CSS + a small JS scheduler. No animation libraries.

**Non-goals.**
- No skip button. The ceremony is the product.
- No accessible-reduced-motion alternative this round (note as a follow-up — fall back to a static "Inscribing…" line if `prefers-reduced-motion`).

**Data flow.** Pure UX — no new data.

**Surfaces.**
- New: `web/lib/inscription-stage.tsx`.
- `web/lib/onboarding-form.tsx` — replace the existing loading state with `<InscriptionStage>`; ensure submit is disabled during.
- `web/app/globals.css` — keyframes for letter-draw + ink-bleed.

**Acceptance.**
- Claim a name end-to-end. The animation runs for at least 1.8 s, completes the carve before navigating, and lines 1–3 appear in order.
- API success → page transitions to the minimal parchment via paper-turn.
- API failure → broken-seal error vignette.

**Effort.** ~3 h.

---

## PRD 4 — The Familiar: TEE-backed offer drafter via 0G Compute

**Goal.** After claiming a name, the user is shown an owl-on-quill composition and a single prompt — *"In one line, what do you know about Prague that a stranger would pay to learn?"* On submit, three offer drafts appear in real time, drafted by an LLM running inside a 0G Compute TEE so the prompt never leaves the trusted enclave.

**Scope.**
- New API route `POST /api/familiar/draft`:
  - Auth: Privy identity token.
  - Body: `{ prompt: string, locale: 'en' | 'cs' }`.
  - Returns: `{ drafts: [{ sigil, title, kc, description }, ...] }`.
  - Internally calls 0G Compute's TEE endpoint (Llama 3.1 8B class). Includes attestation header in response so client can show *"sealed inference"* badge.
- New `<FamiliarDrafter>` component: owl SVG (line engraving), a single one-line input, three result cards with quill-stroke entry animation. Each card has a *"keep this offering"* (wax-stamp) and *"another"* (re-roll just that draft).
- "Keep" → POST to existing `/api/update-profile` with the new `offers` array including this entry → triggers Beat 4 (republish).

**Non-goals.**
- No multi-turn conversation with the familiar. One prompt → three drafts → re-roll if needed. Conversation comes in v3.
- No fallback to non-TEE if 0G Compute is down at demo time → instead, show *"the familiar is resting"* graceful empty state, let user post manually.
- No fine-tuning / RAG over their NameStone records this round.

**Data flow.**
1. User types a one-line prompt → submit.
2. Client POSTs to `/api/familiar/draft`.
3. Server constructs a structured prompt (system: "You are a familiar drafting marketplace offers in PragueConnect's voice. Output strict JSON. Three drafts. Each: sigil ∈ {place, skill, route, translation, introduction, favor}, title ≤ 60 chars, kc ∈ {50,100,200,300,500,1000}, description ≤ 140 chars."). Sends through 0G Compute SDK.
4. Response parsed; if invalid JSON, retry once with a stricter prompt; if still invalid, return 502 with the empty-state message.
5. Drafts render with quill-stroke animations.
6. "Keep" → patches the user's NameStone `offers` text record → kicks off Swarm republish (already implemented in `lib/swarm.ts`).

**Surfaces.**
- New: `web/app/api/familiar/draft/route.ts`.
- New: `web/lib/familiar-drafter.tsx`.
- New: `web/lib/og-compute.ts` (thin client wrapper for 0G Compute SDK).
- `web/lib/onboarding-form.tsx` — chain into `<FamiliarDrafter>` after the inscription stage completes.
- `web/.env.local` + Vercel — `OG_COMPUTE_API_KEY`, `OG_COMPUTE_ENDPOINT`, `OG_COMPUTE_MODEL`.

**Acceptance.**
- Submit a prompt → three drafts render within 4 s, each with sigil, title, kč, description.
- Keep one → it appears in the user's catalogue on the next page-load AND on their `*.eth.limo` Swarm-served profile.
- Disconnect 0G API key → graceful empty-state, no broken page.
- Demo line *"your familiar drafts under a sealed roof"* visible while drafts are inflight.

**Effort.** ~5 h (4 h base + 1 h for graceful TEE fallback + attestation badge).

---

## PRD 5 — Reciprocate: finder's-mark stealth tip with dual-receipt

**Goal.** After the user has claimed a name and inscribed offers, a small cartouche
slides up: *"Lucia led you to this seal. Send a thank-you?"* On press, 100 Kč
sends as a stealth tip with a 5 Kč finder's mark routed back to Lucia's stealth
address — atomic, name-only, dual-receipt.

**Scope.**
- New `<ReciprocateCartouche>` component shown on first profile-load when `sealed-by` text record is present.
- Press-and-hold the wax-stamp button compresses the seal (CSS transform), then triggers a `tipWithReferral(...)` (PRD 1) call.
- The stealth-tip animation: two paper strips fold up from beneath, one larger (95 Kč to recipient = inviter), one smaller (5 Kč to inviter = themselves). *Note: this case the inviter IS the recipient — the "finder's mark" framing is pedagogical, not a literal split.*
  - **Engineering note**: when reciprocating to one's inviter, set `recipient = lucia` and `inviter = lucia`. UI presents it as 95+5=100 *as a single thank-you*; the dual-receipt animation is a visual education about the general mechanic.
  - For all other tips that occur after onboarding (where someone tips a third party), `recipient = third-party`, `inviter = lucia` (the original inviter).
- Receipt cartouche: *"BY THIS GIFT"*, two wax seals, two unrelated stealth addresses in mono. Single closing line: *"sealed · zapečetěno."*
- After dismiss, do NOT show the cartouche again on this device.

**Non-goals.**
- No "tip Lucia later" reminder. One-shot at the post-onboarding moment, then gone.
- No editing the 5 % share. Hard-coded for the demo.

**Data flow.**
1. On first load of `/[ensName]` for an authed user where `viewer === ensName`:
   - Read `sealed-by` from their own NameStone record.
   - If present AND `pc:reciprocated:<inviter>` not in localStorage → show cartouche.
2. Press-and-hold → derive both stealth addresses → call `tipWithReferral`.
3. On confirm → record in localStorage and show receipt cartouche.

**Surfaces.**
- New: `web/lib/reciprocate-cartouche.tsx`.
- New: `web/lib/dual-receipt.tsx`.
- `web/app/[ensName]/page.tsx` — gate the cartouche on owner/sealed-by presence.
- Depends on PRD 1.

**Acceptance.**
- Brand-new user invited by Lucia → claim → inscribe one offer → land on profile → see the cartouche → press-and-hold → animation → receipt cartouche shows two stealth addresses unrelated to "lucia.pragueconnect.eth" or to each other.
- Reload → cartouche does not return.

**Effort.** ~4 h.

---

## PRD 6 — `OffchainResolver`: replace NameStone

**Goal.** `pragueconnect.eth`'s on-chain resolver becomes a contract we deploy
and a gateway we host. The CROPS-Censorship-Resistant claim becomes literal:
the entire resolution path is open code we control.

**Scope.**
- Solidity: `OffchainResolver.sol` adapted from `ensdomains/offchain-resolver` reference impl. CCIP-Read with `resolveWithProof`.
- Gateway: new Next.js Route Handler `/api/ccip/[sender]/[data]` that signs offchain responses with a PC-controlled signer key.
- Storage: SQLite (file-backed) for hackathon-scale; ~7 demo names + records. Schema: `subnames(label, owner, address)`, `text_records(label, key, value)`, `addr_records(label, coin_type, address)`, `contenthash(label, hash)`.
- Admin REST API mirroring NameStone's surface (so existing app code minimally changes): `POST /api/admin/set-name`, `GET /api/admin/get-names`, `GET /api/admin/list-subnames`. Auth via `PC_ADMIN_KEY` env var.
- Cutover: deploy resolver, re-seed 7 demo names + records, flip `pragueconnect.eth`'s resolver on Sepolia ENS, retire NameStone API key.

**Non-goals.**
- No mainnet ENS support this round. Sepolia only.
- No subname-as-NFT, no on-chain ownership transfer. Owner is the EOA recorded by us — same posture as NameStone.
- No migration of NameStone data programmatically; we re-seed manually with our existing demo content.

**Data flow.**
1. Client (any ENS-aware tool) queries `lucia.pragueconnect.eth`.
2. Sepolia ENS returns our `OffchainResolver`.
3. Resolver returns `OffchainLookup` revert pointing at our gateway URL.
4. Client follows CCIP-Read → calls our gateway with the encoded query.
5. Gateway reads SQLite, signs the response with `PC_RESOLVER_SIGNER_KEY`, returns.
6. Client verifies signature against the contract's known signer; uses the data.

**Surfaces.**
- New: `contracts/src/OffchainResolver.sol`.
- New: `contracts/test/OffchainResolver.t.sol`.
- New: `contracts/script/DeployResolver.s.sol`.
- New: `web/app/api/ccip/[sender]/[data]/route.ts` — the gateway.
- New: `web/app/api/admin/set-name/route.ts`, `web/app/api/admin/get-names/route.ts` — admin surface.
- New: `web/lib/resolver-store.ts` — SQLite layer (use `better-sqlite3`).
- `web/lib/namestone.ts` → renamed `web/lib/resolver.ts`, switched to call our admin API. **Function signatures stay identical** so the rest of the app doesn't change.
- New: `scripts/seed-demo-names.ts` — re-seeds the 7 demo subnames.
- `web/.env.local` + Vercel — drop `NAMESTONE_API_KEY`, add `PC_ADMIN_KEY`, `PC_RESOLVER_SIGNER_KEY`, `PC_GATEWAY_URL`.

**Acceptance.**
- `viem.getEnsAddress({ name: 'lucia.pragueconnect.eth' })` resolves correctly via our gateway with no NameStone in the path.
- All 7 demo names + their records survive the cutover.
- `forge test` for the resolver passes.
- The Vercel build still passes; no `web/lib` file outside `resolver.ts` references NameStone.

**Effort.** ~8 h (6 h build + 2 h cutover).

---

## PRD 7 — `PragueConnectOffers`: on-chain offer event log

**Goal.** When a user posts an offer, also emit an `OfferPosted(...)` event on
Base Sepolia. The feed reads from BOTH our resolver AND chain events; if the
gateway dies, the marketplace state survives in event logs.

**Scope.**
- Solidity: `PragueConnectOffers` with one external write `postOffer(bytes32 labelHash, uint8 sigil, uint64 kc, bytes32 contenthashRef, string title)` payable (1 wei min, anti-spam) and one event `OfferPosted(address indexed author, bytes32 indexed labelHash, uint8 sigil, uint64 kc, bytes32 contenthashRef, string title, uint64 ts)`.
- `labelHash = keccak256(label || ".pragueconnect.eth")` so it can be reverse-resolved against the resolver. Ownership check on-chain: caller's address must equal the owner stored in our `OffchainResolver` for `labelHash`. (Resolver exposes `ownerOf(labelHash)` view.)
- Feed reads (server side) merge: resolver-served offers (canonical) + last 1000 `OfferPosted` events (fallback). Dedupe by `(labelHash, title)`.

**Non-goals.**
- No on-chain offer revocation this round (stale events are tolerable for a 5-day demo).
- No NFTs, no royalties, no gas-sponsored variant.

**Data flow.**
1. User in `/compose` saves an offer.
2. Client POSTs to `/api/update-profile` (resolver write, unchanged).
3. Client also calls `PragueConnectOffers.postOffer(...)` from their Privy smart wallet (sponsored via Pimlico; existing tip flow already does this).
4. Feed page (`/feed`) reads our resolver `listSubnames(...)` AND `getLogs({ event: 'OfferPosted', fromBlock })`, merges, sorts by ts desc.

**Surfaces.**
- New: `contracts/src/PragueConnectOffers.sol`.
- New: `contracts/test/PragueConnectOffers.t.sol`.
- New: `contracts/script/DeployOffers.s.sol`.
- New: `contracts/erc-7730/PragueConnectOffers.json`.
- `web/lib/compose-form.tsx` — after resolver write, fire on-chain `postOffer`.
- `web/lib/offers.ts` — add `loadOffersFromChain()`, merge with resolver-served list.
- `web/app/feed/page.tsx` — call merged loader.
- `web/.env.local` + Vercel — `NEXT_PUBLIC_PRAGUECONNECT_OFFERS_ADDRESS`.

**Acceptance.**
- Post an offer → event visible on Basescan + offer renders in feed.
- Force-disable the resolver gateway temporarily → feed still shows that offer (via event-log fallback).
- `forge test` passes.

**Effort.** ~4 h.

---

## PRD 8 — CROPS hallmark + footer + explainer

**Goal.** Every page footer carries the gilded CROPS hallmark with four engraved
lobes. Tap → opens a one-page explainer cartouche. The hallmark becomes the
project signature.

**Scope.**
- New SVG asset: 4-lobed mark, single layered SVG, gilded hairline only. Three sizes (24/32/96).
- New `<CropsSeal>` component, lives in the existing footer area.
- New route `/crops` → single-page explainer cartouche (renders inside main app shell, mobile-first).
- Explainer copy in EN+CS, four short paragraphs, each headed by an isolated lobe glyph.
- Closing seal at 96px size used as the demo Frame 4.

**Non-goals.**
- No animation on the seal (it's a hallmark, it doesn't move).
- No interactive lobes individually (tap anywhere → opens the explainer page).

**Data flow.** Pure UX.

**Surfaces.**
- New: `web/lib/crops-seal.tsx` + `web/public/crops-seal.svg`.
- New: `web/app/crops/page.tsx`.
- `web/lib/navbar.tsx` — add the seal to the footer area (or new `<Footer>` component if none exists yet).
- `web/lib/swarm.ts` — embed the seal inline in the static HTML so `*.eth.limo` profiles also show it.
- `web/lib/i18n.tsx` — add `crops.*` keys for the explainer copy.

**Acceptance.**
- Every page in the app has the seal in its footer (24px mobile / 32px desktop).
- Lucia's Swarm-served `*.eth.limo` page also shows the seal in its footer.
- Tap → `/crops` renders cleanly in EN; toggle CS → renders in Czech.

**Effort.** ~3 h.

---

## PRD 9 (parallel) — OSS artifacts

**Goal.** The "open-source" leg of CROPS becomes load-bearing: a license, a
fork-for-city script, a SPEC.md, a CITIES.md ledger.

**Scope.**
- `LICENSE` at repo root — MIT.
- `bin/fork-for-city <name>` — bash script that copies repo to `../<name>connect`, sed-replaces the four canonical strings (`PragueConnect`, `pragueconnect`, `PRAGUECONNECT`, `Praha`), updates env templates, generates a fresh README skeleton, prints the next-step checklist (register `<name>connect.eth`, deploy contracts, etc.).
- `SPEC.md` — protocol-level description: ENS parent shape, the 5 canonical text records (`description`, `avatar`, `location`, `skills`, `offers`, `stealth-meta-address`, `sealed-by`), the 3 contract ABIs (Tip, Escrow, Offers), the resolver gateway interface.
- `CITIES.md` — a federation ledger inviting forks. Empty list to start; PR template for adding new cities.

**Non-goals.**
- No Dockerfile / one-command-install (over-engineering for week-of).
- No automated `<name>connect.eth` registration (manual, documented in the script's output).

**Surfaces.**
- New files at repo root.

**Acceptance.**
- `./bin/fork-for-city berlin` produces a working `../berlinconnect/` directory that compiles.
- README cross-links LICENSE, SPEC, CITIES.

**Effort.** ~2 h.

---

## Implementation sequence (Day 4 + Day 5)

| Day | Slot | PRD | Notes |
|---|---|---|---|
| **Day 4** AM | 09–13 | PRD 1 — `tipWithReferral` + redeploy + env update | Blocking for PRD 5; do first while head is fresh |
| Day 4 PM | 13–15 | PRD 8 — CROPS hallmark + footer | Lightweight, decorate everything; small visible win |
| Day 4 PM | 15–17 | PRD 2 — Inheritance pull-tab | UI-only, isolated, ships independently |
| Day 4 EVE | 19–22 | PRD 3 — Inscription animation | UI-only, no backend |
| **Day 5** AM | 09–17 | PRD 6 — `OffchainResolver` build + cutover | The big one; fully replaces NameStone |
| Day 5 EVE | 17–21 | PRD 4 — The Familiar (0G Compute) | Save for end since 0G integration is the highest unknown |
| Day 5 EVE | 21–23 | PRD 5 — Reciprocate cartouche | Depends on PRD 1 + design polish from Day 4 |
| Day 6 AM | 09–11 | PRD 9 — OSS artifacts | Ship before submission |
| Day 6 AM | 11–12 | ERC-7730 → Ledger registry | One-off, low effort |
| Day 6 PM | 13–17 | PRD 7 — `PragueConnectOffers` | Stretch — only if Day 5 goes clean |
| Day 6 PM | 17–20 | Stage-demo rehearsal × 4 | Privacy-first arc, OBS scenes, Basescan side-by-side |

**Slips first** (cut order, if time runs short): PRD 7 (chain offer events) → PRD 4 (familiar drafter) → PRD 5 (reciprocate cartouche).

**Never cut**: PRD 1 (referral tips), PRD 6 (resolver), PRD 8 (CROPS seal), PRD 9 (OSS).

---

## Risk register

- **0G Compute API instability** — flat-out fallback to a graceful empty state; don't show the user a stack trace. Demo: pre-record a familiar-drafting clip we can cut to if the live one fails.
- **`OffchainResolver` cutover** — 7 demo names must survive. Dry-run the seed against a local SQLite, then re-seed against prod, then flip the resolver only after a verify call passes.
- **Privy smart-wallet sponsoring `tipWithReferral`** — Pimlico paymaster needs to whitelist the new contract address. Add to allowlist same time as deploy.
- **Sepolia ENS Public Resolver fee** — flipping resolver costs ~0.001 ETH; deployer wallet has ~0.05 ETH, fine.
- **`*.eth.limo` cache** — Swarm contenthash updates can take 5–10 min to propagate via eth.limo. Don't trigger republish in the demo; pre-publish 30 min before stage.

---

*v1 closed five loops; v2 closes the gaps that turn the loops into a story.*
