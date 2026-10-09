export type LabelKey = "suspicious" | "invalid" | "duplicate" | "needsInfo" | "triage";

export type AppConfig = {
  labels: Record<LabelKey, string>;
  priorities: string[];
  models: { issue: string; comment: string; triage: string };
};

export const DEFAULT_CONFIG: AppConfig = {
  labels: {
    suspicious: "Status: Suspicious",
    invalid: "Close: Invalid",
    duplicate: "Close: Duplicate",
    needsInfo: "Need: More Info",
    triage: "Status: Triage",
  },
  priorities: ["Priority: Critical", "Priority: High", "Priority: Medium", "Priority: Low"],
  models: {
    issue: "claude-sonnet-5-5",
    comment: "claude-haiku-5-5",
    triage: "claude-sonnet-5-5",
  },
};
