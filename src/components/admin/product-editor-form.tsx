"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { cn } from "@/lib/utils";
import type { Product, ProductStatus } from "@/lib/types/product";

const LIMITS = {
  description: 1000,
  seoTitle: 60,
  seoDescription: 160,
} as const;

function isFieldValid(value: string, max: number) {
  const trimmed = value.trim();
  return trimmed.length > 0 && value.length <= max;
}

function Counter({ value, max }: { value: number; max: number }) {
  const invalid = value === 0 || value > max;
  return (
    <p
      className={cn(
        "text-right text-xs",
        invalid ? "text-red-600" : "text-muted-foreground",
      )}
    >
      {value} / {max}
    </p>
  );
}

export function ProductEditorForm({ product }: { product: Product }) {
  const router = useRouter();
  const [description, setDescription] = useState(product.description);
  const [seoTitle, setSeoTitle] = useState(product.seoTitle);
  const [seoDescription, setSeoDescription] = useState(product.seoDescription);
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const isValid = useMemo(
    () =>
      isFieldValid(description, LIMITS.description) &&
      isFieldValid(seoTitle, LIMITS.seoTitle) &&
      isFieldValid(seoDescription, LIMITS.seoDescription),
    [description, seoTitle, seoDescription],
  );

  async function handleSave() {
    if (!isValid) return;
    setPending(true);
    setError(null);
    setJustSaved(false);
    try {
      const res = await authenticatedFetch(
        `/api/admin/products/${product.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description,
            seoTitle,
            seoDescription,
            status,
          }),
        },
      );
      if (res.status === 401) {
        // The access token expired and the refresh attempt inside
        // authenticatedFetch also failed (refresh token itself expired or
        // was revoked elsewhere) — the session is genuinely over.
        router.push("/admin/login");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          Array.isArray(data?.issues) && data.issues.length > 0
            ? data.issues.join(" ")
            : (data?.error ?? "Could not save changes."),
        );
        return;
      }
      setJustSaved(true);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5 rounded-xl border bg-card p-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setJustSaved(false);
          }}
        />
        <Counter value={description.length} max={LIMITS.description} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="seoTitle">SEO title</Label>
        <Input
          id="seoTitle"
          value={seoTitle}
          onChange={(e) => {
            setSeoTitle(e.target.value);
            setJustSaved(false);
          }}
        />
        <Counter value={seoTitle.length} max={LIMITS.seoTitle} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="seoDescription">SEO description</Label>
        <Textarea
          id="seoDescription"
          rows={3}
          value={seoDescription}
          onChange={(e) => {
            setSeoDescription(e.target.value);
            setJustSaved(false);
          }}
        />
        <Counter value={seoDescription.length} max={LIMITS.seoDescription} />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <div className="flex gap-2">
          {(["DRAFT", "PUBLISHED"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setStatus(option);
                setJustSaved(false);
              }}
              className={cn(
                "flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-5",
                status === option
                  ? "border-foreground bg-foreground text-background"
                  : "border-input text-muted-foreground hover:bg-muted",
              )}
            >
              {option === "DRAFT" ? "Draft" : "Published"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col-reverse items-start gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {justSaved ? "Saved." : "Changes are saved when you click Save."}
        </p>
        <Button
          onClick={handleSave}
          disabled={pending || !isValid}
          className="w-full sm:w-auto"
        >
          {pending && <Spinner />}
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
