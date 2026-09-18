import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { ProductEditorForm } from "@/components/admin/product-editor-form";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  ProductNotFoundError,
  productService,
} from "@/server/services/product-service";

// Admin data must never be baked into a static build — always hit the DB.
export const dynamic = "force-dynamic";

export default async function AdminProductEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await productService.getForAdmin(id).catch((error) => {
    if (error instanceof ProductNotFoundError) notFound();
    throw error;
  });

  return (
    <>
      <AdminTopBar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-10">
        <Link
          href="/admin/products"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to products
        </Link>

        <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <StatusBadge status={product.status} />
        </div>

        <div className="mb-6 rounded-xl bg-muted/50 p-4">
          <p className="mb-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Characteristics (read-only)
          </p>
          <dl className="space-y-2">
            {product.characteristics.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between text-sm"
              >
                <dt className="text-muted-foreground">{c.label}</dt>
                <dd className="font-medium">{c.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <ProductEditorForm product={product} />
      </main>
    </>
  );
}
