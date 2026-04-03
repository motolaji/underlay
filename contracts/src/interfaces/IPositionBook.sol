// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPositionBook {
    struct PositionRules {
        uint8 minLegsPerPosition;
        uint8 maxLegsPerPosition;
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
}
