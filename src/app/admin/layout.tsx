// Placeholder admin layout.
// Will enforce auth (redirect to /admin/login) for everything under /admin
// except the login page itself, once auth is implemented (Phase 2).
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex min-h-screen flex-col">{children}</div>;
}
