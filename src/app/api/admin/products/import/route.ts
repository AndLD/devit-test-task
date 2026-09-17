import { NextRequest, NextResponse } from "next/server";
import { requireAdminId } from "@/server/auth/guard";
import {
  InvalidShopifyProductIdError,
  ShopifyNotConfiguredError,
  shopifyImportService,
} from "@/server/services/shopify/import-service";
import { ShopifyMappingError } from "@/server/services/shopify/mapper";
import {
  ShopifyClientError,
  ShopifyProductNotFoundError,
} from "@/server/services/shopify/types";

// Imports one product from Shopify by numeric product ID and creates it in
// this app's own database as a DRAFT, ready for review in the editor — the
// only place in the admin API that creates a product (see AGENTS.md: the
// core editor is read/update-only; this is the Shopify bonus's explicit
// exception to that).
export async function POST(request: NextRequest) {
  const adminId = await requireAdminId(request);
  if (!adminId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const productId = body?.productId;
  if (typeof productId !== "string" || productId.trim().length === 0) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  try {
    const product = await shopifyImportService.importProduct(productId);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidShopifyProductIdError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ShopifyNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof ShopifyProductNotFoundError) {
      return NextResponse.json({ error: "Shopify product not found" }, { status: 404 });
    }
    if (error instanceof ShopifyClientError || error instanceof ShopifyMappingError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
