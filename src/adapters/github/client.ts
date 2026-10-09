import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export type GitHubAppCredentials = { appId: string; privateKey: string };
export type ClientFor = (installationId: number) => Octokit;

// インストール毎に Octokit を使い回す（トークンの取得・更新は auth-app が行う）
export function createInstallationClients(creds: GitHubAppCredentials): ClientFor {
  const cache = new Map<number, Octokit>();
  return (installationId) => {
    let client = cache.get(installationId);
    if (!client) {
      client = new Octokit({
        authStrategy: createAppAuth,
        auth: { appId: creds.appId, privateKey: creds.privateKey, installationId },
      });
      cache.set(installationId, client);
    }
    return client;
  };
}

export function isStatus(e: unknown, status: number): boolean {
  return typeof e === "object" && e !== null && "status" in e && e.status === status;
}
