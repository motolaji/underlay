// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVaultManager} from "../../src/interfaces/IVaultManager.sol";
import {VaultConfig} from "../../src/libraries/VaultConfig.sol";

contract MockVaultManagerRouter is IVaultManager {
    VaultConfig.Config private vaultConfig;
    VaultState private vaultState;

    constructor(VaultConfig.Config memory config_, uint256 utilizationBps_, uint256 availableLiability_, bool active_) {
        vaultConfig = config_;
        vaultState = VaultState({
            vault: address(this),
            totalAssets: 10_000e6,
            totalSupply: 10_000e6,
            reserveAssets: 2_000e6,
            aaveDeployedAssets: 8_000e6,
            openLiability: 0,
            availableLiability: availableLiability_,
            sharePriceE18: 1e18,
            utilizationBps: utilizationBps_,
            active: active_,
            withdrawalsBlocked: false,
            aaveEnabled: true
        });
    }

    function getConfig() external view override returns (VaultConfig.Config memory) {
        return vaultConfig;
    }

    function getVaultState() external view override returns (VaultState memory) {
        return vaultState;
    }

    function totalAssets() external view override returns (uint256) {
        return vaultState.totalAssets;
    }

    function increaseLiability(uint256) external pure override {}

    function decreaseLiability(uint256) external pure override {}

    function sweepLoss(uint256) external pure override {}

    function payWinner(address, uint256) external pure override {}

    function isAcceptingPositions() external view override returns (bool) {
        return vaultState.active && vaultState.availableLiability > 0;
    }

    function availableCapacity() external view override returns (uint256) {
        return vaultState.availableLiability;
    }

    function setVaultState(uint256 utilizationBps_, uint256 availableLiability_, bool active_) external {
        vaultState.utilizationBps = utilizationBps_;
        vaultState.availableLiability = availableLiability_;
        vaultState.active = active_;
    }
}
