import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminId } from "@/server/auth/guard";
import { productService } from "@/server/services/product-service";

export async function GET(request: NextRequest) {
  const adminId = await requireAdminId(request);
  if (!adminId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const products = await productService.listForAdmin();
  return NextResponse.json({ products });
}
