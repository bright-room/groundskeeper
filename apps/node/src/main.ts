import {
  ConfigAdapter,
  GitHubAdapter,
  GitHubFileFetcher,
  InstallationClients,
} from "@groundskeeper/adapters";
import { JobProcessor, WebhookReceiver } from "@groundskeeper/core";
import { loadEnv } from "./env";
import { MemoryQueue } from "./memory-queue";
import { WebhookServer } from "./server";

const env = loadEnv();
const clients = new InstallationClients({
  appId: env.githubAppId,
  privateKey: env.githubPrivateKey,
});

const processor = new JobProcessor({
  github: new GitHubAdapter(clients),
  config: new ConfigAdapter(new GitHubFileFetcher(clients)),
  log: (m) => console.log(m),
});

const queue = new MemoryQueue((job) => processor.process(job), {
  maxRetries: 3,
  baseDelayMs: 1000,
  onFailure: (job, e) => console.error("job failed after retries", JSON.stringify(job), e),
});

const receiver = new WebhookReceiver(env.webhookSecret, queue);
new WebhookServer((req) => receiver.receive(req)).listen(env.port);
console.log(`listening on http://localhost:${env.port}/webhook`);
