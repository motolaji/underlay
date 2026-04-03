export type SettlementWorkflowContext = {
  workflowName: string;
  status: "scaffolded";
  runtime: "cre-quickjs";
};

export function getWorkflowContext(): SettlementWorkflowContext {
  return {
    workflowName: "underlay-settlement",
    status: "scaffolded",
    runtime: "cre-quickjs"
  };
}
