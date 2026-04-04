// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {VaultManager} from "../../src/VaultManager.sol";
import {PositionBook} from "../../src/PositionBook.sol";
import {RiskEngine} from "../../src/RiskEngine.sol";
import {SettlementManager} from "../../src/SettlementManager.sol";
import {IAaveV3Pool} from "../../src/interfaces/IAaveV3Pool.sol";
import {IAToken} from "../../src/interfaces/IAToken.sol";
import {IPositionBook} from "../../src/interfaces/IPositionBook.sol";
import {IVaultManager} from "../../src/interfaces/IVaultManager.sol";
import {IWorldID} from "../../src/interfaces/IWorldID.sol";
import {VaultConfig} from "../../src/libraries/VaultConfig.sol";
import {MockERC20} from "./MockERC20.sol";
import {MockAavePool, MockAToken} from "./MockAave.sol";
import {MockWorldID} from "./MockWorldID.sol";

contract Stage2Fixtures is Test {
    uint256 internal constant TEST_WITHDRAWAL_DELAY = 2 minutes;
    address internal owner = makeAddr("owner");
    address internal lp = makeAddr("lp");
    address internal bettor = makeAddr("bettor");
    address internal settlementOperator = makeAddr("settlementOperator");

    VaultConfig.Config internal cfg;
    MockERC20 internal usdc;
    MockAavePool internal aavePool;
    MockAToken internal aUsdc;
    MockWorldID internal worldId;

    VaultManager internal vault;
    PositionBook internal book;
    RiskEngine internal risk;
    SettlementManager internal settlement;

    function setUp() public virtual {
        cfg = VaultConfig.testnet();
        usdc = new MockERC20("USD Coin", "USDC", 6);
        aavePool = new MockAavePool();
        aUsdc = aavePool.aUsdc();
        aavePool.setUsdc(address(usdc));
        worldId = new MockWorldID();

        vm.startPrank(owner);

        vault = new VaultManager(
            IERC20Metadata(address(usdc)),
            IAaveV3Pool(address(aavePool)),
            IAToken(address(aUsdc)),
            cfg,
            owner,
            true,
            TEST_WITHDRAWAL_DELAY
        );

        book = new PositionBook(IERC20(address(usdc)), IVaultManager(address(vault)), cfg, 1, 10, owner);
        risk = new RiskEngine(IERC20(address(usdc)), IWorldID(address(worldId)), "app_test", "place-position", cfg, owner);

        settlement = new SettlementManager(IPositionBook(address(book)), settlementOperator, owner, owner);

        vault.setPositionBook(address(book));
        vault.setSettlementManager(address(settlement));
        book.setRiskEngine(address(risk));
        book.setSettlementManager(address(settlement));
        risk.setPositionBook(IPositionBook(address(book)));

        vm.stopPrank();

        usdc.mint(lp, 20_000e6);
        usdc.mint(bettor, 1_000e6);

        _activateVault();
    }

    function _activateVault() internal {
        vm.startPrank(lp);
        usdc.approve(address(vault), type(uint256).max);
        vault.deposit(cfg.minActivation, lp);
        vm.stopPrank();
    }

    function _submitPosition(uint256 stake, uint256 aiStakeLimit) internal returns (bytes32 positionId) {
        bytes32[] memory marketIds = new bytes32[](2);
        marketIds[0] = keccak256("eth-above-4000");
        marketIds[1] = keccak256("sol-etf-approved");

        uint8[] memory outcomes = new uint8[](2);
        outcomes[0] = 0;
        outcomes[1] = 1;

        uint64[] memory lockedOdds = new uint64[](2);
        lockedOdds[0] = 1_500_000;
        lockedOdds[1] = 1_600_000;

        uint64[] memory resolutionTimes = new uint64[](2);
        resolutionTimes[0] = uint64(block.timestamp + 1 days);
        resolutionTimes[1] = uint64(block.timestamp + 2 days);

        vm.startPrank(bettor);
        usdc.approve(address(risk), stake);
        positionId = risk.submitPosition(
            marketIds,
            outcomes,
            lockedOdds,
            resolutionTimes,
            stake,
            2_400_000,
            uint8(PositionBook.RiskTier.MEDIUM),
            keccak256("audit-hash"),
            aiStakeLimit,
            0,
            0,
            [uint256(0), 0, 0, 0, 0, 0, 0, 0]
        );
        vm.stopPrank();
    }
}
