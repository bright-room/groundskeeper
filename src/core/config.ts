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

// YAML をパースした結果（unknown）を受け取り、欠けている・不正なキーはデフォルトで埋める
export function resolveConfig(raw: unknown): AppConfig {
  const obj = isRecord(raw) ? raw : {};
  const priorities = obj.priorities;
  return {
    labels: pickStrings(DEFAULT_CONFIG.labels, isRecord(obj.labels) ? obj.labels : {}),
    priorities:
      Array.isArray(priorities) && priorities.length > 0 && priorities.every((p) => typeof p === "string")
        ? priorities
        : DEFAULT_CONFIG.priorities,
    models: pickStrings(DEFAULT_CONFIG.models, isRecord(obj.models) ? obj.models : {}),
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickStrings<T extends Record<string, string>>(defaults: T, src: Record<string, unknown>): T {
  const out = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T & string)[]) {
    const v = src[key];
    if (typeof v === "string" && v.length > 0) out[key] = v as T[keyof T & string];
  }
  return out;
}
