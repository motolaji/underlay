# Skill: Foundry Testing

## When to Use This Skill
Use when writing tests for any Underlay contract. All tests live in contracts/test/. Read the relevant contract skill before writing its tests.

## Context
Foundry tests are written in Solidity. Tests inherit from forge-std/Test.sol. We use fork testing to test Aave and USDC integrations against real Base Sepolia state. World ID is mocked in tests. Chainlink CRE is tested via the CRE CLI simulator separately.

---

## Test File Structure

```
contracts/test/
  VaultManager.t.sol
  PositionBook.t.sol
  RiskEngine.t.sol
  SettlementManager.t.sol
  Integration.t.sol      Full end-to-end test
  helpers/
    MockWorldID.sol
    MockAave.sol
    Fixtures.sol         Shared test setup
```

---

## Base Test Setup — Fixtures.sol

```solidity
// test/helpers/Fixtures.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { VaultManager } from "../../src/VaultManager.sol";
import { PositionBook } from "../../src/PositionBook.sol";
import { RiskEngine } from "../../src/RiskEngine.sol";
import { SettlementManager } from "../../src/SettlementManager.sol";
import { VaultConfig } from "../../src/libraries/VaultConfig.sol";
import { MockWorldID } from "./MockWorldID.sol";
import { MockAavePool } from "./MockAave.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Fixtures is Test {
    // Contracts
    VaultManager      vault;
    PositionBook      book;
    RiskEngine        risk;
    SettlementManager settlement;
    MockWorldID       worldId;
    MockAavePool      aave;

    // Test addresses
    address owner   = makeAddr("owner");
    address lp1     = makeAddr("lp1");
    address lp2     = makeAddr("lp2");
    address bettor  = makeAddr("bettor");
    address cre     = makeAddr("cre");
    address council = makeAddr("council");

    // USDC mock (or real on fork)
    address USDC;
    IERC20  usdc;

    // Testnet config
    VaultConfig.Config cfg;

    function setUp() public virtual {
        cfg = VaultConfig.testnet();

        // Deploy mocks
        worldId = new MockWorldID();
        aave = new MockAavePool();

        // Deploy USDC mock
        USDC = address(new MockERC20("USD Coin", "USDC", 6));
        usdc = IERC20(USDC);

        // Deploy contracts
        vm.startPrank(owner);

        vault = new VaultManager(
            usdc,
            aave,
            aave.aUsdc(),
            cfg,
            owner,
            true  // aaveEnabled
        );

        book = new PositionBook(usdc, vault, cfg, owner);

        risk = new RiskEngine(
            worldId,
            "app_test",
            "place-position",
            cfg,
            owner
        );

        settlement = new SettlementManager(
            book,
            cre,
            council,
            owner
        );

        // Wire contracts together
        vault.setPositionBook(address(book));
        vault.setSettlementManager(address(settlement));
        book.setRiskEngine(address(risk));
        book.setSettlementManager(address(settlement));
        risk.setPositionBook(address(book));

        vm.stopPrank();

        // Fund test accounts with USDC
        deal(USDC, lp1, 10_000e6);
        deal(USDC, lp2, 10_000e6);
        deal(USDC, bettor, 1_000e6);

        // LP1 deposits to activate vault
        vm.startPrank(lp1);
        usdc.approve(address(vault), type(uint256).max);
        vault.deposit(2_000e6, lp1); // $2000 — meets testnet minActivation
        vm.stopPrank();
    }

    // Helper: place a 2-leg position as bettor
    function _placePosition(
        uint256 stake
    ) internal returns (bytes32 positionId) {
        bytes32[] memory marketIds = new bytes32[](2);
        marketIds[0] = keccak256("market-eth-4000");
        marketIds[1] = keccak256("market-arsenal");

        uint8[] memory outcomes = new uint8[](2);
        outcomes[0] = 0; // YES
        outcomes[1] = 0; // YES

        uint64[] memory odds = new uint64[](2);
        odds[0] = 1_600_000; // 1.6x
        odds[1] = 1_500_000; // 1.5x

        uint64[] memory times = new uint64[](2);
        times[0] = uint64(block.timestamp + 1 days);
        times[1] = uint64(block.timestamp + 2 days);

        uint64 combined = 2_400_000; // 2.4x

        vm.startPrank(bettor);
        usdc.approve(address(risk), stake);

        positionId = risk.submitPosition(
            marketIds,
            outcomes,
            odds,
            times,
            stake,
            combined,
            1,         // MEDIUM risk tier
            bytes32(0), // no audit hash for tests
            0, 0, [uint256(0), 0, 0, 0, 0, 0, 0, 0] // empty World ID proof
        );
        vm.stopPrank();
    }
}
```

---

## MockWorldID.sol

```solidity
// test/helpers/MockWorldID.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../src/interfaces/IWorldID.sol";

contract MockWorldID is IWorldID {
    bool public shouldRevert;

    function setShouldRevert(bool _revert) external {
        shouldRevert = _revert;
    }

    function verifyProof(
        uint256, // root
        uint256, // groupId
        uint256, // signalHash
        uint256, // nullifierHash
        uint256, // externalNullifierHash
        uint256[8] calldata // proof
    ) external view override {
        if (shouldRevert) revert("MockWorldID: invalid proof");
        // Otherwise: success (no revert = valid proof)
    }
}
```

---

## MockAave.sol

```solidity
// test/helpers/MockAave.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Mock aUSDC token
contract MockAToken is ERC20 {
    address public underlyingAsset;

    constructor(address _underlying) ERC20("Aave USDC", "aUSDC") {
        underlyingAsset = _underlying;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }

    function UNDERLYING_ASSET_ADDRESS() external view returns (address) {
        return underlyingAsset;
    }
}

// Mock Aave Pool
contract MockAavePool {
    MockAToken public aUsdc;
    IERC20     public usdc;

    constructor() {
        // aUSDC deployed with address(0) underlying initially
        aUsdc = new MockAToken(address(0));
    }

    function setUsdc(address _usdc) external {
        usdc = IERC20(_usdc);
    }

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16
    ) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        aUsdc.mint(onBehalfOf, amount);
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        aUsdc.burn(msg.sender, amount);
        IERC20(asset).transfer(to, amount);
        return amount;
    }
}
```

---

## VaultManager.t.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Fixtures } from "./helpers/Fixtures.sol";

contract VaultManagerTest is Fixtures {

    // --- Deposit ---

    function test_deposit_mintsShares() public {
        uint256 depositAmount = 1_000e6; // $1,000

        vm.startPrank(lp2);
        usdc.approve(address(vault), depositAmount);
        uint256 shares = vault.deposit(depositAmount, lp2);
        vm.stopPrank();

        assertGt(shares, 0, "Should mint shares");
        assertEq(vault.balanceOf(lp2), shares, "LP2 should hold shares");
    }

    function test_deposit_deploysToAave() public {
        uint256 depositAmount = 1_000e6;

        vm.startPrank(lp2);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, lp2);
        vm.stopPrank();

        // 80% should be in Aave
        uint256 aaveBalance = aave.aUsdc().balanceOf(address(vault));
        uint256 expectedAave = (depositAmount * 8000) / 10000; // 80%
        assertApproxEqRel(aaveBalance, expectedAave, 0.01e18, "80% should be in Aave");
    }

    function test_deposit_revertsAtTVLCap() public {
        uint256 overCap = cfg.maxTVL + 1;
        deal(USDC, lp2, overCap);

        vm.startPrank(lp2);
        usdc.approve(address(vault), overCap);
        vm.expectRevert("VaultManager: TVL cap reached");
        vault.deposit(overCap, lp2);
        vm.stopPrank();
    }

    // --- Withdrawal ---

    function test_withdrawal_requiresDelay() public {
        // LP1 already deposited in setUp
        uint256 shares = vault.balanceOf(lp1);

        // Request withdrawal
        vm.prank(lp1);
        vault.requestWithdrawal(shares);

        // Try to redeem immediately — should fail
        vm.prank(lp1);
        vm.expectRevert("VaultManager: withdrawal delay not met");
        vault.redeem(shares, lp1, lp1);
    }

    function test_withdrawal_succeedsAfterDelay() public {
        uint256 shares = vault.balanceOf(lp1);
        uint256 usdcBefore = usdc.balanceOf(lp1);

        vm.prank(lp1);
        vault.requestWithdrawal(shares);

        // Warp past delay
        vm.warp(block.timestamp + 24 hours + 1);

        vm.prank(lp1);
        vault.redeem(shares, lp1, lp1);

        assertGt(usdc.balanceOf(lp1), usdcBefore, "Should receive USDC");
    }

    // --- Liability ---

    function test_sharePriceIncreasesOnLoss() public {
        uint256 sharePrice1 = vault.convertToAssets(1e6); // price of 1 share

        // Simulate a $5 loss sweeping into vault
        deal(USDC, address(book), 5e6);
        vm.prank(address(book));
        usdc.transfer(address(vault), 5e6);
        vm.prank(address(settlement));
        vault.sweepLoss(5e6);

        uint256 sharePrice2 = vault.convertToAssets(1e6);
        assertGt(sharePrice2, sharePrice1, "Share price should increase on loss");
    }

    function test_liabilityCap_blocksNewPositions() public {
        // Fill vault to liability cap
        uint256 maxLiability = (vault.totalAssets() * cfg.maxLiabilityBps) / 10000;

        vm.prank(address(book));
        vault.increaseLiability(maxLiability);

        // Now vault should not accept positions
        assertFalse(vault.isAcceptingPositions(), "Should not accept at cap");
    }
}
```

---

## Integration.t.sol — Full End-to-End

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Fixtures } from "./helpers/Fixtures.sol";

contract IntegrationTest is Fixtures {

    function test_fullWinFlow() public {
        // 1. Place position
        uint256 stake = 5e6; // $5 testnet
        bytes32 posId = _placePosition(stake);

        // Verify vault liability increased
        assertEq(vault.openLiability(), vault.availableCapacity() == 0 ? 0 : 1);

        // 2. Resolve both legs as WON via CRE (settlement manager)
        vm.prank(cre);
        settlement.resolveLeg(posId, 0, true); // leg 0 won

        vm.prank(cre);
        settlement.resolveLeg(posId, 1, true); // leg 1 won

        // Position should now be WON with pending settlement
        assertEq(
            uint8(book.getPosition(posId).status),
            uint8(PositionBook.PositionStatus.WON)
        );

        // 3. Wait for MEDIUM delay (1 hour)
        vm.warp(block.timestamp + 1 hours + 1);

        // 4. Execute settlement
        uint256 bettorBalBefore = usdc.balanceOf(bettor);
        settlement.executeSettlement(posId);

        // 5. Verify bettor received payout
        assertGt(usdc.balanceOf(bettor), bettorBalBefore, "Bettor should receive payout");
    }

    function test_fullLossFlow() public {
        uint256 stake = 5e6;
        bytes32 posId = _placePosition(stake);

        uint256 vaultBalBefore = vault.totalAssets();

        // Leg 0 wins, leg 1 loses
        vm.prank(cre);
        settlement.resolveLeg(posId, 0, true);

        vm.prank(cre);
        settlement.resolveLeg(posId, 1, false); // LOST

        // Position should be LOST
        assertEq(
            uint8(book.getPosition(posId).status),
            uint8(PositionBook.PositionStatus.LOST)
        );

        // Vault should have received the stake
        assertGt(vault.totalAssets(), vaultBalBefore, "Vault should grow on loss");
    }

    function test_challengeFlow() public {
        uint256 stake = 5e6;
        bytes32 posId = _placePosition(stake);

        // Resolve all legs as won
        vm.prank(cre);
        settlement.resolveLeg(posId, 0, true);
        vm.prank(cre);
        settlement.resolveLeg(posId, 1, true);

        // Challenge before delay expires
        address challenger = makeAddr("challenger");
        vm.prank(challenger);
        settlement.challengeSettlement(posId);

        // Cannot execute during challenge
        vm.expectRevert("SettlementManager: under challenge");
        settlement.executeSettlement(posId);

        // Council resolves — confirm payout
        vm.prank(council);
        settlement.resolveChallenge(posId, true);

        // Now executable
        settlement.executeSettlement(posId);
    }
}
```

---

## Running Tests

```bash
cd contracts

# Run all tests
forge test -vvv

# Run specific test file
forge test --match-path test/VaultManager.t.sol -vvv

# Run specific test
forge test --match-test test_fullWinFlow -vvv

# Fork testing (for real Aave on Base Sepolia)
forge test --fork-url $BASE_SEPOLIA_RPC --match-path test/Integration.t.sol -vvv

# Gas report
forge test --gas-report

# Coverage
forge coverage
```

---

## Gotchas

- `deal(USDC, address, amount)` only works in Foundry tests — works with any ERC20
- `vm.prank` only affects the next call — use `vm.startPrank` / `vm.stopPrank` for multiple calls
- `vm.warp` changes `block.timestamp` globally in the test — affects all subsequent calls
- Test addresses from `makeAddr("name")` are deterministic — same name always gives same address
- Mock contracts must implement the exact interface the real contract calls — use interface files
- `assertApproxEqRel` for Aave balances — exact amounts may differ slightly due to interest
- Fork tests are slower — run them separately from unit tests
- `vm.expectRevert` must immediately precede the reverting call — no other calls between them
- Always test the unhappy paths (revert cases) not just happy paths
