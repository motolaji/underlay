# Underlay

> The first community-owned vault that lets anyone become the house on prediction market positions.

**Demo:** [underlay.vercel.app](https://underlay0.vercel.app/)

---

## What is Underlay?

You know how sportsbooks work. You pick an outcome, place a bet, and if you are right you collect. The sportsbook is always on the other side of your bet — they are the house. They set the odds, they hold the money, and over time the edge is always in their favour.

Prediction markets like Polymarket work similarly but with one big difference — the odds are set by the crowd. When lots of people think something will happen, the price goes up. When they are unsure, it stays in the middle. It is a smarter, more transparent system.

But there is still a problem.

**You can only bet on one thing at a time.**

If you think ETH is going up AND Arsenal is going to win AND the Fed is holding rates — you have to open three separate trades. Three separate positions. Three separate payouts if you are right. There is no way to stack your conviction into one combined trade and collect a compounded return if everything goes your way.

Underlay fixes that.

---

## What Does Underlay Do?

Underlay lets you combine 1 to 10 prediction market outcomes into a single position. Think of it like a parlay in sports betting — but fully onchain, community-owned, and priced transparently.

Here is what happens:

1. You browse live prediction markets (powered by Polymarket data)
2. You pick the outcomes you believe in — crypto prices, sports results, political events, macro data
3. You combine them into one position
4. If all of your picks resolve correctly, your returns compound across every outcome into a significantly higher payout than any single trade would give you
5. If any one of your picks is wrong, the position loses

The more outcomes you combine, the higher the potential payout — and the harder it is to get everything right. That is the tradeoff.

---

## Who Is On The Other Side?

This is where Underlay is different from everything else.

In traditional sportsbooks, a corporation is on the other side of your bet. They control the odds, they hold your money, and they keep the profits.

In Underlay, **the other side is a community liquidity vault.**

Anyone can deposit USDC into the vault and collectively become the house. When traders lose their positions, the stake flows directly into the vault and every depositor's share appreciates automatically. When traders win, the vault pays out.

There is no company in the middle. No centralised bookmaker. Just a smart contract and a community of liquidity providers sharing the risk and the reward.

---

## How Does the Vault Work?

Think of the vault like a shared pot of money that acts as the bookmaker.

When you deposit USDC into the vault:

- You receive share tokens that represent your portion of the vault
- 80% of your deposit automatically goes to Aave (a lending protocol) and earns base yield of around 5-8% APY — even when no trades are happening
- 20% stays in an active reserve ready to pay out winning positions
- When traders lose, their stake sweeps into the vault and your share price goes up automatically — no claiming, no transactions needed
- When traders win, the payout comes from the reserve and share price adjusts accordingly

Your yield comes from two places: the base Aave lending rate on idle capital, and the vig — the built-in edge the protocol has on every position — which flows back to you when traders lose.

The vault has hard limits built in to protect depositors:

- Maximum payout per position is capped — the vault always knows its worst case exposure
- Maximum open liability cannot exceed 40% of the total vault — so the vault can never be overexposed
- Withdrawals have a 24 hour delay — so nobody can exit right before a big settlement and leave other depositors holding the risk

---

## What is the AI Risk Engine?

Every position submitted to Underlay gets scored by an AI risk engine before it is accepted. This protects the vault from positions that look like they have independent outcomes but are actually all correlated.

For example: if you combine ETH going up, BTC going up, and SOL going up into one position — those are not three independent predictions. They all move together with the crypto market. If one goes down, they probably all go down.

The AI catches this. It scores the position for:

- **Correlation** — are the outcomes really independent, or do they tend to move together?
- **Timing risk** — is this position placed suspiciously close to a resolution event, suggesting inside information?
- **Wallet patterns** — has this wallet been winning at a statistically impossible rate, suggesting something is wrong?
- **Market liquidity** — is the prediction market being used deep enough to give reliable odds?

Based on the score, the position gets a risk tier (LOW, MEDIUM, or HIGH) and a corresponding stake limit. Higher risk means a lower maximum stake — not a rejection. The vault adjusts its exposure rather than blocking participation entirely.

Every risk score is stored on 0G Storage with a cryptographic proof, so anyone can verify that their position was assessed fairly and that the risk engine was not manipulated.

---

## What is the Settlement Delay?

When a position resolves, Underlay does not pay out immediately. There is a built-in delay before any funds move.

- LOW risk positions: 15 minute delay
- MEDIUM risk positions: 1 hour delay
- HIGH risk positions: 24 hour delay

Why? Because oracles can be wrong. A market might resolve incorrectly, a data feed might have a flash error, or a result might be disputed. The delay gives the protocol time to verify the result against multiple sources before any money moves.

During the delay, anyone can raise a challenge if they believe the result is incorrect. A challenge extends the window for review. If the result is confirmed correct, the payout executes automatically. If it is wrong, the protocol uses the correct result instead.

This is the same thing a traditional bookmaker's back-office team does — they review suspicious payouts before releasing funds. Underlay just does it transparently and onchain.

---

## What is World ID For?

Underlay uses World ID as a core protocol constraint — not a cosmetic feature.

The problem: one person could create 50 wallets, stake on opposite sides of the same outcome across all of them, and systematically drain the vault regardless of what happens. This is called a sybil attack.

World ID solves this by verifying that the person behind a wallet is a real unique human. Any stake above the threshold requires a World ID proof before the position is accepted. The proof is verified directly in the smart contract — not on a server, not manually — so it cannot be bypassed.

The result: one person, one meaningful position. Coordinated wallet attacks become economically unviable.

---

## How Does Chainlink Fit In?

Chainlink CRE (Runtime Environment) is the orchestration layer for Underlay's settlement process.

When a prediction market resolves on Polymarket, Chainlink CRE:

1. Reads the resolution result from Polymarket
2. Cross-references it against Chainlink price feeds for any crypto-related outcomes (e.g. confirming that ETH really was above $4,000)
3. Calls the Underlay settlement contract with the verified result
4. Triggers the settlement delay

This means no single data source controls the outcome. Results are verified across multiple independent feeds before any funds move.

---

## What is ENS For?

The Underlay AI risk engine has a permanent onchain identity at `riskengine.underlay.eth`.

Anyone can look up this ENS name and see exactly which AI model is scoring positions, what version it is, what parameters it uses, and when it was last updated. This means the risk engine is not a black box. Traders and depositors can verify the agent's configuration onchain at any time.

---

## The Four Vault Types

Underlay launches with four vaults, each with a different risk profile for depositors:

| Vault | Accepts | Risk level |
|---|---|---|
| Mixed | Any combination of outcomes | Balanced |
| Sports | Sports outcomes only | Episodic |
| Crypto | Crypto price outcomes only | Higher correlation |
| Politics | Political and macro outcomes only | Long horizon |

Depositors choose which vault to put their USDC into based on what kind of risk they are comfortable with. Traders do not choose — the protocol automatically routes their position to the right vault based on what outcome categories their legs belong to.

---

## How Odds Are Calculated

Underlay does not use Polymarket's odds directly. It uses them as a reference signal and applies its own formula on top.

The formula adjusts the odds based on:

- **Pool utilisation** — when the vault is heavily used, odds get slightly worse for traders. This protects the vault from being overexposed.
- **Correlation score** — when the AI detects correlated legs, the odds reflect that the outcomes are not truly independent.
- **Vig** — a 5% protocol edge built into every position. This is the source of LP yield over time.

The result is odds that are fair, transparent, and adjusted in real time to protect the community vault. Polymarket going offline does not break the protocol — the formula works with any probability source.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity 0.8.x, Foundry |
| Chain | Base Sepolia + 0G Chain |
| Frontend | Next.js 14, Tailwind CSS, wagmi, viem |
| Wallet | Reown AppKit (WalletConnect) |
| AI inference | 0G Compute (verifiable, cryptographic proof) |
| AI audit trail | 0G Storage |
| Settlement | Chainlink CRE |
| Price verification | Chainlink price feeds |
| Sybil resistance | World ID 4.0 |
| Agent identity | ENS (riskengine.underlay.eth) |
| Base yield | Aave V3 |
| Stablecoin | USDC (Arc) |
| Market data | Polymarket Gamma API |

---

## Smart Contracts

| Contract | What it does |
|---|---|
| `VaultManager.sol` | ERC-4626 vault. Handles LP deposits, share tokens, Aave yield, liability tracking, and payouts. |
| `PositionBook.sol` | Stores every position. Tracks each leg's resolution status independently. Executes loss sweeps and triggers payouts. |
| `RiskEngine.sol` | Verifies World ID proofs. Enforces AI-assigned stake limits. Passes approved positions to PositionBook. |
| `PositionRouter.sol` | Routes positions to the right vault based on outcome categories. Picks the vault with the lowest utilisation for best odds. |
| `SettlementManager.sol` | Receives verified results from Chainlink CRE. Enforces settlement delays. Manages the challenge window. Executes final payouts. |

---

## Deployed Contracts

| Network | Contract | Address |
|---|---|---|
| Base Sepolia | VaultManager | `0x...` |
| Base Sepolia | PositionBook | `0x...` |
| Base Sepolia | RiskEngine | `0x...` |
| Base Sepolia | SettlementManager | `0x...` |
| 0G Testnet | VaultManager | `0x...` |
| 0G Testnet | PositionBook | `0x...` |
| 0G Testnet | RiskEngine | `0x...` |
| 0G Testnet | SettlementManager | `0x...` |

---

## How to Run Locally

### Prerequisites

- Node.js 18+
- Foundry
- Bun (for Chainlink CRE workflow only)

### Clone the repo

```bash
git clone https://github.com/motolaji/underlay
cd underlay
```

### Install contract dependencies

```bash
cd contracts
forge install
```

### Set up environment variables

```bash
cp contracts/.env.example contracts/.env
# Fill in your private key and RPC URLs

cp app/.env.local.example app/.env.local
# Fill in Reown project ID, World ID app ID, etc.
```

### Run the frontend

```bash
cd app
npm install
npm run dev
```

### Deploy contracts (testnet)

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Run Chainlink CRE workflow (requires Bun)

```bash
cd cre-workflow
bun install
cre workflow simulate underlay-settlement
```

---

## Project Structure

```
underlay/
  contracts/              Smart contracts (Foundry)
    src/
      VaultManager.sol
      PositionBook.sol
      PositionRouter.sol
      RiskEngine.sol
      SettlementManager.sol
      interfaces/
      libraries/
        VaultConfig.sol
        Pricing.sol
    test/
    script/

  app/                    Frontend (Next.js 14)
    src/
      app/
        page.tsx          Market browser
        lp/page.tsx       LP dashboard
        positions/page.tsx Position tracker
        api/risk/         AI risk scorer
        api/markets/      Polymarket proxy
      components/
      lib/

  cre-workflow/           Chainlink CRE (Bun)
    workflows/settlement/
      main.ts

  .skills/                AI model skill files
```

---

## Sponsor Integrations

| Sponsor | How it is used |
|---|---|
| **World ID** | Proof of unique human required for stakes above threshold. Verified in smart contract. Prevents sybil attacks on the vault. |
| **World AgentKit** | AI risk engine wrapped as a World ID verified agent — distinguishes human-backed decisions from automated scripts. |
| **Chainlink CRE** | Orchestrates the full settlement flow — fetches Polymarket results, cross-references price feeds, writes to SettlementManager. |
| **Chainlink Price Feeds** | Secondary verification for crypto outcome legs during settlement delay. |
| **0G Compute** | Verifiable AI inference for risk scoring — every assessment has a cryptographic proof. |
| **0G Storage** | Stores risk score audit trail per position — anyone can verify any historical assessment. |
| **0G Chain** | EVM-compatible deployment target for smart contracts. |
| **Arc** | Native USDC settlement throughout — LP deposits, position payouts, Aave yield. |
| **ENS** | `riskengine.underlay.eth` — onchain identity for the AI risk agent with verifiable model config in text records. |
| **Aave V3** | 80% of idle LP capital earns base yield automatically. |
| **Polymarket** | Market data source — live odds via Gamma API, resolution results via UMA oracle. |

---

## Key Design Decisions

**Why a community vault instead of P2P matching?**
P2P matching requires someone to be on the other side of every trade. A vault means the community collectively underwrites all positions, so trades execute instantly without waiting for a match.

**Why is the max payout capped?**
The vault always knows its worst case exposure on any given day. With a hard payout cap, depositors can calculate their maximum risk. Without it, a single high-odds position could wipe the vault.

**Why a settlement delay?**
Oracles can be wrong. Insiders have time-limited information advantages. The delay gives the protocol time to verify results before money moves and lets the crowd catch errors before they become payouts.

**Why World ID instead of just KYC?**
KYC is centralised and creates privacy concerns. World ID uses zero-knowledge proofs — you prove you are a unique human without revealing who you are. The protocol gets sybil resistance without a database of personal information.

**Why use Polymarket odds instead of building our own market?**
Polymarket has billions in volume and highly liquid markets. Their prices represent the best available crowd wisdom on probabilities. Using them as a reference signal means Underlay inherits that liquidity and accuracy from day one instead of building from scratch.

---

## Roadmap

- [ ] Category vaults (Sports, Crypto, Politics) live
- [ ] Permissionless vault creation via governance
- [ ] Mobile app
- [ ] Governance token for vault parameter setting
- [ ] Additional oracle sources (Kalshi, UMA)
- [ ] Collateralised positions — borrow against an open position
- [ ] Leverage as an alternative to clustering for advanced traders

---


## License

MIT
