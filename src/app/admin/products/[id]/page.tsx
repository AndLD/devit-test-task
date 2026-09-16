// Placeholder — admin product editor.
// Will edit description/SEO fields + status (name/characteristics read-only),
// with clear save/loading/error states (Phase 2/4). Requires authentication.
export default async function AdminProductEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold">Edit product {id}</h1>
      <p className="text-muted-foreground">
        The product editor form will be rendered here.
      </p>
    </main>
  );
}
