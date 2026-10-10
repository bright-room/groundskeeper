import { describe, expect, it } from "vitest";
import { toJob } from "../../src/webhook/route";

const base = {
  installation: { id: 1 },
  repository: { name: "widget", owner: { login: "acme" } },
  issue: { number: 10 },
};
const repo = { owner: "acme", repo: "widget", installationId: 1 };

describe("toJob", () => {
  it("issues イベントはアクションを問わず issue ジョブにする", () => {
    expect(toJob("issues", { ...base, action: "opened" })).toEqual({
      type: "issue",
      action: "opened",
      repo,
      issueNumber: 10,
    });
    expect(toJob("issues", { ...base, action: "labeled" })?.action).toBe("labeled");
  });

  it("issue_comment は comment ジョブにする", () => {
    expect(toJob("issue_comment", { ...base, action: "created", comment: { id: 100 } })).toEqual({
      type: "comment",
      action: "created",
      repo,
      issueNumber: 10,
      commentId: 100,
    });
  });

  it("PR・削除済みコメント・対象外のイベントは無視する", () => {
    expect(
      toJob("issues", { ...base, issue: { number: 10, pull_request: {} }, action: "opened" }),
    ).toBeNull();
    expect(toJob("issue_comment", { ...base, action: "deleted", comment: { id: 1 } })).toBeNull();
    expect(toJob("push", { ...base, action: "opened" })).toBeNull();
  });

  it("bot が起こしたイベントは無視する", () => {
    const bot = { sender: { type: "Bot" } };
    expect(toJob("issues", { ...base, ...bot, action: "opened" })).toBeNull();
    expect(
      toJob("issue_comment", { ...base, ...bot, action: "created", comment: { id: 1 } }),
    ).toBeNull();
    expect(toJob("issues", { ...base, sender: { type: "User" }, action: "opened" })).not.toBeNull();
  });
});
