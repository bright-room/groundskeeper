import type { Job } from "../domain";
import { NotFoundError } from "../errors";
import type { ConfigPort, GitHubPort } from "../ports";

export type ProcessJobDeps = { github: GitHubPort; config: ConfigPort; log: (message: string) => void };

// 足回りの疎通確認用。判定ロジックは未実装で、取得した内容をログに出すだけ
export async function processJob(job: Job, deps: ProcessJobDeps): Promise<void> {
  try {
    await deps.config.load(job.repo);
    const issue = await deps.github.getIssue(job.repo, job.issueNumber);
    const where = `${job.repo.owner}/${job.repo.repo}#${issue.number}`;
    if (job.type === "issue") {
      deps.log(`[issue:${job.action}] ${where} "${issue.title}" labels=[${issue.labels.join(", ")}]`);
    } else {
      const comment = await deps.github.getComment(job.repo, job.commentId);
      deps.log(`[comment:${job.action}] ${where} by ${comment.author.login} (${comment.body.length} chars)`);
    }
  } catch (e) {
    // 削除済みの対象は再試行しても意味がないので破棄する
    if (e instanceof NotFoundError) return;
    throw e;
  }
}
