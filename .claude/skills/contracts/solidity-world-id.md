# Skill: World ID Onchain Integration

## When to Use This Skill
Use when integrating World ID proof verification into RiskEngine.sol or any other Underlay contract that needs sybil resistance. Also covers the frontend IDKit widget integration.

## Context
World ID 4.0 is used as a genuine protocol constraint — stakes above the configured `worldIdGate` threshold require proof of unique human. Without it, one person running many wallets can drain the pool. Proof validation happens in the smart contract. We target the World ID 4.0 track ($8,000) and the Agent Kit track ($8,000) simultaneously.

Do NOT submit to the MiniKit track — gambling/chance-based apps are explicitly excluded.

---

## Onchain Integration

### Interfaces Needed

```solidity
// interfaces/IWorldID.sol
interface IWorldID {
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}
```

```solidity
// libraries/ByteHasher.sol
library ByteHasher {
    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(value))) >> 8;
    }
}
```

Both of these are available in the World ID contracts package:
```
@worldid/interfaces/IWorldID.sol
@worldid/libraries/ByteHasher.sol
```

---

### Integration in RiskEngine.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@worldid/interfaces/IWorldID.sol";
import "@worldid/libraries/ByteHasher.sol";
import "../libraries/VaultConfig.sol";

contract RiskEngine {
    using ByteHasher for bytes;

    // --- World ID State ---
    IWorldID internal immutable worldId;
    uint256 internal immutable externalNullifierHash;
    uint256 internal immutable groupId = 1; // Orb-verified only

    // Prevent proof reuse — sybil resistance
    mapping(uint256 => bool) internal nullifierHashes;

    // --- Constructor ---
    constructor(
        IWorldID _worldId,
        string memory _appId,
        string memory _actionId,
        VaultConfig.Config memory _config
    ) {
        worldId = _worldId;
        externalNullifierHash = abi
            .encodePacked(abi.encodePacked(_appId).hashToField(), _actionId)
            .hashToField();
        config = _config;
    }

    // --- World ID Verification ---
    function _verifyWorldId(
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) internal {
        // Prevent reuse
        require(!nullifierHashes[nullifierHash], "RiskEngine: proof already used");

        // Verify the proof
        worldId.verifyProof(
            root,
            groupId,
            abi.encodePacked(signal).hashToField(),
            nullifierHash,
            externalNullifierHash,
            proof
        );

        // Mark as used — sybil resistance
        nullifierHashes[nullifierHash] = true;
    }

    // --- Position Submission with World ID ---
    function submitPosition(
        bytes32 positionId,
        uint256 stake,
        uint8 riskTier,
        uint256 stakeLimit,
        // World ID params (only required if stake > worldIdGate)
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        // Enforce stake limit from AI risk score
        require(stake <= stakeLimit, "RiskEngine: stake exceeds AI limit");
        require(stake <= config.maxStake, "RiskEngine: stake exceeds max");

        // World ID gate — only for stakes above threshold
        if (stake > config.worldIdGate) {
            _verifyWorldId(msg.sender, root, nullifierHash, proof);
        }

        // Forward to PositionBook
        // positionBook.recordPosition(positionId, msg.sender, stake, riskTier);
    }
}
```

---

### Key Details

**Proof validity window:** World ID proofs are valid for 7 days after creation. Bettors do not need to re-verify for every position within that window — but each nullifierHash can only be used once. For our use case, each position submission gets its own proof to ensure uniqueness per position.

**Signal:** We use `msg.sender` (the bettor's wallet address) as the signal. This ties the proof to the specific wallet placing the position.

**groupId = 1:** Orb-verified users only. Device-verified (groupId = 0) is not supported for onchain verification.

**externalNullifierHash:** Computed once in constructor from appId + actionId. This ensures proofs generated for Underlay cannot be replayed in other apps.

---

## Frontend IDKit Integration

```typescript
// components/WorldIDButton.tsx
import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit"
import { useContractWrite } from "wagmi"

interface WorldIDButtonProps {
  stake: bigint
  onVerified: (proof: WorldIDProof) => void
}

interface WorldIDProof {
  root: bigint
  nullifierHash: bigint
  proof: readonly bigint[]
}

export function WorldIDButton({ stake, onVerified }: WorldIDButtonProps) {
  // Only show if stake exceeds gate
  const WORLD_ID_GATE = 2_000_000n // $2 testnet / $20 mainnet (6 decimals)

  if (stake <= WORLD_ID_GATE) return null

  return (
    <IDKitWidget
      app_id={process.env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`}
      action="place-position"
      verification_level={VerificationLevel.Orb}
      handleVerify={async (proof) => {
        // Called after proof is generated
        // Pass proof params to parent for contract submission
        onVerified({
          root: BigInt(proof.merkle_root),
          nullifierHash: BigInt(proof.nullifier_hash),
          proof: proof.proof.map(BigInt) as readonly bigint[]
        })
      }}
      onSuccess={() => {
        // Widget closes, proof already passed to onVerified
      }}
    >
      {({ open }) => (
        <button
          onClick={open}
          className="w-full py-3 bg-black text-white rounded-lg font-medium"
        >
          Verify with World ID to continue
        </button>
      )}
    </IDKitWidget>
  )
}
```

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_WORLD_APP_ID=app_...       # from developer.worldcoin.org
NEXT_PUBLIC_WORLD_ACTION_ID=place-position

# Contract constructor args
WORLD_ID_ROUTER=0x...                  # World ID Router on target chain
WORLD_APP_ID=app_...
WORLD_ACTION_ID=place-position
```

---

## World ID Router Addresses

Check `docs.world.org/world-id/id/on-chain` for current addresses.

```
Ethereum Mainnet:    0x163b09b4fE21177c455D850BD815B16D0D5b58B2
Optimism:            0x163b09b4fE21177c455D850BD815B16D0D5b58B2
Base:                0x163b09b4fE21177c455D850BD815B16D0D5b58B2
Base Sepolia:        check docs — staging address differs
World Chain:         check docs
```

Always verify addresses from official docs before deployment.

---

## Agent Kit Integration (for $8,000 AgentKit prize)

AgentKit wraps our AI risk engine as a World ID-verified agent. The risk engine agent has a World ID — its decisions are tied to a verified human operator.

```typescript
// lib/riskAgent.ts
import { AgentKit } from "@worldcoin/agent-kit"

export const riskAgent = new AgentKit({
  appId: process.env.WORLD_APP_ID!,
  actionId: "risk-assessment",
  // Agent makes risk scoring decisions
  // World ID proves a human operator backs this agent
})

// When scoring a position:
export async function scorePosition(legs: Leg[], wallet: string) {
  return riskAgent.execute(async () => {
    // 0G Compute call for AI inference
    const score = await compute0GRiskScore(legs, wallet)
    return score
  })
}
```

This distinguishes the risk engine as a human-backed agent (not a bot) — directly meeting the AgentKit qualification requirement.

---

## Testing World ID in Development

Use the Worldcoin Simulator app for development:
- Download from World App stores (development version)
- Generates valid proofs without real Orb verification
- Works against staging World ID contracts
- Set `verification_level={VerificationLevel.Device}` in IDKit for simulator

---

## Gotchas

- Proofs expire after 7 days — do not cache proof params across sessions
- Each nullifierHash can only be used once — new proof needed per position submission
- `verifyProof` reverts if invalid — wrap in try/catch on frontend, show clear error
- On-chain verification only works with `VerificationLevel.Orb` — Device verification not supported
- Must configure app as "on-chain" type in developer portal, not "cloud"
- `externalNullifierHash` is computed from appId + actionId — must match exactly between frontend and contract
- Do not pass proof params through URL or localStorage — keep in React state only
