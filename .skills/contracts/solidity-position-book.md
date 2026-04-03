# Skill: PositionBook.sol

## When to Use This Skill

Use when writing PositionBook.sol — the contract that stores all multi-outcome positions, tracks leg resolution, and enforces stake/payout caps. Read foundry-setup.md and solidity-vault-erc4626.md first.

## Context

PositionBook is the core data store for bettor positions. It receives positions from RiskEngine (after World ID and stake limit checks), stores the Polymarket market IDs and locked odds per leg, tracks each leg's resolution status independently, and triggers VaultManager when positions settle. All dollar caps come from VaultConfig — never hardcoded.

---

## Full Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libraries/VaultConfig.sol";
import "../interfaces/IVaultManager.sol";

contract PositionBook is Ownable, ReentrancyGuard {
  using SafeERC20 for IERC20;

  // --- Enums ---

  enum LegStatus {
    OPEN,
    WON,
    LOST,
    VOIDED
  }

  enum PositionStatus {
    OPEN,
    PARTIAL,
    WON,
    LOST,
    VOIDED
  }

  // --- Structs ---

  struct Leg {
    bytes32 marketId; // Polymarket conditionId
    uint8 outcome; // 0 = YES, 1 = NO
    uint64 lockedOdds; // scaled 1e6, e.g. 2.5x = 2_500_000
    uint64 resolutionTime; // unix timestamp of market endDate
    LegStatus status;
  }

  struct Position {
    bytes32 id;
    address bettor;
    uint256 stake; // USDC (6 decimals)
    uint256 potentialPayout; // USDC (6 decimals), capped at maxPayout
    uint64 combinedOdds; // scaled 1e6
    uint8 riskTier; // 0=LOW, 1=MEDIUM, 2=HIGH
    bytes32 riskAuditHash; // 0G Storage root hash
    uint256 placedAt; // block.timestamp
    PositionStatus status;
    uint8 legsWon;
    uint8 legsTotal;
  }

  // --- State ---

  VaultConfig.Config public config;
  IERC20 public immutable usdc;
  IVaultManager public immutable vault;

  // positionId => Position
  mapping(bytes32 => Position) public positions;

  // positionId => legs array
  mapping(bytes32 => Leg[]) public positionLegs;

  // bettor => list of their positionIds
  mapping(address => bytes32[]) public bettorPositions;

  // All open positionIds (for CRE workflow to iterate)
  bytes32[] public openPositions;

  // marketId => positionIds that reference it (for bulk resolution)
  mapping(bytes32 => bytes32[]) public marketToPositions;

  // authorised callers
  address public riskEngine;
  address public settlementManager;

  // --- Events ---

  event PositionPlaced(
    bytes32 indexed positionId,
    address indexed bettor,
    uint256 stake,
    uint256 potentialPayout,
    uint8 riskTier,
    uint256 timestamp
  );

  event LegResolved(
    bytes32 indexed positionId,
    uint8 legIndex,
    LegStatus outcome,
    uint256 timestamp
  );

  event PositionWon(
    bytes32 indexed positionId,
    address indexed bettor,
    uint256 payout,
    uint256 timestamp
  );

  event PositionLost(
    bytes32 indexed positionId,
    address indexed bettor,
    uint256 stake,
    uint256 timestamp
  );

  event PositionVoided(
    bytes32 indexed positionId,
    address indexed bettor,
    uint256 stakeRefunded,
    uint256 timestamp
  );

  // --- Constructor ---

  constructor(
    IERC20 _usdc,
    IVaultManager _vault,
    VaultConfig.Config memory _config,
    address _owner
  ) Ownable(_owner) {
    usdc = _usdc;
    vault = _vault;
    config = _config;
  }

  // --- Access Control ---

  modifier onlyRiskEngine() {
    require(msg.sender == riskEngine, "PositionBook: not RiskEngine");
    _;
  }

  modifier onlySettlementManager() {
    require(
      msg.sender == settlementManager,
      "PositionBook: not SettlementManager"
    );
    _;
  }

  function setRiskEngine(address _riskEngine) external onlyOwner {
    riskEngine = _riskEngine;
  }

  function setSettlementManager(address _settlementManager) external onlyOwner {
    settlementManager = _settlementManager;
  }

  // --- Core: Place Position ---
  // Called by RiskEngine after World ID verification and stake limit check

  function placePosition(
    address bettor,
    bytes32[] calldata marketIds,
    uint8[] calldata outcomes,
    uint64[] calldata lockedOdds,
    uint64[] calldata resolutionTimes,
    uint256 stake,
    uint64 combinedOdds,
    uint8 riskTier,
    bytes32 riskAuditHash
  ) external onlyRiskEngine nonReentrant returns (bytes32 positionId) {
    // Validate
    require(
      marketIds.length >= 1 && marketIds.length <= 10,
      "PositionBook: 1-10 legs required"
    );
    require(
      marketIds.length == outcomes.length,
      "PositionBook: leg count mismatch"
    );
    require(
      stake > 0 && stake <= config.maxStake,
      "PositionBook: invalid stake"
    );
    require(vault.isAcceptingPositions(), "PositionBook: vault not accepting");

    // Calculate payout — capped at maxPayout
    uint256 rawPayout = (stake * combinedOdds) / 1e6;
    uint256 potentialPayout = rawPayout > config.maxPayout
      ? config.maxPayout
      : rawPayout;

    // Generate position ID
    positionId = keccak256(
      abi.encodePacked(bettor, block.timestamp, block.number, stake)
    );

    // Pull stake from bettor
    usdc.safeTransferFrom(bettor, address(this), stake);

    // Lock liability in vault
    vault.increaseLiability(potentialPayout);

    // Store position
    positions[positionId] = Position({
      id: positionId,
      bettor: bettor,
      stake: stake,
      potentialPayout: potentialPayout,
      combinedOdds: combinedOdds,
      riskTier: riskTier,
      riskAuditHash: riskAuditHash,
      placedAt: block.timestamp,
      status: PositionStatus.OPEN,
      legsWon: 0,
      legsTotal: uint8(marketIds.length)
    });

    // Store legs
    for (uint8 i = 0; i < marketIds.length; i++) {
      positionLegs[positionId].push(
        Leg({
          marketId: marketIds[i],
          outcome: outcomes[i],
          lockedOdds: lockedOdds[i],
          resolutionTime: resolutionTimes[i],
          status: LegStatus.OPEN
        })
      );

      // Index market -> position
      marketToPositions[marketIds[i]].push(positionId);
    }

    // Track
    bettorPositions[bettor].push(positionId);
    openPositions.push(positionId);

    emit PositionPlaced(
      positionId,
      bettor,
      stake,
      potentialPayout,
      riskTier,
      block.timestamp
    );
  }

  // --- Core: Resolve Leg ---
  // Called by SettlementManager when Chainlink CRE confirms a market outcome

  function resolveLeg(
    bytes32 positionId,
    uint8 legIndex,
    bool won
  ) external onlySettlementManager {
    Position storage pos = positions[positionId];
    require(pos.id != bytes32(0), "PositionBook: position not found");
    require(
      pos.status == PositionStatus.OPEN || pos.status == PositionStatus.PARTIAL,
      "PositionBook: position already settled"
    );

    Leg storage leg = positionLegs[positionId][legIndex];
    require(leg.status == LegStatus.OPEN, "PositionBook: leg already resolved");

    leg.status = won ? LegStatus.WON : LegStatus.LOST;
    emit LegResolved(positionId, legIndex, leg.status, block.timestamp);

    if (won) {
      pos.legsWon++;
    }

    // Check if all legs resolved
    uint8 resolved = 0;
    for (uint8 i = 0; i < pos.legsTotal; i++) {
      if (positionLegs[positionId][i].status != LegStatus.OPEN) {
        resolved++;
      }
    }

    if (resolved == pos.legsTotal) {
      // All legs resolved
      if (pos.legsWon == pos.legsTotal) {
        // All won — initiate settlement delay
        pos.status = PositionStatus.WON;
        _removeFromOpen(positionId);
        // SettlementManager handles the delay and payout
      } else {
        // At least one lost — position lost immediately
        pos.status = PositionStatus.LOST;
        _removeFromOpen(positionId);
        _settleLoss(positionId);
      }
    } else if (pos.legsWon > 0 || resolved > 0) {
      pos.status = PositionStatus.PARTIAL;
    }
  }

  // --- Core: Void Leg ---
  // Called when a Polymarket market is cancelled/voided

  function voidPosition(bytes32 positionId) external onlySettlementManager {
    Position storage pos = positions[positionId];
    require(pos.id != bytes32(0), "PositionBook: position not found");
    require(
      pos.status == PositionStatus.OPEN || pos.status == PositionStatus.PARTIAL,
      "PositionBook: already settled"
    );

    pos.status = PositionStatus.VOIDED;
    _removeFromOpen(positionId);

    // Release liability
    vault.decreaseLiability(pos.potentialPayout);

    // Refund stake to bettor
    usdc.safeTransfer(pos.bettor, pos.stake);

    emit PositionVoided(positionId, pos.bettor, pos.stake, block.timestamp);
  }

  // --- Core: Execute Payout ---
  // Called by SettlementManager after delay + verification

  function executePayout(bytes32 positionId)
    external
    onlySettlementManager
    nonReentrant
  {
    Position storage pos = positions[positionId];
    require(pos.status == PositionStatus.WON, "PositionBook: position not won");

    uint256 payout = pos.potentialPayout;
    address bettor = pos.bettor;

    // Mark as final (prevent re-entry)
    pos.potentialPayout = 0;

    // Pay from vault
    vault.payWinner(bettor, payout);

    emit PositionWon(positionId, bettor, payout, block.timestamp);
  }

  // --- Internal ---

  function _settleLoss(bytes32 positionId) internal {
    Position storage pos = positions[positionId];

    // Release vault liability
    vault.decreaseLiability(pos.potentialPayout);

    // Sweep stake to vault
    usdc.safeTransfer(address(vault), pos.stake);
    vault.sweepLoss(pos.stake);

    emit PositionLost(positionId, pos.bettor, pos.stake, block.timestamp);
  }

  function _removeFromOpen(bytes32 positionId) internal {
    for (uint256 i = 0; i < openPositions.length; i++) {
      if (openPositions[i] == positionId) {
        openPositions[i] = openPositions[openPositions.length - 1];
        openPositions.pop();
        break;
      }
    }
  }

  // --- View Functions ---

  // For MVP frontend compatibility, add an owner-scoped paginated read
  // instead of relying only on getBettorPositions(address).
  // Recommended shape:
  // getPositionsByOwner(address owner, uint256 cursor, uint256 size)
  //   returns (bytes32[] memory ids, uint256 nextCursor, bool hasMore)
  // Leg-count rules should be treated as protocol configuration,
  // not a product copy constant.

  function getPosition(bytes32 positionId)
    external
    view
    returns (Position memory)
  {
    return positions[positionId];
  }

  function getPositionLegs(bytes32 positionId)
    external
    view
    returns (Leg[] memory)
  {
    return positionLegs[positionId];
  }

  function getBettorPositions(address bettor)
    external
    view
    returns (bytes32[] memory)
  {
    return bettorPositions[bettor];
  }

  function getOpenPositions() external view returns (bytes32[] memory) {
    return openPositions;
  }

  function getOpenPositionCount() external view returns (uint256) {
    return openPositions.length;
  }

  function getPositionsByMarket(bytes32 marketId)
    external
    view
    returns (bytes32[] memory)
  {
    return marketToPositions[marketId];
  }
}

```

---

## IVaultManager Interface

Create this in interfaces/ so PositionBook can call the vault:

```solidity
// interfaces/IVaultManager.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVaultManager {
  function increaseLiability(uint256 amount) external;

  function decreaseLiability(uint256 amount) external;

  function sweepLoss(uint256 amount) external;

  function payWinner(address winner, uint256 amount) external;

  function isAcceptingPositions() external view returns (bool);

  function totalAssets() external view returns (uint256);
}

```

---

## Key Design Points

**Leg correlation stored onchain:**
The `riskAuditHash` (0G Storage CID) contains the full AI risk assessment. Anyone can retrieve it and verify the correlation score that was used to price the position.

**Combined odds scaled 1e6:**
Odds of 2.5x stored as `2_500_000`. This avoids floating point in Solidity. Frontend converts: `combinedOdds / 1e6`.

**Payout cap enforcement:**

```solidity
uint256 rawPayout = (stake * combinedOdds) / 1e6;
uint256 potentialPayout = rawPayout > config.maxPayout
    ? config.maxPayout
    : rawPayout;
```

The cap is applied at position creation — bettor sees the exact capped payout before submitting.

**Loss settlement is immediate:**
When the last leg resolves and any leg is LOST, stake sweeps to vault instantly. No delay needed — the pool already took the risk, now it collects.

**Win settlement has delay:**
When all legs WIN, status becomes WON but payout waits for SettlementManager to execute after the delay + verification window.

---

## Gotchas

- `positionId` is generated onchain from bettor + timestamp + block.number — cannot be predicted before tx confirms
- `lockedOdds` are scaled 1e6 — always divide by 1e6 when displaying
- `_removeFromOpen` uses swap-and-pop — O(1) but changes array order, which is fine
- `openPositions` can grow large — CRE workflow iterates it every 2 minutes, fine for hackathon scale
- USDC approve must happen before `placePosition` is called — frontend handles this
- Always check `vault.isAcceptingPositions()` before accepting stake — vault may be at capacity
- `executePayout` sets `potentialPayout = 0` before transferring — re-entrancy protection
- Never call `_settleLoss` from outside the contract — it transfers USDC, must be internal
