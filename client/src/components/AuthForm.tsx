"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/auth";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const session = isSignup
        ? await api.signup(username, password)
        : await api.login(username, password);
      saveSession(session);
      router.replace("/chat");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-indigo-600">Chat App</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-gray-950">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {isSignup ? "Choose a username to get started." : "Sign in to continue to your chats."}
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-800" htmlFor="username">
              Username
            </label>
            <input
              autoComplete="username"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              id="username"
              maxLength={20}
              minLength={3}
              onChange={(event) => setUsername(event.target.value)}
              pattern="[A-Za-z0-9_]{3,20}"
              required
              title="Use 3–20 letters, numbers, or underscores."
              value={username}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-800" htmlFor="password">
              Password
            </label>
            <input
              autoComplete={isSignup ? "new-password" : "current-password"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              id="password"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {isSignup ? "Already have an account? " : "New to Chat App? "}
          <Link className="font-medium text-indigo-600 hover:text-indigo-700" href={isSignup ? "/login" : "/signup"}>
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
