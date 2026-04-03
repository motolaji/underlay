# Underlay Project Context

Read this file before writing code.

## What Underlay is

Underlay is a community-owned underwriting vault for multi-outcome prediction market positions. It is not the market itself. It is the risk and liquidity layer behind it.

## Final decisions

- All dollar caps live in `VaultConfig.Config`
- Max payout: mainnet `1_000e6`, testnet `100e6`
- Max stake: mainnet `50e6`, testnet `5e6`
- World ID gate: mainnet `20e6`, testnet `2e6`
- Pool max TVL: mainnet `100_000e6`, testnet `10_000e6`
- Min activation: mainnet `20_000e6`, testnet `2_000e6`
- Max open liability: `40%` of TVL
- Reserve split: `20%`
- Aave split: `80%`
- LP shares are `ERC-4626`
- Settlement delays are `15m / 1h / 24h` by risk tier
- No traditional database
- Foundry only, not Hardhat
- `viem` only, not `ethers.js`
- Wallet stack is Reown AppKit plus wagmi
- Frontend uses Next.js 14 App Router and Tailwind
- USDC always uses 6 decimals

## Stack

- Contracts: Solidity 0.8.x, Foundry, OpenZeppelin 5.x
- Frontend: Next.js 14 App Router, Tailwind, Zustand, viem, wagmi
- Wallet: Reown AppKit
- Identity: World ID 4.0
- Risk: 0G Compute
- Audit trail: 0G Storage
- Settlement: Chainlink CRE
- Yield: Aave V3
- Market signal: Polymarket Gamma API

## Initial project layout

```text
underlay/
  BUILD_LOG.md
  UNDERLAY.md
  .skills/
    _project-context.md
    contracts/
    frontend/
    integrations/
  contracts/
  app/
  cre-workflow/
```

## Frontend direction

- Tone: editorial plus consumer
- Theme: warm light newsprint
- Home route: hybrid editorial landing plus live browser
- Prioritize protocol credibility before user action
- Show sponsor capabilities as plain text, not logo walls

## Data boundaries

- Onchain holds the canonical position and vault state
- 0G Storage holds risk receipts and audit payloads
- Frontend local state holds only draft slip state
- No traditional DB or indexer is assumed during foundation work

## Foundation goals

- Canonical docs in the repo root
- Foundry-first contracts scaffold
- Next.js frontend scaffold with wallet and state foundation
- CRE workflow scaffold using npm scripts and TypeScript
- Build log updated after each round
