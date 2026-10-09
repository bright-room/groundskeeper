import type { LLMOptions } from "../../adapters/llm/structured-call";

export type NodeEnv = {
  port: number;
  githubAppId: string;
  githubPrivateKey: string;
  webhookSecret: string;
};

export function loadEnv(env: NodeJS.ProcessEnv = process.env): NodeEnv {
  return {
    port: Number(env.PORT || 3000),
    githubAppId: required(env, "GITHUB_APP_ID"),
    // .env では改行を \n で書く
    githubPrivateKey: required(env, "GITHUB_PRIVATE_KEY").replace(/\\n/g, "\n"),
    webhookSecret: required(env, "GITHUB_WEBHOOK_SECRET"),
  };
}

export function loadLLMOptions(env: NodeJS.ProcessEnv = process.env): LLMOptions {
  return {
    apiKey: env.ANTHROPIC_API_KEY || undefined,
    baseURL: env.ANTHROPIC_BASE_URL || undefined,
    extraHeaders: env.ANTHROPIC_EXTRA_HEADERS ? JSON.parse(env.ANTHROPIC_EXTRA_HEADERS) : undefined,
  };
}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const v = env[key];
  if (!v) throw new Error(`環境変数 ${key} が設定されていません`);
  return v;
}
