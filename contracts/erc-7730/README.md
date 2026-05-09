# ERC-7730 V2 descriptors

These JSON files describe how a wallet should render Praga's contract calls
to a user, instead of showing raw hex calldata. They follow the
[ERC-7730](https://eips.ethereum.org/EIPS/eip-7730) clear-signing standard.

| File | Contract | Address (Base Sepolia) |
|---|---|---|
| `PragaTip.json` | One-shot stealth gift | `0x44b09471Ece57443FE5b9d350eF3B4f90244AB1b` |
| `PragaEscrow.json` | Four-phase Magnum Opus escrow | `0xcec992ABAfA04cD2F0c89BFAa93bdae3bF9da67F` |

## Why this matters

Without 7730 descriptors, a wallet asking "approve this transaction?" shows
something like:

```
to: 0x44b09471…
data: 0x6dac28b300000000000000000000000018
      cf12d2…0000000000000000000000000000000…
value: 0.001 ETH
```

…which is a phishing-shaped surface. With these descriptors, the wallet
shows:

```
Send a sealed private gift
  Sealed delivery address: 0x18cf…
  A word with it: With thanks for the bicycle.
  Amount: 0.001 ETH
```

The sender now knows exactly what they're signing. For Praga's
privacy-by-design story this is load-bearing: the stealth-recipient address
is the *only* address that should appear on chain, and the descriptor calls
it out by name.

## Submitting upstream

Once Praga is on mainnet (post-hackathon), these files belong in the
[Ledger registry](https://github.com/LedgerHQ/clear-signing-erc7730-registry)
so any 7730-aware wallet (Ledger, MetaMask, Rainbow, Privy/Coinbase Smart
Wallet) picks them up automatically.

The fields excluded from the user-facing UI (`ephemeralPubKey`, `viewTag`)
are protocol plumbing that doesn't need a human label — the descriptor
explicitly hides them via the `excluded` arrays so the prompt stays clean.
