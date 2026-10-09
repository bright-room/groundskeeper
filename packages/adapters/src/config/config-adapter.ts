import { type AppConfig, CONFIG_PATH, type ConfigPort, type RepoRef, resolveConfig } from "@groundskeeper/core";
import { parse } from "yaml";
import type { FileFetcher } from "../github/github-file-fetcher";

// リポジトリ → アカウントの .github リポジトリ → デフォルト の順で、最初に見つかったものを使う
export class ConfigAdapter implements ConfigPort {
  constructor(private readonly files: FileFetcher) {}

  async load(repo: RepoRef): Promise<AppConfig> {
    const text =
      (await this.files.fetch(repo, repo.repo, CONFIG_PATH)) ?? (await this.files.fetch(repo, ".github", CONFIG_PATH));
    return resolveConfig(text === null ? {} : parse(text));
  }
}
