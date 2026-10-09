import type { RepoRef } from "@groundskeeper/core";
import { type InstallationClients, isStatus } from "./installation-clients";

export interface FileFetcher {
  fetch(repo: RepoRef, repoName: string, path: string): Promise<string | null>;
}

// App がインストールされていない・ファイルが無い場合は null
export class GitHubFileFetcher implements FileFetcher {
  constructor(private readonly clients: InstallationClients) {}

  async fetch(r: RepoRef, repoName: string, path: string): Promise<string | null> {
    try {
      const res = await this.clients.for(r.installationId).rest.repos.getContent({
        owner: r.owner,
        repo: repoName,
        path,
        mediaType: { format: "raw" },
      });
      return String(res.data);
    } catch (e) {
      if (isStatus(e, 404)) return null;
      throw e;
    }
  }
}
