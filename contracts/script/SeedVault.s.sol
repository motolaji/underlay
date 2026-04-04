// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {VaultConfig} from "../src/libraries/VaultConfig.sol";

contract SeedVault is Script {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);
        address vault = vm.envAddress("VAULT_MANAGER_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");
        uint256 amount = vm.envOr("SEED_AMOUNT", VaultConfig.testnet().minActivation);

        vm.startBroadcast(privateKey);

        IERC20(usdc).approve(vault, amount);
        (bool ok,) = vault.call(abi.encodeWithSignature("deposit(uint256,address)", amount, deployer));
        require(ok, "SeedVault: deposit failed");

        vm.stopBroadcast();

        console2.log("Seeded vault", vault);
        console2.log("Amount", amount);
    }
}
