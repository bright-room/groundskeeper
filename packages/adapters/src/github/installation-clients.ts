import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export type GitHubAppCredentials = { appId: string; privateKey: string };

// 404 / 410 は呼び出し側で「存在しない」として扱うので、request-log のエラー出力から外す。
// それ以外の失敗は例外として呼び出し側に届く
const HANDLED_STATUS = / - (404|410) with id /;
export const octokitLog = {
  debug: () => {},
  info: () => {},
  warn: console.warn,
  error: (message: string) => {
    if (!HANDLED_STATUS.test(message)) console.error(message);
  },
};

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
        log: octokitLog,
      });
      this.cache.set(installationId, client);
    }
    return client;
  }
}

export function isStatus(e: unknown, status: number): boolean {
  return typeof e === "object" && e !== null && "status" in e && e.status === status;
}
