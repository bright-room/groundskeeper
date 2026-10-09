import { describe, expect, it } from "vitest";
import { StructuredLLMClient } from "../../src/llm/structured-llm-client";

describe("StructuredLLMClient", () => {
  it("http の baseURL はローカル以外拒否する", () => {
    expect(() => new StructuredLLMClient({ baseURL: "http://gateway.example.com" })).toThrow(
      "https",
    );
    expect(() => new StructuredLLMClient({ baseURL: "https://gateway.example.com" })).not.toThrow();
    expect(() => new StructuredLLMClient({ baseURL: "http://localhost:8787" })).not.toThrow();
  });
});
