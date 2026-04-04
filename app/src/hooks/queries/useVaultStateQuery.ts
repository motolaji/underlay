"use client";

import { useReadContract } from "wagmi";

import { contractAddresses } from "@/lib/contracts/addresses";
import { vaultManagerAbi } from "@/lib/contracts/abi/vaultManager";

export function useVaultStateQuery() {
  const address = contractAddresses.baseSepolia.vaultManager;

  return useReadContract({
    address,
    abi: vaultManagerAbi,
    functionName: "getVaultState",
    query: {
      enabled: Boolean(address),
      staleTime: 30_000,
    },
  });
}
