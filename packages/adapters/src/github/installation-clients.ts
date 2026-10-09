import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export type GitHubAppCredentials = { appId: string; privateKey: string };

// インストール毎に Octokit を使い回す（トークンの取得・更新は auth-app が行う）
export class InstallationClients {
  private readonly cache = new Map<number, Octokit>();

  constructor(private readonly creds: GitHubAppCredentials) {}

  for(installationId: number): Octokit {
    let client = this.cache.get(installationId);
    if (!client) {
      client = new Octokit({
        authStrategy: createAppAuth,
        auth: { appId: this.creds.appId, privateKey: this.creds.privateKey, installationId },
      });
      this.cache.set(installationId, client);
    }
    return client;
  }
}

export function isStatus(e: unknown, status: number): boolean {
  return typeof e === "object" && e !== null && "status" in e && e.status === status;
}
