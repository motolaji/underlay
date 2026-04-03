import { create } from "zustand";

type PositionsStore = {
  view: "draft" | "open" | "resolving" | "settled";
  setView: (value: PositionsStore["view"]) => void;
};

export const usePositionsStore = create<PositionsStore>((set) => ({
  view: "draft",
  setView: (value) => set({ view: value }),
}));
