# Claude Design Brief V2 — PragueConnect *the Flow*

> Paste verbatim into Claude Design. This brief redesigns the **journey**, not the visual language. The Rudolfine Workshop direction is locked — palette, typography, ornaments, motion language all carry over from V1 (`CLAUDE_DESIGN_PROMPT.md`). Inherit them.
>
> What changes: we now design the product as a **story being told**, mobile-first, with five named onboarding beats and a privacy-first demo storyboard. New screens. New transitions. Bigger emotional swings.

---

## The product, one paragraph (re-stated)

PragueConnect is a peer-to-peer Prague reputation network where your name is a page you own and your address stays yours. **Censorship-Resistant, Open-Source, Private, Secure** — the four properties make a single hallmark we'll call the **CROPS seal**, embossed on every screen as a tiny gilded mark. Identity is an ENS subname (`yourname.pragueconnect.eth`); your personal site is auto-rendered at `yourname.pragueconnect.eth.limo`, served from Swarm; payments arrive privately via stealth addresses.

The user we are designing for: **a digital-nomad / expat already in Prague**, fluent in both web3 and lived-Prague signals. Czech localisation is on by default. The product feels like a guild they were just inducted into.

---

## What this brief adds to V1

V1 designed twelve standalone screens. V2 designs **the seam between them** — the choreography, the copy that lives in transitions, the motion that turns a state-change into a small ceremony. Three load-bearing additions:

1. **The five onboarding beats** — Inheritance → Claim → Inscribe → Republish → Reciprocate. Each is a *named* moment with its own screen sequence, transition, and copy.
2. **The 90-second privacy-first demo storyboard** — four beats from the judge's seat, mocked screen-by-screen including the Basescan-reveal and Swarm-hash moments.
3. **Mobile-first re-think** — the previous brief leaned desktop with marginalia and side-panels. The new flow is designed for a phone first; desktop expands the same gestures into more breathing room. No content lives only on desktop.

---

## Mobile-first laws (apply to every screen)

- **390px is the canonical viewport.** 1440px is the *expanded* viewport, not the primary one.
- **Vertical rhythm over horizontal layout.** Two-column layouts on mobile are forbidden. Side-panels become bottom sheets with a 3px gilded handle. Marginalia disappear; their ornament-weight is absorbed into vertical breathing room.
- **Thumb-zone first.** The single primary action of every screen sits in the lower 40% of the viewport. Wax-stamp press affordances are minimum 56px tall.
- **Copy lengthens vertical, never horizontal.** Long-form Garamond italic gets wider leading, not narrower margins.
- **Two-finger ceremonies.** Where possible, signing or stamping uses a two-finger press-and-hold gesture (rendered as a wax seal pressing in). It feels physical without being gimmicky.
- **Czech and English copy is interleaved**, not toggled. Body in English by default, ceremonial moments in Czech kicker (e.g., *"sealed · zape­četěno"*). LangToggle exists in the navbar but the *Czechness* is felt before it's selected.

Desktop expansion rules: the bottom-sheet becomes a side cartouche; marginalia return; thumb-zone constraints relax. Same DNA, more room to breathe.

---

## The CROPS seal (new ornament — design this first)

A **single gilded hallmark** that appears in the footer of every screen, the way a master's mark would appear on the corner of a manuscript leaf. Four lobes around a central fleur-de-lis. Each lobe = one CROPS property:

- **C** — a stylized open-circuit / broken chain (censorship-resistant)
- **R** — a unfolded scroll with visible fold lines (open-source)
- **O** — a sealed envelope with the wax intact (private)
- **P** — a rampant lion's paw holding a key (secure)

(Letters are mnemonic only; do not show them. Render the four marks engraved.)

Treated as the project's *signature* — small (~24px on mobile, ~32px on desktop), gilded hairline, never coloured. Tapping it opens a brief explainer cartouche (one screen, see "CROPS explainer" below). This is the project's North Star translated into a single visual mark.

---

## The five-beat dream onboarding (storyboard)

Render each beat as a **mobile screen sequence** plus a **desktop equivalent**. Show the transitions between beats explicitly — even if Claude Design renders them as 2-frame "before/after" pairs with a transition note.

### Beat 1 — INHERITANCE
**Where it happens:** the user opens `lucia.pragueconnect.eth.limo` in TG/Signal's in-app browser.

**Screen:** Lucia's full parchment manuscript page, scrollable. Masthead, bio, skills, offers, completed-work seals. **No marketing chrome** — the page IS the marketing. The CROPS seal sits in the footer.

**The pull-tab moment.** When the user scrolls to the foot of Lucia's page, a small parchment slip slides up from the bottom edge — like the corner of a wax-sealed letter peeking out. Inside: *"You were led to this seal by Lucia. Claim your own?"* and a wax-stamp button: *"Inscribe my name."*

**Copy must mention Lucia by name** — the inheritance is *personal*. Never say "sign up."

**Transition to Beat 2:** the parchment slip expands to fill the screen; Lucia's page slides down behind it like a manuscript being closed. Duration: 600ms ease-out.

### Beat 2 — CLAIM
**Screen:** A blank parchment leaf, centered, with a single line waiting to be inscribed: `___.pragueconnect.eth`. Below it: a Privy email input styled as the parchment's signature line. No "sign up" verb anywhere. The CTA is a wax-stamp: *"Press the seal."*

**Mid-claim — the inscription animation (this is the wow moment).** When the user submits, the spinner is *not* a spinner. It is the user's chosen name being **chiseled** into the parchment, letter by letter, in display caps — Cormorant Garamond Small Caps — over 1.8s. Quill-stroke easing, faint ink-bleed when each letter completes. A small fleur-de-lis appears at the start and end of the line. While this happens, three lines of italic Garamond appear below, line-by-line:

> *"the parchment receives the name…"*
> *"the seal is being cut in pragueconnect's ledger…"*
> *"a place on Swarm is being prepared for your hand…"*

This is not a load spinner. This is the user being inducted.

**Render-after state:** the minimal parchment has rendered. *"By the hand of [Name]"*, the CROPS seal in the footer, an open call-to-action that reads: *"Your seal is sealed. Now inscribe your first offer."*

**Transition to Beat 3:** a subtle paper-turn (the parchment lifts at the bottom-right corner, flipping to the next leaf).

### Beat 3 — INSCRIBE (the AI familiar)
**Screen:** A two-element composition. Top half: a small line-engraved owl perched on a quill — the user's *familiar*, their delegated agent. Bottom half: a single-line input with the prompt: *"In one line, what do you know about Prague that a stranger would pay to learn?"*

**The familiar drafts.** When the user submits, the owl tilts its head; ink runs from quill to parchment; **three offer drafts appear, hand-written, in real time**, Garamond italic, with quill-stroke timing. Each draft has a sigil, a one-line description, a price in Kč. Below each: *"keep this offering"* (wax-stamp accept) or *"another"* (re-roll).

**Crucial copy moment** — the running line of italic at the bottom while drafting: *"your familiar drafts under a sealed roof — neither pragueconnect nor anyone else can read this."* This is the only line of "this is private" explanation. It does the work.

**Render the familiar as cinema** — line-engraved bird, dipping its beak to ink, the parchment rippling slightly as ink lands. Mobile-acceptable; desktop adds marginalia of an alchemical text-with-quill diagram in the side margin.

### Beat 4 — REPUBLISH (the second wow)
**Screen:** The same parchment from Beat 2, now showing the user's *full* manuscript — bio (drafted by familiar), three offers in catalogue rows, sigil chips, the CROPS seal in the footer. A small line of mono at the very top of the page: *"published to Swarm · ref bzz:0x14e2…"*

**The transition is the wow.** From Beat 3, the chosen offer ascends and *settles* into the catalogue row of the manuscript — physically, with quill-stroke entry and a faint puff of ink. The page URL is unchanged (`name.pragueconnect.eth.limo`); the manuscript has *grown*. A copy line below: *"the same seal — fuller now. share this leaf with anyone."*

**The share affordance.** A small pull-tab at the foot of the screen: *"copy your seal to Signal"* — copies `name.pragueconnect.eth.limo` plus a one-line invitation in Czech and English. This is how the inheritance loop closes.

### Beat 5 — RECIPROCATE (the privacy moment lands on a gratitude beat)
**Screen:** A small cartouche slides up from the bottom: *"Lucia led you to this seal. Send a thank-you?"* Inside: an amount field (default 100 Kč), a one-line note ("díky za úvod" / "thanks for the intro"), and a wax-stamp button: *"Send privately."*

**Sub-text under the button** (italic, small Garamond): *"Lucia receives the gift. Her name routes to a fresh address that cannot be linked back to her — that is by design. A small share returns to her as a finder's mark."*

**The stealth-tip animation.** Press-and-hold on the wax-stamp. The seal begins to compress, a hairline ring forms around it, the seal presses. **Two parallel paper-strips fold up from beneath** — one larger (95 Kč going to Lucia's stealth address), one smaller (5 Kč as the "sealed-by" finder's mark). They fold into envelopes; both envelopes are sealed simultaneously with wax.

**Receipt screen:** a formal "BY THIS GIFT" cartouche, with two wax seals (the gift, and the finder's mark to Lucia), each on its own line. Mono lines below show the two stealth recipient addresses, each *unrelated* to any visible name. A single closing line: *"sealed · zapečetěno."*

This is the moment the user understands what privacy means in this product without ever seeing the word "stealth."

---

## The 90-second stage demo storyboard (judges' POV)

Render this as a **separate four-frame mobile sequence**. Same fidelity as onboarding screens. These four frames are what the demo video will literally show.

### Frame 0 — set-up (5s, optional pre-roll)
Mobile screen, Lucia's profile already loaded at `lucia.pragueconnect.eth.limo`. Camera shows the parchment, the CROPS seal, the *"send a private gift"* wax-stamp in the masthead. Voiceover line on screen as a kicker: *"Lucia is a translator in Žižkov."*

### Frame 1 — the tip (0–25s)
A finger presses the wax-stamp. Modal slides up: *"Send a gift to lucia.pragueconnect.eth — privately."* Amount field shows 100 Kč. Press-and-hold: stealth animation. Receipt cartouche appears: *"sealed."*

**Visible to camera:** at no point did anyone type or see an address. The entire transaction was name-only.

### Frame 2 — the reveal (25–50s)
**Split-screen mock** (this is the most important frame to design). Left half: the receipt cartouche from Frame 1, with `lucia.pragueconnect.eth` prominent and a wax-seal mark. Right half: a faux-Basescan transaction view — but rendered in our design language, not Etherscan's blue. Show the "to" field as `0x7a3F…2b91` — clearly *not* lucia. A connecting line between the two halves with a gilded crossed-out chain glyph and a one-line italic: *"the name is hers. the address is not."*

This frame is the headline of the entire demo. **Make it gorgeous.**

### Frame 3 — the page on Swarm (50–75s)
Camera pans to Lucia's manuscript, scrolls slowly. The kicker line at top of the page reads: `published to Swarm · bzz:0x14e2…`. A small inset (mobile: bottom-sheet; desktop: marginalia) shows a parchment-styled "browser network tab" — three rows: the HTML, the bzz reference, the *.eth.limo gateway resolving it. Italic line: *"served by the network. cannot be taken down."*

This is where censorship-resistance lands.

### Frame 4 — the closing seal (75–90s)
Full-screen vermilion wax seal with the CROPS hallmark at its center, fleur-de-lis impression, slightly off-axis. Three lines of display caps, centered:

> **CENSORSHIP-RESISTANT**
> **PRIVATE BY DEFAULT**
> **OPEN AS A SEAL**

Below in mono: `pragueconnect.eth`. Footer: a single line of italic — *"a guild for Prague, built in five days for ETHPrague 2026."*

The video ends on this frame held for 4 seconds.

---

## New screens (delta from V1)

V1's twelve screens carry over. Add these five:

### A. Inheritance arrival page (mobile-first variant of Profile)
A redesign of V1 Screen 3 (Profile) viewed *as a stranger arriving from TG*. Difference from V1: the *"claim your own"* pull-tab at the foot. Render at 390px (TG in-app browser), 1440px (desktop browser).

### B. Claim & inscription
A single screen with the `___.pragueconnect.eth` blank line and the inscription animation. Render two states: pre-press, mid-inscription. Mobile + desktop.

### C. The familiar (AI offer drafter)
Owl-on-quill composition. Three drafts appearing. The one-line "drafts under a sealed roof" copy. Render two states: pre-prompt, mid-draft. Mobile + desktop.

### D. Republish transition pair
Two frames showing the manuscript before and after the offer settles into the catalogue. Mobile + desktop.

### E. Reciprocate / finder's-mark stealth tip
The two-paper-strip stealth animation, the dual-receipt cartouche. Mobile + desktop.

### F. CROPS explainer cartouche
A single-screen modal that opens when the CROPS seal is tapped. Four short paragraphs, each headed by one of the four lobe-marks rendered larger. One sentence per property in plain language. Mobile + desktop.

### G. Stage-demo Frame 2 (Basescan reveal)
The split-screen privacy-reveal frame, designed *as a UI mock* (so it can be screenshotted for the demo deck). Mobile only.

### H. Inviter-share card
The OG image / share preview that renders when a user shares `name.pragueconnect.eth.limo` to Signal/TG. Cartouche, the user's name in display caps, three sigils representing their top offers, a small "sealed by [inviter]" line, the CROPS seal. Render at standard OG dimensions (1200×630).

### I. Sealed-by graph (stretch — desktop only)
A small visualization of the inheritance lineage — who introduced whom — rendered as a constellation of fleur-de-lis with hairline gilded edges. The user's own seal is centered; their inviter floats above; people they've invited float below. Hover reveals the relationship. Treats the social graph as a heraldic chart, not a network diagram.

---

## Storytelling devices to use everywhere

### Copy
- **Banned words** (re-stated and expanded): wallet, gas, nonce, tx, hash, mint, revert, network, chain, address, sign up, log in, KYC, decentralized, blockchain, smart contract.
- **Replacements:** seal, press the seal, inscribe, the parchment, the ledger, your hand, your familiar, your finder's mark, sealed, returned, the guild.
- **Czech kickers** appear above ceremonial English — *"zapečetěno · sealed"*, *"po ruce Kiliana · by the hand of Kilian"*, *"do pokladny · into the ledger"*. The Czech is always first; the English is the gloss.
- **Italic Garamond** for any line that the system "says" — instructions, narrations, status. Display caps for nouns the user *does* (CLAIM · INSCRIBE · PRESS · SHARE).
- **No exclamation marks. No emoji. Ever.**

### Motion
- **Quill-stroke easing** — `cubic-bezier(0.32, 0.72, 0.24, 1)`, slightly slower than CSS default. Letters appearing should have a faint ink-bleed terminus.
- **Paper-turn page transitions** — 400ms, the corner curl visible. Used between major beats.
- **Wax-press affordance** — primary buttons are wax stamps. Press-and-hold compresses the seal slightly (4% scale-down, hairline ring forming around the stamp); on release it presses fully and a small wax-spread animation completes the action.
- **Ink-settling state changes** — when a value updates (a balance, a status, a phase), the new value fades in over the old with a faint horizontal ink-spread. Never a number-flip animation.
- **No bounce. No elastic. Nothing crypto-flashy.**

### Sound (optional, design only — no audio in static)
Note in the designer's spec: a single subtle paper-rustle on page transitions, a quill-on-vellum stroke during inscription. Both extremely quiet, optional, off-by-default.

---

## CROPS made visible — where each leg surfaces

| Property | Where it shows in UI |
|---|---|
| **Censorship-Resistant** | Beat 4 line *"published to Swarm · bzz:0x…"*; demo Frame 3; CROPS seal C-lobe |
| **Open-Source** | Footer of every screen: *"sealed by your own hand · forkable · MIT"*. CROPS R-lobe taps to open SPEC.md |
| **Private** | Beat 5 reciprocate flow; demo Frame 2; the "drafts under a sealed roof" line in Beat 3 |
| **Secure** | The wax-seal metaphor itself; ERC-7730 clear-signing in the press-the-seal moment ("sending 100 Kč to lucia.pragueconnect.eth" appears in the wallet's confirmation, not hex) |

Every screen carries the small CROPS hallmark in the footer. The hallmark is the **constant** — every other ornament rotates around it.

---

## Deliverable

For Claude Design to produce:

1. **Onboarding storyboard** — 5 beats × (mobile + desktop) × (before/transition/after where applicable) ≈ **18 frames**.
2. **Stage-demo storyboard** — 4 frames, mobile-only, plus an alternative desktop layout for Frame 2 (the split-screen reveal) ≈ **5 frames**.
3. **New screens A–I** described above × (mobile + desktop unless noted) ≈ **16 frames**.
4. **The CROPS hallmark** at three sizes — 24px (mobile footer), 32px (desktop footer), 96px (closing seal in demo Frame 4). One sheet showing all three plus the four-lobe components isolated and named.
5. **Motion spec sheet** — one frame describing the four motion devices (quill-stroke, paper-turn, wax-press, ink-settling) with timing curves.
6. **Designer's note** — three sentences explaining the storytelling layer to anyone picking up the brief cold. Use the words *guild*, *seal*, *parchment*, and *familiar* at least once each.

**Total: ~40 frames.** Design the seams between them as carefully as the screens themselves. The product is the *journey*, not the page.

---

## What this brief is NOT

- Not a re-skin of V1. The V1 visual language is **kept**.
- Not a feature add. Every new screen serves an existing flow already locked in PLAN.md.
- Not a marketing site. The personal page IS the marketing; we don't need a `/about` or a `/features` page.
- Not desktop-led with a mobile crop. Mobile is the canon; desktop is the breathing room.
- Not crypto-flashy under any circumstance. If a frame would look at home on a DEX, it is wrong.
- Not gamified. No streaks, no XP, no leaderboards. The reputation lives quietly on the parchment.

---

*The product feels like a guild we were just inducted into. Every screen is a leaf in the manuscript. Every transition is a small ceremony. Every wax seal is real.*
