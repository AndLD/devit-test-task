"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authenticatedRequest } from "@/lib/authenticated-request";

export function ShopifyImportForm() {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await authenticatedRequest<{ product?: { id: string }; error?: string }>({
        url: "/api/admin/products/import",
        method: "POST",
        data: { productId },
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.status < 200 || res.status >= 300 || !res.data.product) {
        setError(res.data?.error ?? "Could not import this product.");
        return;
      }
      // Imported as a draft — send the admin straight to its editor to
      // review before publishing, rather than just refreshing the list.
      router.push(`/admin/products/${res.data.product.id}`);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-2 rounded-xl border border-dashed p-4"
    >
      <p className="text-sm font-medium">Import from Shopify</p>
      <p className="text-xs text-muted-foreground">
        Enter a Shopify product ID (numeric, or its gid://shopify/Product/…
        form). Imported as a draft for you to review.
      </p>
      <div className="flex gap-2">
        <Input
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          placeholder="e.g. 8325302452342"
          required
        />
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Importing…" : "Import"}
        </Button>
      </div>
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
    </form>
  );
}
