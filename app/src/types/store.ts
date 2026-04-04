import type {
  SelectedLeg,
  SlipValidationState,
  VaultCategory,
  WorldIdProof,
} from "@/types/domain";
import type { RiskAssessmentResponseDto } from "@/types/dto";

export type MarketFilters = {
  search: string;
  category: "all" | VaultCategory;
};

export type SlipStoreState = {
  selectedLegs: SelectedLeg[];
  stakeInput: string;
  validation: SlipValidationState | null;
  risk: RiskAssessmentResponseDto | null;
  worldIdVerified: boolean;
  worldIdProof: WorldIdProof | null;
  lastSubmissionHash?: `0x${string}`;
  submissionStatus: "idle" | "approving" | "submitting" | "success" | "error";
  submissionError: string | null;
};
