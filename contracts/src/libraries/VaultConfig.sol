// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library VaultConfig {
    uint256 internal constant MAX_BPS = 10_000;
    uint256 internal constant FIXED_MAX_LIABILITY_BPS = 4_000;
    uint256 internal constant FIXED_RESERVE_BPS = 2_000;
    uint256 internal constant TESTNET_MAX_TVL = 200e6;
    uint256 internal constant TESTNET_MIN_ACTIVATION = 20e6;
    uint256 internal constant TESTNET_MAX_PAYOUT = 8e6;
    uint256 internal constant TESTNET_MAX_STAKE = 2e6;
    uint256 internal constant TESTNET_WORLD_ID_GATE = 3e6;
    uint256 internal constant MAINNET_MAX_TVL = 100_000e6;
    uint256 internal constant MAINNET_MIN_ACTIVATION = 20_000e6;
    uint256 internal constant MAINNET_MAX_PAYOUT = 1_000e6;
    uint256 internal constant MAINNET_MAX_STAKE = 50e6;
    uint256 internal constant MAINNET_WORLD_ID_GATE = 20e6;

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

    function testnet() internal pure returns (Config memory) {
        return Config({
            maxTVL: TESTNET_MAX_TVL,
            minActivation: TESTNET_MIN_ACTIVATION,
            maxLiabilityBps: FIXED_MAX_LIABILITY_BPS,
            reserveBps: FIXED_RESERVE_BPS,
            maxPayout: TESTNET_MAX_PAYOUT,
            maxStake: TESTNET_MAX_STAKE,
            worldIdGate: TESTNET_WORLD_ID_GATE
        });
    }

    function mainnet() internal pure returns (Config memory) {
        return Config({
            maxTVL: MAINNET_MAX_TVL,
            minActivation: MAINNET_MIN_ACTIVATION,
            maxLiabilityBps: FIXED_MAX_LIABILITY_BPS,
            reserveBps: FIXED_RESERVE_BPS,
            maxPayout: MAINNET_MAX_PAYOUT,
            maxStake: MAINNET_MAX_STAKE,
            worldIdGate: MAINNET_WORLD_ID_GATE
        });
    }

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

    }

    function maxLiability(Config memory config, uint256 totalAssets) internal pure returns (uint256) {
        return (totalAssets * config.maxLiabilityBps) / MAX_BPS;
    }

    function reserveTarget(Config memory config, uint256 totalAssets) internal pure returns (uint256) {
        return (totalAssets * config.reserveBps) / MAX_BPS;
    }

    function availableCapacity(
        Config memory config,
        uint256 totalAssets,
        uint256 openLiability
    ) internal pure returns (uint256) {
        uint256 maxAllowed = maxLiability(config, totalAssets);

        if (openLiability >= maxAllowed) {
            return 0;
        }

        return maxAllowed - openLiability;
    }
}
