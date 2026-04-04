// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IVaultManager} from "./interfaces/IVaultManager.sol";
import {VaultConfig} from "./libraries/VaultConfig.sol";

contract PositionBook is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using VaultConfig for VaultConfig.Config;

    error PositionBookInvalidCaller();
    error PositionBookInvalidRules();
    error PositionBookPositionNotFound();
    error PositionBookAlreadySettled();
    error PositionBookLegCountOutOfRange();
    error PositionBookLengthMismatch();
    error PositionBookInvalidStake();
    error PositionBookDuplicateMarket();
    error PositionBookVaultNotAccepting();
    error PositionBookLegAlreadyResolved();
    error PositionBookInvalidLegIndex();
    error PositionBookPositionNotWon();

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

    enum RiskTier {
        LOW,
        MEDIUM,
        HIGH
    }

    struct Leg {
        bytes32 marketId;
        uint8 outcome;
        uint64 lockedOdds;
        uint64 resolutionTime;
        LegStatus status;
    }

    struct Position {
        bytes32 id;
        address bettor;
        address vault;
        uint256 stake;
        uint256 potentialPayout;
        uint64 combinedOdds;
        RiskTier riskTier;
        bytes32 riskAuditHash;
        uint64 placedAt;
        PositionStatus status;
        uint8 legsWon;
        uint8 legsTotal;
        bool worldIdVerified;
    }

    struct PositionRules {
        uint8 minLegsPerPosition;
        uint8 maxLegsPerPosition;
    }

    VaultConfig.Config public config;
    IERC20 public immutable usdc;
    IVaultManager public immutable vault;
    PositionRules private positionRules;

    mapping(bytes32 => Position) private positions;
    mapping(bytes32 => Leg[]) private positionLegs;
    mapping(address => bytes32[]) private bettorPositions;
    mapping(bytes32 => bytes32[]) private marketToPositions;
    bytes32[] private openPositions;

    address public riskEngine;
    address public settlementManager;
    uint256 public nextPositionNonce;

    event PositionPlaced(
        bytes32 indexed positionId,
        address indexed bettor,
        uint256 stake,
        uint256 potentialPayout,
        uint8 riskTier,
        bytes32 riskAuditHash,
        uint256 timestamp
    );
    event LegResolved(bytes32 indexed positionId, uint8 legIndex, LegStatus outcome, uint256 timestamp);
    event PositionWon(
        bytes32 indexed positionId,
        address indexed bettor,
        uint256 payout,
        uint256 timestamp
    );
    event PositionLost(bytes32 indexed positionId, address indexed bettor, uint256 stake, uint256 timestamp);
    event PositionVoided(
        bytes32 indexed positionId,
        address indexed bettor,
        uint256 refundedStake,
        uint256 timestamp
    );
    event RiskEngineUpdated(address indexed riskEngine);
    event SettlementManagerUpdated(address indexed settlementManager);

    modifier onlyRiskEngine() {
        if (msg.sender != riskEngine) {
            revert PositionBookInvalidCaller();
        }
        _;
    }

    modifier onlySettlementManager() {
        if (msg.sender != settlementManager) {
            revert PositionBookInvalidCaller();
        }
        _;
    }

    constructor(
        IERC20 _usdc,
        IVaultManager _vault,
        VaultConfig.Config memory _config,
        uint8 _minLegsPerPosition,
        uint8 _maxLegsPerPosition,
        address _owner
    ) Ownable(_owner) {
        if (
            address(_usdc) == address(0) ||
            address(_vault) == address(0) ||
            _owner == address(0) ||
            _minLegsPerPosition == 0 ||
            _minLegsPerPosition > _maxLegsPerPosition
        ) {
            revert PositionBookInvalidRules();
        }

        _config.validate();

        usdc = _usdc;
        vault = _vault;
        config = _config;
        positionRules = PositionRules({
            minLegsPerPosition: _minLegsPerPosition,
            maxLegsPerPosition: _maxLegsPerPosition
        });
    }

    function setRiskEngine(address _riskEngine) external onlyOwner {
        if (_riskEngine == address(0)) {
            revert PositionBookInvalidRules();
        }

        riskEngine = _riskEngine;
        emit RiskEngineUpdated(_riskEngine);
    }

    function setSettlementManager(address _settlementManager) external onlyOwner {
        if (_settlementManager == address(0)) {
            revert PositionBookInvalidRules();
        }

        settlementManager = _settlementManager;
        emit SettlementManagerUpdated(_settlementManager);
    }

    function getPositionRules() external view returns (PositionRules memory) {
        return positionRules;
    }

    function placePosition(
        address bettor,
        bytes32[] calldata marketIds,
        uint8[] calldata outcomes,
        uint64[] calldata lockedOdds,
        uint64[] calldata resolutionTimes,
        uint256 stake,
        uint64 combinedOdds,
        uint8 riskTier,
        bytes32 riskAuditHash,
        bool worldIdVerified
    ) external onlyRiskEngine nonReentrant returns (bytes32 positionId) {
        uint256 legsLength = marketIds.length;

        if (
            legsLength < positionRules.minLegsPerPosition ||
            legsLength > positionRules.maxLegsPerPosition
        ) {
            revert PositionBookLegCountOutOfRange();
        }

        if (
            legsLength != outcomes.length ||
            legsLength != lockedOdds.length ||
            legsLength != resolutionTimes.length
        ) {
            revert PositionBookLengthMismatch();
        }

        if (stake == 0 || stake > config.maxStake) {
            revert PositionBookInvalidStake();
        }

        if (!vault.isAcceptingPositions()) {
            revert PositionBookVaultNotAccepting();
        }

        _validateDistinctMarkets(marketIds);

        uint256 rawPayout = (stake * combinedOdds) / 1e6;
        uint256 potentialPayout = rawPayout > config.maxPayout ? config.maxPayout : rawPayout;

        vault.increaseLiability(potentialPayout);

        positionId = keccak256(
            abi.encodePacked(bettor, address(this), block.chainid, nextPositionNonce++, stake)
        );

        positions[positionId] = Position({
            id: positionId,
            bettor: bettor,
            vault: address(vault),
            stake: stake,
            potentialPayout: potentialPayout,
            combinedOdds: combinedOdds,
            riskTier: RiskTier(riskTier),
            riskAuditHash: riskAuditHash,
            placedAt: uint64(block.timestamp),
            status: PositionStatus.OPEN,
            legsWon: 0,
            legsTotal: uint8(legsLength),
            worldIdVerified: worldIdVerified
        });

        for (uint256 i = 0; i < legsLength; ++i) {
            positionLegs[positionId].push(
                Leg({
                    marketId: marketIds[i],
                    outcome: outcomes[i],
                    lockedOdds: lockedOdds[i],
                    resolutionTime: resolutionTimes[i],
                    status: LegStatus.OPEN
                })
            );
            marketToPositions[marketIds[i]].push(positionId);
        }

        bettorPositions[bettor].push(positionId);
        openPositions.push(positionId);

        emit PositionPlaced(
            positionId,
            bettor,
            stake,
            potentialPayout,
            riskTier,
            riskAuditHash,
            block.timestamp
        );
    }

    function resolveLeg(
        bytes32 positionId,
        uint8 legIndex,
        bool won
    ) external onlySettlementManager {
        Position storage position = positions[positionId];

        if (position.id == bytes32(0)) {
            revert PositionBookPositionNotFound();
        }

        if (position.status == PositionStatus.LOST || position.status == PositionStatus.VOIDED) {
            revert PositionBookAlreadySettled();
        }

        if (legIndex >= positionLegs[positionId].length) {
            revert PositionBookInvalidLegIndex();
        }

        Leg storage leg = positionLegs[positionId][legIndex];

        if (leg.status != LegStatus.OPEN) {
            revert PositionBookLegAlreadyResolved();
        }

        leg.status = won ? LegStatus.WON : LegStatus.LOST;

        if (won) {
            position.legsWon += 1;
        }

        emit LegResolved(positionId, legIndex, leg.status, block.timestamp);

        (uint8 resolvedLegs, bool anyLost) = _resolutionProgress(positionId);

        if (resolvedLegs == position.legsTotal) {
            _finalizeResolvedPosition(positionId, anyLost);
        } else if (resolvedLegs > 0) {
            position.status = PositionStatus.PARTIAL;
        }
    }

    function voidPosition(bytes32 positionId) external onlySettlementManager nonReentrant {
        Position storage position = positions[positionId];

        if (position.id == bytes32(0)) {
            revert PositionBookPositionNotFound();
        }

        if (
            position.status == PositionStatus.LOST ||
            position.status == PositionStatus.VOIDED ||
            (position.status == PositionStatus.WON && position.potentialPayout == 0)
        ) {
            revert PositionBookAlreadySettled();
        }

        position.status = PositionStatus.VOIDED;
        position.potentialPayout = 0;

        for (uint256 i = 0; i < positionLegs[positionId].length; ++i) {
            if (positionLegs[positionId][i].status == LegStatus.OPEN) {
                positionLegs[positionId][i].status = LegStatus.VOIDED;
            }
        }

        _removeOpenPosition(positionId);
        vault.decreaseLiability(position.potentialPayout);
        usdc.safeTransfer(position.bettor, position.stake);

        emit PositionVoided(positionId, position.bettor, position.stake, block.timestamp);
    }

    function executePayout(bytes32 positionId) external onlySettlementManager nonReentrant {
        Position storage position = positions[positionId];

        if (position.id == bytes32(0)) {
            revert PositionBookPositionNotFound();
        }

        if (position.status != PositionStatus.WON || position.potentialPayout == 0) {
            revert PositionBookPositionNotWon();
        }

        uint256 payout = position.potentialPayout;
        position.potentialPayout = 0;

        vault.decreaseLiability(payout);
        usdc.safeTransfer(address(vault), position.stake);
        vault.payWinner(position.bettor, payout);

        emit PositionWon(positionId, position.bettor, payout, block.timestamp);
    }

    function getPosition(bytes32 positionId) external view returns (Position memory) {
        return positions[positionId];
    }

    function getPositionLegs(bytes32 positionId) external view returns (Leg[] memory) {
        return positionLegs[positionId];
    }

    function getBettorPositions(address bettor) external view returns (bytes32[] memory) {
        return bettorPositions[bettor];
    }

    function getPositionsByOwner(
        address owner,
        uint256 cursor,
        uint256 size
    ) external view returns (bytes32[] memory ids, uint256 nextCursor, bool hasMore) {
        bytes32[] storage ownerPositions = bettorPositions[owner];
        uint256 length = ownerPositions.length;

        if (cursor >= length) {
            return (new bytes32[](0), cursor, false);
        }

        uint256 end = cursor + size;

        if (end > length) {
            end = length;
        }

        ids = new bytes32[](end - cursor);

        for (uint256 i = cursor; i < end; ++i) {
            ids[i - cursor] = ownerPositions[i];
        }

        nextCursor = end;
        hasMore = end < length;
    }

    function getOpenPositions() external view returns (bytes32[] memory) {
        return openPositions;
    }

    function getOpenPositionCount() external view returns (uint256) {
        return openPositions.length;
    }

    function getPositionsByMarket(bytes32 marketId) external view returns (bytes32[] memory) {
        return marketToPositions[marketId];
    }

    function _validateDistinctMarkets(bytes32[] calldata marketIds) internal pure {
        for (uint256 i = 0; i < marketIds.length; ++i) {
            for (uint256 j = i + 1; j < marketIds.length; ++j) {
                if (marketIds[i] == marketIds[j]) {
                    revert PositionBookDuplicateMarket();
                }
            }
        }
    }

    function _resolutionProgress(
        bytes32 positionId
    ) internal view returns (uint8 resolvedLegs, bool anyLost) {
        Leg[] storage legs = positionLegs[positionId];

        for (uint256 i = 0; i < legs.length; ++i) {
            if (legs[i].status != LegStatus.OPEN) {
                resolvedLegs += 1;
            }

            if (legs[i].status == LegStatus.LOST) {
                anyLost = true;
            }
        }
    }

    function _finalizeResolvedPosition(bytes32 positionId, bool anyLost) internal {
        Position storage position = positions[positionId];

        _removeOpenPosition(positionId);

        if (anyLost) {
            position.status = PositionStatus.LOST;
            vault.decreaseLiability(position.potentialPayout);
            usdc.safeTransfer(address(vault), position.stake);
            vault.sweepLoss(position.stake);

            emit PositionLost(positionId, position.bettor, position.stake, block.timestamp);
            return;
        }

        position.status = PositionStatus.WON;
    }

    function _removeOpenPosition(bytes32 positionId) internal {
        uint256 length = openPositions.length;

        for (uint256 i = 0; i < length; ++i) {
            if (openPositions[i] == positionId) {
                openPositions[i] = openPositions[length - 1];
                openPositions.pop();
                return;
            }
        }
    }
}
