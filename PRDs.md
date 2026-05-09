# PragueConnect — closing the five loops

Five focused PRDs, in build order. Each turns a static screen into a real
loop. The hackathon demo target ("claim → post → get hired with a stealth
payment") is feasible if loops 1–3 ship.

Format per PRD:
- **Goal**: the user-visible promise
- **Scope**: what's in
- **Non-goals**: what we explicitly defer
- **Data flow**: where the bytes live
- **Surfaces**: which routes/files change
- **Acceptance**: how we know it's done

---

## Loop 1 — Your seal is yours: Edit → NameStone

**Goal.** A signed-in user can edit their bio, location, avatar URL, and
skills on `/me/edit`, press "Seal," and the changes are written to NameStone
text records under their `<label>.pragueconnect.eth` subname. On reload, the public
profile (`/<label>.pragueconnect.eth`) reflects the change.

**Scope.**
- `POST /api/update-profile` — server-only, validates Privy session, calls
  NameStone `set-name` with text records: `description`, `avatar`, `location`,
  `skills` (JSON array of `{kind, name, price_kc, price_usdc, radius_m}`)
- `/me/edit` becomes a real form (currently static): inputs for each field,
  bound to current NameStone record on load
- Optimistic UI: after `Seal`, navigate to the public profile and show the
  new value
- Idempotent: re-sealing the same content is a no-op; only fields that
  changed are sent

**Non-goals.**
- Avatar upload (we accept a URL string, no file storage in this loop)
- Address verification beyond what Privy guarantees
- Edit history / audit trail

**Data flow.**
1. Client reads its own subname via `getSubname` (already exists)
2. User edits, presses "Seal"
3. Client `POST /api/update-profile` with `{label, fields}` and the Privy
   access token
4. Route verifies the token's wallet address matches `record.address` for
   the label, then calls `setSubname` with merged text records
5. Public profile re-reads on next request (route is `force-dynamic`)

**Surfaces.**
- New: `web/app/api/update-profile/route.ts`, `web/lib/privy-server.ts`
  (verifies access token using `PRIVY_APP_SECRET`)
- Rewrite: `web/app/me/edit/page.tsx` from static to client form
- Touch: `web/lib/namestone.ts` (already supports text_records)

**Acceptance.**
- Sign in as the holder of `kilian.pragueconnect.eth`, change the bio, see the new
  bio at `/kilian.pragueconnect.eth` after a reload
- Signing in as a different wallet and trying to edit `kilian` returns 403

---

## Loop 2 — The town square is alive: Compose → Feed

**Goal.** A signed-in user can write an offer ("I'll fix your bicycle by
sundown — 350 Kč") on `/compose`, seal it, and it appears at `/feed` to
every visitor — no platform DB, just a fresh JSON entry written to the
user's own subname.

**Scope.**
- Each user's subname gets an `offers` text record: a JSON array of
  `{id, kind: "offer"|"request", title, kc, usdc, location, neighbourhood,
   sigil, posted_at}`
- `/compose` writes (or replaces) the array via the same `update-profile`
  route from Loop 1
- `/feed` server-side fetches `listSubnames(pragueconnect.eth)`, expands each
  record's `offers`, flattens, sorts by `posted_at desc`, paginates 50 at a
  time
- Filter chips (REPAIR, COOK, etc.) filter the flattened list by sigil
- Empty/loading states for when NameStone is slow

**Non-goals.**
- Search (categorise via chips, but no free-text search this loop)
- Editing/deleting individual offers — for now, /compose replaces the
  entire `offers` array (acceptable for hackathon density)
- Geosearch by radius — neighbourhood string only

**Data flow.**
1. User on `/compose` fills in the form
2. Client appends to (or replaces) the user's `offers` array, POSTs to
   `/api/update-profile`
3. `/feed` fetches all subnames in `pragueconnect.eth`, decodes each `offers` JSON,
   flattens

**Surfaces.**
- Rewrite: `web/app/compose/page.tsx` (real form, not static)
- Rewrite: `web/app/feed/page.tsx` (real listing, drop `FEED_OFFERS`
  fixture from `web/lib/data.ts`)
- New helper: `web/lib/offers.ts` — encode/decode offer objects, and a
  server-only `loadFeed()` that calls `listSubnames` + flattens

**Acceptance.**
- Sign in, post an offer at `/compose`, see it at the top of `/feed`
- Sign out, open `/feed` in a different browser — the offer is still there
- Filter chips narrow the list correctly

---

## Loop 3 — Sealed gift, unlinkable address: Tip → Escrow + Stealth

**Goal.** A visitor on `/tip/<ens>` can tip / hire a craftsman in USDC. The
recipient address is a fresh stealth address generated client-side; the
on-chain announcement goes through the canonical ScopeLift ERC-5564
announcer. The escrow contract holds funds until released.

**Scope.**
- At claim time (Loop 1 already wrote-back), also generate a stealth
  meta-address with `@fluidkey/stealth-account-kit`, write it to the
  `stealth-meta-address` text record on the subname, AND register on the
  ERC-6538 registry (canonical `0x6538…`)
- `/tip/<ens>` reads the recipient's `stealth-meta-address`, derives a
  fresh ephemeral pubkey + recipient stealth address client-side, calls
  `PragueConnectEscrow.fund(stealthAddress, amount, jobId)`
- The escrow `fund` emits to the ScopeLift ERC-5564 announcer so the
  recipient (or their indexer) can detect it scanning their viewing key
- Post-fund: `/r/<receiptId>` shows the escrow state (Funded /
  InProgress / Delivered / Released) and the stealth address used

**Non-goals.**
- Gas-sponsored tx via Pimlico paymaster — try to wire it, but acceptable
  if the user pays gas in this loop
- The recipient's flow to *withdraw* from the stealth address (we'll
  show the announcement; sweep is post-hackathon)
- Tax / Czech VAT on the receipt (PragueConnect-specific UX flair, not core)

**Data flow.**
1. Recipient (during claim) generates stealth meta-address, writes to ENS
   text record + ERC-6538 registry
2. Tipper visits `/tip/<ens>`, reads the meta-address from NameStone
3. Tipper's browser derives ephemeral key + stealth address (`stealth.ts`)
4. Tipper signs `PragueConnectEscrow.fund(stealthAddress, amount, jobId)` —
   contract emits to ScopeLift announcer
5. `/r/<jobId>` reads the escrow phase + tx hash to render the receipt

**Surfaces.**
- Touch: `web/lib/stealth.ts` (already exists — wire to claim flow)
- Touch: `web/app/api/claim-name/route.ts` (write meta-address on claim)
- Rewrite: `web/app/tip/[ensName]/page.tsx` (real funding flow)
- Rewrite: `web/app/r/[receiptId]/page.tsx` (read PragueConnectEscrow phase)
- Touch: `contracts/src/PragueConnectEscrow.sol` (already supports stealth recipient)

**Acceptance.**
- Demo: claim two names in two browsers, A tips B 5 USDC, B's profile
  never reveals B's actual receiving address — block-explorer side-by-side
  shows the announced stealth address is unlinkable to `B.pragueconnect.eth`
- Receipt page shows "Nigredo / Funded" state with the ScopeLift announcement

---

## Loop 4 — A sealed thread between two names: XMTP

**Goal.** From a profile, a visitor can press "Send a sealed letter,"
which opens an XMTP thread keyed by ENS. Both sides see the message after
their wallet signs an XMTP installation key.

**Scope.**
- XMTP V3 / MLS client wired in `web/lib/xmtp.ts`
- `/m/<threadId>` becomes a live thread: load history from XMTP, send
  messages, render with the existing parchment thread UI
- Thread routing: `threadId = sortedConversationId(senderEns, recipientEns)`
  — XMTP handles the underlying topic
- Profile page "SEND A SEALED LETTER" button opens `/m/<threadId>` for
  the visitor

**Non-goals.**
- Group chats
- Attachments / images
- Read receipts beyond what XMTP V3 gives us
- Push notifications

**Data flow.**
1. User signs in (Privy)
2. `xmtp.Client.create(signer)` once per session, cached in memory
3. `/m/<threadId>` calls `client.conversations.newDmWithIdentifier(ens)`
4. `conversation.messages()` history; `conversation.send(text)` to write

**Surfaces.**
- New: `web/lib/xmtp.ts`
- Rewrite: `web/app/m/[threadId]/page.tsx`
- Touch: profile pages (button targets the right thread)

**Acceptance.**
- A messages B; B sees the message in real time in another browser
- Sign out and back in: history persists (it's on XMTP's network)

---

## Loop 5 — The wall earns itself: Receipts from on-chain events

**Goal.** The "Sealed receipts" wall on a craftsman's profile is no longer
fixtures — each entry is a `PragueConnectEscrow.Released` event on Base Sepolia,
read via viem.

**Scope.**
- A small indexer runs on the server (Next.js Route Handler with
  `getLogs`) that returns all `Released` events for a recipient EOA
- Profile page calls this for the displayed user, renders `ReceiptStrip`
  per event with: counterparty ENS (via reverse-lookup of subnames),
  amount, date, link to `/r/<jobId>`
- `/r/<jobId>` shows the full sealed receipt with the four-phase trail

**Non-goals.**
- A persistent indexer DB — for hackathon scale (<100 events) we
  paginate `getLogs` on every request and cache in-memory for a minute
- Reverse subname lookup is best-effort (loop the listSubnames result)

**Data flow.**
1. Profile page calls `/api/receipts?address=0x…`
2. Route runs `viem.getLogs({ address: ESCROW, event: 'Released',
   args: { recipient: address }})`
3. Each event → `{jobId, amount, counterparty, blockTime, txHash}`
4. ENS-ize counterparty by matching against `listSubnames(pragueconnect.eth)`

**Surfaces.**
- New: `web/app/api/receipts/route.ts`
- Touch: `web/app/[ensName]/page.tsx` (call the route, render real
  receipts)
- Drop: `KILIAN_RECEIPTS` from `web/lib/data.ts`

**Acceptance.**
- Send a tip from A to B (Loop 3), then visit B's profile — the receipt
  appears on the wall within a block of confirmation
