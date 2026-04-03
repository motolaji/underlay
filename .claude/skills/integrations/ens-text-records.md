# Skill: ENS Agent Identity Integration

## When to Use This Skill
Use when setting up the ENS identity for the Underlay AI risk engine agent — `riskengine.underlay.eth` — and when reading ENS text records in the frontend to display agent config. Target prize: "Best ENS Integration for AI Agents" — up to $5,000. Present at ENS booth Sunday morning.

## Context
The AI risk engine is an agent. It needs a persistent, verifiable onchain identity. ENS gives it `riskengine.underlay.eth` — bettors and LPs can resolve this name to see which model version scored their position, what parameters it used, and when it was last updated. This makes the AI layer transparent and auditable, which is the core pitch for the ENS prize.

---

## What We Register

```
underlay.eth                  Parent name (register this)
  └── riskengine.underlay.eth Subname (create as subdomain)
```

Text records on `riskengine.underlay.eth`:
```
model_version   llama-3-8b-0g-compute-v1
model_hash      0x... (keccak256 of model config)
compute_network 0g-testnet
vig             0.05
max_stake       5 (testnet)
max_payout      100 (testnet)
description     Underlay AI risk scoring agent
url             https://underlay.xyz
last_updated    2026-04-04T10:00:00Z
```

Any bettor can resolve `riskengine.underlay.eth` and verify the exact model and parameters that scored their position.

---

## Setup — Register ENS Name

### Option A: Use ENS App (Mainnet)

1. Go to `app.ens.domains`
2. Search for `underlay.eth`
3. Register it (costs ETH — ~$5-20 depending on gas)
4. Set resolver to Public Resolver
5. Create subname `riskengine`

### Option B: Use ENS Testnet (Sepolia, for hackathon)

ENS is deployed on Sepolia testnet — use this for the demo:

```bash
# ENS Registry on Sepolia
REGISTRY=0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e

# Public Resolver on Sepolia
RESOLVER=0x8FADE66B79cC9f707aB26799354482EB93a5B7D
```

Get Sepolia ETH from faucet: `sepoliafaucet.com`

---

## Setting Text Records with Viem

```typescript
// scripts/setupEns.ts
import { createWalletClient, createPublicClient, http } from "viem"
import { sepolia } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"

// ENS Public Resolver ABI (minimal)
const RESOLVER_ABI = [
  {
    name: "setText",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" }
    ],
    outputs: []
  },
  {
    name: "text",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" }
    ],
    outputs: [{ name: "", type: "string" }]
  }
] as const

const RESOLVER_ADDRESS = "0x8FADE66B79cC9f707aB26799354482EB93a5B7D"

// Namehash for riskengine.underlay.eth
// viem has built-in namehash
import { namehash } from "viem/ens"

const RISK_ENGINE_NODE = namehash("riskengine.underlay.eth")

const textRecords = {
  model_version:   "llama-3-8b-0g-compute-v1",
  model_hash:      "0x" + "0".repeat(64), // replace with actual hash
  compute_network: "0g-testnet",
  vig:             "0.05",
  max_stake:       "5",        // testnet USDC
  max_payout:      "100",      // testnet USDC
  description:     "Underlay AI risk scoring agent — verifiable inference on 0G Compute",
  url:             "https://underlay.xyz",
  last_updated:    new Date().toISOString()
}

async function setupEnsTextRecords() {
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http()
  })

  console.log("Setting ENS text records for riskengine.underlay.eth...")

  for (const [key, value] of Object.entries(textRecords)) {
    const hash = await walletClient.writeContract({
      address: RESOLVER_ADDRESS,
      abi: RESOLVER_ABI,
      functionName: "setText",
      args: [RISK_ENGINE_NODE, key, value]
    })
    console.log(`Set ${key} = ${value} (tx: ${hash})`)
  }

  console.log("Done!")
}

setupEnsTextRecords().catch(console.error)
```

Run with:
```bash
npx tsx scripts/setupEns.ts
```

---

## Reading ENS Text Records in Frontend

```typescript
// lib/ens.ts
import { createPublicClient, http } from "viem"
import { mainnet, sepolia } from "viem/chains"
import { normalize, namehash } from "viem/ens"

const ENS_CHAIN = sepolia // use mainnet for production

const publicClient = createPublicClient({
  chain: ENS_CHAIN,
  transport: http()
})

export interface RiskEngineConfig {
  modelVersion: string
  modelHash: string
  computeNetwork: string
  vig: number
  maxStake: number
  maxPayout: number
  description: string
  lastUpdated: string
}

export async function getRiskEngineConfig(): Promise<RiskEngineConfig | null> {
  try {
    const name = "riskengine.underlay.eth"

    // Read all text records in parallel
    const [
      modelVersion,
      modelHash,
      computeNetwork,
      vig,
      maxStake,
      maxPayout,
      description,
      lastUpdated
    ] = await Promise.all([
      publicClient.getEnsText({ name, key: "model_version" }),
      publicClient.getEnsText({ name, key: "model_hash" }),
      publicClient.getEnsText({ name, key: "compute_network" }),
      publicClient.getEnsText({ name, key: "vig" }),
      publicClient.getEnsText({ name, key: "max_stake" }),
      publicClient.getEnsText({ name, key: "max_payout" }),
      publicClient.getEnsText({ name, key: "description" }),
      publicClient.getEnsText({ name, key: "last_updated" })
    ])

    return {
      modelVersion: modelVersion ?? "unknown",
      modelHash: modelHash ?? "0x",
      computeNetwork: computeNetwork ?? "unknown",
      vig: parseFloat(vig ?? "0.05"),
      maxStake: parseFloat(maxStake ?? "5"),
      maxPayout: parseFloat(maxPayout ?? "100"),
      description: description ?? "",
      lastUpdated: lastUpdated ?? new Date().toISOString()
    }
  } catch (err) {
    console.error("Failed to read ENS config:", err)
    return null
  }
}

// Resolve agent address
export async function getRiskEngineAddress(): Promise<string | null> {
  try {
    const address = await publicClient.getEnsAddress({
      name: normalize("riskengine.underlay.eth")
    })
    return address
  } catch {
    return null
  }
}
```

---

## Displaying ENS Config in Frontend

Show this in the betslip after risk scoring — proves the AI is a verified agent:

```typescript
// components/AgentIdentity.tsx
"use client"

import { useEffect, useState } from "react"
import { getRiskEngineConfig, type RiskEngineConfig } from "@/lib/ens"

export function AgentIdentity() {
  const [config, setConfig] = useState<RiskEngineConfig | null>(null)

  useEffect(() => {
    getRiskEngineConfig().then(setConfig)
  }, [])

  if (!config) return null

  return (
    <div className="px-4 py-3 border-t border-border-subtle">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono text-text-tertiary">
          Scored by
        </span>
        <a
          href={`https://app.ens.domains/riskengine.underlay.eth`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors"
        >
          riskengine.underlay.eth ↗
        </a>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-text-tertiary">
          {config.modelVersion}
        </span>
        <span className="text-xs font-mono text-text-tertiary">·</span>
        <span className="text-xs font-mono text-text-tertiary">
          {config.computeNetwork}
        </span>
      </div>
    </div>
  )
}
```

---

## Creating a Subname (riskengine.underlay.eth)

After registering `underlay.eth`, create the subname programmatically:

```typescript
// ENS Registry ABI (minimal)
const REGISTRY_ABI = [
  {
    name: "setSubnodeRecord",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },      // parent namehash
      { name: "label", type: "bytes32" },     // keccak256 of subdomain label
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "ttl", type: "uint64" }
    ],
    outputs: []
  }
] as const

import { keccak256, toHex, namehash } from "viem"

const REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"

// Create riskengine.underlay.eth
await walletClient.writeContract({
  address: REGISTRY,
  abi: REGISTRY_ABI,
  functionName: "setSubnodeRecord",
  args: [
    namehash("underlay.eth"),           // parent node
    keccak256(toHex("riskengine")),     // label hash
    account.address,                    // owner
    RESOLVER_ADDRESS,                   // resolver
    0n                                  // ttl
  ]
})
```

---

## Why ENS Improves the Product (for Prize Qualification)

ENS is not cosmetic here — it serves a real function:

1. **Verifiable agent identity** — bettors can look up `riskengine.underlay.eth` and confirm which model scored their position
2. **Onchain model provenance** — model version and hash are stored onchain, not in a database
3. **Transparent parameters** — vig, stake limits, and payout caps are publicly readable
4. **Immutable audit trail** — text records are timestamped and verifiable
5. **Discoverability** — other protocols can discover and integrate the Underlay risk agent by name

The ENS integration genuinely makes the product better — it is the difference between "trust us" and "verify yourself."

---

## Gotchas

- Present at ENS booth Sunday morning — this is an explicit qualification requirement
- Demo must be functional with real ENS name — no hardcoded values in the demo
- Use Sepolia testnet ENS for the hackathon — mainnet registration costs real ETH
- `getEnsText` returns null not empty string if key not set — handle null gracefully
- Subname creation requires owning the parent name — register underlay.eth first
- ENS text records cost gas to set — batch multiple setText calls if possible
- namehash is deterministic — can compute it without an RPC call using viem's `namehash()`
- viem's ENS functions work on mainnet by default — explicitly set chain to Sepolia for testnet
