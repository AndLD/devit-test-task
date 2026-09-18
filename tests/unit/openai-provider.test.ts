import { jest } from "@jest/globals";
import { OpenAiProvider } from "@/server/services/llm/openai-provider";
import { LlmProviderError } from "@/server/services/llm/types";

// A fake satisfying just the shape OpenAiProvider actually calls (`post`) —
// same structural-typing approach used for the token-provider/Shopify-client
// fakes elsewhere in this suite.
function makeFakeHttpClient(post: (...args: unknown[]) => unknown) {
  return { post } as never;
}

const INPUT = {
  name: "USB-C Hub 7-in-1",
  characteristics: [{ label: "Ports", value: "HDMI, 3x USB-A, SD, microSD" }],
};

function chatCompletionResponse(content: unknown) {
  return {
    status: 200,
    data: { choices: [{ message: { content } }] },
  };
}

describe("OpenAiProvider", () => {
  it("is flagged as not mocked", () => {
    const provider = new OpenAiProvider("sk-fake", "gpt-4o-mini", makeFakeHttpClient(jest.fn()));
    expect(provider.mocked).toBe(false);
  });

  it("sends the API key and model, and parses a valid JSON response", async () => {
    const validJson = JSON.stringify({
      description: "A compact USB-C hub with HDMI and card readers.",
      seoTitle: "USB-C Hub 7-in-1 — buy online",
      seoDescription: "Shop the USB-C Hub 7-in-1 with fast shipping.",
    });
    const post = jest.fn(async () => chatCompletionResponse(validJson));
    const provider = new OpenAiProvider("sk-fake", "gpt-4o-mini", makeFakeHttpClient(post));

    const result = await provider.generate(INPUT);

    expect(result).toEqual({
      description: "A compact USB-C hub with HDMI and card readers.",
      seoTitle: "USB-C Hub 7-in-1 — buy online",
      seoDescription: "Shop the USB-C Hub 7-in-1 with fast shipping.",
    });
    expect(post).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({ model: "gpt-4o-mini" }),
      { headers: { Authorization: "Bearer sk-fake" } },
    );
    const [, body] = post.mock.calls[0] as unknown as [string, { messages: { content: string }[] }];
    expect(body.messages[1].content).toContain("USB-C Hub 7-in-1");
  });

  it("throws LlmProviderError on a non-2xx status", async () => {
    const post = jest.fn(async () => ({ status: 401, data: { error: "invalid_api_key" } }));
    const provider = new OpenAiProvider("sk-fake", "gpt-4o-mini", makeFakeHttpClient(post));

    await expect(provider.generate(INPUT)).rejects.toBeInstanceOf(LlmProviderError);
  });

  it("throws LlmProviderError on a network failure", async () => {
    const post = jest.fn(async () => {
      throw new Error("network down");
    });
    const provider = new OpenAiProvider("sk-fake", "gpt-4o-mini", makeFakeHttpClient(post));

    await expect(provider.generate(INPUT)).rejects.toBeInstanceOf(LlmProviderError);
  });

  it("throws LlmProviderError when the response has no message content", async () => {
    const post = jest.fn(async () => ({ status: 200, data: { choices: [] } }));
    const provider = new OpenAiProvider("sk-fake", "gpt-4o-mini", makeFakeHttpClient(post));

    await expect(provider.generate(INPUT)).rejects.toBeInstanceOf(LlmProviderError);
  });

  it("throws LlmProviderError when the content isn't valid JSON", async () => {
    const post = jest.fn(async () => chatCompletionResponse("not json"));
    const provider = new OpenAiProvider("sk-fake", "gpt-4o-mini", makeFakeHttpClient(post));

    await expect(provider.generate(INPUT)).rejects.toBeInstanceOf(LlmProviderError);
  });

  it("throws LlmProviderError when the parsed JSON is missing expected fields", async () => {
    const post = jest.fn(async () => chatCompletionResponse(JSON.stringify({ description: "x" })));
    const provider = new OpenAiProvider("sk-fake", "gpt-4o-mini", makeFakeHttpClient(post));

    await expect(provider.generate(INPUT)).rejects.toBeInstanceOf(LlmProviderError);
  });
});
