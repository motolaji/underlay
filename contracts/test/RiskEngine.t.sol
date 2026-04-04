// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Stage2Fixtures} from "./helpers/Stage2Fixtures.sol";

contract RiskEngineTest is Stage2Fixtures {
    function test_submitPosition_belowGate_skipsWorldId() public {
        bytes32 positionId = _submitPosition(1e6, 2e6);

        assertTrue(positionId != bytes32(0));
        assertEq(usdc.balanceOf(address(book)), 1e6);
    }

    function test_submitPosition_aboveGate_requiresValidProof() public {
        worldId.setShouldRevert(true);

        bytes32[] memory marketIds = new bytes32[](1);
        marketIds[0] = keccak256("eth-above-4000");

        uint8[] memory outcomes = new uint8[](1);
        outcomes[0] = 0;

        uint64[] memory lockedOdds = new uint64[](1);
        lockedOdds[0] = 1_500_000;

        uint64[] memory resolutionTimes = new uint64[](1);
        resolutionTimes[0] = uint64(block.timestamp + 1 days);

        vm.startPrank(bettor);
        usdc.approve(address(risk), 1500000);
        vm.expectRevert();
        risk.submitPosition(
            marketIds,
            outcomes,
            lockedOdds,
            resolutionTimes,
            1500000,
            1_500_000,
            0,
            bytes32(0),
            2e6,
            1,
            123,
            [uint256(0), 0, 0, 0, 0, 0, 0, 0]
        );
        vm.stopPrank();
    }

    function test_submitPosition_reusesNullifier_reverts() public {
        bytes32[] memory marketIds = new bytes32[](1);
        marketIds[0] = keccak256("eth-above-4000");

        uint8[] memory outcomes = new uint8[](1);
        outcomes[0] = 0;

        uint64[] memory lockedOdds = new uint64[](1);
        lockedOdds[0] = 1_500_000;

        uint64[] memory resolutionTimes = new uint64[](1);
        resolutionTimes[0] = uint64(block.timestamp + 1 days);

        vm.startPrank(bettor);
        usdc.approve(address(risk), 3e6);
        risk.submitPosition(
            marketIds,
            outcomes,
            lockedOdds,
            resolutionTimes,
            1500000,
            1_500_000,
            0,
            bytes32(0),
            2e6,
            1,
            123,
            [uint256(0), 0, 0, 0, 0, 0, 0, 0]
        );

        vm.expectRevert();
        risk.submitPosition(
            marketIds,
            outcomes,
            lockedOdds,
            resolutionTimes,
            1500000,
            1_500_000,
            0,
            bytes32(0),
            2e6,
            1,
            123,
            [uint256(0), 0, 0, 0, 0, 0, 0, 0]
        );
        vm.stopPrank();
    }
}
