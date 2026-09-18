import type {
  LlmProvider,
  ProductSuggestion,
  ProductSuggestionInput,
} from "./types";
import { PRODUCT_CONTENT_LIMITS as LIMITS } from "@/lib/validation/product-limits";

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max).trim() : value;
}

// Deterministic, offline stand-in for the real OpenAI-backed provider, used
// whenever OPENAI_API_KEY isn't set (see resolveProvider() in
// suggestion-service.ts) — reviewers can exercise the whole suggest/apply
// flow without an API key, per PROJECT-REQUIREMENTS.md. Always clearly
// marked as mocked via the `mocked` flag, surfaced to the client.
export class MockLlmProvider implements LlmProvider {
  readonly mocked = true;

  async generate(input: ProductSuggestionInput): Promise<ProductSuggestion> {
    const { name, characteristics } = input;
    const featureList = characteristics
      .map((c) => `${c.label.toLowerCase()}: ${c.value}`)
      .join(", ");

    const description = truncate(
      characteristics.length > 0
        ? `${name} — надійний вибір для щоденного використання. Основні характеристики: ${featureList}. Поєднує якість, зручність і практичність.`
        : `${name} — надійний вибір для щоденного використання. Поєднує якість, зручність і практичність.`,
      LIMITS.description,
    );

    const seoTitle = truncate(`${name} — купити з доставкою`, LIMITS.seoTitle);

    const seoDescription = truncate(
      characteristics.length > 0
        ? `Купуйте ${name}: ${featureList}. Вигідна ціна та швидка доставка.`
        : `Купуйте ${name} за вигідною ціною. Швидка доставка.`,
      LIMITS.seoDescription,
    );

    return { description, seoTitle, seoDescription };
  }
}
