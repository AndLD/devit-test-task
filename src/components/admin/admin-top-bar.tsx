import { LogoutButton } from "@/components/admin/logout-button";

export function AdminTopBar({ title }: { title: string }) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-4 sm:px-10">
        <span className="text-base font-semibold">{title}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
