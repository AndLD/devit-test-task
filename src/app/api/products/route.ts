import { NextResponse } from "next/server";
import { productService } from "@/server/services/product-service";

export async function GET() {
  const products = await productService.listPublished();
  return NextResponse.json({ products });
}
