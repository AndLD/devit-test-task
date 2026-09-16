import { NextResponse } from "next/server";
import { requireAdminId } from "@/server/auth/guard";
import { productService } from "@/server/services/product-service";

export async function GET() {
  const adminId = await requireAdminId();
  if (!adminId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const products = await productService.listForAdmin();
  return NextResponse.json({ products });
}
