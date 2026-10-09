import { CONFIG_PATH, DEFAULT_CONFIG } from "@groundskeeper/core";
import { describe, expect, it } from "vitest";
import { ConfigAdapter } from "../../src/config/config-adapter";
import type { FileFetcher } from "../../src/github/github-file-fetcher";

const REPO = { owner: "acme", repo: "widget", installationId: 1 };

function fetcher(files: Record<string, string>): FileFetcher {
  return { fetch: async (_r, repoName, path) => files[`${repoName}/${path}`] ?? null };
}

describe("ConfigAdapter", () => {
  it("リポジトリの設定を優先する", async () => {
    const config = new ConfigAdapter(
      fetcher({
        [`widget/${CONFIG_PATH}`]: "labels:\n  triage: repo-triage\n",
        [`.github/${CONFIG_PATH}`]: "labels:\n  triage: org-triage\n",
      }),
    );
    expect((await config.load(REPO)).labels.triage).toBe("repo-triage");
  });

  it("リポジトリに無ければアカウントの .github リポジトリを使う", async () => {
    const config = new ConfigAdapter(
      fetcher({ [`.github/${CONFIG_PATH}`]: "labels:\n  triage: org-triage\n" }),
    );
    expect((await config.load(REPO)).labels.triage).toBe("org-triage");
  });

  it("どちらにも無ければデフォルト", async () => {
    const config = new ConfigAdapter(fetcher({}));
    expect(await config.load(REPO)).toEqual(DEFAULT_CONFIG);
  });
});
