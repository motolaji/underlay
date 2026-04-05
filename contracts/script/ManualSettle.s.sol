// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {SettlementManager} from "../src/SettlementManager.sol";
import {IPositionBook} from "../src/interfaces/IPositionBook.sol";

/// Manually triggers resolveLegs() from the deployer wallet.
///
/// Usage — resolve a specific position:
///   POSITION_ID=0xabc... WON=true forge script script/ManualSettle.s.sol \
///     --rpc-url https://sepolia.base.org --private-key $PRIVATE_KEY --broadcast -vvvv
///
/// Usage — auto-resolve the first open position (useful for demos):
///   WON=true forge script script/ManualSettle.s.sol \
///     --rpc-url https://sepolia.base.org --private-key $PRIVATE_KEY --broadcast -vvvv
contract ManualSettle is Script {
    function run() external {
        address settlementManager = vm.envOr(
            "SETTLEMENT_MANAGER_ADDRESS",
            address(0x2d42dbEE0Cb95198015bD086FF293D08a4439c5A)
        );
        address positionBook = vm.envOr(
            "POSITION_BOOK_ADDRESS",
            address(0x29141D2762654786734421705F448C0EF4057366)
        );

        // WON env var: "true" or "false"
        bool won = keccak256(bytes(vm.envOr("WON", string("true")))) == keccak256(bytes("true"));

        // If POSITION_ID is set use it, otherwise fetch the first open position
        bytes32 positionId;
        string memory positionIdStr = vm.envOr("POSITION_ID", string(""));
        if (bytes(positionIdStr).length > 0) {
            positionId = vm.parseBytes32(positionIdStr);
        } else {
            bytes32[] memory openPositions = IPositionBook(positionBook).getOpenPositions();
            require(openPositions.length > 0, "No open positions found");
            positionId = openPositions[0];
            console2.log("Auto-selected first open position");
        }

        // Leg index — default 0, override with LEG_INDEX env var
        uint8 legIndex = uint8(vm.envOr("LEG_INDEX", uint256(0)));

        bytes32[] memory positionIds = new bytes32[](1);
        positionIds[0] = positionId;
        uint8[] memory legIndexes = new uint8[](1);
        legIndexes[0] = legIndex;
        bool[] memory outcomes = new bool[](1);
        outcomes[0] = won;

        console2.log("SettlementManager:", settlementManager);
        console2.log("Position:", uint256(positionId));
        console2.log("Leg index:", legIndex);
        console2.log("Won:", won);

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        SettlementManager(settlementManager).resolveLegs(positionIds, legIndexes, outcomes);
        vm.stopBroadcast();

        console2.log("resolveLegs submitted.");
    }
}
