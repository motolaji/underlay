# Skill: Foundry Deployment

## When to Use This Skill
Use when deploying Underlay contracts to Base Sepolia or 0G Chain testnet. Read all contract skills and foundry-testing.md first — deploy only after tests pass.

## Context
Contracts deploy in a specific order due to dependencies. VaultManager must deploy before PositionBook (it needs the vault address). All five contracts must be deployed and wired together before the protocol works. After deployment, update BUILD_LOG.md with all addresses.

---

## Deployment Order

```
1. VaultManager.sol     (depends on: USDC, Aave)
2. PositionBook.sol     (depends on: VaultManager)
3. RiskEngine.sol       (depends on: World ID, PositionBook)
4. SettlementManager.sol (depends on: PositionBook)
5. Wire contracts       (setters: positionBook, settlementManager, riskEngine)
```

---

## script/Deploy.s.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { VaultManager } from "../src/VaultManager.sol";
import { PositionBook } from "../src/PositionBook.sol";
import { RiskEngine } from "../src/RiskEngine.sol";
import { SettlementManager } from "../src/SettlementManager.sol";
import { VaultConfig } from "../src/libraries/VaultConfig.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Deploy is Script {

    // --- Chain-specific addresses ---
    struct ChainConfig {
        address usdc;
        address aavePool;
        address aUsdc;
        address worldIdRouter;
        bool    aaveEnabled;
    }

    function getChainConfig() internal view returns (ChainConfig memory) {
        if (block.chainid == 84532) {
            // Base Sepolia
            return ChainConfig({
                usdc:          0x036CbD53842c5426634e7929541eC2318f3dCF7e,
                aavePool:      0x07eA79F68B2B3df564D0A34F8e19791a8af93Ba8,
                aUsdc:         0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f,
                worldIdRouter: 0x163b09b4fE21177c455D850BD815B16D0D5b58B2,
                aaveEnabled:   true
            });
        }

        if (block.chainid == 16600) {
            // 0G Newton Testnet
            return ChainConfig({
                usdc:          vm.envAddress("OG_USDC_ADDRESS"),
                aavePool:      address(0), // not available on 0G testnet
                aUsdc:         address(0),
                worldIdRouter: vm.envAddress("OG_WORLD_ID_ROUTER"),
                aaveEnabled:   false       // Aave not on 0G testnet
            });
        }

        revert("Deploy: unsupported chain");
    }

    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);

        console.log("Deploying Underlay to chain:", block.chainid);
        console.log("Deployer:", deployer);

        ChainConfig memory chain = getChainConfig();
        VaultConfig.Config memory cfg = VaultConfig.testnet();

        // CRE forwarder — Chainlink DON address (update after CRE deployment)
        address creForwarder = vm.envAddress("CRE_FORWARDER_ADDRESS");

        // Challenge council — deployer for hackathon, multisig for production
        address challengeCouncil = deployer;

        vm.startBroadcast(privateKey);

        // 1. Deploy VaultManager
        VaultManager vault = new VaultManager(
            IERC20(chain.usdc),
            IAaveV3Pool(chain.aavePool),
            IAToken(chain.aUsdc),
            cfg,
            deployer,
            chain.aaveEnabled
        );
        console.log("VaultManager:", address(vault));

        // 2. Deploy PositionBook
        PositionBook book = new PositionBook(
            IERC20(chain.usdc),
            vault,
            cfg,
            deployer
        );
        console.log("PositionBook:", address(book));

        // 3. Deploy RiskEngine
        RiskEngine risk = new RiskEngine(
            IWorldID(chain.worldIdRouter),
            vm.envString("WORLD_APP_ID"),
            vm.envString("WORLD_ACTION_ID"),
            cfg,
            deployer
        );
        console.log("RiskEngine:", address(risk));

        // 4. Deploy SettlementManager
        SettlementManager settlementMgr = new SettlementManager(
            book,
            creForwarder,
            challengeCouncil,
            deployer
        );
        console.log("SettlementManager:", address(settlementMgr));

        // 5. Wire contracts together
        vault.setPositionBook(address(book));
        vault.setSettlementManager(address(settlementMgr));
        book.setRiskEngine(address(risk));
        book.setSettlementManager(address(settlementMgr));
        risk.setPositionBook(address(book));

        console.log("Contracts wired successfully");

        vm.stopBroadcast();

        // Print summary for BUILD_LOG
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Chain ID:", block.chainid);
        console.log("VaultManager:      ", address(vault));
        console.log("PositionBook:      ", address(book));
        console.log("RiskEngine:        ", address(risk));
        console.log("SettlementManager: ", address(settlementMgr));
        console.log("Config: testnet (maxTVL=$10k, maxPayout=$100, maxStake=$5)");
        console.log("========================\n");
    }
}
```

---

## .env File for Deployment

```bash
# contracts/.env
PRIVATE_KEY=0x...

# RPC endpoints
BASE_SEPOLIA_RPC=https://sepolia.base.org
OG_TESTNET_RPC=https://evmrpc-testnet.0g.ai

# API keys
BASESCAN_API_KEY=...

# World ID
WORLD_APP_ID=app_...
WORLD_ACTION_ID=place-position

# Chainlink CRE (fill after CRE deployment)
CRE_FORWARDER_ADDRESS=0x...

# 0G specific (if deploying to 0G)
OG_USDC_ADDRESS=0x...
OG_WORLD_ID_ROUTER=0x...
```

---

## Deploy Commands

```bash
cd contracts

# Load env
source .env

# Deploy to Base Sepolia
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv

# Deploy to 0G Testnet
forge script script/Deploy.s.sol \
  --rpc-url $OG_TESTNET_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://chainscan-newton.0g.ai/api \
  -vvvv

# Dry run (no broadcast)
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  -vvvv
```

---

## Post-Deployment Checklist

After deployment, do these in order:

```bash
# 1. Verify contracts are wired correctly
cast call $VAULT_MANAGER "positionBook()(address)" --rpc-url $BASE_SEPOLIA_RPC
cast call $VAULT_MANAGER "settlementManager()(address)" --rpc-url $BASE_SEPOLIA_RPC
cast call $POSITION_BOOK "riskEngine()(address)" --rpc-url $BASE_SEPOLIA_RPC
cast call $POSITION_BOOK "settlementManager()(address)" --rpc-url $BASE_SEPOLIA_RPC

# 2. Seed vault with testnet USDC to reach minActivation ($2,000)
# Do this manually via frontend or cast

# 3. Verify vault is active
cast call $VAULT_MANAGER "active()(bool)" --rpc-url $BASE_SEPOLIA_RPC
# Should return: true

# 4. Update BUILD_LOG.md with all contract addresses

# 5. Update app/src/lib/contracts/index.ts with addresses

# 6. Update cre-workflow config.json with SettlementManager address

# 7. Set ENS text records (run scripts/setupEns.ts)

# 8. Test with a small position end-to-end
```

---

## script/SeedVault.s.sol

After deployment, seed the vault to activate it:

```solidity
// script/SeedVault.s.sol
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SeedVault is Script {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);
        address vault = vm.envAddress("VAULT_MANAGER_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");

        vm.startBroadcast(privateKey);

        // Approve and deposit $2,000 USDC to activate vault
        IERC20(usdc).approve(vault, 2_000e6);
        (bool ok,) = vault.call(
            abi.encodeWithSignature("deposit(uint256,address)", 2_000e6, deployer)
        );
        require(ok, "Deposit failed");

        vm.stopBroadcast();
    }
}
```

---

## Updating Frontend After Deployment

```typescript
// app/src/lib/contracts/index.ts
export const ADDRESSES = {
  84532: { // Base Sepolia
    vaultManager:      "0x...", // paste from deployment output
    positionBook:      "0x...",
    riskEngine:        "0x...",
    settlementManager: "0x...",
    usdc:              "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  },
  16600: { // 0G Testnet
    vaultManager:      "0x...",
    positionBook:      "0x...",
    riskEngine:        "0x...",
    settlementManager: "0x...",
    usdc:              "0x..."
  }
} as const
```

---

## Gotchas

- Deploy order matters — VaultManager before PositionBook, PositionBook before RiskEngine
- Wire contracts BEFORE seeding the vault with USDC — wiring calls onlyOwner
- `CRE_FORWARDER_ADDRESS` is the Chainlink DON's address — get this from Chainlink after CRE deployment. Use deployer address as placeholder during development
- `--verify` on 0G uses `--verifier blockscout` not etherscan
- If verification fails silently, verify manually via the block explorer UI
- After any redeployment, update ALL references: BUILD_LOG, frontend addresses, CRE config
- Test `active()` returns true after seeding — vault won't accept positions until minActivation is met
- Keep a record of deployment tx hashes for ETHGlobal submission (they require onchain tx IDs)
