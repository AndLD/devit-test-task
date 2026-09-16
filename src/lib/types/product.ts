// Shared domain types, independent of Prisma's generated types, so UI and
// service code don't couple directly to the ORM layer (see AGENTS.md).

export type ProductStatus = "DRAFT" | "PUBLISHED";

export interface ProductCharacteristic {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  characteristics: ProductCharacteristic[];
  description: string;
  seoTitle: string;
  seoDescription: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}
