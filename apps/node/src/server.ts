import { createServer, type IncomingMessage, type Server } from "node:http";
import type { WebhookRequest } from "@groundskeeper/core";

// GitHub の webhook ペイロードの上限
const DEFAULT_MAX_BODY_BYTES = 25 * 1024 * 1024;

class BodyTooLargeError extends Error {}

export class WebhookServer {
  constructor(
    private readonly onWebhook: (req: WebhookRequest) => Promise<number>,
    private readonly maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  ) {}

  listen(port: number): Server {
    const server = createServer(async (req, res) => {
      if (req.method === "GET" && req.url === "/healthz") {
        res.writeHead(200).end("ok");
        return;
      }
      if (req.method !== "POST" || req.url !== "/webhook") {
        res.writeHead(404).end();
        return;
      }
      let rawBody: string;
      try {
        rawBody = await readBody(req, this.maxBodyBytes);
      } catch (e) {
        if (!(e instanceof BodyTooLargeError)) throw e;
        res.writeHead(413, { connection: "close" }).end();
        return;
      }
      try {
        const event = header(req, "x-github-event");
        const status = await this.onWebhook({
          event,
          signature: header(req, "x-hub-signature-256"),
          rawBody,
        });
        // 401（secret 不一致）などは GitHub 側にしか表示されないので、ここでも出しておく
        if (status >= 400) {
          console.warn(
            `webhook rejected: ${status} event=${event} delivery=${header(req, "x-github-delivery")}`,
          );
        }
        res.writeHead(status).end();
      } catch (e) {
        console.error("webhook handling failed", e);
        res.writeHead(500).end();
      }
    });
    server.listen(port);
    return server;
  }
}

function header(req: IncomingMessage, name: string): string | null {
  const v = req.headers[name];
  return typeof v === "string" ? v : null;
}

// 署名検証は本文を読み終えてから行うため、未検証のリクエストでメモリを使い切らないよう上限を設ける
async function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > maxBytes) throw new BodyTooLargeError();
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}
