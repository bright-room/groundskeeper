import type { Job } from "@groundskeeper/core";
import { describe, expect, it } from "vitest";
import { MemoryQueue } from "../src/memory-queue";

const job: Job = {
  type: "issue",
  action: "opened",
  repo: { owner: "a", repo: "b", installationId: 1 },
  issueNumber: 1,
};

function run(failTimes: number) {
  let calls = 0;
  const failures: unknown[] = [];
  const queue = new MemoryQueue(
    async () => {
      calls++;
      if (calls <= failTimes) throw new Error(`fail ${calls}`);
    },
    { maxRetries: 3, baseDelayMs: 0, onFailure: (_j, e) => failures.push(e) },
  );
  return { queue, failures, calls: () => calls };
}

describe("MemoryQueue", () => {
  it("成功すれば 1 回だけ実行する", async () => {
    const r = run(0);
    await r.queue.enqueue(job);
    await r.queue.drain();
    expect(r.calls()).toBe(1);
    expect(r.failures).toEqual([]);
  });

  it("失敗したら再試行する", async () => {
    const r = run(2);
    await r.queue.enqueue(job);
    await r.queue.drain();
    expect(r.calls()).toBe(3);
    expect(r.failures).toEqual([]);
  });

  it("初回 + 再試行 3 回すべて失敗したら onFailure を呼ぶ", async () => {
    const r = run(100);
    await r.queue.enqueue(job);
    await r.queue.drain();
    expect(r.calls()).toBe(4);
    expect(r.failures).toHaveLength(1);
  });
});
