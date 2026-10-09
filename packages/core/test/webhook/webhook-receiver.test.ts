import { describe, expect, it } from "vitest";
import type { Job } from "../../src/domain/model";
import { WebhookReceiver } from "../../src/webhook/webhook-receiver";
import { sign as signWith } from "../helpers/sign";

const SECRET = "s3cret";
const sign = (body: string) => signWith(SECRET, body);
const body = JSON.stringify({
  action: "opened",
  installation: { id: 1 },
  repository: { name: "widget", owner: { login: "acme" } },
  issue: { number: 10 },
});

function setup() {
  const jobs: Job[] = [];
  const receiver = new WebhookReceiver(SECRET, { enqueue: async (j: Job) => void jobs.push(j) });
  return { jobs, receiver };
}

describe("WebhookReceiver", () => {
  it("署名が不正なら 401 で何も積まない", async () => {
    const { jobs, receiver } = setup();
    expect(await receiver.receive({ event: "issues", signature: "sha256=00", rawBody: body })).toBe(
      401,
    );
    expect(jobs).toEqual([]);
  });

  it("対象イベントは積んで 202", async () => {
    const { jobs, receiver } = setup();
    expect(
      await receiver.receive({ event: "issues", signature: await sign(body), rawBody: body }),
    ).toBe(202);
    expect(jobs).toHaveLength(1);
  });

  it("対象外イベントは積まずに 202", async () => {
    const { jobs, receiver } = setup();
    expect(
      await receiver.receive({ event: "ping", signature: await sign(body), rawBody: body }),
    ).toBe(202);
    expect(jobs).toEqual([]);
  });
});
