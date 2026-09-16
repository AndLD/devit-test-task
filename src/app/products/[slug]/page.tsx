import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/public/site-header";
import {
  ProductNotFoundError,
  productService,
} from "@/server/services/product-service";

// Published status can flip at any time via the admin panel, and a draft
// must never be servable at its slug, so this page can't be statically
// prerendered.
export const dynamic = "force-dynamic";

// Deduped per-request so generateMetadata and the page component don't
// each issue their own DB query for the same slug.
const getProduct = cache((slug: string) =>
  productService.getPublishedBySlug(slug),
);

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    return {
      title: product.seoTitle,
      description: product.seoDescription,
    };
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return {};
    }
    throw error;
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  let product;
  try {
    product = await getProduct(slug);
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-10">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-muted-foreground hover:underline"
        >
          ‹ Back to catalog
        </Link>

        <div className="space-y-6 rounded-xl border bg-card p-6">
          <h1 className="text-2xl font-semibold">{product.name}</h1>

          {product.characteristics.length > 0 && (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {product.characteristics.map((c) => (
                <div key={c.label} className="flex justify-between gap-4 text-sm">
                  <dt className="text-muted-foreground">{c.label}</dt>
                  <dd className="font-medium">{c.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {product.description}
          </p>
        </div>
      </main>
    </>
  );
}
