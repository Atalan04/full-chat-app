import jwt, { type JwtPayload } from "jsonwebtoken";
import type { ChatSocketServer, Message, MessageSendResult } from "./types.js";
import { db } from "./db.js";

interface ConversationPeerRow {
  user_a: number;
  user_b: number;
  peer_deleted_at: string | null;
}

const findActiveUser = db.prepare(
  "SELECT id FROM users WHERE id = ? AND deleted_at IS NULL",
);

const findConversationPeer = db.prepare(
  `SELECT c.user_a, c.user_b, peer.deleted_at AS peer_deleted_at
   FROM conversations c
   JOIN users peer ON peer.id = CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END
   WHERE c.id = ? AND (c.user_a = ? OR c.user_b = ?)`,
);

const insertMessage = db.prepare(
  "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)",
);

const findMessageById = db.prepare(
  `SELECT id, conversation_id, sender_id, content, created_at
   FROM messages WHERE id = ?`,
);

function sendFailure(acknowledge: (result: MessageSendResult) => void, error: string): void {
  acknowledge({ ok: false, error });
}

export function configureSockets(io: ChatSocketServer): void {
  io.use((socket, next) => {
    const token: unknown = socket.handshake.auth?.token;
    const secret = process.env.JWT_SECRET;
    if (typeof token !== "string" || !secret) {
      next(new Error("Not authenticated"));
      return;
    }

    let payload: string | JwtPayload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      next(new Error("Not authenticated"));
      return;
    }

    if (typeof payload === "string" || typeof payload.sub !== "string") {
      next(new Error("Not authenticated"));
      return;
    }

    const userId = Number(payload.sub);
    if (!Number.isSafeInteger(userId) || userId < 1 || !findActiveUser.get(userId)) {
      next(new Error("Not authenticated"));
      return;
    }

    socket.data.userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    const senderId = socket.data.userId;
    socket.join(`user:${senderId}`);

    socket.on("message:send", (payload, acknowledge) => {
      const rawPayload: unknown = payload;
      if (typeof acknowledge !== "function") return;

      if (typeof rawPayload !== "object" || rawPayload === null || Array.isArray(rawPayload)) {
        sendFailure(acknowledge, "A conversation and message are required.");
        return;
      }

      const body = rawPayload as Record<string, unknown>;
      if (!Number.isSafeInteger(body.conversation_id) || (body.conversation_id as number) < 1) {
        sendFailure(acknowledge, "The conversation is invalid.");
        return;
      }
      if (typeof body.content !== "string") {
        sendFailure(acknowledge, "Message content must be text.");
        return;
      }

      const content = body.content.trim();
      if (!content || content.length > 2000) {
        sendFailure(acknowledge, "Message must be between 1 and 2000 characters.");
        return;
      }

      const conversation = findConversationPeer.get(
        senderId,
        body.conversation_id,
        senderId,
        senderId,
      ) as ConversationPeerRow | undefined;
      if (!conversation) {
        sendFailure(acknowledge, "You are not a participant in this conversation.");
        return;
      }

      if (conversation.peer_deleted_at !== null) {
        sendFailure(acknowledge, "This user is no longer available.");
        return;
      }

      try {
        const inserted = insertMessage.run(body.conversation_id, senderId, content);
        const message = findMessageById.get(Number(inserted.lastInsertRowid)) as Message | undefined;
        if (!message) {
          throw new Error("Stored message could not be loaded.");
        }

        acknowledge({ ok: true, message });
        const peerId = conversation.user_a === senderId ? conversation.user_b : conversation.user_a;
        io.to(`user:${senderId}`).to(`user:${peerId}`).emit("message:new", message);
      } catch (error) {
        console.error("Could not store a message.", error);
        sendFailure(acknowledge, "Could not send the message.");
      }
    });
  });
}
