// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Stage2Fixtures} from "./helpers/Stage2Fixtures.sol";

contract VaultManagerTest is Stage2Fixtures {
    function test_deposit_activatesVaultAndDeploysToAave() public {
        assertTrue(vault.active());
        assertGt(vault.totalAssets(), 0);
        assertGt(vault.aaveDeployedAssets(), 0);
    }

    function test_requestWithdrawal_andRedeemAfterDelay() public {
        uint256 shares = vault.balanceOf(lp) / 2;
        uint256 assetsBefore = usdc.balanceOf(lp);

        vm.prank(lp);
        vault.requestWithdrawal(shares);

        vm.warp(block.timestamp + TEST_WITHDRAWAL_DELAY + 1);

        vm.prank(lp);
        vault.redeem(shares, lp, lp);

        assertGt(usdc.balanceOf(lp), assetsBefore);
    }

    function test_withdrawalDelay_isConfiguredForDemo() public view {
        assertEq(vault.withdrawalDelay(), TEST_WITHDRAWAL_DELAY);
    }

    function test_increaseLiability_respectsCap() public {
        uint256 maxLiability = (vault.totalAssets() * cfg.maxLiabilityBps) / 10_000;

        vm.prank(address(book));
        vault.increaseLiability(maxLiability);

        assertEq(vault.openLiability(), maxLiability);
    }
}
