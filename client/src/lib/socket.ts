import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/lib/api";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/types";

type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
let socket: ChatSocket | null = null;

export function connectSocket(token: string): ChatSocket {
  if (socket) {
    if (socket.auth && typeof socket.auth === "object") socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io(API_URL, { auth: { token } }) as ChatSocket;
  return socket;
}

export function getSocket(): ChatSocket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
