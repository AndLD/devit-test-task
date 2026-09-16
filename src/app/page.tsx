import Link from "next/link";
import { SiteHeader } from "@/components/public/site-header";
import { productService } from "@/server/services/product-service";

// Published products can change at any time via the admin panel, so this
// list must never be baked into a static build.
export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const products = await productService.listPublished();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-10">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold">Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Browse our published products.
          </p>
        </div>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No products are published yet.
          </p>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-card">
            {products.map((product) => (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/40"
              >
                <span className="text-sm font-medium">{product.name}</span>
                <span className="text-muted-foreground">›</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
