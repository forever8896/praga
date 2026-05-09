# Claude Design Brief — PragueConnect

> Paste this verbatim into Claude Design. One direction, locked. Render every screen in this language.

---

## The product (one paragraph)

PragueConnect is a peer-to-peer marketplace for humans in Prague to offer micro-skills, favors, and gifts to each other for small crypto payments — handyman work, language exchange, rides, cooking, tutoring, errands, gifts. The unit of trust is a *person*, not a platform. Every user gets an ENS name (`yourname.pragueconnect.eth`) that is simultaneously their identity, their public website (auto-rendered at `yourname.pragueconnect.eth.limo`), and the route through which payments — including private stealth-address payments — reach them. Reputation lives on the human, not the platform. Escrow is non-custodial. Messaging is end-to-end encrypted.

We are designing both the **mobile app** and the **underlying web app** as one product, two viewports — same DNA, the desktop has more room to breathe.

---

## The visual direction — *the Rudolfine Workshop*

Prague under Rudolf II — the Habsburg court that drew alchemists (Edward Kelley, John Dee), astronomers (Tycho Brahe, Kepler), and Hermetic philosophers to a single small city — is the unifying lens. **Royal but not pompous. Alchemical but not occult-cosplay. Prague-specific but not tourist-shop.**

The product feels like the personal almanac of a 16th-century Pragocentric craftsman, but the typography prints crisply, the buttons respond instantly, and your ENS name is your seal.

Above all: **beautiful in the way an illuminated manuscript is beautiful** — every page rewards being lingered over.

---

## Design system

### Palette — pigments, not light

- **Ink** — `#0F0E0C` (text, primary surface in dark mode)
- **Parchment** — `#F4ECD8` (primary background)
- **Bone** — `#E6DCC4` (subtle card lift on parchment)
- **Vermilion** — `#B23A2F` (Bohemian seal red, primary accent, escrow-final state)
- **Lapis** — `#1F3A6E` (royal blue, links, secondary accent)
- **Gilded** — `#C8A24A` (antique gold — hairline borders, hallmarks, fleur-de-lis)
- **Verdigris** — `#3E6B5A` (deep Bohemian-crystal green, success/safe states)

No gradients. No neon. No purple. Color comes from pigment, not from light.

### Typography

- **Display** — humanist Roman small-caps (e.g. *Cormorant Garamond Small Caps* or *Trajan*) for section titles and the user's ENS name on their profile. Used like a chiseled inscription.
- **Body** — warm Garamond/Caslon-class serif (e.g. *EB Garamond*, *Caslon Pro*). Long descenders, real italic. For everything human-written.
- **Ceremonial** — restrained blackletter (*UnifrakturCook* style) for one or two ceremonial moments per screen — the wax-seal verification, the personal-site masthead. Never for anything that has to be read fast.
- **Data** — precise monospace (*JetBrains Mono*, *iA Writer Mono*) for ENS names in lists and any technical strings. Treated as "the metal" — unornamented, the data is its own ornament.

Generous size. Loose leading. Body 16-17px on mobile, 18-19px on web.

### Ornament rules

1. **Fleur-de-lis** appears as a recurring stamp, *never* as wallpaper. Allowed: corner ornaments on cards, the bullet for verified items, woven into wax seals, decorative initial flourishes at the start of a profile bio. Maximum two per screen on mobile, four on desktop. Render in `Gilded` on `Parchment` or `Parchment` on `Ink`. Three petals, slightly elongated, line-art only — no fills.

2. **Alchemical sigils as category icons** — each skill category gets a hand-engraved alchemical glyph:
   - Handyman / repair → ♂ Mars-and-anvil (forge)
   - Language exchange → ☿ Mercury (the messenger)
   - Cooking → 🜍 Sulphur over flame
   - Rides / transit → ⚕ winged caduceus
   - Tutoring / teaching → ♄ Saturn (with an owl)
   - Gifts / freebies → ♀ Venus rose
   - Errands → ⚗ alembic (small task = transformation)
   
   Render as line engravings, not filled icons. Each sits inside a thin gilded circular hairline frame.

3. **Cartouche frames** — profile cards and reputation receipts are framed with delicate engraved cartouches (asymmetric scrollwork), `Gilded` 0.5pt hairlines on `Parchment`. They should look *engraved*, not stickered.

4. **Wax seals as reputation badges.** "Verified by PragueConnect" is a deep-vermilion wax seal with a fleur-de-lis pressed in. Slightly off-axis. Subtle texture (cracks, edge irregularity). Used sparingly — once per profile, once per completed task receipt.

5. **Marginalia** — desktop screens (only) carry hand-drawn marginalia in the side margins: small alchemical diagrams, an astrological glyph, a scribbled fleur-de-lis, a tiny squared circle, a Prague tram route reduced to a constellation. Decorative, never interactive. Mobile drops them entirely.

### Escrow states as the *Magnum Opus* — the showpiece

The four phases of the alchemical Great Work map onto escrow states. **This is the most beautiful single feature the design language will produce. It must be perfect.**

| State | Phase | Color | Visual |
|---|---|---|---|
| Funded | **Nigredo** (the blackening) | `Ink` on `Bone` | Dark wax circle, unbroken |
| In Progress | **Albedo** (the whitening) | `Parchment` over `Ink` | Lunar crescent inside the wax |
| Delivered | **Citrinitas** (the yellowing) | `Gilded` over `Parchment` | Solar disc inside the wax |
| Released | **Rubedo** (the reddening) | `Vermilion` with `Gilded` | Final stamped seal — fleur-de-lis pressed in |

The escrow panel literally *is* a four-stage alchemical diagram.

### Motion

Slow. Considered. Easing should feel like ink settling on parchment, not like CSS. Page transitions: a paper turn (~400ms). State changes on the escrow seal: a quill-stroke animation that fills the next phase. Never bouncy. Never elastic. The product's pace is monastic.

### What this design is NOT

- Not goth. No skulls, no blood, no smoke effects.
- Not crypto. No glowing purple gradients. No 3D coins. No neon.
- Not Czech-tourist-shop. No decorative Czech flags. No stylised astronomical clock. No marionettes.
- Not gamified. No XP bars, no levels, no leaderboards.
- Not a costume. Every ornament must do typographic or informational work. If a fleur-de-lis isn't earning its place, remove it.

---

## Screens

For each screen, render **two artboards**: mobile at 390px, desktop at 1440px. Twelve screens × two viewports = 24 frames. The personal site gets an additional 1920px frame to show the full marginalia.

### 1. Landing / onboarding — *Claim your name in Prague*
A single hero phrase set in Cormorant small-caps. Live ENS-name input (`___.pragueconnect.eth`) as the central element, treated like an inscription chisel. Below: an email/SMS field (Privy-style embedded wallet). No wallet jargon visible. Background: a faint engraved Prague skyline — Charles Bridge silhouette and the castle spires — rendered as parchment marginalia.

### 2. Discovery feed — *the town square*
A vertical stream of offer/request cards, each framed by a delicate cartouche. Each card shows: alchemical category sigil, person's name (ENS in mono), one-line skill, price in Kč with crypto secondary, distance ("Žižkov · 800m"). Filter chips at top render as small stamped wax tags. The whole feed should feel like a notice board pinned with seals.

### 3. Profile / personal site (`username.pragueconnect.eth.limo`) — **the hero artifact**
**Render this twice on desktop:** the in-app authenticated view AND the public web visitor view. Render the public view at 1440px AND additionally at 1920px to show full marginalia.

The public view is an illuminated manuscript leaf: a cartouche masthead inscribed with the user's ENS in display caps, a hand-drawn fleur-de-lis flanking each side, a portrait roundel, a body of bio text in Garamond italic with a decorated dropcap, a "skills offered" section as a stamped catalogue, a wall of completed-task wax-seal receipts. Marginalia along both side margins: alchemical diagrams, a fleur-de-lis, an astrological sigil, a small map of Prague with a pin.

In the masthead: a **"Send a private gift"** button rendered as a small wax-seal stamp, pressable. This triggers the stealth-address payment flow (screen 9).

### 4. Offer / Request composer
Single-column, single-screen on mobile. Title input set in display caps as the user types ("YOU OFFER ___"). Price field with Kč as primary, crypto secondary in mono below. Category chips as alchemical sigils. Privacy toggle styled as a choice between an open seal and a sealed letter. Submit button: a wax-stamp press affordance.

### 5. Private message thread + escrow panel — **the commerce moment**
Mobile: thread fills the screen, escrow panel is a swipe-up sheet. Desktop: thread on the left, escrow panel on the right as a permanent side cartouche.

The escrow panel is the *Magnum Opus* diagram. **Render this screen four times — one for each escrow state — so all four wax seals (Nigredo / Albedo / Citrinitas / Rubedo) are visible.** The thread itself uses Garamond for messages, mono for any quoted ENS name. A small lock-and-fleur indicator at the top: *"this thread is sealed."*

### 6. Reputation receipt / completed task
A formal patent of completion. Centered: the vermilion wax seal with fleur-de-lis impression, off-axis. Above: "BY THIS RECEIPT" in display caps. Body: *"kilian.pragueconnect.eth has completed [task] on [date], rated [stars]."* The stars are not stars — they are five small alchemical sigils filled in proportion to the rating. Footer: an attestation hash in mono, treated as a chiseled inscription line. **This screen should feel like something you'd actually frame.**

### 7. Edit-your-site dashboard — *the secret authenticated view*
Same illuminated-manuscript layout as screen 3, but with edit affordances rendered as quill-and-inkpot icons in `Gilded` next to each editable region. A clear *"you are editing your seal"* banner. Make the **subnames-as-data-shelves** concept legible: a sidebar listing the subname shelves (`bio.x.pragueconnect.eth`, `skills.x.pragueconnect.eth`, `inbox.x.pragueconnect.eth`, `stealth.x.pragueconnect.eth`) each with a small alchemical sigil indicating its data type and a public/private toggle.

### 8. Wallet / earnings — *the ledger*
A leather-bound ledger feel. Recent receipts as a chronological column of small wax-seal entries. Top of page: total earnings in Kč (large display caps), crypto equivalent below in mono. A subtle *"scanning for private gifts…"* status line — this is the stealth-address scanner running silently. When a stealth gift arrives, a quill-stroke animation fills a new wax-seal entry.

### 9. Stealth gift / private payment compose (web only — initiated from screen 3)
Visitor-on-personal-site view. Modal, parchment surface, no wallet jargon. *"Send a gift to kilian.pragueconnect.eth — privately."* Amount in Kč, optional one-line note, send button as a wax-stamp press. Below in small italic Garamond: *"Your gift will reach Kilian without revealing the address it lands at. This is by design."* That single line is the only place "private" or "stealth" is explained — through copy, not jargon.

### 10. PragueConnect Agent dashboard (stretch — optional delegate)
The user's optional delegate agent has its own subname (`agent.kilian.pragueconnect.eth`) and is rendered as a *familiar* — a small line-engraved owl, hawk, or alchemical homunculus. Cards show the agent's scoped permissions (*"may reply to messages under 50 Kč"*, *"may not move funds without approval"*), recent actions, and a single revoke-everything button rendered as a heavy wax-seal break. Agent-authored actions are visually distinct: a thinner, paler ink stroke than human-authored ones.

### 11. System spec sheet (one frame, desktop only)
A single beautifully laid-out reference page showing: full color palette as paint chips on parchment; type ramp with samples; the seven alchemical category sigils in a 2×4 grid; four fleur-de-lis variants; the four escrow-state wax seals at large size; an example cartouche frame; an example marginalia spread. **Treat this page itself as an illuminated leaf.**

### 12. Empty / error / loading states (one frame, both viewports)
Three vignettes:
- Empty discovery feed: *"no offers in your part of Prague yet — be the first."*
- Transaction failure: a broken wax seal with a calm, plain-language Czech-and-English explanation.
- Loading state: a slowly drawing fleur-de-lis.

Localised errors must show both Czech and English. **No hex, no calldata, no `0x…` ever shown to the user.**

---

## Mandatory product cues every screen must communicate

- **Local + Pragocentric.** Real neighbourhoods (Žižkov, Vinohrady, Karlín, Smíchov, Holešovice). Currency: Kč primary, crypto secondary in mono.
- **Reputation is the human's, not the platform's.** It travels with the ENS name. Visible on the profile.
- **Privacy is the default.** Stealth payments don't need an opt-in toggle for the receiver — they're how money arrives. The visitor-side button explains in plain language; the receiver's wallet just says *"200 Kč received."*
- **Escrow is calm, not DeFi.** The Magnum Opus diagram is reverent, not adrenaline.
- **Banned words in copy:** `wallet`, `gas`, `nonce`, `tx`, `hash`, `mint`, `revert`, `network`, `chain`, `address`. Replace with: account, fee (sponsored), receipt, attestation, sealed, returned, ledger, name.
- **Subnames-as-data-shelves** is visible on the edit dashboard (screen 7) and implied on the personal site (screen 3). Make this novel-feeling, not a settings page.

---

## Deliverable

24 mobile + desktop screen pairs (with the personal site getting an extra 1920px frame), the spec sheet, and the three vignettes. Plus a one-paragraph designer's note explaining the Rudolfine concept in three sentences for anyone picking up the file cold.
