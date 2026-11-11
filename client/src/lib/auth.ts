import type { AuthResponse, UserProfile } from "@/lib/types";

const TOKEN_KEY = "chat_token";
const USER_KEY = "chat_user";

export function getToken(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
}

export function getUser(): UserProfile | null {
  if (typeof window === "undefined") return null;

  const storedUser = window.localStorage.getItem(USER_KEY);
  if (!storedUser) return null;

  try {
    const user: unknown = JSON.parse(storedUser);
    if (
      typeof user === "object" &&
      user !== null &&
      "id" in user &&
      typeof user.id === "number" &&
      "username" in user &&
      typeof user.username === "string"
    ) {
      return user as UserProfile;
    }
  } catch {
    // Invalid local data is discarded below.
  }

  window.localStorage.removeItem(USER_KEY);
  return null;
}

export function saveSession(session: AuthResponse): void {
  window.localStorage.setItem(TOKEN_KEY, session.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
