// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SettlementManager} from "../src/SettlementManager.sol";

/// Manually triggers resolveLegs() from the deployer wallet (which is creForwarder).
/// Usage:
///   forge script script/ManualSettle.s.sol \
///     --rpc-url https://sepolia.base.org \
///     --private-key $PRIVATE_KEY \
///     --broadcast -vvvv
contract ManualSettle is Script {
    function run() external {
        address settlementManager = vm.envOr(
            "SETTLEMENT_MANAGER_ADDRESS",
            address(0x2d42dbEE0Cb95198015bD086FF293D08a4439c5A)
        );

        // Position and leg from PositionBook.getOpenPositions() / getPositionLegs()
        bytes32 positionId = 0x5f0df8700d25c009247d18b92845ffdb7b501f7f169dcca74aabc297db354bc2;
        uint8 legIndex = 0;
        // marketId: 0xe8c842... outcome=1 (NO bet), market voided → yesWon=false → NO bet wins
        bool won = true;

        bytes32[] memory positionIds = new bytes32[](1);
        positionIds[0] = positionId;

        uint8[] memory legIndexes = new uint8[](1);
        legIndexes[0] = legIndex;

        bool[] memory outcomes = new bool[](1);
        outcomes[0] = won;

        console2.log("Calling resolveLegs on SettlementManager:", settlementManager);
        console2.log("Position:", uint256(positionId));
        console2.log("Won:", won);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        SettlementManager(settlementManager).resolveLegs(positionIds, legIndexes, outcomes);
        vm.stopBroadcast();

        console2.log("resolveLegs submitted.");
    }
}
