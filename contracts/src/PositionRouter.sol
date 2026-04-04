// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IVaultManager} from "./interfaces/IVaultManager.sol";

contract PositionRouter is Ownable {
    error PositionRouterZeroAddress();
    error PositionRouterVaultAlreadyRegistered();
    error PositionRouterVaultNotRegistered();

    enum VaultCategory {
        MIXED,
        SPORTS,
        CRYPTO,
        POLITICS
    }

    struct VaultRegistration {
        bool registered;
        bool enabled;
        VaultCategory category;
    }

    struct BestVaultPreview {
        address vault;
        uint256 utilizationBps;
        uint256 availableLiability;
        bool isEligible;
    }

    mapping(address => VaultRegistration) public vaultRegistrations;
    mapping(VaultCategory => address[]) private vaultsByCategory;

    event VaultRegistered(address indexed vault, VaultCategory indexed category);
    event VaultStatusUpdated(address indexed vault, bool enabled);

    constructor(address owner_) Ownable(owner_) {
        if (owner_ == address(0)) {
            revert PositionRouterZeroAddress();
        }
    }

    function registerVault(address vault, VaultCategory category) external onlyOwner {
        if (vault == address(0)) {
            revert PositionRouterZeroAddress();
        }

        if (vaultRegistrations[vault].registered) {
            revert PositionRouterVaultAlreadyRegistered();
        }

        vaultRegistrations[vault] = VaultRegistration({
            registered: true,
            enabled: true,
            category: category
        });
        vaultsByCategory[category].push(vault);

        emit VaultRegistered(vault, category);
    }

    function setVaultEnabled(address vault, bool enabled) external onlyOwner {
        if (!vaultRegistrations[vault].registered) {
            revert PositionRouterVaultNotRegistered();
        }

        vaultRegistrations[vault].enabled = enabled;
        emit VaultStatusUpdated(vault, enabled);
    }

    function getVaultsByCategory(VaultCategory category) external view returns (address[] memory) {
        return vaultsByCategory[category];
    }

    function previewBestVault(
        VaultCategory category,
        uint256 projectedPayout
    ) external view returns (address vault, uint256 utilizationBps, uint256 availableLiability, bool isEligible) {
        BestVaultPreview memory preview = _preview(category, projectedPayout);
        return (preview.vault, preview.utilizationBps, preview.availableLiability, preview.isEligible);
    }

    function getVaultCategory(address vault) external view returns (VaultCategory) {
        VaultRegistration memory registration = vaultRegistrations[vault];

        if (!registration.registered) {
            revert PositionRouterVaultNotRegistered();
        }

        return registration.category;
    }

    function _preview(
        VaultCategory category,
        uint256 projectedPayout
    ) internal view returns (BestVaultPreview memory best) {
        address[] memory categoryVaults = vaultsByCategory[category];

        for (uint256 i = 0; i < categoryVaults.length; ++i) {
            address candidate = categoryVaults[i];
            VaultRegistration memory registration = vaultRegistrations[candidate];

            if (!registration.enabled) {
                continue;
            }

            IVaultManager.VaultState memory state = IVaultManager(candidate).getVaultState();

            if (!state.active || state.availableLiability < projectedPayout) {
                continue;
            }

            if (!best.isEligible || state.utilizationBps < best.utilizationBps) {
                best = BestVaultPreview({
                    vault: candidate,
                    utilizationBps: state.utilizationBps,
                    availableLiability: state.availableLiability,
                    isEligible: true
                });
            }
        }
    }
}
