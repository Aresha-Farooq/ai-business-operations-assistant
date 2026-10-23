"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoutIcon } from "./icons";

type LogoutButtonProps = {
  className?: string;
  onLoggedOut?: () => void;
};

export function LogoutButton({ className, onLoggedOut }: LogoutButtonProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        setError("Unable to sign out. Please try again.");
        return;
      }

      onLoggedOut?.();
      router.push("/login");
      router.refresh();
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={className}
      >
        <LogoutIcon className="h-5 w-5 shrink-0" />
        {loading ? "Signing out..." : "Logout"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 px-3 text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
