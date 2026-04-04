import { create } from "zustand";
import type { SlipStoreState } from "@/types/store";
import type { SelectedLeg, WorldIdProof } from "@/types/domain";
import type { RiskAssessmentResponseDto } from "@/types/dto";

type SlipStore = SlipStoreState & {
  addLeg: (leg: SelectedLeg) => void;
  removeLeg: (marketId: string, outcomeId: string) => void;
  clearLegs: () => void;
  setStakeInput: (value: string) => void;
  setValidation: (value: SlipStoreState["validation"]) => void;
  setRisk: (value: RiskAssessmentResponseDto | null) => void;
  setWorldIdProof: (value: WorldIdProof | null) => void;
  setWorldIdVerified: (value: boolean) => void;
  setSubmissionState: (
    status: SlipStoreState["submissionStatus"],
    hash?: `0x${string}`,
    error?: string | null
  ) => void;
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
  worldIdProof: null,
  lastSubmissionHash: undefined,
  submissionStatus: "idle",
  submissionError: null,
  addLeg: (leg) =>
    set((state) => {
      const exists = state.selectedLegs.some((entry) => isSameLeg(entry, leg));

      return {
        selectedLegs: exists
          ? state.selectedLegs.filter((entry) => !isSameLeg(entry, leg))
          : [...state.selectedLegs, leg],
        submissionStatus: "idle",
        submissionError: null,
      };
    }),
  removeLeg: (marketId, outcomeId) =>
    set((state) => ({
      selectedLegs: state.selectedLegs.filter(
        (entry) =>
          !(entry.marketId === marketId && entry.outcomeId === outcomeId)
      ),
    })),
  clearLegs: () =>
    set({
      selectedLegs: [],
      validation: null,
      risk: null,
      worldIdProof: null,
      worldIdVerified: false,
      submissionStatus: "idle",
      submissionError: null,
      lastSubmissionHash: undefined,
    }),
  setStakeInput: (value) =>
    set({
      stakeInput: value,
      submissionStatus: "idle",
      submissionError: null,
    }),
  setValidation: (value) => set({ validation: value }),
  setRisk: (value) => set({ risk: value }),
  setWorldIdProof: (value) => set({ worldIdProof: value }),
  setWorldIdVerified: (value) => set({ worldIdVerified: value }),
  setSubmissionState: (status, hash, error = null) =>
    set({
      submissionStatus: status,
      lastSubmissionHash: hash,
      submissionError: error,
    }),
}));
