import type { Job } from "../domain/model";

// 必要なフィールドだけを型付けする
export type WebhookPayload = {
  action?: string;
  installation?: { id: number };
  repository?: { name: string; owner: { login: string } };
  issue?: { number: number; pull_request?: unknown };
  comment?: { id: number };
  sender?: { type: string };
};

// アクションでは絞らない（labeled などを後から扱えるように、判断は core に任せる）
export function toJob(event: string, payload: WebhookPayload): Job | null {
  const { action, installation, repository, issue, comment, sender } = payload;
  if (!action || !installation || !repository || !issue) return null;
  // bot（自分自身・Renovate など）の操作には反応しない。自分の操作に反応し続けるループも防ぐ
  if (sender?.type === "Bot") return null;
  const repo = {
    owner: repository.owner.login,
    repo: repository.name,
    installationId: installation.id,
  };

  // PR も issues / issue_comment で届くが、現状のスコープ外
  if (issue.pull_request) return null;
  if (event === "issues") {
    return { type: "issue", action, repo, issueNumber: issue.number };
  }
  // 削除済みのコメントは取得できないので積まない
  if (event === "issue_comment" && comment && action !== "deleted") {
    return { type: "comment", action, repo, issueNumber: issue.number, commentId: comment.id };
  }
  return null;
}
