"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await apiClient.post("/api/admin/auth/logout");
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
