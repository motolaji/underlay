# Underlay - Build Log

## Project Status

- Started: ETHGlobal Cannes 2026
- Current phase: Round 3 live app integrations with final demo-safe testnet config
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
  - `VaultManager`: `0x5084c9f845B2BBf4294c08871E18511b3Ffeac0F`
  - `PositionBook`: `0x29141D2762654786734421705F448C0EF4057366`
  - `RiskEngine`: `0x455bb66086Ce4577f8D48f2977e3B7FFdA0ffd27`
  - `SettlementManager`: `0x2d42dbEE0Cb95198015bD086FF293D08a4439c5A`
  - `PositionRouter`: `0x77c59914cB2D313F196f8B1f4813bB79f3FEf28F`

### 2026-04-03 - Faucet-friendly testnet profile

- Updated the testnet config to match faucet-sized liquidity flows
- New testnet values:
  - `maxTVL = 200e6`
  - `minActivation = 20e6`
  - `maxPayout = 8e6`
  - `maxStake = 2e6`
  - `worldIdGate = 3e6` (disabled on testnet demo because `maxStake = 2e6`)
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
  - `active() = true`
  - `totalAssets() = 20000000`
- Updated `app/.env.local` with the current deployed Base Sepolia addresses
- Deployment is live, but the vault is not activated yet because no LP deposit has been made

### 2026-04-03 - Faucet vault activation

- Seeded the final live faucet-mode vault at `0xB0AB723D2e1A5b35d68B2eF8C24e210DF2D13802`
- Seeded the final live faucet-mode vault at `0x5084c9f845B2BBf4294c08871E18511b3Ffeac0F`
- Approved and deposited `20e6` (`20 USDC`) into `VaultManager`
- Verified live vault activation on Base Sepolia:
  - `active() = true`
  - `totalAssets() = 20000000`
  - `withdrawalDelay() = 120`
- The faucet-friendly testnet vault is active and able to accept positions

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

### 2026-04-04 - Quote and positions polish

- Improved cart quote display with per-leg odds, combined odds, stake, payout, and liability headroom
- Added clearer live vault-capacity messaging before bettor submission
- Added gas estimation with buffer for bettor submit and LP write actions to avoid oversized wallet gas defaults
- Added positions summary cards and improved wallet-scoped positions visibility

### 2026-04-04 - Bettor approval hardening

- Fixed the cart approval state so approval amount must match the current stake before auto-submit can trigger
- Added explicit approval status display showing required vs current allowance
- Prevented stale lower approvals from auto-submitting higher-stake positions
- Added buffered gas estimation for ERC-20 approvals in the bettor flow

### 2026-04-04 - World ID root-sync preflight

- Added `POST /api/world-id/verify` to:
  - verify legacy World ID proofs against the Developer Portal API
  - preflight the proof against the Base Sepolia `WorldIDRouter`
  - detect root-sync lag before onchain submission
- Updated `WorldIdVerifyButton` to wait for Base Sepolia root readiness before marking the proof as chain-ready
- Added polling and user-facing status messaging for delayed root sync on Base Sepolia

### 2026-04-04 - Testnet World ID gate exception

- Base Sepolia root sync remained too unreliable for deterministic high-stake demo submission
- Updated testnet config to disable the World ID gate by setting `worldIdGate = 3e6` while `maxStake = 2e6`
- This keeps World ID integration code in the app, but removes the enforced gate from the current testnet deployment
- Mainnet intent remains unchanged: World ID is required above the configured gate

### 2026-04-04 - Final demo-safe redeploy

- Redeployed Base Sepolia with the demo-safe testnet config and seeded the new vault
- Final live deployment is now:
  - `VaultManager`: `0x5084c9f845B2BBf4294c08871E18511b3Ffeac0F`
  - `PositionBook`: `0x29141D2762654786734421705F448C0EF4057366`
  - `RiskEngine`: `0x455bb66086Ce4577f8D48f2977e3B7FFdA0ffd27`
  - `SettlementManager`: `0x2d42dbEE0Cb95198015bD086FF293D08a4439c5A`
  - `PositionRouter`: `0x77c59914cB2D313F196f8B1f4813bB79f3FEf28F`
- Verified demo-safe World ID behavior:
  - `requiresWorldId(1000001) = false`
  - `requiresWorldId(2000000) = false`

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

### 2026-04-04 - Chainlink CRE settlement workflow

- Implemented full `cre-workflow/workflows/settlement/main.ts` using CRE SDK v1.5
  - `EVMClient(BigInt("10344971235874465080"))` for Base Sepolia
  - Reads open positions from `PositionBook.getOpenPositions()` and `getPositionLegs()`
  - Checks resolution via Polymarket Gamma API (`/markets?conditionId={bytes32}`) in node mode
  - Demo override support via `demoOverrides` in config.json
  - Chainlink price feed cross-reference for ETH/BTC markets (Connect the World prize)
  - Batch writes via `SettlementManager.resolveLegs()` using CRE consensus report
- Fixed CRE SDK v1.5 API patterns (runner factory, HTTP response body, consensus aggregation)
- Made `SettlementManager` delays configurable storage vars (not constants):
  - Added `delayLow`, `delayMedium`, `delayHigh`, `challengeExtension` storage vars
  - Added `setDelayConfig()` and `setChallengeExtension()` owner setters
  - Redeployed with demo values: LOW=30s, MEDIUM=60s, HIGH=120s, CHALLENGE=60s
- Updated `contracts/script/Deploy.s.sol` to pass delay values via env vars (defaults to demo values)
- Updated `contracts/test/helpers/Stage2Fixtures.sol` and `contracts/test/SettlementManager.t.sol` for new constructor
- Updated frontend delay labels: cartdrawer shows `~30s` / `~1m` / `~2m`, protocol page shows `30s` / `120s`
- Updated `app/src/lib/constants.ts` `DELAY_CONFIG` to match deployed demo values
- `cre-workflow/`: `npm run build` passes (TypeScript clean)
- Redeployed Base Sepolia addresses (post-configurable-delays redeploy):
  - `VaultManager`: `0x5084c9f845B2BBf4294c08871E18511b3Ffeac0F`
  - `PositionBook`: `0x29141D2762654786734421705F448C0EF4057366`
  - `PositionRouter`: `0x77c59914cB2D313F196f8B1f4813bB79f3FEf28F`
  - `RiskEngine`: `0x455bb66086Ce4577f8D48f2977e3B7FFdA0ffd27`
  - `SettlementManager`: `0x2d42dbEE0Cb95198015bD086FF293D08a4439c5A`

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
- `app`: quote and positions polish build - passed
- `app`: bettor approval hardening build - passed
- `cre-workflow`: settlement workflow TypeScript build - passed (v1.5 SDK patterns)
- `contracts`: configurable-delays SettlementManager redeploy - passed
- `app`: delay label updates (cartdrawer, protocol page, constants) - passed
- `app`: World ID root-sync preflight build - passed
- `contracts`: demo-safe World ID gate config update - passed

## In Progress

- Nothing in progress

## Up Next

### Round 3 - Live integrations

1. Restart the app dev server so it picks up the final live contract addresses
2. Test LP deposit and 2-minute withdrawal flow end-to-end
3. Re-test bettor flow on the new demo-safe deployment without enforced World ID gating
4. Expand position detail rendering with per-leg reads and settlement state
5. Add 0G audit receipt retrieval UI

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

### Wallet project configuration - RESOLVED

- `NEXT_PUBLIC_REOWN_PROJECT_ID` is configured in `app/.env.local`
- Wallet connection is live in the current app build

### 0G configuration - RESOLVED

- `OG_PRIVATE_KEY` set, 3 0G deposited into compute ledger (tx: `0xfb3a88120d91984139f7415766cd39857b6e4f91ce716a94543c61f5b9ebacd0`)
- `/api/og-status` confirmed `configured: true` with live service `qwen/qwen-2.5-7b-instruct`
- Risk engine updated to select any non-image model (Qwen instead of Llama)
- Live AI scoring and 0G Storage audit receipts are now active

### World ID request signing - PARTIAL

- Issue: signed proof requests are configured, but Base Sepolia root sync is not reliable enough for deterministic high-stake demo gating
- Impact: testnet does not enforce the World ID gate in the current demo deployment
- Resolution path: keep World ID integration code for mainnet/richer testnet flows, but use the testnet exception during the hackathon demo

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
  CRE Workflow ID:           [pending — assigned by DON after registration]
  ETH/USD Feed (Base Sep):   0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1
  BTC/USD Feed (Base Sep):   0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298
  Base Sepolia chain sel:    10344971235874465080

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
Base Sepolia Testnet (post-configurable-delays redeploy):
  VaultManager:              0x8b15Df543C616b55C52C7C77016D62a5c38e1B3f
  PositionBook:              0x503141BFF590A16e2a681b3F3c2bB77D538F85e9
  PositionRouter:            0x91fB5bf5A97d0bd334a6eF6dbf51951323De1930
  RiskEngine:                0x80b4Ad1CF2f63420E3c9C656D3bA9CB9Ed1b3172
  SettlementManager:         0xDc4095E361E11Bf92ce2AB59273f587803022F8d

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
