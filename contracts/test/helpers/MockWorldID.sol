// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IWorldID} from "../../src/interfaces/IWorldID.sol";

contract MockWorldID is IWorldID {
    bool public shouldRevert;

    function setShouldRevert(bool nextValue) external {
        shouldRevert = nextValue;
    }

    function verifyProof(
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256[8] calldata
    ) external view override {
        require(!shouldRevert, "MockWorldID: invalid proof");
    }
}
