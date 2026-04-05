import { create } from "zustand";
import type { MarketFilters } from "@/types/store";

type MarketsStore = {
  filters: MarketFilters;
  sort: "volume" | "ending_soon";
  expandedMarketId: string | null;
  setSearch: (value: string) => void;
  setCategory: (value: MarketFilters["category"]) => void;
  setSort: (value: "volume" | "ending_soon") => void;
  setExpandedMarketId: (value: string | null) => void;
};

export const useMarketsStore = create<MarketsStore>((set) => ({
  filters: {
    search: "",
    category: "all",
  },
  sort: "volume",
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
  setSort: (value) => set({ sort: value }),
  setExpandedMarketId: (value) => set({ expandedMarketId: value }),
}));
