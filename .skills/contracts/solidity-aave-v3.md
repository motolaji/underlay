# Skill: Aave V3 Integration

## When to Use This Skill
Use when integrating Aave V3 into VaultManager.sol for idle capital yield. Read solidity-vault-erc4626.md first — this skill adds Aave specifics on top of the ERC-4626 base.

## Context
80% of idle vault capital auto-deploys to Aave V3 to earn base yield (~5-8% APY on USDC). This earns LPs a yield floor even during quiet betting periods. VaultManager deposits to Aave via `supply()` and withdraws via `withdraw()`. The aUSDC balance is included in `totalAssets()` so share price reflects real vault value.

---

## Aave V3 Interfaces

```solidity
// interfaces/IAaveV3Pool.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAaveV3Pool {
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    function getReserveData(address asset)
        external view returns (DataTypes.ReserveData memory);
}

// DataTypes used by getReserveData
library DataTypes {
    struct ReserveData {
        ReserveConfigurationMap configuration;
        uint128 liquidityIndex;
        uint128 currentLiquidityRate;  // RAY units — APY
        uint128 variableBorrowIndex;
        uint128 currentVariableBorrowRate;
        uint128 currentStableBorrowRate;
        uint40 lastUpdateTimestamp;
        uint16 id;
        address aTokenAddress;         // aUSDC address
        address stableDebtTokenAddress;
        address variableDebtTokenAddress;
        address interestRateStrategyAddress;
        uint128 accruedToTreasury;
        uint128 unbacked;
        uint128 isolationModeTotalDebt;
    }

    struct ReserveConfigurationMap {
        uint256 data;
    }
}
```

```solidity
// interfaces/IAToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAToken {
    function balanceOf(address account) external view returns (uint256);
    function scaledBalanceOf(address account) external view returns (uint256);
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
}
```

---

## Aave V3 Contract Addresses

Always verify from https://docs.aave.com/developers/deployed-contracts before deployment.

```
Base Sepolia Testnet:
  Pool:          0x07eA79F68B2B3df564D0A34F8e19791a8af93Ba8
  USDC:          0x036CbD53842c5426634e7929541eC2318f3dCF7e
  aUSDC:         0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f

Base Mainnet:
  Pool:          0xA238Dd80C259a72e81d7e4664317d3e1bFE2E83B
  USDC:          0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  aUSDC:         0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB

0G Testnet:
  Check docs.aave.com — Aave may not be deployed on 0G testnet
  If not available: skip Aave on 0G, use USDC reserve only
  Narrate Aave yield as roadmap on 0G
```

---

## Aave Integration in VaultManager.sol

Add these to the VaultManager contract from solidity-vault-erc4626.md:

```solidity
// Additional imports
import "../interfaces/IAaveV3Pool.sol";
import "../interfaces/IAToken.sol";

// Additional state (add to constructor params)
IAaveV3Pool public immutable aavePool;
IAToken     public immutable aUsdc;

// Update totalAssets() to include aUSDC
function totalAssets() public view override returns (uint256) {
    return usdc.balanceOf(address(this))
         + aUsdc.balanceOf(address(this));
}

// Supply to Aave — called from _rebalance()
function _supplyToAave(uint256 amount) internal {
    if (amount == 0) return;
    usdc.approve(address(aavePool), amount);
    aavePool.supply(
        address(usdc),
        amount,
        address(this),
        0  // referral code — 0 for no referral
    );
}

// Withdraw from Aave — called from _rebalance() and _beforeWithdraw()
function _withdrawFromAave(uint256 amount) internal returns (uint256 withdrawn) {
    if (amount == 0) return 0;
    uint256 aaveBalance = aUsdc.balanceOf(address(this));
    uint256 toWithdraw = amount > aaveBalance ? aaveBalance : amount;
    if (toWithdraw == 0) return 0;

    withdrawn = aavePool.withdraw(
        address(usdc),
        toWithdraw,
        address(this)
    );
}

// Updated _rebalance() using internal helpers
function _rebalance() internal {
    uint256 total = totalAssets();
    if (total == 0) return;

    uint256 targetReserve = (total * config.reserveBps) / 10000;
    uint256 currentReserve = usdc.balanceOf(address(this));

    if (currentReserve > targetReserve) {
        uint256 toDeposit = currentReserve - targetReserve;
        _supplyToAave(toDeposit);
    } else if (currentReserve < targetReserve) {
        uint256 needed = targetReserve - currentReserve;
        _withdrawFromAave(needed);
    }

    emit Rebalanced(
        aUsdc.balanceOf(address(this)),
        usdc.balanceOf(address(this))
    );
}
```

---

## Reading Current Aave APY

Aave's `currentLiquidityRate` is in RAY units (1e27). Convert to APY:

```solidity
// View function to get current Aave APY (for LP dashboard)
// Returns APY as basis points (e.g. 520 = 5.20%)
function currentAaveApyBps() external view returns (uint256) {
    DataTypes.ReserveData memory reserve =
        aavePool.getReserveData(address(usdc));

    // currentLiquidityRate is in RAY = 1e27
    // APY = ((1 + rate/SECONDS_PER_YEAR) ^ SECONDS_PER_YEAR) - 1
    // Simplified linear approximation for display:
    // APY ≈ rate / RAY (close enough for small rates)
    uint256 RAY = 1e27;
    uint256 SECONDS_PER_YEAR = 365 days;

    // Linear approximation: rate per second * seconds per year
    uint256 apyRay = uint256(reserve.currentLiquidityRate);
    uint256 apyBps = (apyRay * 10000) / RAY;

    return apyBps; // e.g. 520 = 5.20%
}
```

Frontend display:
```typescript
// Convert basis points to percentage string
const apyBps = await vaultManager.read("currentAaveApyBps")
const apyDisplay = `${(Number(apyBps) / 100).toFixed(2)}%`  // "5.20%"
```

---

## Handling the Case Where Aave Is Unavailable

If Aave V3 is not deployed on the target chain (likely on 0G testnet):

```solidity
// Add a flag to VaultManager
bool public aaveEnabled;

constructor(
    // ... other params ...
    bool _aaveEnabled
) {
    aaveEnabled = _aaveEnabled;
    // If not enabled, aavePool and aUsdc can be address(0)
}

function _supplyToAave(uint256 amount) internal {
    if (!aaveEnabled || amount == 0) return;
    // ... normal Aave supply logic
}

function _withdrawFromAave(uint256 amount) internal returns (uint256) {
    if (!aaveEnabled || amount == 0) return 0;
    // ... normal Aave withdraw logic
}

function totalAssets() public view override returns (uint256) {
    uint256 reserve = usdc.balanceOf(address(this));
    if (!aaveEnabled) return reserve;
    return reserve + aUsdc.balanceOf(address(this));
}
```

When `aaveEnabled = false`:
- All LP capital stays in USDC reserve
- `totalAssets()` returns just the USDC balance
- LP yield comes only from vig (no base yield)
- Narrate Aave as roadmap in pitch

---

## Deployment Script for Aave Setup

```solidity
// script/Deploy.s.sol
import { Script } from "forge-std/Script.sol";
import { VaultManager } from "../src/VaultManager.sol";
import { VaultConfig } from "../src/libraries/VaultConfig.sol";

contract Deploy is Script {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);

        vm.startBroadcast(privateKey);

        // Base Sepolia addresses
        address USDC      = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
        address AAVE_POOL = 0x07eA79F68B2B3df564D0A34F8e19791a8af93Ba8;
        address AUSDC     = 0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f;

        VaultConfig.Config memory cfg = VaultConfig.testnet();

        VaultManager vault = new VaultManager(
            IERC20(USDC),
            IAaveV3Pool(AAVE_POOL),
            IAToken(AUSDC),
            cfg,
            deployer,
            true  // aaveEnabled
        );

        vm.stopBroadcast();
    }
}
```

---

## Gotchas

- `supply()` requires USDC approval before calling — always `approve(aavePool, amount)` first
- Aave V3 `withdraw()` returns the actual amount withdrawn (may be less if Aave is illiquid)
- `aUsdc.balanceOf()` grows automatically as interest accrues — no claiming needed
- `currentLiquidityRate` is in RAY (1e27) not percentage — always divide by 1e27
- On Base Sepolia, Aave may have low liquidity in testnet pools — supply may fail silently
- Always wrap Aave calls in a check: `if (aUsdc.balanceOf(address(this)) > 0)` before withdrawing
- If rebalancing after a large withdrawal: new total < old total — recalculate target reserve correctly
- referralCode = 0 always — no referral program needed
- Do not use Aave V2 — only V3
