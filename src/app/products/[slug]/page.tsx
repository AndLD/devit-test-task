// Placeholder — public product page.
// Will render name, characteristics, description, and use SEO fields for
// the page title/meta description. Drafts must 404 here (Phase 2/4).
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold">Product: {slug}</h1>
      <p className="text-muted-foreground">
        Product details will be rendered here.
      </p>
    </main>
  );
}
