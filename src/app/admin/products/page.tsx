import Link from "next/link";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { StatusBadge } from "@/components/admin/status-badge";
import { productService } from "@/server/services/product-service";

// Admin data must never be baked into a static build — always hit the DB.
export const dynamic = "force-dynamic";

export default async function AdminProductListPage() {
  const products = await productService.listForAdmin();

  return (
    <>
      <AdminTopBar title="Products" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-10">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage description, SEO fields, and publish status.
          </p>
        </div>

        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/admin/products/${product.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/40"
            >
              <span className="text-sm font-medium">{product.name}</span>
              <div className="flex items-center gap-3">
                <StatusBadge status={product.status} />
                <span className="text-muted-foreground">›</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
