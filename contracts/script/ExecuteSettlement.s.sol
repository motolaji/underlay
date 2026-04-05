// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SettlementManager} from "../src/SettlementManager.sol";
import {IPositionBook} from "../src/interfaces/IPositionBook.sol";

/// Executes a pending settlement after the delay has elapsed.
///
/// Usage — execute a specific position:
///   POSITION_ID=0xabc... forge script script/ExecuteSettlement.s.sol \
///     --rpc-url https://sepolia.base.org --private-key $PRIVATE_KEY --broadcast -vvvv
///
/// Usage — auto-execute the first ready position:
///   forge script script/ExecuteSettlement.s.sol \
///     --rpc-url https://sepolia.base.org --private-key $PRIVATE_KEY --broadcast -vvvv
contract ExecuteSettlement is Script {
    function run() external {
        address settlementManager = vm.envOr(
            "SETTLEMENT_MANAGER_ADDRESS",
            address(0x2d42dbEE0Cb95198015bD086FF293D08a4439c5A)
        );
        address positionBook = vm.envOr(
            "POSITION_BOOK_ADDRESS",
            address(0x29141D2762654786734421705F448C0EF4057366)
        );

        bytes32 positionId;
        string memory positionIdStr = vm.envOr("POSITION_ID", string(""));
        if (bytes(positionIdStr).length > 0) {
            positionId = vm.parseBytes32(positionIdStr);
        } else {
            // Find the first WON position (status=2) that hasn't been paid out yet
            bytes32[] memory allPositions = IPositionBook(positionBook).getOpenPositions();
            require(allPositions.length > 0, "No positions found");
            positionId = allPositions[0];
            console2.log("Auto-selected position");
        }

        console2.log("Executing settlement on SettlementManager:", settlementManager);
        console2.log("Position:", uint256(positionId));

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        SettlementManager(settlementManager).executeSettlement(positionId);
        vm.stopBroadcast();

        console2.log("executeSettlement submitted.");
    }
}
