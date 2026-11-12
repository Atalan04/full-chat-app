import type { Server } from "socket.io";

export interface UserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  deleted: boolean;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
}

export interface ConversationSummary {
  id: number;
  peer: UserProfile;
  last_message: Message | null;
}

export interface MessageSendPayload {
  conversation_id: number;
  content: string;
}

export type MessageSendResult =
  | { ok: true; message: Message }
  | { ok: false; error: string };

export interface ClientToServerEvents {
  "message:send": (
    payload: MessageSendPayload,
    acknowledge: (result: MessageSendResult) => void,
  ) => void;
}

export interface ServerToClientEvents {
  "message:new": (message: Message) => void;
}

export interface ServerSocketData {
  userId: number;
}

export type ChatSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  ServerSocketData
>;
