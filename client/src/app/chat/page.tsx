"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ApiError, api } from "@/lib/api";
import { clearSession, getToken, getUser, saveSession } from "@/lib/auth";
import { displayName } from "@/lib/userDisplay";
import type { UserProfile } from "@/lib/types";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setUser(getUser());
    let active = true;
    api.me().then((profile) => {
      if (!active) return;
      saveSession({ token, user: profile });
      setUser(profile);
      setError(null);
    }).catch((caughtError: unknown) => {
      if (!active) return;
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(caughtError instanceof Error ? caughtError.message : "Could not load your account.");
    });

    return () => {
      active = false;
    };
  }, [router]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-600">Chat App</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-gray-950">You’re signed in</h1>
            <p className="mt-2 text-sm text-gray-600">
              {user ? `Logged in as ${displayName(user)} (@${user.username}).` : "Checking your session…"}
            </p>
          </div>
          {user && <Avatar user={user} />}
          <Link
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            href="/profile"
          >
            Profile
          </Link>
          <button
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={handleLogout}
            type="button"
          >
            Log out
          </button>
        </div>

        <div className="mt-8 rounded-xl bg-gray-50 p-5">
          <p className="font-medium text-gray-900">Your account is ready.</p>
          <p className="mt-1 text-sm text-gray-600">Conversations will appear here as the chat features are added.</p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
