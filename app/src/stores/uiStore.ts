import { create } from "zustand";

type UiStore = {
  mobileNavOpen: boolean;
  cartOpen: boolean;
  setMobileNavOpen: (value: boolean) => void;
  setCartOpen: (value: boolean) => void;
  toggleCart: () => void;
};

export const useUiStore = create<UiStore>((set) => ({
  mobileNavOpen: false,
  cartOpen: false,
  setMobileNavOpen: (value) => set({ mobileNavOpen: value }),
  setCartOpen: (value) => set({ cartOpen: value }),
  toggleCart: () => set((state) => ({ cartOpen: !state.cartOpen })),
}));
