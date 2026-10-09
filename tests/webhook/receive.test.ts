import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Job } from "../../src/core/domain";
import { receiveWebhook } from "../../src/webhook/receive";

const SECRET = "s3cret";
const sign = (body: string) => `sha256=${createHmac("sha256", SECRET).update(body).digest("hex")}`;
const body = JSON.stringify({
  action: "opened",
  installation: { id: 1 },
  repository: { name: "widget", owner: { login: "acme" } },
  issue: { number: 10 },
});

function setup() {
  const jobs: Job[] = [];
  return { jobs, deps: { secret: SECRET, queue: { enqueue: async (j: Job) => void jobs.push(j) } } };
}

describe("receiveWebhook", () => {
  it("署名が不正なら 401 で何も積まない", async () => {
    const { jobs, deps } = setup();
    expect(await receiveWebhook({ event: "issues", signature: "sha256=00", rawBody: body }, deps)).toBe(401);
    expect(jobs).toEqual([]);
  });

  it("対象イベントは積んで 202", async () => {
    const { jobs, deps } = setup();
    expect(await receiveWebhook({ event: "issues", signature: sign(body), rawBody: body }, deps)).toBe(202);
    expect(jobs).toHaveLength(1);
  });

  it("対象外イベントは積まずに 202", async () => {
    const { jobs, deps } = setup();
    expect(await receiveWebhook({ event: "ping", signature: sign(body), rawBody: body }, deps)).toBe(202);
    expect(jobs).toEqual([]);
  });
});
