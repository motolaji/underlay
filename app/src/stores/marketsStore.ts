import { create } from "zustand";
import type { MarketFilters } from "@/types/store";

type MarketsStore = {
  filters: MarketFilters;
  expandedMarketId: string | null;
  setSearch: (value: string) => void;
  setCategory: (value: MarketFilters["category"]) => void;
  setExpandedMarketId: (value: string | null) => void;
};

export const useMarketsStore = create<MarketsStore>((set) => ({
  filters: {
    search: "",
    category: "all",
  },
  expandedMarketId: null,
  setSearch: (value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        search: value,
      },
    })),
  setCategory: (value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        category: value,
      },
    })),
  setExpandedMarketId: (value) => set({ expandedMarketId: value }),
}));
