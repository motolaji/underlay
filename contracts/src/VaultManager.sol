// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IAaveV3Pool} from "./interfaces/IAaveV3Pool.sol";
import {IAToken} from "./interfaces/IAToken.sol";
import {IVaultManager} from "./interfaces/IVaultManager.sol";
import {VaultConfig} from "./libraries/VaultConfig.sol";

contract VaultManager is ERC4626, Ownable, ReentrancyGuard, IVaultManager {
    using SafeERC20 for IERC20;
    using VaultConfig for VaultConfig.Config;

    error ZeroAddress();
    error VaultManagerInvalidCaller();
    error VaultManagerTVLCapReached();
    error VaultManagerWithdrawalDelayNotMet();
    error VaultManagerNoWithdrawalRequest();
    error VaultManagerRequestedSharesExceeded();
    error VaultManagerLiabilityTooHigh();
    error VaultManagerVaultNotActive();
    error VaultManagerInvalidWithdrawalDelay();

    uint256 private constant SHARE_PRICE_SCALE = 1e18;

    VaultConfig.Config public config;
    IERC20 public immutable usdc;
    IAaveV3Pool public immutable aavePool;
    IAToken public immutable aUsdc;
    bool public immutable aaveEnabled;
    uint256 public immutable withdrawalDelay;

    uint256 public openLiability;
    uint256 public totalDeposited;
    bool public active;

    address public positionBook;
    address public settlementManager;

    mapping(address => uint256) public withdrawalRequestTime;
    mapping(address => uint256) public withdrawalRequestShares;

    event Rebalanced(uint256 reserveAssets, uint256 aaveDeployedAssets);
    event LiabilityUpdated(uint256 previousLiability, uint256 newLiability);
    event WithdrawalRequested(address indexed lp, uint256 shares, uint256 requestTime);
    event VaultActivationUpdated(bool active, uint256 totalAssets);
    event PositionBookUpdated(address indexed positionBook);
    event SettlementManagerUpdated(address indexed settlementManager);

    modifier onlyPositionBook() {
        if (msg.sender != positionBook) {
            revert VaultManagerInvalidCaller();
        }
        _;
    }

    modifier onlySettlementCaller() {
        if (msg.sender != positionBook && msg.sender != settlementManager) {
            revert VaultManagerInvalidCaller();
        }
        _;
    }

    constructor(
        IERC20Metadata _usdc,
        IAaveV3Pool _aavePool,
        IAToken _aUsdc,
        VaultConfig.Config memory _config,
        address _owner,
        bool _aaveEnabled,
        uint256 _withdrawalDelay
    ) ERC20("Underlay Vault Share", "UVS") ERC4626(_usdc) Ownable(_owner) {
        if (address(_usdc) == address(0) || _owner == address(0)) {
            revert ZeroAddress();
        }

        if (_withdrawalDelay == 0) {
            revert VaultManagerInvalidWithdrawalDelay();
        }

        _config.validate();

        if (_aaveEnabled && (address(_aavePool) == address(0) || address(_aUsdc) == address(0))) {
            revert ZeroAddress();
        }

        usdc = IERC20(address(_usdc));
        aavePool = _aavePool;
        aUsdc = _aUsdc;
        config = _config;
        aaveEnabled = _aaveEnabled;
        withdrawalDelay = _withdrawalDelay;
    }

    function totalAssets() public view override(ERC4626, IVaultManager) returns (uint256) {
        uint256 reserve = reserveAssets();

        if (!aaveEnabled) {
            return reserve;
        }

        return reserve + aaveDeployedAssets();
    }

    function reserveAssets() public view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function aaveDeployedAssets() public view returns (uint256) {
        if (!aaveEnabled) {
            return 0;
        }

        return aUsdc.balanceOf(address(this));
    }

    function getConfig() external view override returns (VaultConfig.Config memory) {
        return config;
    }

    function getVaultState() external view override returns (VaultState memory) {
        uint256 total = totalAssets();
        uint256 totalShares = totalSupply();

        return VaultState({
            vault: address(this),
            totalAssets: total,
            totalSupply: totalShares,
            reserveAssets: reserveAssets(),
            aaveDeployedAssets: aaveDeployedAssets(),
            openLiability: openLiability,
            availableLiability: config.availableCapacity(total, openLiability),
            sharePriceE18: totalShares == 0 ? SHARE_PRICE_SCALE : (total * SHARE_PRICE_SCALE) / totalShares,
            utilizationBps: total == 0 ? 0 : (openLiability * 10_000) / total,
            active: active,
            withdrawalsBlocked: withdrawalsBlocked(),
            aaveEnabled: aaveEnabled
        });
    }

    function getPendingWithdrawal(
        address account
    ) external view returns (uint256 assets, uint256 shares, uint256 unlockTimestamp) {
        shares = withdrawalRequestShares[account];
        assets = shares == 0 ? 0 : previewRedeem(shares);
        unlockTimestamp = withdrawalRequestTime[account] == 0
            ? 0
            : withdrawalRequestTime[account] + withdrawalDelay;
    }

    function utilizationBps() public view returns (uint256) {
        uint256 total = totalAssets();

        if (total == 0) {
            return 0;
        }

        return (openLiability * 10_000) / total;
    }

    function availableCapacity() public view override returns (uint256) {
        return config.availableCapacity(totalAssets(), openLiability);
    }

    function isAcceptingPositions() public view override returns (bool) {
        return active && availableCapacity() > 0;
    }

    function withdrawalsBlocked() public view returns (bool) {
        uint256 total = totalAssets();

        if (total == 0) {
            return false;
        }

        return openLiability > config.maxLiability(total);
    }

    function maxDeposit(address) public view override returns (uint256) {
        uint256 total = totalAssets();

        if (total >= config.maxTVL) {
            return 0;
        }

        return config.maxTVL - total;
    }

    function maxMint(address) public view override returns (uint256) {
        uint256 assets = maxDeposit(address(0));

        return assets == 0 ? 0 : previewDeposit(assets);
    }

    function maxWithdraw(address owner) public view override returns (uint256) {
        uint256 requestedShares = withdrawalRequestShares[owner];

        if (requestedShares == 0 || !_withdrawalDelayElapsed(owner)) {
            return 0;
        }

        if (withdrawalsBlocked()) {
            return 0;
        }

        uint256 shares = requestedShares;
        uint256 balance = balanceOf(owner);

        if (shares > balance) {
            shares = balance;
        }

        return shares == 0 ? 0 : previewRedeem(shares);
    }

    function maxRedeem(address owner) public view override returns (uint256) {
        if (!_withdrawalDelayElapsed(owner) || withdrawalsBlocked()) {
            return 0;
        }

        uint256 shares = withdrawalRequestShares[owner];
        uint256 balance = balanceOf(owner);

        if (shares > balance) {
            shares = balance;
        }

        return shares;
    }

    function requestWithdrawal(uint256 shares) external {
        if (shares == 0 || shares > balanceOf(msg.sender)) {
            revert VaultManagerRequestedSharesExceeded();
        }

        withdrawalRequestTime[msg.sender] = block.timestamp;
        withdrawalRequestShares[msg.sender] = shares;

        emit WithdrawalRequested(msg.sender, shares, block.timestamp);
    }

    function setPositionBook(address _positionBook) external onlyOwner {
        if (_positionBook == address(0)) {
            revert ZeroAddress();
        }

        positionBook = _positionBook;
        emit PositionBookUpdated(_positionBook);
    }

    function setSettlementManager(address _settlementManager) external onlyOwner {
        if (_settlementManager == address(0)) {
            revert ZeroAddress();
        }

        settlementManager = _settlementManager;
        emit SettlementManagerUpdated(_settlementManager);
    }

    function increaseLiability(uint256 amount) external override onlyPositionBook {
        uint256 previous = openLiability;
        uint256 updated = previous + amount;
        uint256 maxAllowed = config.maxLiability(totalAssets());

        if (!active) {
            revert VaultManagerVaultNotActive();
        }

        if (updated > maxAllowed) {
            revert VaultManagerLiabilityTooHigh();
        }

        openLiability = updated;
        emit LiabilityUpdated(previous, updated);
    }

    function decreaseLiability(uint256 amount) external override onlyPositionBook {
        uint256 previous = openLiability;
        uint256 updated = amount >= previous ? 0 : previous - amount;

        openLiability = updated;
        emit LiabilityUpdated(previous, updated);
    }

    function sweepLoss(uint256) external override onlySettlementCaller {
        _refreshActiveStatus();
        _rebalance();
    }

    function payWinner(address winner, uint256 amount) external override onlySettlementCaller nonReentrant {
        if (winner == address(0)) {
            revert ZeroAddress();
        }

        if (amount > config.maxPayout) {
            revert VaultManagerLiabilityTooHigh();
        }

        _ensureLiquidAssets(amount);
        usdc.safeTransfer(winner, amount);
        _refreshActiveStatus();
        _rebalance();
    }

    function currentAaveApyBps() external view returns (uint256) {
        if (!aaveEnabled) {
            return 0;
        }

        IAaveV3Pool.ReserveData memory reserveData = aavePool.getReserveData(address(usdc));

        return (uint256(reserveData.currentLiquidityRate) * 10_000) / 1e27;
    }

    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (totalAssets() + assets > config.maxTVL) {
            revert VaultManagerTVLCapReached();
        }

        super._deposit(caller, receiver, assets, shares);

        totalDeposited += assets;
        _refreshActiveStatus();
        _rebalance();
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override {
        if (withdrawalRequestShares[owner] == 0) {
            revert VaultManagerNoWithdrawalRequest();
        }

        if (!_withdrawalDelayElapsed(owner)) {
            revert VaultManagerWithdrawalDelayNotMet();
        }

        if (shares > withdrawalRequestShares[owner]) {
            revert VaultManagerRequestedSharesExceeded();
        }

        uint256 remainingAssets = totalAssets() - assets;

        if (openLiability > config.maxLiability(remainingAssets)) {
            revert VaultManagerLiabilityTooHigh();
        }

        _ensureLiquidAssets(assets);

        super._withdraw(caller, receiver, owner, assets, shares);

        _consumeWithdrawalRequest(owner, shares);
        _refreshActiveStatus();
        _rebalance();
    }

    function _rebalance() internal {
        if (!aaveEnabled) {
            return;
        }

        uint256 total = totalAssets();

        if (total == 0) {
            return;
        }

        uint256 targetReserve = config.reserveTarget(total);
        uint256 reserve = reserveAssets();

        if (reserve > targetReserve) {
            _supplyToAave(reserve - targetReserve);
        } else if (reserve < targetReserve) {
            _withdrawFromAave(targetReserve - reserve);
        }

        emit Rebalanced(reserveAssets(), aaveDeployedAssets());
    }

    function _supplyToAave(uint256 amount) internal {
        if (!aaveEnabled || amount == 0) {
            return;
        }

        usdc.forceApprove(address(aavePool), amount);
        aavePool.supply(address(usdc), amount, address(this), 0);
    }

    function _withdrawFromAave(uint256 amount) internal returns (uint256 withdrawn) {
        if (!aaveEnabled || amount == 0) {
            return 0;
        }

        uint256 deployed = aaveDeployedAssets();
        uint256 toWithdraw = amount > deployed ? deployed : amount;

        if (toWithdraw == 0) {
            return 0;
        }

        return aavePool.withdraw(address(usdc), toWithdraw, address(this));
    }

    function _ensureLiquidAssets(uint256 amount) internal {
        uint256 reserve = reserveAssets();

        if (reserve >= amount || !aaveEnabled) {
            return;
        }

        _withdrawFromAave(amount - reserve);
    }

    function _refreshActiveStatus() internal {
        bool nextActive = totalAssets() >= config.minActivation;

        if (nextActive != active) {
            active = nextActive;
            emit VaultActivationUpdated(nextActive, totalAssets());
        }
    }

    function _withdrawalDelayElapsed(address account) internal view returns (bool) {
        uint256 requestTime = withdrawalRequestTime[account];

        return requestTime != 0 && block.timestamp >= requestTime + withdrawalDelay;
    }

    function _consumeWithdrawalRequest(address owner, uint256 shares) internal {
        uint256 remainingShares = withdrawalRequestShares[owner] - shares;

        if (remainingShares == 0) {
            withdrawalRequestTime[owner] = 0;
            withdrawalRequestShares[owner] = 0;
            return;
        }

        withdrawalRequestShares[owner] = remainingShares;
    }
}
