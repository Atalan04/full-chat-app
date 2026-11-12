"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ApiError, api } from "@/lib/api";
import { clearSession, getToken, getUser, saveSession } from "@/lib/auth";
import { displayName } from "@/lib/userDisplay";
import type { ConversationSummary, UserProfile } from "@/lib/types";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [openingUsername, setOpeningUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setUser(getUser());
    let active = true;

    Promise.all([api.me(), api.conversations()]).then(([profile, items]) => {
      if (!active) return;
      saveSession({ token, user: profile });
      setUser(profile);
      setConversations(items);
      if (items.length > 0) setSelectedConversation(items[0]);
      setError(null);
    }).catch((caughtError: unknown) => {
      if (!active) return;
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(caughtError instanceof Error ? caughtError.message : "Could not load your conversations.");
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const query = search.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      api.searchUsers(query).then((results) => {
        if (active) setSearchResults(results);
      }).catch((caughtError: unknown) => {
        if (!active) return;
        setSearchResults([]);
        setSearchError(caughtError instanceof Error ? caughtError.message : "Could not search users.");
      }).finally(() => {
        if (active) setSearching(false);
      });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  async function openUser(event: FormEvent<HTMLFormElement>, username: string) {
    event.preventDefault();
    setOpeningUsername(username);
    setError(null);

    try {
      const conversation = await api.createConversation(username);
      setSelectedConversation(conversation);
      setSearch("");
      const items = await api.conversations();
      setConversations(items);
    } catch (caughtError: unknown) {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(caughtError instanceof Error ? caughtError.message : "Could not open the conversation.");
    } finally {
      setOpeningUsername(null);
    }
  }

  function selectConversation(conversation: ConversationSummary) {
    setSelectedConversation(conversation);
  }

  const query = search.trim();

  return (
    <main className="min-h-screen bg-gray-100 p-3 sm:p-6">
      <section className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-7xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-gray-200 lg:border-b-0 lg:border-r">
          <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              {user && <Avatar user={user} className="h-10 w-10 text-xs" />}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-950">{user ? displayName(user) : "Chat App"}</p>
                {user && <p className="truncate text-xs text-gray-500">@{user.username}</p>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-sm">
              <Link className="font-medium text-indigo-600 hover:text-indigo-700" href="/profile">Profile</Link>
              <button className="font-medium text-gray-600 hover:text-gray-900" onClick={handleLogout} type="button">
                Log out
              </button>
            </div>
          </header>

          <div className="border-b border-gray-200 p-4">
            <label className="sr-only" htmlFor="user-search">Find people by username</label>
            <input
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-950 outline-none placeholder:text-gray-500 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              id="user-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find people by username"
              type="search"
              value={search}
            />
          </div>

          {query ? (
            <div className="min-h-28 overflow-y-auto p-2" aria-label="Search results">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">People</p>
              {searching && <p className="px-3 py-3 text-sm text-gray-500" role="status">Searching…</p>}
              {searchError && <p className="px-3 py-3 text-sm text-red-700" role="alert">{searchError}</p>}
              {!searching && !searchError && searchResults.length === 0 && (
                <p className="px-3 py-3 text-sm text-gray-500">No users found.</p>
              )}
              {searchResults.map((result) => (
                <form key={result.id} onSubmit={(event) => { void openUser(event, result.username); }}>
                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-indigo-50 disabled:opacity-60"
                    disabled={openingUsername !== null}
                    type="submit"
                  >
                    <Avatar user={result} className="h-10 w-10 text-xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{displayName(result)}</span>
                      <span className="block truncate text-xs text-gray-500">@{result.username}</span>
                    </span>
                    {openingUsername === result.username && <span className="text-xs text-gray-500">Opening…</span>}
                  </button>
                </form>
              ))}
            </div>
          ) : (
            <div className="min-h-28 flex-1 overflow-y-auto p-2" aria-label="Conversations">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Conversations</p>
              {loading && <p className="px-3 py-3 text-sm text-gray-500" role="status">Loading…</p>}
              {!loading && conversations.length === 0 && (
                <p className="px-3 py-3 text-sm leading-6 text-gray-500">Search for someone by username to start a conversation.</p>
              )}
              {conversations.map((conversation) => (
                <button
                  aria-current={selectedConversation?.id === conversation.id ? "true" : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left ${selectedConversation?.id === conversation.id ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                  key={conversation.id}
                  onClick={() => selectConversation(conversation)}
                  type="button"
                >
                  <Avatar user={conversation.peer} className="h-10 w-10 text-xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">{displayName(conversation.peer)}</span>
                    <span className="block truncate text-xs text-gray-500">
                      {conversation.last_message?.content ?? `@${conversation.peer.username}`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="flex min-h-[24rem] flex-col bg-white" aria-label="Selected conversation">
          {selectedConversation ? (
            <>
              <header className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
                <Avatar user={selectedConversation.peer} className="h-11 w-11 text-xs" />
                <div className="min-w-0">
                  <h1 className="truncate font-semibold text-gray-950">{displayName(selectedConversation.peer)}</h1>
                  <p className="truncate text-sm text-gray-500">@{selectedConversation.peer.username}</p>
                </div>
              </header>
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div>
                  <p className="font-medium text-gray-800">Your conversation is ready.</p>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                    Messages will appear here when realtime chat is added.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Your messages</h1>
                <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                  Choose a conversation or search for someone to get started.
                </p>
              </div>
            </div>
          )}
          {error && <p className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700" role="alert">{error}</p>}
        </section>
      </section>
    </main>
  );
}
