# Underlay Project Context

Read this file before writing code.

## What Underlay is

Underlay is a community-owned underwriting vault for multi-outcome prediction market positions. It is not the market itself. It is the risk and liquidity layer behind it.

## Final decisions

- All dollar caps live in `VaultConfig.Config`
- Max payout: mainnet `1_000e6`, testnet `8e6`
- Max stake: mainnet `50e6`, testnet `2e6`
- World ID gate: mainnet `20e6`, testnet demo deployment disabled (`3e6 > maxStake`)
- Pool max TVL: mainnet `100_000e6`, testnet `200e6`
- Min activation: mainnet `20_000e6`, testnet `20e6`
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
- Global position leg rules are config-driven and currently planned as min `1`, max `10`
- Frontend and client-side web3 use `viem` only
- If a server-side SDK requires `ethers`, keep it isolated to server-only integration files

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

- Tone: contemporary product UI with strong consumer clarity
- Theme: light off-white base with white surfaces, lower radius, and sharper system surfaces
- Public routes:
  - `/` = real homepage
  - `/protocol` = public mechanics and trust page
- App routes:
  - `/app` = underwriting workspace
  - `/app/lp` = LP vault operations
  - `/app/positions` = position ledger
- The homepage is not the live market workspace
- The underwriting flow lives inside `/app`
- The betslip behaves like a closable cart or drawer, not a permanently fixed right rail
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
