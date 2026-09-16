import Link from "next/link";
import { SiteHeader } from "@/components/public/site-header";

export default function ProductNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <p className="text-muted-foreground">
          It may have been unpublished or the link is incorrect.
        </p>
        <Link href="/" className="mt-4 text-sm hover:underline">
          ‹ Back to catalog
        </Link>
      </main>
    </>
  );
}
