import { create } from "zustand";

type VaultStore = {
  selectedVaultCategory: "mixed" | "sports" | "crypto" | "politics";
  depositInput: string;
  withdrawInput: string;
  setSelectedVaultCategory: (
    value: VaultStore["selectedVaultCategory"]
  ) => void;
  setDepositInput: (value: string) => void;
  setWithdrawInput: (value: string) => void;
};

export const useVaultStore = create<VaultStore>((set) => ({
  selectedVaultCategory: "mixed",
  depositInput: "",
  withdrawInput: "",
  setSelectedVaultCategory: (value) => set({ selectedVaultCategory: value }),
  setDepositInput: (value) => set({ depositInput: value }),
  setWithdrawInput: (value) => set({ withdrawInput: value }),
}));
