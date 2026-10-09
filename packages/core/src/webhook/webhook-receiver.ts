import type { JobQueue } from "../domain/ports";
import { toJob } from "./route";
import { verifySignature } from "./signature";

export type WebhookRequest = { event: string | null; signature: string | null; rawBody: string };

// GitHub の 10 秒タイムアウトに収めるため、ここでは検証と enqueue だけ行う
export class WebhookReceiver {
  constructor(
    private readonly secret: string,
    private readonly queue: JobQueue,
  ) {}

  async receive(req: WebhookRequest): Promise<number> {
    if (!(await verifySignature(this.secret, req.rawBody, req.signature))) return 401;
    if (!req.event) return 400;
    const job = toJob(req.event, JSON.parse(req.rawBody));
    if (job) await this.queue.enqueue(job);
    return 202;
  }
}
