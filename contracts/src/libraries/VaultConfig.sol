// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library VaultConfig {
    uint256 internal constant MAX_BPS = 10_000;
    uint256 internal constant FIXED_MAX_LIABILITY_BPS = 4_000;
    uint256 internal constant FIXED_RESERVE_BPS = 2_000;

    struct Config {
        uint256 maxTVL;
        uint256 minActivation;
        uint256 maxLiabilityBps;
        uint256 reserveBps;
        uint256 maxPayout;
        uint256 maxStake;
        uint256 worldIdGate;
    }

    error InvalidConfig();

    function validate(Config memory config) internal pure {
        if (config.maxTVL == 0 || config.minActivation == 0) {
            revert InvalidConfig();
        }

        if (config.minActivation > config.maxTVL) {
            revert InvalidConfig();
        }

        if (config.maxStake == 0 || config.maxPayout == 0) {
            revert InvalidConfig();
        }

        if (config.maxLiabilityBps != FIXED_MAX_LIABILITY_BPS) {
            revert InvalidConfig();
        }

        if (config.reserveBps != FIXED_RESERVE_BPS) {
            revert InvalidConfig();
        }

        if (config.maxLiabilityBps > MAX_BPS || config.reserveBps > MAX_BPS) {
            revert InvalidConfig();
        }

        if (config.worldIdGate > config.maxStake) {
            revert InvalidConfig();
        }
    }
}
