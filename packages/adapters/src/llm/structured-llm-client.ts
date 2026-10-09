import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// AI Gateway 経由の場合は baseURL と cf-aig-authorization ヘッダーを渡す（BYOK なら apiKey は不要）
export type LLMOptions = {
  apiKey?: string | undefined;
  baseURL?: string | undefined;
  extraHeaders?: Record<string, string> | undefined;
};

export type StructuredRequest<T> = {
  model: string;
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
};

// ツール呼び出しを強制し、スキーマに合わない出力は例外にする（キュー側で再試行される）
export class StructuredLLMClient {
  private readonly client: Anthropic;

  constructor(opts: LLMOptions) {
    this.client = new Anthropic({
      apiKey: opts.apiKey ?? null,
      baseURL: opts.baseURL ?? null,
      defaultHeaders: opts.extraHeaders ?? {},
    });
  }

  async call<T>(req: StructuredRequest<T>): Promise<T> {
    // $schema は API に渡す必要がないので外す
    const { $schema: _, ...inputSchema } = z.toJSONSchema(req.schema);
    const res = await this.client.messages.create({
      model: req.model,
      max_tokens: req.maxTokens ?? 1024,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
      tools: [
        {
          name: req.toolName,
          description: req.toolDescription,
          input_schema: inputSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: req.toolName },
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (block?.type !== "tool_use") throw new Error(`LLM did not call ${req.toolName}`);
    return req.schema.parse(block.input);
  }
}
