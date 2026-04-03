# Skill: SettlementManager.sol

## When to Use This Skill
Use when writing SettlementManager.sol — the contract that receives resolution results from Chainlink CRE, enforces settlement delays, manages the challenge window, and executes payouts or loss sweeps. Read solidity-position-book.md first.

## Context
SettlementManager is the bridge between Chainlink CRE (offchain oracle) and PositionBook.sol (onchain state). When CRE confirms a market outcome, it calls SettlementManager which then resolves the leg in PositionBook. For won positions, SettlementManager enforces a delay (15min/1hr/24hr by risk tier) before executing payout. This delay is a core protocol feature — not optional.

---

## Full Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IPositionBook.sol";
import "../libraries/VaultConfig.sol";

contract SettlementManager is Ownable, ReentrancyGuard {

    // --- Settlement Delays by Risk Tier ---
    uint256 public constant DELAY_LOW    =  15 minutes;
    uint256 public constant DELAY_MEDIUM =   1 hours;
    uint256 public constant DELAY_HIGH   =  24 hours;

    // --- Structs ---

    struct PendingSettlement {
        bytes32 positionId;
        uint256 settleAfter;    // block.timestamp + delay
        bool    challenged;
        bool    executed;
    }

    // --- State ---

    IPositionBook public immutable positionBook;

    // positionId => PendingSettlement
    mapping(bytes32 => PendingSettlement) public pendingSettlements;

    // Authorized CRE caller (Chainlink DON)
    address public creForwarder;

    // Challenge council (multisig or governance for disputes)
    address public challengeCouncil;

    // --- Events ---

    event LegResolvedByOracle(
        bytes32 indexed positionId,
        uint8   legIndex,
        bool    won,
        uint256 timestamp
    );

    event SettlementInitiated(
        bytes32 indexed positionId,
        uint256 settleAfter,
        uint8   riskTier,
        uint256 timestamp
    );

    event SettlementChallenged(
        bytes32 indexed positionId,
        address challenger,
        uint256 timestamp
    );

    event SettlementExecuted(
        bytes32 indexed positionId,
        uint256 payout,
        uint256 timestamp
    );

    event ChallengeResolved(
        bytes32 indexed positionId,
        bool    payoutConfirmed,
        uint256 timestamp
    );

    // --- Constructor ---

    constructor(
        IPositionBook _positionBook,
        address       _creForwarder,
        address       _challengeCouncil,
        address       _owner
    ) Ownable(_owner) {
        positionBook    = _positionBook;
        creForwarder    = _creForwarder;
        challengeCouncil = _challengeCouncil;
    }

    // --- Access Control ---

    modifier onlyCRE() {
        require(msg.sender == creForwarder, "SettlementManager: not CRE forwarder");
        _;
    }

    modifier onlyChallenge() {
        require(msg.sender == challengeCouncil, "SettlementManager: not challenge council");
        _;
    }

    function setCREForwarder(address _creForwarder) external onlyOwner {
        creForwarder = _creForwarder;
    }

    function setChallengeCouncil(address _council) external onlyOwner {
        challengeCouncil = _council;
    }

    // --- Core: Resolve Leg (called by Chainlink CRE) ---

    function resolveLeg(
        bytes32 positionId,
        uint8   legIndex,
        bool    won
    ) external onlyCRE {
        // Forward to PositionBook
        positionBook.resolveLeg(positionId, legIndex, won);

        emit LegResolvedByOracle(positionId, legIndex, won, block.timestamp);

        // Check if position is now fully resolved and won
        IPositionBook.Position memory pos = positionBook.getPosition(positionId);

        if (pos.status == IPositionBook.PositionStatus.WON) {
            // Initiate settlement delay
            _initiateSettlement(positionId, pos.riskTier);
        }
        // If LOST — PositionBook handles loss sweep immediately
    }

    // --- Core: Initiate Settlement Delay ---

    function _initiateSettlement(bytes32 positionId, uint8 riskTier) internal {
        uint256 delay = _getDelay(riskTier);
        uint256 settleAfter = block.timestamp + delay;

        pendingSettlements[positionId] = PendingSettlement({
            positionId: positionId,
            settleAfter: settleAfter,
            challenged: false,
            executed: false
        });

        emit SettlementInitiated(
            positionId,
            settleAfter,
            riskTier,
            block.timestamp
        );
    }

    // --- Core: Execute Settlement (callable by anyone after delay) ---

    function executeSettlement(bytes32 positionId) external nonReentrant {
        PendingSettlement storage settlement = pendingSettlements[positionId];

        require(settlement.positionId != bytes32(0), "SettlementManager: no pending settlement");
        require(!settlement.executed, "SettlementManager: already executed");
        require(!settlement.challenged, "SettlementManager: under challenge");
        require(
            block.timestamp >= settlement.settleAfter,
            "SettlementManager: delay not elapsed"
        );

        settlement.executed = true;

        // Get payout amount for event
        IPositionBook.Position memory pos = positionBook.getPosition(positionId);

        // Execute payout via PositionBook
        positionBook.executePayout(positionId);

        emit SettlementExecuted(positionId, pos.potentialPayout, block.timestamp);
    }

    // --- Challenge Window ---

    // Anyone can raise a challenge during the delay window
    function challengeSettlement(bytes32 positionId) external {
        PendingSettlement storage settlement = pendingSettlements[positionId];

        require(settlement.positionId != bytes32(0), "SettlementManager: no pending settlement");
        require(!settlement.executed, "SettlementManager: already executed");
        require(!settlement.challenged, "SettlementManager: already challenged");
        require(
            block.timestamp < settlement.settleAfter,
            "SettlementManager: challenge window closed"
        );

        settlement.challenged = true;

        // Extend delay by 2 hours for review
        settlement.settleAfter = block.timestamp + 2 hours;

        emit SettlementChallenged(positionId, msg.sender, block.timestamp);
    }

    // Challenge council resolves the dispute
    function resolveChallenge(
        bytes32 positionId,
        bool    confirmPayout
    ) external onlyChallenge {
        PendingSettlement storage settlement = pendingSettlements[positionId];
        require(settlement.challenged, "SettlementManager: not challenged");
        require(!settlement.executed, "SettlementManager: already executed");

        if (confirmPayout) {
            // Confirmed correct — allow settlement immediately
            settlement.challenged = false;
            settlement.settleAfter = block.timestamp;
        } else {
            // Override — position should not pay out
            // Void the position and refund stake instead
            settlement.executed = true;
            positionBook.voidPosition(positionId);
        }

        emit ChallengeResolved(positionId, confirmPayout, block.timestamp);
    }

    // --- Batch Resolution (for Chainlink CRE efficiency) ---

    function resolveLegs(
        bytes32[] calldata positionIds,
        uint8[]   calldata legIndexes,
        bool[]    calldata outcomes
    ) external onlyCRE {
        require(
            positionIds.length == legIndexes.length &&
            legIndexes.length == outcomes.length,
            "SettlementManager: array length mismatch"
        );

        for (uint256 i = 0; i < positionIds.length; i++) {
            // Use try/catch so one failure doesn't block all
            try this.resolveLeg(positionIds[i], legIndexes[i], outcomes[i]) {
                // success
            } catch {
                // log failure but continue
            }
        }
    }

    // --- View Functions ---

    function getSettlementStatus(bytes32 positionId)
        external view returns (
            bool   exists,
            uint256 settleAfter,
            bool   challenged,
            bool   executed,
            uint256 timeRemaining
        )
    {
        PendingSettlement memory s = pendingSettlements[positionId];
        exists = s.positionId != bytes32(0);
        settleAfter = s.settleAfter;
        challenged = s.challenged;
        executed = s.executed;
        timeRemaining = s.settleAfter > block.timestamp
            ? s.settleAfter - block.timestamp
            : 0;
    }

    function isReadyToSettle(bytes32 positionId) external view returns (bool) {
        PendingSettlement memory s = pendingSettlements[positionId];
        return s.positionId != bytes32(0) &&
               !s.executed &&
               !s.challenged &&
               block.timestamp >= s.settleAfter;
    }

    // --- Internal Helpers ---

    function _getDelay(uint8 riskTier) internal pure returns (uint256) {
        if (riskTier == 0) return DELAY_LOW;    // LOW
        if (riskTier == 1) return DELAY_MEDIUM; // MEDIUM
        return DELAY_HIGH;                       // HIGH or unknown
    }
}
```

---

## IPositionBook Interface

```solidity
// interfaces/IPositionBook.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPositionBook {
    enum PositionStatus { OPEN, PARTIAL, WON, LOST, VOIDED }
    enum LegStatus { OPEN, WON, LOST, VOIDED }

    struct Position {
        bytes32        id;
        address        bettor;
        uint256        stake;
        uint256        potentialPayout;
        uint64         combinedOdds;
        uint8          riskTier;
        bytes32        riskAuditHash;
        uint256        placedAt;
        PositionStatus status;
        uint8          legsWon;
        uint8          legsTotal;
    }

    function resolveLeg(bytes32 positionId, uint8 legIndex, bool won) external;
    function voidPosition(bytes32 positionId) external;
    function executePayout(bytes32 positionId) external;
    function getPosition(bytes32 positionId) external view returns (Position memory);
    function getOpenPositions() external view returns (bytes32[] memory);
}
```

---

## Chainlink CRE Integration Point

The CRE workflow calls `resolveLegs()` (batch version) at the end of the settlement workflow:

```typescript
// In main.ts CRE workflow — final step
evmClient.writeContract(runtime, {
  call: encodeFunctionData({
    abi: SETTLEMENT_MANAGER_ABI,
    functionName: "resolveLegs",
    args: [
      positionIds,   // bytes32[]
      legIndexes,    // uint8[]
      outcomes       // bool[]
    ]
  }),
  to: config.settlementManagerAddress as `0x${string}`
}).result()
```

The CRE DON's address must be set as `creForwarder` in SettlementManager.

---

## Frontend Settlement Polling

```typescript
// Poll settlement status every 30 seconds for won positions
async function pollSettlement(positionId: string) {
  const status = await publicClient.readContract({
    address: SETTLEMENT_MANAGER_ADDRESS,
    abi: SETTLEMENT_MANAGER_ABI,
    functionName: "getSettlementStatus",
    args: [positionId as `0x${string}`]
  })

  const [exists, settleAfter, challenged, executed, timeRemaining] = status

  if (executed) return { state: "settled" }
  if (challenged) return { state: "challenged", settleAfter: Number(settleAfter) }
  if (exists) return {
    state: "pending",
    settleAfter: Number(settleAfter),
    timeRemaining: Number(timeRemaining)
  }
  return { state: "unknown" }
}

// After delay elapsed, anyone can call executeSettlement
async function triggerSettlement(positionId: string) {
  await walletClient.writeContract({
    address: SETTLEMENT_MANAGER_ADDRESS,
    abi: SETTLEMENT_MANAGER_ABI,
    functionName: "executeSettlement",
    args: [positionId as `0x${string}`]
  })
}
```

---

## Gotchas

- `executeSettlement` is callable by anyone after the delay — no permission needed. This lets the protocol be trustless and lets bettors trigger their own payout
- `resolveLegs` uses `try/catch` with `this.resolveLeg` — this requires the contract to call itself externally. Alternatively use a try/catch on the internal call
- `creForwarder` must match the actual CRE DON address — set this correctly after CRE deployment
- Challenge window closes when `settleAfter` passes — check timing carefully
- After a challenge is raised, the council has 2 hours to resolve — if they don't, anyone can still call `executeSettlement` after the extended delay
- `DELAY_LOW = 15 minutes` is for the hackathon demo — production might use longer delays
- Never allow `executeSettlement` if `challenged = true` — the challenge check is critical
- Batch `resolveLegs` is important for CRE efficiency — don't call `resolveLeg` in a loop from CRE
