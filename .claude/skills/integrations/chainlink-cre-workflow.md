# Skill: Chainlink CRE Settlement Workflow

## When to Use This Skill
Use when building the Chainlink CRE workflow in cre-workflow/workflows/settlement/main.ts. This workflow is the settlement verification backbone — it fetches Polymarket resolution, cross-references with Chainlink price feeds, and calls SettlementManager.sol. Read _project-context.md first.

## Context
Chainlink CRE (Runtime Environment) is the orchestration layer for our settlement flow. It runs on a Decentralised Oracle Network (DON) with Byzantine Fault Tolerant consensus. We use TypeScript SDK compiled to WASM via Bun. The workflow can be simulated locally with `cre workflow simulate` — Chainlink team deploys it to live CRE network during the hackathon if simulation succeeds.

Key prize: "Best workflow with Chainlink CRE" — up to $4,000. Qualification: simulate OR deploy. Also targets "Connect the World" ($1,000) via price feeds making state changes onchain. And "Privacy Standard" ($2,000) via Confidential HTTP for AI risk inputs.

IMPORTANT: Do NOT use Chainlink Functions or Automation — both deprecated. CRE only.

---

## Setup

```bash
cd underlay
mkdir cre-workflow && cd cre-workflow

# Install Bun (required — CRE does not support Node)
curl -fsSL https://bun.sh/install | bash

# Install CRE CLI (after account approval at app.chain.link/cre/discover)
# CLI download link sent to email

# Initialise CRE project
cre init
# Choose: TypeScript, name: "underlay-settlement"

cd underlay-settlement
bun install
```

---

## Project Structure

```
cre-workflow/
  workflows/
    settlement/
      main.ts          Main workflow logic
      config.json      Staging config
      config.prod.json Production config
  workflow.yaml        CRE project manifest
  package.json
  tsconfig.json
```

---

## workflow.yaml

```yaml
specVersion: v1
workflows:
  - name: underlay-settlement
    settingsFile: workflows/settlement/config.json
    workflowFile: workflows/settlement/main.ts
```

---

## workflows/settlement/config.json (staging)

```json
{
  "schedule": "*/2 * * * *",
  "polymarketGammaUrl": "https://gamma-api.polymarket.com",
  "settlementManagerAddress": "0x...",
  "chainSelector": "10344971235874465080",
  "ethUsdFeedAddress": "0x...",
  "btcUsdFeedAddress": "0x...",
  "evms": [
    {
      "chainSelectorName": "BASE_SEPOLIA",
      "contractAddress": "0x..."
    }
  ]
}
```

---

## workflows/settlement/main.ts

```typescript
import {
  Runner,
  handler,
  cre,
  consensusIdenticalAggregation,
  type Runtime,
  type NodeRuntime
} from "@chainlink/cre-sdk"
import { z } from "zod"
import { encodeFunctionData, parseAbi } from "viem"

// --- Config Schema ---
const configSchema = z.object({
  schedule: z.string(),
  polymarketGammaUrl: z.string(),
  settlementManagerAddress: z.string(),
  chainSelector: z.string(),
  ethUsdFeedAddress: z.string(),
  btcUsdFeedAddress: z.string(),
  evms: z.array(z.object({
    chainSelectorName: z.string(),
    contractAddress: z.string()
  }))
})

type Config = z.infer<typeof configSchema>

// --- SettlementManager ABI (minimal) ---
const SETTLEMENT_ABI = parseAbi([
  "function resolvePosition(bytes32 positionId, bool[] outcomes) external",
  "function getOpenPositions() external view returns (bytes32[])",
  "function getPositionLegs(bytes32 positionId) external view returns (tuple(string marketId, uint8 outcome, uint256 resolutionTime)[])"
])

// --- Main Entry Point ---
export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}

function initWorkflow(config: Config) {
  // Cron trigger — runs every 2 minutes to check for resolved markets
  const cronTrigger = cre.triggers.cron(config.schedule)

  return [
    handler(cronTrigger, (runtime: Runtime<Config>) =>
      settlementWorkflow(runtime, config)
    )
  ]
}

// --- Core Settlement Workflow ---
async function settlementWorkflow(
  runtime: Runtime<Config>,
  config: Config
): Promise<string> {

  runtime.log("Underlay settlement workflow triggered")

  // Step 1: Get open positions from SettlementManager
  const openPositions = await getOpenPositions(runtime, config)

  if (openPositions.length === 0) {
    runtime.log("No open positions to check")
    return "no_positions"
  }

  runtime.log(`Checking ${openPositions.length} open positions`)

  // Step 2: For each position, check if all legs have resolved
  const resolutions = await Promise.all(
    openPositions.map(positionId =>
      checkPositionResolution(runtime, config, positionId)
    )
  )

  // Step 3: Resolve positions where all legs are settled
  const toResolve = resolutions.filter(r => r.ready)

  if (toResolve.length === 0) {
    runtime.log("No positions ready for settlement")
    return "none_ready"
  }

  runtime.log(`Resolving ${toResolve.length} positions`)

  // Step 4: Submit resolutions to SettlementManager onchain
  for (const resolution of toResolve) {
    await submitResolution(runtime, config, resolution)
  }

  return `resolved_${toResolve.length}`
}

// --- Get Open Positions from Contract ---
async function getOpenPositions(
  runtime: Runtime<Config>,
  config: Config
): Promise<string[]> {
  const evmClient = new cre.capabilities.EVMClient(
    undefined,
    BigInt(config.chainSelector)
  )

  const result = evmClient.callContract(runtime, {
    call: encodeFunctionData({
      abi: SETTLEMENT_ABI,
      functionName: "getOpenPositions"
    }),
    to: config.settlementManagerAddress as `0x${string}`
  }).result()

  // Decode result — returns bytes32[]
  // In practice, decode with viem's decodeFunctionResult
  return result as unknown as string[]
}

// --- Check if a Position's Legs Have All Resolved ---
interface ResolutionResult {
  positionId: string
  ready: boolean
  outcomes: boolean[]
  allWon: boolean
}

async function checkPositionResolution(
  runtime: Runtime<Config>,
  config: Config,
  positionId: string
): Promise<ResolutionResult> {

  // Fetch position legs from contract
  const evmClient = new cre.capabilities.EVMClient(
    undefined,
    BigInt(config.chainSelector)
  )

  const legsData = evmClient.callContract(runtime, {
    call: encodeFunctionData({
      abi: SETTLEMENT_ABI,
      functionName: "getPositionLegs",
      args: [positionId as `0x${string}`]
    }),
    to: config.settlementManagerAddress as `0x${string}`
  }).result()

  const legs = legsData as Array<{
    marketId: string
    outcome: number
    resolutionTime: bigint
  }>

  // Check each leg against Polymarket
  const legOutcomes = await runtime.runInNodeMode(
    async (nodeRuntime: NodeRuntime<Config>) =>
      checkLegsOnPolymarket(nodeRuntime, config, legs),
    consensusIdenticalAggregation
  )

  const ready = legOutcomes.every(o => o !== null)
  const outcomes = legOutcomes.map(o => o === true)
  const allWon = outcomes.every(Boolean)

  return { positionId, ready, outcomes, allWon }
}

// --- Fetch Polymarket Resolution for Legs ---
async function checkLegsOnPolymarket(
  nodeRuntime: NodeRuntime<Config>,
  config: Config,
  legs: Array<{ marketId: string; outcome: number }>
): Promise<(boolean | null)[]> {

  const httpClient = new cre.capabilities.HTTPClient()

  return Promise.all(legs.map(async leg => {
    try {
      const response = httpClient.request(nodeRuntime, {
        method: "GET",
        url: `${config.polymarketGammaUrl}/markets?id=${leg.marketId}`,
        headers: { "Accept": "application/json" }
      }).result()

      const market = JSON.parse(response.body)[0]

      // Market not yet resolved
      if (!market || !market.closed) return null

      // Check if the bettor's chosen outcome won
      // outcomePrices: ["1", "0"] means YES won, ["0", "1"] means NO won
      const prices = JSON.parse(market.outcomePrices) as string[]
      const yesWon = parseFloat(prices[0]) === 1

      // outcome 0 = YES, outcome 1 = NO
      const bettorChooseYes = leg.outcome === 0
      return bettorChooseYes ? yesWon : !yesWon

    } catch (err) {
      nodeRuntime.log(`Failed to check market ${leg.marketId}: ${err}`)
      return null
    }
  }))
}

// --- Cross-Reference Crypto Legs with Chainlink Price Feeds ---
async function verifyCryptoLegWithPriceFeed(
  runtime: Runtime<Config>,
  config: Config,
  marketQuestion: string,
  threshold: number
): Promise<boolean | null> {

  // Only run for crypto price markets
  if (!marketQuestion.toLowerCase().includes("eth") &&
      !marketQuestion.toLowerCase().includes("btc")) {
    return null
  }

  const feedAddress = marketQuestion.toLowerCase().includes("eth")
    ? config.ethUsdFeedAddress
    : config.btcUsdFeedAddress

  // Read Chainlink price feed — this makes a state-readable onchain call
  // qualifying for "Connect the World" prize
  const AGGREGATOR_ABI = parseAbi([
    "function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)"
  ])

  const evmClient = new cre.capabilities.EVMClient(
    undefined,
    BigInt(config.chainSelector)
  )

  const feedData = evmClient.callContract(runtime, {
    call: encodeFunctionData({
      abi: AGGREGATOR_ABI,
      functionName: "latestRoundData"
    }),
    to: feedAddress as `0x${string}`
  }).result()

  // feedData[1] is the price (int256, 8 decimals for ETH/USD)
  const price = Number(feedData as bigint) / 1e8

  return price > threshold
}

// --- Submit Resolution Onchain ---
async function submitResolution(
  runtime: Runtime<Config>,
  config: Config,
  resolution: ResolutionResult
): Promise<void> {

  runtime.log(
    `Resolving position ${resolution.positionId}: ` +
    `outcomes=${resolution.outcomes} allWon=${resolution.allWon}`
  )

  const evmClient = new cre.capabilities.EVMClient(
    undefined,
    BigInt(config.chainSelector)
  )

  // Write to SettlementManager.sol — this triggers settlement delay
  evmClient.writeContract(runtime, {
    call: encodeFunctionData({
      abi: SETTLEMENT_ABI,
      functionName: "resolvePosition",
      args: [
        resolution.positionId as `0x${string}`,
        resolution.outcomes
      ]
    }),
    to: config.settlementManagerAddress as `0x${string}`
  }).result()

  runtime.log(`Position ${resolution.positionId} resolved onchain`)
}

main()
```

---

## Confidential HTTP Integration (Privacy Prize)

For the Chainlink Privacy Standard prize ($2,000), wrap the Polymarket API call in Confidential HTTP so position details are not exposed offchain:

```typescript
// Replace standard HTTPClient with ConfidentialHTTPClient
// in checkLegsOnPolymarket function:

import { ConfidentialHTTPClient } from "@chainlink/cre-sdk"

const httpClient = new ConfidentialHTTPClient()

const response = httpClient.request(nodeRuntime, {
  method: "GET",
  url: `${config.polymarketGammaUrl}/markets?id=${leg.marketId}`,
  headers: { "Accept": "application/json" },
  // Confidential HTTP encrypts request/response
  // API credentials and response data are protected
}).result()
```

This means:
- Position leg details are not visible in CRE logs
- Market resolution data is privately fetched
- Qualifies for Confidential HTTP prize track

---

## Simulate Locally

```bash
cd cre-workflow
cre workflow simulate underlay-settlement --target staging

# Expected output:
# Workflow compiled
# [USER LOG] Underlay settlement workflow triggered
# [USER LOG] Checking N open positions
# [USER LOG] Resolving N positions
# Workflow Simulation Result: "resolved_N"
```

If simulation succeeds, show the output to Chainlink team at the hackathon — they will deploy it to live CRE network for you.

---

## Gotchas

- CRE TypeScript compiles to WASM via Javy/QuickJS — not all Node.js APIs work. Avoid `crypto`, `fs`, `path`
- `async/await` does NOT work inside CRE SDK capability calls — use `.result()` pattern instead
- `runInNodeMode` is required for HTTP calls — plain Runtime cannot make external API calls
- `consensusIdenticalAggregation` requires all nodes to return identical results — use for deterministic data only
- CRE requires Bun runtime — do not use Node.js to run workflows
- Each workflow file needs its own `package.json` for dependencies
- Contract addresses in config must match deployed contracts — update after deployment
- Chainlink price feeds use 8 decimals for USD pairs — divide by 1e8 not 1e18
- The schedule `*/2 * * * *` runs every 2 minutes — fine for hackathon, adjust for production
