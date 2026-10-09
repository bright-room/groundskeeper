import { NotFoundError } from "../domain/errors";
import type { Job } from "../domain/model";
import type { ConfigPort, GitHubPort } from "../domain/ports";

export type JobProcessorDeps = { github: GitHubPort; config: ConfigPort; log: (message: string) => void };

// 足回りの疎通確認用。判定ロジックは未実装で、取得した内容をログに出すだけ
export class JobProcessor {
  constructor(private readonly deps: JobProcessorDeps) {}

  async process(job: Job): Promise<void> {
    try {
      await this.deps.config.load(job.repo);
      const issue = await this.deps.github.getIssue(job.repo, job.issueNumber);
      const where = `${job.repo.owner}/${job.repo.repo}#${issue.number}`;
      if (job.type === "issue") {
        this.deps.log(`[issue:${job.action}] ${where} "${issue.title}" labels=[${issue.labels.join(", ")}]`);
      } else {
        const comment = await this.deps.github.getComment(job.repo, job.commentId);
        this.deps.log(`[comment:${job.action}] ${where} by ${comment.author.login} (${comment.body.length} chars)`);
      }
    } catch (e) {
      // 削除済みの対象は再試行しても意味がないので破棄する
      if (e instanceof NotFoundError) return;
      throw e;
    }
  }
}
