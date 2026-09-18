import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-4 sm:px-10">
        <Link href="/" className="text-base font-semibold">
          Product Content Studio
        </Link>
      </div>
    </header>
  );
}
