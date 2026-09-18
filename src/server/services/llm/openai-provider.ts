import type { AxiosResponse } from "axios";
import { httpClient } from "@/server/lib/http-client";
import type {
  LlmProvider,
  ProductSuggestion,
  ProductSuggestionInput,
} from "./types";
import { LlmProviderError } from "./types";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `Ти — копірайтер для інтернет-магазину. За назвою товару та його характеристиками згенеруй контент українською мовою для картки товару.

Поверни ЛИШЕ JSON-об'єкт з трьома полями:
- "description": опис товару, до 1000 символів, не порожній.
- "seoTitle": SEO-заголовок сторінки, до 60 символів, не порожній.
- "seoDescription": SEO-опис сторінки, до 160 символів, не порожній.

Не додавай нічого, крім цього JSON-об'єкта.`;

function buildUserPrompt(input: ProductSuggestionInput): string {
  const characteristicsText =
    input.characteristics.length > 0
      ? input.characteristics.map((c) => `- ${c.label}: ${c.value}`).join("\n")
      : "(характеристики не вказані)";
  return `Назва товару: ${input.name}\nХарактеристики:\n${characteristicsText}`;
}

// Real LLM-backed provider (the bonus's "real mode" per
// PROJECT-REQUIREMENTS.md). Used whenever OPENAI_API_KEY is set — see
// resolveProvider() in suggestion-service.ts.
export class OpenAiProvider implements LlmProvider {
  readonly mocked = false;

  constructor(
    private readonly apiKey: string,
    private readonly model: string = process.env.OPENAI_MODEL || DEFAULT_MODEL,
  ) {}

  async generate(input: ProductSuggestionInput): Promise<ProductSuggestion> {
    let response: AxiosResponse;
    try {
      response = await httpClient.post(
        OPENAI_CHAT_COMPLETIONS_URL,
        {
          model: this.model,
          response_format: { type: "json_object" },
          temperature: 0.7,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(input) },
          ],
        },
        { headers: { Authorization: `Bearer ${this.apiKey}` } },
      );
    } catch {
      throw new LlmProviderError("Could not reach the OpenAI API.");
    }

    if (response.status < 200 || response.status >= 300) {
      throw new LlmProviderError(
        `OpenAI API request failed with status ${response.status}.`,
      );
    }

    const content = response.data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new LlmProviderError("OpenAI API returned an unexpected response shape.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new LlmProviderError("OpenAI API did not return valid JSON.");
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>).description !== "string" ||
      typeof (parsed as Record<string, unknown>).seoTitle !== "string" ||
      typeof (parsed as Record<string, unknown>).seoDescription !== "string"
    ) {
      throw new LlmProviderError("OpenAI API response is missing expected fields.");
    }

    const result = parsed as Record<string, string>;
    return {
      description: result.description,
      seoTitle: result.seoTitle,
      seoDescription: result.seoDescription,
    };
  }
}
