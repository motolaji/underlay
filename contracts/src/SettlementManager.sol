// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IPositionBook} from "./interfaces/IPositionBook.sol";

contract SettlementManager is Ownable, ReentrancyGuard {
    error SettlementManagerZeroAddress();
    error SettlementManagerInvalidCaller();
    error SettlementManagerArrayLengthMismatch();
    error SettlementManagerNoPendingSettlement();
    error SettlementManagerAlreadyExecuted();
    error SettlementManagerUnderChallenge();
    error SettlementManagerDelayNotElapsed();
    error SettlementManagerAlreadyChallenged();
    error SettlementManagerChallengeWindowClosed();
    error SettlementManagerChallengeNotActive();
    error SettlementManagerInvalidDelayConfig();

    // Configurable delays — owner can adjust without redeploy
    uint32 public delayLow;
    uint32 public delayMedium;
    uint32 public delayHigh;
    uint32 public challengeExtension;

    enum SettlementPhase {
        NONE,
        DELAY_ACTIVE,
        CHALLENGE_WINDOW,
        EXECUTABLE,
        EXECUTED
    }

    struct PendingSettlement {
        bytes32 positionId;
        uint64 settleAfter;
        uint64 settledAt;
        bool challenged;
        bool executed;
    }

    struct DelayConfig {
        uint32 lowDelaySeconds;
        uint32 mediumDelaySeconds;
        uint32 highDelaySeconds;
        uint32 challengeExtensionSeconds;
    }

    IPositionBook public immutable positionBook;
    address public creForwarder;
    address public challengeCouncil;

    mapping(bytes32 => PendingSettlement) public pendingSettlements;

    event LegResolvedByOracle(
        bytes32 indexed positionId,
        uint8 legIndex,
        bool won,
        uint256 timestamp
    );
    event SettlementInitiated(
        bytes32 indexed positionId,
        uint256 settleAfter,
        uint8 riskTier,
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
        bool payoutConfirmed,
        uint256 timestamp
    );
    event CreForwarderUpdated(address indexed creForwarder);
    event ChallengeCouncilUpdated(address indexed challengeCouncil);
    event DelayConfigUpdated(uint32 low, uint32 medium, uint32 high);
    event ChallengeExtensionUpdated(uint32 extension);

    modifier onlyCRE() {
        if (msg.sender != creForwarder && msg.sender != address(this)) {
            revert SettlementManagerInvalidCaller();
        }
        _;
    }

    modifier onlyChallengeCouncil() {
        if (msg.sender != challengeCouncil) {
            revert SettlementManagerInvalidCaller();
        }
        _;
    }

    constructor(
        IPositionBook _positionBook,
        address _creForwarder,
        address _challengeCouncil,
        address _owner,
        uint32 _delayLow,
        uint32 _delayMedium,
        uint32 _delayHigh,
        uint32 _challengeExtension
    ) Ownable(_owner) {
        if (
            address(_positionBook) == address(0) ||
            _creForwarder == address(0) ||
            _challengeCouncil == address(0) ||
            _owner == address(0)
        ) {
            revert SettlementManagerZeroAddress();
        }

        if (_delayLow == 0 || _delayMedium < _delayLow || _delayHigh < _delayMedium) {
            revert SettlementManagerInvalidDelayConfig();
        }

        positionBook = _positionBook;
        creForwarder = _creForwarder;
        challengeCouncil = _challengeCouncil;
        delayLow = _delayLow;
        delayMedium = _delayMedium;
        delayHigh = _delayHigh;
        challengeExtension = _challengeExtension;
    }

    function setCREForwarder(address nextCreForwarder) external onlyOwner {
        if (nextCreForwarder == address(0)) {
            revert SettlementManagerZeroAddress();
        }

        creForwarder = nextCreForwarder;
        emit CreForwarderUpdated(nextCreForwarder);
    }

    function setChallengeCouncil(address nextChallengeCouncil) external onlyOwner {
        if (nextChallengeCouncil == address(0)) {
            revert SettlementManagerZeroAddress();
        }

        challengeCouncil = nextChallengeCouncil;
        emit ChallengeCouncilUpdated(nextChallengeCouncil);
    }

    function setDelayConfig(uint32 low, uint32 medium, uint32 high) external onlyOwner {
        if (low == 0 || medium < low || high < medium) {
            revert SettlementManagerInvalidDelayConfig();
        }

        delayLow = low;
        delayMedium = medium;
        delayHigh = high;
        emit DelayConfigUpdated(low, medium, high);
    }

    function setChallengeExtension(uint32 extension) external onlyOwner {
        challengeExtension = extension;
        emit ChallengeExtensionUpdated(extension);
    }

    function resolveLeg(bytes32 positionId, uint8 legIndex, bool won) external onlyCRE {
        _resolveLeg(positionId, legIndex, won);
    }

    function resolveLegs(
        bytes32[] calldata positionIds,
        uint8[] calldata legIndexes,
        bool[] calldata outcomes
    ) external onlyCRE {
        if (positionIds.length != legIndexes.length || legIndexes.length != outcomes.length) {
            revert SettlementManagerArrayLengthMismatch();
        }

        for (uint256 i = 0; i < positionIds.length; ++i) {
            try this.resolveLeg(positionIds[i], legIndexes[i], outcomes[i]) {} catch {}
        }
    }

    function executeSettlement(bytes32 positionId) external nonReentrant {
        PendingSettlement storage settlement = pendingSettlements[positionId];

        if (settlement.positionId == bytes32(0)) {
            revert SettlementManagerNoPendingSettlement();
        }

        if (settlement.executed) {
            revert SettlementManagerAlreadyExecuted();
        }

        if (settlement.challenged) {
            revert SettlementManagerUnderChallenge();
        }

        if (block.timestamp < settlement.settleAfter) {
            revert SettlementManagerDelayNotElapsed();
        }

        IPositionBook.Position memory position = positionBook.getPosition(positionId);

        settlement.executed = true;
        settlement.settledAt = uint64(block.timestamp);

        positionBook.executePayout(positionId);

        emit SettlementExecuted(positionId, position.potentialPayout, block.timestamp);
    }

    function challengeSettlement(bytes32 positionId) external {
        PendingSettlement storage settlement = pendingSettlements[positionId];

        if (settlement.positionId == bytes32(0)) {
            revert SettlementManagerNoPendingSettlement();
        }

        if (settlement.executed) {
            revert SettlementManagerAlreadyExecuted();
        }

        if (settlement.challenged) {
            revert SettlementManagerAlreadyChallenged();
        }

        if (block.timestamp >= settlement.settleAfter) {
            revert SettlementManagerChallengeWindowClosed();
        }

        settlement.challenged = true;
        settlement.settleAfter = uint64(block.timestamp + challengeExtension);

        emit SettlementChallenged(positionId, msg.sender, block.timestamp);
    }

    function resolveChallenge(bytes32 positionId, bool confirmPayout) external onlyChallengeCouncil {
        PendingSettlement storage settlement = pendingSettlements[positionId];

        if (settlement.positionId == bytes32(0)) {
            revert SettlementManagerNoPendingSettlement();
        }

        if (!settlement.challenged) {
            revert SettlementManagerChallengeNotActive();
        }

        if (settlement.executed) {
            revert SettlementManagerAlreadyExecuted();
        }

        if (confirmPayout) {
            settlement.challenged = false;
            settlement.settleAfter = uint64(block.timestamp);
        } else {
            settlement.executed = true;
            settlement.settledAt = uint64(block.timestamp);
            positionBook.voidPosition(positionId);
        }

        emit ChallengeResolved(positionId, confirmPayout, block.timestamp);
    }

    function getSettlementState(
        bytes32 positionId
    ) external view returns (SettlementPhase phase, uint32 delaySeconds, uint64 unlockTimestamp, bool challenged, uint64 settledAt) {
        PendingSettlement memory settlement = pendingSettlements[positionId];

        if (settlement.positionId == bytes32(0)) {
            return (SettlementPhase.NONE, 0, 0, false, 0);
        }

        challenged = settlement.challenged;
        settledAt = settlement.settledAt;
        unlockTimestamp = settlement.settleAfter;

        if (settlement.executed) {
            return (SettlementPhase.EXECUTED, 0, unlockTimestamp, challenged, settledAt);
        }

        IPositionBook.Position memory position = positionBook.getPosition(positionId);
        delaySeconds = uint32(_getDelay(uint8(position.riskTier)));

        if (settlement.challenged) {
            phase = SettlementPhase.CHALLENGE_WINDOW;
        } else if (block.timestamp >= settlement.settleAfter) {
            phase = SettlementPhase.EXECUTABLE;
        } else {
            phase = SettlementPhase.DELAY_ACTIVE;
        }
    }

    function getDelayConfig() external view returns (DelayConfig memory) {
        return DelayConfig({
            lowDelaySeconds: delayLow,
            mediumDelaySeconds: delayMedium,
            highDelaySeconds: delayHigh,
            challengeExtensionSeconds: challengeExtension
        });
    }

    function isReadyToSettle(bytes32 positionId) external view returns (bool) {
        PendingSettlement memory settlement = pendingSettlements[positionId];

        return settlement.positionId != bytes32(0) &&
            !settlement.executed &&
            !settlement.challenged &&
            block.timestamp >= settlement.settleAfter;
    }

    function _resolveLeg(bytes32 positionId, uint8 legIndex, bool won) internal {
        positionBook.resolveLeg(positionId, legIndex, won);

        emit LegResolvedByOracle(positionId, legIndex, won, block.timestamp);

        IPositionBook.Position memory position = positionBook.getPosition(positionId);

        if (position.status == IPositionBook.PositionStatus.WON) {
            _initiateSettlement(positionId, uint8(position.riskTier));
        }
    }

    function _initiateSettlement(bytes32 positionId, uint8 riskTier) internal {
        PendingSettlement storage existing = pendingSettlements[positionId];

        if (existing.positionId != bytes32(0)) {
            return;
        }

        uint256 settleAfter = block.timestamp + _getDelay(riskTier);
        pendingSettlements[positionId] = PendingSettlement({
            positionId: positionId,
            settleAfter: uint64(settleAfter),
            settledAt: 0,
            challenged: false,
            executed: false
        });

        emit SettlementInitiated(positionId, settleAfter, riskTier, block.timestamp);
    }

    function _getDelay(uint8 riskTier) internal view returns (uint256) {
        if (riskTier == uint8(IPositionBook.RiskTier.LOW)) {
            return delayLow;
        }

        if (riskTier == uint8(IPositionBook.RiskTier.MEDIUM)) {
            return delayMedium;
        }

        return delayHigh;
    }
}
