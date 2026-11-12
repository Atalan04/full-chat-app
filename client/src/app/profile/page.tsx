"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ApiError, api } from "@/lib/api";
import { clearSession, getToken, getUser, saveSession } from "@/lib/auth";
import { disconnectSocket } from "@/lib/socket";
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
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAccount(deletePassword);
      disconnectSocket();
      clearSession();
      router.replace("/login");
    } catch (caughtError: unknown) {
      setDeleteError(caughtError instanceof Error ? caughtError.message : "Could not delete your account.");
    } finally {
      setDeleting(false);
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

        {!loading && user && (
          <section className="mt-12 rounded-xl border border-red-200 bg-red-50/60 p-5" aria-labelledby="delete-account-heading">
            <h2 id="delete-account-heading" className="font-semibold text-red-900">Delete account</h2>
            <p className="mt-2 text-sm leading-6 text-red-800">
              Your profile will be anonymized and you will be signed out. Your messages will remain visible to the people you chatted with.
            </p>
            <button
              className="mt-4 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-100"
              onClick={() => { setDeleteError(null); setDeleteDialogOpen(true); }}
              type="button"
            >
              Delete account…
            </button>
            {deleteDialogOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
                <section aria-labelledby="confirm-delete-heading" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" role="dialog">
                  <h3 className="text-lg font-semibold text-gray-950" id="confirm-delete-heading">Permanently delete your account?</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">This cannot be undone. Enter your password to confirm. Your messages will remain for your conversation partners.</p>
                  <form className="mt-5 space-y-4" onSubmit={(event) => { void handleDeleteAccount(event); }}>
                    <label className="block text-sm font-medium text-gray-800" htmlFor="delete-password">
                      Password
                      <input
                        autoComplete="current-password"
                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-950 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                        id="delete-password"
                        onChange={(event) => setDeletePassword(event.target.value)}
                        required
                        type="password"
                        value={deletePassword}
                      />
                    </label>
                    {deleteError && <p className="text-sm text-red-700" role="alert">{deleteError}</p>}
                    <div className="flex justify-end gap-3">
                      <button className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => { setDeleteDialogOpen(false); setDeletePassword(""); setDeleteError(null); }} type="button">Cancel</button>
                      <button className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={deleting || !deletePassword} type="submit">
                        {deleting ? "Deleting…" : "Confirm deletion"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
