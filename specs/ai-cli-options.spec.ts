import { describe, expect, it } from "vitest";
import { resolveNonInteractiveOptions } from "../src/commands/create-new-app";

describe("--ai non-interactive options", () => {
  it("accepts providers and companion AI capability packages", () => {
    const options = resolveNonInteractiveOptions({
      ai: ["ai-openai", "ai-tools", "ai-panoptic", "ai-workspace"],
    });

    expect(options.aiProviders).toEqual([
      "ai-openai",
      "ai-tools",
      "ai-panoptic",
      "ai-workspace",
    ]);
  });

  it("rejects non-AI keys with the valid AI choices", () => {
    expect(() =>
      resolveNonInteractiveOptions({ ai: ["test", "openai"] }),
    ).toThrow(
      "Unknown AI feature(s): test,openai. Valid AI choices: ai-openai, ai-google, ai-anthropic, ai-bedrock, ai-ollama, ai-tools, ai-panoptic, ai-workspace",
    );
  });
});
