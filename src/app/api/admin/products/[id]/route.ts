import { NextRequest, NextResponse } from "next/server";
import { requireAdminId } from "@/server/auth/guard";
import {
  InvalidProductFieldsError,
  ProductNotFoundError,
  productService,
} from "@/server/services/product-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminId = await requireAdminId();
  if (!adminId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const product = await productService.getForAdmin(id);
    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminId = await requireAdminId();
  if (!adminId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);

  try {
    const product = await productService.updateEditableFields(id, body);
    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error instanceof InvalidProductFieldsError) {
      return NextResponse.json(
        { error: "Invalid product fields", issues: error.issues },
        { status: 400 },
      );
    }
    throw error;
  }
}
