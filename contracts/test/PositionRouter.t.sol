// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {PositionRouter} from "../src/PositionRouter.sol";
import {VaultConfig} from "../src/libraries/VaultConfig.sol";
import {MockVaultManagerRouter} from "./helpers/MockVaultManagerRouter.sol";

contract PositionRouterTest is Test {
    address internal owner = makeAddr("owner");

    PositionRouter internal router;
    MockVaultManagerRouter internal cryptoVaultA;
    MockVaultManagerRouter internal cryptoVaultB;
    MockVaultManagerRouter internal mixedVault;

    function setUp() public {
        VaultConfig.Config memory cfg = VaultConfig.testnet();

        router = new PositionRouter(owner);
        cryptoVaultA = new MockVaultManagerRouter(cfg, 1_500, 40e6, true);
        cryptoVaultB = new MockVaultManagerRouter(cfg, 900, 25e6, true);
        mixedVault = new MockVaultManagerRouter(cfg, 700, 80e6, true);

        vm.startPrank(owner);
        router.registerVault(address(cryptoVaultA), PositionRouter.VaultCategory.CRYPTO);
        router.registerVault(address(cryptoVaultB), PositionRouter.VaultCategory.CRYPTO);
        router.registerVault(address(mixedVault), PositionRouter.VaultCategory.MIXED);
        vm.stopPrank();
    }

    function test_previewBestVault_selectsLowestUtilizationEligibleVault() public view {
        (address vault, uint256 utilizationBps, uint256 availableLiability, bool isEligible) = router
            .previewBestVault(PositionRouter.VaultCategory.CRYPTO, 20e6);

        assertEq(vault, address(cryptoVaultB));
        assertEq(utilizationBps, 900);
        assertEq(availableLiability, 25e6);
        assertTrue(isEligible);
    }

    function test_previewBestVault_skipsInactiveOrInsufficientVaults() public {
        cryptoVaultB.setVaultState(900, 10e6, true);
        cryptoVaultA.setVaultState(1_500, 50e6, false);

        (address vault, uint256 utilizationBps, uint256 availableLiability, bool isEligible) = router
            .previewBestVault(PositionRouter.VaultCategory.CRYPTO, 20e6);

        assertEq(vault, address(0));
        assertEq(utilizationBps, 0);
        assertEq(availableLiability, 0);
        assertFalse(isEligible);
    }

    function test_setVaultEnabled_removesVaultFromEligibility() public {
        vm.prank(owner);
        router.setVaultEnabled(address(cryptoVaultB), false);

        (address vault,, uint256 availableLiability, bool isEligible) = router.previewBestVault(
            PositionRouter.VaultCategory.CRYPTO,
            20e6
        );

        assertEq(vault, address(cryptoVaultA));
        assertEq(availableLiability, 40e6);
        assertTrue(isEligible);
    }

    function test_getVaultsByCategory_returnsRegisteredVaults() public view {
        address[] memory cryptoVaults = router.getVaultsByCategory(PositionRouter.VaultCategory.CRYPTO);
        address[] memory mixedVaults = router.getVaultsByCategory(PositionRouter.VaultCategory.MIXED);

        assertEq(cryptoVaults.length, 2);
        assertEq(cryptoVaults[0], address(cryptoVaultA));
        assertEq(cryptoVaults[1], address(cryptoVaultB));
        assertEq(mixedVaults.length, 1);
        assertEq(mixedVaults[0], address(mixedVault));
    }
}
