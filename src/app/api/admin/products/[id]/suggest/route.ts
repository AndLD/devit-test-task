import { NextRequest, NextResponse } from "next/server";
import { requireAdminId } from "@/server/auth/guard";
import { ProductNotFoundError, productService } from "@/server/services/product-service";
import {
  InvalidSuggestionError,
  LlmProviderError,
  suggestionService,
} from "@/server/services/llm/suggestion-service";

// Generates a description/SEO-fields suggestion for the given product's
// name + characteristics (never its currently-editable fields — this is
// meant to help write them, not paraphrase a draft). Read-only: never
// touches the database. The client applies the result to its own local
// form state only; saving/publishing still requires the normal explicit
// PATCH (see AGENTS.md, PROJECT-REQUIREMENTS.md's LLM bonus).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminId = await requireAdminId(request);
  if (!adminId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const product = await productService.getForAdmin(id);
    const { suggestion, mocked } = await suggestionService.generate({
      name: product.name,
      characteristics: product.characteristics,
    });
    return NextResponse.json({ suggestion, mocked });
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error instanceof LlmProviderError || error instanceof InvalidSuggestionError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
