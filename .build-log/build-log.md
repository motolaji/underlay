# Underlay — Build Log

## How to Use This File

This is the RAG (Retrieval Augmented Generation) log for the Underlay project. It tracks exactly what has been built, what decisions changed from the original plan, and what is next.

Read this file after `_project-context.md` and before starting any task. Update this file every time a component is completed, a decision changes, or a blocker is encountered.

**Format for AI models:** This file is the source of truth for project state. If something is marked DONE, do not rebuild it. If something is marked IN PROGRESS, check the notes before continuing. If something is marked BLOCKED, read the reason before attempting it.

---

## Project Status

**Started:** ETHGlobal Cannes 2026
**Current phase:** Pre-build — planning complete, ready to scaffold

---

## Completed

Nothing built yet. Planning phase complete.

### Planning Decisions Locked

- [x] Project name: Underlay
- [x] Core concept: LP vault as house for multi-outcome prediction positions
- [x] All dollar caps live in VaultConfig struct — no hardcoded values in contracts
- [x] Max payout: configurable — mainnet $1,000 / testnet $100
- [x] Max stake: configurable — mainnet $50 / testnet $5
- [x] Pool max TVL: configurable — mainnet $100,000 / testnet $10,000
- [x] Min activation: configurable — mainnet $20,000 / testnet $2,000
- [x] World ID gate: configurable — mainnet above $20 / testnet above $2
- [x] Max open liability: 40% of pool TVL (fixed ratio, not configurable)
- [x] Aave split: 80% Aave / 20% active reserve (fixed ratio, not configurable)
- [x] Share mechanism: ERC-4626
- [x] Pricing formula: own formula using Polymarket as reference signal
- [x] No traditional database — onchain + 0G Storage only
- [x] Settlement delay: 15min LOW / 1hr MEDIUM / 24hr HIGH
- [x] Chain: Base Sepolia testnet + 0G Chain
- [x] Wallet: Reown AppKit + wagmi + viem
- [x] Framework: Next.js 14 App Router
- [x] Contracts: Foundry (not Hardhat)
- [x] Web3 library: viem (not ethers.js)
- [x] Testnet faucet budget: ~$2,500 USDC across 3-4 wallets

### Sponsor Stack Locked

- [x] World ID 4.0 — stakes above $20 gate
- [x] World AgentKit — risk engine as verified agent
- [x] Chainlink CRE — settlement verification workflow
- [x] Chainlink Price Feeds — crypto leg cross-reference
- [x] Chainlink Confidential HTTP — private risk scoring inputs
- [x] 0G Compute — verifiable AI risk inference
- [x] 0G Storage — risk score audit trail
- [x] 0G Chain — contract deployment
- [x] Arc — USDC stablecoin settlement (stablecoin logic prize)
- [x] ENS — riskengine.underlay.eth agent identity

### Documents Written

- [x] UNDERLAY.md — full project reference document
- [x] .skills/_project-context.md — condensed context for AI models
- [x] .skills/_build-log.md — this file

---

## In Progress

Nothing in progress yet.

---

## Up Next (Ordered)

### Round 1 — Foundation

```
1. Scaffold monorepo structure
   - underlay/ root
   - contracts/ (Foundry init)
   - app/ (Next.js 14 init)
   - cre-workflow/ (CRE init with Bun)

2. Write skill: foundry-setup.md
3. Write skill: nextjs-setup.md
4. Write skill: reown-wagmi-setup.md
```

### Round 2 — Core Contracts

```
5. Write skill: solidity-vault-erc4626.md
6. Write VaultManager.sol
7. Write VaultManager tests

8. Write skill: solidity-world-id.md
9. Write skill: solidity-position-book.md
10. Write PositionBook.sol
11. Write PositionBook tests

12. Write skill: solidity-aave-v3.md
13. Integrate Aave into VaultManager

14. Write PositionRouter.sol
15. Write skill: solidity-settlement.md
16. Write SettlementManager.sol
17. Write full integration tests
```

### Round 3 — Integrations

```
18. Write skill: chainlink-cre-workflow.md
19. Write CRE settlement workflow

20. Write skill: polymarket-api.md
21. Write /api/markets route (Gamma API proxy)

22. Write skill: 0g-compute.md
23. Write skill: 0g-storage.md
24. Write /api/risk route (0G Compute call)

25. Write skill: worldid-frontend.md
26. Integrate IDKit widget in betslip

27. Write skill: ens-text-records.md
28. Set up riskengine.underlay.eth
```

### Round 4 — Frontend

```
29. Write skill: pricing-formula.md
30. Write pricing.ts (client-side formula)

31. Write skill: nextjs-market-browser.md
32. Build market browser page

33. Write skill: nextjs-betslip.md
34. Build betslip component

35. Write skill: nextjs-lp-dashboard.md
36. Build LP dashboard page

37. Write skill: nextjs-position-tracker.md
38. Build position tracker page

39. Build VaultMeter component (liability meter)
```

### Round 5 — Polish and Demo

```
40. Deploy contracts to Base Sepolia
41. Deploy contracts to 0G Chain testnet
42. Configure CRE workflow (simulate or deploy)
43. End-to-end demo test
44. Record demo video
45. Write ETHGlobal submission
```

---

## Decisions That Changed From Original Plan

### Pre-build — VaultConfig Struct (Configurable Parameters)
Original decision: hardcoded $100,000 max TVL, $1,000 max payout, $50 max stake, $20 World ID gate
Changed to: all dollar-value parameters live in VaultConfig struct, set at deployment
Reason: testnet faucet USDC is limited (~$2,500 realistic). Scaled testnet values (10x smaller) allow full demo without hundreds of faucet requests. Mainnet deployment just updates the config. Ratios (40% liability cap, 80/20 Aave split) remain fixed and non-configurable.

---

## Blockers

None currently.

*Use this section to record blockers. Format:*

```
### [Component] — [Status: BLOCKED / RESOLVED]
Issue: ...
Attempted: ...
Resolution: ...
```

---

## Key Addresses and Config

*Fill these in as you get them during setup.*

```
WORLD ID
  App ID:                    [fill in from developer.worldcoin.org]
  Action ID:                 place-position
  World ID Router (Base):    [fill in from docs.world.org]

CHAINLINK
  CRE Workflow ID:           [fill in after deployment]
  ETH/USD Feed (Base):       [fill in from docs.chain.link]
  BTC/USD Feed (Base):       [fill in from docs.chain.link]

0G
  Chain RPC:                 [fill in from docs.0g.ai]
  Compute endpoint:          [fill in from docs.0g.ai]
  Storage endpoint:          [fill in from docs.0g.ai]

ARC
  Chain RPC:                 [fill in from docs.arc.network]
  USDC address on Arc:       [fill in from docs.arc.network]

AAVE V3
  Pool address (Base):       [fill in from docs.aave.com]
  USDC aToken (Base):        [fill in from docs.aave.com]

ENS
  underlay.eth owner:        [deployer wallet]
  riskengine.underlay.eth:   [fill in after registration]

REOWN
  Project ID:                [fill in from dashboard.reown.com]

POLYMARKET
  Gamma API base URL:        https://gamma-api.polymarket.com
  No auth required for read  confirmed
```

---

## Contract Addresses

*Fill these in as contracts are deployed.*

```
Base Sepolia Testnet:
  VaultManager:              [not deployed]
  PositionBook:              [not deployed]
  PositionRouter:            [not deployed]
  RiskEngine:                [not deployed]
  SettlementManager:         [not deployed]
  MixedVault (proxy):        [not deployed]

0G Chain Testnet:
  VaultManager:              [not deployed]
  PositionBook:              [not deployed]
  PositionRouter:            [not deployed]
  RiskEngine:                [not deployed]
  SettlementManager:         [not deployed]
```

---

## Skills Written

*Check off as each skill is written.*

### Foundation
- [ ] foundry-setup.md
- [ ] nextjs-setup.md
- [ ] reown-wagmi-setup.md

### Contracts
- [ ] solidity-vault-erc4626.md
- [ ] solidity-world-id.md
- [ ] solidity-position-book.md
- [ ] solidity-aave-v3.md
- [ ] solidity-settlement.md
- [ ] foundry-testing.md
- [ ] foundry-deployment.md

### Integrations
- [ ] chainlink-cre-workflow.md
- [ ] polymarket-api.md
- [ ] 0g-compute.md
- [ ] 0g-storage.md
- [ ] worldid-frontend.md
- [ ] ens-text-records.md

### Frontend
- [ ] pricing-formula.md
- [ ] nextjs-market-browser.md
- [ ] nextjs-betslip.md
- [ ] nextjs-lp-dashboard.md
- [ ] nextjs-position-tracker.md
- [ ] risk-api-route.md

---

## Notes for AI Models

When you complete a task, update this file:

1. Move the item from "Up Next" to "Completed"
2. Add the completion date
3. Add any relevant notes (gotchas, decisions made during implementation)
4. Fill in any addresses or config values discovered
5. Add any new blockers encountered
6. Tick the skill checkbox if a skill was written

When you start a task, check:

1. Is it already done? Check Completed section
2. Is it blocked? Check Blockers section
3. Has a relevant decision changed? Check Decisions That Changed section
4. Is there a skill for it? Check Skills Written section
5. Are there addresses needed? Check Key Addresses section
