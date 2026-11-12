"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ApiError, api } from "@/lib/api";
import { clearSession, getToken, getUser, saveSession } from "@/lib/auth";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { displayName } from "@/lib/userDisplay";
import type { ConversationSummary, Message, UserProfile } from "@/lib/types";

function mergeMessages(...groups: Message[][]): Message[] {
  const unique = new Map<number, Message>();
  for (const message of groups.flat()) unique.set(message.id, message);
  return [...unique.values()].sort((a, b) => a.id - b.id);
}

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [openingUsername, setOpeningUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationLoadError, setConversationLoadError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const selectedId = selectedConversation?.id ?? null;
  const lastMessageId = messages[messages.length - 1]?.id ?? null;
  const selectedIdRef = useRef<number | null>(selectedId);
  const conversationsRef = useRef(conversations);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  selectedIdRef.current = selectedId;
  conversationsRef.current = conversations;

  useEffect(() => { setHasHydrated(true); }, []);

  useEffect(() => {
    stickToBottomRef.current = true;
  }, [selectedId]);

  useEffect(() => {
    const list = messageListRef.current;
    if (list && stickToBottomRef.current) list.scrollTop = list.scrollHeight;
  }, [lastMessageId, selectedId, historyLoading]);

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
      setSelectedConversation((current) => current ?? items[0] ?? null);
      setError(null);
      setConversationLoadError(null);
    }).catch((caughtError: unknown) => {
      if (!active) return;
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        clearSession();
        disconnectSocket();
        router.replace("/login");
        return;
      }
      setConversationLoadError(caughtError instanceof Error ? caughtError.message : "Could not load your conversations.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const socket = connectSocket(token);
    setConnectionStatus(socket.connected ? "connected" : "connecting");
    let live = true;
    const refreshHistory = async () => {
      const id = selectedIdRef.current;
      if (id === null || !live) return;
      try {
        const history = await api.messages(id);
        if (live && selectedIdRef.current === id) {
          setMessages((current) => mergeMessages(history, current));
          setHistoryError(null);
        }
      } catch (caughtError) {
        if (!live) return;
        if (caughtError instanceof ApiError && caughtError.status === 401) {
          clearSession(); disconnectSocket(); router.replace("/login");
        } else setHistoryError(caughtError instanceof Error ? caughtError.message : "Could not load message history.");
      }
    };
    const onConnect = () => { setConnectionStatus("connected"); void refreshHistory(); };
    const onDisconnect = () => { setConnectionStatus("disconnected"); };
    const onReconnectAttempt = () => { setConnectionStatus("connecting"); };
    const onConnectError = (caughtError: Error) => {
      setConnectionStatus("disconnected");
      if (/not authenticated/i.test(caughtError.message)) {
        clearSession(); disconnectSocket(); router.replace("/login");
      }
    };
    const onMessage = (message: Message) => {
      if (selectedIdRef.current === message.conversation_id) {
        setMessages((current) => mergeMessages(current, [message]));
      }
      const existingConversation = conversationsRef.current.find((item) => item.id === message.conversation_id);
      if (!existingConversation) {
        void api.conversations().then((items) => setConversations(items)).catch(() => undefined);
      } else {
        const updated = { ...existingConversation, last_message: message };
        setConversations((current) => [updated, ...current.filter((item) => item.id !== message.conversation_id)]);
      }
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.io.on("reconnect_attempt", onReconnectAttempt);
    socket.on("message:new", onMessage);
    if (socket.connected) void refreshHistory();
    return () => {
      live = false;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      socket.off("message:new", onMessage);
    };
  }, [router]);

  useEffect(() => {
    if (selectedId === null) { setMessages([]); return; }
    let active = true;
    setMessages([]);
    setHistoryError(null);
    setHistoryLoading(true);
    api.messages(selectedId).then((history) => {
      if (active) {
        setMessages((current) => mergeMessages(history, current));
        setHistoryError(null);
      }
    }).catch((caughtError: unknown) => {
      if (!active) return;
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        clearSession(); disconnectSocket(); router.replace("/login");
      } else setHistoryError(caughtError instanceof Error ? caughtError.message : "Could not load message history.");
    }).finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [selectedId, router]);

  useEffect(() => {
    const query = search.trim();
    if (!query) { setSearchResults([]); setSearchError(null); setSearching(false); return; }
    let active = true;
    setSearching(true);
    setSearchResults([]);
    setSearchError(null);
    const timer = window.setTimeout(() => {
      api.searchUsers(query).then((items) => { if (active) setSearchResults(items); }).catch((caughtError: unknown) => {
        if (active) { setSearchResults([]); setSearchError(caughtError instanceof Error ? caughtError.message : "Could not search users."); }
      }).finally(() => { if (active) setSearching(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search]);

  function handleLogout() {
    disconnectSocket(); clearSession(); router.replace("/login");
  }

  async function openUser(event: FormEvent<HTMLFormElement>, username: string) {
    event.preventDefault(); setOpeningUsername(username); setError(null);
    try {
      const conversation = await api.createConversation(username);
      setSelectedConversation(conversation); setSearch("");
      setConversations(await api.conversations());
    } catch (caughtError: unknown) {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        clearSession(); disconnectSocket(); router.replace("/login"); return;
      }
      setError(caughtError instanceof Error ? caughtError.message : "Could not open the conversation.");
    } finally { setOpeningUsername(null); }
  }

  function selectConversation(conversation: ConversationSummary) {
    setSelectedConversation(conversation); setSendError(null);
  }

  async function retryConversationLoad() {
    setLoading(true);
    setConversationLoadError(null);
    try {
      const [profile, items] = await Promise.all([api.me(), api.conversations()]);
      const token = getToken();
      if (token) saveSession({ token, user: profile });
      setUser(profile);
      setConversations(items);
      setSelectedConversation((current) => current ?? items[0] ?? null);
    } catch (caughtError: unknown) {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        clearSession(); disconnectSocket(); router.replace("/login");
      } else setConversationLoadError(caughtError instanceof Error ? caughtError.message : "Could not load your conversations.");
    } finally {
      setLoading(false);
    }
  }

  async function retryHistory() {
    if (selectedId === null) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const history = await api.messages(selectedId);
      if (selectedIdRef.current === selectedId) setMessages((current) => mergeMessages(history, current));
    } catch (caughtError: unknown) {
      if (caughtError instanceof ApiError && caughtError.status === 401) {
        clearSession(); disconnectSocket(); router.replace("/login");
      } else setHistoryError(caughtError instanceof Error ? caughtError.message : "Could not load message history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    const socket = getSocket();
    if (!socket) { setSendError("Chat connection is not ready. Try again in a moment."); return; }
    if (!selectedConversation || !content || !socket.connected) {
      if (!socket.connected) setSendError("Connecting to chat server. Try again in a moment.");
      return;
    }
    setSending(true); setSendError(null);
    socket.timeout(8000).emit("message:send", { conversation_id: selectedConversation.id, content }, (timeoutError, result) => {
      setSending(false);
      if (timeoutError) { setSendError("The server did not confirm the message. Check your connection and try again."); return; }
      if (!result.ok) { setSendError(result.error); return; }
      setDraft("");
      setMessages((current) => mergeMessages(current, [result.message]));
    });
  }

  const query = search.trim();
  const connectionLabel = connectionStatus === "connected"
    ? "Connected"
    : connectionStatus === "connecting" ? "Reconnecting…" : "Disconnected";
  const connectionColor = connectionStatus === "connected"
    ? "bg-emerald-500"
    : connectionStatus === "connecting" ? "bg-amber-500" : "bg-red-500";

  return (
    <main className="min-h-screen bg-gray-100 p-2 sm:p-6">
      <section className="mx-auto grid min-h-[calc(100vh-1rem)] max-w-7xl grid-rows-[minmax(14rem,38vh)_minmax(24rem,1fr)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[22rem_minmax(0,1fr)] lg:grid-rows-1">
        <aside className="flex min-h-0 min-w-0 flex-col border-b border-gray-200 lg:border-b-0 lg:border-r">
          <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              {user && <Avatar user={user} className="h-10 w-10 text-xs" />}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-950">{user ? displayName(user) : "Chat App"}</p>
                {user && <p className="truncate text-xs text-gray-500">@{user.username}</p>}
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-600" role="status" aria-live="polite">
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${connectionColor}`} />
                  {connectionLabel}
                </p>
              </div>
            </div>
            <nav className="flex shrink-0 items-center gap-2 text-xs sm:gap-3 sm:text-sm" aria-label="Account">
              <Link className="font-medium text-indigo-600 hover:text-indigo-700" href="/profile">Profile</Link>
              <button className="font-medium text-gray-600 hover:text-gray-900" onClick={handleLogout} type="button">Log out</button>
            </nav>
          </header>

          <div className="border-b border-gray-200 p-3 sm:p-4">
            <label className="sr-only" htmlFor="user-search">Find people by username</label>
            <input
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-950 outline-none placeholder:text-gray-500 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              id="user-search"
              onChange={(event) => {
                const value = event.target.value;
                setSearch(value);
                setSearching(Boolean(value.trim()));
                setSearchResults([]);
                setSearchError(null);
              }}
              placeholder="Find people by username"
              type="search"
              value={search}
            />
          </div>

          {query ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Search results">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">People</p>
              {searching && <p className="px-3 py-3 text-sm text-gray-500" role="status">Searching…</p>}
              {searchError && <p className="px-3 py-3 text-sm text-red-700" role="alert">{searchError}</p>}
              {!searching && !searchError && searchResults.length === 0 && (
                <p className="px-3 py-3 text-sm text-gray-500">No users found. Try another username.</p>
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
            <div className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Conversations">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Conversations</p>
              {loading && <p className="px-3 py-3 text-sm text-gray-500" role="status">Loading conversations…</p>}
              {!loading && conversationLoadError && conversations.length === 0 && (
                <div className="px-3 py-3">
                  <p className="text-sm text-red-700" role="alert">{conversationLoadError}</p>
                  <button className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700" onClick={() => { void retryConversationLoad(); }} type="button">Try again</button>
                </div>
              )}
              {!loading && !conversationLoadError && conversations.length === 0 && (
                <p className="px-3 py-3 text-sm leading-6 text-gray-500">No conversations yet. Search for someone by username to start one.</p>
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
                      {conversation.last_message?.content ?? (conversation.peer.deleted ? "Account deleted" : `@${conversation.peer.username}`)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col bg-white" aria-label="Selected conversation">
          {selectedConversation ? (
            <>
              <header className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 sm:px-5 sm:py-4">
                <Avatar user={selectedConversation.peer} className="h-11 w-11 text-xs" />
                <div className="min-w-0">
                  <h1 className="truncate font-semibold text-gray-950">{displayName(selectedConversation.peer)}</h1>
                  <p className="truncate text-sm text-gray-500">
                    {selectedConversation.peer.deleted ? "Account deleted" : `@${selectedConversation.peer.username}`}
                  </p>
                </div>
              </header>
              <div
                className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5"
                aria-live="polite"
                onScroll={(event) => {
                  const element = event.currentTarget;
                  stickToBottomRef.current = element.scrollHeight - element.clientHeight - element.scrollTop < 48;
                }}
                ref={messageListRef}
              >
                {historyLoading && messages.length === 0 && (
                  <p className="text-center text-sm text-gray-500" role="status">Loading messages…</p>
                )}
                {!historyLoading && historyError && (
                  <div className="mx-auto mt-8 max-w-sm rounded-xl bg-red-50 p-4 text-center">
                    <p className="text-sm text-red-700" role="alert">{historyError}</p>
                    <button className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700" onClick={() => { void retryHistory(); }} type="button">Try again</button>
                  </div>
                )}
                {!historyLoading && !historyError && messages.length === 0 && (
                  <p className="mt-12 text-center text-sm text-gray-500">No messages yet. Say hello!</p>
                )}
                {messages.map((message) => {
                  const own = message.sender_id === user?.id;
                  const sender = own ? user : selectedConversation.peer;
                  const date = new Date(`${message.created_at.replace(" ", "T")}Z`);
                  const timestamp = hasHydrated
                    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                    : message.created_at.slice(11, 16);

                  return (
                    <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] break-words rounded-2xl px-4 py-2.5 sm:max-w-[80%] ${own ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                        <p className={`mb-1 text-[11px] font-semibold ${own ? "text-indigo-100" : "text-gray-500"}`}>
                          {sender ? displayName(sender) : ""}
                        </p>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <time className={`mt-1 block text-right text-[11px] ${own ? "text-indigo-100" : "text-gray-500"}`} dateTime={message.created_at}>
                          {timestamp}
                        </time>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form className="border-t border-gray-200 p-3 sm:p-4" onSubmit={sendMessage}>
                {selectedConversation.peer.deleted ? (
                  <p className="py-2 text-center text-sm text-gray-600">This account was deleted. You can still read your conversation.</p>
                ) : (
                  <>
                    <label className="sr-only" htmlFor="message-draft">Message</label>
                    <div className="flex items-end gap-2">
                      <textarea
                        id="message-draft"
                        className="min-h-11 min-w-0 flex-1 resize-y rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
                        disabled={connectionStatus !== "connected"}
                        maxLength={2000}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={connectionStatus === "connected" ? "Write a message…" : "Waiting for connection…"}
                        rows={1}
                        value={draft}
                      />
                      <button
                        className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={sending || !draft.trim() || connectionStatus !== "connected"}
                        type="submit"
                      >
                        {sending ? "Sending…" : "Send"}
                      </button>
                    </div>
                    {sendError && <p className="mt-2 text-sm text-red-700" role="alert">{sendError}</p>}
                  </>
                )}
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Your messages</h1>
                <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">Choose a conversation or search for someone to get started.</p>
              </div>
            </div>
          )}
          {error && (
            <p className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700" role="alert">{error}</p>
          )}
        </section>
      </section>
    </main>
  );
}
