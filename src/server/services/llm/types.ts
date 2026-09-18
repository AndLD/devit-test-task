import type { ProductCharacteristic } from "@/lib/types/product";
import type { ProductContentFields } from "@/lib/validation/product";

export interface ProductSuggestionInput {
  name: string;
  characteristics: ProductCharacteristic[];
}

export type ProductSuggestion = ProductContentFields;

export class LlmProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmProviderError";
  }
}

// Implemented by both the real OpenAI-backed provider and the mock/
// simulated one, so the service and its callers never know which is
// active — see resolveProvider() in suggestion-service.ts.
export interface LlmProvider {
  readonly mocked: boolean;
  generate(input: ProductSuggestionInput): Promise<ProductSuggestion>;
}
