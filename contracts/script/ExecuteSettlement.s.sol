// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SettlementManager} from "../src/SettlementManager.sol";

/// Executes a pending settlement after the delay has elapsed.
/// Usage:
///   forge script script/ExecuteSettlement.s.sol \
///     --rpc-url https://sepolia.base.org \
///     --private-key $PRIVATE_KEY \
///     --broadcast -vvvv
contract ExecuteSettlement is Script {
    function run() external {
        address settlementManager = vm.envOr(
            "SETTLEMENT_MANAGER_ADDRESS",
            address(0x2d42dbEE0Cb95198015bD086FF293D08a4439c5A)
        );

        bytes32 positionId = 0x5f0df8700d25c009247d18b92845ffdb7b501f7f169dcca74aabc297db354bc2;

        console2.log("Calling executeSettlement on SettlementManager:", settlementManager);
        console2.log("Position:", uint256(positionId));

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        SettlementManager(settlementManager).executeSettlement(positionId);
        vm.stopBroadcast();

        console2.log("executeSettlement submitted.");
    }
}
