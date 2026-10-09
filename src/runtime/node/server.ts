import { type IncomingMessage, type Server, createServer } from "node:http";
import type { WebhookRequest } from "../../webhook/receive";

export function startServer(port: number, onWebhook: (req: WebhookRequest) => Promise<number>): Server {
  const server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/healthz") {
      res.writeHead(200).end("ok");
      return;
    }
    if (req.method !== "POST" || req.url !== "/webhook") {
      res.writeHead(404).end();
      return;
    }
    try {
      const status = await onWebhook({
        event: header(req, "x-github-event"),
        signature: header(req, "x-hub-signature-256"),
        rawBody: await readBody(req),
      });
      res.writeHead(status).end();
    } catch (e) {
      console.error("webhook handling failed", e);
      res.writeHead(500).end();
    }
  });
  server.listen(port);
  return server;
}

function header(req: IncomingMessage, name: string): string | null {
  const v = req.headers[name];
  return typeof v === "string" ? v : null;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}
