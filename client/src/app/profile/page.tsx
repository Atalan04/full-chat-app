"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ApiError, api } from "@/lib/api";
import { clearSession, getToken, getUser, saveSession } from "@/lib/auth";
import { displayName } from "@/lib/userDisplay";
import type { UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const cachedUser = getUser();
    if (cachedUser) {
      setUser(cachedUser);
      setFirstName(cachedUser.first_name);
      setLastName(cachedUser.last_name);
      setBio(cachedUser.bio);
    }

    let active = true;
    api.me().then((profile) => {
      if (!active) return;
      saveSession({ token, user: profile });
      setUser(profile);
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setBio(profile.bio);
      setError(null);
    }).catch((caughtError: unknown) => {
      if (!active) return;
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(caughtError instanceof Error ? caughtError.message : "Could not load your profile.");
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const profile = await api.updateProfile({
        first_name: firstName,
        last_name: lastName,
        bio,
      });
      const token = getToken();
      if (token) saveSession({ token, user: profile });
      setUser(profile);
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setBio(profile.bio);
      setSaved(true);
    } catch (caughtError: unknown) {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(caughtError instanceof Error ? caughtError.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:py-16">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <Link className="text-sm font-medium text-indigo-600 hover:text-indigo-700" href="/chat">
          ← Back to chat
        </Link>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-gray-950">Your profile</h1>

        {user && (
          <div className="mt-6 flex items-center gap-4 rounded-xl bg-gray-50 p-4">
            <Avatar user={user} className="h-14 w-14 text-base" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-950">{displayName(user)}</p>
              <p className="text-sm text-gray-500">@{user.username}</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-gray-600" role="status">Loading your profile…</p>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                First name
                <input
                  autoComplete="given-name"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  onChange={(event) => { setFirstName(event.target.value); setSaved(false); }}
                  value={firstName}
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Last name
                <input
                  autoComplete="family-name"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  onChange={(event) => { setLastName(event.target.value); setSaved(false); }}
                  value={lastName}
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-gray-700">
              Bio
              <textarea
                className="mt-2 min-h-32 w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                onChange={(event) => { setBio(event.target.value); setSaved(false); }}
                value={bio}
              />
              <span className="mt-1 block text-xs font-normal text-gray-500">Up to 200 characters</span>
            </label>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
            {saved && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700" role="status">Profile saved.</p>}

            <button
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || loading}
              type="submit"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
