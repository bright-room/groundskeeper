import type { RepoRef } from "../../core/domain";
import { type ClientFor, isStatus } from "./client";

export type FileFetcher = (repo: RepoRef, repoName: string, path: string) => Promise<string | null>;

// App がインストールされていない・ファイルが無い場合は null
export function createFileFetcher(clientFor: ClientFor): FileFetcher {
  return async (r, repoName, path) => {
    try {
      const res = await clientFor(r.installationId).rest.repos.getContent({
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
  };
}
