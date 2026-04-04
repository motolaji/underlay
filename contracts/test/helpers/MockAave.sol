// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IAaveV3Pool} from "../../src/interfaces/IAaveV3Pool.sol";
import {IAToken} from "../../src/interfaces/IAToken.sol";

contract MockAToken is ERC20, IAToken {
    constructor() ERC20("Mock Aave USDC", "maUSDC") {}

    function balanceOf(address account) public view override(ERC20, IAToken) returns (uint256) {
        return super.balanceOf(account);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

contract MockAavePool is IAaveV3Pool {
    IERC20 public usdc;
    MockAToken public immutable aToken;
    uint128 public liquidityRate;

    constructor() {
        aToken = new MockAToken();
        liquidityRate = uint128(5e25); // ~5% in ray-style units for display tests
    }

    function setUsdc(address usdc_) external {
        usdc = IERC20(usdc_);
    }

    function setLiquidityRate(uint128 nextRate) external {
        liquidityRate = nextRate;
    }

    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external override {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        aToken.mint(onBehalfOf, amount);
    }

    function withdraw(address asset, uint256 amount, address to) external override returns (uint256) {
        uint256 poolBalance = IERC20(asset).balanceOf(address(this));
        uint256 actual = amount > poolBalance ? poolBalance : amount;

        aToken.burn(msg.sender, actual);
        IERC20(asset).transfer(to, actual);

        return actual;
    }

    function getReserveData(address) external view override returns (ReserveData memory data) {
        data.currentLiquidityRate = liquidityRate;
        data.aTokenAddress = address(aToken);
    }

    function aUsdc() external view returns (MockAToken) {
        return aToken;
    }
}
