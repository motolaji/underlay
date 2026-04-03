# Underlay — Project Context Skill

## How to Use This Skill

Read this file at the start of every new chat before using any other skill or writing any code. It gives you the full context needed to work on any part of the Underlay protocol without re-explaining the project from scratch.

After reading this, check `BUILD_LOG.md` to see what has already been built and what is next.

For deep dives on any decision, read `UNDERLAY.md`.

---

## What Is Underlay

Underlay is a community-owned risk underwriting vault for multi-outcome prediction market positions. It is not a parlay protocol and not a prediction market. It is the infrastructure layer that makes anyone the house.

**One liner:**
> "The first onchain risk vault that lets anyone be the house — AI-scored, sybil-resistant, and community-owned."

**The problem it solves:**
Every prediction market needs a counterparty. Right now that is either a centralised bookmaker or a P2P match. Underlay is the third option — a community vault that underwrites multi-outcome prediction positions with AI-managed risk, transparent exposure limits, sybil resistance, and a verified settlement delay before any funds move.

**What it is NOT:**
- Not a prediction market — we do not create markets, we wrap Polymarket
- Not a parlay front-end combiner — we are vault and risk infrastructure
- Not P2P — the community vault is the counterparty
- Not a fixed APY product — LP yield is variable

---

## The Three Sides

**Bettors** combine 2-4 Polymarket market outcomes into a single multi-leg position. Our AI risk engine scores the position, the vault prices it using our formula, and the bettor stakes USDC. Max stake and max payout are configurable parameters (see VaultConfig). World ID proof is required for stakes above the configured gate threshold. A settlement delay fires after all legs resolve before funds move.

**LPs** deposit USDC into one of four vaults and receive ERC-4626 share tokens. 80% of idle capital auto-deploys to Aave for base yield. 20% stays as active reserve for payouts. When bettors lose, their stake sweeps into the vault and share price appreciates automatically — no distributions, no gas. When bettors win, payout comes from the reserve and share price drops proportionally.

**The protocol** prices every position using our own formula (Polymarket odds are a reference signal not a dependency), scores risk via 0G Compute AI inference, enforces World ID sybil resistance, orchestrates settlement via Chainlink CRE, and stores risk audit trails on 0G Storage.

---

## Core Design Decisions — Non-Negotiable

These decisions are final. Do not suggest alternatives unless explicitly asked.

| Decision | Value | Reason |
|---|---|---|
| Max payout per position | Configurable — mainnet $1,000 / testnet $100 | Pool always knows worst case liability |
| Max stake per position | Configurable — mainnet $50 / testnet $5 | Limits insider extraction |
| World ID gate | Configurable — mainnet above $20 / testnet above $2 | Sybil resistance without friction |
| Aave split | 80% Aave / 20% reserve (fixed ratio) | Reserve covers realistic worst case payouts |
| Max open liability | 40% of pool TVL (fixed ratio) | Hard cap — contract enforces this |
| Max TVL per vault | Configurable — mainnet $100,000 / testnet $10,000 | Scales to faucet availability on testnet |
| Min activation threshold | Configurable — mainnet $20,000 / testnet $2,000 | Pool must reach threshold before accepting positions |
| Settlement delay | 15min / 1hr / 24hr by risk tier | Oracles can be wrong, delay allows verification |
| Pricing | Own formula using Polymarket as signal | Polymarket is swappable, formula is ours |
| LP shares | ERC-4626 | Share price handles yield distribution automatically |
| No traditional DB | Everything onchain or 0G Storage | Fully decentralised, cleaner judge story |
| WalletConnect | Reown AppKit | Already used on ethersite, battle-tested |

### VaultConfig Struct

All dollar-value parameters live in a single config struct set at deployment. This means testnet runs with small numbers and mainnet just updates the config — no contract redeploy needed.

```solidity
struct VaultConfig {
    uint256 maxTVL;          // mainnet: 100_000e6  testnet: 10_000e6
    uint256 minActivation;   // mainnet: 20_000e6   testnet: 2_000e6
    uint256 maxLiabilityBps; // fixed: 4000 (40%)
    uint256 reserveBps;      // fixed: 2000 (20%)
    uint256 maxPayout;       // mainnet: 1_000e6    testnet: 100e6
    uint256 maxStake;        // mainnet: 50e6       testnet: 5e6
    uint256 worldIdGate;     // mainnet: 20e6       testnet: 2e6
}
```

### Parameter Reference Table

| Parameter | Mainnet | Testnet Demo |
|---|---|---|
| Pool max TVL | $100,000 | $10,000 |
| Min activation | $20,000 | $2,000 |
| Max open liability | 40% of TVL | 40% of TVL |
| Max payout | $1,000 | $100 |
| Max stake | $50 | $5 |
| World ID gate | above $20 | above $2 |
| Aave split | 80/20 | 80/20 |
| Max concurrent positions | 40 | 40 |

Testnet faucet need: approximately $2,500 USDC across 3-4 wallets to fully demo all mechanics.

---

## Pricing Formula

```
base_probability   = polymarket_implied_odds
utilisation        = open_liability / pool_tvl
correlation_factor = ai_risk_score  // 0.0 to 1.0
vig                = 0.05           // 5% protocol edge

adjusted_probability = base_probability
                       x (1 + utilisation x 0.3)
                       x (1 + correlation_factor x 0.1)

leg_odds = (1 / adjusted_probability) x (1 - vig)

combined_odds = leg1_odds x leg2_odds x leg3_odds

potential_payout = min(stake x combined_odds, config.maxPayout)
```

---

## Smart Contracts

Five contracts. All written in Solidity 0.8.x. All tested with Foundry.

```
VaultManager.sol
  ERC-4626 vault
  LP deposits and withdrawals
  Aave V3 integration (80/20 split)
  Share token minting and burning
  Liability cap enforcement (40% TVL)
  24hr withdrawal delay

PositionBook.sol
  Accepts multi-outcome positions
  Stores Polymarket market IDs, locked odds, stake, wallet, risk tier
  Tracks leg resolution status independently
  Enforces maxStake and maxPayout from VaultConfig (configurable)
  States: OPEN / PARTIAL / WON / LOST / VOIDED

RiskEngine.sol
  Receives off-chain AI risk score from 0G Compute
  Verifies World ID proof for stakes above $20
  Enforces stake limit from AI assessment
  Writes risk score reference to position

PositionRouter.sol
  Routes positions to eligible vault by category
  Picks lowest utilisation vault (best odds for bettor)
  Mixed positions -> MixedVault only

SettlementManager.sol
  Triggered by Chainlink CRE workflow after resolution
  Enforces settlement delay by risk tier
  Manages challenge window
  Executes payout or sweeps stake to vault
```

---

## Tech Stack

```
Contracts:       Solidity 0.8.x + Foundry
Chain:           Base Sepolia (testnet) + 0G Chain
Libraries:       OpenZeppelin 5.x, Aave V3, World ID, Chainlink

Frontend:        Next.js 14 App Router
Wallet:          Reown AppKit + wagmi + viem
Styling:         Tailwind CSS
State:           Zustand

AI Inference:    0G Compute Network (verifiable, cryptographic proof)
Audit Trail:     0G Storage (risk score history per position)
Settlement:      Chainlink CRE (TypeScript workflow, Bun runtime)

Market Data:     Polymarket Gamma API (no auth, fetched live)
Yield:           Aave V3 (idle LP capital)
Stablecoin:      USDC throughout (Arc for settlement)
Identity:        World ID 4.0 (IDKit + onchain verifyProof)
Agent Identity:  ENS (riskengine.underlay.eth)
```

---

## Pool Structure

Four vaults at launch, all created by the protocol:

```
MixedVault      Any combination of legs (default)
SportsVault     Sports outcomes only
CryptoVault     Crypto price legs only
PoliticsVault   Political / macro outcomes only
```

Each vault has parameters set via VaultConfig at deployment:
- Min activation threshold: $20,000 mainnet / $2,000 testnet
- Max TVL cap: $100,000 mainnet / $10,000 testnet
- Max open liability: 40% of TVL (fixed ratio)
- Max concurrent positions: 40 (fixed)
- Max payout: $1,000 mainnet / $100 testnet
- Max stake: $50 mainnet / $5 testnet

When a vault hits TVL cap, a new one of the same type auto-spawns.

---

## Data Flow

```
ODDS (at position creation):
  Polymarket Gamma API -> frontend -> pricing formula
  -> locked odds stored in PositionBook onchain

RISK SCORE (at position creation):
  Position legs + wallet -> /api/risk (Next.js route)
  -> 0G Compute (AI inference, verifiable)
  -> risk JSON returned -> stored on 0G Storage
  -> content hash stored in position onchain

RESOLUTION (at settlement):
  Polymarket market resolves (UMA oracle)
  -> Chainlink CRE workflow triggers
  -> fetches result via Gamma API
  -> cross-references Chainlink price feed
  -> calls SettlementManager.sol
  -> settlement delay fires
  -> challenge window opens
  -> funds release after delay
```

---

## Sponsor Integrations

Every integration has a specific purpose. Do not skip or mock these in production code.

```
World ID 4.0    verifyProof() in RiskEngine.sol for stakes > $20
World AgentKit  wraps the AI risk engine as a verified agent
Chainlink CRE   settlement verification workflow (TypeScript + Bun)
Chainlink Feeds price feed cross-reference during settlement
0G Compute      AI risk scoring with cryptographic proof
0G Storage      risk score audit trail per position
0G Chain        contract deployment (EVM compatible)
Arc             USDC settlement (stablecoin logic prize)
ENS             riskengine.underlay.eth identity + text records
Reown           wallet connection (AppKit + wagmi)
Aave V3         80% of idle vault capital for base yield
Polymarket      odds reference signal + primary resolution feed
```

---

## Monorepo Structure

```
underlay/
  UNDERLAY.md              Full project reference document
  BUILD_LOG.md             RAG log — what has been built
  .skills/
    _project-context.md    This file — read first
    contracts/             Contract-specific skills
    integrations/          Integration-specific skills
    frontend/              Frontend-specific skills

  contracts/               Foundry project
    src/
      VaultManager.sol
      PositionBook.sol
      PositionRouter.sol
      RiskEngine.sol
      SettlementManager.sol
    test/
    script/
    foundry.toml

  app/                     Next.js 14 frontend
    app/
      page.tsx             Market browser (bettor)
      lp/page.tsx          LP dashboard
      positions/page.tsx   Active position tracker
      api/
        risk/route.ts      AI risk scorer proxy
        markets/route.ts   Polymarket Gamma API proxy
    components/
      MarketCard.tsx
      BetSlip.tsx
      PositionTracker.tsx
      LpDashboard.tsx
      VaultMeter.tsx
    lib/
      contracts/           ABI + deployed addresses
      wagmi.ts             Chain config + client setup
      pricing.ts           Pricing formula (client-side)
      polymarket.ts        Gamma API helpers

  cre-workflow/            Chainlink CRE
    workflows/
      settlement/
        main.ts            Settlement verification workflow
        config.json
    workflow.yaml
```

---

## Key References

| Resource | URL |
|---|---|
| Full project doc | `UNDERLAY.md` in repo root |
| Build log | `BUILD_LOG.md` in repo root |
| Chainlink CRE docs | `docs.chain.link/cre` |
| World ID onchain | `docs.world.org/world-id/id/on-chain` |
| World AgentKit | `docs.world.org/agents/agent-kit/integrate` |
| 0G docs | `docs.0g.ai` |
| Polymarket Gamma API | `gamma-api.polymarket.com/markets` |
| Aave V3 docs | `docs.aave.com/developers` |
| OpenZeppelin ERC-4626 | `docs.openzeppelin.com/contracts/5.x/erc4626` |
| Reown AppKit | `docs.reown.com/appkit` |
| ENS docs | `docs.ens.domains` |
| Foundry book | `book.getfoundry.sh` |

---

## Common Mistakes to Avoid

- Do not use Chainlink Functions or Automation — both deprecated, use CRE
- Do not submit to World MiniKit track — gambling apps excluded
- Do not build Polymarket's CLOB or AMM — we read their API, we do not replicate it
- Do not use a traditional database — everything onchain or 0G Storage
- Do not set a fixed APY for LPs — yield is variable, show rolling averages
- Do not allow withdrawal during high liability — check threshold before processing
- Do not skip the settlement delay — it is a core protocol feature not optional
- Do not hardcode Polymarket as the only odds source — formula must accept any probability
- Do not use Hardhat — use Foundry exclusively
- Do not use ethers.js — use viem exclusively
- Do not hardcode dollar values in contracts — all caps come from VaultConfig struct
- Do not use mainnet values on testnet — testnet config uses scaled down numbers (see Parameter Reference Table)
