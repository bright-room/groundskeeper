import { describe, expect, it } from "vitest";
import { createConfigAdapter } from "../../../src/adapters/config/config-adapter";
import type { FileFetcher } from "../../../src/adapters/github/file-fetcher";
import { DEFAULT_CONFIG } from "../../../src/core/config";
import { CONFIG_PATH } from "../../../src/core/constants";

const REPO = { owner: "acme", repo: "widget", installationId: 1 };

function fetcher(files: Record<string, string>): FileFetcher {
  return async (_r, repoName, path) => files[`${repoName}/${path}`] ?? null;
}

describe("createConfigAdapter", () => {
  it("リポジトリの設定を優先する", async () => {
    const config = createConfigAdapter(
      fetcher({
        [`widget/${CONFIG_PATH}`]: "labels:\n  triage: repo-triage\n",
        [`.github/${CONFIG_PATH}`]: "labels:\n  triage: org-triage\n",
      }),
    );
    expect((await config.load(REPO)).labels.triage).toBe("repo-triage");
  });

  it("リポジトリに無ければアカウントの .github リポジトリを使う", async () => {
    const config = createConfigAdapter(fetcher({ [`.github/${CONFIG_PATH}`]: "labels:\n  triage: org-triage\n" }));
    expect((await config.load(REPO)).labels.triage).toBe("org-triage");
  });

  it("どちらにも無ければデフォルト", async () => {
    const config = createConfigAdapter(fetcher({}));
    expect(await config.load(REPO)).toEqual(DEFAULT_CONFIG);
  });
});
