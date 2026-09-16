import { Spinner } from "@/components/ui/spinner";

export default function AdminProductEditorLoading() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" />
    </main>
  );
}
