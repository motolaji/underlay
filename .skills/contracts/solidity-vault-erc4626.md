# Skill: VaultManager.sol (ERC-4626)

## When to Use This Skill

Use when writing or modifying VaultManager.sol. This is the core LP vault contract. Read foundry-setup.md first.

## Context

VaultManager is an ERC-4626 tokenised vault. LPs deposit USDC and receive share tokens. Share price appreciation handles all yield distribution — no explicit distributions needed. 80% of idle capital auto-deploys to Aave V3. 20% stays as active reserve for position payouts. All dollar-value caps come from VaultConfig.Config — never hardcode amounts.

---

## Key Interfaces to Import

```solidity
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../libraries/VaultConfig.sol";

// Aave V3
interface IPool {
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
}

interface IAToken {
  function balanceOf(address account) external view returns (uint256);
}

```

---

## Contract Structure

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VaultManager is ERC4626, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using VaultConfig for VaultConfig.Config;

    // --- State ---
    VaultConfig.Config public config;
    IPool public immutable aavePool;
    IAToken public immutable aUsdc;
    IERC20 public immutable usdc;

    uint256 public openLiability;        // total USDC owed to open positions
    uint256 public totalDeposited;       // total USDC ever deposited (for tracking)
    bool public active;                  // false until minActivation threshold met

    // Withdrawal delay
    mapping(address => uint256) public withdrawalRequestTime;
    uint256 public constant WITHDRAWAL_DELAY = 24 hours;

    // --- Events ---
    event Rebalanced(uint256 toAave, uint256 inReserve);
    event LiabilityUpdated(uint256 oldLiability, uint256 newLiability);
    event WithdrawalRequested(address indexed lp, uint256 shares, uint256 requestTime);
    event VaultActivated(uint256 totalAssets);

    // --- Constructor ---
    constructor(
        IERC20 _usdc,
        IPool _aavePool,
        IAToken _aUsdc,
        VaultConfig.Config memory _config,
        address _owner
    ) ERC4626(_usdc) ERC20("Underlay Vault Share", "UVS") Ownable(_owner) {
        usdc = _usdc;
        aavePool = _aavePool;
        aUsdc = _aUsdc;
        config = _config;
    }
```

---

## totalAssets() Override

Critical — must include aUSDC balance so share price reflects real vault value:

```solidity
function totalAssets() public view override returns (uint256) {
  return usdc.balanceOf(address(this)) + aUsdc.balanceOf(address(this));
}

```

---

## \_afterDeposit() Hook

Fires after every LP deposit. Deploys 80% to Aave immediately:

```solidity
function _afterDeposit(
  uint256 assets,
  uint256 /*shares*/
) internal override {
  // Check if vault just crossed activation threshold
  if (!active && totalAssets() >= config.minActivation) {
    active = true;
    emit VaultActivated(totalAssets());
  }

  // Check TVL cap
  require(totalAssets() <= config.maxTVL, "VaultManager: TVL cap reached");

  // Rebalance — deploy 80% to Aave
  _rebalance();
}

```

---

## \_beforeWithdraw() Hook

Fires before LP withdrawal. Ensures reserve has enough USDC:

```solidity
function _beforeWithdraw(
  uint256 assets,
  uint256 /*shares*/
) internal override {
  // Check withdrawal delay
  require(
    withdrawalRequestTime[msg.sender] != 0 &&
      block.timestamp >= withdrawalRequestTime[msg.sender] + WITHDRAWAL_DELAY,
    "VaultManager: withdrawal delay not met"
  );

  // Check liability threshold
  uint256 remainingAssets = totalAssets() - assets;
  uint256 maxAllowedLiability = (remainingAssets * config.maxLiabilityBps) /
    10000;
  require(
    openLiability <= maxAllowedLiability,
    "VaultManager: liability too high"
  );

  // Ensure reserve has enough
  uint256 reserve = usdc.balanceOf(address(this));
  if (reserve < assets) {
    uint256 needed = assets - reserve;
    aavePool.withdraw(address(usdc), needed, address(this));
  }

  // Reset withdrawal request
  withdrawalRequestTime[msg.sender] = 0;

  // Rebalance after withdrawal
  _rebalance();
}

```

---

## requestWithdrawal()

LPs must call this 24hr before redeeming:

```solidity
function requestWithdrawal(uint256 shares) external {
  require(balanceOf(msg.sender) >= shares, "VaultManager: insufficient shares");
  withdrawalRequestTime[msg.sender] = block.timestamp;
  emit WithdrawalRequested(msg.sender, shares, block.timestamp);
}

```

---

## \_rebalance() Internal

Maintains 80/20 split after every deposit, withdrawal, and payout:

```solidity
function _rebalance() internal {
  uint256 total = totalAssets();
  if (total == 0) return;

  uint256 targetReserve = (total * config.reserveBps) / 10000;
  uint256 currentReserve = usdc.balanceOf(address(this));

  if (currentReserve > targetReserve) {
    // Too much in reserve — deploy excess to Aave
    uint256 toDeposit = currentReserve - targetReserve;
    usdc.approve(address(aavePool), toDeposit);
    aavePool.supply(address(usdc), toDeposit, address(this), 0);
  } else if (currentReserve < targetReserve) {
    // Reserve too low — withdraw from Aave
    uint256 toWithdraw = targetReserve - currentReserve;
    uint256 aaveBalance = aUsdc.balanceOf(address(this));
    if (aaveBalance > 0) {
      aavePool.withdraw(
        address(usdc),
        min(toWithdraw, aaveBalance),
        address(this)
      );
    }
  }

  emit Rebalanced(
    aUsdc.balanceOf(address(this)),
    usdc.balanceOf(address(this))
  );
}

```

---

## Liability Management

Called by PositionBook when positions open and close:

```solidity
function increaseLiability(uint256 amount) external onlyPositionBook {
  uint256 newLiability = openLiability + amount;
  uint256 maxAllowed = (totalAssets() * config.maxLiabilityBps) / 10000;
  require(newLiability <= maxAllowed, "VaultManager: liability cap exceeded");
  require(active, "VaultManager: vault not yet active");
  emit LiabilityUpdated(openLiability, newLiability);
  openLiability = newLiability;
}

function decreaseLiability(uint256 amount) external onlyPositionBook {
  emit LiabilityUpdated(openLiability, openLiability - amount);
  openLiability -= amount;
}

function sweepLoss(uint256 amount) external onlySettlementManager {
  // Losing stake arrives from SettlementManager
  // No action needed — USDC transfer increases totalAssets()
  // which automatically appreciates share price
  decreaseLiability(amount);
  _rebalance();
}

function payWinner(address winner, uint256 amount)
  external
  onlySettlementManager
  nonReentrant
{
  require(amount <= config.maxPayout, "VaultManager: exceeds max payout");
  uint256 reserve = usdc.balanceOf(address(this));
  if (reserve < amount) {
    aavePool.withdraw(address(usdc), amount - reserve, address(this));
  }
  usdc.safeTransfer(winner, amount);
  decreaseLiability(amount);
  _rebalance();
}

```

---

## Access Control

Add modifier and state for authorised callers:

```solidity
address public positionBook;
address public settlementManager;

modifier onlyPositionBook() {
    require(msg.sender == positionBook, "VaultManager: not PositionBook");
    _;
}

modifier onlySettlementManager() {
    require(msg.sender == settlementManager, "VaultManager: not SettlementManager");
    _;
}

function setPositionBook(address _positionBook) external onlyOwner {
    positionBook = _positionBook;
}

function setSettlementManager(address _settlementManager) external onlyOwner {
    settlementManager = _settlementManager;
}
```

---

## Helper

```solidity
function min(uint256 a, uint256 b) internal pure returns (uint256) {
  return a < b ? a : b;
}

```

---

## View Functions for Frontend

For the frontend app routes, prefer a single structured read like `getVaultState()` in addition to granular reads. This keeps `/app`, `/app/lp`, and `/app/positions` simpler and reduces adapter complexity.

If Aave is not available on the target chain, isolate Aave-specific behavior behind an `aaveEnabled` flag or equivalent constructor/config pattern.

```solidity
function utilizationBps() external view returns (uint256) {
  if (totalAssets() == 0) return 0;
  return (openLiability * 10000) / totalAssets();
}

function availableCapacity() external view returns (uint256) {
  uint256 maxLiability = (totalAssets() * config.maxLiabilityBps) / 10000;
  if (openLiability >= maxLiability) return 0;
  return maxLiability - openLiability;
}

function isAcceptingPositions() external view returns (bool) {
  return active && availableCapacity() > 0;
}

function rollingApy() external view returns (uint256) {
  // Simplified — returns Aave supply rate
  // Frontend calculates actual rolling APY from share price history
  return 0; // placeholder — real implementation reads Aave rate
}

```

---

## Gotchas

- ERC-4626 `deposit()` calls `_afterDeposit()` automatically — do not call `_rebalance()` separately in deposit
- USDC is 6 decimals. All amounts in 6 decimal precision. Never mix with 18 decimal values
- `totalAssets()` must include aUSDC or share price will be wrong
- Aave `supply()` requires USDC approval before calling — always `approve()` first
- `_beforeWithdraw()` resets `withdrawalRequestTime` — LP must request again for next withdrawal
- `sweepLoss()` does not need to transfer USDC — SettlementManager sends USDC to VaultManager address before calling, which automatically increases `totalAssets()` and therefore share price
- Check `active` flag before accepting positions — vault must reach `minActivation` first
