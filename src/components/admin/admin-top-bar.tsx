import { LogoutButton } from "@/components/admin/logout-button";

// Full-bleed, unlike the page content below it (which is centered at
// max-w-2xl) — matches the Figma admin mockups, where the header spans the
// whole viewport width.
export function AdminTopBar() {
  return (
    <header className="border-b bg-card">
      <div className="flex w-full items-center justify-between px-4 py-4 sm:px-10">
        <span className="text-base font-semibold">Product Content Studio</span>
        <LogoutButton />
      </div>
    </header>
  );
}
