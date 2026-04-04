// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {VaultManager} from "../src/VaultManager.sol";
import {PositionBook} from "../src/PositionBook.sol";
import {RiskEngine} from "../src/RiskEngine.sol";
import {SettlementManager} from "../src/SettlementManager.sol";
import {PositionRouter} from "../src/PositionRouter.sol";
import {IAaveV3Pool} from "../src/interfaces/IAaveV3Pool.sol";
import {IAToken} from "../src/interfaces/IAToken.sol";
import {IVaultManager} from "../src/interfaces/IVaultManager.sol";
import {IPositionBook} from "../src/interfaces/IPositionBook.sol";
import {IWorldID} from "../src/interfaces/IWorldID.sol";
import {VaultConfig} from "../src/libraries/VaultConfig.sol";

contract Deploy is Script {
    struct ChainConfig {
        address usdc;
        address aavePool;
        address aUsdc;
        address worldIdRouter;
        bool aaveEnabled;
    }

    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);
        ChainConfig memory chain = _getChainConfig();
        VaultConfig.Config memory config = _getVaultConfig();
        address creForwarder = vm.envOr("CRE_FORWARDER_ADDRESS", deployer);
        address challengeCouncil = vm.envOr("CHALLENGE_COUNCIL_ADDRESS", deployer);

        console2.log("Deploying Underlay contracts");
        console2.log("chainId", block.chainid);
        console2.log("deployer", deployer);
        console2.log("vault asset", chain.usdc);
        console2.log("aave enabled", chain.aaveEnabled);

        vm.startBroadcast(privateKey);

        VaultManager vault = new VaultManager(
            IERC20Metadata(chain.usdc),
            IAaveV3Pool(chain.aavePool),
            IAToken(chain.aUsdc),
            config,
            deployer,
            chain.aaveEnabled
        );

        PositionBook positionBook = new PositionBook(
            IERC20(chain.usdc),
            IVaultManager(address(vault)),
            config,
            uint8(vm.envOr("MIN_LEGS_PER_POSITION", uint256(1))),
            uint8(vm.envOr("MAX_LEGS_PER_POSITION", uint256(10))),
            deployer
        );

        RiskEngine riskEngine = new RiskEngine(
            IERC20(chain.usdc),
            IWorldID(chain.worldIdRouter),
            vm.envString("WORLD_APP_ID"),
            vm.envOr("WORLD_ACTION_ID", string("place-position")),
            config,
            deployer
        );

        SettlementManager settlementManager = new SettlementManager(
            IPositionBook(address(positionBook)),
            creForwarder,
            challengeCouncil,
            deployer
        );

        PositionRouter positionRouter = new PositionRouter(deployer);

        vault.setPositionBook(address(positionBook));
        vault.setSettlementManager(address(settlementManager));
        positionBook.setRiskEngine(address(riskEngine));
        positionBook.setSettlementManager(address(settlementManager));
        riskEngine.setPositionBook(IPositionBook(address(positionBook)));

        positionRouter.registerVault(address(vault), _getVaultCategory());

        vm.stopBroadcast();

        console2.log("VaultManager", address(vault));
        console2.log("PositionBook", address(positionBook));
        console2.log("RiskEngine", address(riskEngine));
        console2.log("SettlementManager", address(settlementManager));
        console2.log("PositionRouter", address(positionRouter));
    }

    function _getVaultConfig() internal view returns (VaultConfig.Config memory) {
        if (block.chainid == 84532 || block.chainid == 16600) {
            return VaultConfig.testnet();
        }

        return VaultConfig.mainnet();
    }

    function _getChainConfig() internal view returns (ChainConfig memory) {
        if (block.chainid == 84532) {
            return ChainConfig({
                usdc: vm.envAddress("BASE_USDC_ADDRESS"),
                aavePool: vm.envOr("BASE_AAVE_POOL_ADDRESS", address(0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27)),
                aUsdc: vm.envOr("BASE_AUSDC_ADDRESS", address(0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC)),
                worldIdRouter: vm.envAddress("BASE_WORLD_ID_ROUTER"),
                aaveEnabled: vm.envBool("BASE_AAVE_ENABLED")
            });
        }

        if (block.chainid == 16600) {
            return ChainConfig({
                usdc: vm.envAddress("OG_USDC_ADDRESS"),
                aavePool: vm.envOr("OG_AAVE_POOL_ADDRESS", address(0)),
                aUsdc: vm.envOr("OG_AUSDC_ADDRESS", address(0)),
                worldIdRouter: vm.envAddress("OG_WORLD_ID_ROUTER"),
                aaveEnabled: vm.envOr("OG_AAVE_ENABLED", false)
            });
        }

        revert("Deploy: unsupported chain");
    }

    function _getVaultCategory() internal view returns (PositionRouter.VaultCategory) {
        string memory category = vm.envOr("VAULT_CATEGORY", string("mixed"));
        bytes32 categoryHash = keccak256(bytes(category));

        if (categoryHash == keccak256("sports")) {
            return PositionRouter.VaultCategory.SPORTS;
        }

        if (categoryHash == keccak256("crypto")) {
            return PositionRouter.VaultCategory.CRYPTO;
        }

        if (categoryHash == keccak256("politics")) {
            return PositionRouter.VaultCategory.POLITICS;
        }

        return PositionRouter.VaultCategory.MIXED;
    }
}
