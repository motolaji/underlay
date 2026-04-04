// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Stage2Fixtures} from "./helpers/Stage2Fixtures.sol";
import {SettlementManager} from "../src/SettlementManager.sol";
import {PositionBook} from "../src/PositionBook.sol";

contract SettlementManagerTest is Stage2Fixtures {
    function test_resolveLegs_winInitiatesDelay() public {
        bytes32 positionId = _submitPosition(2e6, 2e6);

        vm.startPrank(settlementOperator);
        settlement.resolveLeg(positionId, 0, true);
        settlement.resolveLeg(positionId, 1, true);
        vm.stopPrank();

        (
            SettlementManager.SettlementPhase phase,
            uint32 delaySeconds,
            uint64 unlockTimestamp,
            bool challenged,
            uint64 settledAt
        ) = settlement.getSettlementState(positionId);

        assertEq(uint8(phase), uint8(SettlementManager.SettlementPhase.DELAY_ACTIVE));
        assertEq(delaySeconds, 1 hours);
        assertGt(unlockTimestamp, block.timestamp);
        assertFalse(challenged);
        assertEq(settledAt, 0);
    }

    function test_executeSettlement_afterDelayPaysOut() public {
        bytes32 positionId = _submitPosition(2e6, 2e6);
        uint256 balanceBefore = usdc.balanceOf(bettor);

        vm.startPrank(settlementOperator);
        settlement.resolveLeg(positionId, 0, true);
        settlement.resolveLeg(positionId, 1, true);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 hours + 1);
        settlement.executeSettlement(positionId);

        PositionBook.Position memory position = book.getPosition(positionId);
        (, , , , uint64 settledAt) = settlement.getSettlementState(positionId);

        assertEq(position.potentialPayout, 0);
        assertGt(usdc.balanceOf(bettor), balanceBefore);
        assertGt(settledAt, 0);
    }

    function test_challengeSettlement_blocksExecutionUntilResolved() public {
        bytes32 positionId = _submitPosition(2e6, 2e6);

        vm.startPrank(settlementOperator);
        settlement.resolveLeg(positionId, 0, true);
        settlement.resolveLeg(positionId, 1, true);
        vm.stopPrank();

        settlement.challengeSettlement(positionId);

        vm.warp(block.timestamp + 2 hours + 1);
        vm.expectRevert();
        settlement.executeSettlement(positionId);

        vm.prank(owner);
        settlement.resolveChallenge(positionId, true);
        settlement.executeSettlement(positionId);

        (, , , , uint64 settledAt) = settlement.getSettlementState(positionId);
        assertGt(settledAt, 0);
    }

    function test_resolveChallenge_falseVoidsPosition() public {
        bytes32 positionId = _submitPosition(2e6, 2e6);
        uint256 balanceBefore = usdc.balanceOf(bettor);

        vm.startPrank(settlementOperator);
        settlement.resolveLeg(positionId, 0, true);
        settlement.resolveLeg(positionId, 1, true);
        vm.stopPrank();

        settlement.challengeSettlement(positionId);
        vm.prank(owner);
        settlement.resolveChallenge(positionId, false);

        PositionBook.Position memory position = book.getPosition(positionId);
        (
            SettlementManager.SettlementPhase phase,
            ,
            ,
            bool challenged,
            uint64 settledAt
        ) = settlement.getSettlementState(positionId);

        assertEq(uint8(position.status), uint8(PositionBook.PositionStatus.VOIDED));
        assertEq(uint8(phase), uint8(SettlementManager.SettlementPhase.EXECUTED));
        assertTrue(challenged);
        assertGt(settledAt, 0);
        assertEq(usdc.balanceOf(bettor), balanceBefore + 2e6);
    }
}
