import type { Job } from "../../core/domain";
import type { JobQueue } from "../../core/ports";

export type MemoryQueueOptions = {
  maxRetries: number;
  baseDelayMs: number;
  onFailure: (job: Job, error: unknown) => void;
};

// ローカル実行用。プロセスが落ちると未処理ジョブは失われる
export function createMemoryQueue(
  handler: (job: Job) => Promise<void>,
  opts: MemoryQueueOptions,
): JobQueue & { drain(): Promise<void> } {
  const pending = new Set<Promise<void>>();

  async function run(job: Job): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      try {
        await handler(job);
        return;
      } catch (e) {
        if (attempt >= opts.maxRetries) {
          opts.onFailure(job, e);
          return;
        }
        await new Promise((r) => setTimeout(r, opts.baseDelayMs * 2 ** attempt));
      }
    }
  }

  return {
    async enqueue(job) {
      const p = run(job).finally(() => pending.delete(p));
      pending.add(p);
    },
    async drain() {
      await Promise.all([...pending]);
    },
  };
}
