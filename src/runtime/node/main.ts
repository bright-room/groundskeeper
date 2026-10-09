import { createConfigAdapter } from "../../adapters/config/config-adapter";
import { createInstallationClients } from "../../adapters/github/client";
import { createFileFetcher } from "../../adapters/github/file-fetcher";
import { createGitHubAdapter } from "../../adapters/github/github-adapter";
import { type ProcessJobDeps, processJob } from "../../core/usecases/process-job";
import { receiveWebhook } from "../../webhook/receive";
import { loadEnv } from "./env";
import { createMemoryQueue } from "./memory-queue";
import { startServer } from "./server";

const env = loadEnv();
const clientFor = createInstallationClients({ appId: env.githubAppId, privateKey: env.githubPrivateKey });

const deps: ProcessJobDeps = {
  github: createGitHubAdapter(clientFor),
  config: createConfigAdapter(createFileFetcher(clientFor)),
  log: (m) => console.log(m),
};

const queue = createMemoryQueue((job) => processJob(job, deps), {
  maxRetries: 3,
  baseDelayMs: 1000,
  onFailure: (job, e) => console.error("job failed after retries", JSON.stringify(job), e),
});

startServer(env.port, (req) => receiveWebhook(req, { secret: env.webhookSecret, queue }));
console.log(`listening on http://localhost:${env.port}/webhook`);
