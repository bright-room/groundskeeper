import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, resolveConfig } from "../../src/core/config";

describe("resolveConfig", () => {
  it("空や不正な値ならデフォルトを返す", () => {
    expect(resolveConfig(undefined)).toEqual(DEFAULT_CONFIG);
    expect(resolveConfig("text")).toEqual(DEFAULT_CONFIG);
    expect(resolveConfig({ labels: "x", priorities: "y", models: 1 })).toEqual(DEFAULT_CONFIG);
  });

  it("指定されたキーだけ上書きする", () => {
    const cfg = resolveConfig({
      labels: { triage: "triage" },
      models: { comment: "claude-sonnet-5-5" },
    });
    expect(cfg.labels.triage).toBe("triage");
    expect(cfg.labels.suspicious).toBe(DEFAULT_CONFIG.labels.suspicious);
    expect(cfg.models.comment).toBe("claude-sonnet-5-5");
    expect(cfg.models.issue).toBe(DEFAULT_CONFIG.models.issue);
  });

  it("priorities は空でない文字列配列のときだけ採用する", () => {
    expect(resolveConfig({ priorities: ["P1", "P2"] }).priorities).toEqual(["P1", "P2"]);
    expect(resolveConfig({ priorities: [] }).priorities).toEqual(DEFAULT_CONFIG.priorities);
    expect(resolveConfig({ priorities: ["P1", 2] }).priorities).toEqual(DEFAULT_CONFIG.priorities);
  });
});
