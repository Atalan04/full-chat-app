import { getToken } from "@/lib/auth";
import type { ApiErrorResponse, AuthResponse, ConversationSummary, Message, UserProfile } from "@/lib/types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error("Could not reach the server. Check that it is running and try again.");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload &&
      typeof (payload as ApiErrorResponse).error === "string"
        ? (payload as ApiErrorResponse).error
        : "The request could not be completed.";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export const api = {
  signup(username: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  login(username: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  me(): Promise<UserProfile> {
    return request<UserProfile>("/api/me");
  },

  updateProfile(profile: Pick<UserProfile, "first_name" | "last_name" | "bio">): Promise<UserProfile> {
    return request<UserProfile>("/api/me", {
      method: "PATCH",
      body: JSON.stringify(profile),
    });
  },

  deleteAccount(password: string): Promise<void> {
    return request<void>("/api/me", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    });
  },

  searchUsers(query: string): Promise<UserProfile[]> {
    return request<UserProfile[]>(`/api/users?q=${encodeURIComponent(query)}`);
  },

  conversations(): Promise<ConversationSummary[]> {
    return request<ConversationSummary[]>("/api/conversations");
  },

  messages(conversationId: number): Promise<Message[]> {
    return request<Message[]>(`/api/conversations/${conversationId}/messages`);
  },

  createConversation(username: string): Promise<ConversationSummary> {
    return request<ConversationSummary>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  },
};
