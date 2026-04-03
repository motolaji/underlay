# Underlay - Build Log

## Project Status

- Started: ETHGlobal Cannes 2026
- Current phase: Round 1 foundation complete
- Last updated: 2026-04-03

## Completed

### 2026-04-03 - Canonical repo scaffold

- Added root `UNDERLAY.md`, root `BUILD_LOG.md`, and `.skills/_project-context.md`
- Added foundation skill docs:
  - `.skills/contracts/foundry-setup.md`
  - `.skills/frontend/nextjs-setup.md`
  - `.skills/frontend/reown-wagmi-setup.md`
- Added root helper scripts in `package.json`
- Added root `.gitignore`

### 2026-04-03 - Contracts foundation

- Scaffolded `contracts/` as a Foundry-first project
- Added `contracts/foundry.toml`
- Added `contracts/src/libraries/VaultConfig.sol`
- Added `contracts/src/interfaces/`, `contracts/test/`, and `contracts/script/`
- Locked the fixed ratio validation for `40%` max liability and `20%` reserve inside `VaultConfig.validate`

### 2026-04-03 - Frontend foundation

- Scaffolded `app/` as a Next.js 14 App Router project using npm
- Installed Tailwind, Zustand, React Query, viem, wagmi, Reown AppKit, and required wallet connector peers
- Replaced the default starter UI with an editorial warm-newsprint shell
- Added routes:
  - `app/src/app/page.tsx`
  - `app/src/app/lp/page.tsx`
  - `app/src/app/positions/page.tsx`
  - `app/src/app/protocol/page.tsx`
- Added shared providers, stores, types, preview market browser, and underwriting slip validation scaffold
- Added Reown AppKit + wagmi foundation in `app/src/lib/wagmi.ts` and `app/src/providers/AppProviders.tsx`

### 2026-04-03 - CRE workflow foundation

- Scaffolded `cre-workflow/` as an npm-managed TypeScript package
- Added `cre-workflow/workflow.yaml`
- Added `cre-workflow/workflows/settlement/main.ts`
- Added `cre-workflow/tsconfig.json`

## Verification

- `app`: `npm run lint` - passed
- `app`: `npm run build` - passed
- `app`: `npm run typecheck` - passed
- `cre-workflow`: `npm run build` - passed

## In Progress

- Nothing in progress

## Up Next

### Round 2 - Core contracts

1. Write `VaultManager.sol`
2. Add ERC-4626 vault mechanics and reserve accounting
3. Add tests for config validation and vault lifecycle
4. Write `RiskEngine.sol`
5. Write `PositionBook.sol`
6. Add owner-scoped read methods for frontend receipt rendering

### Round 3 - Live integrations

1. Write `/api/markets` Gamma proxy
2. Write `/api/risk` 0G Compute route
3. Replace preview market data with live market data
4. Add 0G audit receipt fetching
5. Implement CRE settlement workflow logic

## Decisions Locked During Foundation

- Package manager for repo workflows: npm
- Frontend tone: editorial plus consumer
- Frontend theme: warm light newsprint
- Homepage structure: hybrid editorial landing plus live browser
- Homepage priority: protocol credibility first
- Sponsor presentation: plain-text capability labels, not logo walls
- Position leg limits should be global config, planned default `1-10`

## Blockers

### Foundry - BLOCKED

- Issue: `forge` is not installed in the local environment
- Impact: contract compilation, testing, and dependency installation could not be verified yet
- Resolution path: install Foundry, then run `forge build` inside `contracts/`

### Chainlink CRE CLI - BLOCKED

- Issue: `cre` CLI is not installed in the local environment
- Impact: workflow simulation and deployment could not be verified yet
- Resolution path: install the CRE CLI, then run `npm --prefix cre-workflow run simulate`

### Wallet project configuration - BLOCKED

- Issue: `NEXT_PUBLIC_REOWN_PROJECT_ID` is not set
- Impact: wallet connection UI is scaffolded, but AppKit remains disabled until a real project ID is provided
- Resolution path: add the env var in `app/.env.local`

### Network metadata - BLOCKED

- Issue: 0G chain metadata, RPC URLs, and deployed contract addresses are still unknown
- Impact: the app currently scaffolds Base Sepolia-first connectivity only
- Resolution path: fill the chain and address values once available

## Key Config

```text
WORLD ID
  App ID:                    [pending]
  Action ID:                 place-position
  Router (Base):             [pending]

CHAINLINK
  CRE Workflow ID:           [pending]
  ETH/USD Feed (Base):       [pending]
  BTC/USD Feed (Base):       [pending]

0G
  Chain RPC:                 [pending]
  Compute endpoint:          [pending]
  Storage endpoint:          [pending]

AAVE V3
  Pool address (Base):       [pending]
  USDC aToken (Base):        [pending]

REOWN
  Project ID:                [pending]

POLYMARKET
  Gamma API base URL:        https://gamma-api.polymarket.com
```

## Contract Addresses

```text
Base Sepolia Testnet:
  VaultManager:              [not deployed]
  PositionBook:              [not deployed]
  PositionRouter:            [not deployed]
  RiskEngine:                [not deployed]
  SettlementManager:         [not deployed]

0G Chain Testnet:
  VaultManager:              [not deployed]
  PositionBook:              [not deployed]
  PositionRouter:            [not deployed]
  RiskEngine:                [not deployed]
  SettlementManager:         [not deployed]
```

## Skills Written

### Foundation

- [x] `foundry-setup.md`
- [x] `nextjs-setup.md`
- [x] `reown-wagmi-setup.md`

### Contracts

- [ ] `solidity-vault-erc4626.md`
- [ ] `solidity-world-id.md`
- [ ] `solidity-position-book.md`
- [ ] `solidity-aave-v3.md`
- [ ] `solidity-settlement.md`

### Integrations

- [ ] `chainlink-cre-workflow.md`
- [ ] `polymarket-api.md`
- [ ] `0g-compute.md`
- [ ] `0g-storage.md`
- [ ] `worldid-frontend.md`
- [ ] `ens-text-records.md`

### Frontend

- [ ] `pricing-formula.md`
- [ ] `nextjs-market-browser.md`
- [ ] `nextjs-betslip.md`
- [ ] `nextjs-lp-dashboard.md`
- [ ] `nextjs-position-tracker.md`
