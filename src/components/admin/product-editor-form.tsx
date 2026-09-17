"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { authenticatedRequest } from "@/lib/authenticated-request";
import { cn } from "@/lib/utils";
import type { Product, ProductStatus } from "@/lib/types/product";

interface ContentSuggestion {
  description: string;
  seoTitle: string;
  seoDescription: string;
}

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

  // Independent of the save flow above (its own pending/error state) so a
  // suggestion failure can never be confused with — or clobber — a save
  // result, and vice versa. `suggestion` only ever populates a preview;
  // nothing here touches description/seoTitle/seoDescription until the user
  // explicitly applies it, and applying still requires a separate Save.
  const [suggestPending, setSuggestPending] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<ContentSuggestion | null>(null);
  const [suggestionMocked, setSuggestionMocked] = useState(false);

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
      const res = await authenticatedRequest({
        url: `/api/admin/products/${product.id}`,
        method: "PATCH",
        data: { description, seoTitle, seoDescription, status },
      });
      if (res.status === 401) {
        // The access token expired and the refresh attempt inside
        // authenticatedRequest also failed (refresh token itself expired or
        // was revoked elsewhere) — the session is genuinely over.
        router.push("/admin/login");
        return;
      }
      if (res.status < 200 || res.status >= 300) {
        const data = res.data as { issues?: string[]; error?: string } | null;
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

  async function handleSuggest() {
    setSuggestPending(true);
    setSuggestError(null);
    try {
      const res = await authenticatedRequest<{
        suggestion?: ContentSuggestion;
        mocked?: boolean;
        error?: string;
      }>({
        url: `/api/admin/products/${product.id}/suggest`,
        method: "POST",
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.status < 200 || res.status >= 300 || !res.data.suggestion) {
        setSuggestError(res.data?.error ?? "Could not generate a suggestion.");
        return;
      }
      setSuggestion(res.data.suggestion);
      setSuggestionMocked(Boolean(res.data.mocked));
    } catch {
      setSuggestError("Network error — please try again.");
    } finally {
      setSuggestPending(false);
    }
  }

  function applySuggestion() {
    if (!suggestion) return;
    setDescription(suggestion.description);
    setSeoTitle(suggestion.seoTitle);
    setSeoDescription(suggestion.seoDescription);
    setJustSaved(false);
    setSuggestion(null);
  }

  function discardSuggestion() {
    setSuggestion(null);
  }

  return (
    <div className="space-y-5 rounded-xl border bg-card p-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-dashed p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">AI-generated suggestion</p>
            <p className="text-xs text-muted-foreground">
              Generates description &amp; SEO fields from the product&apos;s
              name and characteristics. Only fills the fields below when you
              apply it — nothing is saved automatically.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSuggest}
            disabled={suggestPending}
          >
            {suggestPending && <Spinner />}
            {suggestPending ? "Generating…" : "Suggest with AI"}
          </Button>
        </div>

        {suggestError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
            {suggestError}
          </div>
        )}

        {suggestion && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Preview
              </p>
              {suggestionMocked && (
                <Badge variant="secondary">Simulated (no API key set)</Badge>
              )}
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium">Description</dt>
                <dd className="text-muted-foreground">{suggestion.description}</dd>
              </div>
              <div>
                <dt className="font-medium">SEO title</dt>
                <dd className="text-muted-foreground">{suggestion.seoTitle}</dd>
              </div>
              <div>
                <dt className="font-medium">SEO description</dt>
                <dd className="text-muted-foreground">{suggestion.seoDescription}</dd>
              </div>
            </dl>
            <div className="flex gap-2">
              <Button type="button" onClick={applySuggestion}>
                Apply to editor
              </Button>
              <Button type="button" variant="secondary" onClick={discardSuggestion}>
                Discard
              </Button>
            </div>
          </div>
        )}
      </div>

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
