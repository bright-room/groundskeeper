// LLM の疎通確認。直接 API でも AI Gateway 経由でも、.env の設定どおりに 1 回呼ぶ
import { z } from "zod";
import { createStructuredCall } from "../src/adapters/llm/structured-call";
import { loadLLMOptions } from "../src/runtime/node/env";

const call = createStructuredCall(loadLLMOptions());
const result = await call({
  model: process.argv[2] ?? "claude-haiku-5-5",
  system: "与えられた文の言語と感情を判定し、report ツールで報告してください。",
  user: "今日はいい天気で気分がいい。",
  toolName: "report",
  toolDescription: "判定結果を報告する",
  schema: z.object({ language: z.string(), sentiment: z.enum(["positive", "neutral", "negative"]) }),
});
console.log(result);
