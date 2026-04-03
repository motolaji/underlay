import { create } from "zustand";
import type { SlipStoreState } from "@/types/store";
import type { SelectedLeg } from "@/types/domain";

type SlipStore = SlipStoreState & {
  addLeg: (leg: SelectedLeg) => void;
  removeLeg: (marketId: string, outcomeId: string) => void;
  clearLegs: () => void;
  setStakeInput: (value: string) => void;
  setValidation: (value: SlipStoreState["validation"]) => void;
};

function isSameLeg(a: SelectedLeg, b: SelectedLeg) {
  return a.marketId === b.marketId && a.outcomeId === b.outcomeId;
}

export const useSlipStore = create<SlipStore>((set) => ({
  selectedLegs: [],
  stakeInput: "",
  validation: null,
  risk: null,
  worldIdVerified: false,
  addLeg: (leg) =>
    set((state) => {
      const exists = state.selectedLegs.some((entry) => isSameLeg(entry, leg));

      return {
        selectedLegs: exists
          ? state.selectedLegs.filter((entry) => !isSameLeg(entry, leg))
          : [...state.selectedLegs, leg],
      };
    }),
  removeLeg: (marketId, outcomeId) =>
    set((state) => ({
      selectedLegs: state.selectedLegs.filter(
        (entry) =>
          !(entry.marketId === marketId && entry.outcomeId === outcomeId)
      ),
    })),
  clearLegs: () => set({ selectedLegs: [], validation: null, risk: null }),
  setStakeInput: (value) => set({ stakeInput: value }),
  setValidation: (value) => set({ validation: value }),
}));
