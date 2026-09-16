import { NextRequest, NextResponse } from "next/server";
import {
  ProductNotFoundError,
  productService,
} from "@/server/services/product-service";

// Drafts must be unreachable via the public API (PROJECT-REQUIREMENTS.md) —
// productService.getPublishedBySlug only looks at published products, so a
// draft slug 404s here exactly like a slug that doesn't exist at all.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const product = await productService.getPublishedBySlug(slug);
    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw error;
  }
}
