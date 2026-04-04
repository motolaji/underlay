# Underlay - Build Log

## Project Status

- Started: ETHGlobal Cannes 2026
- Current phase: Round 3 live app integrations in progress
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

### 2026-04-03 - Frontend IA and visual redesign

- Split public homepage from product workspace
- Moved the live underwriting experience to `/app`
- Added nested app routes:
  - `app/src/app/app/page.tsx`
  - `app/src/app/app/lp/page.tsx`
  - `app/src/app/app/positions/page.tsx`
- Added redirects from legacy `app/src/app/lp/page.tsx` and `app/src/app/positions/page.tsx`
- Reworked the homepage into a real landing page with `Open App` CTA
- Replaced the warm editorial paper treatment with a lighter off-white, lower-radius, more contemporary product surface system
- Updated fonts to a modern sans-led stack in `app/src/app/layout.tsx`
- Added separate marketing and workspace shells
- Replaced the sticky betslip concept with a closable cart drawer and floating cart dock

### 2026-04-03 - CRE workflow foundation

- Scaffolded `cre-workflow/` as an npm-managed TypeScript package
- Added `cre-workflow/workflow.yaml`
- Added `cre-workflow/workflows/settlement/main.ts`
- Added `cre-workflow/tsconfig.json`

### 2026-04-03 - Stage 2 core contract implementation

- Added `contracts/src/VaultManager.sol`
- Added `contracts/src/PositionBook.sol`
- Added `contracts/src/RiskEngine.sol`
- Added local contract interfaces:
  - `contracts/src/interfaces/IAaveV3Pool.sol`
  - `contracts/src/interfaces/IAToken.sol`
  - `contracts/src/interfaces/IVaultManager.sol`
  - `contracts/src/interfaces/IPositionBook.sol`
  - `contracts/src/interfaces/IWorldID.sol`
- Added `contracts/src/libraries/ByteHasher.sol`
- Expanded `contracts/src/libraries/VaultConfig.sol` with canonical mainnet/testnet config helpers and capacity helpers
- Added Foundry test scaffolding and helpers:
  - `contracts/test/helpers/MockERC20.sol`
  - `contracts/test/helpers/MockAave.sol`
  - `contracts/test/helpers/MockWorldID.sol`
  - `contracts/test/helpers/Stage2Fixtures.sol`
- Added Stage 2 test files:
  - `contracts/test/VaultManager.t.sol`
  - `contracts/test/PositionBook.t.sol`
  - `contracts/test/RiskEngine.t.sol`

### 2026-04-03 - Stage 2 contract verification

- Installed Foundry locally and added contract dependencies:
  - `lib/openzeppelin-contracts`
  - `lib/forge-std`
- Enabled `via_ir = true` in `contracts/foundry.toml` to compile the current contract set cleanly
- Verified Stage 2 contracts with `forge build`
- Verified Stage 2 tests with `forge test -vv`

### 2026-04-03 - Settlement manager implementation

- Added `contracts/src/SettlementManager.sol`
- Expanded `contracts/src/interfaces/IPositionBook.sol` for settlement-facing reads and write hooks
- Updated `contracts/src/PositionBook.sol` to support challenge-driven voiding of pending won positions
- Added `contracts/test/SettlementManager.t.sol`
- Updated Stage 2 fixtures to deploy and wire the real `SettlementManager`

### 2026-04-03 - Position router implementation

- Added `contracts/src/PositionRouter.sol`
- Added routing test helpers in `contracts/test/helpers/MockVaultManagerRouter.sol`
- Added `contracts/test/PositionRouter.t.sol`
- Verified lowest-utilisation routing and vault eligibility behavior

### 2026-04-03 - Live market and risk API integration

- Added `app/src/app/api/markets/route.ts`
- Added `app/src/app/api/risk/route.ts`
- Added `app/src/lib/polymarket.ts`
- Added `app/src/lib/pricing.ts`
- Added `app/src/lib/server/risk-engine.ts`
- Added `app/src/types/market.ts`
- Expanded app DTO and domain types for live market and risk payloads
- Added query hooks:
  - `app/src/hooks/queries/useMarketsQuery.ts`
  - `app/src/hooks/queries/useVaultStateQuery.ts`
- Added `app/src/components/shell/ProtocolStripLive.tsx`
- Wired `app/src/components/markets/MarketBrowser.tsx` to `/api/markets` with preview fallback
- Wired `app/src/components/cart/CartDrawer.tsx` to `/api/risk`, quote calculation, and optional live vault utilization reads
- Expanded `app/.env.example` with contract and 0G environment variables
- Installed server-side 0G integration dependencies in the app workspace

### 2026-04-03 - Gamma event category enrichment

- Enriched `/api/markets` with follow-up `Gamma /events` fetches using embedded event IDs
- Added event/tag-based category normalization before local keyword fallback
- Expanded mixed/macro mappings for weather, shipping, culture, and geopolitics-style markets
- Reduced uncategorized live markets in the current top market slice to zero

## Verification

- `app`: `npm run lint` - passed
- `app`: `npm run build` - passed
- `app`: `npm run typecheck` - passed
- `cre-workflow`: `npm run build` - passed
- `app`: redesigned route map verified in production build output (`/`, `/app`, `/app/lp`, `/app/positions`, `/protocol`)
- `contracts`: `forge build` - passed
- `contracts`: `forge test -vv` - passed (17 tests)
- `app`: live market/risk integration build verified

## In Progress

- Nothing in progress

## Up Next

### Round 3 - Live integrations

1. Wire deployed contract addresses into `app/.env.local`
2. Connect the app workspace to live onchain reads end-to-end
3. Implement World ID frontend verification flow
4. Add 0G audit receipt fetching route/UI
5. Implement CRE settlement workflow logic

## Decisions Locked During Foundation

- Package manager for repo workflows: npm
- Frontend tone: contemporary product UI with strong consumer clarity
- Frontend theme: light off-white base with white surfaces and lower radius
- Homepage structure: real homepage with CTA into `/app`
- App workspace: dedicated `/app` route with closable cart UX
- Sponsor presentation: plain-text capability labels, not logo walls
- Position leg limits should be global config, planned default `1-10`
- Visual system: off-white base, modern fonts, lower radius, contemporary product UI

## Blockers

### Chainlink CRE CLI - BLOCKED

- Issue: `cre` CLI is not installed in the local environment
- Impact: workflow simulation and deployment could not be verified yet
- Resolution path: install the CRE CLI, then run `npm --prefix cre-workflow run simulate`

### Wallet project configuration - BLOCKED

- Issue: `NEXT_PUBLIC_REOWN_PROJECT_ID` is not set
- Impact: wallet connection UI is scaffolded, but AppKit remains disabled until a real project ID is provided
- Resolution path: add the env var in `app/.env.local`

### 0G configuration - PARTIAL

- Issue: `OG_PRIVATE_KEY`, `OG_EVM_RPC`, and `OG_INDEXER_RPC` are not configured locally
- Impact: `/api/risk` compiles and attempts real 0G compute/storage, but falls back to rule-based scoring and local audit hashes when 0G config is absent or unavailable
- Resolution path: add the 0G env vars in `app/.env.local` and re-test the route in a configured environment

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

- [x] `solidity-vault-erc4626.md`
- [x] `solidity-world-id.md`
- [x] `solidity-position-book.md`
- [x] `solidity-aave-v3.md`
- [x] `solidity-settlement.md`
- [x] `foundry-testing.md`
- [x] `foundry-deployment.md`

### Integrations

- [x] `chainlink-cre-workflow.md`
- [x] `polymarket-api.md`
- [x] `0g-compute.md`
- [ ] `0g-storage.md`
- [ ] `worldid-frontend.md`
- [x] `ens-text-records.md`

### Frontend

- [ ] `pricing-formula.md`
- [x] `nextjs-market-browser.md`
- [x] `nextjs-betslip.md`
- [x] `nextjs-lp-dashboard.md`
- [x] `nextjs-position-tracker.md`
