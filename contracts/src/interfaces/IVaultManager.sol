// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VaultConfig} from "../libraries/VaultConfig.sol";

interface IVaultManager {
    struct VaultState {
        address vault;
        uint256 totalAssets;
        uint256 totalSupply;
        uint256 reserveAssets;
        uint256 aaveDeployedAssets;
        uint256 openLiability;
        uint256 availableLiability;
        uint256 sharePriceE18;
        uint256 utilizationBps;
        bool active;
        bool withdrawalsBlocked;
        bool aaveEnabled;
    }

    function getConfig() external view returns (VaultConfig.Config memory);

    function getVaultState() external view returns (VaultState memory);

    function totalAssets() external view returns (uint256);

    function increaseLiability(uint256 amount) external;

    function decreaseLiability(uint256 amount) external;

    function sweepLoss(uint256 amount) external;

    function payWinner(address winner, uint256 amount) external;

    function isAcceptingPositions() external view returns (bool);

    function availableCapacity() external view returns (uint256);
}
