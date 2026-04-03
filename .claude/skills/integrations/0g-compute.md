# Skill: 0G Compute and Storage Integration

## When to Use This Skill
Use when building the AI risk scoring API route that calls 0G Compute for verifiable inference, and when writing risk score audit trails to 0G Storage. Also covers deploying contracts to 0G Chain. Read _project-context.md first.

## Context
0G is the primary AI and storage layer for Underlay. It makes our AI risk scoring verifiable — every risk assessment has a cryptographic proof stored on 0G Storage that anyone can audit. 0G Chain is EVM-compatible so our Solidity contracts deploy with minimal changes. Target prize: "Best DeFi App on 0G" — up to $6,000.

The 0G DeFi prize description says: "AI-powered prediction market with on-chain model provenance + verifiable/Sealed Inference." That is Underlay precisely.

---

## 0G Stack We Use

```
0G Chain      EVM compatible L1
              Deploy our 5 Solidity contracts here
              Same Foundry tooling, just different RPC

0G Compute    Decentralised AI inference network
              Runs AI risk scoring
              Returns result with cryptographic proof
              Multiple nodes run inference independently
              Result has consensus and provenance

0G Storage    Decentralised storage network
              Store risk score audit trail per position
              LPs can verify any historical risk score
              Returns content hash (CID) to store onchain
```

---

## Setup

```bash
# Install 0G SDK
npm i @0glabs/0g-ts-sdk

# For compute network
npm i @0glabs/0g-serving-broker
```

---

## 0G Chain Configuration

```typescript
// lib/wagmi.ts — add 0G Chain
import { defineChain } from "viem"

export const ogNewtonTestnet = defineChain({
  id: 16600,
  name: "0G Newton Testnet",
  nativeCurrency: {
    name: "A0GI",
    symbol: "A0GI",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://evmrpc-testnet.0g.ai"]
    }
  },
  blockExplorers: {
    default: {
      name: "0G Explorer",
      url: "https://chainscan-newton.0g.ai"
    }
  },
  testnet: true
})
```

Faucet: https://faucet.0g.ai (get A0GI for gas)

---

## Deploying Contracts to 0G Chain

No changes to Solidity code needed. Just update foundry.toml and deployment script:

```toml
# foundry.toml — add 0G testnet
[rpc_endpoints]
base_sepolia = "${BASE_SEPOLIA_RPC}"
og_testnet   = "https://evmrpc-testnet.0g.ai"

[etherscan]
og_testnet = { key = "any_string", url = "https://chainscan-newton.0g.ai/api" }
```

```bash
# Deploy to 0G testnet
forge script script/Deploy.s.sol \
  --rpc-url og_testnet \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://chainscan-newton.0g.ai/api
```

---

## 0G Storage — Writing Risk Score Audit Trail

```typescript
// lib/0g-storage.ts
import { ZgFile, Indexer, getFlowContract } from "@0glabs/0g-ts-sdk"
import { ethers } from "ethers"  // 0G SDK uses ethers v5

const OG_INDEXER_RPC = "https://indexer-storage-testnet-turbo.0g.ai"
const OG_EVM_RPC = "https://evmrpc-testnet.0g.ai"

interface RiskAuditEntry {
  positionId: string
  wallet: string
  legs: Array<{
    marketId: string
    question: string
    outcome: string
    probability: number
    category: string
  }>
  riskScore: {
    risk_tier: string
    stake_limit: number
    correlation_score: number
    flags: string[]
    effective_legs: number
    settlement_delay: string
    confidence: number
  }
  timestamp: number
  modelVersion: string
}

export async function storeRiskAudit(
  entry: RiskAuditEntry,
  privateKey: string
): Promise<string> {
  // Serialise audit entry to JSON
  const data = JSON.stringify(entry, null, 2)
  const buffer = Buffer.from(data, "utf-8")

  // Create 0G file from buffer
  const file = await ZgFile.fromBuffer(buffer)
  const [tree, err] = await file.merkleTree()

  if (err) throw new Error(`Failed to create merkle tree: ${err}`)

  // Get root hash — this is what we store onchain
  const rootHash = tree!.rootHash()

  // Upload to 0G Storage
  const provider = new ethers.JsonRpcProvider(OG_EVM_RPC)
  const signer = new ethers.Wallet(privateKey, provider)
  const indexer = new Indexer(OG_INDEXER_RPC)

  const flowContract = getFlowContract(
    "0xbD2C3F0E65eDF5582141C35969d66e205E0a2693", // 0G testnet flow contract
    signer
  )

  const [tx, uploadErr] = await indexer.upload(file, OG_EVM_RPC, signer)

  if (uploadErr) throw new Error(`Upload failed: ${uploadErr}`)

  return rootHash  // Store this in the position onchain
}

export async function retrieveRiskAudit(
  rootHash: string
): Promise<RiskAuditEntry | null> {
  try {
    const indexer = new Indexer(OG_INDEXER_RPC)
    const [fileData, err] = await indexer.download(rootHash, true)

    if (err || !fileData) return null

    const text = Buffer.from(fileData).toString("utf-8")
    return JSON.parse(text) as RiskAuditEntry
  } catch {
    return null
  }
}
```

---

## 0G Compute — Verifiable AI Risk Scoring

```typescript
// app/api/risk/route.ts — with 0G Compute
import { NextRequest, NextResponse } from "next/server"
import { createZGServingNetworkBroker } from "@0glabs/0g-serving-broker"
import { ethers } from "ethers"

const OG_EVM_RPC = "https://evmrpc-testnet.0g.ai"
// 0G Compute contract address on testnet
const OG_COMPUTE_CONTRACT = "0x..."

interface RiskRequest {
  legs: Array<{
    marketId: string
    question: string
    outcome: string
    probability: number
    category: string
    resolutionDate: string
  }>
  wallet: string
  stake: number
}

export async function POST(request: NextRequest) {
  const body: RiskRequest = await request.json()

  if (!body.legs || body.legs.length < 1) {
    return NextResponse.json(
      { error: "Minimum 1 legs required" },
      { status: 400 }
    )
  }

  try {
    // Attempt 0G Compute inference
    const score = await score0GCompute(body)
    return NextResponse.json(score)
  } catch (computeErr) {
    console.warn("0G Compute unavailable, falling back to rule-based:", computeErr)
    // Fallback to rule-based scoring
    const score = calculateRuleBasedRisk(body)
    return NextResponse.json({ ...score, source: "rule_based" })
  }
}

async function score0GCompute(input: RiskRequest) {
  // Set up 0G serving broker
  const provider = new ethers.JsonRpcProvider(OG_EVM_RPC)
  const signer = new ethers.Wallet(
    process.env.OG_PRIVATE_KEY!,
    provider
  )

  const broker = await createZGServingNetworkBroker(signer)

  // List available AI services
  const services = await broker.listService()

  // Find a suitable LLM service (look for Llama or similar)
  const llmService = services.find(s =>
    s.serviceType === "llm" &&
    s.model.toLowerCase().includes("llama")
  )

  if (!llmService) throw new Error("No LLM service available")

  // Build risk scoring prompt
  const prompt = buildRiskPrompt(input)

  // Request inference with verifiable output
  const { endpoint, model } = await broker.getServiceMetadata(
    llmService.provider,
    llmService.name
  )

  // Get request headers for authenticated call
  const headers = await broker.processRequest(
    llmService.provider,
    llmService.name,
    prompt
  )

  // Call 0G Compute LLM
  const response = await fetch(`${endpoint}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0
    })
  })

  const completion = await response.json()
  const content = completion.choices[0].message.content

  // Process response for settlement (verifiable)
  await broker.processResponse(
    llmService.provider,
    llmService.name,
    content
  )

  // Parse structured JSON from LLM response
  const riskScore = parseRiskScoreFromLLM(content)

  return {
    ...riskScore,
    source: "0g_compute",
    modelProvider: llmService.provider,
    modelName: llmService.name
  }
}

function buildRiskPrompt(input: RiskRequest): string {
  const legsText = input.legs.map((leg, i) =>
    `Leg ${i + 1}: ${leg.question} | Outcome: ${leg.outcome} | ` +
    `Probability: ${(leg.probability * 100).toFixed(0)}% | ` +
    `Category: ${leg.category} | Resolves: ${leg.resolutionDate}`
  ).join("\n")

  return `You are a risk assessor for a prediction market vault. Analyse this multi-leg position and return a JSON risk assessment.

POSITION:
${legsText}

Stake: $${input.stake}

Assess:
1. Correlation between legs (are they really independent?)
2. Timing risk (any leg resolving very soon?)
3. Category concentration (all same type?)
4. Overall risk tier

Return ONLY valid JSON with this exact structure:
{
  "risk_tier": "LOW" | "MEDIUM" | "HIGH",
  "stake_limit": number,
  "correlation_score": number between 0 and 1,
  "flags": array of strings,
  "effective_legs": number,
  "settlement_delay": "15 min" | "1 hour" | "24 hours",
  "confidence": number between 0 and 1,
  "reasoning": string
}`
}

function parseRiskScoreFromLLM(content: string) {
  // Strip markdown code blocks if present
  const cleaned = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    // Fallback if JSON parsing fails
    return {
      risk_tier: "HIGH",
      stake_limit: 1,
      correlation_score: 0.5,
      flags: ["parse_error"],
      effective_legs: 1,
      settlement_delay: "24 hours",
      confidence: 0
    }
  }
}
```

---

## Storing Root Hash Onchain

After 0G Storage upload, store the rootHash in the position:

```solidity
// In PositionBook.sol
struct Position {
    bytes32 id;
    address bettor;
    uint256 stake;
    uint8 riskTier;
    bytes32 riskAuditHash;  // 0G Storage root hash
    // ... other fields
}

// When creating position:
function createPosition(
    bytes32 positionId,
    address bettor,
    uint256 stake,
    uint8 riskTier,
    bytes32 riskAuditHash,  // passed from frontend after 0G upload
    // ... other params
) external {
    positions[positionId] = Position({
        id: positionId,
        bettor: bettor,
        stake: stake,
        riskTier: riskTier,
        riskAuditHash: riskAuditHash,
        // ...
    });
}
```

Any LP can later call `retrieveRiskAudit(riskAuditHash)` to verify the score was calculated correctly.

---

## ENS Text Records for Model Provenance

Store the current model version on ENS so bettors can verify which model scored their position:

```
riskengine.underlay.eth text records:
  model_version  = "llama-3-8b-0g-compute-v1"
  model_hash     = "0x..." (hash of model weights)
  compute_node   = "0g-testnet"
  last_updated   = "2026-04-04T10:00:00Z"
```

---

## Environment Variables

```bash
# .env.local (Next.js)
OG_EVM_RPC=https://evmrpc-testnet.0g.ai
OG_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai
OG_PRIVATE_KEY=0x...    # server-side only — never expose to client
OG_COMPUTE_CONTRACT=0x...
```

---

## Gotchas

- 0G SDK uses ethers v5 internally — do not mix with viem in the same file. Keep 0G calls server-side only
- 0G Compute availability depends on testnet — always implement rule-based fallback
- `processResponse` must be called after inference — this is how 0G verifies the response
- Root hash from 0G Storage is what goes onchain — not the full content
- The LLM prompt must request JSON only — instruct the model to return no other text
- 0G testnet may have different contract addresses than docs suggest — check build.0g.ai for latest
- Store OG_PRIVATE_KEY server-side only — it pays for compute and storage
- A0GI (0G gas token) needed for contract interactions — get from faucet.0g.ai
- If 0G Compute has no available LLM services during hackathon, rule-based fallback still qualifies for prize (show integration attempt)
