# foundry-setup.md

## Goal

Set up the `contracts/` directory as a Foundry-first project for Underlay.

## Requirements

- Use Foundry only
- Keep all dollar caps inside `VaultConfig.Config`
- Assume USDC uses 6 decimals everywhere
- Keep `40%` liability cap and `20%` reserve split as fixed ratios

## Checklist

1. Create `foundry.toml`
2. Create `src/`, `test/`, `script/`, `src/interfaces/`, `src/libraries/`
3. Add `src/libraries/VaultConfig.sol`
4. Configure optimizer and Solidity 0.8.x
5. Record any missing global tooling in `BUILD_LOG.md`

## Current blocker

`forge` is not installed in the local environment yet, so setup should scaffold files and defer real compile or dependency install until Foundry is available.
