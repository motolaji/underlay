# Underlay - Build Log

## Project Status

- Started: ETHGlobal Cannes 2026
- Current phase: Round 3 live app integrations with faucet-friendly testnet deployment active
- Last updated: 2026-04-04

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

### 2026-04-03 - Deployment readiness scaffolding

- Added `contracts/script/Deploy.s.sol` for Base Sepolia / 0G deployment and wiring
- Added `contracts/script/SeedVault.s.sol` for post-deployment activation seeding
- Added `contracts/.env.example` with deployment env requirements
- Verified deployment scripts compile under Foundry

### 2026-04-03 - Base Sepolia deployment dry-run

- Validated `contracts/.env` for Base Sepolia dry-run requirements
- Ran `forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY -vvvv`
- Dry-run completed successfully with all contracts deploying and wiring in simulation
- Simulated deployment addresses:
  - `VaultManager`: `0x30f7DBCb7Aa533501a8c9dE7827a388083FedbcD`
  - `PositionBook`: `0xba578F4c579718f618A87d401129D55019937A65`
  - `RiskEngine`: `0xf60C93238CA2440dA2CD09E94913ECff9c6ce480`
  - `SettlementManager`: `0x177d0c616828A707b2d60ff8f4f525ac7e8ac859`
  - `PositionRouter`: `0xE12D24d98B4d4187b70BC690444F8F80170fbc8D`
- Estimated required ETH for deployment on Base Sepolia: `0.000113716152`

### 2026-04-03 - Base Sepolia deployment broadcast

- Successfully broadcast `forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast -vvvv`
- Earlier Base Sepolia broadcasts were superseded during testnet profile corrections
- Current Base Sepolia deployment uses faucet USDC and has Aave disabled:
  - `BASE_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e`
  - `BASE_AAVE_ENABLED=false`
- Deployer wallet: `0xA106f5cC202C22930c4eD75B8100Ac2c6481DC5e`
- Latest deployment artifacts written to `contracts/broadcast/Deploy.s.sol/84532/run-latest.json`
- Final live deployment addresses:
  - `VaultManager`: `0xB0AB723D2e1A5b35d68B2eF8C24e210DF2D13802`
  - `PositionBook`: `0x10809a9ed37968FEf36bf73Ce9Aa9A96166D8dc4`
  - `RiskEngine`: `0x163e0D8f3Ae08ad43504bE7F6e153C21f55514Ae`
  - `SettlementManager`: `0x4A318A82eA88a1Ffba82cE342a9D8E64d48C1826`
  - `PositionRouter`: `0xF4101C926C8Fa5Ab8275a4d6ea81c44d04876a54`

### 2026-04-03 - Faucet-friendly testnet profile

- Updated the testnet config to match faucet-sized liquidity flows
- New testnet values:
  - `maxTVL = 200e6`
  - `minActivation = 20e6`
  - `maxPayout = 8e6`
  - `maxStake = 2e6`
  - `worldIdGate = 1e6`
- Updated contract config, frontend constants, deployment env defaults, and docs to match
- Redeployed Base Sepolia contracts with the faucet-friendly profile

### 2026-04-04 - Demo withdrawal delay profile

- Replaced the hardcoded vault withdrawal delay with a deployment-configured immutable
- Base Sepolia testnet now deploys with `TESTNET_WITHDRAWAL_DELAY=120` seconds (`2 minutes`)
- Mainnet intent remains `24 hours` via deployment config
- Updated the LP frontend to explain the shortened hackathon demo delay

### 2026-04-03 - Post-deployment verification

- Verified contract wiring with `cast call`
- Verified the faucet-USDC vault no longer reverts on `totalAssets()`
- Verified final live vault configuration:
  - `asset() = 0x036CbD53842c5426634e7929541eC2318f3dCF7e`
  - `aaveEnabled() = false`
- Verified final demo withdrawal configuration:
  - `withdrawalDelay() = 120`
- Verified current vault state:
  - `active() = false`
  - `totalAssets() = 0`
- Updated `app/.env.local` with the current deployed Base Sepolia addresses
- Deployment is live, but the vault is not activated yet because no LP deposit has been made

### 2026-04-03 - Faucet vault activation

- LP wallet approved faucet USDC to the final live vault
- LP wallet deposited `20e6` (`20 USDC`) into `VaultManager`
- Verified live vault activation on Base Sepolia:
  - `active() = true`
  - `totalAssets() = 20000000`
- The faucet-friendly testnet vault is now active and able to accept positions

### 2026-04-03 - Live LP frontend integration

- Replaced the LP dashboard demo metrics with live onchain reads from `VaultManager`
- Added wallet-scoped share balance, wallet USDC balance, allowance, pending withdrawal, and vault state reads
- Added LP approve and deposit actions against the live Base Sepolia deployment
- Added explicit faucet-mode testnet framing in the app workspace, LP page, and protocol page
- Completed the LP action flow with:
  - optimistic allowance updates after approval
  - immediate transition from approve to deposit without page refresh
  - withdrawal request input and transaction flow
  - withdrawal completion flow via `redeem(...)`
  - live `maxRedeem` / `maxWithdraw` read surfaces and pending-withdrawal status
  - optimistic UI updates after deposit/request/redeem receipts for demo responsiveness

### 2026-04-04 - Frontend visual redesign and theme system

- Replaced warm editorial paper UI with a Bloomberg Terminal / Vercel-inspired system
- Default theme changed to light (white background, dark text) with dark mode toggle
- Dark mode: `#080808` base, `#f0f0f0` primary text
- Fonts updated to Syne (display), Inter (body), DM Mono (mono)
- Dual theme via `:root` / `:root[data-theme="dark"]` CSS custom properties — no hardcoded hex anywhere in components
- Added `ThemeApplicator` client component (localStorage persistence, `data-theme` on `<html>`, no hydration mismatch)
- Added theme toggle (sun/moon SVG) to both `AppNav` and `MarketingNav`
- Added frosted glass blur to navbars (`backdrop-filter: blur(14px)`, semi-transparent `--nav-bg`)
- Removed `max-w-[1240px]` constraint from `.section-shell` — app now stretches full width
- Replaced betslip modal/drawer with a sticky right layout panel in `MarketWorkspace` (360px, `position: sticky, height: calc(100vh - 104px)`)
- Betslip made scrollable with `overflow-y: auto` inside the panel
- Added `animate-slide-in-right` entrance for betslip panel
- Market cards rebuilt as compact always-expanded rows with inline probability bars
- Added globe SVG visual to homepage hero (sphere, latitude/longitude lines, market nodes, pulse rings — all CSS variable colors)
- Replaced scaffolding placeholder copy with real product copy across all pages
- Added audience split section (Bettors / LPs) to homepage with dedicated CTAs
- Badge and metric tokens added to CSS variables for StatusBadge and MetricCard

### 2026-04-04 - 0G integration finalization

- Fixed `ZgFile.fromBuffer` bug — method does not exist in `@0glabs/0g-ts-sdk` v0.3.3; replaced with `new MemData(buffer)`
- Fixed double-path URL bug — `getServiceMetadata` returns `${url}/v1/proxy` as the base; corrected fetch to `${endpoint}/chat/completions` (not `/v1/chat/completions`)
- Updated service selection to match any non-image model (Qwen available on testnet, not Llama)
- Verified `broker.inference.listService()`, `getServiceMetadata()`, `getRequestHeaders()`, `processResponse()` all match v0.7.4 API
- Added `GET /api/og-status` endpoint: returns live compute providers or structured error
- Added `scripts/deposit-og-credits.mjs` for one-off ledger funding (requires 3 0G minimum)
- Deposited compute credits — confirmed `qwen/qwen-2.5-7b-instruct` live on Galileo
- Betslip confirmed showing `source: "0g_compute"` and `0G stored` audit receipt — fully live

### 2026-04-04 - Bettor submit and positions integration

- Added live bettor submission scaffolding to the cart using the deployed `RiskEngine`
- Added:
  - `app/src/lib/contracts/abi/riskEngine.ts`
  - `app/src/lib/contracts/abi/positionBook.ts`
  - `app/src/lib/contracts/adapters/riskEngine.ts`
  - `app/src/components/world/WorldIdVerifyButton.tsx`
  - `app/src/app/api/world-id/context/route.ts`
- The cart now supports:
  - risk-engine USDC approval
  - direct `RiskEngine.submitPosition(...)` transaction submission
  - World ID proof capture path for stakes above the gate
  - transaction success state and positions-link handoff
- The positions page now reads wallet-scoped live position data from the deployed `PositionBook`
- Added app env scaffolding for World ID request context (`NEXT_PUBLIC_WORLD_APP_ID`, `NEXT_PUBLIC_WORLD_ACTION_ID`, `RP_ID`, `WORLD_RP_SIGNING_KEY`)

## Verification

- `app`: `npm run lint` - passed
- `app`: `npm run build` - passed
- `app`: `npm run typecheck` - passed
- `cre-workflow`: `npm run build` - passed
- `app`: redesigned route map verified in production build output (`/`, `/app`, `/app/lp`, `/app/positions`, `/protocol`)
- `contracts`: `forge build` - passed
- `contracts`: `forge test -vv` - passed (17 tests)
- `app`: live market/risk integration build verified
- `contracts`: deployment scripts compile under `forge build`
- `contracts`: `forge test -q` - passed after deployment scaffolding
- `contracts`: Base Sepolia dry-run deployment - passed
- `contracts`: Base Sepolia broadcast deployment - passed
- `contracts`: post-deployment wiring verification - passed
- `contracts`: faucet-friendly redeploy and verification - passed
- `app`: live LP vault page integration build - passed
- `app`: completed LP page interaction flow build - passed
- `app`: bettor submit and positions integration build - passed
- `contracts`: demo withdrawal-delay redeploy - passed

## In Progress

- Nothing in progress

## Up Next

### Round 3 - Live integrations

1. Seed the final live vault `0xB0AB723D2e1A5b35d68B2eF8C24e210DF2D13802` with at least `20e6` faucet USDC
2. Restart the app dev server so it picks up the final live contract addresses
3. Test LP deposit and 2-minute withdrawal flow end-to-end
4. Test live bettor submission flow from the app into `RiskEngine.sol`
5. Expand position detail rendering with per-leg reads and settlement state

### Round 4 - Deployment

1. Seed the deployed vault to cross `minActivation`
2. Record deployed addresses in `app/.env.local`
3. Verify wiring onchain with `cast call`
4. Test the deployed protocol end-to-end with small amounts
5. Implement World ID frontend verification and contract write flow

## Decisions Locked During Foundation

- Package manager for repo workflows: npm
- Frontend tone: contemporary product UI with strong consumer clarity
- Frontend theme: light off-white base with white surfaces and lower radius
- Homepage structure: real homepage with CTA into `/app`
- App workspace: dedicated `/app` route with closable cart UX
- Sponsor presentation: plain-text capability labels, not logo walls
- Position leg limits should be global config, planned default `1-10`
- Visual system: off-white base, modern fonts, lower radius, contemporary product UI
- Testnet profile: faucet-friendly config with `20 USDC` activation
- Base Sepolia demo token: faucet USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Base Sepolia demo yield path: Aave disabled on faucet-sized deployment

## Blockers

### Chainlink CRE CLI - BLOCKED

- Issue: `cre` CLI is not installed in the local environment
- Impact: workflow simulation and deployment could not be verified yet
- Resolution path: install the CRE CLI, then run `npm --prefix cre-workflow run simulate`

### Wallet project configuration - BLOCKED

- Issue: `NEXT_PUBLIC_REOWN_PROJECT_ID` is not set
- Impact: wallet connection UI is scaffolded, but AppKit remains disabled until a real project ID is provided
- Resolution path: add the env var in `app/.env.local`

### 0G configuration - RESOLVED

- `OG_PRIVATE_KEY` set, 3 0G deposited into compute ledger (tx: `0xfb3a88120d91984139f7415766cd39857b6e4f91ce716a94543c61f5b9ebacd0`)
- `/api/og-status` confirmed `configured: true` with live service `qwen/qwen-2.5-7b-instruct`
- Risk engine updated to select any non-image model (Qwen instead of Llama)
- Live AI scoring and 0G Storage audit receipts are now active

### World ID request signing - PARTIAL

- Issue: `WORLD_RP_SIGNING_KEY` is not configured in `app/.env.local`
- Impact: the World ID button renders, but `/api/world-id/context` cannot generate RP-signed proof requests until the signing key is supplied
- Resolution path: add `WORLD_RP_SIGNING_KEY` for the configured `RP_ID`, then verify a >`1 USDC` position flow end-to-end

### Network metadata - BLOCKED

- Issue: 0G chain metadata, RPC URLs, and deployed contract addresses are still unknown
- Impact: the app currently scaffolds Base Sepolia-first connectivity only
- Resolution path: fill the chain and address values once available

## Key Config

```text
WORLD ID
  App ID:                    configured locally
  Action ID:                 place-position
  Router (Base):             0x42FF98C4E85212a5D31358ACbFe76a621b50fC02

CHAINLINK
  CRE Workflow ID:           [pending]
  ETH/USD Feed (Base):       [pending]
  BTC/USD Feed (Base):       [pending]

0G
  Chain RPC (Galileo):       https://evmrpc-testnet.0g.ai
  Storage indexer:           https://indexer-storage-testnet-turbo.0g.ai
  Compute endpoint:          dynamic — resolved via broker.inference.listService()
  Status check:              GET /api/og-status
  Private key:               OG_PRIVATE_KEY (not set — fund at https://faucet.0g.ai)

AAVE V3
  Pool address (Base):       0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27
  USDC aToken (Base):        0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC
  Testnet mode:              disabled on faucet-sized Base Sepolia deployment

REOWN
  Project ID:                [pending]

POLYMARKET
  Gamma API base URL:        https://gamma-api.polymarket.com
```

## Contract Addresses

```text
Base Sepolia Testnet:
  VaultManager:              0xB0AB723D2e1A5b35d68B2eF8C24e210DF2D13802
  PositionBook:              0x10809a9ed37968FEf36bf73Ce9Aa9A96166D8dc4
  PositionRouter:            0xF4101C926C8Fa5Ab8275a4d6ea81c44d04876a54
  RiskEngine:                0x163e0D8f3Ae08ad43504bE7F6e153C21f55514Ae
  SettlementManager:         0x4A318A82eA88a1Ffba82cE342a9D8E64d48C1826

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
