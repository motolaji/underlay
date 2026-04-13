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

const STORAGE_KEY = "underlay-theme";

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // Ignore storage errors and fall back to the document theme.
  }

  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export const useUiStore = create<UiStore>((set) => ({
  mobileNavOpen: false,
  cartOpen: false,
  theme: getInitialTheme(),
  setMobileNavOpen: (value) => set({ mobileNavOpen: value }),
  setCartOpen: (value) => set({ cartOpen: value }),
  toggleCart: () => set((state) => ({ cartOpen: !state.cartOpen })),
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
}));
