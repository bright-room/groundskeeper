import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../../src/core/config";
import type { Issue } from "../../../src/core/domain";
import { NotFoundError } from "../../../src/core/errors";
import type { GitHubPort } from "../../../src/core/ports";
import { processJob } from "../../../src/core/usecases/process-job";

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
  const deps = {
    github: github as GitHubPort,
    config: { load: async () => DEFAULT_CONFIG },
    log: (m: string) => void logs.push(m),
  };
  return { deps, logs };
}

describe("processJob", () => {
  it("Issue を取得してログに出す", async () => {
    const { deps, logs } = setup({ getIssue: async () => ISSUE });
    await processJob({ type: "issue", action: "opened", repo: REPO, issueNumber: 10 }, deps);
    expect(logs).toEqual(['[issue:opened] acme/widget#10 "壊れた" labels=[Kind: Bug Fix]']);
  });

  it("対象が削除済みなら何もせず正常終了する", async () => {
    const { deps, logs } = setup({
      getIssue: async () => ISSUE,
      getComment: async () => {
        throw new NotFoundError("comment 999");
      },
    });
    await expect(
      processJob({ type: "comment", action: "created", repo: REPO, issueNumber: 10, commentId: 999 }, deps),
    ).resolves.toBeUndefined();
    expect(logs).toEqual([]);
  });

  it("その他のエラーは再試行のため投げ直す", async () => {
    const { deps } = setup({
      getIssue: async () => {
        throw new Error("GitHub down");
      },
    });
    await expect(processJob({ type: "issue", action: "opened", repo: REPO, issueNumber: 10 }, deps)).rejects.toThrow(
      "GitHub down",
    );
  });
});
