import type { AddressInfo } from "node:net";
import type { WebhookRequest } from "@groundskeeper/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebhookServer } from "../src/server";

let close: (() => void) | undefined;
afterEach(() => {
  close?.();
  vi.restoreAllMocks();
});

function start(onWebhook: (req: WebhookRequest) => Promise<number>, maxBodyBytes?: number) {
  const server = new WebhookServer(onWebhook, maxBodyBytes).listen(0);
  close = () => server.close();
  return new Promise<string>((resolve) =>
    server.on("listening", () =>
      resolve(`http://localhost:${(server.address() as AddressInfo).port}`),
    ),
  );
}

describe("WebhookServer", () => {
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

  it("上限を超える本文は 413 でハンドラーに渡さない", async () => {
    let called = false;
    const url = await start(async () => {
      called = true;
      return 202;
    }, 10);
    const res = await fetch(`${url}/webhook`, { method: "POST", body: "x".repeat(11) });
    expect(res.status).toBe(413);
    expect(called).toBe(false);
  });

  it("4xx を返したときは event と delivery を警告ログに出す", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const url = await start(async () => 401);
    await fetch(`${url}/webhook`, {
      method: "POST",
      headers: { "x-github-event": "issues", "x-github-delivery": "d-1" },
      body: "{}",
    });
    expect(warn).toHaveBeenCalledWith("webhook rejected: 401 event=issues delivery=d-1");
  });
});
