import { describe, expect, it } from "vitest";
import { JobProcessor } from "../../src/application/job-processor";
import { DEFAULT_CONFIG } from "../../src/domain/config";
import { NotFoundError } from "../../src/domain/errors";
import type { Issue } from "../../src/domain/model";
import type { GitHubPort } from "../../src/domain/ports";

const REPO = { owner: "acme", repo: "widget", installationId: 1 };
const ISSUE: Issue = {
  number: 10,
  title: "壊れた",
  body: "",
  state: "open",
  author: { login: "alice", isBot: false },
  labels: ["Kind: Bug Fix"],
};

function setup(github: Partial<GitHubPort>) {
  const logs: string[] = [];
  const processor = new JobProcessor({
    github: github as GitHubPort,
    config: { load: async () => DEFAULT_CONFIG },
    log: (m) => void logs.push(m),
  });
  return { processor, logs };
}

describe("JobProcessor", () => {
  it("Issue を取得してログに出す", async () => {
    const { processor, logs } = setup({ getIssue: async () => ISSUE });
    await processor.process({ type: "issue", action: "opened", repo: REPO, issueNumber: 10 });
    expect(logs).toEqual(['[issue:opened] acme/widget#10 "壊れた" labels=[Kind: Bug Fix]']);
  });

  it("対象が削除済みなら何もせず正常終了する", async () => {
    const { processor, logs } = setup({
      getIssue: async () => ISSUE,
      getComment: async () => {
        throw new NotFoundError("comment 999");
      },
    });
    await expect(
      processor.process({
        type: "comment",
        action: "created",
        repo: REPO,
        issueNumber: 10,
        commentId: 999,
      }),
    ).resolves.toBeUndefined();
    expect(logs).toEqual([]);
  });

  it("その他のエラーは再試行のため投げ直す", async () => {
    const { processor } = setup({
      getIssue: async () => {
        throw new Error("GitHub down");
      },
    });
    await expect(
      processor.process({ type: "issue", action: "opened", repo: REPO, issueNumber: 10 }),
    ).rejects.toThrow("GitHub down");
  });
});
