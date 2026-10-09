import { parse } from "yaml";
import { resolveConfig } from "../../core/config";
import { CONFIG_PATH } from "../../core/constants";
import type { ConfigPort } from "../../core/ports";
import type { FileFetcher } from "../github/file-fetcher";

// リポジトリ → アカウントの .github リポジトリ → デフォルト の順で、最初に見つかったものを使う
export function createConfigAdapter(fetchFile: FileFetcher): ConfigPort {
  return {
    async load(repo) {
      const text = (await fetchFile(repo, repo.repo, CONFIG_PATH)) ?? (await fetchFile(repo, ".github", CONFIG_PATH));
      return resolveConfig(text === null ? {} : parse(text));
    },
  };
}
