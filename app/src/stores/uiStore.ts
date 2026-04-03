import { create } from "zustand";

type UiStore = {
  mobileNavOpen: boolean;
  slipSheetOpen: boolean;
  setMobileNavOpen: (value: boolean) => void;
  setSlipSheetOpen: (value: boolean) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  mobileNavOpen: false,
  slipSheetOpen: false,
  setMobileNavOpen: (value) => set({ mobileNavOpen: value }),
  setSlipSheetOpen: (value) => set({ slipSheetOpen: value }),
}));
