// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPositionBook {
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

    struct PositionRules {
        uint8 minLegsPerPosition;
        uint8 maxLegsPerPosition;
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

    function getPositionRules() external view returns (PositionRules memory);

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
    ) external returns (bytes32 positionId);

    function resolveLeg(bytes32 positionId, uint8 legIndex, bool won) external;

    function voidPosition(bytes32 positionId) external;

    function executePayout(bytes32 positionId) external;

    function getPosition(bytes32 positionId) external view returns (Position memory);

    function getOpenPositions() external view returns (bytes32[] memory);
}
