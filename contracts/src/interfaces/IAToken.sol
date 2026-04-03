// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAToken {
    function balanceOf(address account) external view returns (uint256);
}
