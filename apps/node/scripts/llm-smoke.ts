// LLM の疎通確認。直接 API でも AI Gateway 経由でも、.env の設定どおりに 1 回呼ぶ
import { StructuredLLMClient } from "@groundskeeper/adapters";
import { z } from "zod";
import { loadLLMOptions } from "../src/env";

const llm = new StructuredLLMClient(loadLLMOptions());
const result = await llm.call({
  model: process.argv[2] ?? "claude-haiku-5-5",
  system: "与えられた文の言語と感情を判定し、report ツールで報告してください。",
  user: "今日はいい天気で気分がいい。",
  toolName: "report",
  toolDescription: "判定結果を報告する",
  schema: z.object({ language: z.string(), sentiment: z.enum(["positive", "neutral", "negative"]) }),
});
console.log(result);
