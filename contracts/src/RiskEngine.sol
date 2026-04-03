// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IPositionBook} from "./interfaces/IPositionBook.sol";
import {IWorldID} from "./interfaces/IWorldID.sol";
import {ByteHasher} from "./libraries/ByteHasher.sol";
import {VaultConfig} from "./libraries/VaultConfig.sol";

contract RiskEngine is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ByteHasher for bytes;
    using VaultConfig for VaultConfig.Config;

    error RiskEngineZeroAddress();
    error RiskEngineStakeLimitExceeded();
    error RiskEngineStakeExceedsProtocolMax();
    error RiskEnginePositionBookNotSet();
    error RiskEngineWorldIdProofAlreadyUsed();
    error RiskEngineLegCountOutOfRange();

    IERC20 public immutable usdc;
    IWorldID public immutable worldId;
    VaultConfig.Config public config;
    uint256 public immutable externalNullifierHash;
    uint256 public constant GROUP_ID = 1;

    IPositionBook public positionBook;

    mapping(uint256 => bool) public nullifierHashes;

    event PositionBookUpdated(address indexed positionBook);
    event PositionSubmitted(
        address indexed bettor,
        bytes32 indexed positionId,
        uint256 stake,
        uint256 aiStakeLimit,
        bool worldIdVerified
    );

    constructor(
        IERC20 _usdc,
        IWorldID _worldId,
        string memory appId,
        string memory actionId,
        VaultConfig.Config memory _config,
        address _owner
    ) Ownable(_owner) {
        if (address(_usdc) == address(0) || address(_worldId) == address(0) || _owner == address(0)) {
            revert RiskEngineZeroAddress();
        }

        _config.validate();

        usdc = _usdc;
        worldId = _worldId;
        config = _config;
        externalNullifierHash = abi
            .encodePacked(bytes(appId).hashToField(), actionId)
            .hashToField();
    }

    function setPositionBook(IPositionBook _positionBook) external onlyOwner {
        if (address(_positionBook) == address(0)) {
            revert RiskEngineZeroAddress();
        }

        positionBook = _positionBook;
        emit PositionBookUpdated(address(_positionBook));
    }

    function requiresWorldId(uint256 stake) external view returns (bool) {
        return stake > config.worldIdGate;
    }

    function submitPosition(
        bytes32[] calldata marketIds,
        uint8[] calldata outcomes,
        uint64[] calldata lockedOdds,
        uint64[] calldata resolutionTimes,
        uint256 stake,
        uint64 combinedOdds,
        uint8 riskTier,
        bytes32 riskAuditHash,
        uint256 aiStakeLimit,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external nonReentrant returns (bytes32 positionId) {
        if (address(positionBook) == address(0)) {
            revert RiskEnginePositionBookNotSet();
        }

        IPositionBook.PositionRules memory rules = positionBook.getPositionRules();
        uint256 legsLength = marketIds.length;

        if (legsLength < rules.minLegsPerPosition || legsLength > rules.maxLegsPerPosition) {
            revert RiskEngineLegCountOutOfRange();
        }

        if (stake > aiStakeLimit) {
            revert RiskEngineStakeLimitExceeded();
        }

        if (stake == 0 || stake > config.maxStake) {
            revert RiskEngineStakeExceedsProtocolMax();
        }

        bool worldIdVerified;
        if (stake > config.worldIdGate) {
            _verifyWorldId(msg.sender, root, nullifierHash, proof);
            worldIdVerified = true;
        }

        usdc.safeTransferFrom(msg.sender, address(positionBook), stake);

        positionId = positionBook.placePosition(
            msg.sender,
            marketIds,
            outcomes,
            lockedOdds,
            resolutionTimes,
            stake,
            combinedOdds,
            riskTier,
            riskAuditHash,
            worldIdVerified
        );

        emit PositionSubmitted(msg.sender, positionId, stake, aiStakeLimit, worldIdVerified);
    }

    function _verifyWorldId(
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) internal {
        if (nullifierHashes[nullifierHash]) {
            revert RiskEngineWorldIdProofAlreadyUsed();
        }

        worldId.verifyProof(
            root,
            GROUP_ID,
            abi.encodePacked(signal).hashToField(),
            nullifierHash,
            externalNullifierHash,
            proof
        );

        nullifierHashes[nullifierHash] = true;
    }
}
