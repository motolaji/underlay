import type { Address } from "viem";

function normalizeAddress(value?: string): Address | undefined {
  if (!value) {
    return undefined;
  }

  return value as Address;
}

export const contractAddresses = {
  baseSepolia: {
    vaultManager: normalizeAddress(
      process.env.NEXT_PUBLIC_VAULT_MANAGER_ADDRESS
    ),
    positionBook: normalizeAddress(
      process.env.NEXT_PUBLIC_POSITION_BOOK_ADDRESS
    ),
    positionRouter: normalizeAddress(
      process.env.NEXT_PUBLIC_POSITION_ROUTER_ADDRESS
    ),
    riskEngine: normalizeAddress(process.env.NEXT_PUBLIC_RISK_ENGINE_ADDRESS),
    settlementManager: normalizeAddress(
      process.env.NEXT_PUBLIC_SETTLEMENT_MANAGER_ADDRESS
    ),
  },
} as const;

export function hasLiveProtocolAddresses() {
  return Boolean(contractAddresses.baseSepolia.vaultManager);
}
