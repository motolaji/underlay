// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SettlementManager} from "../src/SettlementManager.sol";

/// Usage:
///   forge script script/SetCREForwarder.s.sol \
///     --rpc-url $BASE_SEPOLIA_RPC \
///     --private-key $PRIVATE_KEY \
///     --broadcast -vvvv
///
/// Reads SETTLEMENT_MANAGER_ADDRESS and CRE_FORWARDER_ADDRESS from env.
/// Defaults to the known Base Sepolia CRE DON forwarder if env var is unset.
contract SetCREForwarder is Script {
    function run() external {
        address settlementManager = vm.envOr(
            "SETTLEMENT_MANAGER_ADDRESS",
            address(0x2d42dbEE0Cb95198015bD086FF293D08a4439c5A)
        );
        address creForwarder = vm.envOr(
            "CRE_FORWARDER_ADDRESS",
            address(0xA106f5cC202C22930c4eD75B8100Ac2c6481DC5e)
        );

        console2.log("SettlementManager:", settlementManager);
        console2.log("New CRE forwarder:", creForwarder);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        SettlementManager(settlementManager).setCREForwarder(creForwarder);
        vm.stopBroadcast();

        console2.log("creForwarder updated.");
    }
}
