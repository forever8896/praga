# PRD — End-to-End ENS-Native Privacy

## Goal

Make PragueConnect's stealth/privacy story actually hold up under chain analysis,
end-to-end, while staying within ETHPrague hackathon scope. The result lands
us as a strong contender for ENS Bounty 2 ("Most Creative Use of ENS") by
weaving together five distinct ENS primitives in service of a single coherent
privacy narrative.

## Why this exists

The current shipping state has good intentions but two structural leaks:

1. **`addr()` is static.** External ENS resolution
   (MetaMask, Rainbow, Etherscan) returns the user's plain EOA. Stealth
   only happens inside `tip-form.tsx` — i.e., for senders using our own UI.
   Every other path bypasses privacy entirely.

2. **Escrow is publicly linkable.** `PragueConnectEscrow.sol` checks
   `msg.sender == t.worker` on accept/deliver/release. That forces the
   worker's main EOA onto the chain in three separate txs per task, and
   the accept tx publicly binds `worker_eoa ↔ stealthRecipient` in one
   move. The "stealth payout" is theatre once the accept tx hits.

In short: today, the only flow that delivers actual on-chain privacy is
the Tip flow. ENS resolution and Escrow flows leak fully.

## Solution overview

Five concurrent moves, in priority order:

1. **CCIP gateway returns a fresh stealth address per `addr()` call**, so
   any ENS-aware client becomes a stealth-payment rail with zero
   sender-side change.
2. **An auth-gated bulletin** records ephemeral pubkeys per resolution so
   the recipient can scan and sweep.
3. **Per-user smart-account vault**, address encrypted into an ENS text
   record, decryptable only by the user's stealth viewing key.
4. **Sig-based escrow contract redeploy** so the worker's identity lives
   in cryptography, not in `msg.sender`.
5. **Self-custody affordance** — surface Privy's `exportWallet()` and
   confirm wallet-login users are already self-custodied.

Item 5 is partial — wallet sign-in is already shipped (commit `1817f4e`).

## Phases & files

### Phase 1 — Rotating `addr()` + bulletin (~2 hrs)

**Touch:** `web/app/api/ccip/[sender]/[data]/route.ts`,
new `web/lib/stealth-bulletin.ts`.

In the `SELECTORS.addr` and `SELECTORS.addrMulticoin` (when `coinType == 60`)
branches of the gateway, when the resolved record has both
`text_records["stealth-rotate-addr"] == "true"` and a valid
`stealth-meta-address`:

- Call `paymentAddress(metaAddress)` from `web/lib/stealth.ts` server-side
  per request (pure secp256k1 — runs in Node).
- Append `{ stealthAddress, ephemeralPubKey, viewTag, ts }` to a KV-backed
  bulletin keyed `pc:stealth:<domain>:<name>` (rolling cap of 200).
- Return the stealth address as the `addr()` answer.

Drop `TTL_SECONDS` from `600` to `120`. The signed-response TTL becomes
the natural rotation cadence — wallets that cache the response for two
minutes don't spam-rotate during a single send flow, but a fresh client
two minutes later sees a new address.

For users without `stealth-rotate-addr=true`: no change. Static EOA, as
today. Zero migration risk for existing users.

**Done when:** `curl -s
https://www.pragueconnect.xyz/api/ccip/<resolver>/<encoded-addr-call>.json`
twice in a row returns two different decoded addresses.

### Phase 2 — Opt-in toggle + visible proof (~1 hr)

**Touch:** `web/lib/edit-form.tsx`, `web/lib/onboarding-form.tsx`,
`web/app/[ensName]/page.tsx`, `web/lib/swarm.ts`.

- Add a checkbox in `edit-form.tsx` next to the existing stealth-meta UI
  that writes `stealth-rotate-addr=true`. Default ON for new users in
  `onboarding-form.tsx` (they're already deriving a meta-address — they
  want privacy).
- Profile page badge: visible "stealth: rotating" indicator.
- Live-rotation widget on the profile: a small client-side panel that
  polls public RPC for `addr(node)` every 5 seconds and shows the
  address ticking. Visible proof of rotation even when MetaMask caches.
- Mirror the badge into the Swarm-rendered profile in `swarm.ts`.

### Phase 3a — Sig-based escrow redeploy (~4-5 hrs)

**Touch:** `contracts/src/PragueConnectEscrow.sol` (rewrite),
`contracts/script/`, `web/lib/escrow.ts`, `web/lib/escrow-panel.tsx`.

Drop `msg.sender == t.worker` everywhere. Replace with EIP-712 typed
signatures from the worker's spending key. Anyone can submit the tx;
the contract verifies the signature against a registered worker pubkey
hash committed at fund time.

New ABI shape (sketch):

```solidity
struct Task {
    address funder;
    bytes32 workerKeyHash;   // commit(spendingPubKey)
    uint96 amount;
    uint40 deliveredAt;
    Phase phase;
    address stealthRecipient;
    bytes ephemeralPubKey;
    bytes1 viewTag;
}

function fund(bytes32 taskId, bytes32 workerKeyHash) external payable;
function acceptWithSig(
    bytes32 taskId,
    address stealthRecipient,
    bytes calldata ephemeralPubKey,
    bytes1 viewTag,
    bytes calldata workerSig          // EIP-712 over (taskId, action="accept", stealthRecipient, ephemeralPubKey, viewTag)
) external;
function deliverWithSig(bytes32 taskId, bytes calldata workerSig) external;
function releaseWithSig(bytes32 taskId, uint8 rating, bytes calldata workerOrFunderSig) external;
```

Result: **no Alice-EOA appears anywhere in the on-chain trail.** Alice
signs intents in her browser; Lucia or a tiny relayer endpoint we host
submits them. `TaskFunded` event emits `workerKeyHash`, not `worker`
address. The link between Alice's ENS name and any on-chain identifier
exists only in the off-chain bulletin / encrypted text record.

Redeploy targets Base mainnet (chain `8453`) and Base Sepolia
(chain `84532`). Update `web/lib/env.ts` with the new escrow address.

Front-end rewire in `escrow-panel.tsx`:
- Worker actions become "sign intent" + POST to relayer.
- Relayer endpoint (new `web/app/api/escrow-relay/route.ts`) holds a
  small gas-funded EOA that submits txs on behalf of users. Optional —
  Lucia can also be the submitter for accept/deliver if she's online.

### Phase 3b — Vault + sweep + key-custody panel (~3 hrs)

**Touch:** `web/lib/wallet-view.tsx` (extend),
new `web/lib/vault.ts`, `web/lib/stealth.ts` (additions),
new `web/app/api/stealth/bulletin/route.ts`.

Three stacked panels in `/wallet`:

**Private receipts.** Pulls bulletin via auth-gated
`GET /api/stealth/bulletin` (owner-only via `verifySession` from
`privy-server.ts`, plus the requester's address must match `record.address`).
Also pulls on-chain ERC-5564 announcements from the escrow announcer
contract `0x55649E01B5Df198D18D95b5cc5051630cfD45564`. For each unswept
entry: derive spending privkey via FluidKey, read on-chain balance, list
non-empty stealth addresses with a Sweep button.

**Vault.** Counterfactual minimal 4337 smart account. Deploy on first
spend, not first sweep — keeps idle users free. Vault address stored as
ECIES ciphertext in text record `vault-encrypted`, encrypted to the
user's stealth viewing pubkey. Anyone can read the ciphertext from the
public resolver; only the user can decrypt.

Hybrid behaviour (the "B+A" mode):
- **Tiny balances stay where they are.** If the user owes 0.001 ETH and
  has a stealth address with that, spend goes from the stealth directly,
  to the recipient's rotating addr(). No vault touch.
- **Larger consolidations go to vault.** Above a configurable threshold
  (~$50 default), wallet offers "Move to vault." Aggregation cost
  concentrated to a single deliberate action.

**Spend from vault.** Recipient field accepts an ENS name → resolves
through rotating addr() → vault sends. On-chain trail:
`vault → recipient's fresh stealth`. Both endpoints are one-time
addresses; only the bulletins/encrypted-records know who's behind each.

**Key custody.** Conditional on `wallet.walletClientType`:
- **Embedded** (email/Google login): "Take custody of your stealth keys"
  cartouche calling Privy's `exportWallet()`. Copy explains:
  "Your stealth keys are derived from this wallet's signature.
  Once exported into MetaMask or a hardware wallet, your privacy
  doesn't depend on us or Privy."
- **External** (MetaMask/Rainbow/Coinbase/Rabby): "You're already
  self-custodied" — confirms the trust model, no export button.

### Phase 4 — On-chain anchoring (optional, ~1 hr)

**Touch:** `web/lib/stealth-bulletin.ts`,
new `web/app/api/stealth/anchor/route.ts`.

"Anchor on-chain" button in the wallet view. Batches recent bulletin
entries into one ERC-5564 `announce()` call so the bulletin's history
becomes provable on-chain without trusting our gateway. Brings parity
between the off-chain bulletin (cheap rotations) and the on-chain
announcer (escrow releases, anchored snapshots).

## Demo script (90 seconds)

1. Open `pragueconnect.xyz/alice.pragueconnect.eth`. Show "stealth: rotating" badge.
   Live-rotation widget shows the addr() answer ticking.
2. In MetaMask: Send → `alice.pragueconnect.eth` → resolves to `0xAAA…`.
   Refresh, retype → `0xBBB…`. Different.
3. Send 0.001 ETH to `0xBBB…`.
4. Switch to Alice's session. Open `/wallet`.
   "Private receipts: 0.001 ETH at 0xBBB" → Sweep to vault → vault balance ticks up.
5. From vault: Send 0.0005 ETH to `bob.pragueconnect.eth`. Resolves to bob's `0xCCC…`. Vault sends.
6. Etherscan trail: `sender → 0xBBB → vault → 0xCCC → bob's main wallet`.
   Both endpoints one-time. The link to either ENS name exists only off-chain.
7. Open the Escrow flow: Lucia hires Alice for 0.005 ETH.
   Etherscan shows `lucia_eoa → escrow → stealthRecipient`.
   No `alice_eoa` anywhere. Alice's accept/deliver/release are sig-relayed.

## Why this hits the bounty

Five ENS primitives stacked:

1. **CCIP-Read offchain resolution** with cryptographic guarantees
   (already shipped, deepened by rotation logic).
2. **Stealth addresses (EIP-5564) auto-rotated per resolution** —
   directly hits the bounty's example bullet.
3. **Subnames as access tokens / referral chains** — invite-code system,
   `sealed-by` finder's-mark.
4. **`contenthash` + Swarm-served decentralised personal sites**
   (already shipped).
5. **Encrypted credentials in text records** — vault address as ECIES
   ciphertext, decryptable only by the name's owner.

The pitch line:

> Names resolve to fresh addresses. Funds land at one-time addresses.
> Vaults live encrypted in text records, decryptable only by the name's
> owner. Escrows route through stealth on both ends. ENS is the only
> thing tying the system together — and it leaks nothing publicly.

## Trade-offs and known issues

- **Wallet ENS-resolution caching.** MetaMask caches resolutions for
  hours; live-rotation widget on profile is the demo workaround.
- **Bulletin auth.** Hard rule: bulletin reads are owner-only via
  `verifySession`. Anything else leaks more than today.
- **Sweep gas chicken-and-egg.** Stealth addresses arrive without gas
  for sweeps. For hackathon: sender-deposited cushion or vault-funded
  sweep. Paymaster is post-hackathon.
- **Anonymity set is small.** With <50 vaults, on-chain pattern
  matching can identify "PragueConnect vaults." Document honestly:
  anonymity scales with users.
- **Vault deployment cost.** Counterfactual deployment (deploy on first
  spend, not first sweep) keeps idle users free; first spend pays
  ~30k gas extra.
- **Privy as authenticator, not key custody.** Email/Google login means
  Privy gates access to the embedded wallet. Stealth keys are derived
  from a deterministic signature, so users can export to MetaMask and
  the chain becomes self-custodied. Wallet-login users are
  self-custodied from day one.
- **Escrow relayer is a hosted EOA.** The hackathon-grade relayer is a
  small gas-funded EOA we run. v2 uses 4337 bundlers + paymasters.

## Out of scope (explicitly named so judges see we thought about it)

- ZK reputation proofs over rated escrow commitments. The contract
  already emits a `commitment = keccak256(stealthRecipient, taskId, rating)`;
  proving "I have N commitments rated ≥ M" via Semaphore / Noir is
  v2.
- Privacy Pools integration. Stronger anonymity but heavier integration,
  fixed-denomination friction, association-set compliance work.
  Mentioned as alternative aggregation primitive; not built.
- Cross-chain stealth (ENSIP-9 / -11). Gateway only handles cointype 60
  meaningfully today.
- DNSSEC-imported names.

## Phasing & timeline

| Phase | Scope | Estimate | Demo-critical? |
|---|---|---:|---|
| P1 | Rotating addr() + bulletin | 2h | yes |
| P2 | Opt-in toggle + profile badge + live widget | 1h | yes |
| P3a | Sig-based escrow redeploy + UX rewire | 4-5h | yes |
| P3b | Vault + sweep + key-custody panel | 3h | yes |
| P4 | On-chain anchoring | 1h | no |

**Total:** ~11-12 hours for the full demo.

**Minimum viable demo:** P1 + P2 + P3b (no escrow redeploy). Document the
escrow leak in the README under "known limitations." Judges will respect
the honesty more than a hand-waved fix.

**Recommended path:** P1 → P2 → P3a in parallel with P3b → P4 if time
remains. P3a and P3b are independent of each other (different files,
different concerns) and can be developed in parallel by separate
agents/sessions.

## Verification checklist

- [ ] Curl `/api/ccip/...` twice → different decoded addresses.
- [ ] `cast call <resolver> 'addr(bytes32)' <namehash>` from a fresh
      RPC client outside any TTL window → different from the previous
      call.
- [ ] User without `stealth-rotate-addr=true` resolves to static EOA,
      identical to pre-deploy.
- [ ] Bulletin endpoint returns 401 for non-owner requesters.
- [ ] Sweep tx successfully moves funds from stealth → vault on
      Base Sepolia.
- [ ] Vault `vault-encrypted` text record decrypts only with the
      user's stealth viewing privkey.
- [ ] Escrow `fund()` → `accept()` → `deliver()` → `release()` flow
      completes with no `worker_eoa` address in any event log.
- [ ] Privy email-login user can click "Export wallet" and get the
      embedded privkey; same user logs into MetaMask with that key,
      re-derives identical stealth keys.

## Open questions

- **Relayer hosting.** Vercel functions are fine for the demo, but a
  hosted relayer EOA needs gas top-ups. Reuse the faucet-drip wallet?
- **Vault factory address.** Use an existing 4337 factory (Biconomy /
  ZeroDev), or deploy a minimal one ourselves? Lean toward existing —
  one less contract to audit/deploy.
- **Encryption scheme for `vault-encrypted`.** ECIES against the
  stealth viewing pubkey is the obvious choice (we already have the
  key). Alternative: encrypt to the spending pubkey instead — viewing
  privkey is shared with anyone you want to give "see my receipts"
  access to, so encrypting vault location to spending key keeps it
  strictly tighter.
