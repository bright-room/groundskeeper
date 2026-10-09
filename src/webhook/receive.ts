import type { JobQueue } from "../core/ports";
import { toJob } from "./route";
import { verifySignature } from "./signature";

export type WebhookRequest = { event: string | null; signature: string | null; rawBody: string };

// GitHub の 10 秒タイムアウトに収めるため、ここでは検証と enqueue だけ行う
export async function receiveWebhook(
  req: WebhookRequest,
  deps: { secret: string; queue: JobQueue },
): Promise<number> {
  if (!(await verifySignature(deps.secret, req.rawBody, req.signature))) return 401;
  if (!req.event) return 400;
  const job = toJob(req.event, JSON.parse(req.rawBody));
  if (job) await deps.queue.enqueue(job);
  return 202;
}
