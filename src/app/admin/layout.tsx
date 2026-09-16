// Auth for everything under /admin except /admin/login is enforced by
// src/proxy.ts (redirects to /admin/login on a missing/expired access token).
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">{children}</div>
  );
}
