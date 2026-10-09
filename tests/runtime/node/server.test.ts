import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { startServer } from "../../../src/runtime/node/server";
import type { WebhookRequest } from "../../../src/webhook/receive";

let close: (() => void) | undefined;
afterEach(() => close?.());

function start(onWebhook: (req: WebhookRequest) => Promise<number>) {
  const server = startServer(0, onWebhook);
  close = () => server.close();
  return new Promise<string>((resolve) =>
    server.on("listening", () => resolve(`http://localhost:${(server.address() as AddressInfo).port}`)),
  );
}

describe("startServer", () => {
  it("/webhook のヘッダーと本文をハンドラーに渡し、戻り値をステータスにする", async () => {
    let received: WebhookRequest | undefined;
    const url = await start(async (req) => {
      received = req;
      return 202;
    });

    const res = await fetch(`${url}/webhook`, {
      method: "POST",
      headers: { "x-github-event": "issues", "x-hub-signature-256": "sha256=abc" },
      body: '{"a":1}',
    });

    expect(res.status).toBe(202);
    expect(received).toEqual({ event: "issues", signature: "sha256=abc", rawBody: '{"a":1}' });
  });

  it("/healthz は 200、それ以外は 404", async () => {
    const url = await start(async () => 202);
    expect((await fetch(`${url}/healthz`)).status).toBe(200);
    expect((await fetch(`${url}/other`)).status).toBe(404);
  });
});
