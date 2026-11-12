export interface UserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  deleted: boolean;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
}

export interface MessageSendPayload {
  conversation_id: number;
  content: string;
}

export type MessageSendResult =
  | { ok: true; message: Message }
  | { ok: false; error: string };

export interface ClientToServerEvents {
  "message:send": (payload: MessageSendPayload, acknowledge: (result: MessageSendResult) => void) => void;
}

export interface ServerToClientEvents {
  "message:new": (message: Message) => void;
}

export interface ConversationSummary {
  id: number;
  peer: UserProfile;
  last_message: Message | null;
}

export interface ApiErrorResponse {
  error: string;
}
