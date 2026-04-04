import { create } from "zustand";

type UiStore = {
  mobileNavOpen: boolean;
  cartOpen: boolean;
  theme: "light" | "dark";
  setMobileNavOpen: (value: boolean) => void;
  setCartOpen: (value: boolean) => void;
  toggleCart: () => void;
  toggleTheme: () => void;
};

export const useUiStore = create<UiStore>((set) => ({
  mobileNavOpen: false,
  cartOpen: false,
  theme: "light",
  setMobileNavOpen: (value) => set({ mobileNavOpen: value }),
  setCartOpen: (value) => set({ cartOpen: value }),
  toggleCart: () => set((state) => ({ cartOpen: !state.cartOpen })),
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
}));
