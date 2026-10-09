import type { Job, JobQueue } from "@groundskeeper/core";

export type MemoryQueueOptions = {
  maxRetries: number;
  baseDelayMs: number;
  onFailure: (job: Job, error: unknown) => void;
};

// ローカル実行用。プロセスが落ちると未処理ジョブは失われる
export class MemoryQueue implements JobQueue {
  private readonly pending = new Set<Promise<void>>();

  constructor(
    private readonly handler: (job: Job) => Promise<void>,
    private readonly opts: MemoryQueueOptions,
  ) {}

  async enqueue(job: Job): Promise<void> {
    const p = this.run(job).finally(() => this.pending.delete(p));
    this.pending.add(p);
  }

  async drain(): Promise<void> {
    await Promise.all([...this.pending]);
  }

  private async run(job: Job): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      try {
        await this.handler(job);
        return;
      } catch (e) {
        if (attempt >= this.opts.maxRetries) {
          try {
            this.opts.onFailure(job, e);
          } catch (callbackError) {
            // enqueue の Promise は誰も待たないため、ここで止めないと unhandled rejection になる
            console.error("onFailure threw", callbackError);
          }
          return;
        }
        await new Promise((r) => setTimeout(r, this.opts.baseDelayMs * 2 ** attempt));
      }
    }
  }
}
