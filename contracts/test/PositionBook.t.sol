// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Stage2Fixtures} from "./helpers/Stage2Fixtures.sol";
import {PositionBook} from "../src/PositionBook.sol";

contract PositionBookTest is Stage2Fixtures {
    function test_placePosition_tracksOwnerAndOpenPosition() public {
        bytes32 positionId = _submitPosition(5e6, 5e6);
        PositionBook.Position memory position = book.getPosition(positionId);

        assertEq(position.bettor, bettor);
        assertEq(uint8(position.status), uint8(PositionBook.PositionStatus.OPEN));
        assertEq(book.getOpenPositionCount(), 1);
    }

    function test_resolveLeg_lossSweepsStakeToVault() public {
        bytes32 positionId = _submitPosition(5e6, 5e6);
        uint256 assetsBefore = vault.totalAssets();

        vm.startPrank(settlementOperator);
        settlement.resolveLeg(positionId, 0, true);
        settlement.resolveLeg(positionId, 1, false);
        vm.stopPrank();

        PositionBook.Position memory position = book.getPosition(positionId);
        assertEq(uint8(position.status), uint8(PositionBook.PositionStatus.LOST));
        assertGt(vault.totalAssets(), assetsBefore);
    }

    function test_executePayout_onWinPaysBettor() public {
        bytes32 positionId = _submitPosition(5e6, 5e6);
        uint256 balanceBefore = usdc.balanceOf(bettor);

        vm.startPrank(settlementOperator);
        settlement.resolveLeg(positionId, 0, true);
        settlement.resolveLeg(positionId, 1, true);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 hours + 1);
        settlement.executeSettlement(positionId);

        assertGt(usdc.balanceOf(bettor), balanceBefore);
    }
}
